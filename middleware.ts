import NextAuth from "next-auth";

import { authConfig } from "@/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|icons/|offline|d/|debug/|api/debug/|^$|login|register|check-donation).*)",
  ],
};