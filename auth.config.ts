import type { NextAuthConfig } from "next-auth";

type Role = "ADMIN" | "VOLUNTEER";

export const authConfig = {
  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // ─────────────────────────────────────────────────────────────
    // Route protection
    // ─────────────────────────────────────────────────────────────

    authorized: ({ auth, request }) => {
      const pathname = request.nextUrl.pathname;

      const isLoggedIn = !!auth?.user;

      const isAuthRoute =
        pathname.startsWith("/login") ||
        pathname.startsWith("/register");

      const isPublicRoute =
        pathname === "/" ||
        pathname.startsWith("/login") ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/check-donation") ||
        pathname.startsWith("/d/");

      const isProtectedRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/donors") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/import") ||
        pathname.startsWith("/audit-logs") ||
        pathname.startsWith("/branches");

      // Protected pages require login
      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      // Logged-in user should not access login/register
      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(
          new URL("/dashboard", request.nextUrl),
        );
      }

      // Other non-public pages require login
      if (
        !isLoggedIn &&
        !isPublicRoute &&
        !pathname.startsWith("/api")
      ) {
        return false;
      }

      return true;
    },

    // ─────────────────────────────────────────────────────────────
    // JWT
    // ─────────────────────────────────────────────────────────────

    jwt: async ({ token, user }) => {
      if (user) {
        token.role =
          typeof user.role === "string"
            ? user.role
            : undefined;

        token.branchId =
          typeof user.branchId === "number"
            ? user.branchId
            : null;

        token.branchSlug =
          typeof user.branchSlug === "string"
            ? user.branchSlug
            : null;

        token.permissions = Array.isArray(user.permissions)
          ? user.permissions
          : [];
      }

      return token;
    },

    // ─────────────────────────────────────────────────────────────
    // Session
    // ─────────────────────────────────────────────────────────────

    session: async ({ session, token }) => {
      if (!session.user) {
        return session;
      }

      if (token.sub) {
        session.user.id = token.sub;
      }

      if (typeof token.role === "string") {
        session.user.role = token.role as Role;
      }

      session.user.branchId =
        typeof token.branchId === "number"
          ? token.branchId
          : null;

      session.user.branchSlug =
        typeof token.branchSlug === "string"
          ? token.branchSlug
          : null;

      session.user.permissions = Array.isArray(token.permissions)
        ? token.permissions
        : [];

      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;