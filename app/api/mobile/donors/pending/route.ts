import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { verifyMobileAuth, requireBranch } from "@/lib/mobile-auth";

// GET /api/mobile/donors/pending
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const donors = await branchDb.donor.findMany({
      where: { isDeleted: false, status: "PENDING" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fullName: true,
        bloodType: true,
        address: true,
        createdAt: true,
        phone: {
          where: { isPrimary: true },
          select: { number: true },
        },
      },
    });

    const formatted = donors.map((d) => ({
      id: d.id,
      name: d.fullName,
      bloodGroup: d.bloodType,
      address: d.address,
      phone: d.phone[0]?.number ?? "",
      createdAt: d.createdAt,
    }));

    return NextResponse.json({ success: true, donors: formatted });
  } catch (error) {
    console.error("Mobile pending donors error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load pending donors" },
      { status: 500 },
    );
  }
}