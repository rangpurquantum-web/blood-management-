import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { getBranchPrismaClient } from "@/lib/db/branch-manager";

export const dynamic = "force-dynamic";

// ─── GET /api/public/check-donation?phone=01XXXXXXXXX ────────────────────────
// Public endpoint — no login required. Searches across ALL active branches
// and returns only the donor's name and their most recent donation
// date/eligibility. Does NOT expose email, address, or any other private
// profile fields.

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();

  if (!phone || !/^01\d{9}$/.test(phone)) {
    return NextResponse.json(
      { success: false, error: "একটি সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)" },
      { status: 400 },
    );
  }

  // সব active branch-এর তালিকা central DB থেকে আনো
  const branches = await centralPrisma.branch.findMany({
    where: { isActive: true },
  });

  // প্রতিটা branch DB-তে গিয়ে এই নম্বর দিয়ে donor খুঁজো (parallel-এ)
  const searches = await Promise.all(
    branches.map(async (branch) => {
      try {
        const branchClient = getBranchPrismaClient(branch.databaseUrlSecret);

        const donorPhone = await branchClient.donorPhone.findFirst({
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
          return null;
        }

        return {
          donor: donorPhone.donor,
          branchName: branch.name,
        };
      } catch (err) {
        // একটা branch DB-তে সমস্যা হলে বাকিগুলো যেন থেমে না যায়
        console.error(`Branch "${branch.name}" search failed:`, err);
        return null;
      }
    }),
  );

  const found = searches.filter(
    (r): r is NonNullable<typeof r> => r !== null,
  );

  if (found.length === 0) {
    return NextResponse.json(
      { success: false, error: "এই নম্বর দিয়ে কোনো ডোনার খুঁজে পাওয়া যায়নি" },
      { status: 404 },
    );
  }

  // একাধিক branch-এ পাওয়া গেলে, যার donation date সবচেয়ে recent সেটা দেখাও
  found.sort((a, b) => {
    const aDate = a.donor.donations[0]?.donationDate;
    const bDate = b.donor.donations[0]?.donationDate;
    const aTime = aDate ? new Date(aDate).getTime() : 0;
    const bTime = bDate ? new Date(bDate).getTime() : 0;
    return bTime - aTime;
  });

  const best = found[0]!;
  const lastDonation = best.donor.donations[0] ?? null;

  return NextResponse.json({
    success: true,
    fullName: best.donor.fullName,
    bloodType: best.donor.bloodType,
    isEligible: best.donor.isEligible,
    deferredUntil: best.donor.deferredUntil,
    lastDonationDate: lastDonation ? lastDonation.donationDate : null,
    branchName: best.branchName,
  });
}