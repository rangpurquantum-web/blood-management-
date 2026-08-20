import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";

export const ACTIVE_BRANCH_COOKIE = "activeBranchId";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json(
      { error: "Only super admins can switch branches" },
      { status: 403 }
    );
  }

  const { branchId } = await req.json();

  if (!branchId || typeof branchId !== "string") {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  const branch = await centralPrisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, slug: true },
  });

  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BRANCH_COOKIE, branch.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 দিন
  });

  return NextResponse.json({ success: true, branchId: branch.id, branchSlug: branch.slug });
}

export async function GET() {
  const cookieStore = await cookies();
  const branchId = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value ?? null;
  return NextResponse.json({ branchId });
}