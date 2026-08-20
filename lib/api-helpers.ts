import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";

import { requireRole, apiError } from "@/lib/api-helpers";
import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";

// GET /api/audit-logs
// Admin only
export async function GET(req: NextRequest) {
  try {
    // ─────────────────────────────────────────────
    // Authentication + Admin role
    // ─────────────────────────────────────────────

    const { session, error } = await requireRole([Role.ADMIN]);

    if (error) {
      return error;
    }

    // Prevent unused-variable issue if session isn't needed
    void session;

    // ─────────────────────────────────────────────
    // MongoDB
    // ─────────────────────────────────────────────

    await connectMongo();

    const { searchParams } = new URL(req.url);

    // ─────────────────────────────────────────────
    // Query parameters
    // ─────────────────────────────────────────────

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

    // ─────────────────────────────────────────────
    // MongoDB filter
    // ─────────────────────────────────────────────

    const filter: Record<string, unknown> = {};

    if (userIdParam) {
      const userId = Number(userIdParam);

      if (!Number.isFinite(userId)) {
        return apiError("Invalid userId filter", 400);
      }

      filter.userId = userId;
    }

    // ─────────────────────────────────────────────
    // Fetch logs + total
    // ─────────────────────────────────────────────

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),

      AuditLog.countDocuments(filter),
    ]);

    // ─────────────────────────────────────────────
    // Format response
    // ─────────────────────────────────────────────

    const formatted = logs.map((log) => ({
      id: String(log._id),
      userId: log.userId,
      userFullName: log.userName ?? null,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    }));

    // ─────────────────────────────────────────────
    // Response
    // ─────────────────────────────────────────────

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
    console.error("GET /api/audit-logs error:", error);

    return apiError(
      "Internal server error",
      500,
      process.env.NODE_ENV === "development"
        ? error instanceof Error
          ? error.message
          : String(error)
        : undefined
    );
  }
}