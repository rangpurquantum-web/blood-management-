import { NextRequest, NextResponse } from "next/server";
import { withAuth, apiError, apiSuccess } from "@/lib/api-helpers";
import { centralPrisma } from "@/lib/central-db";

// ---- POST /api/push/register --------------------------
// Logged-in staff/SuperAdmin-এর FCM token রেজিস্টার বা আপডেট।
// userId/role/branchId/isSuperAdmin session থেকে (withAuth এর
// মাধ্যমে) নেওয়া হয়, client থেকে না — নিরাপত্তার জন্য।

export const POST = withAuth(async (req: NextRequest, session) => {
  try {
    const body = await req.json();
    const { fcmToken, deviceInfo } = body;

    if (!fcmToken) {
      return apiError("fcmToken is required", 400);
    }

    const userType = session.isSuperAdmin ? "SUPER_ADMIN" : "BRANCH_USER";
    const branchId = session.isSuperAdmin ? null : session.branchId;

    const subscription = await centralPrisma.pushSubscription.upsert({
      where: { fcmToken },
      update: {
        userId: session.userId,
        userType,
        branchId,
        deviceInfo: deviceInfo ?? null,
      },
      create: {
        fcmToken,
        userId: session.userId,
        userType,
        branchId,
        deviceInfo: deviceInfo ?? null,
      },
    });

    return apiSuccess({ subscription }, 201);
  } catch (err) {
    console.error("Push registration failed:", err);
    return apiError("Registration failed", 500);
  }
});
