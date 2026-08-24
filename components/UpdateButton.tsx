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
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

  const [status, setStatus] = useState<UpdateStatus>("idle");

  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    // Browser / PWA হলে Login দেখাবে
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
       * IMPORTANT:
       *
       * cordova-plugin-apkupdater-এর default export ব্যবহার করছি।
       *
       * Dynamic import-এর ক্ষেত্রে module.default পাওয়া না গেলে
       * পুরো module-টাকেও fallback হিসেবে নেওয়া হচ্ছে।
       */
      const module = await import(
        "cordova-plugin-apkupdater"
      );

      const ApkUpdater =
        module.default ?? module;

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
       * Plugin-এর permission API আছে কিনা আগে check করছি।
       *
       * পুরোনো/ভিন্ন plugin object হলে সরাসরি
       * canRequestPackageInstalls() call করে crash করবে না।
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

            /*
             * Settings থেকে ফিরে এসে user আবার Update চাপবে।
             */
            setStatus("idle");
            return;
          }

          throw new Error(
            "Android install permission is not available."
          );
        }
      }

      /*
       * APK download
       */
      console.log(
        "[Update] Downloading:",
        updateInfo.downloadUrl
      );

      const downloaded = await ApkUpdater.download(
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
              Math.max(0, Math.min(100, value))
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
       * Install
       */
      setProgress(100);
      setStatus("installing");

      console.log("[Update] Installing APK...");

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

      /*
       * একটু delay দিয়ে আবার button active করা হবে
       */
      setTimeout(() => {
        setStatus("idle");
      }, 2000);

      /*
       * User-friendly error
       */
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      alert(`Update failed:\n\n${message}`);
    }
  }

  /*
   * Browser / PWA:
   * Login button দেখাবে
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
        {status === "idle" &&
          `Update to ${updateInfo.versionName}`}

        {status === "downloading" &&
          `Updating... ${progress}%`}

        {status === "installing" &&
          "Installing..."}

        {status === "error" &&
          "Try Update Again"}
      </span>
    </button>
  );
}