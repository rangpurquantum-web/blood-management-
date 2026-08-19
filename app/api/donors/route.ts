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
//
// Query params:
// q          = name / phone search
// bloodGroup = blood group
// eligible   = true / false
// status     = APPROVED / PENDING / REJECTED / all
// area       = address search
//
// IMPORTANT:
// Eligibility is calculated from the donor's latest donation.
// Database value is synchronized automatically.
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

    // ─────────────────────────────────────────────────────────────────────────
    // Status
    // ─────────────────────────────────────────────────────────────────────────

    if (statusParam && statusParam !== "all") {
      where.status = statusParam as any;
    } else if (!statusParam) {
      where.status = "APPROVED";
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Search
    // ─────────────────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────────────────
    // Blood group
    // ─────────────────────────────────────────────────────────────────────────

    if (bloodGroup) {
      where.bloodType = bloodGroup;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Area
    // ─────────────────────────────────────────────────────────────────────────

    if (area) {
      where.address = {
        contains: area,
        mode: "insensitive",
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fetch donors
    //
    // We intentionally fetch donations so that eligibility can be calculated
    // from the latest donation instead of trusting an old database value.
    // ─────────────────────────────────────────────────────────────────────────

    const donors = await prisma.donor.findMany({
      where,
      orderBy: {
        fullName: "asc",
      },
      include: {
        phone: true,

        donations: {
          orderBy: {
            donationDate: "desc",
          },
          take: 1,
        },
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Recalculate eligibility
    // ─────────────────────────────────────────────────────────────────────────

    const updatedDonors = [];

    for (const donor of donors) {
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
          deferralReason =
            "Recent donation — 120-day rest period";
        }
      }

      // Synchronize database if calculated value differs.
      const databaseNeedsUpdate =
        donor.isEligible !== isEligible ||
        donor.deferredUntil?.getTime() !==
          deferredUntil?.getTime() ||
        donor.deferralReason !== deferralReason;

      if (databaseNeedsUpdate) {
        await prisma.donor.update({
          where: {
            id: donor.id,
          },
          data: {
            isEligible,
            deferredUntil,
            deferralReason,
          },
        });
      }

      updatedDonors.push({
        id: donor.id,
        fullName: donor.fullName,
        dob: donor.dob,
        gender: donor.gender,
        bloodType: donor.bloodType,
        phone: donor.phone,
        email: donor.email,
        address: donor.address,

        // Calculated values
        isEligible,
        deferralReason,
        deferredUntil,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Apply eligible filter AFTER recalculation
    //
    // This is important.
    //
    // Example:
    // Database says isEligible=false
    // Latest donation was 150 days ago
    //
    // We calculate:
    // isEligible=true
    //
    // So ?eligible=true must return this donor.
    // ─────────────────────────────────────────────────────────────────────────

    let filteredDonors = updatedDonors;

    if (eligibleParam !== null) {
      const requestedEligibility = eligibleParam === "true";

      filteredDonors = updatedDonors.filter(
        (donor) => donor.isEligible === requestedEligibility,
      );
    }

    return NextResponse.json(filteredDonors);
  },
  {
    permission: "donorView",
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/donors
// Register new donor
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, session) => {
    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validate
    // ─────────────────────────────────────────────────────────────────────────

    const parsed = donorSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const data = parsed.data;

    // ─────────────────────────────────────────────────────────────────────────
    // Check duplicate phone/email
    // ─────────────────────────────────────────────────────────────────────────

    const phoneNumbers = data.phone.map(
      (p) => p.number,
    );

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

    // ─────────────────────────────────────────────────────────────────────────
    // Extract last donation date
    // ─────────────────────────────────────────────────────────────────────────

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
      const eligibility =
        eligibilityFromDonation(lastDonationDate);

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

        // Store previous donation as history
        ...(lastDonationDate
          ? {
              donations: {
                create: {
                  patientName:
                    "Previous / Prior Donation",

                  hospitalName:
                    "Not specified",

                  donationDate:
                    lastDonationDate,

                  notes:
                    "Recorded from registration form (donor's stated last donation date)",
                },
              },
            }
          : {}),
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Audit
    // ─────────────────────────────────────────────────────────────────────────

    await writeAuditLog(
      session.userId,
      "Donor Created",
      `Registered donor: ${donor.fullName} (${donor.bloodType}) — ID ${donor.id}`,
    );

    return apiSuccess(
      {
        message:
          "Donor registered successfully",
        donorId: donor.id,
      },
      201,
    );
  },
  {
    permission: "donorAdd",
  },
);