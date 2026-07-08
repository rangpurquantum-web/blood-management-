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
import { donorUpdateSchema } from "@/features/donors";

// ─── GET /api/donors/[id] ─────────────────────────────────────────────────────

export const GET = withAuth(
  async (_req: NextRequest, _session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) return apiError("Invalid donor ID", 400);

    const donor = await prisma.donor.findUnique({
      where: { id },
      include: {
        donations: {
          orderBy: { donationDate: "desc" },
        },
      },
    });

    if (!donor) return apiError("Donor not found", 404);

    return NextResponse.json(donor);
  },
);

// ─── PATCH /api/donors/[id] ───────────────────────────────────────────────────

export const PATCH = withAuth(
  async (req: NextRequest, session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) return apiError("Invalid donor ID", 400);

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return apiError("Invalid JSON body", 400);
    }

    const parsed = donorUpdateSchema.safeParse(body);

    if (!parsed.success) return validationError(parsed.error);

    const existing = await prisma.donor.findUnique({ where: { id } });

    if (!existing) return apiError("Donor not found", 404);

    // Check uniqueness if phone or email are being updated
    const data = parsed.data;

    if (data.email || data.phone) {
      const conflict = await prisma.donor.findFirst({
        where: {
          AND: [
            { id: { not: id } },
            {
              OR: [
                ...(data.email ? [{ email: data.email }] : []),
                ...(data.phone ? [{ phone: data.phone }] : []),
              ],
            },
          ],
        },
      });

      if (conflict) {
        const field = conflict.email === data.email ? "email" : "phone";
        return apiError(`Another donor already has this ${field}`, 409);
      }
    }

    const updated = await prisma.donor.update({
      where: { id },
      data,
    });

    await writeAuditLog(
      session.userId,
      "Donor Updated",
      `Updated donor: ${updated.fullName} — ID ${updated.id}`,
    );

    return apiSuccess({ message: "Donor updated", donor: updated });
  },
);

// ─── DELETE /api/donors/[id] ──────────────────────────────────────────────────

export const DELETE = withAuth(
  async (_req: NextRequest, session, params) => {
    const id = Number(params?.id);

    if (isNaN(id)) return apiError("Invalid donor ID", 400);

    const existing = await prisma.donor.findUnique({ where: { id } });

    if (!existing) return apiError("Donor not found", 404);

    await prisma.donor.delete({ where: { id } });

    await writeAuditLog(
      session.userId,
      "Donor Deleted",
      `Deleted donor: ${existing.fullName} (${existing.bloodType}) — ID ${id}`,
    );

    return apiSuccess({ message: "Donor deleted successfully" });
  },
  { roles: [Role.Admin] },
);
