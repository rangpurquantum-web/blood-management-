"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

type UpdateInfo = {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
};

export default function UpdateButton({
  fallback,
}: {
  fallback: React.ReactNode;
}) {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const [status, setStatus] = useState<
    "idle" | "downloading" | "installing"
  >("idle");

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkForUpdate();
  }, []);

  // ─────────────────────────────────────────────
  // Check latest version
  // ─────────────────────────────────────────────
  async function checkForUpdate() {
    // Browser/PWA-তে update button দেখাবে না
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const currentInfo = await App.getInfo();

      const currentVersionCode = parseInt(currentInfo.build, 10);

      console.log(
        "Current Android versionCode:",
        currentVersionCode
      );

      const res = await fetch(
        "https://blood-management-livid.vercel.app/api/app-version",
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(
          `Version API failed: ${res.status}`
        );
      }

      const latest: UpdateInfo = await res.json();

      console.log("Latest version:", latest);

      if (
        latest.versionCode > currentVersionCode
      ) {
        console.log(
          "Update available:",
          latest.versionName
        );

        setUpdateInfo(latest);
      } else {
        console.log("App is already up to date.");
      }
    } catch (err) {
      console.error(
        "Update check failed:",
        err
      );
    }
  }

  // ─────────────────────────────────────────────
  // Download + Install
  // ─────────────────────────────────────────────
  async function handleUpdate() {
    if (!updateInfo) {
      return;
    }

    try {
      console.log("UPDATE: button clicked");

      setStatus("downloading");
      setProgress(0);

      // Load native APK updater plugin
      console.log(
        "UPDATE: loading ApkUpdater..."
      );

      const { default: ApkUpdater } =
        await import(
          "cordova-plugin-apkupdater"
        );

      console.log(
        "UPDATE: ApkUpdater loaded",
        ApkUpdater
      );

      // ───────────────────────────────────────
      // Check Android install permission
      // ───────────────────────────────────────
      const canInstall =
        await ApkUpdater.canRequestPackageInstalls();

      console.log(
        "UPDATE: can install =",
        canInstall
      );

      if (!canInstall) {
        console.log(
          "UPDATE: opening install settings"
        );

        await ApkUpdater.openInstallSetting();

        setStatus("idle");

        return;
      }

      // ───────────────────────────────────────
      // Download APK
      // ───────────────────────────────────────
      console.log(
        "UPDATE: downloading APK:",
        updateInfo.downloadUrl
      );

      await ApkUpdater.download(
        updateInfo.downloadUrl,
        {
          onDownloadProgress: (info) => {
            console.log(
              "UPDATE: download progress:",
              info
            );

            const downloadInfo =
              info as unknown as {
                progress?: number;
                percent?: number;
                progressPercentage?: number;
              };

            const value =
              downloadInfo.progressPercentage ??
              downloadInfo.percent ??
              downloadInfo.progress ??
              0;

            const safeProgress = Math.min(
              100,
              Math.max(
                0,
                Math.round(value)
              )
            );

            setProgress(safeProgress);
          },
        }
      );

      // Download finished
      console.log(
        "UPDATE: download complete"
      );

      setProgress(100);

      // ───────────────────────────────────────
      // Install APK
      // ───────────────────────────────────────
      setStatus("installing");

      console.log(
        "UPDATE: installing APK..."
      );

      await ApkUpdater.install();

      console.log(
        "UPDATE: install started"
      );
    } catch (err) {
      console.error(
        "UPDATE FAILED:",
        err
      );

      setStatus("idle");
      setProgress(0);

      // Show actual error on phone
      const message =
        err instanceof Error
          ? err.message
          : String(err);

      alert(
        `Update failed:\n\n${message}`
      );
    }
  }

  // ─────────────────────────────────────────────
  // No update available
  // ─────────────────────────────────────────────
  if (!updateInfo) {
    return <>{fallback}</>;
  }

  // ─────────────────────────────────────────────
  // Update button
  // ─────────────────────────────────────────────
  return (
    <button
      type="button"
      onClick={handleUpdate}
      disabled={status !== "idle"}
      className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 shadow-[0_8px_30px_rgba(255,255,255,0.35)] transition-all hover:scale-[1.02] hover:bg-blue-500 active:scale-[0.98] disabled:opacity-80"
    >
      <span className="text-center text-sm font-semibold text-white">
        {status === "idle" &&
          `Update to ${updateInfo.versionName}`}

        {status === "downloading" &&
          `Updating... ${progress}%`}

        {status === "installing" &&
          "Installing..."}
      </span>
    </button>
  );
}