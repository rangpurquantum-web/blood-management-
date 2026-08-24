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
  const [status, setStatus] = useState<"idle" | "downloading" | "installing">(
    "idle"
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    // শুধুমাত্র native Android app-এ update check করবে
    if (!Capacitor.isNativePlatform()) return;

    try {
      const currentInfo = await App.getInfo();

      // Android build versionCode
      const currentVersionCode = parseInt(currentInfo.build, 10);

      const res = await fetch(
        "https://blood-management-livid.vercel.app/api/app-version",
        {
          cache: "no-store",
        }
      );

      if (!res.ok) {
        throw new Error(`Update API failed: ${res.status}`);
      }

      const latest: UpdateInfo = await res.json();

      console.log("Current version code:", currentVersionCode);
      console.log("Latest version code:", latest.versionCode);

      if (latest.versionCode > currentVersionCode) {
        setUpdateInfo(latest);
      }
    } catch (err) {
      console.error("Update check failed:", err);
    }
  }

  async function handleUpdate() {
    if (!updateInfo) return;

    try {
      const { default: ApkUpdater } = await import(
        "cordova-plugin-apkupdater"
      );

      const canInstall = await ApkUpdater.canRequestPackageInstalls();

      if (!canInstall) {
        await ApkUpdater.openInstallSetting();
        return;
      }

      setStatus("downloading");
      setProgress(0);

      await ApkUpdater.download(updateInfo.downloadUrl, {
        onDownloadProgress: (info) => {
          /**
           * cordova-plugin-apkupdater এর Progress object
           * plugin version অনুযায়ী progress/progressPercentage
           * আলাদা হতে পারে।
           *
           * TypeScript build ঠিক রাখার জন্য runtime value
           * safely handle করা হচ্ছে।
           */
          const downloadInfo = info as unknown as {
            progress?: number;
            percent?: number;
            progressPercentage?: number;
          };

          const value =
            downloadInfo.progressPercentage ??
            downloadInfo.percent ??
            downloadInfo.progress ??
            0;

          setProgress(Math.min(100, Math.max(0, Math.round(value))));
        },
      });

      setProgress(100);
      setStatus("installing");

      await ApkUpdater.install();
    } catch (err) {
      console.error("Update failed:", err);
      setStatus("idle");
      setProgress(0);
    }
  }

  if (!updateInfo) {
    return <>{fallback}</>;
  }

  return (
    <button
      onClick={handleUpdate}
      disabled={status !== "idle"}
      className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 shadow-[0_8px_30px_rgba(255,255,255,0.35)] transition-all hover:scale-[1.02] hover:bg-blue-500 active:scale-[0.98] disabled:opacity-80"
    >
      <span className="text-center text-sm font-semibold text-white">
        {status === "idle" && "Update"}
        {status === "downloading" && `Updating... ${progress}%`}
        {status === "installing" && "Installing..."}
      </span>
    </button>
  );
}