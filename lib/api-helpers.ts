import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";
import { hasPermission, PermissionKey } from "@/lib/permissions";
import type { ZodError } from "zod";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RouteSession = {
  userId: number;
  role: Role;
  branchId: number | null;
  branchSlug: string | null;
};

type RouteHandler = (
  req: NextRequest,
  session: RouteSession,
  params?: Record<string, string>,
) => Promise<NextResponse>;

// ─── Auth Guard ───────────────────────────────────────────────────────────────

/**
 * Wraps a Route Handler with Auth.js session verification.
 *
 * Optionally restricts to specific roles or permissions.
 *
 * Usage:
 *
 *   export const GET = withAuth(handler);
 *
 *   export const DELETE = withAuth(handler, {
 *     roles: [Role.ADMIN],
 *   });
 *
 *   export const PATCH = withAuth(handler, {
 *     permission: "donorEdit",
 *   });
 */
export function withAuth(
  handler: RouteHandler,
  options: {
    roles?: Role[];
    permission?: PermissionKey;
  } = {},
): (
  req: NextRequest,
  context?: {
    params?: Promise<Record<string, string>>;
  },
) => Promise<NextResponse> {
  return async (
    req: NextRequest,
    context?: {
      params?: Promise<Record<string, string>>;
    },
  ): Promise<NextResponse> => {
    const session = await auth();

    // ─────────────────────────────────────────────────────────────────────────
    // Authentication
    // ─────────────────────────────────────────────────────────────────────────

    if (!session?.user) {
      return apiError(
        "Unauthorized — please log in",
        401,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // User ID
    // ─────────────────────────────────────────────────────────────────────────

    const userId = session.user.id
      ? Number(session.user.id)
      : 0;

    if (!Number.isInteger(userId) || userId <= 0) {
      return apiError(
        "Invalid user session",
        401,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Role
    // ─────────────────────────────────────────────────────────────────────────

    const userRole =
      session.user.role as Role | undefined;

    // ─────────────────────────────────────────────────────────────────────────
    // Branch information
    // ─────────────────────────────────────────────────────────────────────────

    const branchId =
      typeof session.user.branchId === "number"
        ? session.user.branchId
        : null;

    const branchSlug =
      typeof session.user.branchSlug === "string"
        ? session.user.branchSlug
        : null;

    // ─────────────────────────────────────────────────────────────────────────
    // Permission check
    // ─────────────────────────────────────────────────────────────────────────

    if (options.permission) {
      const dbUser = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          role: true,
          permissions: true,
        },
      });

      if (
        !dbUser ||
        !hasPermission(
          dbUser,
          options.permission,
        )
      ) {
        return apiError(
          "Forbidden — insufficient permissions",
          403,
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Role check
    // ─────────────────────────────────────────────────────────────────────────

    else if (
      options.roles &&
      (
        !userRole ||
        !options.roles.includes(userRole)
      )
    ) {
      return apiError(
        "Forbidden — insufficient permissions",
        403,
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Dynamic route params
    // ─────────────────────────────────────────────────────────────────────────

    const params = context?.params
      ? await context.params
      : undefined;

    // ─────────────────────────────────────────────────────────────────────────
    // Handler
    // ─────────────────────────────────────────────────────────────────────────

    return handler(
      req,
      {
        userId,
        role:
          userRole ?? Role.VOLUNTEER,
        branchId,
        branchSlug,
      },
      params,
    );
  };
}

// ─── Audit Log Writer ─────────────────────────────────────────────────────────

/**
 * Inserts an immutable audit log record into MongoDB.
 *
 * Since AuditLog lives in a separate database from User (PostgreSQL),
 * the user's name/email are denormalized into the log document
 * at write time.
 */
export async function writeAuditLog(
  userId: number | null,
  action: string,
  details: string,
): Promise<void> {
  await connectMongo();

  let userName: string | null = null;
  let userEmail: string | null = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        name: true,
        email: true,
      },
    });

    userName = user?.name ?? null;
    userEmail = user?.email ?? null;
  }

  await AuditLog.create({
    userId: userId || null,
    userName,
    userEmail,
    action,
    details,
  });
}

// ─── Error Factory ────────────────────────────────────────────────────────────

/**
 * Returns a standardized JSON error response.
 */
export function apiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: message,
      ...extra,
    },
    {
      status,
    },
  );
}

// ─── Success Factory ──────────────────────────────────────────────────────────

/**
 * Returns a standardized JSON success response.
 */
export function apiSuccess(
  data: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    {
      status,
    },
  );
}

// ─── Eligibility Calculator ──────────────────────────────────────────────────

/**
 * Number of days a donor must wait after donation.
 */
const DEFERRAL_DAYS = 120;

/**
 * Calculates donor eligibility from the donation date.
 *
 * Rules:
 *
 * - Less than 120 days since donation → Deferred
 * - 120 days or more since donation → Eligible
 *
 * Example:
 *
 * Donation: 15 May 2024
 * Eligible from: 12 September 2024
 *
 * An old donation will therefore correctly make
 * the donor eligible.
 */
export function eligibilityFromDonation(
  donationDate: Date,
): {
  isEligible: boolean;
  deferredUntil: Date | null;
} {
  // Copy the date so the original Date object
  // is never modified.
  const deferredUntil = new Date(
    donationDate,
  );

  // Compare dates without time-of-day differences.
  deferredUntil.setHours(
    0,
    0,
    0,
    0,
  );

  // Add required waiting period.
  deferredUntil.setDate(
    deferredUntil.getDate() +
      DEFERRAL_DAYS,
  );

  // Today's date.
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  // If today is on or after the eligible date,
  // donor is eligible.
  const isEligible =
    today >= deferredUntil;

  return {
    isEligible,

    // No deferred date is necessary
    // after the donor becomes eligible.
    deferredUntil: isEligible
      ? null
      : deferredUntil,
  };
}

// ─── Zod Validation Error Formatter ──────────────────────────────────────────

/**
 * Formats a ZodError into the standard API
 * validation error response.
 */
export function validationError(
  error: ZodError,
): NextResponse {
  const issues = error.errors.map(
    (e) => ({
      field: e.path.join("."),
      message: e.message,
    }),
  );

  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      issues,
    },
    {
      status: 400,
    },
  );
}