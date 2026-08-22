import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { registerSchema } from "@/features/donors/schemas";
import { apiError, apiSuccess, validationError, writeAuditLog } from "@/lib/api-helpers";

// ─── POST /api/register ───────────────────────────────────────────────────────
// Public endpoint for donor self-registration applications.
// Body must include branchId to specify which branch's database to write to.

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON body", 400);
  }

  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    return validationError(parsed.error);
  }

  const { branchId, phone: phoneData, lastDonationDate, ...donorData } = parsed.data;

  const parsedBranchId = Number(branchId);
  if (!Number.isInteger(parsedBranchId) || parsedBranchId <= 0) {
    return apiError("Please select a valid branch", 400);
  }

  let branchDb;
  try {
    branchDb = await getBranchDb(parsedBranchId);
  } catch (error) {
    console.error(`Failed to connect to branch database: ${parsedBranchId}`, error);
    return apiError("Could not connect to branch database", 503);
  }

  // Uniqueness checks against active donors (isDeleted: false) IN THIS BRANCH
  const phoneNumbers = phoneData.map((p) => p.number);
  const existing = await branchDb.donor.findFirst({
    where: {
      AND: [
        { isDeleted: false },
        {
          OR: [
            { email: donorData.email },
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
    if (existing.email === donorData.email) {
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

  // ─────────────────────────────────────────
  // Calculate eligibility from lastDonationDate
  // Same 120-day rule used by the donate route.
  // If no last donation date was given, the donor
  // has no donation history yet and is eligible.
  // ─────────────────────────────────────────

  let isEligible = true;
  let deferredUntil: Date | null = null;
  let deferralReason: string | null = null;

  if (lastDonationDate) {
    const parsedLastDonation = new Date(lastDonationDate);

    const computedDeferredUntil = new Date(parsedLastDonation);
    computedDeferredUntil.setDate(
      computedDeferredUntil.getDate() + 120,
    );

    const now = new Date();

    if (computedDeferredUntil > now) {
      // Still within the 120-day rest period
      isEligible = false;
      deferredUntil = computedDeferredUntil;
      deferralReason = "Recent blood donation";
    }
    // If computedDeferredUntil <= now, the donor has
    // already completed the waiting period, so they
    // stay eligible (isEligible remains true).
  }

  const donor = await branchDb.donor.create({
    data: {
      ...donorData,
      status: "PENDING",
      isEligible,
      deferredUntil,
      deferralReason,
      phone: {
        create: phoneData.map((p) => ({
          number: p.number,
          label: p.label,
          isPrimary: p.isPrimary,
        })),
      },
      donations: lastDonationDate
        ? {
            create: [
              {
                donationDate: lastDonationDate,
                patientName: "Direct / Self Donation",
                hospitalName: "N/A",
                notes: "Recorded during self-registration",
              },
            ],
          }
        : undefined,
    },
    include: {
      phone: true,
      donations: true,
    },
  });

  await writeAuditLog(
    null,
    "Public Donor Registration Application",
    `New pending donor registered online: ${donor.fullName} (${donor.bloodType}) — ID ${donor.id} — Branch ${parsedBranchId}`,
    parsedBranchId,
  );

  return apiSuccess(
    {
      message: "আপনার আবেদন জমা হয়েছে, রিভিউ করার পর অনুমোদন করা হবে",
      donor,
    },
    201,
  );
}
