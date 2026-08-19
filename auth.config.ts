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
    authorized: ({ auth, request }) => {
      const pathname = request.nextUrl.pathname;
      const isLoggedIn = !!auth?.user;

      const isAuthRoute = pathname.startsWith("/login");

      const isPublicRoute =
        pathname === "/" ||
        isAuthRoute ||
        pathname.startsWith("/register") ||
        pathname.startsWith("/check-donation") ||
        pathname.startsWith("/d/");

      const isProtectedRoute =
        pathname.startsWith("/dashboard") ||
        pathname.startsWith("/donors") ||
        pathname.startsWith("/reports") ||
        pathname.startsWith("/import") ||
        pathname.startsWith("/audit-logs");

      // Protected routes require authentication
      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      // Logged-in users should not access login page
      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(
          new URL("/dashboard", request.nextUrl),
        );
      }

      // Block unknown non-public pages for unauthenticated users
      if (
        !isLoggedIn &&
        !isPublicRoute &&
        !pathname.startsWith("/api")
      ) {
        return false;
      }

      return true;
    },

    jwt: async ({ token, user }) => {
      // Save user ID
      if (user?.id) {
        token.sub = user.id;
      }

      // Save role
      if (user?.role) {
        token.role = user.role as Role;
      }

      // Save permissions
      if (user && "permissions" in user) {
        const permissions = user.permissions;

        if (Array.isArray(permissions)) {
          token.permissions = permissions;
        } else {
          token.permissions = [];
        }
      }

      return token;
    },

    session: async ({ session, token }) => {
      if (session.user) {
        // User ID
        if (token.sub) {
          session.user.id = token.sub;
        }

        // User role
        if (token.role) {
          session.user.role = token.role as Role;
        }

        // User permissions
        if (Array.isArray(token.permissions)) {
          session.user.permissions = token.permissions;
        } else {
          session.user.permissions = [];
        }
      }

      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;