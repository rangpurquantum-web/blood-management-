import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
} from "@/lib/api-helpers";
import { donorSchema } from "@/features/donors";
import { z } from "zod";

// ─── Bulk import row schema ───────────────────────────────────────────────────

const importRowSchema = donorSchema;
const importBodySchema = z.array(importRowSchema).min(1, "At least one row is required");

// ─── POST /api/donors/import ──────────────────────────────────────────────────
// Admin only. Accepts a JSON array of donor records parsed from xlsx/papaparse.

export const POST = withAuth(
  async (req: NextRequest, session) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = importBodySchema.safeParse(body);

    if (!parsed.success) {
      // Return row-level validation errors
      const validationErrors = parsed.error.errors.map((e) => ({
        row: typeof e.path[0] === "number" ? e.path[0] + 1 : "?",
        column: e.path.slice(1).join(".") || e.path[0],
        message: e.message,
      }));

      return NextResponse.json(
        { success: false, error: "Batch validation failed", validationErrors },
        { status: 400 },
      );
    }

    const rows = parsed.data;

    let importedCount = 0;
    let ignoredOrUpdatedCount = 0;

    for (const row of rows) {
      const existing = await prisma.donor.findFirst({
        where: {
          OR: [{ email: row.email }, { phone: row.phone }],
        },
      });

      if (existing) {
        ignoredOrUpdatedCount++;
        continue;
      }

      await prisma.donor.create({
        data: { ...row, isEligible: true },
      });

      importedCount++;
    }

    await writeAuditLog(
      session.userId,
      "Donor Bulk Import",
      `Imported ${importedCount} donors; skipped ${ignoredOrUpdatedCount} duplicates from spreadsheet upload`,
    );

    return apiSuccess({
      message: "Import complete",
      importedCount,
      ignoredOrUpdatedCount,
    });
  },
  { roles: [Role.Admin] },
);
