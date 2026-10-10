"use client";

import { useClerk } from "@clerk/nextjs";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { signOut } = useClerk();

  return (
    <Button
      variant="destructive"
      className="w-full justify-center gap-2 rounded-xl"
      onClick={() => signOut({ redirectUrl: "/login" })}
    >
      <LogOut className="h-4 w-4" />
      Sign out
    </Button>
  );
}
