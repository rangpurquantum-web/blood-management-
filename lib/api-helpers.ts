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

export type AuthSession = {
  userId: number;
  role: Role;
};

export type RouteHandler = (
  req: NextRequest,
  session: AuthSession,
  params?: Record<string, string>,
) => Promise<NextResponse>;

export type AuthOptions = {
  roles?: Role[];
  permission?: PermissionKey;
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth Guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Authentication and authorization helper.
 *
 * IMPORTANT:
 * Do not export the result of withAuth directly from a Next.js route
 * when using Next.js 15 route type validation.
 *
 * Instead:
 *
 * export async function GET(req: NextRequest) {
 *   return withAuth(req, handler, options);
 * }
 */
export async function withAuth(
  req: NextRequest,
  handler: RouteHandler,
  options: AuthOptions = {},
  params?: Record<string, string>,
): Promise<NextResponse> {
  try {
    // ───────────────────────────────────────────────────────────────────────
    // Get Auth.js session
    // ───────────────────────────────────────────────────────────────────────

    const session = await auth();

    if (!session?.user) {
      return apiError(
        "Unauthorized — please log in",
        401,
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Parse user ID
    // ───────────────────────────────────────────────────────────────────────

    const userId = session.user.id
      ? Number(session.user.id)
      : 0;

    if (!Number.isInteger(userId) || userId <= 0) {
      return apiError(
        "Unauthorized — invalid user session",
        401,
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Parse role
    // ───────────────────────────────────────────────────────────────────────

    const userRole = session.user.role as Role | undefined;

    if (!userRole) {
      return apiError(
        "Unauthorized — user role is missing",
        401,
      );
    }

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

      if (!dbUser) {
        return apiError(
          "Unauthorized — user account not found",
          401,
        );
      }

      const allowed = hasPermission(
        dbUser,
        options.permission,
      );

      if (!allowed) {
        return apiError(
          "Forbidden — insufficient permissions",
          403,
        );
      }
    }

    // ───────────────────────────────────────────────────────────────────────
    // Role check
    // ───────────────────────────────────────────────────────────────────────

    if (
      options.roles &&
      options.roles.length > 0 &&
      !options.roles.includes(userRole)
    ) {
      return apiError(
        "Forbidden — insufficient permissions",
        403,
      );
    }

    // ───────────────────────────────────────────────────────────────────────
    // Execute protected route handler
    // ───────────────────────────────────────────────────────────────────────

    return await handler(
      req,
      {
        userId,
        role: userRole,
      },
      params,
    );
  } catch (error) {
    console.error(
      "[withAuth] Unexpected error:",
      error,
    );

    return apiError(
      "Internal server error",
      500,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Writer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Writes an immutable audit log entry to MongoDB.
 *
 * User information is read from PostgreSQL and denormalized
 * into the MongoDB audit document.
 */
export async function writeAuditLog(
  userId: number | null,
  action: string,
  details: string,
): Promise<void> {
  try {
    // Connect to MongoDB
    await connectMongo();

    let userName: string | null = null;
    let userEmail: string | null = null;

    // ───────────────────────────────────────────────────────────────────────
    // Get user information from PostgreSQL
    // ───────────────────────────────────────────────────────────────────────

    if (
      userId !== null &&
      Number.isInteger(userId) &&
      userId > 0
    ) {
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

    // ───────────────────────────────────────────────────────────────────────
    // Write audit record to MongoDB
    // ───────────────────────────────────────────────────────────────────────

    await AuditLog.create({
      userId:
        userId !== null && userId > 0
          ? userId
          : null,

      userName,
      userEmail,

      action,
      details,
    });
  } catch (error) {
    console.error(
      "[writeAuditLog] Failed to write audit log:",
      error,
    );

    // Do not silently swallow audit failures.
    // However, don't crash the main API operation either.
    //
    // If your security policy requires audit logging to be mandatory,
    // replace this return behavior with:
    //
    // throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Error Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standardized API error response.
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
      ...(extra ?? {}),
    },
    {
      status,
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API Success Factory
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standardized API success response.
 */
export function apiSuccess(
  data: Record<string, unknown> = {},
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
 * Number of days a donor must wait after donating blood.
 */
export const DEFERRAL_DAYS = 120;

/**
 * Calculates donor eligibility based on the last donation date.
 *
 * Rules:
 *
 * - Less than 120 days → not eligible
 * - 120 days or more → eligible
 *
 * Example:
 *
 * Donation date: 15 May 2024
 * Eligible date: 12 September 2024
 */
export function eligibilityFromDonation(
  donationDate: Date,
): {
  isEligible: boolean;
  deferredUntil: Date | null;
} {
  // Validate input
  if (
    !(donationDate instanceof Date) ||
    Number.isNaN(donationDate.getTime())
  ) {
    throw new Error(
      "Invalid donation date",
    );
  }

  // Create a copy so the original Date is not modified
  const deferredUntil = new Date(
    donationDate.getTime(),
  );

  // Remove time-of-day
  deferredUntil.setHours(
    0,
    0,
    0,
    0,
  );

  // Add required waiting period
  deferredUntil.setDate(
    deferredUntil.getDate() +
      DEFERRAL_DAYS,
  );

  // Current date
  const today = new Date();

  // Remove time-of-day
  today.setHours(
    0,
    0,
    0,
    0,
  );

  // Eligible on or after deferred date
  const isEligible =
    today.getTime() >=
    deferredUntil.getTime();

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
 * Converts a Zod validation error into the
 * standard API validation response.
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