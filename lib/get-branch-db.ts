import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";
import { PrismaClient } from "@/generated/branch";

const globalForBranchPrisma = globalThis as unknown as {
  branchPrismaClients: Map<string, PrismaClient> | undefined;
};

export async function getBranchDb(): Promise<PrismaClient> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  const user = session.user as typeof session.user & {
    isSuperAdmin?: boolean;
    currentBranchSlug?: string | null;
    branchId?: number | null;
  };

  let branch;

  if (user.isSuperAdmin) {
    const currentBranchSlug = user.currentBranchSlug;

    if (!currentBranchSlug) {
      throw new Error("No branch selected");
    }

    branch = await centralPrisma.branch.findUnique({
      where: {
        slug: currentBranchSlug,
      },
    });
  } else {
    const branchId = user.branchId;

    if (!branchId) {
      throw new Error("No branch assigned");
    }

    branch = await centralPrisma.branch.findUnique({
      where: {
        id: branchId,
      },
    });
  }

  if (!branch) {
    throw new Error("Branch not found");
  }

  if (!branch.isActive) {
    throw new Error("Branch is inactive");
  }

  return getPrismaClient(branch.databaseUrlSecret);
}

function getPrismaClient(databaseUrl: string): PrismaClient {
  if (!globalForBranchPrisma.branchPrismaClients) {
    globalForBranchPrisma.branchPrismaClients =
      new Map<string, PrismaClient>();
  }

  const existingClient =
    globalForBranchPrisma.branchPrismaClients.get(databaseUrl);

  if (existingClient) {
    return existingClient;
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ["error"],
  });

  globalForBranchPrisma.branchPrismaClients.set(
    databaseUrl,
    client
  );

  return client;
}