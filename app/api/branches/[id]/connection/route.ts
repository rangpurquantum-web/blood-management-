import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/auth";
import { getBranchDb } from "@/lib/branch-db";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/branches/[id]/connection
//
// Tests whether the selected branch database is reachable.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(
  _req: NextRequest,
  context: RouteContext,
) {
  let branchId: number;

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

    const params = await context.params;

    branchId = Number(params.id);

    if (!Number.isInteger(branchId) || branchId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid branch ID",
        },
        { status: 400 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Get branch-specific Prisma client
    // ─────────────────────────────────────────────────────────────────────────

    const branchDb = await getBranchDb(branchId);

    // ─────────────────────────────────────────────────────────────────────────
    // Test database connection
    // ─────────────────────────────────────────────────────────────────────────

    await branchDb.$queryRaw`SELECT 1`;

    // ─────────────────────────────────────────────────────────────────────────
    // Check whether the branch database contains the expected
    // Prisma tables.
    //
    // We don't expose database errors/details to the browser.
    // ─────────────────────────────────────────────────────────────────────────

    let schemaReady = true;

    try {
      await branchDb.donor.count();
    } catch {
      schemaReady = false;
    }

    return NextResponse.json({
      success: true,
      connected: true,
      schemaReady,
      message: schemaReady
        ? "Branch database connection successful"
        : "Database connected, but branch schema is not ready",
    });
  } catch (error) {
    console.error(
      `POST /api/branches/${branchId ?? "unknown"}/connection error:`,
      error,
    );

    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: "Could not connect to branch database",
      },
      { status: 500 },
    );
  }
}