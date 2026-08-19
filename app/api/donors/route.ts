import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  validationError,
  eligibilityFromDonation,
} from "@/lib/api-helpers";
import { donorSchema } from "@/features/donors";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/donors
// ─────────────────────────────────────────────────────────────────────────────

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

    if (statusParam && statusParam !== "all") {
      where.status = statusParam as any;
    } else if (!statusParam) {
      where.status = "APPROVED";
    }

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

    if (bloodGroup) {
      where.bloodType = bloodGroup;
    }

    if (area) {
      where.address = {
        contains: area,
        mode: "insensitive",
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Get donors with latest donation
    // ─────────────────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────────────────
    // Recalculate eligibility from latest donation
    // ─────────────────────────────────────────────────────────────────────────

    const result = donors.map((donor) => {
      const latestDonation = donor.donations[0];

      let isEligible = true;
      let deferredUntil: Date | null = null;
      let deferralReason: string | null = null;

      if (latestDonation) {
        const eligibility = eligibilityFromDonation(
          latestDonation.donationDate,
        );

        isEligible = eligibility.isEligible;
        deferredUntil = eligibility.deferredUntil;

        if (!isEligible) {
          deferralReason = "Recent donation — 120-day rest period";
        }
      }

      return {
        id: donor.id,
        fullName: donor.fullName,
        dob: donor.dob,
        gender: donor.gender,
        bloodType: donor.bloodType,
        phone: donor.phone,
        email: donor.email,
        address: donor.address,
        isEligible,
        deferralReason,
        deferredUntil,
      };
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Apply eligible filter AFTER recalculation
    // ─────────────────────────────────────────────────────────────────────────

    const filteredResult =
      eligibleParam !== null
        ? result.filter(
            (donor) =>
              donor.isEligible === (eligibleParam === "true"),
          )
        : result;

    // ─────────────────────────────────────────────────────────────────────────
    // Sync changed eligibility to database
    // ─────────────────────────────────────────────────────────────────────────

    const updates = result.filter((donor) => {
      const original = donors.find(
        (item) => item.id === donor.id,
      );

      if (!original) return false;

      return (
        original.isEligible !== donor.isEligible ||
        original.deferralReason !== donor.deferralReason ||
        original.deferredUntil?.getTime() !==
          donor.deferredUntil?.getTime()
      );
    });

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((donor) =>
          prisma.donor.update({
            where: {
              id: donor.id,
            },
            data: {
              isEligible: donor.isEligible,
              deferredUntil: donor.deferredUntil,
              deferralReason: donor.deferralReason,
            },
          }),
        ),
      );
    }

    return NextResponse.json(filteredResult);
  },
  {
    permission: "donorView",
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/donors
// ─────────────────────────────────────────────────────────────────────────────

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
      return validationError(parsed.error);
    }

    const data = parsed.data;

    // ─────────────────────────────────────────────────────────────────────────
    // Check duplicate phone/email
    // ─────────────────────────────────────────────────────────────────────────

    const phoneNumbers = data.phone.map((p) => p.number);

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

    const {
      phone: phoneData,
      lastDonationDate,
      ...donorData
    } = data as typeof data & {
      lastDonationDate?: Date | null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Calculate initial eligibility
    // ─────────────────────────────────────────────────────────────────────────

    let isEligible = true;
    let deferredUntil: Date | null = null;
    let deferralReason: string | null = null;

    if (lastDonationDate) {
      const eligibility = eligibilityFromDonation(
        lastDonationDate,
      );

      isEligible = eligibility.isEligible;
      deferredUntil = eligibility.deferredUntil;

      if (!isEligible) {
        deferralReason =
          "Recent donation — 120-day rest period";
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create donor
    // ─────────────────────────────────────────────────────────────────────────

    const donor = await prisma.donor.create({
      data: {
        ...donorData,

        isEligible,
        deferredUntil,
        deferralReason,

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