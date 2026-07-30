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
import { donorSchema } from "@/features/donors";

// ─── GET /api/donors ──────────────────────────────────────────────────────────
// Query params: q (name/phone search), bloodGroup, eligible (true/false)

export const GET = withAuth(async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const bloodGroup = searchParams.get("bloodGroup") ?? "";
  const eligibleParam = searchParams.get("eligible");

  const where: Prisma.DonorWhereInput = {};

  if (q) {
    where.OR = [
      { fullName: { contains: q } },
      { phone: { contains: q } },
    ];
  }

  if (bloodGroup) {
    where.bloodType = bloodGroup;
  }

  if (eligibleParam !== null) {
    where.isEligible = eligibleParam === "true";
  }

  const donors = await prisma.donor.findMany({
    where,
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      dob: true,
      gender: true,
      bloodType: true,
      phone: true,
      email: true,
      address: true,
      isEligible: true,
      deferralReason: true,
      deferredUntil: true,
    },
  });

  return NextResponse.json(donors);
});

// ─── POST /api/donors ─────────────────────────────────────────────────────────

export const POST = withAuth(async (req: NextRequest, session) => {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = donorSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const data = parsed.data;

  // Uniqueness checks
  const existing = await prisma.donor.findFirst({
    where: {
      OR: [{ email: data.email }, { phone: data.phone }],
    },
  });

  if (existing) {
    const field = existing.email === data.email ? "email" : "phone";
    return apiError(
      `A donor with this ${field} already exists`,
      409,
    );
  }

  const donor = await prisma.donor.create({
    data: {
      ...data,
      isEligible: true,
    },
  });

  await writeAuditLog(
    session.userId,
    "Donor Created",
    `Registered donor: ${donor.fullName} (${donor.bloodType}) — ID ${donor.id}`,
  );

  return apiSuccess({ message: "Donor registered successfully", donorId: donor.id }, 201);
});
