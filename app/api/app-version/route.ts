import { NextResponse } from "next/server";

// Notun version release korle sudhu ei duita line change korbe:
const LATEST_VERSION_CODE = 2;
const LATEST_VERSION_NAME = "1.1";

const APK_DOWNLOAD_URL =
  "https://github.com/rangpurquantum-web/blood-management-/releases/download/v1.1/app-release.apk";

export async function GET() {
  return NextResponse.json({
    versionCode: LATEST_VERSION_CODE,
    versionName: LATEST_VERSION_NAME,
    downloadUrl: APK_DOWNLOAD_URL,
  });
}