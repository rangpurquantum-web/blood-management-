import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET!;

export type MobileJwtPayload = {
  id: number;
  email: string;
  role: string;
  branchId: number | null;
  isSuperAdmin?: boolean;
};

export type MobileAuthResult =
  | { ok: true; payload: MobileJwtPayload }
  | { ok: false; response: NextResponse };

// অথরাইজেশন হেডার থেকে JWT বের করে ভেরিফাই করে।
// প্রতিটা mobile/* রুটের একদম শুরুতে এটা কল করবে।
export function verifyMobileAuth(req: NextRequest): MobileAuthResult {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  const token = authHeader.substring(7).trim();

  if (!token) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      ),
    };
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as MobileJwtPayload;
    return { ok: true, payload };
  } catch (error) {
    console.error("Mobile JWT verify error:", error);
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Invalid or expired token" },
        { status: 401 },
      ),
    };
  }
}

// branchId লাগবে এমন রুটের জন্য — SuperAdmin ছাড়া বাকি সবার branchId থাকা আবশ্যক।
export function requireBranch(
  payload: MobileJwtPayload,
): { ok: true; branchId: number } | { ok: false; response: NextResponse } {
  if (!payload.branchId) {
    return {
      ok: false,
      response: NextResponse.json(
        { success: false, error: "Branch access required" },
        { status: 403 },
      ),
    };
  }
  return { ok: true, branchId: payload.branchId };
}

// admin/coordinator-only রুটের জন্য (যেমন user/branch management)।
export function requireAdmin(
  payload: MobileJwtPayload,
): { ok: true } | { ok: false; response: NextResponse } {
  if (payload.isSuperAdmin || payload.role === "ADMIN") {
    return { ok: true };
  }
  return {
    ok: false,
    response: NextResponse.json(
      { success: false, error: "Forbidden — admin access required" },
      { status: 403 },
    ),
  };
}