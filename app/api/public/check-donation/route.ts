import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── GET /api/public/check-donation?phone=01XXXXXXXXX ────────────────────────
// Public endpoint — no login required. Returns only the donor's name and
// their most recent donation date/eligibility. Does NOT expose email,
// address, or any other private profile fields.

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();

  if (!phone || !/^01\d{9}$/.test(phone)) {
    return NextResponse.json(
      { success: false, error: "একটি সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)" },
      { status: 400 },
    );
  }

  const donorPhone = await prisma.donorPhone.findFirst({
    where: { number: phone },
    include: {
      donor: {
        include: {
          donations: {
            orderBy: { donationDate: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!donorPhone || !donorPhone.donor || donorPhone.donor.isDeleted) {
    return NextResponse.json(
      { success: false, error: "এই নম্বর দিয়ে কোনো ডোনার খুঁজে পাওয়া যায়নি" },
      { status: 404 },
    );
  }

  const donor = donorPhone.donor;
  const lastDonation = donor.donations[0] ?? null;

  return NextResponse.json({
    success: true,
    fullName: donor.fullName,
    bloodType: donor.bloodType,
    isEligible: donor.isEligible,
    deferredUntil: donor.deferredUntil,
    lastDonationDate: lastDonation ? lastDonation.donationDate : null,
  });
}
