import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/branches
// Returns all branches for the admin panel.
// ─────────────────────────────────────────────────────────────────────────────

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized — please log in",
        },
        { status: 401 },
      );
    }

    const branches = await centralPrisma.branch.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
        location: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,

        // IMPORTANT:
        // Do NOT return databaseUrlSecret to the browser.
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/branches
// Creates a new branch in the CENTRAL database.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────────────────────────────────

    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized — please log in",
        },
        { status: 401 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Parse request
    // ─────────────────────────────────────────────────────────────────────────

    let body: unknown;

    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid JSON body",
        },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request body",
        },
        { status: 400 },
      );
    }

    const data = body as {
      name?: unknown;
      slug?: unknown;
      location?: unknown;
      databaseUrlSecret?: unknown;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Validate branch name
    // ─────────────────────────────────────────────────────────────────────────

    if (
      typeof data.name !== "string" ||
      data.name.trim().length < 2
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch name must contain at least 2 characters",
        },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validate slug
    // ─────────────────────────────────────────────────────────────────────────

    if (
      typeof data.slug !== "string" ||
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(data.slug.trim())
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Slug may contain only lowercase letters, numbers and hyphens",
        },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validate database URL secret
    // ─────────────────────────────────────────────────────────────────────────

    if (
      typeof data.databaseUrlSecret !== "string" ||
      data.databaseUrlSecret.trim().length === 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch database connection is required",
        },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Clean values
    // ─────────────────────────────────────────────────────────────────────────

    const name = data.name.trim();
    const slug = data.slug.trim().toLowerCase();
    const location =
      typeof data.location === "string" &&
      data.location.trim().length > 0
        ? data.location.trim()
        : null;

    const databaseUrlSecret = data.databaseUrlSecret.trim();

    // ─────────────────────────────────────────────────────────────────────────
    // Check duplicate name / slug
    // ─────────────────────────────────────────────────────────────────────────

    const existing = await centralPrisma.branch.findFirst({
      where: {
        OR: [
          {
            name: {
              equals: name,
              mode: "insensitive",
            },
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
      if (existing.slug === slug) {
        return NextResponse.json(
          {
            success: false,
            error: "A branch with this slug already exists",
          },
          { status: 409 },
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: "A branch with this name already exists",
        },
        { status: 409 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create branch
    // ─────────────────────────────────────────────────────────────────────────

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

        // databaseUrlSecret deliberately excluded
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Response
    // ─────────────────────────────────────────────────────────────────────────

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

    // Prisma unique constraint
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "A branch with this name or slug already exists",
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create branch",
      },
      { status: 500 },
    );
  }
}