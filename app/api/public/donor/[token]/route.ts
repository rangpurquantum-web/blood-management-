import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { getBranchDb } from "@/lib/branch-db";

export const dynamic = "force-dynamic";

// ─── GET /api/public/donor/[token] ────────────────────────────────────────────
// Public endpoint — no login required. Looked up by the donor's private,
// unguessable token (not their numeric id), so this URL is safe to print
// on a card/QR code without exposing other donors.
//
// Donors live in per-branch databases, and the token URL carries no branch
// information, so we search each branch DB until we find the token.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (!token || token.length < 10) {
    return NextResponse.json(
      { success: false, error: "এই কার্ডটি সঠিক নয় বা ডোনার খুঁজে পাওয়া যায়নি" },
      { status: 404 },
    );
  }

  try {
    const branches = await centralPrisma.branch.findMany({
      select: { id: true },
    });

    for (const branch of branches) {
      try {
        const branchDb = await getBranchDb(branch.id);

        const donor = await branchDb.donor.findFirst({
          where: { publicToken: token, isDeleted: false },
          include: {
            donations: {
              orderBy: { donationDate: "desc" },
              take: 1,
            },
          },
        });

        if (donor) {
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
      } catch (err) {
        // একটি ব্রাঞ্চের DB সমস্যা করলে বাকিগুলো চেক চালিয়ে যাও
        console.error(`Public donor lookup failed for branch ${branch.id}:`, err);
      }
    }
  } catch (error) {
    console.error("Public donor lookup error:", error);
    return NextResponse.json(
      { success: false, error: "সার্ভারে সমস্যা হয়েছে" },
      { status: 500 },
    );
  }

  return NextResponse.json(
    { success: false, error: "এই কার্ডটি সঠিক নয় বা ডোনার খুঁজে পাওয়া যায়নি" },
    { status: 404 },
  );
}
