import { cache } from "react";
import { auth as clerkAuth } from "@clerk/nextjs/server";

import { centralPrisma } from "@/lib/central-db";

export type AppUserType = "SUPER_ADMIN" | "BRANCH_USER";

export type AppSession = {
  user: {
    id: string;
    userType: AppUserType;
    name: string;
    email: string;
    role: string;
    branchId: number | null;
    branchSlug: string | null;
    permissions: Record<string, boolean> | null;
    isSuperAdmin: boolean;
  };
};

function toPermissions(value: unknown): Record<string, boolean> | null {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, boolean>;
  }
  return null;
}

async function resolveSession(): Promise<AppSession | null> {
  const { userId: clerkUserId } = await clerkAuth();

  if (!clerkUserId) {
    return null;
  }

  const identity = await centralPrisma.userIdentity.findUnique({
    where: { clerkUserId },
    include: {
      superAdmin: true,
      branchUser: {
        include: {
          branch: { select: { id: true, slug: true, isActive: true } },
        },
      },
    },
  });

  // Signed in with Clerk but not linked to any Qblood account yet
  if (!identity) {
    return null;
  }

  if (identity.userType === "SUPER_ADMIN") {
    const admin = identity.superAdmin;

    if (!admin || !admin.isActive) {
      return null;
    }

    return {
      user: {
        id: String(admin.id),
        userType: "SUPER_ADMIN",
        name: admin.name,
        email: admin.email,
        role: "ADMIN",
        branchId: null,
        branchSlug: null,
        permissions: null,
        isSuperAdmin: true,
      },
    };
  }

  const member = identity.branchUser;

  if (
    !member ||
    !member.isActive ||
    member.isDeleted ||
    !member.branch.isActive
  ) {
    return null;
  }

  return {
    user: {
      id: String(member.id),
      userType: "BRANCH_USER",
      name: member.name,
      email: member.email,
      role: member.role,
      branchId: member.branch.id,
      branchSlug: member.branch.slug,
      permissions: toPermissions(member.permissions),
      isSuperAdmin: false,
    },
  };
}

// Drop-in replacement for NextAuth's auth() in server code.
export const auth = cache(resolveSession);
