import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { centralPrisma } from "@/lib/central-db";
import { verifyMobileAuth, requireBranch, requireAdmin } from "@/lib/mobile-auth";

const VALID_ROLES = ["ADMIN", "COORDINATOR", "VOLUNTEER"] as const;
type ValidRole = (typeof VALID_ROLES)[number];

function isValidRole(role: unknown): role is ValidRole {
  return typeof role === "string" && VALID_ROLES.includes(role as ValidRole);
}

// GET /api/mobile/users
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  try {
    const users = await centralPrisma.branchUser.findMany({
      where: { branchId: branchResult.branchId, isDeleted: false },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error("Mobile users list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load users" },
      { status: 500 },
    );
  }
}

// POST /api/mobile/users
// body: { name, email, password, role }
export async function POST(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { name, email, password, role } = body as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    role?: unknown;
  };

  if (!name || typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { success: false, error: "Name is required" },
      { status: 400 },
    );
  }

  if (!email || typeof email !== "string" || !email.trim()) {
    return NextResponse.json(
      { success: false, error: "Email is required" },
      { status: 400 },
    );
  }

  if (!password || typeof password !== "string" || password.length < 8) {
    return NextResponse.json(
      {
        success: false,
        error: "Password is required and must be at least 8 characters",
      },
      { status: 400 },
    );
  }

  if (!isValidRole(role)) {
    return NextResponse.json(
      {
        success: false,
        error: "Invalid role. Allowed roles: ADMIN, COORDINATOR, VOLUNTEER",
      },
      { status: 400 },
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existing = await centralPrisma.branchUser.findFirst({
      where: { email: normalizedEmail, branchId: branchResult.branchId },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "A user with this email already exists in this branch",
        },
        { status: 409 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await centralPrisma.branchUser.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role,
        isActive: true,
        branchId: branchResult.branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      { success: true, message: "User created successfully", user },
      { status: 201 },
    );
  } catch (error) {
    console.error("Mobile user create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 },
    );
  }
}