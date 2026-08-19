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
        pathname.startsWith("/check-donation");
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

      return session;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
