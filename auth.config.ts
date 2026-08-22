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
    // ================================================================
    // AUTHORIZATION
    // ================================================================

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

      // Protected routes require authentication
      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      // Logged-in users cannot access login/register
      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(
          new URL("/dashboard", request.nextUrl),
        );
      }

      // Everything except public/API routes requires login
      if (
        !isLoggedIn &&
        !isPublicRoute &&
        !pathname.startsWith("/api")
      ) {
        return false;
      }

      return true;
    },

    // ================================================================
    // JWT
    // ================================================================

    jwt: async ({ token, user }) => {
      // This runs when user logs in
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

        // Permissions are a { permissionKey: boolean } object,
        // NOT an array — store it as-is (or null if absent/malformed)
        // so role-default overrides aren't silently dropped.
        const rawPermissions = (user as { permissions?: unknown }).permissions;
        token.permissions =
          rawPermissions &&
          typeof rawPermissions === "object" &&
          !Array.isArray(rawPermissions)
            ? rawPermissions
            : null;

        token.isSuperAdmin = Boolean((user as { isSuperAdmin?: boolean }).isSuperAdmin);
      }

      return token;
    },

    // ================================================================
    // SESSION
    // ================================================================

    session: async ({ session, token }) => {
      if (!session.user) {
        return session;
      }

      // User ID
      if (typeof token.sub === "string") {
        session.user.id = token.sub;
      }

      // Role
      if (typeof token.role === "string") {
        session.user.role = token.role as Role;
      }

      // Branch ID
      session.user.branchId =
        typeof token.branchId === "number"
          ? token.branchId
          : null;

      // Branch slug
      session.user.branchSlug =
        typeof token.branchSlug === "string"
          ? token.branchSlug
          : null;

      // Permissions — pass through the object as-is (null if not set),
      // matching what lib/permissions.ts's hasPermission() expects.
      const tokenPermissions = (token as { permissions?: unknown }).permissions;
      session.user.permissions =
        tokenPermissions &&
        typeof tokenPermissions === "object" &&
        !Array.isArray(tokenPermissions)
          ? (tokenPermissions as Record<string, boolean>)
          : null;

      // Super Admin flag
      (session.user as { isSuperAdmin?: boolean }).isSuperAdmin = Boolean(
        token.isSuperAdmin,
      );

      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;
