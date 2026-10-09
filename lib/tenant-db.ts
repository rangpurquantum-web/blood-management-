
/**
 * lib/tenant-db.ts
 *
 * Dynamic Prisma connection registry for the database-per-branch architecture.
 *
 * Uses the existing Control Database Branch fields:
 *   - databaseUrlSecret
 *   - isActive
 *
 * Donor data stays in each branch's own database.
 */

import { PrismaClient } from "@/generated/branch";
import { prisma as controlPrisma } from "@/lib/db";
import { decryptDatabaseUrl } from "@/lib/crypto";

// Maximum number of branch database clients kept in memory.
const MAX_CLIENTS = 20;

class LRUClientCache {
  private cache = new Map<string, PrismaClient>();

  get(url: string): PrismaClient | undefined {
    const client = this.cache.get(url);

    if (client) {
      // Move recently used client to the end of the Map.
      this.cache.delete(url);
      this.cache.set(url, client);
    }

    return client;
  }

  set(url: string, client: PrismaClient): void {
    const existing = this.cache.get(url);

    if (existing) {
      this.cache.delete(url);
    }

    while (this.cache.size >= MAX_CLIENTS) {
      const oldestKey = this.cache.keys().next().value;

      if (oldestKey === undefined) break;

      const oldClient = this.cache.get(oldestKey);
      this.cache.delete(oldestKey);

      if (oldClient) {
        void oldClient.$disconnect().catch(() => {});
      }
    }

    this.cache.set(url, client);
  }
}

// Reuse the cache during development hot reloads.
const globalForTenantDb = globalThis as unknown as {
  tenantClientCache?: LRUClientCache;
};

const clientCache =
  globalForTenantDb.tenantClientCache ?? new LRUClientCache();

if (process.env.NODE_ENV !== "production") {
  globalForTenantDb.tenantClientCache = clientCache;
}

/**
 * Find an active branch and verify that the user is allowed to access it.
 */
async function resolveBranch(userId: number, branchId: number) {
  const branch = await controlPrisma.branch.findUnique({
    where: { id: branchId },
    select: {
      id: true,
      databaseUrlSecret: true,
      isActive: true,
    },
  });

  if (!branch || !branch.isActive) {
    throw new Error(`BRANCH_NOT_FOUND:${branchId}`);
  }

  if (!branch.databaseUrlSecret) {
    throw new Error(`BRANCH_DATABASE_NOT_CONFIGURED:${branchId}`);
  }

  // The Control Database is the authoritative source for user access.
  const user = await controlPrisma.user.findUnique({
    where: { id: userId },
    select: {
      branchId: true,
      permissionGrants: {
        where: { branchId },
        select: { id: true },
      },
    },
  });

  if (!user) {
    throw new Error(`USER_NOT_FOUND:${userId}`);
  }

  const isOwnBranch = user.branchId === branchId;
  const hasGrant = user.permissionGrants.length > 0;

  if (!isOwnBranch && !hasGrant) {
    throw new Error(`ACCESS_DENIED:user=${userId},branch=${branchId}`);
  }

  return branch;
}

/**
 * Return a Prisma client connected to the selected branch database.
 */
export async function getTenantPrisma(
  userId: number,
  branchId: number,
): Promise<PrismaClient> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("INVALID_USER_ID");
  }

  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new Error("INVALID_BRANCH_ID");
  }

  const branch = await resolveBranch(userId, branchId);

  // databaseUrlSecret is already encrypted in the Control Database.
  const dbUrl = decryptDatabaseUrl(branch.databaseUrlSecret);

  const cached = clientCache.get(dbUrl);

  if (cached) {
    return cached;
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

  clientCache.set(dbUrl, client);

  return client;
}

/**
 * Convenience helper for an Auth.js session.
 */
export async function getTenantPrismaFromSession(
  session: {
    user: {
      id?: string | null;
      branchId?: number | null;
    };
  },
  overrideBranchId?: number,
): Promise<PrismaClient> {
  const userId = session.user?.id
    ? Number(session.user.id)
    : null;

  const branchId =
    overrideBranchId ?? session.user?.branchId ?? null;

  if (!userId || !Number.isInteger(userId)) {
    throw new Error("SESSION_MISSING_USER_ID");
  }

  if (!branchId || !Number.isInteger(branchId)) {
    throw new Error("SESSION_MISSING_BRANCH_ID");
  }

  return getTenantPrisma(userId, branchId);
}
