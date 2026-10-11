"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export type AppClientUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: number | null;
  branchSlug: string | null;
  permissions: Record<string, boolean> | null;
  isSuperAdmin: boolean;
};

// Drop-in replacement for NextAuth's useSession() in client components.
export function useAppSession(): {
  data: { user: AppClientUser } | null;
  status: "loading" | "authenticated" | "unauthenticated";
} {
  const { isLoaded, isSignedIn } = useAuth();

  const query = useQuery({
    queryKey: ["app-session"],
    enabled: isLoaded && isSignedIn === true,
    staleTime: 60_000,
    queryFn: async (): Promise<AppClientUser | null> => {
      const res = await fetch("/api/me", { credentials: "include" });
      if (!res.ok) return null;
      const json = await res.json();
      return (json.user as AppClientUser | null) ?? null;
    },
  });

  if (!isLoaded || (isSignedIn && query.isLoading)) {
    return { data: null, status: "loading" };
  }

  if (isSignedIn && query.data) {
    return { data: { user: query.data }, status: "authenticated" };
  }

  return { data: null, status: "unauthenticated" };
}
