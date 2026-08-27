import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { verifyMobileAuth, requireBranch, requireAdmin } from "@/lib/mobile-auth";

// GET /api/mobile/users
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  try {
    const users = await centralPrisma.branchUser.findMany({
      where: { branchId: branchResult.branchId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Mobile users list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load users" },
      { status: 500 },
    );
  }
}