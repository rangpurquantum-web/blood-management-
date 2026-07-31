"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";

import { createQueryClient } from "@/lib/query";
import { SessionProvider } from "next-auth/react";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered successfully with scope:", registration.scope);
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}

