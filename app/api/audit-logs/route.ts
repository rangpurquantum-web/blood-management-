import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";

export async function GET(req: NextRequest) {
  try {
    // Authentication
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Admin only
    if (String(session.user.role) !== String(Role.ADMIN)) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await connectMongo();

    const { searchParams } = new URL(req.url);

    const userIdParam = searchParams.get("userId");

    const rawPage = Number(
      searchParams.get("page") ?? "1"
    );

    const rawPageSize = Number(
      searchParams.get("pageSize") ?? "50"
    );

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
        return NextResponse.json(
          { error: "Invalid userId filter" },
          { status: 400 }
        );
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
  } catch (error) {
    console.error("Audit logs API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}