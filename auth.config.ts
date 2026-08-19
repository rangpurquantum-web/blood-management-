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

      if (isProtectedRoute && !isLoggedIn) {
        return false;
      }

      if (isLoggedIn && isAuthRoute) {
        return Response.redirect(
          new URL("/dashboard", request.nextUrl),
        );
      }

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
      if (user?.id) {
        token.sub = user.id;
      }

      if (user?.role) {
        token.role = user.role as Role;
      }

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
        const permissions = Array.isArray(token.permissions)
          ? token.permissions
          : [];

        session.user = {
          ...session.user,
          id: token.sub ?? session.user.id,
          role: token.role as Role | undefined,
          permissions,
        } as typeof session.user;
      }

      return session;
    },
  },

  providers: [],
} satisfies NextAuthConfig;