import { NextRequest } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { decryptDatabaseUrl } from "@/lib/crypto";
import { PrismaClient } from "@/generated/branch";
import { apiError, apiSuccess, withAuth, writeAuditLog } from "@/lib/api-helpers";
import { SCHEMA_MIGRATIONS } from "@/lib/schema-migrations";

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/superadmin/branches/[id]/init-schema
// Runs the full set of schema migrations against a branch's database.
// SuperAdmin only. Intended for brand-new, empty branch databases.
// ─────────────────────────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, session, params) => {
  if (!session.isSuperAdmin) {
    return apiError("Forbidden — SuperAdmin access required", 403);
  }

  const branchId = params?.id ? Number(params.id) : NaN;

  if (!Number.isInteger(branchId) || branchId <= 0) {
    return apiError("Invalid branch id", 400);
  }

  const branch = await centralPrisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, name: true, slug: true, databaseUrlSecret: true },
  });

  if (!branch) {
    return apiError("Branch not found", 404);
  }

  if (!branch.databaseUrlSecret) {
    return apiError("Branch database connection is not configured", 400);
  }

  const connectionUrl = decryptDatabaseUrl(branch.databaseUrlSecret);

  // Use a dedicated, short-lived client for this — not the shared cached
  // client from lib/branch-db.ts — since this is a one-off admin action.
  const client = new PrismaClient({
    datasources: { db: { url: connectionUrl } },
    log: ["error"],
  });

  const results: { name: string; ok: boolean; error?: string }[] = [];

  try {
    for (const migration of SCHEMA_MIGRATIONS) {
      try {
        await client.$executeRawUnsafe(migration.sql);
        results.push({ name: migration.name, ok: true });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        results.push({ name: migration.name, ok: false, error: message });

        // Stop at the first failure — later migrations likely depend on it.
        return apiError(
          `Schema initialization failed at migration "${migration.name}"`,
          500,
          { results },
        );
      }
    }
  } finally {
    await client.$disconnect();
  }

  await writeAuditLog(
    session.userId,
    "BRANCH_SCHEMA_INITIALIZED",
    `Initialized schema for branch "${branch.name}" (slug: ${branch.slug})`,
    branch.id,
    branch.slug,
  );

  return apiSuccess({ results });
});