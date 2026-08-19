import { NextRequest, NextResponse } from "next/server";

import { centralPrisma } from "@/lib/central-db";
import { encryptDatabaseUrl } from "@/lib/crypto";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // --------------------------------------------------
    // 1. Verify setup secret
    // --------------------------------------------------

    const setupSecret = request.headers.get("x-central-setup-secret");

    if (
      !setupSecret ||
      setupSecret !== process.env.CENTRAL_SETUP_SECRET
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        { status: 401 },
      );
    }

    // --------------------------------------------------
    // 2. Read request body
    // --------------------------------------------------

    const body = await request.json();

    const {
      name,
      slug,
      location,
      databaseUrl,
    } = body;

    if (!name || !slug || !databaseUrl) {
      return NextResponse.json(
        {
          success: false,
          message: "name, slug and databaseUrl are required",
        },
        { status: 400 },
      );
    }

    // --------------------------------------------------
    // 3. Check if branch already exists
    // --------------------------------------------------

    const existingBranch = await centralPrisma.branch.findUnique({
      where: {
        slug,
      },
    });

    if (existingBranch) {
      return NextResponse.json(
        {
          success: false,
          message: "Branch already exists",
          branch: {
            id: existingBranch.id,
            name: existingBranch.name,
            slug: existingBranch.slug,
          },
        },
        { status: 409 },
      );
    }

    // --------------------------------------------------
    // 4. Encrypt branch database URL
    // --------------------------------------------------

    const encryptedDatabaseUrl =
      encryptDatabaseUrl(databaseUrl);

    // --------------------------------------------------
    // 5. Create branch in Central DB
    // --------------------------------------------------

    const branch = await centralPrisma.branch.create({
      data: {
        name,
        slug,
        location: location || null,
        databaseUrlSecret: encryptedDatabaseUrl,
        isActive: true,
      },
    });

    // --------------------------------------------------
    // 6. Never return the database URL
    // --------------------------------------------------

    return NextResponse.json({
      success: true,
      message: "Branch created successfully",
      branch: {
        id: branch.id,
        name: branch.name,
        slug: branch.slug,
        location: branch.location,
        isActive: branch.isActive,
      },
    });
  } catch (error) {
    console.error("Central branch setup error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Internal server error",
      },
      { status: 500 },
    );
  }
}