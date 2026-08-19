import {
  NextRequest,
  NextResponse,
} from "next/server";

import { Role } from "@prisma/client";

import {
  withAuth,
  apiError,
} from "@/lib/api-helpers";

import {
  connectMongo,
} from "@/lib/mongodb";

import {
  AuditLog,
} from "@/lib/models/AuditLog";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/audit-logs
// ─────────────────────────────────────────────────────────────────────────────
// Admin only.
//
// Query parameters:
// ?userId=123
// ?page=1
// ?pageSize=50
//
// Example:
// /api/audit-logs?page=1&pageSize=50
// /api/audit-logs?userId=123&page=1&pageSize=50
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
): Promise<NextResponse> {
  return withAuth(
    req,

    async (request) => {
      try {
        // ───────────────────────────────────────────────────────────────────
        // Connect MongoDB
        // ───────────────────────────────────────────────────────────────────

        await connectMongo();

        // ───────────────────────────────────────────────────────────────────
        // Query parameters
        // ───────────────────────────────────────────────────────────────────

        const { searchParams } =
          new URL(request.url);

        const userIdParam =
          searchParams.get("userId");

        const pageParam =
          searchParams.get("page") ?? "1";

        const pageSizeParam =
          searchParams.get("pageSize") ?? "50";

        // ───────────────────────────────────────────────────────────────────
        // Parse page
        // ───────────────────────────────────────────────────────────────────

        const parsedPage =
          Number(pageParam);

        const page =
          Number.isFinite(parsedPage)
            ? Math.max(
                1,
                Math.floor(parsedPage),
              )
            : 1;

        // ───────────────────────────────────────────────────────────────────
        // Parse page size
        // ───────────────────────────────────────────────────────────────────

        const parsedPageSize =
          Number(pageSizeParam);

        const pageSize =
          Number.isFinite(parsedPageSize)
            ? Math.min(
                100,
                Math.max(
                  1,
                  Math.floor(
                    parsedPageSize,
                  ),
                ),
              )
            : 50;

        // ───────────────────────────────────────────────────────────────────
        // Build MongoDB filter
        // ───────────────────────────────────────────────────────────────────

        const filter: {
          userId?: number;
        } = {};

        if (userIdParam) {
          const userId =
            Number(userIdParam);

          if (
            !Number.isInteger(userId) ||
            userId <= 0
          ) {
            return apiError(
              "Invalid userId filter",
              400,
            );
          }

          filter.userId = userId;
        }

        // ───────────────────────────────────────────────────────────────────
        // Pagination
        // ───────────────────────────────────────────────────────────────────

        const skip =
          (page - 1) * pageSize;

        // ───────────────────────────────────────────────────────────────────
        // Fetch logs + total
        // ───────────────────────────────────────────────────────────────────

        const [logs, total] =
          await Promise.all([
            AuditLog.find(filter)
              .sort({
                timestamp: -1,
              })
              .skip(skip)
              .limit(pageSize)
              .lean(),

            AuditLog.countDocuments(
              filter,
            ),
          ]);

        // ───────────────────────────────────────────────────────────────────
        // Format response
        // ───────────────────────────────────────────────────────────────────

        const formatted = logs.map(
          (log) => ({
            id: String(log._id),

            userId:
              log.userId ?? null,

            userFullName:
              log.userName ?? null,

            userEmail:
              log.userEmail ?? null,

            action:
              log.action,

            details:
              log.details,

            timestamp:
              log.timestamp,
          }),
        );

        // ───────────────────────────────────────────────────────────────────
        // Return response
        // ───────────────────────────────────────────────────────────────────

        return NextResponse.json(
          {
            success: true,

            data: formatted,

            meta: {
              total,
              page,
              pageSize,

              totalPages:
                Math.ceil(
                  total / pageSize,
                ),
            },
          },
          {
            status: 200,
          },
        );
      } catch (error) {
        console.error(
          "[GET /api/audit-logs] Error:",
          error,
        );

        return apiError(
          "Failed to load audit logs",
          500,
        );
      }
    },

    {
      roles: [Role.ADMIN],
    },
  );
}