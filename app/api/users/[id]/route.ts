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

// ─── PATCH /api/users/[id] ─────────────────────────────────────
// Update user account
export const PATCH = withAuth(
  async (req: NextRequest, session, params) => {
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
      isActive,
    } = body ?? {};

    // ─────────────────────────────────────────────────────────
    // Check whether at least one field is provided
    // ─────────────────────────────────────────────────────────

    if (
      !newPassword &&
      !role &&
      !name &&
      !email &&
      isActive === undefined
    ) {
      return apiError(
        "At least one update field must be provided",
        400
      );
    }

    // ─────────────────────────────────────────────────────────
    // Find target user in the current branch
    // ─────────────────────────────────────────────────────────

    const target = await centralPrisma.branchUser.findFirst({
      where: {
        id: targetId,
        branchId: session.branchId,
      },
    });

    if (!target) {
      return apiError("User not found", 404);
    }

    // ─────────────────────────────────────────────────────────
    // Prepare update data
    // ─────────────────────────────────────────────────────────

    const updateData: Record<string, unknown> = {};

    // ─────────────────────────────────────────────────────────
    // Name
    // ─────────────────────────────────────────────────────────

    if (name !== undefined) {
      const normalizedName = String(name).trim();

      if (!normalizedName) {
        return apiError("Name cannot be empty", 400);
      }

      updateData.name = normalizedName;
    }

    // ─────────────────────────────────────────────────────────
    // Email
    // ─────────────────────────────────────────────────────────

    if (email !== undefined) {
      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      if (!normalizedEmail) {
        return apiError("Email cannot be empty", 400);
      }

      const existing = await centralPrisma.branchUser.findFirst({
        where: {
          email: normalizedEmail,
          id: {
            not: targetId,
          },
        },
      });

      if (existing) {
        return apiError("Email already in use", 409);
      }

      updateData.email = normalizedEmail;
    }

    // ─────────────────────────────────────────────────────────
    // Password
    // ─────────────────────────────────────────────────────────

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

      updateData.passwordHash = await bcrypt.hash(
        newPassword,
        12
      );
    }

    // ─────────────────────────────────────────────────────────
    // ROLE
    //
    // Supported roles:
    // ADMIN
    // COORDINATOR
    // VOLUNTEER
    // ─────────────────────────────────────────────────────────

    if (role !== undefined) {
      const allowedRoles = [
        "ADMIN",
        "COORDINATOR",
        "VOLUNTEER",
      ];

      const normalizedRole = String(role)
        .trim()
        .toUpperCase();

      if (!allowedRoles.includes(normalizedRole)) {
        return apiError("Invalid role", 400);
      }

      // Cannot change your own role
      if (targetId === session.userId) {
        return apiError(
          "Cannot change your own role",
          400
        );
      }

      updateData.role = normalizedRole;
    }

    // ─────────────────────────────────────────────────────────
    // Active / Freeze
    // ─────────────────────────────────────────────────────────

    if (isActive !== undefined) {
      // Cannot freeze yourself
      if (targetId === session.userId) {
        return apiError(
          "Cannot freeze your own account",
          400
        );
      }

      updateData.isActive = Boolean(isActive);
    }

    // ─────────────────────────────────────────────────────────
    // Update user
    // ─────────────────────────────────────────────────────────

    const updatedUser =
      await centralPrisma.branchUser.update({
        where: {
          id: targetId,
        },
        data: updateData,
      });

    // ─────────────────────────────────────────────────────────
    // Audit log
    // ─────────────────────────────────────────────────────────

    await writeAuditLog(
      session.userId,
      "User Updated",
      `Admin (id=${session.userId}) updated user account: ${target.email}`,
      session.branchId,
      session.branchSlug
    );

    // ─────────────────────────────────────────────────────────
    // Success
    // ─────────────────────────────────────────────────────────

    return apiSuccess({
      message: "User updated successfully",
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        isActive: updatedUser.isActive,
      },
    });
  },
  {
    permission: "userManagement",
  }
);

// ─── DELETE /api/users/[id] ────────────────────────────────────
// Deactivate user account
export const DELETE = withAuth(
  async (_req: NextRequest, session, params) => {
    const targetId = Number(params?.id);

    if (isNaN(targetId)) {
      return apiError("Invalid user id", 400);
    }

    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    // Cannot delete yourself
    if (targetId === session.userId) {
      return apiError(
        "Cannot delete your own account",
        400
      );
    }

    // Find target user
    const target = await centralPrisma.branchUser.findFirst({
      where: {
        id: targetId,
        branchId: session.branchId,
      },
    });

    if (!target) {
      return apiError("User not found", 404);
    }

    // Deactivate account
    await centralPrisma.branchUser.update({
      where: {
        id: targetId,
      },
      data: {
        isActive: false,
      },
    });

    // Audit log
    await writeAuditLog(
      session.userId,
      "User Deleted",
      `Admin (id=${session.userId}) deactivated user: ${target.email}`,
      session.branchId,
      session.branchSlug
    );

    return apiSuccess({
      message: "User deleted",
    });
  },
  {
    permission: "userManagement",
  }
);