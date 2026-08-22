import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { getBranchDb } from "@/lib/branch-db";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────
// Helper: find donor + which branch DB they live in
// Public QR route has no session, so no branchId is known —
// check every active branch DB until the token matches.
// ─────────────────────────────────────────────

async function findDonorWithBranchDb(token: string) {
  const branches = await centralPrisma.branch.findMany({
    where: { isActive: true },
    select: { id: true },
  });

  for (const branch of branches) {
    const branchDb = await getBranchDb(branch.id);

    const donor = await branchDb.donor.findFirst({
      where: {
        publicToken: token,
        isDeleted: false,
        status: "APPROVED",
      },
      include: {
        donations: {
          orderBy: {
            donationDate: "desc",
          },
          take: 1,
        },
      },
    });

    if (donor) {
      return { donor, branchDb };
    }
  }

  return null;
}

// ─────────────────────────────────────────────
// GET
// Get donor information + latest donation date
// ─────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid donor token",
        },
        { status: 400 }
      );
    }

    const result = await findDonorWithBranchDb(token);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            "এই কার্ডটি সঠিক নয় বা ডোনার খুঁজে পাওয়া যায়নি",
        },
        { status: 404 }
      );
    }

    const { donor } = result;

    const lastDonation = donor.donations[0] ?? null;

    return NextResponse.json({
      success: true,

      donor: {
        id: donor.id,
        fullName: donor.fullName,
        bloodType: donor.bloodType,
        dob: donor.dob,
        isEligible: donor.isEligible,
        deferredUntil: donor.deferredUntil,
      },

      lastDonationDate: lastDonation
        ? lastDonation.donationDate
        : null,
    });
  } catch (error) {
    console.error("PUBLIC DONOR GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ডোনারের তথ্য লোড করা যায়নি",
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// POST
// Update latest donation date
// ─────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid donor token",
        },
        { status: 400 }
      );
    }

    const body = await req.json();

    const donationDate = body?.donationDate;

    if (!donationDate) {
      return NextResponse.json(
        {
          success: false,
          error: "Donation date is required",
        },
        { status: 400 }
      );
    }

    const parsedDate = new Date(donationDate);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid donation date",
        },
        { status: 400 }
      );
    }

    // ─────────────────────────────────────────
    // Find donor (and the branch DB they belong to)
    // ─────────────────────────────────────────

    const result = await findDonorWithBranchDb(token);

    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error:
            "এই কার্ডটি সঠিক নয় বা ডোনার খুঁজে পাওয়া যায়নি",
        },
        { status: 404 }
      );
    }

    const { donor, branchDb } = result;

    // ─────────────────────────────────────────
    // Block self-update while donor is deferred
    // ─────────────────────────────────────────

    if (!donor.isEligible) {
      return NextResponse.json(
        {
          success: false,
          error:
            "আপনি বর্তমানে ডোনেশনের জন্য deferred অবস্থায় আছেন, তাই এই মুহূর্তে ডেট আপডেট করা যাবে না।",
        },
        { status: 403 }
      );
    }

    // ─────────────────────────────────────────
    // Find latest donation (in the same branch DB)
    // ─────────────────────────────────────────

    const latestDonation =
      await branchDb.donationHistory.findFirst({
        where: {
          donorId: donor.id,
        },
        orderBy: {
          donationDate: "desc",
        },
      });

    let donation;

    // ─────────────────────────────────────────
    // Update existing latest donation
    // ─────────────────────────────────────────

    if (latestDonation) {
      donation = await branchDb.donationHistory.update({
        where: {
          id: latestDonation.id,
        },
        data: {
          donationDate: parsedDate,
        },
      });
    }

    // ─────────────────────────────────────────
    // Create first donation if none exists
    // ─────────────────────────────────────────

    else {
      donation = await branchDb.donationHistory.create({
        data: {
          donorId: donor.id,
          patientName: "Direct / Self Donation",
          hospitalName: "N/A",
          donationDate: parsedDate,
          notes: "Recorded from public donor QR page",
        },
      });
    }

    // ─────────────────────────────────────────
    // Calculate next eligible date
    // ─────────────────────────────────────────

    const deferredUntil = new Date(parsedDate);

    deferredUntil.setDate(
      deferredUntil.getDate() + 120
    );

    // ─────────────────────────────────────────
    // Update donor eligibility (in the same branch DB)
    // ─────────────────────────────────────────

    await branchDb.donor.update({
      where: {
        id: donor.id,
      },
      data: {
        isEligible: false,
        deferredUntil,
        deferralReason: "Recent blood donation",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Donation date updated successfully",

      donation: {
        id: donation.id,
        donationDate: donation.donationDate,
      },

      deferredUntil,
    });
  } catch (error) {
    console.error(
      "PUBLIC DONATION UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Donation date update করা যায়নি",
      },
      { status: 500 }
    );
  }
}
