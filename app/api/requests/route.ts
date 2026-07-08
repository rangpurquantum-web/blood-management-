import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api-helpers";
import { bloodRequestSchema } from "@/features/requests";

// ─── GET /api/requests ────────────────────────────────────────────────────────
// Query params: status, bloodGroup

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "";
  const bloodGroup = searchParams.get("bloodGroup") ?? "";

  const where: Prisma.BloodRequestWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (bloodGroup) {
    where.bloodGroup = bloodGroup;
  }

  const requests = await prisma.bloodRequest.findMany({
    where,
    orderBy: { requiredDate: "asc" },
  });

  return NextResponse.json(requests);
});

// ─── POST /api/requests ───────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, session) => {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = bloodRequestSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error);

  const request = await prisma.bloodRequest.create({
    data: parsed.data,
  });

  await writeAuditLog(
    session.userId,
    "Blood Request Created",
    `Created request for patient ${request.patientName} — ${request.bloodGroup}, ${request.requiredUnits} unit(s) by ${request.requiredDate.toISOString()}`,
  );

  return apiSuccess(
    { message: "Blood request logged", requestId: request.id },
    201,
  );
});
