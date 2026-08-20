import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  const password = req.nextUrl.searchParams.get("password");
  if (!password) {
    return NextResponse.json({ error: "provide ?password=" }, { status: 400 });
  }
  const hash = await bcrypt.hash(password, 10);
  return NextResponse.json({ hash });
}