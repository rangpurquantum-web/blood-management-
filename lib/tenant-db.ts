/**
 * lib/tenant-db.ts
 *
 * Dynamic Prisma connection registry for the database-per-branch architecture.
 *
 * Usage in a Route Handler:
 *   import { getTenantPrisma } from "@/lib/tenant-db";
 *
 *   const branchPrisma = await getTenantPrisma(session.user.branchId);
 *   const donors = await branchPrisma.donor.findMany({ ... });
 *
 * Rules (enforced here, NOT just in the UI):
 *  - A user whose session branchId does not match a real Branch row → 403.
 *  - A user accessing a different branch must have a PermissionGrant row.
 *  - LRU cache is capped at MAX_CLIENTS to stay within free-tier connection limits.
 *  - When an entry is evicted from the LRU it is disconnected cleanly.
 */

import { PrismaClient } from "@/generated/branch";
import { prisma as controlPrisma } from "@/lib/db";
import { decryptDatabaseUrl as decrypt } from "@/lib/crypto";

// ─── LRU Cache ────────────────────────────────────────────────────────────────
// Simple Map-based LRU: evicts the oldest entry when capacity is reached.

const MAX_CLIENTS = 20;

class LRUClientCache {
  private cache = new Map<string, PrismaClient>();

  get(url: string): PrismaClient | undefined {
    const client = this.cache.get(url);
    if (client) {
      // Refresh position (delete + re-insert = move to end = "most recently used")
      this.cache.delete(url);
      this.cache.set(url, client);
    }
    return client;
  }

  set(url: string, client: PrismaClient): void {
    if (this.cache.size >= MAX_CLIENTS) {
      // Evict oldest (first) entry
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        const oldClient = this.cache.get(oldestKey);
        if (oldClient) {
          // Disconnect asynchronously — don't block the request
          oldClient.$disconnect().catch(() => {});
        }
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(url, client);
  }

  has(url: string): boolean {
    return this.cache.has(url);
  }
}

// Singleton cache — persists across hot-reloads in development via globalThis
const globalForTenantDb = globalThis as unknown as {
  tenantClientCache: LRUClientCache | undefined;
};

const clientCache: LRUClientCache =
  globalForTenantDb.tenantClientCache ?? new LRUClientCache();

if (process.env.NODE_ENV !== "production") {
  globalForTenantDb.tenantClientCache = clientCache;
}

// ─── Access Validator ─────────────────────────────────────────────────────────

/**
 * Checks that a user is authorised to access a given branch.
 * A user is authorised if:
 *   (a) the requested branchId matches their own session branchId, OR
 *   (b) there is a PermissionGrant row for (userId, branchId).
 *
 * Returns the Branch row on success, throws an error on failure.
 */
async function resolveBranch(userId: number, branchId: number) {
  const branch = await controlPrisma.branch.findUnique({
    where: { id: branchId },
    select: { id: true, dbUrlEncrypted: true, dbStatus: true, isActive: true },
  });

  if (!branch || !branch.isActive) {
    throw new Error(`BRANCH_NOT_FOUND:${branchId}`);
  }

  if (branch.dbStatus === "unreachable") {
    throw new Error(`BRANCH_UNREACHABLE:${branchId}`);
  }

  // Load the user's own branchId from the Control DB (authoritative source)
  const user = await controlPrisma.user.findUnique({
    where: { id: userId },
    select: {
      branchId: true,
      permissionGrants: { where: { branchId }, select: { id: true } },
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns a PrismaClient connected to the given branch database.
 *
 * @param userId   — The Control DB User.id from the session (for access check).
 * @param branchId — The branch to connect to.
 * @throws         — If user is not authorised or branch is unreachable.
 */
export async function getTenantPrisma(
  userId: number,
  branchId: number,
): Promise<PrismaClient> {
  const branch = await resolveBranch(userId, branchId);

  // Decrypt the connection URL
  const dbUrl = decrypt(branch.dbUrlEncrypted);

  // Return cached client or create a new one
  const cached = clientCache.get(dbUrl);
  if (cached) return cached;

  const client = new PrismaClient({
    datasources: { db: { url: dbUrl } },
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  clientCache.set(dbUrl, client);
  return client;
}

/**
 * Convenience helper — resolves the tenant Prisma client from a Next.js
 * Auth.js session without requiring callers to unpack user/branchId.
 *
 * @param session — The Auth.js session object (must include user.id & user.branchId).
 * @param overrideBranchId — Optional: switch to a different branch (requires PermissionGrant).
 */
export async function getTenantPrismaFromSession(
  session: { user: { id?: string | null; branchId?: number | null } },
  overrideBranchId?: number,
): Promise<PrismaClient> {
  const userId = session.user?.id ? Number(session.user.id) : null;
  const branchId = overrideBranchId ?? session.user?.branchId ?? null;

  if (!userId) throw new Error("SESSION_MISSING_USER_ID");
  if (!branchId) throw new Error("SESSION_MISSING_BRANCH_ID");

  return getTenantPrisma(userId, branchId);
}
