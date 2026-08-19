import { auth } from "@/auth";

export async function requireBranchUser() {
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

  return {
    session,
    branchId,
    userId: session.user.id,
    role: session.user.role,
  };
}