import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// ─── GET /api/public/donor/[token] ────────────────────────────────────────────
// Public endpoint — no login required. Looked up by the donor's private,
// unguessable token (not their numeric id), so this URL is safe to print
// on a card/QR code without exposing other donors.

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const donor = await prisma.donor.findFirst({
    where: { publicToken: token, isDeleted: false },
    include: {
      donations: {
        orderBy: { donationDate: "desc" },
        take: 1,
      },
    },
  });

  if (!donor) {
    return NextResponse.json(
      { success: false, error: "এই কার্ডটি সঠিক নয় বা ডোনার খুঁজে পাওয়া যায়নি" },
      { status: 404 },
    );
  }

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
