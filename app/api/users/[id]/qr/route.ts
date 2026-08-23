import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";

async function requireAdmin(userId: number) {
  const session = await auth();

  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const isSuperAdmin = Boolean((session.user as { isSuperAdmin?: boolean }).isSuperAdmin);
  const role = session.user.role;

  if (!isSuperAdmin && role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const targetUser = await centralPrisma.branchUser.findUnique({
    where: { id: userId },
    select: { branchId: true },
  });

  if (!targetUser) {
    return { error: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }

  // Branch admins can only manage QR for users in their own branch
  if (!isSuperAdmin && targetUser.branchId !== session.user.branchId) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return { error: null };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const check = await requireAdmin(userId);
  if (check.error) return check.error;

  const user = await centralPrisma.branchUser.findUnique({
    where: { id: userId },
    select: { qrToken: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  let token = user.qrToken;

  if (!token) {
    token = randomUUID();
    await centralPrisma.branchUser.update({
      where: { id: userId },
      data: { qrToken: token },
    });
  }

  return NextResponse.json({ token });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
  }

  const check = await requireAdmin(userId);
  if (check.error) return check.error;

  const token = randomUUID();

  await centralPrisma.branchUser.update({
    where: { id: userId },
    data: { qrToken: token },
  });

  return NextResponse.json({ token });
}