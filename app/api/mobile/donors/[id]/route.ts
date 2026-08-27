import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { verifyMobileAuth, requireBranch } from "@/lib/mobile-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// GET /api/mobile/donors/[id]
export async function GET(req: NextRequest, context: RouteContext) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const { id: idParam } = await context.params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid donor ID" },
      { status: 400 },
    );
  }

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const donor = await branchDb.donor.findFirst({
      where: { id, isDeleted: false },
      include: {
        phone: true,
        donations: {
          orderBy: { donationDate: "desc" },
          take: 1,
        },
      },
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, error: "Donor not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      donor: {
        id: donor.id,
        fullName: donor.fullName,
        dob: donor.dob,
        gender: donor.gender,
        bloodType: donor.bloodType,
        email: donor.email,
        address: donor.address,
        isEligible: donor.isEligible,
        deferralReason: donor.deferralReason,
        deferredUntil: donor.deferredUntil,
        phone: donor.phone.map((p) => ({
          number: p.number,
          label: p.label,
          isPrimary: p.isPrimary,
        })),
        lastDonationDate: donor.donations[0]?.donationDate ?? null,
      },
    });
  } catch (error) {
    console.error("Mobile donor detail error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load donor" },
      { status: 500 },
    );
  }
}