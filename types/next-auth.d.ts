import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      branchId?: number | null;
      branchSlug?: string | null;
      permissions?: Record<string, boolean> | null;
      isSuperAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string;
    branchId?: number | null;
    branchSlug?: string | null;
    permissions?: Record<string, boolean> | null;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    branchId?: number | null;
    branchSlug?: string | null;
    permissions?: Record<string, boolean> | null;
    isSuperAdmin?: boolean;
  }
}