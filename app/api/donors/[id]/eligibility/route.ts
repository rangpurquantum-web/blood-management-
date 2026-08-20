import { NextRequest } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api-helpers";
import { donorEligibilitySchema } from "@/features/donors";

// ─── PATCH /api/donors/[id]/eligibility ───────────────────────────────────────
// Manual deferral by an authenticated user (Staff or Admin)

export const PATCH = withAuth(
  async (req: NextRequest, session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) return apiError("Invalid donor ID", 400);

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

    let branchDb;

    try {
      branchDb = await getBranchDb(branchId);
    } catch (error) {
      console.error(`Failed to connect to branch database: ${branchId}`, error);
      return apiError("Could not connect to branch database", 503);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = donorEligibilitySchema.safeParse(body);

    if (!parsed.success) return validationError(parsed.error);

    const donor = await branchDb.donor.findFirst({ where: { id, isDeleted: false } });

    if (!donor) return apiError("Donor not found", 404);

    const { deferralReason, deferredUntil } = parsed.data;

    const updated = await branchDb.donor.update({
      where: { id },
      data: {
        isEligible: false,
        deferralReason,
        deferredUntil,
      },
    });

    await writeAuditLog(
      session.userId,
      "Donor Manually Deferred",
      `Deferred donor: ${updated.fullName} until ${deferredUntil.toISOString()} — Reason: ${deferralReason} — Branch ${branchId}`,
    );

    return apiSuccess({
      message: "Donor deferred successfully",
      donorStatus: {
        isEligible: updated.isEligible,
        deferredUntil: updated.deferredUntil,
        deferralReason: updated.deferralReason,
      },
    });
  },
  { permission: "approveReject" }
);