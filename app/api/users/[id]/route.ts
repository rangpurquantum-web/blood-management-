import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { withAuth, apiError, apiSuccess, writeAuditLog } from "@/lib/api-helpers";
updateData.role = role as "ADMIN" | "VOLUNTEER"; // adjust to wherever BranchUser's Role enum is generated
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// ─── PATCH /api/users/[id]/reset-password  (Admin only) ───────────────────────
export const PATCH = withAuth(
  async (req: NextRequest, session, params) => {
    const targetId = Number(params?.id);
    if (isNaN(targetId)) return apiError("Invalid user id", 400);

    const body = await req.json();
    const { newPassword, role, name, email, permissions, isActive } = body ?? {};

    if (!newPassword && !role && !name && !email && !permissions && isActive === undefined) {
      return apiError("At least one update field must be provided", 400);
    }

    const target = await centralPrisma.branchUser.findFirst({
      where: { id: targetId, branchId: session.branchId },
    });
    if (!target) return apiError("User not found", 404);

    const updateData: any = {};

    if (name) updateData.name = String(name);

    if (email) {
      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = await centralPrisma.branchUser.findFirst({
        where: { email: normalizedEmail, id: { not: targetId } },
      });
      if (existing) return apiError("Email already in use", 409);
      updateData.email = normalizedEmail;
    }

    if (newPassword) {
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return apiError("newPassword must be at least 8 characters", 400);
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (role) {
      if (!["ADMIN", "VOLUNTEER"].includes(role)) {
        return apiError("Invalid role", 400);
      }
      if (targetId === session.userId) {
        return apiError("Cannot change your own role", 400);
      }
      updateData.role = role as Role;
    }

    if (permissions) {
      if (typeof permissions !== "object") {
        return apiError("Invalid permissions format", 400);
      }
      if (targetId === session.userId && permissions.userManagement === false) {
        return apiError("Cannot remove your own user management permission", 400);
      }
      updateData.permissions = permissions;
    }

    if (isActive !== undefined) {
      if (targetId === session.userId) {
        return apiError("Cannot freeze your own account", 400);
      }
      updateData.isActive = Boolean(isActive);
    }

    await centralPrisma.branchUser.update({
      where: { id: targetId },
      data: updateData,
    });

    await writeAuditLog(
      session.userId,
      "User Updated",
      `Admin (id=${session.userId}) updated user account: ${target.email}`,
      session.branchId,
      session.branchSlug,
    );

    return apiSuccess({ message: "User updated successfully" });
  },
  { permission: "userManagement" }
);

// ─── DELETE /api/users/[id]  (Admin only — soft delete) ──────────────────────
export const DELETE = withAuth(
  async (_req: NextRequest, session, params) => {
    const targetId = Number(params?.id);
    if (isNaN(targetId)) return apiError("Invalid user id", 400);

    if (targetId === session.userId) return apiError("Cannot delete your own account", 400);

    const target = await centralPrisma.branchUser.findFirst({
      where: { id: targetId, branchId: session.branchId, isDeleted: false },
    });
    if (!target) return apiError("User not found", 404);

    await centralPrisma.branchUser.update({
      where: { id: targetId },
      data: {
        isDeleted: true,
        isActive: false,
        deletedAt: new Date(),
      },
    });

    await writeAuditLog(
      session.userId,
      "User Deleted",
      `Admin (id=${session.userId}) soft-deleted user: ${target.email}`,
      session.branchId,
      session.branchSlug,
    );

    return apiSuccess({ message: "User deleted" });
  },
  { permission: "userManagement" }
);