import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/superadmin/login(.*)",
  "/sign-up(.*)",
  "/register(.*)",
  "/check-donation(.*)",
  "/request-blood(.*)",
  "/d/(.*)",
  "/offline(.*)",
  "/manifest.json",
  "/sw.js",
  "/icons/(.*)",
  // API routes enforce auth themselves (withAuth -> 401)
  "/api/(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
