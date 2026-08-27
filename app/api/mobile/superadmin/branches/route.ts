import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { verifyMobileAuth } from "@/lib/mobile-auth";

function requireSuperAdmin(payload: { isSuperAdmin?: boolean }) {
  if (!payload.isSuperAdmin) {
    return NextResponse.json(
      { success: false, error: "Forbidden — SuperAdmin access required" },
      { status: 403 },
    );
  }
  return null;
}

// GET /api/mobile/superadmin/branches
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const forbidden = requireSuperAdmin(authResult.payload);
  if (forbidden) return forbidden;

  try {
    const branches = await centralPrisma.branch.findMany({
      select: { id: true, name: true, slug: true, location: true, isActive: true },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, branches });
  } catch (error) {
    console.error("Mobile superadmin branches list error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load branches" },
      { status: 500 },
    );
  }
}

// POST /api/mobile/superadmin/branches
// body: { name, slug, databaseUrlSecret (already-encrypted string) }
export async function POST(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const forbidden = requireSuperAdmin(authResult.payload);
  if (forbidden) return forbidden;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { name, slug, databaseUrlSecret } = body as {
    name?: unknown;
    slug?: unknown;
    databaseUrlSecret?: unknown;
  };

  if (typeof name !== "string" || name.trim().length < 2) {
    return NextResponse.json(
      { success: false, error: "Branch name is required" },
      { status: 400 },
    );
  }

  if (
    typeof slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug.trim())
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Slug is required and may contain only lowercase letters, numbers, and hyphens",
      },
      { status: 400 },
    );
  }

  if (typeof databaseUrlSecret !== "string" || databaseUrlSecret.trim().length < 10) {
    return NextResponse.json(
      { success: false, error: "Encrypted database URL is required" },
      { status: 400 },
    );
  }

  try {
    const existing = await centralPrisma.branch.findUnique({
      where: { slug: slug.trim() },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A branch with this slug already exists" },
        { status: 409 },
      );
    }

    const branch = await centralPrisma.branch.create({
      data: {
        name: name.trim(),
        slug: slug.trim(),
        databaseUrlSecret: databaseUrlSecret.trim(),
        isActive: true,
      },
      select: { id: true, name: true, slug: true, isActive: true },
    });

    return NextResponse.json({ success: true, branch }, { status: 201 });
  } catch (error) {
    console.error("Mobile superadmin branch create error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create branch" },
      { status: 500 },
    );
  }
}