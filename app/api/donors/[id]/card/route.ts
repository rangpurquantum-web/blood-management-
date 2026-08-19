import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { eligibilityFromDonation, writeAuditLog } from "@/lib/api-helpers";

export const dynamic = "force-dynamic";

// ─── POST /api/public/donor/[token]/donate ────────────────────────────────────
// Public, self-service endpoint. No login required — a donor scans their own
// card and taps "I Donated Today" to log a new donation and start their
// 4-month deferral window. No verification step, by design.

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  const donor = await prisma.donor.findFirst({
    where: { publicToken: token, isDeleted: false },
  });

  if (!donor) {
    return NextResponse.json(
      { success: false, error: "এই কার্ডটি সঠিক নয় বা ডোনার খুঁজে পাওয়া যায়নি" },
      { status: 404 },
    );
  }

  if (!donor.isEligible) {
    return NextResponse.json(
      {
        success: false,
        error: donor.deferredUntil
          ? `আপনি ${new Date(donor.deferredUntil).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })} পর্যন্ত রক্তদানের জন্য উপযুক্ত নন`
          : "আপনি বর্তমানে রক্তদানের জন্য উপযুক্ত নন",
      },
      { status: 409 },
    );
  }

  const donationDate = new Date();
  const { isEligible, deferredUntil } = eligibilityFromDonation(donationDate);

  const updated = await prisma.$transaction(async (tx) => {
    await tx.donationHistory.create({
      data: {
        donorId: donor.id,
        patientName: "N/A (self-reported)",
        hospitalName: "N/A (self-reported)",
        donationDate,
        notes: "Self-reported via donor card",
      },
    });

    return tx.donor.update({
      where: { id: donor.id },
      data: { isEligible, deferredUntil },
    });
  });

  await writeAuditLog(
    null,
    "Donor Self-Reported Donation",
    `Donor ${updated.fullName} (ID ${updated.id}) self-reported a donation via their card`,
  );

  return NextResponse.json({
    success: true,
    lastDonationDate: donationDate,
    isEligible: updated.isEligible,
    deferredUntil: updated.deferredUntil,
  });
}
