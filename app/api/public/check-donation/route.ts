import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { getBranchDb } from "@/lib/branch-db";

export const dynamic = "force-dynamic";

// ─── GET /api/public/check-donation?phone=01XXXXXXXXX ────────────────────────
// Public endpoint — no login required.
//
// Searches across ALL active branches and returns only the donor's name,
// blood type, eligibility, deferred-until date, most recent donation date,
// and branch name.
//
// Does NOT expose email, address, or any other private profile fields.

export async function GET(req: NextRequest) {
  const phone = req.nextUrl.searchParams.get("phone")?.trim();

  // Validate Bangladeshi 11-digit mobile number
  if (!phone || !/^01\d{9}$/.test(phone)) {
    return NextResponse.json(
      {
        success: false,
        error: "একটি সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)",
      },
      { status: 400 },
    );
  }

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Get all active branches from CENTRAL database
    // ─────────────────────────────────────────────────────────────────────────

    const branches = await centralPrisma.branch.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
      },
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Search every active branch database in parallel
    //
    // IMPORTANT:
    // Use getBranchDb(branch.id), NOT databaseUrlSecret directly.
    //
    // getBranchDb() handles:
    //   1. Loading branch from central DB
    //   2. Checking active status
    //   3. Decrypting databaseUrlSecret
    //   4. Creating/caching the Prisma client
    // ─────────────────────────────────────────────────────────────────────────

    const searches = await Promise.all(
      branches.map(async (branch) => {
        try {
          const branchDb = await getBranchDb(branch.id);

          const donorPhone = await branchDb.donorPhone.findFirst({
            where: {
              number: phone,
            },
            include: {
              donor: {
                include: {
                  donations: {
                    orderBy: {
                      donationDate: "desc",
                    },
                    take: 1,
                  },
                },
              },
            },
          });

          // Donor not found / donor deleted
          if (
            !donorPhone ||
            !donorPhone.donor ||
            donorPhone.donor.isDeleted
          ) {
            return null;
          }

          return {
            donor: donorPhone.donor,
            branchName: branch.name,
          };
        } catch (error) {
          // One branch failing must NOT stop searches in other branches.
          console.error(
            `Public donation check failed for branch "${branch.name}" (ID: ${branch.id}):`,
            error,
          );

          return null;
        }
      }),
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Remove branches where donor wasn't found / connection failed
    // ─────────────────────────────────────────────────────────────────────────

    const found = searches.filter(
      (result): result is NonNullable<typeof result> => result !== null,
    );

    // No donor found in any active branch
    if (found.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "এই নম্বর দিয়ে কোনো ডোনার খুঁজে পাওয়া যায়নি",
        },
        { status: 404 },
      );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // If donor exists in multiple branches:
    // choose the one with the most recent donation date.
    //
    // A donor with no donation date gets time = 0.
    // ─────────────────────────────────────────────────────────────────────────

    found.sort((a, b) => {
      const aDate = a.donor.donations[0]?.donationDate;
      const bDate = b.donor.donations[0]?.donationDate;

      const aTime = aDate ? new Date(aDate).getTime() : 0;
      const bTime = bDate ? new Date(bDate).getTime() : 0;

      return bTime - aTime;
    });

    const best = found[0]!;

    const lastDonation = best.donor.donations[0] ?? null;

    // ─────────────────────────────────────────────────────────────────────────
    // Public response
    //
    // Only return fields needed by the public "Check Your Last Donation Date"
    // page. Do NOT expose private donor information.
    // ─────────────────────────────────────────────────────────────────────────

    return NextResponse.json({
      success: true,
      fullName: best.donor.fullName,
      bloodType: best.donor.bloodType,
      isEligible: best.donor.isEligible,
      deferredUntil: best.donor.deferredUntil,
      lastDonationDate: lastDonation
        ? lastDonation.donationDate
        : null,
      branchName: best.branchName,
    });
  } catch (error) {
    // Central DB failure or unexpected server error
    console.error("Public donation check failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "ডোনারের তথ্য খুঁজতে সমস্যা হয়েছে। আবার চেষ্টা করুন।",
      },
      { status: 500 },
    );
  }
}