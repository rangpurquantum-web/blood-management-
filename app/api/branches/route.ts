import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";

type CreateBranchBody = {
  name?: string;
  slug?: string;
  location?: string;
  databaseUrlSecret?: string;
};

function isAdmin(session: Awaited<ReturnType<typeof auth>>) {
  return session?.user?.role === "ADMIN";
}

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const branches = await centralPrisma.branch.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      branches,
    });
  } catch (error) {
    console.error("GET /api/branches error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load branches",
      },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!isAdmin(session)) {
      return NextResponse.json(
        { success: false, error: "Forbidden" },
        { status: 403 },
      );
    }

    const body = (await req.json()) as CreateBranchBody;

    const name = body.name?.trim();
    const slug = body.slug?.trim().toLowerCase();
    const location = body.location?.trim() || null;
    const databaseUrlSecret = body.databaseUrlSecret?.trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Branch name is required" },
        { status: 400 },
      );
    }

    if (!slug) {
      return NextResponse.json(
        { success: false, error: "Branch slug is required" },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Slug may contain only lowercase letters, numbers, and hyphens",
        },
        { status: 400 },
      );
    }

    if (!databaseUrlSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch database URL is required",
        },
        { status: 400 },
      );
    }

    const existing = await centralPrisma.branch.findFirst({
      where: {
        OR: [
          {
            name,
          },
          {
            slug,
          },
        ],
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error:
            existing.name === name
              ? "A branch with this name already exists"
              : "A branch with this slug already exists",
        },
        { status: 409 },
      );
    }

    const branch = await centralPrisma.branch.create({
      data: {
        name,
        slug,
        location,
        databaseUrlSecret,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Branch created successfully",
        branch,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/branches error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create branch",
      },
      { status: 500 },
    );
  }
}