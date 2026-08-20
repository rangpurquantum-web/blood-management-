import { NextRequest, NextResponse } from "next/server";
import { encryptDatabaseUrl } from "@/lib/crypto";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const url = body?.url;
  if (!url) {
    return NextResponse.json({ error: "provide url in body" }, { status: 400 });
  }
  const encrypted = encryptDatabaseUrl(url);
  return NextResponse.json({ encrypted });
}