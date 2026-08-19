import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";
import { getBranchDb } from "@/lib/branch-db";

// ─────────────────────────────────────────────────────────────────────────────
// Get current logged-in user's branch
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentBranch() {
  const session = await auth();

  if (!session?.user) {
    return null;
  }

  const branchId = session.user.branchId;

  if (!branchId) {
    return null;
  }

  const branch = await centralPrisma.branch.findUnique({
    where: {
      id: Number(branchId),
    },
    select: {
      id: true,
      name: true,
      slug: true,
      location: true,
      isActive: true,
    },
  });

  if (!branch || !branch.isActive) {
    return null;
  }

  return branch;
}

// ─────────────────────────────────────────────────────────────────────────────
// Get current user's branch database
// ─────────────────────────────────────────────────────────────────────────────

export async function getCurrentBranchDb() {
  const branch = await getCurrentBranch();

  if (!branch) {
    throw new Error("No active branch found for current user");
  }

  return getBranchDb(branch.id);
}