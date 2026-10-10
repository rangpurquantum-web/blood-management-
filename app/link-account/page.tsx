import { redirect } from "next/navigation";
import { auth as clerkAuth } from "@clerk/nextjs/server";

import { auth } from "@/lib/auth-adapter";
import { centralPrisma } from "@/lib/central-db";
import { LinkAccountForm } from "@/components/link-account-form";
import { SignOutButton } from "@/components/layout/signout-button";

export default async function LinkAccountPage() {
  const { userId } = await clerkAuth();
  if (!userId) redirect("/login");

  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const identity = await centralPrisma.userIdentity.findUnique({
    where: { clerkUserId: userId },
    select: { id: true },
  });

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6 rounded-2xl border bg-card p-6 shadow-lg">
        {identity ? (
          <>
            <h1 className="text-xl font-semibold">Account unavailable</h1>
            <p className="text-sm text-muted-foreground">
              Your account is linked but currently inactive. Please contact your Admin.
            </p>
          </>
        ) : (
          <>
            <h1 className="text-xl font-semibold">Link your account</h1>
            <p className="text-sm text-muted-foreground">
              Enter the one-time code your Admin gave you.
            </p>
            <LinkAccountForm />
          </>
        )}
        <SignOutButton />
      </div>
    </main>
  );
}
