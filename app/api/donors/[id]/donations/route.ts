import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  eligibilityFromDonation,
} from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ─── Helper: validate branch + get branch DB ─────────────────────────────────

async function getValidatedBranchDb(branchId: number | null) {
  if (
    typeof branchId !== "number" ||
    !Number.isInteger(branchId) ||
    branchId <= 0
  ) {
    return {
      branchDb: null,
      error: apiError(
        "Your account is not associated with a valid branch",
        403,
      ),
    };
  }

  try {
    const branchDb = await getBranchDb(branchId);
    return { branchDb, error: null };
  } catch (error) {
    console.error(`Failed to connect to branch database: ${branchId}`, error);
    return {
      branchDb: null,
      error: apiError("Could not connect to branch database", 503),
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/donors/[id]/donations
// Get donation history for a donor
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(
  async (_req: NextRequest, session, params) => {
    const donorId = Number(params?.id);

    if (!Number.isInteger(donorId) || donorId <= 0) {
      return apiError("Invalid donor ID", 400);
    }

    const { branchDb, error } = await getValidatedBranchDb(session.branchId);

    if (error) {
      return error;
    }

    const donor = await branchDb!.donor.findFirst({
      where: {
        id: donorId,
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        bloodType: true,
        isEligible: true,
        deferredUntil: true,
      },
    });

    if (!donor) {
      return apiError("Donor not found", 404);
    }

    const donations = await branchDb!.donationHistory.findMany({
      where: {
        donorId,
      },
      orderBy: {
        donationDate: "desc",
      },
    });

    return NextResponse.json({
      donor,
      donations,
    });
  },
  {
    permission: "donorView",
  },
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/donors/[id]/donations
// Add a new donation history record
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, session, params) => {
    const donorId = Number(params?.id);

    if (!Number.isInteger(donorId) || donorId <= 0) {
      return apiError("Invalid donor ID", 400);
    }

    const { branchDb, error } = await getValidatedBranchDb(session.branchId);

    if (error) {
      return error;
    }

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    if (!body || typeof body !== "object") {
      return apiError("Invalid request body", 400);
    }

    const {
      patientName,
      hospitalName,
      donationDate,
      notes,
    } = body as {
      patientName?: unknown;
      hospitalName?: unknown;
      donationDate?: unknown;
      notes?: unknown;
    };

    // ── Required fields ──────────────────────────────────────────────────────

    if (
      typeof patientName !== "string" ||
      !patientName.trim()
    ) {
      return apiError("Patient name is required", 400);
    }

    if (
      typeof hospitalName !== "string" ||
      !hospitalName.trim()
    ) {
      return apiError("Hospital name is required", 400);
    }

    if (
      typeof donationDate !== "string" ||
      !donationDate.trim()
    ) {
      return apiError("Donation date is required", 400);
    }

    // ── Date validation ──────────────────────────────────────────────────────

    const parsedDate = new Date(donationDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return apiError("Invalid donation date", 400);
    }

    // Donation cannot be in the future.
    if (parsedDate > new Date()) {
      return apiError("Donation date cannot be in the future", 400);
    }

    // ── Find donor ────────────────────────────────────────────────────────────

    const donor = await branchDb!.donor.findFirst({
      where: {
        id: donorId,
        isDeleted: false,
      },
      select: {
        id: true,
        fullName: true,
        bloodType: true,
      },
    });

    if (!donor) {
      return apiError("Donor not found", 404);
    }

    // ── Calculate eligibility ─────────────────────────────────────────────────
    //
    // Current business rule:
    // 120 days deferral after donation.
    //

    const eligibility = eligibilityFromDonation(parsedDate);

    const donationNotes =
      typeof notes === "string" && notes.trim()
        ? notes.trim()
        : null;

    // ── Transaction ──────────────────────────────────────────────────────────

    const result = await branchDb!.$transaction(async (tx) => {
      const donation = await tx.donationHistory.create({
        data: {
          donorId,
          patientName: patientName.trim(),
          hospitalName: hospitalName.trim(),
          donationDate: parsedDate,
          notes: donationNotes,
        },
      });

      const updatedDonor = await tx.donor.update({
        where: {
          id: donorId,
        },
        data: {
          isEligible: eligibility.isEligible,
          deferredUntil: eligibility.deferredUntil,
          deferralReason: "Recent donation — 4-month rest period",
        },
        select: {
          id: true,
          fullName: true,
          bloodType: true,
          isEligible: true,
          deferredUntil: true,
          deferralReason: true,
        },
      });

      return {
        donation,
        donor: updatedDonor,
      };
    });

    // ── Audit ─────────────────────────────────────────────────────────────────

    await writeAuditLog(
      session.userId,
      "Donation Recorded",
      `Recorded donation for donor: ${donor.fullName} (${donor.bloodType}) — Donor ID ${donor.id}, Donation ID ${result.donation.id} — Branch ${session.branchId}`,
    );

    return apiSuccess(
      {
        message: "Donation recorded successfully",
        donation: result.donation,
        donor: result.donor,
      },
      201,
    );
  },
  {
    permission: "donorEdit",
  },
);