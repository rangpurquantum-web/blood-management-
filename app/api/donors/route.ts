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
// Query params:
// q           = name / phone search
// bloodGroup  = blood group
// eligible    = true / false
// area        = address search
// status      = APPROVED / PENDING / REJECTED / all
//
// Eligibility is ALWAYS calculated from the latest donation date.
// Database's old isEligible value is not trusted.
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
    // Blood Group
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
    // Get donors
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
    // Calculate REAL eligibility
    // ─────────────────────────────────────────────────────────────────────────
    //
    // Example:
    //
    // Latest donation = May 10, 2024
    // Today           = August 19, 2026
    //
    // 120 days already passed
    // => Eligible
    //
    // Latest donation = July 1, 2026
    // Today           = August 19, 2026
    //
    // Less than 120 days
    // => Not Eligible
    //
    // ─────────────────────────────────────────────────────────────────────────

    const now = new Date();

    const updatedDonors = await Promise.all(
      donors.map(async (donor) => {
        const latestDonation = donor.donations[0];

        let isEligible = true;
        let deferredUntil: Date | null = null;
        let deferralReason: string | null = null;

        // ─────────────────────────────────────────────────────────────────────
        // If donor has previous donation
        // ─────────────────────────────────────────────────────────────────────

        if (latestDonation) {
          const eligibility = eligibilityFromDonation(
            latestDonation.donationDate,
          );

          deferredUntil = eligibility.deferredUntil;

          // IMPORTANT:
          // Check that deferredUntil exists before comparing.
          //
          // If 120 days have passed:
          //     Eligible
          //
          // If 120 days have NOT passed:
          //     Not Eligible
          //
          if (deferredUntil && now >= deferredUntil) {
            isEligible = true;
            deferredUntil = null;
            deferralReason = null;
          } else {
            isEligible = false;
            deferralReason =
              "Recent donation — 120-day rest period";
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // Sync calculated eligibility with database
        // ─────────────────────────────────────────────────────────────────────

        const needsUpdate =
          donor.isEligible !== isEligible ||
          donor.deferredUntil?.getTime() !==
            deferredUntil?.getTime() ||
          donor.deferralReason !== deferralReason;

        if (needsUpdate) {
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

        // ─────────────────────────────────────────────────────────────────────
        // Return donor
        // ─────────────────────────────────────────────────────────────────────

        return {
          id: donor.id,
          fullName: donor.fullName,
          dob: donor.dob,
          gender: donor.gender,
          bloodType: donor.bloodType,
          phone: donor.phone,
          email: donor.email,
          address: donor.address,

          // REAL calculated eligibility
          isEligible,
          deferralReason,
          deferredUntil,

          // Latest donation
          latestDonationDate:
            latestDonation?.donationDate ?? null,
        };
      }),
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Apply eligibility filter AFTER calculation
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
    // Validate donor
    // ─────────────────────────────────────────────────────────────────────────

    const parsed = donorSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const data = parsed.data;

    // ─────────────────────────────────────────────────────────────────────────
    // Check duplicate email / phone
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

    // ─────────────────────────────────────────────────────────────────────────
    // Separate phone + last donation
    // ─────────────────────────────────────────────────────────────────────────

    const {
      phone: phoneData,
      lastDonationDate,
      ...donorData
    } = data as typeof data & {
      lastDonationDate?: Date | null;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Calculate eligibility from previous donation
    // ─────────────────────────────────────────────────────────────────────────

    let isEligible = true;
    let deferredUntil: Date | null = null;
    let deferralReason: string | null = null;

    if (lastDonationDate) {
      const eligibility = eligibilityFromDonation(
        lastDonationDate,
      );

      deferredUntil = eligibility.deferredUntil;

      // If 120 days already passed,
      // donor is immediately eligible.

      if (deferredUntil && new Date() >= deferredUntil) {
        isEligible = true;
        deferredUntil = null;
        deferralReason = null;
      } else {
        isEligible = false;
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

        // ─────────────────────────────────────────────────────────────────────
        // Save previous donation as history
        // ─────────────────────────────────────────────────────────────────────

        ...(lastDonationDate
          ? {
              donations: {
                create: {
                  patientName:
                    "Previous / Prior Donation",

                  hospitalName:
                    "Not specified",

                  donationDate: lastDonationDate,

                  notes:
                    "Recorded from registration form (donor's stated last donation date)",
                },
              },
            }
          : {}),
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Audit log
    // ─────────────────────────────────────────────────────────────────────────

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