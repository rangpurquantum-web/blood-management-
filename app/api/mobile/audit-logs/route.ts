import { NextRequest, NextResponse } from "next/server";
import { verifyMobileAuth, requireAdmin } from "@/lib/mobile-auth";
import { connectMongo } from "@/lib/mongodb";
import { AuditLog } from "@/lib/models/AuditLog";

// GET /api/mobile/audit-logs?page=&pageSize=
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") ?? "50", 10)),
  );

  try {
    await connectMongo();

    // SuperAdmin সব ব্রাঞ্চের লগ দেখতে পারবে, বাকিরা শুধু নিজের ব্রাঞ্চের
    const filter: Record<string, unknown> = authResult.payload.isSuperAdmin
      ? {}
      : { branchId: authResult.payload.branchId };

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
      userFullName: log.userName ?? null,
      action: log.action,
      details: log.details,
      timestamp: log.timestamp,
    }));

    return NextResponse.json({
      success: true,
      data: formatted,
      meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (error) {
    console.error("Mobile audit logs error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load audit logs" },
      { status: 500 },
    );
  }
}