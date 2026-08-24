"use client";

import { useEffect, useState } from "react";
import DashboardLoading from "@/components/loading/dashboard-loading";

const BOOT_DURATION_MS = 1800;
const FADE_DURATION_MS = 400;

export function AppBootLoader({
  children,
}: {
  children: React.ReactNode;
}) {
  const [booting, setBooting] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const fadeTimer = window.setTimeout(() => {
      setFadingOut(true);
    }, BOOT_DURATION_MS);

    const doneTimer = window.setTimeout(() => {
      setBooting(false);
    }, BOOT_DURATION_MS + FADE_DURATION_MS);

    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(doneTimer);
    };
  }, []);

  return (
    <>
      {/* Main application */}
      <div className={booting ? "invisible" : "visible"}>
        {children}
      </div>

      {/* Startup Loading */}
      {booting && (
        <div
          className={`fixed inset-0 z-[9999] bg-background transition-opacity duration-[400ms] ${
            fadingOut ? "opacity-0" : "opacity-100"
          }`}
        >
          <DashboardLoading fullscreen />
        </div>
      )}
    </>
  );
}