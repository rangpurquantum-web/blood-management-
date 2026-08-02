import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { withAuth, apiError } from "@/lib/api-helpers";
import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";

// ─── GET /api/audit-logs ──────────────────────────────────────────────────────
// Admin only. Query params: userId (optional filter), page, pageSize

export const GET = withAuth(
  async (req: NextRequest) => {
    await connectMongo();

    const { searchParams } = new URL(req.url);
    const userIdParam = searchParams.get("userId");
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "50")));

    const filter: Record<string, unknown> = {};

    if (userIdParam) {
      const userId = Number(userIdParam);
      if (isNaN(userId)) return apiError("Invalid userId filter", 400);
      filter.userId = userId;
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    const formatted = logs.map((log: any) => ({
      id: String(log._id),
      userId: log.userId,
      userFullName: log.userName ?? null,
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
  { roles: [Role.ADMIN] },
);
