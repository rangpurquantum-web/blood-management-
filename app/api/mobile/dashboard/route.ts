import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { getBranchDb } from "@/lib/branch-db";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET!;

type MobileJwtPayload = {
  id: number;
  email: string;
  role: string;
  branchId: number | null;
  isSuperAdmin?: boolean;
};

export async function GET(req: NextRequest) {
  try {
    // ─────────────────────────────────────────
    // 1. Get Authorization header
    // ─────────────────────────────────────────
    const authHeader = req.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const token = authHeader.substring(7).trim();

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    // ─────────────────────────────────────────
    // 2. Verify JWT
    // ─────────────────────────────────────────
    let payload: MobileJwtPayload;

    try {
      payload = jwt.verify(token, JWT_SECRET) as MobileJwtPayload;
    } catch (error) {
      console.error("Mobile dashboard JWT error:", error);

      return NextResponse.json(
        {
          success: false,
          error: "Invalid or expired token",
        },
        { status: 401 },
      );
    }

    // ─────────────────────────────────────────
    // 3. Validate branch
    // ─────────────────────────────────────────
    if (!payload.branchId) {
      return NextResponse.json(
        {
          success: false,
          error: "Branch access required",
        },
        { status: 403 },
      );
    }

    // ─────────────────────────────────────────
    // 4. Get branch database
    // ─────────────────────────────────────────
    const branchDb = await getBranchDb(payload.branchId);

    // ─────────────────────────────────────────
    // 5. Today's date range
    // ─────────────────────────────────────────
    const now = new Date();

    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    // ─────────────────────────────────────────
    // 6. Get dashboard statistics
    // ─────────────────────────────────────────
    const [totalDonors, todayDonations] = await Promise.all([
      branchDb.donor.count({
        where: {
          isDeleted: false,
        },
      }),

      branchDb.donationHistory.count({
        where: {
          donationDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      }),
    ]);

    // ─────────────────────────────────────────
    // 7. Response
    // ─────────────────────────────────────────
    return NextResponse.json({
      success: true,
      data: {
        totalDonors,
        todayDonations,
      },
      user: {
        id: payload.id,
        email: payload.email,
        role: payload.role,
        branchId: payload.branchId,
        isSuperAdmin: payload.isSuperAdmin ?? false,
      },
    });
  } catch (error) {
    console.error("Mobile dashboard error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to load dashboard",
      },
      { status: 500 },
    );
  }
}
