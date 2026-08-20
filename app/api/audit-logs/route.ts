import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { withAuth, apiError } from "@/lib/api-helpers";
import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";

export async function GET(req: NextRequest): Promise<NextResponse> {
  return withAuth(
    req,
    async (request) => {
      await connectMongo();

      const { searchParams } = new URL(request.url);

      const userIdParam = searchParams.get("userId");

      const rawPage = Number(searchParams.get("page") ?? "1");
      const rawPageSize = Number(searchParams.get("pageSize") ?? "50");

      const page = Number.isFinite(rawPage)
        ? Math.max(1, Math.floor(rawPage))
        : 1;

      const pageSize = Number.isFinite(rawPageSize)
        ? Math.min(100, Math.max(1, Math.floor(rawPageSize)))
        : 50;

      const filter: Record<string, unknown> = {};

      if (userIdParam) {
        const userId = Number(userIdParam);

        if (!Number.isFinite(userId)) {
          return apiError("Invalid userId filter", 400);
        }

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

      const formatted = logs.map((log) => ({
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
    {
      roles: [Role.ADMIN],
    },
  );
}