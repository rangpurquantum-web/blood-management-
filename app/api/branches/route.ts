import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";
import { PrismaClient } from "@/generated/branch";

// ============================================================================
// GET /api/branches
// List all branches
// ADMIN only
// ============================================================================

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
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

// ============================================================================
// POST /api/branches
// Create a new branch
// ADMIN only
//
// NOTE:
// This endpoint creates the branch record in the CENTRAL database,
// after first verifying that the given database URL is reachable
// and already has the branch schema applied (Donor table exists).
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    if (session.user.role !== "ADMIN") {
      return NextResponse.json(
        {
          success: false,
          error: "Forbidden",
        },
        { status: 403 },
      );
    }

    const body = await req.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const slug =
      typeof body.slug === "string"
        ? body.slug.trim().toLowerCase()
        : "";

    const location =
      typeof body.location === "string"
        ? body.location.trim()
        : null;

    const databaseUrlSecret =
      typeof body.databaseUrlSecret === "string"
        ? body.databaseUrlSecret.trim()
        : "";

    // ------------------------------------------------------------------------
    // Validation
    // ------------------------------------------------------------------------

    if (!name) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch name is required",
        },
        { status: 400 },
      );
    }

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch slug is required",
        },
        { status: 400 },
      );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Slug can only contain lowercase letters, numbers and hyphens",
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

    // ------------------------------------------------------------------------
    // Check duplicate branch
    // ------------------------------------------------------------------------

    const existingBranch = await centralPrisma.branch.findFirst({
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

    if (existingBranch) {
      return NextResponse.json(
        {
          success: false,
          error:
            existingBranch.name === name
              ? "A branch with this name already exists"
              : "A branch with this slug already exists",
        },
        { status: 409 },
      );
    }

    // ------------------------------------------------------------------------
    // Verify the database is reachable and has the branch schema applied
    // ------------------------------------------------------------------------

    let testClient: PrismaClient | null = null;

    try {
      testClient = new PrismaClient({
        datasources: {
          db: {
            url: databaseUrlSecret,
          },
        },
      });

      // Simple query against a table that must exist in the
      // branch schema (Donor). If this fails, the database is
      // unreachable OR the schema hasn't been applied yet.
      await testClient.donor.count();
    } catch (error) {
      console.error("Branch database verification failed:", error);

      return NextResponse.json(
        {
          success: false,
          error:
            "Could not connect to this database, or the branch schema hasn't been applied yet. " +
            "Please make sure the database URL is correct and the schema (Donor, DonationHistory, etc.) already exists there.",
        },
        { status: 400 },
      );
    } finally {
      if (testClient) {
        await testClient.$disconnect();
      }
    }

    // ------------------------------------------------------------------------
    // Create branch
    // ------------------------------------------------------------------------

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