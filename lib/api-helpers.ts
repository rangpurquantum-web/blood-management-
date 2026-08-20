import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type AuthenticatedUser = {
  id: number;
  email?: string | null;
  name?: string | null;
  role: Role;
};

export type ApiErrorResponse = {
  error: string;
  message?: string;
};

export type ApiSuccessResponse<T = unknown> = {
  data: T;
};

export type AuthOptions = {
  roles?: Role[];
};

// ─────────────────────────────────────────────────────────────────────────────
// API Error Helper
// ─────────────────────────────────────────────────────────────────────────────

export function apiError(
  message: string,
  status: number = 500,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      message,
    },
    {
      status,
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// API Success Helper
// ─────────────────────────────────────────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  status: number = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      data,
    },
    {
      status,
    },
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Get Authenticated User
// ─────────────────────────────────────────────────────────────────────────────

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  try {
    const session = await auth();

    if (!session?.user) {
      return null;
    }

    const sessionUser = session.user as {
      id?: string | number;
      email?: string | null;
      name?: string | null;
      role?: Role | string | null;
    };

    if (sessionUser.id === undefined || sessionUser.id === null) {
      return null;
    }

    const id = Number(sessionUser.id);

    if (!Number.isInteger(id) || id <= 0) {
      return null;
    }

    if (!sessionUser.role) {
      return null;
    }

    const role = sessionUser.role as Role;

    return {
      id,
      email: sessionUser.email ?? null,
      name: sessionUser.name ?? null,
      role,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Require Authentication
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAuth(
  options: AuthOptions = {},
): Promise<
  | {
      user: AuthenticatedUser;
      error: null;
    }
  | {
      user: null;
      error: NextResponse<ApiErrorResponse>;
    }
> {
  const user = await getAuthenticatedUser();

  if (!user) {
    return {
      user: null,
      error: apiError("Unauthorized", 401),
    };
  }

  // If roles are specified, check role access.
  if (options.roles && options.roles.length > 0) {
    const allowed = options.roles.includes(user.role);

    if (!allowed) {
      return {
        user: null,
        error: apiError("Forbidden", 403),
      };
    }
  }

  return {
    user,
    error: null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// withAuth
//
// IMPORTANT:
// Do NOT use this as:
//
// export const GET = withAuth(...)
//
// withAuth is kept for compatibility with existing server-side code,
// but Route Handlers should perform authentication inside GET/POST/etc.
// ─────────────────────────────────────────────────────────────────────────────

export type AuthenticatedHandler = (
  req: NextRequest,
  user: AuthenticatedUser,
) => Promise<NextResponse>;

export async function withAuth(
  req: NextRequest,
  handler: AuthenticatedHandler,
  options: AuthOptions = {},
): Promise<NextResponse> {
  const result = await requireAuth(options);

  if (result.error) {
    return result.error;
  }

  return handler(req, result.user);
}

// ─────────────────────────────────────────────────────────────────────────────
// Require Role
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRole(
  roles: Role[],
): Promise<
  | {
      user: AuthenticatedUser;
      error: null;
    }
  | {
      user: null;
      error: NextResponse<ApiErrorResponse>;
    }
> {
  return requireAuth({
    roles,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Admin Check
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAdmin(): Promise<
  | {
      user: AuthenticatedUser;
      error: null;
    }
  | {
      user: null;
      error: NextResponse<ApiErrorResponse>;
    }
> {
  return requireAuth({
    roles: [Role.ADMIN],
  });
}