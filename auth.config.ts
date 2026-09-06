import type { NextAuthConfig } from "next-auth";

type Role = "SUPER_ADMIN" | "ADMIN" | "VOLUNTEER";


export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    authorized: ({ auth, request }) => {
      const pathname = request.nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = pathname.startsWith("/login");
      const isPublicRoute = pathname === "/" || isAuthRoute || pathname.startsWith("/register");
      const isProtectedRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/donors") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/import") ||
        pathname.startsWith("/audit-logs");

      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(new URL("/dashboard", request.nextUrl));
      }

      if (!isLoggedIn && !isPublicRoute && !pathname.startsWith("/api")) {
        return false;
      }

      return true;
    },
    jwt: async ({ token, user }) => {
      if (user?.role) {
        token.role = user.role as Role;
      }
      if (user && "permissions" in user) {
        token.permissions = user.permissions;
      }
      // Carry branchId so requests can resolve the tenant DB without an extra lookup
      if (user && "branchId" in user && user.branchId !== undefined) {
        token.branchId = user.branchId as number | null;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      if (session.user && token.role) {
        session.user.role = token.role as Role;
      }
      if (session.user && "permissions" in token) {
        session.user.permissions = token.permissions;
      }
      if (session.user && "branchId" in token) {
        session.user.branchId = token.branchId as number | null | undefined;
      }

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
