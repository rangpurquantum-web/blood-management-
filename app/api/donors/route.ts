import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/branch";

import { getBranchDb } from "@/lib/branch-db";

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

// ============================================================================
// GET /api/donors
//
// IMPORTANT:
// Donor data is now read from the logged-in user's BRANCH DATABASE.
//
// Central DB:
//   Branch / BranchUser / SuperAdmin
//
// Branch DB:
//   Donor / Phone / Donation / etc.
// ============================================================================

export const GET = withAuth(
  async (req: NextRequest, session) => {
    // ------------------------------------------------------------------------
    // Get branch ID from authenticated session
    // ------------------------------------------------------------------------

    const branchId = session.branchId;

    if (
      typeof branchId !== "number" ||
      !Number.isInteger(branchId) ||
      branchId <= 0
    ) {
      return apiError(
        "Your account is not associated with a valid branch",
        403,
      );
    }

    // ------------------------------------------------------------------------
    // Get branch-specific Prisma client
    // ------------------------------------------------------------------------

    let branchDb;

    try {
      branchDb = await getBranchDb(branchId);
    } catch (error) {
      console.error(
        `Failed to connect to branch database: ${branchId}`,
        error,
      );

      return apiError(
        "Could not connect to branch database",
        503,
      );
    }

    // ------------------------------------------------------------------------
    // Query parameters
    // ------------------------------------------------------------------------

    const { searchParams } = new URL(req.url);

    const q = searchParams.get("q") ?? "";
    const bloodGroup = searchParams.get("bloodGroup") ?? "";
    const statusParam = searchParams.get("status");
    const eligibleParam = searchParams.get("eligible");
    const area = searchParams.get("area") ?? "";

    // ------------------------------------------------------------------------
    // Build donor filter
    // ------------------------------------------------------------------------

    const where: Prisma.DonorWhereInput = {
      isDeleted: false,
    };

    // ------------------------------------------------------------------------
    // Status
    // ------------------------------------------------------------------------

    if (statusParam && statusParam !== "all") {
      where.status = statusParam as Prisma.DonorWhereInput["status"];
    } else if (!statusParam) {
      where.status = "APPROVED";
    }

    // ------------------------------------------------------------------------
    // Search
    // ------------------------------------------------------------------------

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

    // ------------------------------------------------------------------------
    // Blood group
    // ------------------------------------------------------------------------

    if (bloodGroup) {
      where.bloodType = bloodGroup;
    }

    // ------------------------------------------------------------------------
    // Area
    // ------------------------------------------------------------------------

    if (area) {
      where.address = {
        contains: area,
        mode: "insensitive",
      };
    }

    // ------------------------------------------------------------------------
    // Get donors FROM BRANCH DATABASE
    // ------------------------------------------------------------------------

    const donors = await branchDb.donor.findMany({
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

    // ------------------------------------------------------------------------
    // Calculate real eligibility
    // ------------------------------------------------------------------------

    const now = new Date();

    const updatedDonors = await Promise.all(
      donors.map(async (donor) => {
        const latestDonation = donor.donations[0];

        let isEligible = true;
        let deferredUntil: Date | null = null;
        let deferralReason: string | null = null;

        if (latestDonation) {
          const eligibility = eligibilityFromDonation(
            latestDonation.donationDate,
          );

          deferredUntil = eligibility.deferredUntil;

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

        // --------------------------------------------------------------------
        // Synchronize calculated eligibility
        // --------------------------------------------------------------------

        const needsUpdate =
          donor.isEligible !== isEligible ||
          donor.deferredUntil?.getTime() !==
            deferredUntil?.getTime() ||
          donor.deferralReason !== deferralReason;

        if (needsUpdate) {
          await branchDb.donor.update({
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

          latestDonationDate:
            latestDonation?.donationDate ?? null,
        };
      }),
    );

    // ------------------------------------------------------------------------
    // Eligibility filter
    // ------------------------------------------------------------------------

    let filteredDonors = updatedDonors;

    if (eligibleParam !== null) {
      const requestedEligibility = eligibleParam === "true";

      filteredDonors = updatedDonors.filter(
        (donor) =>
          donor.isEligible === requestedEligibility,
      );
    }

    return NextResponse.json(filteredDonors);
  },

  {
    permission: "donorView",
  },
);

// ============================================================================
// POST /api/donors
//
// Creates donor inside the logged-in user's BRANCH DATABASE.
// ============================================================================

export const POST = withAuth(
  async (req: NextRequest, session) => {
    // ------------------------------------------------------------------------
    // Validate branch
    // ------------------------------------------------------------------------

    const branchId = session.branchId;

    if (
      typeof branchId !== "number" ||
      !Number.isInteger(branchId) ||
      branchId <= 0
    ) {
      return apiError(
        "Your account is not associated with a valid branch",
        403,
      );
    }

    // ------------------------------------------------------------------------
    // Get branch database
    // ------------------------------------------------------------------------

    let branchDb;

    try {
      branchDb = await getBranchDb(branchId);
    } catch (error) {
      console.error(
        `Failed to connect to branch database: ${branchId}`,
        error,
      );

      return apiError(
        "Could not connect to branch database",
        503,
      );
    }

    // ------------------------------------------------------------------------
    // Parse JSON
    // ------------------------------------------------------------------------

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    // ------------------------------------------------------------------------
    // Validate donor
    // ------------------------------------------------------------------------

    const parsed = donorSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const data = parsed.data;

    // ------------------------------------------------------------------------
    // Phone numbers
    // ------------------------------------------------------------------------

    const phoneNumbers = data.phone.map(
      (p) => p.number,
    );

    // ------------------------------------------------------------------------
    // Check duplicate email / phone
    //
    // IMPORTANT:
    // This checks ONLY the current branch database.
    // ------------------------------------------------------------------------

    const existing = await branchDb.donor.findFirst({
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

    // ------------------------------------------------------------------------
    // Separate phone + last donation
    // ------------------------------------------------------------------------

    const {
      phone: phoneData,
      lastDonationDate,
      ...donorData
    } = data as typeof data & {
      lastDonationDate?: Date | null;
    };

    // ------------------------------------------------------------------------
    // Calculate eligibility
    // ------------------------------------------------------------------------

    let isEligible = true;
    let deferredUntil: Date | null = null;
    let deferralReason: string | null = null;

    if (lastDonationDate) {
      const eligibility =
        eligibilityFromDonation(lastDonationDate);

      deferredUntil = eligibility.deferredUntil;

      if (
        deferredUntil &&
        new Date() >= deferredUntil
      ) {
        isEligible = true;
        deferredUntil = null;
        deferralReason = null;
      } else {
        isEligible = false;
        deferralReason =
          "Recent donation — 120-day rest period";
      }
    }

    // ------------------------------------------------------------------------
    // Create donor IN BRANCH DATABASE
    // ------------------------------------------------------------------------

    const donor = await branchDb.donor.create({
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

    // ------------------------------------------------------------------------
    // Audit log
    //
    // Existing audit helper remains unchanged.
    // ------------------------------------------------------------------------

    await writeAuditLog(
      session.userId,
      "Donor Created",
      `Registered donor: ${donor.fullName} (${donor.bloodType}) — ID ${donor.id} — Branch ${branchId}`,
    );

    return apiSuccess(
      {
        message:
          "Donor registered successfully",
        donorId: donor.id,
        branchId,
      },
      201,
    );
  },

  {
    permission: "donorAdd",
  },
);