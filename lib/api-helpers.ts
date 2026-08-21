import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { centralPrisma } from "@/lib/central-db";
import { Role } from "@/generated/branch";
import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";
import {
  hasPermission,
  PermissionKey,
} from "@/lib/permissions";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch-cookie";
import type { ZodError } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RouteParams = Record<string, string>;

export type RouteSession = {
  userId: number;
  role: Role;
  branchId: number | null;
  branchSlug: string | null;
  isSuperAdmin: boolean;
};

type RouteHandler = (
  req: NextRequest,
  session: RouteSession,
  params?: RouteParams,
) => Promise<NextResponse>;

type RouteContext = {
  params: Promise<RouteParams>;
};

// ─────────────────────────────────────────────────────────────────────────────
// Effective Branch Resolver (SuperAdmin aware)
// ─────────────────────────────────────────────────────────────────────────────

async function resolveEffectiveBranch(
  isSuperAdmin: boolean,
  sessionBranchId: number | null,
  sessionBranchSlug: string | null,
): Promise<
  | { ok: true; branchId: number | null; branchSlug: string | null }
  | { ok: false; error: NextResponse }
> {
  if (!isSuperAdmin) {
    return {
      ok: true,
      branchId: sessionBranchId,
      branchSlug: sessionBranchSlug,
    };
  }

  const cookieStore = await cookies();
  const raw = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value ?? null;
  const effectiveBranchId = raw ? Number(raw) : null;

  if (!effectiveBranchId || !Number.isInteger(effectiveBranchId)) {
    return {
      ok: false,
      error: apiError(
        "No branch selected — please select a branch first",
        400,
      ),
    };
  }

  const branch = await centralPrisma.branch.findUnique({
    where: { id: effectiveBranchId },
    select: { slug: true },
  });

  if (!branch) {
    return {
      ok: false,
      error: apiError("Selected branch no longer exists", 400),
    };
  }

  return {
    ok: true,
    branchId: effectiveBranchId,
    branchSlug: branch.slug,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth Guard
// ─────────────────────────────────────────────────────────────────────────────

export function withAuth(
  handler: RouteHandler,
  options: {
    roles?: Role[];
    permission?: PermissionKey;
  } = {},
) {
  return async (
    req: NextRequest,
    context: RouteContext,
  ): Promise<NextResponse> => {
    try {
      const session = await auth();

      if (!session?.user) {
        return apiError("Unauthorized — please log in", 401);
      }

      const userId = session.user.id ? Number(session.user.id) : 0;

      if (!Number.isInteger(userId) || userId <= 0) {
        return apiError("Invalid user session", 401);
      }

      const userRole = session.user.role as Role | undefined;
      const isSuperAdmin = session.user.isSuperAdmin === true;

      const sessionBranchId =
        typeof session.user.branchId === "number"
          ? session.user.branchId
          : null;

      const sessionBranchSlug =
        typeof session.user.branchSlug === "string"
          ? session.user.branchSlug
          : null;

      const branchResult = await resolveEffectiveBranch(
        isSuperAdmin,
        sessionBranchId,
        sessionBranchSlug,
      );

      if (!branchResult.ok) {
        return branchResult.error;
      }

      const branchId = branchResult.branchId;
      const branchSlug = branchResult.branchSlug;

      if (options.permission && !isSuperAdmin) {
        const dbUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, permissions: true },
        });

        if (!dbUser || !hasPermission(dbUser, options.permission)) {
          return apiError("Forbidden — insufficient permissions", 403);
        }
      }

      if (
        options.roles &&
        !isSuperAdmin &&
        (!userRole || !options.roles.includes(userRole))
      ) {
        return apiError("Forbidden — insufficient permissions", 403);
      }

      let params: RouteParams | undefined;

      if (context?.params) {
        params = await context.params;
      }

      return await handler(
        req,
        {
          userId,
          role: userRole ?? Role.VOLUNTEER,
          branchId,
          branchSlug,
          isSuperAdmin,
        },
        params,
      );
    } catch (error) {
      console.error("withAuth error:", error);
      return apiError("Internal server error", 500);
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Require Role (for routes without dynamic params)
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRole(
  roles: Role[],
): Promise<{
  session: RouteSession | null;
  error: NextResponse | null;
}> {
  const session = await auth();

  if (!session?.user) {
    return {
      session: null,
      error: apiError("Unauthorized — please log in", 401),
    };
  }

  const userId = session.user.id ? Number(session.user.id) : 0;

  if (!Number.isInteger(userId) || userId <= 0) {
    return {
      session: null,
      error: apiError("Invalid user session", 401),
    };
  }

  const userRole = session.user.role as Role | undefined;
  const isSuperAdmin = session.user.isSuperAdmin === true;

  if (!isSuperAdmin && (!userRole || !roles.includes(userRole))) {
    return {
      session: null,
      error: apiError("Forbidden — insufficient permissions", 403),
    };
  }

  const sessionBranchId =
    typeof session.user.branchId === "number"
      ? session.user.branchId
      : null;

  const sessionBranchSlug =
    typeof session.user.branchSlug === "string"
      ? session.user.branchSlug
      : null;

  const branchResult = await resolveEffectiveBranch(
    isSuperAdmin,
    sessionBranchId,
    sessionBranchSlug,
  );

  if (!branchResult.ok) {
    return {
      session: null,
      error: branchResult.error,
    };
  }

  return {
    session: {
      userId,
      role: userRole ?? Role.VOLUNTEER,
      branchId: branchResult.branchId,
      branchSlug: branchResult.branchSlug,
      isSuperAdmin,
    },
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log Writer
// ─────────────────────────────────────────────────────────────────────────────

export async function writeAuditLog(
  userId: number | null,
  action: string,
  details: string,
  branchId: number | null = null,
  branchSlug: string | null = null,
): Promise<void> {
  await connectMongo();

  let userName: string | null = null;
  let userEmail: string | null = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true },
    });

    userName = user?.name ?? null;
    userEmail = user?.email ?? null;
  }

  await AuditLog.create({
    userId: userId ?? null,
    userName,
    userEmail,
    branchId,
    branchSlug,
    action,
    details,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// API Error / Success
// ─────────────────────────────────────────────────────────────────────────────

export function apiError(
  message: string,
  status: number,
  extra?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    { success: false, error: message, ...extra },
    { status },
  );
}

export function apiSuccess(
  data: Record<string, unknown>,
  status = 200,
): NextResponse {
  return NextResponse.json({ success: true, ...data }, { status });
}

// ─────────────────────────────────────────────────────────────────────────────
// Donor Eligibility
// ─────────────────────────────────────────────────────────────────────────────

const DEFERRAL_DAYS = 120;

export function eligibilityFromDonation(
  donationDate: Date,
): {
  isEligible: boolean;
  deferredUntil: Date | null;
} {
  const deferredUntil = new Date(donationDate);
  deferredUntil.setHours(0, 0, 0, 0);
  deferredUntil.setDate(deferredUntil.getDate() + DEFERRAL_DAYS);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isEligible = today >= deferredUntil;

  return {
    isEligible,
    deferredUntil: isEligible ? null : deferredUntil,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Validation Error
// ─────────────────────────────────────────────────────────────────────────────

export function validationError(error: ZodError): NextResponse {
  const issues = error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join(".") : "general",
    message: issue.message,
  }));

  return NextResponse.json(
    { success: false, error: "Validation failed", issues },
    { status: 400 },
  );
}