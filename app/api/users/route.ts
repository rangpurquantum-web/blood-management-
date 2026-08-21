import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { withAuth, apiError, writeAuditLog } from "@/lib/api-helpers";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// ─── GET /api/users  (Admin only — list all users) ────────────────────────────
export const GET = withAuth(
  async (_req: NextRequest, session) => {
    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    const users = await centralPrisma.branchUser.findMany({
      where: { branchId: session.branchId, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        permissions: true,
        isActive: true,
        isDeleted: true,
      },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ users });
  },
  { permission: "userManagement" }
);

// ─── POST /api/users  (Admin only — create user) ──────────────────────────────
export const POST = withAuth(
  async (req: NextRequest, session) => {
    if (!session.branchId) {
      return apiError("No branch selected", 400);
    }

    const body = await req.json();
    const { name, email, password, role, permissions } = body ?? {};

    if (!name || !email || !password) {
      return apiError("name, email and password are required", 400);
    }

    if (!["ADMIN", "VOLUNTEER"].includes(role)) {
      return apiError("role must be ADMIN or VOLUNTEER", 400);
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existing = await centralPrisma.branchUser.findUnique({ where: { email: normalizedEmail } });
    if (existing) return apiError("Email already in use", 409);

    const hash = await bcrypt.hash(String(password), 12);
    const user = await centralPrisma.branchUser.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash: hash,
        role,
        permissions: permissions || null,
        branchId: session.branchId,
        isActive: true,
      },
      select: { id: true, name: true, email: true, role: true, createdAt: true, permissions: true },
    });

    await writeAuditLog(session.userId, "User Created", `Admin created user: ${normalizedEmail} (${role})`, session.branchId, session.branchSlug);

    return NextResponse.json({ user }, { status: 201 });
  },
  { permission: "userManagement" }
);