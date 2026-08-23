import { NextResponse } from "next/server";
import { LATEST_APK_VERSION, APK_DOWNLOAD_URL } from "@/lib/app-version";

export async function GET() {
  return NextResponse.json({
    latestVersion: LATEST_APK_VERSION,
    downloadUrl: APK_DOWNLOAD_URL,
  });
}