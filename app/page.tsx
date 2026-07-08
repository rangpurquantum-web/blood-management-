import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="max-w-2xl space-y-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Internal Blood Management System
        </p>
        <h1 className="text-4xl font-bold tracking-tight">Management Portal</h1>
        <p className="text-muted-foreground">
          Secure internal application for donor management, donation history, blood requests,
          reports, and audit trails.
        </p>
      </div>
      <Button asChild>
        <Link href="/login">Sign in</Link>
      </Button>
    </main>
  );
}
