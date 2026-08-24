"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

type UpdateInfo = {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
};

type UpdateStatus =
  | "idle"
  | "downloading"
  | "installing"
  | "error";

export default function UpdateButton({
  fallback,
}: {
  fallback: React.ReactNode;
}) {
  const [updateInfo, setUpdateInfo] =
    useState<UpdateInfo | null>(null);

  const [status, setStatus] =
    useState<UpdateStatus>("idle");

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    // Browser / PWA হলে Login button দেখাবে
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const currentInfo = await App.getInfo();

      const currentVersionCode = Number.parseInt(
        currentInfo.build || "1",
        10
      );

      console.log(
        "[Update] Current version:",
        currentInfo.version,
        "Build:",
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
          `Version API failed: ${response.status}`
        );
      }

      const latest: UpdateInfo = await response.json();

      console.log("[Update] Latest version:", latest);

      if (
        latest.versionCode > currentVersionCode &&
        latest.downloadUrl
      ) {
        setUpdateInfo(latest);
      } else {
        setUpdateInfo(null);
      }
    } catch (error) {
      console.error("[Update] Check failed:", error);
      setUpdateInfo(null);
    }
  }

  async function handleUpdate() {
    if (!updateInfo) {
      return;
    }

    try {
      setStatus("downloading");
      setProgress(0);

      /*
       * Load APK updater plugin.
       *
       * IMPORTANT:
       * এখানে "module" variable ব্যবহার করা হয়নি,
       * যাতে Next.js ESLint error না দেয়।
       */
      const updaterModule = await import(
        "cordova-plugin-apkupdater"
      );

      const ApkUpdater =
        updaterModule.default ?? updaterModule;

      console.log(
        "[Update] ApkUpdater:",
        ApkUpdater
      );

      if (!ApkUpdater) {
        throw new Error(
          "APK Updater plugin could not be loaded."
        );
      }

      /*
       * Check Android install permission.
       *
       * API না থাকলেও সরাসরি crash করবে না।
       */
      if (
        typeof ApkUpdater.canRequestPackageInstalls ===
        "function"
      ) {
        const canInstall =
          await ApkUpdater.canRequestPackageInstalls();

        console.log(
          "[Update] Can install:",
          canInstall
        );

        if (!canInstall) {
          if (
            typeof ApkUpdater.openInstallSetting ===
            "function"
          ) {
            await ApkUpdater.openInstallSetting();

            setStatus("idle");
            return;
          }

          throw new Error(
            "Android install permission is not available."
          );
        }
      }

      /*
       * Download APK
       */
      console.log(
        "[Update] Downloading:",
        updateInfo.downloadUrl
      );

      const downloaded =
        await ApkUpdater.download(
          updateInfo.downloadUrl,
          {
            onDownloadProgress: (info: {
              progress?: number;
              bytesWritten?: number;
              bytes?: number;
            }) => {
              const value = Math.round(
                Number(info?.progress ?? 0)
              );

              setProgress(
                Math.max(
                  0,
                  Math.min(100, value)
                )
              );

              console.log(
                "[Update] Download:",
                value + "%"
              );
            },
          }
        );

      console.log(
        "[Update] Download completed:",
        downloaded
      );

      /*
       * Install APK
       */
      setProgress(100);
      setStatus("installing");

      console.log(
        "[Update] Installing APK..."
      );

      await ApkUpdater.install();

      console.log(
        "[Update] Installation started."
      );
    } catch (error) {
      console.error(
        "[Update] Update failed:",
        error
      );

      setStatus("error");

      setTimeout(() => {
        setStatus("idle");
      }, 2000);

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      alert(
        `Update failed:\n\n${message}`
      );
    }
  }

  /*
   * Browser / PWA:
   * Login button দেখাবে।
   */
  if (!updateInfo) {
    return <>{fallback}</>;
  }

  return (
    <button
      type="button"
      onClick={handleUpdate}
      disabled={
        status === "downloading" ||
        status === "installing"
      }
      className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 shadow-[0_8px_30px_rgba(255,255,255,0.35)] transition-all hover:scale-[1.02] hover:bg-blue-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80"
    >
      <span className="text-center text-sm font-semibold text-white">
        Update
      </span>
    </button>
  );
}