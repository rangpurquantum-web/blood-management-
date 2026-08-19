import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  eligibilityFromDonation,
} from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/donors/[id]/donations
// Get donation history for a donor
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(
  async (_req: NextRequest, _session, params) => {
    const donorId = Number(params?.id);

    if (!Number.isInteger(donorId) || donorId <= 0) {
      return apiError("Invalid donor ID", 400);
    }

    const donor = await prisma.donor.findFirst({
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

    const donations = await prisma.donationHistory.findMany({
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

    const donor = await prisma.donor.findFirst({
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

    const result = await prisma.$transaction(async (tx) => {
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
      `Recorded donation for donor: ${donor.fullName} (${donor.bloodType}) — Donor ID ${donor.id}, Donation ID ${result.donation.id}`,
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