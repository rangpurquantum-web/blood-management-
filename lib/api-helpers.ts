import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
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
  branchId: number | null;
  branchSlug: string | null;
};

export type RouteContext = {
  params: Promise<Record<string, string>>;
};

type RouteHandler = (
  req: NextRequest,
  session: AuthSession,
  params?: Record<string, string>,
) => Promise<NextResponse>;

type WithAuthOptions = {
  roles?: Role[];
  permission?: PermissionKey;
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth Guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Wraps a Route Handler with Auth.js session verification.
 *
 * Examples:
 *
 * export const GET = withAuth(async (req, session) => {
 *   return NextResponse.json({
 *     userId: session.userId,
 *   });
 * });
 *
 * export const DELETE = withAuth(
 *   async (req, session) => {
 *     ...
 *   },
 *   {
 *     roles: [Role.ADMIN],
 *   },
 * );
 *
 * export const POST = withAuth(
 *   async (req, session) => {
 *     ...
 *   },
 *   {
 *     permission: "donorAdd",
 *   },
 * );
 */
export function withAuth(
  handler: RouteHandler,
  options: WithAuthOptions = {},
): (
  req: NextRequest,
  context: RouteContext,
) => Promise<NextResponse> {
  return async (
    req: NextRequest,
    context: RouteContext,
  ): Promise<NextResponse> => {
    try {
      const session = await auth();

      // ───────────────────────────────────────────────────────────────────────
      // Authentication
      // ───────────────────────────────────────────────────────────────────────

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
          "Invalid authenticated user",
          401,
        );
      }

      // ───────────────────────────────────────────────────────────────────────
      // Role
      // ───────────────────────────────────────────────────────────────────────

      const sessionRole = session.user.role;

      const userRole: Role =
        sessionRole === Role.ADMIN
          ? Role.ADMIN
          : Role.VOLUNTEER;

      // ───────────────────────────────────────────────────────────────────────
      // Branch
      // ───────────────────────────────────────────────────────────────────────

      const branchId =
        typeof session.user.branchId === "number"
          ? session.user.branchId
          : null;

      const branchSlug =
        typeof session.user.branchSlug === "string"
          ? session.user.branchSlug
          : null;

      const authSession: AuthSession = {
        userId,
        role: userRole,
        branchId,
        branchSlug,
      };

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
      // Dynamic route params
      // ───────────────────────────────────────────────────────────────────────

      let params: Record<string, string> | undefined;

      if (context?.params) {
        params = await context.params;
      }

      // ───────────────────────────────────────────────────────────────────────
      // Execute actual route handler
      // ───────────────────────────────────────────────────────────────────────

      return await handler(
        req,
        authSession,
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
 * User information is copied into the audit log
 * at write time so the audit history remains readable
 * even if the user is later changed or deleted.
 */
export async function writeAuditLog(
  userId: number | null,
  action: string,
  details: string,
): Promise<void> {
  try {
    await connectMongo();

    let userName: string | null = null;
    let userEmail: string | null = null;

    // ─────────────────────────────────────────────────────────────────────────
    // Get user information from PostgreSQL
    // ─────────────────────────────────────────────────────────────────────────

    if (userId !== null) {
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

    // ─────────────────────────────────────────────────────────────────────────
    // Write audit log to MongoDB
    // ─────────────────────────────────────────────────────────────────────────

    await AuditLog.create({
      userId,
      userName,
      userEmail,
      action,
      details,
    });
  } catch (error) {
    // Audit logging should never crash the main operation.
    console.error(
      "Failed to write audit log:",
      error,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Error
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Standard API error response.
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
 * Standard API success response.
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
 * Number of days a donor must wait after donating blood.
 */
const DEFERRAL_DAYS = 120;

/**
 * Calculates donor eligibility from the latest donation date.
 *
 * Rules:
 *
 * Donation + 120 days <= today
 *     => Eligible
 *
 * Donation + 120 days > today
 *     => Not eligible
 */
export function eligibilityFromDonation(
  donationDate: Date,
): {
  isEligible: boolean;
  deferredUntil: Date | null;
} {
  // Create a new Date so the original object is never modified.
  const deferredUntil = new Date(
    donationDate.getTime(),
  );

  // Ignore time-of-day.
  deferredUntil.setHours(
    0,
    0,
    0,
    0,
  );

  // Add 120 days.
  deferredUntil.setDate(
    deferredUntil.getDate() +
      DEFERRAL_DAYS,
  );

  // Today without time-of-day.
  const today = new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

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
 * Converts a ZodError into a standard API response.
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