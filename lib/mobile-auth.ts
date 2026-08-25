import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { centralPrisma } from "@/lib/central-db";

const MOBILE_JWT_SECRET = process.env.MOBILE_JWT_SECRET!;
const TOKEN_EXPIRY = "30d";

export type MobileTokenPayload = {
  userId: number;
  email: string;
  name: string;
  role: string;
  branchId: number | null;
  branchSlug: string | null;
  isSuperAdmin: boolean;
};

export function generateMobileToken(payload: MobileTokenPayload): string {
  return jwt.sign(payload, MOBILE_JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

function verifyMobileTokenString(token: string): MobileTokenPayload | null {
  try {
    return jwt.verify(token, MOBILE_JWT_SECRET) as MobileTokenPayload;
  } catch {
    return null;
  }
}

export function getMobileSession(req: NextRequest): MobileTokenPayload | null {
  const authHeader = req.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.slice(7);
  return verifyMobileTokenString(token);
}

type MobileRouteHandler = (
  req: NextRequest,
  session: MobileTokenPayload,
) => Promise<NextResponse>;

export function withMobileAuth(handler: MobileRouteHandler) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const session = getMobileSession(req);

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized — invalid or missing token" },
        { status: 401 },
      );
    }

    // Re-verify the account is still active (in case it was
    // deactivated after this token was issued)
    if (session.isSuperAdmin) {
      const admin = await centralPrisma.superAdmin.findUnique({
        where: { id: session.userId },
        select: { isActive: true },
      });

      if (!admin || !admin.isActive) {
        return NextResponse.json(
          { success: false, error: "ACCOUNT_INACTIVE" },
          { status: 401 },
        );
      }
    } else {
      const branchUser = await centralPrisma.branchUser.findUnique({
        where: { id: session.userId },
        select: {
          isActive: true,
          branch: { select: { isActive: true } },
        },
      });

      if (!branchUser || !branchUser.isActive || !branchUser.branch.isActive) {
        return NextResponse.json(
          { success: false, error: "ACCOUNT_INACTIVE" },
          { status: 401 },
        );
      }
    }

    return handler(req, session);
  };
}