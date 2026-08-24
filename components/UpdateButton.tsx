"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import ApkUpdater from "cordova-plugin-apkupdater";

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
  const [updateInfo, setUpdateInfo] =
    useState<UpdateInfo | null>(null);

  const [status, setStatus] = useState<
    "idle" | "downloading" | "installing"
  >("idle");

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkForUpdate();
  }, []);

  // ─────────────────────────────────────────────
  // Check for new version
  // ─────────────────────────────────────────────
  async function checkForUpdate() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const currentInfo = await App.getInfo();

      const currentVersionCode = parseInt(
        currentInfo.build,
        10
      );

      console.log(
        "Current version code:",
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

      const latest: UpdateInfo =
        await res.json();

      console.log(
        "Latest version:",
        latest
      );

      if (
        latest.versionCode >
        currentVersionCode
      ) {
        setUpdateInfo(latest);
      }
    } catch (error) {
      console.error(
        "Update check failed:",
        error
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
      console.log(
        "UPDATE: button clicked"
      );

      setStatus("downloading");
      setProgress(0);

      // ───────────────────────────────────────
      // Check install permission
      // ───────────────────────────────────────
      const canInstall =
        await ApkUpdater.canRequestPackageInstalls();

      console.log(
        "Can install APK:",
        canInstall
      );

      if (!canInstall) {
        await ApkUpdater.openInstallSetting();

        setStatus("idle");

        return;
      }

      // ───────────────────────────────────────
      // Download APK
      // ───────────────────────────────────────
      console.log(
        "Downloading:",
        updateInfo.downloadUrl
      );

      await ApkUpdater.download(
        updateInfo.downloadUrl,
        {
          onDownloadProgress: (info) => {
            console.log(
              "Download progress:",
              info
            );

            const percent =
              Number(info.progress) || 0;

            setProgress(
              Math.min(
                100,
                Math.max(
                  0,
                  Math.round(percent)
                )
              )
            );
          },
        }
      );

      console.log(
        "APK download completed"
      );

      setProgress(100);

      // ───────────────────────────────────────
      // Install
      // ───────────────────────────────────────
      setStatus("installing");

      console.log(
        "Starting APK installation..."
      );

      await ApkUpdater.install();

      console.log(
        "APK installation started"
      );
    } catch (error) {
      console.error(
        "UPDATE FAILED:",
        error
      );

      setStatus("idle");
      setProgress(0);

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      alert(
        `Update failed:\n\n${message}`
      );
    }
  }

  // ─────────────────────────────────────────────
  // No update
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