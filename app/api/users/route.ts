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
// Roles
// ─────────────────────────────────────────────────────────────────────────────

const VALID_ROLES = ["ADMIN", "COORDINATOR", "VOLUNTEER"] as const;

type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(role: unknown): role is ValidRole {
  return (
    typeof role === "string" &&
    VALID_ROLES.includes(role as ValidRole)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users
// Admin only
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, session) => {
    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    const body = await req.json();

    const {
      name,
      email,
      password,
      role,
      permissions,
    } = body ?? {};

    // ───────────────────────────────────────────────────────────────────────
    // Validation
    // ───────────────────────────────────────────────────────────────────────

    if (!name || typeof name !== "string" || !name.trim()) {
      return apiError("Name is required", 400);
    }

    if (!email || typeof email !== "string" || !email.trim()) {
      return apiError("Email is required", 400);
    }

    if (!password || typeof password !== "string") {
      return apiError("Password is required", 400);
    }

    if (password.length < 8) {
      return apiError(
        "Password must be at least 8 characters",
        400
      );
    }

    if (!isValidRole(role)) {
      return apiError(
        "Invalid role. Allowed roles: ADMIN, COORDINATOR, VOLUNTEER",
        400
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    // ───────────────────────────────────────────────────────────────────────
    // Check duplicate email
    // ───────────────────────────────────────────────────────────────────────

    const existing = await centralPrisma.branchUser.findFirst({
      where: {
        email: normalizedEmail,
        branchId: session.branchId,
      },
    });

    if (existing) {
      return apiError(
        "A user with this email already exists in this branch",
        409
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Password hash
    // ───────────────────────────────────────────────────────────────────────

    const passwordHash = await bcrypt.hash(password, 12);

    // ───────────────────────────────────────────────────────────────────────
    // Permissions
    // ───────────────────────────────────────────────────────────────────────

    let finalPermissions: Record<string, boolean> | undefined;

    if (
      permissions &&
      typeof permissions === "object" &&
      !Array.isArray(permissions)
    ) {
      finalPermissions = permissions;
    }

    // ───────────────────────────────────────────────────────────────────────
    // Create user
    // ───────────────────────────────────────────────────────────────────────

    const user = await centralPrisma.branchUser.create({
      data: {
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        role,
        permissions: finalPermissions,
        isActive: true,
        branchId: session.branchId,
      },
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
    // Audit log
    // ───────────────────────────────────────────────────────────────────────

    await writeAuditLog(
      session.userId,
      "User Created",
      `Admin (id=${session.userId}) created ${role} user: ${normalizedEmail}`,
      session.branchId,
      session.branchSlug
    );

    return apiSuccess(
      {
        message: "User created successfully",
        user,
      },
      201
    );
  },
  {
    permission: "userManagement",
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users
// Admin only
// ─────────────────────────────────────────────────────────────────────────────

export const GET = withAuth(
  async (_req: NextRequest, session) => {
    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    const users = await centralPrisma.branchUser.findMany({
      where: {
        branchId: session.branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return apiSuccess({
      users,
    });
  },
  {
    permission: "userManagement",
  }
);