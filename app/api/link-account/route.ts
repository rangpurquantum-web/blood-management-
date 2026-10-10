import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { auth as clerkAuth, currentUser } from "@clerk/nextjs/server";

import { centralPrisma } from "@/lib/central-db";

function fail(error: string, status: number) {
  return NextResponse.json({ success: false, error }, { status });
}

export async function POST(req: Request) {
  const { userId: clerkUserId } = await clerkAuth();
  if (!clerkUserId) return fail("Please sign in first", 401);

  const body = await req.json().catch(() => null);
  const code =
    typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  if (code.length < 8) return fail("Invalid or expired code", 400);

  const user = await currentUser();
  const email = user?.primaryEmailAddress;
  if (!email || email.verification?.status !== "verified") {
    return fail("Your email address must be verified first", 403);
  }

  const already = await centralPrisma.userIdentity.findUnique({
    where: { clerkUserId },
    select: { id: true },
  });
  if (already) return fail("This sign-in is already linked", 409);

  const codeHash = createHash("sha256").update(code).digest("hex");
  const now = new Date();
  const record = await centralPrisma.accountLinkCode.findUnique({
    where: { codeHash },
  });

  if (!record || record.usedAt || record.expiresAt <= now) {
    return fail("Invalid or expired code", 400);
  }

  // The target account must still be usable
  if (record.userType === "SUPER_ADMIN") {
    const admin = record.superAdminId
      ? await centralPrisma.superAdmin.findUnique({ where: { id: record.superAdminId } })
      : null;
    if (!admin || !admin.isActive) return fail("Account is not active", 403);
  } else {
    const member = record.branchUserId
      ? await centralPrisma.branchUser.findUnique({
          where: { id: record.branchUserId },
          include: { branch: { select: { isActive: true } } },
        })
      : null;
    if (!member || !member.isActive || member.isDeleted || !member.branch.isActive) {
      return fail("Account is not active", 403);
    }
  }

  try {
    await centralPrisma.$transaction(async (tx) => {
      const claimed = await tx.accountLinkCode.updateMany({
        where: { id: record.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new Error("CODE_USED");

      await tx.userIdentity.create({
        data: {
          clerkUserId,
          userType: record.userType,
          superAdminId: record.userType === "SUPER_ADMIN" ? record.superAdminId : null,
          branchUserId: record.userType === "BRANCH_USER" ? record.branchUserId : null,
        },
      });
    });
  } catch {
    return fail("Could not link this account (already linked or code used)", 409);
  }

  return NextResponse.json({ success: true });
}
