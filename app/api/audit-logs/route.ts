import { NextRequest, NextResponse } from "next/server";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { withAuth, apiError } from "@/lib/api-helpers";

// ─── GET /api/audit-logs ──────────────────────────────────────────────────────
// Admin only. Query params: userId (optional filter), page, pageSize

export const GET = withAuth(
  async (req: NextRequest) => {
    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "50")));

    const where: Prisma.AuditLogWhereInput = {};

    if (userIdParam) {
      const userId = Number(userIdParam);
      if (isNaN(userId)) return apiError("Invalid userId filter", 400);
      where.userId = userId;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: {
            select: { fullName: true, email: true },
          },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const formatted = logs.map((log) => ({
      id: log.id,
      userId: log.userId,
      userFullName: log.user?.fullName ?? null,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    }));

    return NextResponse.json({
      data: formatted,
      meta: {
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  },
  { roles: [Role.Admin] },
);
