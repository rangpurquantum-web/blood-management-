import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  validationError,
  eligibilityFromDonation,
} from "@/lib/api-helpers";
import { donationSchema } from "@/features/donations";

// ─── GET /api/donors/[id]/history ─────────────────────────────────────────────

export const GET = withAuth(
  async (_req: NextRequest, _session, params) => {
    const donorId = Number(params?.id);

    if (isNaN(donorId)) return apiError("Invalid donor ID", 400);

    const donor = await prisma.donor.findUnique({ where: { id: donorId } });

    if (!donor) return apiError("Donor not found", 404);

    const history = await prisma.donationHistory.findMany({
      where: { donorId },
      orderBy: { donationDate: "desc" },
    });

    return NextResponse.json(history);
  },
);

// ─── POST /api/donors/[id]/history ────────────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, session, params) => {
    const donorId = Number(params?.id);

    if (isNaN(donorId)) return apiError("Invalid donor ID", 400);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = donationSchema.safeParse(body);

    if (!parsed.success) return validationError(parsed.error);

    const donor = await prisma.donor.findUnique({ where: { id: donorId } });

    if (!donor) return apiError("Donor not found", 404);

    // Check current deferral
    if (!donor.isEligible) {
      return apiError(
        `Donor is currently deferred until ${donor.deferredUntil?.toISOString() ?? "an unspecified date"}`,
        400,
      );
    }

    const { patientName, hospitalName, donationDate, notes } = parsed.data;

    // Create donation record and update donor eligibility in a transaction
    const { donation, eligibilityUpdate } = await prisma.$transaction(async (tx) => {
      const donation = await tx.donationHistory.create({
        data: {
          donorId,
          patientName,
          hospitalName,
          donationDate,
          notes: notes ?? null,
        },
      });

      const { isEligible, deferredUntil } = eligibilityFromDonation(donationDate);

      const eligibilityUpdate = await tx.donor.update({
        where: { id: donorId },
        data: {
          isEligible,
          deferredUntil,
          deferralReason: "Recent donation — 56-day rest period",
        },
      });

      return { donation, eligibilityUpdate };
    });

    await writeAuditLog(
      session.userId,
      "Donation Recorded",
      `Logged donation for ${donor.fullName} → patient ${patientName} at ${hospitalName} on ${donationDate.toISOString()}`,
    );

    return apiSuccess(
      {
        message: "Donation history recorded",
        donationId: donation.id,
        donorStatus: {
          isEligible: eligibilityUpdate.isEligible,
          deferredUntil: eligibilityUpdate.deferredUntil,
        },
      },
      201,
    );
  },
);

// ─── DELETE /api/donors/[id]/history — (Admin only, removes a donation record) ─
// Note: This does NOT automatically restore eligibility. Staff must manually
// update eligibility via PATCH /api/donors/[id]/eligibility if needed.

export const DELETE = withAuth(
  async (req: NextRequest, session, params) => {
    const donorId = Number(params?.id);

    if (isNaN(donorId)) return apiError("Invalid donor ID", 400);

    const { searchParams } = new URL(req.url);
    const donationId = Number(searchParams.get("donationId"));

    if (isNaN(donationId)) return apiError("Missing or invalid donationId query param", 400);

    const donation = await prisma.donationHistory.findFirst({
      where: { id: donationId, donorId },
    });

    if (!donation) return apiError("Donation record not found", 404);

    await prisma.donationHistory.delete({ where: { id: donationId } });

    await writeAuditLog(
      session.userId,
      "Donation Record Deleted",
      `Removed donation record ID ${donationId} for donor ID ${donorId}`,
    );

    return apiSuccess({ message: "Donation record deleted" });
  },
  { roles: [Role.Admin] },
);
