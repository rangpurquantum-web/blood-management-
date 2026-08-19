import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  validationError,
  eligibilityFromDonation,
} from "@/lib/api-helpers";
import { donorUpdateSchema } from "@/features/donors";

// ─── GET /api/donors/[id] ─────────────────────────────────────────────────────

export const GET = withAuth(
  async (_req: NextRequest, _session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) {
      return apiError("Invalid donor ID", 400);
    }

    const donor = await prisma.donor.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        phone: true,
        donations: {
          orderBy: {
            donationDate: "desc",
          },
        },
      },
    });

    if (!donor) {
      return apiError("Donor not found", 404);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Calculate eligibility from the donor's latest donation
    // ─────────────────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────────────────
    // Sync calculated eligibility with database
    // ─────────────────────────────────────────────────────────────────────────

    if (
      donor.isEligible !== isEligible ||
      donor.deferredUntil?.getTime() !==
        deferredUntil?.getTime() ||
      donor.deferralReason !== deferralReason
    ) {
      await prisma.donor.update({
        where: {
          id,
        },
        data: {
          isEligible,
          deferredUntil,
          deferralReason,
        },
      });
    }

    // Return the freshly calculated eligibility
    return NextResponse.json({
      ...donor,
      isEligible,
      deferredUntil,
      deferralReason,
    });
  },
  { permission: "donorView" },
);

// ─── PATCH /api/donors/[id] ───────────────────────────────────────────────────

export const PATCH = withAuth(
  async (req: NextRequest, session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) {
      return apiError("Invalid donor ID", 400);
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = donorUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const existing = await prisma.donor.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existing) {
      return apiError("Donor not found", 404);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Check uniqueness if phone or email are being updated
    // ─────────────────────────────────────────────────────────────────────────

    const data = parsed.data;

    if (data.email || data.phone) {
      const phoneNumbers = data.phone
        ? data.phone.map((p) => p.number)
        : [];

      const conflict = await prisma.donor.findFirst({
        where: {
          AND: [
            {
              id: {
                not: id,
              },
            },
            {
              isDeleted: false,
            },
            {
              OR: [
                ...(data.email
                  ? [
                      {
                        email: data.email,
                      },
                    ]
                  : []),

                ...(phoneNumbers.length > 0
                  ? [
                      {
                        phone: {
                          some: {
                            number: {
                              in: phoneNumbers,
                            },
                          },
                        },
                      },
                    ]
                  : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        if (conflict.email === data.email) {
          return apiError(
            `এই ইমেইল দিয়ে ইতিমধ্যে অন্য একজন ডোনার রেজিস্টার্ড আছেন (${conflict.fullName})`,
            409,
          );
        }

        return apiError(
          `এই নম্বর দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${conflict.fullName})`,
          409,
        );
      }
    }

    const {
      phone: phoneData,
      ...donorData
    } = data;

    // ─────────────────────────────────────────────────────────────────────────
    // Update donor
    // ─────────────────────────────────────────────────────────────────────────

    const updated = await prisma.$transaction(async (tx) => {
      if (phoneData) {
        await tx.donorPhone.deleteMany({
          where: {
            donorId: id,
          },
        });
      }

      return await tx.donor.update({
        where: {
          id,
        },
        data: {
          ...donorData,

          ...(phoneData
            ? {
                phone: {
                  create: phoneData.map((p) => ({
                    number: p.number,
                    label: p.label,
                    isPrimary: p.isPrimary,
                  })),
                },
              }
            : {}),
        },
        include: {
          phone: true,
        },
      });
    });

    await writeAuditLog(
      session.userId,
      "Donor Updated",
      `Updated donor: ${updated.fullName} — ID ${updated.id}`,
    );

    return apiSuccess({
      message: "Donor updated",
      donor: updated,
    });
  },
  { permission: "donorEdit" },
);

// ─── DELETE /api/donors/[id] ──────────────────────────────────────────────────

export const DELETE = withAuth(
  async (_req: NextRequest, session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) {
      return apiError("Invalid donor ID", 400);
    }

    const existing = await prisma.donor.findFirst({
      where: {
        id,
      },
    });

    if (!existing) {
      return apiError("Donor not found", 404);
    }

    // Permanently delete donor.
    // Related DonorPhone and DonationHistory records
    // are removed via onDelete: Cascade.
    await prisma.donor.delete({
      where: {
        id,
      },
    });

    await writeAuditLog(
      session.userId,
      "Donor Deleted",
      `Permanently deleted donor: ${existing.fullName} (${existing.bloodType}) — ID ${id}`,
    );

    return apiSuccess({
      message: "Donor permanently deleted",
    });
  },
  { permission: "donorDelete" },
);