"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";

type UpdateInfo = {
  versionCode: number;
  versionName: string;
  downloadUrl: string;
};

export default function UpdateButton() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [status, setStatus] = useState<"idle" | "downloading" | "installing">(
    "idle"
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    checkForUpdate();
  }, []);

  async function checkForUpdate() {
    // Sudhu native Android app e chalbe, web browser e na
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

    // Dynamic import - shudhu tap korle load hobe
    const { default: ApkUpdater } = await import("cordova-plugin-apkupdater");

    try {
      const canInstall = await ApkUpdater.canRequestPackageInstalls();
      if (!canInstall) {
        await ApkUpdater.openInstallSetting();
        return;
      }

      setStatus("downloading");
      await ApkUpdater.download(updateInfo.downloadUrl, {
        onDownloadProgress: (info: { percent: number }) => {
          setProgress(info.percent);
        },
      });

      setStatus("installing");
      await ApkUpdater.install();
    } catch (err) {
      console.error("Update failed:", err);
      setStatus("idle");
    }
  }

  if (!updateInfo) return null;

  return (
    <button
      onClick={handleUpdate}
      disabled={status !== "idle"}
      className="w-full bg-blue-600 text-white font-medium py-3 rounded-full shadow-[0_8px_30px_rgba(255,255,255,0.35)]"
    >
      {status === "idle" && `Update Available (v${updateInfo.versionName})`}
      {status === "downloading" && `Downloading... ${progress}%`}
      {status === "installing" && "Installing..."}
    </button>
  );
}