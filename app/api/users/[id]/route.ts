import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import {
  withAuth,
  apiError,
  apiSuccess,
  writeAuditLog,
} from "@/lib/api-helpers";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// Roles
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ROLES = [
  "ADMIN",
  "COORDINATOR",
  "VOLUNTEER",
] as const;

type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(role: unknown): role is ValidRole {
  return (
    typeof role === "string" &&
    VALID_ROLES.includes(role as ValidRole)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/[id]
// Admin only
// ─────────────────────────────────────────────────────────────────────────────

export const PATCH = withAuth(
  async (
    req: NextRequest,
    session,
    params
  ) => {
    const targetId = Number(params?.id);

    if (isNaN(targetId)) {
      return apiError("Invalid user id", 400);
    }

    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    const body = await req.json();

    const {
      newPassword,
      role,
      name,
      email,
      permissions,
      isActive,
    } = body ?? {};

    // ───────────────────────────────────────────────────────────────────────
    // At least one field
    // ───────────────────────────────────────────────────────────────────────

    if (
      newPassword === undefined &&
      role === undefined &&
      name === undefined &&
      email === undefined &&
      permissions === undefined &&
      isActive === undefined
    ) {
      return apiError(
        "At least one update field must be provided",
        400
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Find target user
    // ───────────────────────────────────────────────────────────────────────

    const target = await centralPrisma.branchUser.findFirst({
      where: {
        id: targetId,
        branchId: session.branchId,
      },
    });

    if (!target) {
      return apiError("User not found", 404);
    }

    const updateData: Record<string, unknown> = {};

    // ───────────────────────────────────────────────────────────────────────
    // Name
    // ───────────────────────────────────────────────────────────────────────

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return apiError("Name cannot be empty", 400);
      }

      updateData.name = name.trim();
    }

    // ───────────────────────────────────────────────────────────────────────
    // Email
    // ───────────────────────────────────────────────────────────────────────

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        return apiError("Email cannot be empty", 400);
      }

      const normalizedEmail = email.trim().toLowerCase();

      const existing =
        await centralPrisma.branchUser.findFirst({
          where: {
            email: normalizedEmail,
            branchId: session.branchId,
            id: {
              not: targetId,
            },
          },
        });

      if (existing) {
        return apiError(
          "Email already in use",
          409
        );
      }

      updateData.email = normalizedEmail;
    }

    // ───────────────────────────────────────────────────────────────────────
    // Password
    // ───────────────────────────────────────────────────────────────────────

    if (newPassword !== undefined) {
      if (
        typeof newPassword !== "string" ||
        newPassword.length < 8
      ) {
        return apiError(
          "newPassword must be at least 8 characters",
          400
        );
      }

      updateData.passwordHash =
        await bcrypt.hash(newPassword, 12);
    }

    // ───────────────────────────────────────────────────────────────────────
    // Role
    // ───────────────────────────────────────────────────────────────────────

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return apiError(
          "Invalid role. Allowed roles: ADMIN, COORDINATOR, VOLUNTEER",
          400
        );
      }

      if (targetId === session.userId) {
        return apiError(
          "Cannot change your own role",
          400
        );
      }

      updateData.role = role;
    }

    // ───────────────────────────────────────────────────────────────────────
    // Permissions
    // ───────────────────────────────────────────────────────────────────────

    if (permissions !== undefined) {
      if (
        permissions === null ||
        typeof permissions !== "object" ||
        Array.isArray(permissions)
      ) {
        return apiError(
          "permissions must be a JSON object",
          400
        );
      }

      // Prevent self from removing userManagement permission.
      if (
        targetId === session.userId &&
        (permissions as Record<string, unknown>)
          .userManagement === false
      ) {
        return apiError(
          "Cannot remove your own userManagement permission",
          400
        );
      }

      updateData.permissions = permissions;
    }

    // ───────────────────────────────────────────────────────────────────────
    // Active / Freeze
    // ───────────────────────────────────────────────────────────────────────

    if (isActive !== undefined) {
      if (targetId === session.userId) {
        return apiError(
          "Cannot freeze your own account",
          400
        );
      }

      updateData.isActive = Boolean(isActive);
    }

    // ───────────────────────────────────────────────────────────────────────
    // Update
    // ───────────────────────────────────────────────────────────────────────

    const updated =
      await centralPrisma.branchUser.update({
        where: {
          id: targetId,
        },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: true,
          isActive: true,
          createdAt: true,
        },
      });

    // ───────────────────────────────────────────────────────────────────────
    // Audit
    // ───────────────────────────────────────────────────────────────────────

    await writeAuditLog(
      session.userId,
      "User Updated",
      `Admin (id=${session.userId}) updated user account: ${target.email}`,
      session.branchId,
      session.branchSlug
    );

    return apiSuccess({
      message: "User updated successfully",
      user: updated,
    });
  },
  {
    permission: "userManagement",
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/[id]
// Soft delete / deactivate
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE = withAuth(
  async (
    _req: NextRequest,
    session,
    params
  ) => {
    const targetId = Number(params?.id);

    if (isNaN(targetId)) {
      return apiError("Invalid user id", 400);
    }

    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    if (targetId === session.userId) {
      return apiError(
        "Cannot delete your own account",
        400
      );
    }

    const target =
      await centralPrisma.branchUser.findFirst({
        where: {
          id: targetId,
          branchId: session.branchId,
        },
      });

    if (!target) {
      return apiError("User not found", 404);
    }

    // Soft delete
    await centralPrisma.branchUser.update({
      where: {
        id: targetId,
      },
      data: {
        isActive: false,
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    await writeAuditLog(
      session.userId,
      "User Deleted",
      `Admin (id=${session.userId}) soft-deleted user: ${target.email}`,
      session.branchId,
      session.branchSlug
    );

    return apiSuccess({
      message: "User deleted successfully",
    });
  },
  {
    permission: "userManagement",
  }
);