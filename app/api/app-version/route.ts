import { NextResponse } from "next/server";

// Update korte holay eikhane sudhu ei duita value change korbe:
const LATEST_VERSION_CODE = 1; // Android build.gradle er versionCode er sathe match korte hobe
const LATEST_VERSION_NAME = "1.0.0"; // display er jonno, optional
const APK_DOWNLOAD_URL =
  "https://blood-management-livid.vercel.app/downloads/app-release.apk";

export async function GET() {
  return NextResponse.json({
    versionCode: LATEST_VERSION_CODE,
    versionName: LATEST_VERSION_NAME,
    downloadUrl: APK_DOWNLOAD_URL,
  });
}