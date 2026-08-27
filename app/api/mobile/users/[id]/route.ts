import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { centralPrisma } from "@/lib/central-db";
import { verifyMobileAuth, requireBranch, requireAdmin } from "@/lib/mobile-auth";

const VALID_ROLES = ["ADMIN", "COORDINATOR", "VOLUNTEER"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(role: unknown): role is ValidRole {
  return typeof role === "string" && VALID_ROLES.includes(role as ValidRole);
}

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/mobile/users/[id]
// body: { name?, email?, newPassword?, role?, isActive? }
export async function PATCH(req: NextRequest, context: RouteContext) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  const { id: idParam } = await context.params;
  const targetId = Number(idParam);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid user id" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { name, email, newPassword, role, isActive } = body as {
    name?: unknown;
    email?: unknown;
    newPassword?: unknown;
    role?: unknown;
    isActive?: unknown;
  };

  if (
    name === undefined &&
    email === undefined &&
    newPassword === undefined &&
    role === undefined &&
    isActive === undefined
  ) {
    return NextResponse.json(
      { success: false, error: "At least one update field must be provided" },
      { status: 400 },
    );
  }

  try {
    const target = await centralPrisma.branchUser.findFirst({
      where: { id: targetId, branchId: branchResult.branchId },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          { success: false, error: "Name cannot be empty" },
          { status: 400 },
        );
      }
      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        return NextResponse.json(
          { success: false, error: "Email cannot be empty" },
          { status: 400 },
        );
      }
      const normalizedEmail = email.trim().toLowerCase();

      const existing = await centralPrisma.branchUser.findFirst({
        where: {
          email: normalizedEmail,
          branchId: branchResult.branchId,
          id: { not: targetId },
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Email already in use" },
          { status: 409 },
        );
      }

      updateData.email = normalizedEmail;
    }

    if (newPassword !== undefined) {
      if (typeof newPassword !== "string" || newPassword.length < 8) {
        return NextResponse.json(
          {
            success: false,
            error: "newPassword must be at least 8 characters",
          },
          { status: 400 },
        );
      }
      updateData.passwordHash = await bcrypt.hash(newPassword, 12);
    }

    if (role !== undefined) {
      if (!isValidRole(role)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid role. Allowed roles: ADMIN, COORDINATOR, VOLUNTEER",
          },
          { status: 400 },
        );
      }
      if (targetId === authResult.payload.id) {
        return NextResponse.json(
          { success: false, error: "Cannot change your own role" },
          { status: 400 },
        );
      }
      updateData.role = role;
    }

    if (isActive !== undefined) {
      if (targetId === authResult.payload.id) {
        return NextResponse.json(
          { success: false, error: "Cannot freeze your own account" },
          { status: 400 },
        );
      }
      updateData.isActive = Boolean(isActive);
    }

    const updated = await centralPrisma.branchUser.update({
      where: { id: targetId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "User updated successfully",
      user: updated,
    });
  } catch (error) {
    console.error("Mobile user update error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 },
    );
  }
}

// DELETE /api/mobile/users/[id] — soft delete
export async function DELETE(req: NextRequest, context: RouteContext) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  const { id: idParam } = await context.params;
  const targetId = Number(idParam);

  if (!Number.isInteger(targetId) || targetId <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid user id" },
      { status: 400 },
    );
  }

  if (targetId === authResult.payload.id) {
    return NextResponse.json(
      { success: false, error: "Cannot delete your own account" },
      { status: 400 },
    );
  }

  try {
    const target = await centralPrisma.branchUser.findFirst({
      where: { id: targetId, branchId: branchResult.branchId },
    });

    if (!target) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 },
      );
    }

    await centralPrisma.branchUser.update({
      where: { id: targetId },
      data: { isActive: false, isDeleted: true, deletedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Mobile user delete error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 },
    );
  }
}