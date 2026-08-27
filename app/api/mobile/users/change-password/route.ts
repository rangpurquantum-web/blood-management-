import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { centralPrisma } from "@/lib/central-db";
import { verifyMobileAuth } from "@/lib/mobile-auth";

// POST /api/mobile/users/change-password
// body: { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { currentPassword, newPassword } = body as {
    currentPassword?: unknown;
    newPassword?: unknown;
  };

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: "currentPassword and newPassword are required" },
      { status: 400 },
    );
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: "New password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const hash = await bcrypt.hash(String(newPassword), 12);
  const { id: userId, isSuperAdmin } = authResult.payload;

  try {
    if (isSuperAdmin) {
      const admin = await centralPrisma.superAdmin.findUnique({ where: { id: userId } });
      if (!admin) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 },
        );
      }

      const match = await bcrypt.compare(String(currentPassword), admin.passwordHash);
      if (!match) {
        return NextResponse.json(
          { success: false, error: "Current password is incorrect" },
          { status: 400 },
        );
      }

      await centralPrisma.superAdmin.update({
        where: { id: userId },
        data: { passwordHash: hash },
      });

      return NextResponse.json({ success: true, message: "Password changed successfully" });
    }

    const user = await centralPrisma.branchUser.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const match = await bcrypt.compare(String(currentPassword), user.passwordHash);
    if (!match) {
      return NextResponse.json(
        { success: false, error: "Current password is incorrect" },
        { status: 400 },
      );
    }

    await centralPrisma.branchUser.update({
      where: { id: userId },
      data: { passwordHash: hash },
    });

    return NextResponse.json({ success: true, message: "Password changed successfully" });
  } catch (error) {
    console.error("Mobile change password error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to change password" },
      { status: 500 },
    );
  }
}