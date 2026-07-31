"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on mount (client-side only).
 * This component renders nothing — it only triggers SW registration.
 */
export function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("SW registered, scope:", registration.scope);
        })
        .catch((error) => {
          console.error("SW registration failed:", error);
        });
    }
  }, []);

  return null;
}
