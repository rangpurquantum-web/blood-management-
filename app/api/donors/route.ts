import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withAuth,
  apiError,
  apiSuccess,
  writeAuditLog,
  eligibilityFromDonation,
} from "@/lib/api-helpers";
import { donorSchema } from "@/features/donors";

export const dynamic = "force-dynamic";

// ─── GET /api/donors ──────────────────────────────────────────────────────────
// Query params:
// q
// bloodGroup
// eligible=true/false
// status
// area

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") ?? "";
    const bloodGroup = searchParams.get("bloodGroup") ?? "";
    const statusParam = searchParams.get("status");
    const eligibleParam = searchParams.get("eligible");
    const area = searchParams.get("area") ?? "";

    const where: Prisma.DonorWhereInput = {
      isDeleted: false,
    };

    // ── Status ────────────────────────────────────────────────────────────────

    if (statusParam && statusParam !== "all") {
      where.status = statusParam as any;
    } else if (!statusParam) {
      where.status = "APPROVED";
    }

    // ── Search ────────────────────────────────────────────────────────────────

    if (q) {
      where.OR = [
        {
          fullName: {
            contains: q,
            mode: "insensitive",
          },
        },
        {
          phone: {
            some: {
              number: {
                contains: q,
              },
            },
          },
        },
      ];
    }

    // ── Blood Group ───────────────────────────────────────────────────────────

    if (bloodGroup) {
      where.bloodType = bloodGroup;
    }

    // ── Area ──────────────────────────────────────────────────────────────────

    if (area) {
      where.address = {
        contains: area,
        mode: "insensitive",
      };
    }

    // ── Fetch donors ──────────────────────────────────────────────────────────

    const donors = await prisma.donor.findMany({
      where,
      orderBy: {
        fullName: "asc",
      },
      select: {
        id: true,
        fullName: true,
        dob: true,
        gender: true,
        bloodType: true,
        phone: true,
        email: true,
        address: true,
        isEligible: true,
        deferralReason: true,
        deferredUntil: true,

        // IMPORTANT:
        // Latest donation is needed to calculate eligibility again.
        donations: {
          orderBy: {
            donationDate: "desc",
          },
          take: 1,
          select: {
            donationDate: true,
          },
        },
      },
    });

    // ── Recalculate eligibility ───────────────────────────────────────────────
    //
    // Database value may be old.
    // Therefore latest donation is always checked against today's date.
    //

    const updatedDonors = donors.map((donor) => {
      const latestDonation = donor.donations[0];

      if (!latestDonation) {
        return {
          ...donor,
          isEligible: true,
          deferredUntil: null,
          deferralReason: null,
          donations: undefined,
        };
      }

      const eligibility = eligibilityFromDonation(
        latestDonation.donationDate,
      );

      const isEligible = eligibility.deferredUntil <= new Date();

      return {
        ...donor,
        isEligible,
        deferredUntil: isEligible
          ? null
          : eligibility.deferredUntil,
        deferralReason: isEligible
          ? null
          : "Recent donation — 120-day rest period",
        donations: undefined,
      };
    });

    // ── Eligible filter ───────────────────────────────────────────────────────

    let filteredDonors = updatedDonors;

    if (eligibleParam !== null) {
      const requestedEligible = eligibleParam === "true";

      filteredDonors = updatedDonors.filter(
        (donor) => donor.isEligible === requestedEligible,
      );
    }

    return NextResponse.json(filteredDonors);
  },
  {
    permission: "donorView",
  },
);

// ─── POST /api/donors ─────────────────────────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, session) => {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = donorSchema.safeParse(body);

    if (!parsed.success) {
      return (
        await import("@/lib/api-helpers")
      ).validationError(parsed.error);
    }

    const data = parsed.data;

    // ── Phone numbers ─────────────────────────────────────────────────────────

    const phoneNumbers = data.phone.map((p) => p.number);

    // ── Uniqueness check ──────────────────────────────────────────────────────

    const existing = await prisma.donor.findFirst({
      where: {
        AND: [
          {
            isDeleted: false,
          },
          {
            OR: [
              {
                email: data.email,
              },
              {
                phone: {
                  some: {
                    number: {
                      in: phoneNumbers,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
    });

    if (existing) {
      if (existing.email === data.email) {
        return apiError(
          `এই ইমেইল দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`,
          409,
        );
      }

      return apiError(
        `এই নম্বর দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`,
        409,
      );
    }

    // ── Prepare data ──────────────────────────────────────────────────────────

    const {
      phone: phoneData,
      lastDonationDate,
      ...donorData
    } = data as typeof data & {
      lastDonationDate?: Date | null;
    };

    // ── Initial eligibility ───────────────────────────────────────────────────

    let eligibility = {
      isEligible: true,
      deferredUntil: null as Date | null,
    };

    if (lastDonationDate) {
      const calculated = eligibilityFromDonation(
        lastDonationDate,
      );

      const isEligible =
        calculated.deferredUntil <= new Date();

      eligibility = {
        isEligible,
        deferredUntil: isEligible
          ? null
          : calculated.deferredUntil,
      };
    }

    // ── Create donor ──────────────────────────────────────────────────────────

    const donor = await prisma.donor.create({
      data: {
        ...donorData,

        isEligible: eligibility.isEligible,

        deferredUntil: eligibility.deferredUntil,

        deferralReason: eligibility.isEligible
          ? null
          : "Recent donation — 120-day rest period",

        phone: {
          create: phoneData.map((p) => ({
            number: p.number,
            label: p.label,
            isPrimary: p.isPrimary,
          })),
        },

        ...(lastDonationDate
          ? {
              donations: {
                create: {
                  patientName: "Previous / Prior Donation",
                  hospitalName: "Not specified",
                  donationDate: lastDonationDate,
                  notes:
                    "Recorded from registration form (donor's stated last donation date)",
                },
              },
            }
          : {}),
      },
    });

    // ── Audit ─────────────────────────────────────────────────────────────────

    await writeAuditLog(
      session.userId,
      "Donor Created",
      `Registered donor: ${donor.fullName} (${donor.bloodType}) — ID ${donor.id}`,
    );

    return apiSuccess(
      {
        message: "Donor registered successfully",
        donorId: donor.id,
      },
      201,
    );
  },
  {
    permission: "donorAdd",
  },
);