"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Download, X } from "lucide-react";

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<{ downloadUrl: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    async function checkUpdate() {
      try {
        const info = await App.getInfo();
        const currentVersion = info.version;

        const res = await fetch("/api/app-version");
        const data = await res.json();

        if (data.latestVersion !== currentVersion) {
          setUpdateInfo({ downloadUrl: data.downloadUrl });
        }
      } catch (e) {
        // Update check fail hole silently ignore korbo
      }
    }

    checkUpdate();
  }, []);

  if (!updateInfo || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border bg-card shadow-lg p-4 flex items-center gap-3">
      <Download className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1 text-sm">
        <p className="font-medium">Notun update ase</p>
        <p className="text-xs text-muted-foreground">App-er notun version download korun</p>
      </div>
      <a
        href={updateInfo.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-primary underline"
      >
        Download
      </a>
      <button onClick={() => setDismissed(true)}>
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}