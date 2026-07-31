import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { donorSchema } from "@/features/donors";
import { apiError, apiSuccess, validationError, writeAuditLog } from "@/lib/api-helpers";

// ─── POST /api/register ───────────────────────────────────────────────────────
// Public endpoint for donor self-registration applications.

export async function POST(req: NextRequest) {
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

  // Uniqueness checks against active donors (isDeleted: false)
  const phoneNumbers = data.phone.map((p) => p.number);
  const existing = await prisma.donor.findFirst({
    where: {
      AND: [
        { isDeleted: false },
        {
          OR: [
            { email: data.email },
            {
              phone: {
                some: {
                  number: { in: phoneNumbers },
                },
              },
            },
          ],
        },
      ],
    },
  });

  if (existing) {
    if (existing.email === data.email) {
      return apiError(
        `এই ইমেইল দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`,
        409,
      );
    } else {
      return apiError(
        `এই নম্বর দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`,
        409,
      );
    }
  }

  const { phone: phoneData, ...donorData } = data;

  const donor = await prisma.donor.create({
    data: {
      ...donorData,
      status: "PENDING",
      phone: {
        create: phoneData.map((p) => ({
          number: p.number,
          label: p.label,
          isPrimary: p.isPrimary,
        })),
      },
    },
    include: {
      phone: true,
    },
  });

  await writeAuditLog(
    null,
    "Public Donor Registration Application",
    `New pending donor registered online: ${donor.fullName} (${donor.bloodType}) — ID ${donor.id}`,
  );

  return apiSuccess(
    {
      message: "আপনার আবেদন জমা হয়েছে, রিভিউ করার পর অনুমোদন করা হবে",
      donor,
    },
    201,
  );
}
