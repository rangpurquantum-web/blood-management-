import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const password = body?.password;
  if (!password) {
    return NextResponse.json({ error: "provide password in body" }, { status: 400 });
  }
  const hash = await bcrypt.hash(password, 10);
  return NextResponse.json({ hash });
}