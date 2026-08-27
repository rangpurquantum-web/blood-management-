import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { verifyMobileAuth, requireBranch } from "@/lib/mobile-auth";
import { donorSchema } from "@/features/donors";
import type { Prisma } from "@/generated/branch";

// GET /api/mobile/donors?q=search-term
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() ?? "";

    const where: Prisma.DonorWhereInput = {
      isDeleted: false,
      status: "APPROVED",
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { phone: { some: { number: { contains: q } } } },
      ];
    }

    const donors = await branchDb.donor.findMany({
      where,
      orderBy: { fullName: "asc" },
      take: 30,
      select: {
        id: true,
        fullName: true,
        bloodType: true,
        phone: {
          where: { isPrimary: true },
          select: { number: true },
        },
      },
    });

    const formatted = donors.map((d) => ({
      id: d.id,
      name: d.fullName,
      phone: d.phone[0]?.number ?? "",
      bloodGroup: d.bloodType,
    }));

    return NextResponse.json({ success: true, donors: formatted });
  } catch (error) {
    console.error("Mobile donors search error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to search donors" },
      { status: 500 },
    );
  }
}

// POST /api/mobile/donors
// স্টাফ কর্তৃক সরাসরি নতুন ডোনার রেজিস্ট্রেশন (already APPROVED হিসেবে তৈরি হয়,
// public /api/register-এর মতো PENDING না — কারণ স্টাফ নিজে সরাসরি এন্ট্রি করছে)
export async function POST(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = donorSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : "general",
      message: issue.message,
    }));
    return NextResponse.json(
      { success: false, error: "Validation failed", issues },
      { status: 400 },
    );
  }

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const data = parsed.data;
    const phoneNumbers = data.phone.map((p) => p.number);

    // ডুপ্লিকেট ইমেইল/ফোন চেক (এই ব্রাঞ্চের মধ্যে)
    const existing = await branchDb.donor.findFirst({
      where: {
        AND: [
          { isDeleted: false },
          {
            OR: [
              { email: data.email },
              { phone: { some: { number: { in: phoneNumbers } } } },
            ],
          },
        ],
      },
    });

    if (existing) {
      const message =
        existing.email === data.email
          ? `এই ইমেইল দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`
          : `এই নম্বর দিয়ে ইতিমধ্যে একজন ডোনার রেজিস্টার্ড আছেন (${existing.fullName})`;
      return NextResponse.json(
        { success: false, error: message },
        { status: 409 },
      );
    }

    const {
      phone: phoneData,
      lastDonationDate,
      ...donorData
    } = data as typeof data & { lastDonationDate?: Date | null };

    // এলিজিবিলিটি হিসাব (আগের donation date থাকলে)
    let isEligible = true;
    let deferredUntil: Date | null = null;
    let deferralReason: string | null = null;

    if (lastDonationDate) {
      const computedDeferredUntil = new Date(lastDonationDate);
      computedDeferredUntil.setDate(computedDeferredUntil.getDate() + 120);

      if (computedDeferredUntil > new Date()) {
        isEligible = false;
        deferredUntil = computedDeferredUntil;
        deferralReason = "Recent blood donation";
      }
    }

    const donor = await branchDb.donor.create({
      data: {
        ...donorData,
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
        ...(lastDonationDate
          ? {
              donations: {
                create: {
                  patientName: "Previous / Prior Donation",
                  hospitalName: "Not specified",
                  donationDate: lastDonationDate,
                  notes: "Recorded from mobile app registration",
                },
              },
            }
          : {}),
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "ডোনার সফলভাবে রেজিস্টার হয়েছে",
        donorId: donor.id,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Mobile donor registration error:", error);
    return NextResponse.json(
      { success: false, error: "ডোনার রেজিস্ট্রেশন ব্যর্থ হয়েছে" },
      { status: 500 },
    );
  }
}