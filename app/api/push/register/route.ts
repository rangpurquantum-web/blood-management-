import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";

// ─── POST /api/push/register ─────────────────────────────────────
// Android app থেকে FCM token রেজিস্টার করার endpoint।
// Staff/SuperAdmin login করার পর app থেকে এটা কল হবে।

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fcmToken, userId, userType, branchId, deviceInfo } = body;

    if (!fcmToken || !userId || !userType) {
      return NextResponse.json(
        { error: "fcmToken, userId, and userType are required" },
        { status: 400 }
      );
    }

    if (userType !== "BRANCH_USER" && userType !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "userType must be BRANCH_USER or SUPER_ADMIN" },
        { status: 400 }
      );
    }

    // upsert — token আগে থেকে থাকলে update, না থাকলে create
    const subscription = await centralPrisma.pushSubscription.upsert({
      where: { fcmToken },
      update: {
        userId,
        userType,
        branchId: branchId ?? null,
        deviceInfo: deviceInfo ?? null,
      },
      create: {
        fcmToken,
        userId,
        userType,
        branchId: branchId ?? null,
        deviceInfo: deviceInfo ?? null,
      },
    });

    return NextResponse.json({ success: true, subscription }, { status: 201 });
  } catch (err) {
    console.error("Push registration failed:", err);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}