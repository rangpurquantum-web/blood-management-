import { auth } from "@/auth";
import { prisma as centralPrisma } from "@/lib/central-db";
import { PrismaClient } from "@/generated/branch";

const globalForBranchPrisma = globalThis as unknown as {
  branchPrisma: PrismaClient | undefined;
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

  if (user.isSuperAdmin) {
    const currentBranchSlug = user.currentBranchSlug;

    if (!currentBranchSlug) {
      throw new Error("No branch selected");
    }

    const branch = await centralPrisma.branch.findUnique({
      where: {
        slug: currentBranchSlug,
      },
    });

    if (!branch) {
      throw new Error("Branch not found");
    }

    if (!branch.isActive) {
      throw new Error("Branch is inactive");
    }

    return getPrismaClient(branch.databaseUrlSecret);
  }

  const branchId = user.branchId;

  if (!branchId) {
    throw new Error("No branch assigned");
  }

  const branch = await centralPrisma.branch.findUnique({
    where: {
      id: branchId,
    },
  });

  if (!branch) {
    throw new Error("Branch not found");
  }

  if (!branch.isActive) {
    throw new Error("Branch is inactive");
  }

  return getPrismaClient(branch.databaseUrlSecret);
}

function getPrismaClient(databaseUrl: string): PrismaClient {
  if (globalForBranchPrisma.branchPrisma) {
    return globalForBranchPrisma.branchPrisma;
  }

  const client = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: ["error"],
  });

  if (process.env.NODE_ENV !== "production") {
    globalForBranchPrisma.branchPrisma = client;
  }

  return client;
}