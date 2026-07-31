import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { prisma } from "@/lib/db";

import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        });

        if (!user) {
          return null;
        }

        if (user.isDeleted) {
          // Account has been permanently deleted
          return null;
        }

        if (!user.isActive) {
          throw new Error("ACCOUNT_INACTIVE");
        }

        const passwordMatch = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash,
        );

        if (!passwordMatch) {
          return null;
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          role: user.role,
          permissions: user.permissions,
        };
      },
    }),
  ],
});
