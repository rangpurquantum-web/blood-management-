import { DefaultSession } from "next-auth";

type Role = "ADMIN" | "VOLUNTEER";

declare module "next-auth" {
  interface Session {
    user: {
      role?: Role;
      permissions?: any;
    } & DefaultSession["user"];
  }

  interface User {
    role?: Role;
    permissions?: any;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: Role;
    permissions?: any;
  }
}
