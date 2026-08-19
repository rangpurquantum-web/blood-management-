import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role?: string;
      branchId?: number | null;
      branchSlug?: string | null;
      permissions?: string[];
    } & DefaultSession["user"];
  }

  interface User {
    id?: string;
    role?: string;
    branchId?: number | null;
    branchSlug?: string | null;
    permissions?: string[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    role?: string;
    branchId?: number | null;
    branchSlug?: string | null;
    permissions?: string[];
  }
}