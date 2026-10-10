import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/superadmin/login(.*)",
  "/register(.*)",
  "/link-account(.*)",
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
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
