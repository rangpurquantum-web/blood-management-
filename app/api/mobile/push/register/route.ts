import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { verifyMobileAuth } from "@/lib/mobile-auth";

// POST /api/mobile/push/register
// body: { fcmToken: string, deviceInfo?: string }
export async function POST(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const { fcmToken, deviceInfo } = body as {
    fcmToken?: string;
    deviceInfo?: string;
  };

  if (!fcmToken) {
    return NextResponse.json(
      { success: false, error: "fcmToken is required" },
      { status: 400 },
    );
  }

  const { id: userId, isSuperAdmin, branchId } = authResult.payload;
  const userType = isSuperAdmin ? "SUPER_ADMIN" : "BRANCH_USER";

  try {
    const subscription = await centralPrisma.pushSubscription.upsert({
      where: { fcmToken },
      update: {
        userId,
        userType,
        branchId: isSuperAdmin ? null : branchId,
        deviceInfo: deviceInfo ?? null,
      },
      create: {
        fcmToken,
        userId,
        userType,
        branchId: isSuperAdmin ? null : branchId,
        deviceInfo: deviceInfo ?? null,
      },
    });

    return NextResponse.json({ success: true, subscription }, { status: 201 });
  } catch (error) {
    console.error("Mobile push registration error:", error);
    return NextResponse.json(
      { success: false, error: "Registration failed" },
      { status: 500 },
    );
  }
}