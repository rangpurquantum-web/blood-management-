import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.MOBILE_JWT_SECRET!;

export type MobileTokenPayload = {
  id: number;
  email: string;
  role: string;
  branchId: number | null;
  isSuperAdmin: boolean;
};

export function verifyMobileToken(req: NextRequest): MobileTokenPayload | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.slice(7);

  try {
    return jwt.verify(token, JWT_SECRET) as MobileTokenPayload;
  } catch {
    return null;
  }
}