import { NextResponse } from "next/server";
import { APP_VERSION, APP_DOWNLOAD_URL } from "@/lib/app-version";

export async function GET() {

  return NextResponse.json(
    {
      version: APP_VERSION,
      downloadUrl: APP_DOWNLOAD_URL,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
