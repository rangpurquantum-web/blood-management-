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
    // Sudhu native Android app e chalbe, web browser e login-i dekhabe
    if (!Capacitor.isNativePlatform()) return;

    try {
      const currentInfo = await App.getInfo();
      const currentVersionCode = parseInt(currentInfo.build, 10);

      const res = await fetch(
        "https://blood-management-livid.vercel.app/api/app-version"
      );
      const latest: UpdateInfo = await res.json();

      if (latest.versionCode > currentVersionCode) {
        setUpdateInfo(latest);
      }
    } catch (err) {
      console.error("Update check failed:", err);
    }
  }

  async function handleUpdate() {
    if (!updateInfo) return;

    const { default: ApkUpdater } = await import("cordova-plugin-apkupdater");

    try {
      const canInstall = await ApkUpdater.canRequestPackageInstalls();
      if (!canInstall) {
        await ApkUpdater.openInstallSetting();
        return;
      }

      setStatus("downloading");
      setProgress(0);
      await ApkUpdater.download(updateInfo.downloadUrl, {
        onDownloadProgress: (info) => {
          setProgress(info.progress);
        },
      });

      setStatus("installing");
      await ApkUpdater.install();
    } catch (err) {
      console.error("Update failed:", err);
      setStatus("idle");
    }
  }

  if (!updateInfo) return <>{fallback}</>;

  return (
    <button
      onClick={handleUpdate}
      disabled={status !== "idle"}
      className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 shadow-[0_8px_30px_rgba(255,255,255,0.35)] hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-80"
    >
      <span className="text-center font-semibold text-white text-sm">
        {status === "idle" && "Update"}
        {status === "downloading" && `Updating... ${progress}%`}
        {status === "installing" && "Installing..."}
      </span>
    </button>
  );
}