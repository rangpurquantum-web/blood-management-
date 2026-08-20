import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { withAuth, apiError, apiSuccess, writeAuditLog } from "@/lib/api-helpers";
import { Role } from "@/generated/branch";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

// ─── GET /api/users  (Admin only — list all users) ────────────────────────────
export const GET = withAuth(
  async (_req: NextRequest, session) => {
    const users = await prisma.user.findMany({
      where: { isDeleted: false },
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
    const body = await req.json();
    const { name, email, password, role, permissions } = body ?? {};

    if (!name || !email || !password) {
      return apiError("name, email and password are required", 400);
    }

    if (!["ADMIN", "VOLUNTEER"].includes(role)) {
      return apiError("role must be ADMIN or VOLUNTEER", 400);
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return apiError("Email already in use", 409);

    const hash = await bcrypt.hash(String(password), 12);
    const user = await prisma.user.create({
      data: { name, email, passwordHash: hash, role, permissions: permissions || null },
      select: { id: true, name: true, email: true, role: true, createdAt: true, permissions: true },
    });

    await writeAuditLog(session.userId, "User Created", `Admin created user: ${email} (${role})`);

    return NextResponse.json({ user }, { status: 201 });
  },
  { permission: "userManagement" }
);
