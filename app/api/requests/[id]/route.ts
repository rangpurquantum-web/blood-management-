import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api-helpers";
import { bloodRequestUpdateSchema } from "@/features/requests";

// ─── GET /api/requests/[id] ───────────────────────────────────────────────────

export const GET = withAuth(
  async (_req: NextRequest, _session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) return apiError("Invalid request ID", 400);

    const request = await prisma.bloodRequest.findUnique({ where: { id } });

    if (!request) return apiError("Blood request not found", 404);

    return NextResponse.json(request);
  },
);

// ─── PATCH /api/requests/[id] ─────────────────────────────────────────────────

export const PATCH = withAuth(
  async (req: NextRequest, session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) return apiError("Invalid request ID", 400);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = bloodRequestUpdateSchema.safeParse(body);

    if (!parsed.success) return validationError(parsed.error);

    const existing = await prisma.bloodRequest.findUnique({ where: { id } });

    if (!existing) return apiError("Blood request not found", 404);

    const updated = await prisma.bloodRequest.update({
      where: { id },
      data: parsed.data,
    });

    const statusChanged = parsed.data.status && parsed.data.status !== existing.status;

    await writeAuditLog(
      session.userId,
      statusChanged ? "Blood Request Status Updated" : "Blood Request Updated",
      statusChanged
        ? `Request ID ${id} (${existing.patientName}) status changed: ${existing.status} → ${updated.status}`
        : `Updated request ID ${id} for patient ${existing.patientName}`,
    );

    return apiSuccess({
      message: "Request status updated",
      requestId: updated.id,
      newStatus: updated.status,
    });
  },
);

// ─── DELETE /api/requests/[id] ────────────────────────────────────────────────

export const DELETE = withAuth(
  async (_req: NextRequest, session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) return apiError("Invalid request ID", 400);

    const existing = await prisma.bloodRequest.findUnique({ where: { id } });

    if (!existing) return apiError("Blood request not found", 404);

    await prisma.bloodRequest.delete({ where: { id } });

    await writeAuditLog(
      session.userId,
      "Blood Request Deleted",
      `Deleted request ID ${id} for patient ${existing.patientName} (${existing.bloodGroup})`,
    );

    return apiSuccess({ message: "Blood request deleted" });
  },
  { roles: [Role.Admin] },
);
