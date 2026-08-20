import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthSession = {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    role?: Role | string | null;
  };
};

export type AuthOptions = {
  roles?: Role[];
};

export type ApiHandler = (
  req: NextRequest,
  session: AuthSession,
) => Promise<NextResponse> | NextResponse;

// ─────────────────────────────────────────────────────────────────────────────
// API Error Helper
// ─────────────────────────────────────────────────────────────────────────────

export function apiError(
  message: string,
  status: number = 500,
  details?: unknown,
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details !== undefined ? { details } : {}),
    },
    { status },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API Success Helper
// ─────────────────────────────────────────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  status: number = 200,
): NextResponse {
  return NextResponse.json(
    {
      data,
    },
    { status },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuthSession(): Promise<AuthSession | null> {
  try {
    const session = await auth();

    if (!session) {
      return null;
    }

    return session as AuthSession;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Role Check
// ─────────────────────────────────────────────────────────────────────────────

export function hasRequiredRole(
  session: AuthSession,
  roles?: Role[],
): boolean {
  if (!roles || roles.length === 0) {
    return true;
  }

  const userRole = session.user?.role;

  if (!userRole) {
    return false;
  }

  return roles.some(
    (role) => String(role) === String(userRole),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Wrapper
//
// IMPORTANT:
// This helper is intentionally NOT exported as a Next.js route handler.
// Use it INSIDE the exported GET/POST/etc. function.
//
// Example:
//
// export async function GET(req: NextRequest) {
//   return withAuth(req, async (req, session) => {
//     ...
//   }, { roles: [Role.ADMIN] });
// }
// ─────────────────────────────────────────────────────────────────────────────

export async function withAuth(
  req: NextRequest,
  handler: ApiHandler,
  options?: AuthOptions,
): Promise<NextResponse> {
  try {
    const session = await getAuthSession();

    if (!session?.user) {
      return apiError("Unauthorized", 401);
    }

    if (!hasRequiredRole(session, options?.roles)) {
      return apiError("Forbidden", 403);
    }

    return await handler(req, session);
  } catch (error) {
    console.error("API handler error:", error);

    return apiError(
      "Internal server error",
      500,
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : String(error)
        : undefined,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Optional utility: require authentication
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAuth(): Promise<
  | { session: AuthSession; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getAuthSession();

  if (!session?.user) {
    return {
      session: null,
      error: apiError("Unauthorized", 401),
    };
  }

  return {
    session,
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Optional utility: require specific roles
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRole(
  roles: Role[],
): Promise<
  | { session: AuthSession; error: null }
  | { session: null; error: NextResponse }
> {
  const session = await getAuthSession();

  if (!session?.user) {
    return {
      session: null,
      error: apiError("Unauthorized", 401),
    };
  }

  if (!hasRequiredRole(session, roles)) {
    return {
      session: null,
      error: apiError("Forbidden", 403),
    };
  }

  return {
    session,
    error: null,
  };
}