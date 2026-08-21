import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { withAuth, apiError, apiSuccess, writeAuditLog } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (req: NextRequest, session) => {
  const body = await req.json();
  const { currentPassword, newPassword } = body ?? {};

  if (!currentPassword || !newPassword) {
    return apiError("currentPassword and newPassword are required", 400);
  }

  if (typeof newPassword !== "string" || newPassword.length < 8) {
    return apiError("New password must be at least 8 characters", 400);
  }

  const hash = await bcrypt.hash(String(newPassword), 12);

  if (session.isSuperAdmin) {
    const admin = await centralPrisma.superAdmin.findUnique({ where: { id: session.userId } });
    if (!admin) return apiError("User not found", 404);

    const match = await bcrypt.compare(String(currentPassword), admin.passwordHash);
    if (!match) return apiError("Current password is incorrect", 400);

    await centralPrisma.superAdmin.update({
      where: { id: session.userId },
      data: { passwordHash: hash },
    });

    await writeAuditLog(session.userId, "Password Changed", `SuperAdmin ${admin.email} changed their own password`);
    return apiSuccess({ message: "Password changed successfully" });
  }

  const user = await centralPrisma.branchUser.findUnique({ where: { id: session.userId } });
  if (!user) return apiError("User not found", 404);

  const match = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!match) return apiError("Current password is incorrect", 400);

  await centralPrisma.branchUser.update({
    where: { id: session.userId },
    data: { passwordHash: hash },
  });

  await writeAuditLog(session.userId, "Password Changed", `User ${user.email} changed their own password`, session.branchId, session.branchSlug);

  return apiSuccess({ message: "Password changed successfully" });
});