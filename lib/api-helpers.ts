import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type RouteHandler = (
  req: NextRequest,
  session: { userId: number; role: Role },
  params?: Record<string, string>,
) => Promise<NextResponse>;

// ─── Auth Guard ───────────────────────────────────────────────────────────────

/**
 * Wraps a Route Handler with Auth.js session verification.
 * Optionally restricts to specific roles.
 *
 * Usage:
 *   export const GET = withAuth(handler);
 *   export const DELETE = withAuth(handler, { roles: ["Admin"] });
 */
import { hasPermission, PermissionKey } from "@/lib/permissions";

export function withAuth(
  handler: RouteHandler,
  options: { roles?: Role[]; permission?: PermissionKey } = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): any {
  return async (
    req: NextRequest,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    context: any,
  ): Promise<NextResponse> => {
    const session = await auth();

    if (!session?.user) {
      return apiError("Unauthorized — please log in", 401);
    }

    const userId = session.user.id ? Number(session.user.id) : 0;
    const userRole = session.user.role as Role | undefined;

    // Check custom permissions first if options.permission is specified
    if (options.permission) {
      const dbUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, permissions: true },
      });
      if (!dbUser || !hasPermission(dbUser, options.permission)) {
        return apiError("Forbidden — insufficient permissions", 403);
      }
    } else if (options.roles && (!userRole || !options.roles.includes(userRole))) {
      return apiError("Forbidden — insufficient permissions", 403);
    }

    const params = context?.params ? await context.params : undefined;

    return handler(req, { userId, role: userRole ?? Role.VOLUNTEER }, params);
  };
}

// ─── Audit Log Writer ─────────────────────────────────────────────────────────

/**
 * Inserts an immutable audit log record.
 */
export async function writeAuditLog(
  userId: number | null,
  action: string,
  details: string,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: userId || null,
      action,
      details,
    },
  });
}

// ─── Error Factory ─────────────────────────────────────────────────────────────

/**
 * Returns a standardised JSON error response.
 */
export function apiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json({ success: false, error: message, ...extra }, { status });
}

// ─── Success Factory ───────────────────────────────────────────────────────────

/**
 * Returns a standardised JSON success response.
 */
export function apiSuccess(data: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}

// ─── Eligibility Calculator ────────────────────────────────────────────────────

const DEFERRAL_DAYS = 56;

/**
 * Calculates the post-donation deferral window (56 days from the donation date).
 */
export function eligibilityFromDonation(donationDate: Date): {
  isEligible: false;
  deferredUntil: Date;
} {
  const deferredUntil = new Date(donationDate);
  deferredUntil.setDate(deferredUntil.getDate() + DEFERRAL_DAYS);

  return { isEligible: false, deferredUntil };
}

// ─── Zod Validation Error Formatter ───────────────────────────────────────────

import type { ZodError } from "zod";

/**
 * Formats a ZodError into the standard API validation error response.
 */
export function validationError(error: ZodError): NextResponse {
  const issues = error.errors.map((e) => ({
    field: e.path.join("."),
    message: e.message,
  }));

  return NextResponse.json(
    { success: false, error: "Validation failed", issues },
    { status: 400 },
  );
}
