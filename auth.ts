import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { centralPrisma } from "@/lib/central-db";

import { authConfig } from "./auth.config";

type BranchRole = "ADMIN" | "COORDINATOR" | "VOLUNTEER";

function isBranchRole(role: string): role is BranchRole {
return (
role === "ADMIN" ||
role === "COORDINATOR" ||
role === "VOLUNTEER"
);
}

export const { handlers, auth, signIn, signOut } = NextAuth({
...authConfig,

providers: [
// ============================================
// 1. EMAIL AND PASSWORD LOGIN
// ============================================
Credentials({
name: "Credentials",

  credentials: {
    email: {
      label: "Email",
      type: "email",
    },
    password: {
      label: "Password",
      type: "password",
    },
  },

  authorize: async (credentials) => {
    if (!credentials?.email || !credentials?.password) {
      return null;
    }

    const email = String(credentials.email).trim().toLowerCase();
    const password = String(credentials.password);

    // Check SuperAdmin
    const superAdmin = await centralPrisma.superAdmin.findUnique({
      where: { email },
    });

    if (superAdmin) {
      if (!superAdmin.isActive) {
        throw new Error("ACCOUNT_INACTIVE");
      }

      const passwordMatch = await bcrypt.compare(
        password,
        superAdmin.passwordHash,
      );

      if (!passwordMatch) {
        return null;
      }

      return {
        id: String(superAdmin.id),
        email: superAdmin.email,
        name: superAdmin.name,
        role: "ADMIN" as const,
        branchId: null,
        branchSlug: null,
        isSuperAdmin: true,
      };
    }

    // Check BranchUser
    const branchUser = await centralPrisma.branchUser.findUnique({
      where: { email },
      include: {
        branch: {
          select: {
            id: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!branchUser) {
      return null;
    }

    if (!branchUser.isActive) {
      throw new Error("ACCOUNT_INACTIVE");
    }

    if (!branchUser.branch.isActive) {
      throw new Error("BRANCH_INACTIVE");
    }

    // Validate role before returning the user
    if (!isBranchRole(branchUser.role)) {
      throw new Error("INVALID_USER_ROLE");
    }

    const passwordMatch = await bcrypt.compare(
      password,
      branchUser.passwordHash,
    );

    if (!passwordMatch) {
      return null;
    }

    return {
      id: String(branchUser.id),
      email: branchUser.email,
      name: branchUser.name,
      role: branchUser.role,
      branchId: branchUser.branch.id,
      branchSlug: branchUser.branch.slug,
      isSuperAdmin: false,
    };
  },
}),

// ============================================
// 2. QR TOKEN LOGIN
// ============================================
Credentials({
  id: "qr",
  name: "QR Login",

  credentials: {
    token: {
      label: "QR Token",
      type: "text",
    },
  },

  authorize: async (credentials) => {
    if (!credentials?.token) {
      return null;
    }

    const token = String(credentials.token).trim();

    if (!token) {
      return null;
    }

    // Check SuperAdmin by QR token
    const superAdmin = await centralPrisma.superAdmin.findUnique({
      where: { qrToken: token },
    });

    if (superAdmin) {
      if (!superAdmin.isActive) {
        throw new Error("ACCOUNT_INACTIVE");
      }

      return {
        id: String(superAdmin.id),
        email: superAdmin.email,
        name: superAdmin.name,
        role: "ADMIN" as const,
        branchId: null,
        branchSlug: null,
        isSuperAdmin: true,
      };
    }

    // Check BranchUser by QR token
    const branchUser = await centralPrisma.branchUser.findUnique({
      where: { qrToken: token },
      include: {
        branch: {
          select: {
            id: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!branchUser) {
      return null;
    }

    if (!branchUser.isActive) {
      throw new Error("ACCOUNT_INACTIVE");
    }

    if (!branchUser.branch.isActive) {
      throw new Error("BRANCH_INACTIVE");
    }

    // Validate role before returning the user
    if (!isBranchRole(branchUser.role)) {
      throw new Error("INVALID_USER_ROLE");
    }

    return {
      id: String(branchUser.id),
      email: branchUser.email,
      name: branchUser.name,
      role: branchUser.role,
      branchId: branchUser.branch.id,
      branchSlug: branchUser.branch.slug,
      isSuperAdmin: false,
    };
  },
}),

],
});