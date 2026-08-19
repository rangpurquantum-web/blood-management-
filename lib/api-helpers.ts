import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { Role } from "@prisma/client";
import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";
import {
  hasPermission,
  PermissionKey,
} from "@/lib/permissions";
import type { ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type RouteParams = Record<string, string>;

type RouteSession = {
  userId: number;
  role: Role;
  branchId: number | null;
  branchSlug: string | null;
};

type RouteHandler = (
  req: NextRequest,
  session: RouteSession,
  params?: RouteParams,
) => Promise<NextResponse>;

// ─────────────────────────────────────────────────────────────────────────────
// Auth Guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a Route Handler with Auth.js session verification.
 *
 * Supports:
 * - Authentication
 * - Role-based authorization
 * - Permission-based authorization
 * - Branch information
 * - Next.js 15 dynamic route params
 *
 * Examples:
 *
 * export const GET = withAuth(handler);
 *
 * export const DELETE = withAuth(
 *   handler,
 *   { roles: [Role.ADMIN] },
 * );
 *
 * export const PATCH = withAuth(
 *   handler,
 *   { permission: "donorEdit" },
 * );
 */
export function withAuth(
  handler: RouteHandler,
  options: {
    roles?: Role[];
    permission?: PermissionKey;
  } = {},
) {
  return async (
    req: NextRequest,
    context: {
      params: Promise<RouteParams>;
    },
  ): Promise<NextResponse> => {
    try {
      // ───────────────────────────────────────────────────────────────────────
      // Get authenticated session
      // ───────────────────────────────────────────────────────────────────────

      const session = await auth();

      if (!session?.user) {
        return apiError(
          "Unauthorized — please log in",
          401,
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // User ID
      // ───────────────────────────────────────────────────────────────────────

      const userId = session.user.id
        ? Number(session.user.id)
        : 0;

      if (!Number.isInteger(userId) || userId <= 0) {
        return apiError(
          "Invalid user session",
          401,
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // User role
      // ───────────────────────────────────────────────────────────────────────

      const userRole =
        session.user.role as Role | undefined;

      // ───────────────────────────────────────────────────────────────────────
      // Branch information
      // ───────────────────────────────────────────────────────────────────────

      const branchId =
        typeof session.user.branchId === "number"
          ? session.user.branchId
          : null;

      const branchSlug =
        typeof session.user.branchSlug === "string"
          ? session.user.branchSlug
          : null;

      // ───────────────────────────────────────────────────────────────────────
      // Permission check
      // ───────────────────────────────────────────────────────────────────────

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

      // ───────────────────────────────────────────────────────────────────────
      // Role check
      // ───────────────────────────────────────────────────────────────────────

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

      // ───────────────────────────────────────────────────────────────────────
      // Next.js 15 route params
      // ───────────────────────────────────────────────────────────────────────

      const params = context?.params
        ? await context.params
        : undefined;

      // ───────────────────────────────────────────────────────────────────────
      // Execute protected handler
      // ───────────────────────────────────────────────────────────────────────

      return await handler(
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
    } catch (error) {
      console.error(
        "withAuth error:",
        error,
      );

      return apiError(
        "Internal server error",
        500,
      );
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Writer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Inserts an immutable audit log record into MongoDB.
 *
 * User information is denormalized into the audit document
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

// ─────────────────────────────────────────────────────────────────────────────
// API Error
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// API Success
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Donor Eligibility
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Number of days a donor must wait after donation.
 */
const DEFERRAL_DAYS = 120;

/**
 * Calculates donor eligibility from donation date.
 *
 * Rules:
 *
 * Less than 120 days
 *     → Not eligible
 *
 * 120 days or more
 *     → Eligible
 */
export function eligibilityFromDonation(
  donationDate: Date,
): {
  isEligible: boolean;
  deferredUntil: Date | null;
} {
  const deferredUntil = new Date(
    donationDate,
  );

  // Remove time-of-day differences.
  deferredUntil.setHours(
    0,
    0,
    0,
    0,
  );

  // Add 120-day waiting period.
  deferredUntil.setDate(
    deferredUntil.getDate() +
      DEFERRAL_DAYS,
  );

  // Today's date without time.
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const isEligible =
    today >= deferredUntil;

  return {
    isEligible,

    deferredUntil: isEligible
      ? null
      : deferredUntil,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Validation Error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Formats a ZodError into a standard API response.
 */
export function validationError(
  error: ZodError,
): NextResponse {
  const issues = error.issues.map(
    (issue) => ({
      field: issue.path.join("."),
      message: issue.message,
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