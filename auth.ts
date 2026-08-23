import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { centralPrisma } from "@/lib/central-db";

import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,

  providers: [
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

        // ─────────────────────────────────────────────
        // 1. Check SuperAdmin
        // ─────────────────────────────────────────────

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
            role: "ADMIN",
            branchId: null,
            branchSlug: null,
            isSuperAdmin: true,
          };
        }

        // ─────────────────────────────────────────────
        // 2. Check BranchUser
        // ─────────────────────────────────────────────

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

        // ─────────────────────────────────────────────
        // 1. Check SuperAdmin by QR token
        // ─────────────────────────────────────────────

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
            role: "ADMIN",
            branchId: null,
            branchSlug: null,
            isSuperAdmin: true,
          };
        }

        // ─────────────────────────────────────────────
        // 2. Check BranchUser by QR token
        // ─────────────────────────────────────────────

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