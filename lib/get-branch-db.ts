import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";
import { getBranchClient } from "@/lib/branch-db-cache";
import { decryptDatabaseUrl } from "@/lib/crypto";

export async function getDatabaseForCurrentBranch() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const user = session.user;

  if (user.isSuperAdmin) {
    const currentBranchSlug = user.currentBranchSlug;

    if (!currentBranchSlug) {
      throw new Error("NO_BRANCH_SELECTED");
    }

    return getDatabaseBySlug(currentBranchSlug);
  }

  if (!user.branchSlug) {
    throw new Error("NO_BRANCH_CONTEXT");
  }

  return getDatabaseBySlug(user.branchSlug);
}

async function getDatabaseBySlug(branchSlug: string) {
  const branch = await centralPrisma.branch.findUnique({
    where: {
      slug: branchSlug,
    },
  });

  if (!branch) {
    throw new Error("BRANCH_NOT_FOUND");
  }

  if (!branch.isActive) {
    throw new Error("BRANCH_INACTIVE");
  }

  const databaseUrl = decryptDatabaseUrl(branch.databaseUrlSecret);

  return getBranchClient(branch.slug, databaseUrl);
}