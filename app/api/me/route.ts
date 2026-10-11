import { NextResponse } from "next/server";

import { auth } from "@/lib/auth-adapter";

export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const { id, name, email, role, branchId, branchSlug, permissions, isSuperAdmin } =
    session.user;

  return NextResponse.json({
    user: { id, name, email, role, branchId, branchSlug, permissions, isSuperAdmin },
  });
}
