import { auth } from "@/auth";
import { getBranchDb } from "@/lib/branch-db";
import type { PrismaClient } from "@/generated/branch";

/**
 * Get the currently authenticated user's branch database.
 *
 * Flow:
 *
 * Session
 *   ↓
 * session.user.branchId
 *   ↓
 * getBranchDb(branchId)
 *   ↓
 * Branch Prisma Client
 */
export async function getCurrentBranchDb(): Promise<{
  db: PrismaClient;
  branchId: number;
}> {
  const session = await auth();

  if (!session?.user) {
    throw new Error("UNAUTHORIZED");
  }

  const branchId = session.user.branchId;

  if (
    typeof branchId !== "number" ||
    !Number.isInteger(branchId) ||
    branchId <= 0
  ) {
    throw new Error("BRANCH_NOT_ASSIGNED");
  }

  const db = await getBranchDb(branchId);

  return {
    db,
    branchId,
  };
}