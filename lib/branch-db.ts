import { PrismaClient } from "@/generated/branch";
import { centralPrisma } from "@/lib/central-db";
import { decryptDatabaseUrl } from "@/lib/encryption";
// ─────────────────────────────────────────────────────────────────────────────
// Branch Prisma Client Cache
// ─────────────────────────────────────────────────────────────────────────────

const globalForBranchDb = globalThis as unknown as {
  branchClients: Map<number, PrismaClient> | undefined;
};

const branchClients =
  globalForBranchDb.branchClients ??
  new Map<number, PrismaClient>();

if (process.env.NODE_ENV !== "production") {
  globalForBranchDb.branchClients = branchClients;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Prisma Client for a specific branch
// ─────────────────────────────────────────────────────────────────────────────

export async function getBranchDb(
  branchId: number,
): Promise<PrismaClient> {
  // Already connected?
  const existingClient = branchClients.get(branchId);

  if (existingClient) {
    return existingClient;
  }

  // Find branch from CENTRAL database
  const branch = await centralPrisma.branch.findUnique({
    where: {
      id: branchId,
    },
    select: {
      id: true,
      name: true,
      databaseUrlSecret: true,
      isActive: true,
    },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  if (!branch.isActive) {
    throw new Error("Branch is inactive");
  }

  if (!branch.databaseUrlSecret) {
    throw new Error("Branch database connection is not configured");
  }

  // Create Prisma Client using this branch's database URL.
  const client = new PrismaClient({
    datasources: {
      db: {
        url: branch.databaseUrlSecret,
      },
    },
    log: ["error"],
  });

  // Cache client for reuse
  branchClients.set(branchId, client);

  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Disconnect a branch database client
// ─────────────────────────────────────────────────────────────────────────────

export async function disconnectBranchDb(
  branchId: number,
): Promise<void> {
  const client = branchClients.get(branchId);

  if (!client) {
    return;
  }

  await client.$disconnect();

  branchClients.delete(branchId);
}

// ─────────────────────────────────────────────────────────────────────────────
// Remove all cached branch clients
// ─────────────────────────────────────────────────────────────────────────────

export async function disconnectAllBranchDbs(): Promise<void> {
  const clients = Array.from(branchClients.values());

  await Promise.all(
    clients.map((client) => client.$disconnect()),
  );

  branchClients.clear();
}