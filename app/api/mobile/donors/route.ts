import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { verifyMobileAuth, requireBranch } from "@/lib/mobile-auth";
import type { Prisma } from "@/generated/branch";

// GET /api/mobile/donors?q=search-term
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const where: Prisma.DonorWhereInput = {
      isDeleted: false,
      status: "APPROVED",
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { some: { number: { contains: q } } } },
      ];
    }

    const donors = await branchDb.donor.findMany({
      where,
      orderBy: { fullName: "asc" },
      take: 30,
      select: {
        id: true,
        fullName: true,
        bloodType: true,
        phone: {
          where: { isPrimary: true },
          select: { number: true },
        },
      },
    });

    const formatted = donors.map((d) => ({
      id: d.id,
      name: d.fullName,
      phone: d.phone[0]?.number ?? "",
      bloodGroup: d.bloodType,
    }));

    return NextResponse.json({ success: true, donors: formatted });
  } catch (error) {
    console.error("Mobile donors search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search donors" },
      { status: 500 },
    );
  }
}