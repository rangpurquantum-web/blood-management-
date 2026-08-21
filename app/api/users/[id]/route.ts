import { NextRequest } from "next/server";
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
// Permission Keys
// ─────────────────────────────────────────────────────────────────────────────

const PERMISSION_KEYS = [
  "donorView",
  "donorAdd",
  "donorEdit",
  "donorDelete",
  "approveReject",
  "notesEdit",
  "reportsExport",
  "userManagement",
] as const;

type PermissionKey = (typeof PERMISSION_KEYS)[number];

const VALID_ROLES = ["ADMIN", "VOLUNTEER"] as const;

type ValidRole = (typeof VALID_ROLES)[number];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isValidRole(role: unknown): role is ValidRole {
  return (
    typeof role === "string" &&
    VALID_ROLES.includes(role as ValidRole)
  );
}

function sanitizePermissions(
  permissions: unknown
): Record<PermissionKey, boolean> | null {
  if (
    typeof permissions !== "object" ||
    permissions === null ||
    Array.isArray(permissions)
  ) {
    return null;
  }

  const input = permissions as Record<string, unknown>;

  const result = {} as Record<PermissionKey, boolean>;

  for (const key of PERMISSION_KEYS) {
    if (input[key] !== undefined) {
      result[key] = Boolean(input[key]);
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/[id]
// Admin only
//
// Supports:
// - name
// - email
// - password
// - role
// - permissions
// - isActive
// ─────────────────────────────────────────────────────────────────────────────

export const PATCH = withAuth(
  async (
    req: NextRequest,
    session,
    params
  ) => {
    // ─────────────────────────────────────────────────────────────────────────
    // Validate ID
    // ─────────────────────────────────────────────────────────────────────────

    const targetId = Number(params?.id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return apiError("Invalid user id", 400);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Branch check
    // ─────────────────────────────────────────────────────────────────────────

    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parse request
    // ─────────────────────────────────────────────────────────────────────────

    let body: any;

    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const {
      newPassword,
      role,
      name,
      email,
      isActive,
      permissions,
    } = body ?? {};

    // ─────────────────────────────────────────────────────────────────────────
    // At least one field required
    // ─────────────────────────────────────────────────────────────────────────

    if (
      newPassword === undefined &&
      role === undefined &&
      name === undefined &&
      email === undefined &&
      isActive === undefined &&
      permissions === undefined
    ) {
      return apiError(
        "At least one update field must be provided",
        400
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Find target user inside current branch
    // ─────────────────────────────────────────────────────────────────────────

    const target = await centralPrisma.branchUser.findFirst({
      where: {
        id: targetId,
        branchId: session.branchId,
      },
    });

    if (!target) {
      return apiError("User not found", 404);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Prepare update
    // ─────────────────────────────────────────────────────────────────────────

    const updateData: any = {};

    // ─────────────────────────────────────────────────────────────────────────
    // Name
    // ─────────────────────────────────────────────────────────────────────────

    if (name !== undefined) {
      if (
        typeof name !== "string" ||
        !name.trim()
      ) {
        return apiError("Name is required", 400);
      }

      updateData.name = name.trim();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Email
    // ─────────────────────────────────────────────────────────────────────────

    if (email !== undefined) {
      if (
        typeof email !== "string" ||
        !email.trim()
      ) {
        return apiError("Email is required", 400);
      }

      const normalizedEmail = email
        .trim()
        .toLowerCase();

      // Basic email validation
      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(normalizedEmail)) {
        return apiError("Invalid email address", 400);
      }

      // Check duplicate email
      const existing =
        await centralPrisma.branchUser.findFirst({
          where: {
            email: normalizedEmail,
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

    // ─────────────────────────────────────────────────────────────────────────
    // Password
    // ─────────────────────────────────────────────────────────────────────────

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

    // ─────────────────────────────────────────────────────────────────────────
    // Role
    // ─────────────────────────────────────────────────────────────────────────

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return apiError(
          "Invalid role. Allowed roles: ADMIN, VOLUNTEER",
          400
        );
      }

      // Prevent changing own role
      if (targetId === session.userId) {
        return apiError(
          "Cannot change your own role",
          400
        );
      }

      updateData.role = role;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Permissions
    // ─────────────────────────────────────────────────────────────────────────

    if (permissions !== undefined) {
      const cleanPermissions =
        sanitizePermissions(permissions);

      if (!cleanPermissions) {
        return apiError(
          "Invalid permissions format",
          400
        );
      }

      updateData.permissions =
        cleanPermissions;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Active / Frozen
    // ─────────────────────────────────────────────────────────────────────────

    if (isActive !== undefined) {
      if (
        typeof isActive !== "boolean"
      ) {
        return apiError(
          "isActive must be boolean",
          400
        );
      }

      // Prevent freezing own account
      if (
        targetId === session.userId
      ) {
        return apiError(
          "Cannot freeze your own account",
          400
        );
      }

      updateData.isActive = isActive;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Update database
    // ─────────────────────────────────────────────────────────────────────────

    const updatedUser =
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

    // ─────────────────────────────────────────────────────────────────────────
    // Audit log
    // ─────────────────────────────────────────────────────────────────────────

    const changedFields =
      Object.keys(updateData);

    await writeAuditLog(
      session.userId,
      "User Updated",
      `Admin (id=${session.userId}) updated user account: ${target.email}. Fields: ${changedFields.join(
        ", "
      )}`,
      session.branchId,
      session.branchSlug
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Response
    // ─────────────────────────────────────────────────────────────────────────

    return apiSuccess({
      message: "User updated successfully",
      user: updatedUser,
    });
  },
  {
    permission: "userManagement",
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/[id]
// Admin only
//
// This is a SOFT DELETE through isActive=false.
// Your current schema doesn't have isDeleted/deletedAt for BranchUser.
// ─────────────────────────────────────────────────────────────────────────────

export const DELETE = withAuth(
  async (
    _req: NextRequest,
    session,
    params
  ) => {
    // ─────────────────────────────────────────────────────────────────────────
    // Validate ID
    // ─────────────────────────────────────────────────────────────────────────

    const targetId = Number(params?.id);

    if (!Number.isInteger(targetId) || targetId <= 0) {
      return apiError("Invalid user id", 400);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Branch check
    // ─────────────────────────────────────────────────────────────────────────

    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cannot delete yourself
    // ─────────────────────────────────────────────────────────────────────────

    if (targetId === session.userId) {
      return apiError(
        "Cannot delete your own account",
        400
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Find target
    // ─────────────────────────────────────────────────────────────────────────

    const target =
      await centralPrisma.branchUser.findFirst({
        where: {
          id: targetId,
          branchId: session.branchId,
        },
      });

    if (!target) {
      return apiError(
        "User not found",
        404
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Soft delete = deactivate
    // ─────────────────────────────────────────────────────────────────────────

    await centralPrisma.branchUser.update({
      where: {
        id: targetId,
      },
      data: {
        isActive: false,
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Audit log
    // ─────────────────────────────────────────────────────────────────────────

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