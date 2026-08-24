import { NextResponse } from "next/server";

// Notun version release korle sudhu ei duita line change korbe:
const LATEST_VERSION_CODE = 1; // android/app/build.gradle er versionCode er sathe match
const LATEST_VERSION_NAME = "1.0.0";

const APK_DOWNLOAD_URL =
  "https://blood-management-livid.vercel.app/downloads/app-release.apk";

export async function GET() {
  return NextResponse.json({
    versionCode: LATEST_VERSION_CODE,
    versionName: LATEST_VERSION_NAME,
    downloadUrl: APK_DOWNLOAD_URL,
  });
}