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

type DownloadProgress = {
  progress?: number;
  percent?: number;
  bytesWritten?: number;
  bytes?: number;
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
    void checkForUpdate();
  }, []);

  // ─────────────────────────────────────────────
  // Check latest version
  // ─────────────────────────────────────────────

  async function checkForUpdate() {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const currentInfo = await App.getInfo();

      const currentVersionCode = Number(
        currentInfo.build
      );

      console.log(
        "[UPDATE] Current version:",
        currentInfo.version
      );

      console.log(
        "[UPDATE] Current build:",
        currentVersionCode
      );

      const response = await fetch(
        "https://blood-management-livid.vercel.app/api/app-version",
        {
          cache: "no-store",
        }
      );

      if (!response.ok) {
        throw new Error(
          `Version API returned ${response.status}`
        );
      }

      const latest: UpdateInfo =
        await response.json();

      console.log(
        "[UPDATE] Latest:",
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
        "[UPDATE] Version check failed:",
        error
      );
    }
  }

  // ─────────────────────────────────────────────
  // Update
  // ─────────────────────────────────────────────

  async function handleUpdate() {
    if (!updateInfo) {
      return;
    }

    try {
      console.log(
        "[UPDATE] Starting update..."
      );

      console.log(
        "[UPDATE] ApkUpdater:",
        ApkUpdater
      );

      // Make sure plugin exists
      if (!ApkUpdater) {
        throw new Error(
          "APK Updater plugin is not available. Rebuild APK after running npx cap sync android."
        );
      }

      // Make sure required methods exist
      if (
        typeof ApkUpdater.download !==
        "function"
      ) {
        throw new Error(
          "APK Updater download() is not available in this APK."
        );
      }

      if (
        typeof ApkUpdater.install !==
        "function"
      ) {
        throw new Error(
          "APK Updater install() is not available in this APK."
        );
      }

      setStatus("downloading");
      setProgress(0);

      // ───────────────────────────────────────
      // Check installation permission
      // ───────────────────────────────────────

      if (
        typeof ApkUpdater.canRequestPackageInstalls ===
        "function"
      ) {
        const canInstall =
          await ApkUpdater.canRequestPackageInstalls();

        console.log(
          "[UPDATE] Install permission:",
          canInstall
        );

        if (!canInstall) {
          if (
            typeof ApkUpdater.openInstallSetting ===
            "function"
          ) {
            await ApkUpdater.openInstallSetting();
          }

          setStatus("idle");
          return;
        }
      } else {
        console.warn(
          "[UPDATE] canRequestPackageInstalls() not available. Continuing to download."
        );
      }

      // ───────────────────────────────────────
      // Download APK
      // ───────────────────────────────────────

      console.log(
        "[UPDATE] Download URL:",
        updateInfo.downloadUrl
      );

      await ApkUpdater.download(
        updateInfo.downloadUrl,
        {
          onDownloadProgress: (
            info: DownloadProgress
          ) => {
            console.log(
              "[UPDATE] Download:",
              info
            );

            const value =
              info.progress ??
              info.percent ??
              0;

            const percent = Math.round(
              Number(value)
            );

            setProgress(
              Math.max(
                0,
                Math.min(100, percent)
              )
            );
          },
        }
      );

      console.log(
        "[UPDATE] Download complete"
      );

      setProgress(100);

      // ───────────────────────────────────────
      // Install APK
      // ───────────────────────────────────────

      setStatus("installing");

      console.log(
        "[UPDATE] Installing APK..."
      );

      await ApkUpdater.install();

      console.log(
        "[UPDATE] Install request sent"
      );
    } catch (error) {
      console.error(
        "[UPDATE] Update failed:",
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
  // Normal website / no update
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
      onClick={() => void handleUpdate()}
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