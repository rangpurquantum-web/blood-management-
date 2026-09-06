import { DefaultSession } from "next-auth";

type Role = "SUPER_ADMIN" | "ADMIN" | "VOLUNTEER";

declare module "next-auth" {
  interface Session {
    user: {
      role?: Role;
      permissions?: unknown;
      branchId?: number | null;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    permissions?: unknown;
    branchId?: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    permissions?: unknown;
    branchId?: number | null;
  }
}