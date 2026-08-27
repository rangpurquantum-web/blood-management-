import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { verifyMobileAuth, requireBranch } from "@/lib/mobile-auth";

type RouteContext = {
  params: Promise<{ token: string }>;
};

// GET /api/mobile/donors/token/[token]
// QR কোড স্ক্যান করার পর — QR-এ থাকা publicToken দিয়ে ডোনার খুঁজে বের করে।
// শুধু নিজের ব্রাঞ্চের ডাটাবেসেই খোঁজে (স্টাফ যে ব্রাঞ্চের, সেখানেই)।
export async function GET(req: NextRequest, context: RouteContext) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const { token } = await context.params;

  if (!token) {
    return NextResponse.json(
      { success: false, error: "Invalid QR code" },
      { status: 400 },
    );
  }

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const donor = await branchDb.donor.findFirst({
      where: { publicToken: token, isDeleted: false },
      include: {
        phone: true,
        donations: {
          orderBy: { donationDate: "desc" },
          take: 1,
        },
      },
    });

    if (!donor) {
      return NextResponse.json(
        {
          success: false,
          error: "এই QR কোডের ডোনার এই ব্রাঞ্চে পাওয়া যায়নি",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      donor: {
        id: donor.id,
        fullName: donor.fullName,
        bloodType: donor.bloodType,
        isEligible: donor.isEligible,
        deferredUntil: donor.deferredUntil,
        phone: donor.phone.map((p) => ({
          number: p.number,
          label: p.label,
          isPrimary: p.isPrimary,
        })),
        lastDonationDate: donor.donations[0]?.donationDate ?? null,
      },
    });
  } catch (error) {
    console.error("Mobile donor token lookup error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load donor" },
      { status: 500 },
    );
  }
}