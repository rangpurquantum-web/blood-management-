"use client";

import { useEffect, useState } from "react";
import { App } from "@capacitor/app";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { Download, X, Loader2 } from "lucide-react";

interface UpdateInstallerPlugin {
  downloadAndInstall(options: { url: string }): Promise<{ status: string }>;
}

const UpdateInstaller = registerPlugin<UpdateInstallerPlugin>("UpdateInstaller");

const UPDATE_CHECK_ENABLED = false;

export function UpdateChecker() {
  const [updateInfo, setUpdateInfo] = useState<{ downloadUrl: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (!UPDATE_CHECK_ENABLED) return;
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

  const handleUpdate = async () => {
    if (!updateInfo) return;
    setDownloading(true);
    try {
      await UpdateInstaller.downloadAndInstall({ url: updateInfo.downloadUrl });
    } catch (e) {
      // Fail hole downloading state off kore dibo
    } finally {
      setDownloading(false);
    }
  };

  if (!UPDATE_CHECK_ENABLED || !updateInfo || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 rounded-lg border bg-card shadow-lg p-4 flex items-center gap-3">
      {downloading ? (
        <Loader2 className="h-5 w-5 text-primary shrink-0 animate-spin" />
      ) : (
        <Download className="h-5 w-5 text-primary shrink-0" />
      )}
      <div className="flex-1 text-sm">
        <p className="font-medium">Notun update ase</p>
        <p className="text-xs text-muted-foreground">
          {downloading ? "Download hocche..." : "Update korte tap korun"}
        </p>
      </div>
      <button
        onClick={handleUpdate}
        disabled={downloading}
        className="text-sm font-medium text-primary underline disabled:opacity-50"
      >
        Update
      </button>
      <button onClick={() => setDismissed(true)}>
        <X className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );
}