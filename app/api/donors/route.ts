import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { Prisma, DonorStatus } from "@/generated/branch";
import { getBranchDb } from "@/lib/branch-db";
import {
  withAuth,
  writeAuditLog,
  apiError,
  apiSuccess,
  validationError,
} from "@/lib/api-helpers";
import { donorSchema } from "@/features/donors";

// ─── GET /api/donors ──────────────────────────────────────────────────────────
// Query params: q (name/phone search), bloodGroup, eligible (true/false), area

export const GET = withAuth(
  async (req: NextRequest, session) => {
    if (!session.branchId) {
      return apiError("No branch selected — please select a branch first", 400);
    }

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const bloodGroup = searchParams.get("bloodGroup") ?? "";
    const statusParam = searchParams.get("status");
    const eligibleParam = searchParams.get("eligible");
    const area = searchParams.get("area") ?? "";

    const branchDb = await getBranchDb(session.branchId);

    const where: Prisma.DonorWhereInput = {
      isDeleted: false,
    };

    if (statusParam && statusParam !== "all") {
      where.status = statusParam as DonorStatus;
    } else if (!statusParam) {
      where.status = "APPROVED";
    }

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        {
          phone: {
            some: {
              number: { contains: q },
            },
          },
        },
      ];
    }

    if (bloodGroup) {
      where.bloodType = bloodGroup;
    }

    if (eligibleParam !== null) {
      where.isEligible = eligibleParam === "true";
    }

    if (area) {
      where.address = { contains: area, mode: "insensitive" };
    }

    const donors = await branchDb.donor.findMany({
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
  },
  { permission: "donorView" },
);

// ─── POST /api/donors ─────────────────────────────────────────────────────────

export const POST = withAuth(
  async (req: NextRequest, session) => {
    if (!session.branchId) {
      return apiError("No branch selected — please select a branch first", 400);
    }

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
    const email = data.email?.trim() || "";

    // Uniqueness checks (ইমেইল ফাঁকা থাকলে ইমেইল দিয়ে চেক হবে না)
    const phoneNumbers = data.phone.map((p) => p.number);
    const branchDb = await getBranchDb(session.branchId);

    const existing = await branchDb.donor.findFirst({
      where: {
        isDeleted: false,
        OR: [
          ...(email ? [{ email }] : []),
          {
            phone: {
              some: {
                number: { in: phoneNumbers },
              },
            },
          },
        ],
      },
    });

    if (existing) {
      if (email && existing.email === email) {
        return apiError(
          `এই ইমেইল দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`,
          409,
        );
      } else {
        return apiError(
          `এই নম্বর দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`,
          409,
        );
      }
    }

    const { phone: phoneData, ...donorData } = data;

    const donor = await branchDb.donor.create({
      data: {
        ...donorData,
        email,
        publicToken: randomUUID(),
        isEligible: true,
        phone: {
          create: phoneData.map((p) => ({
            number: p.number,
            label: p.label,
            isPrimary: p.isPrimary,
          })),
        },
      },
    });

    await writeAuditLog(
      session.userId,
      "Donor Created",
      `Registered donor: ${donor.fullName} (${donor.bloodType}) — ID ${donor.id}`,
      session.branchId,
      session.branchSlug,
    );

    return apiSuccess({ message: "Donor registered successfully", donorId: donor.id }, 201);
  },
  { permission: "donorAdd" },
);
