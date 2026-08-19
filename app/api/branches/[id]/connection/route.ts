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
  // IMPORTANT:
  // Use undefined initially so TypeScript knows that branchId
  // may not have been assigned if an error occurs before params parsing.
  let branchId: number | undefined;

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
    // Get route parameters
    // ─────────────────────────────────────────────────────────────────────────

    const params = await context.params;

    branchId = Number(params.id);

    // ─────────────────────────────────────────────────────────────────────────
    // Validate branch ID
    // ─────────────────────────────────────────────────────────────────────────

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
    // We intentionally do not expose database errors/details
    // to the browser.
    // ─────────────────────────────────────────────────────────────────────────

    let schemaReady = true;

    try {
      await branchDb.donor.count();
    } catch {
      schemaReady = false;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Successful response
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      connected: true,
      schemaReady,
      message: schemaReady
        ? "Branch database connection successful"
        : "Database connected, but branch schema is not ready",
    });
  } catch (error) {
    // ─────────────────────────────────────────────────────────────────────────
    // Server-side error logging
    // ─────────────────────────────────────────────────────────────────────────

    console.error(
      `POST /api/branches/${branchId ?? "unknown"}/connection error:`,
      error,
    );

    // Never expose the actual database error to the client.
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