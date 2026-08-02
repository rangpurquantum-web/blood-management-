import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, apiError, apiSuccess, writeAuditLog } from "@/lib/api-helpers";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";

// ─── POST /api/users/change-password ──────────────────────────────────────────
// Any logged-in user can call this to change their own password.
// Body: { currentPassword, newPassword }

export const POST = withAuth(async (req: NextRequest, session) => {
  const body = await req.json();
  const { currentPassword, newPassword } = body ?? {};

  if (!currentPassword || !newPassword) {
    return apiError("currentPassword and newPassword are required", 400);
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return apiError("New password must be at least 8 characters", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) return apiError("User not found", 404);

  const match = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!match) return apiError("Current password is incorrect", 400);

  const hash = await bcrypt.hash(String(newPassword), 12);
  await prisma.user.update({
    where: { id: session.userId },
    data: { passwordHash: hash },
  });

  // Audit log
  await writeAuditLog(session.userId, "Password Changed", `User ${user.email} changed their own password`);

  return apiSuccess({ message: "Password changed successfully" });
});
