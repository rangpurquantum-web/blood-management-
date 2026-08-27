import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { verifyMobileAuth, requireBranch, requireAdmin } from "@/lib/mobile-auth";
import type { Prisma } from "@/generated/branch";

// GET /api/mobile/reports/donors?bloodGroup=&area=&eligible=&gender=&page=&pageSize=
export async function GET(req: NextRequest) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  const { searchParams } = new URL(req.url);

  const bloodGroup = searchParams.get("bloodGroup") ?? "";
  const area = searchParams.get("area") ?? "";
  const eligibleParam = searchParams.get("eligible") ?? "";
  const gender = searchParams.get("gender") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10));

  const where: Prisma.DonorWhereInput = {
    isDeleted: false,
    status: "APPROVED",
  };

  if (bloodGroup) where.bloodType = bloodGroup;
  if (area) where.address = { contains: area, mode: "insensitive" };
  if (gender) where.gender = { equals: gender, mode: "insensitive" };
  if (eligibleParam !== "") where.isEligible = eligibleParam === "true";

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const [total, donors] = await branchDb.$transaction([
      branchDb.donor.count({ where }),
      branchDb.donor.findMany({
        where,
        orderBy: { fullName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          gender: true,
          bloodType: true,
          address: true,
          isEligible: true,
          deferredUntil: true,
          phone: {
            where: { isPrimary: true },
            select: { number: true },
          },
          donations: {
            orderBy: { donationDate: "desc" },
            take: 1,
            select: { donationDate: true },
          },
        },
      }),
    ]);

    const enriched = donors.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      gender: d.gender,
      bloodType: d.bloodType,
      address: d.address,
      isEligible: d.isEligible,
      deferredUntil: d.deferredUntil,
      phone: d.phone[0]?.number ?? "",
      lastDonationDate: d.donations[0]?.donationDate ?? null,
    }));

    return NextResponse.json({ success: true, total, donors: enriched });
  } catch (error) {
    console.error("Mobile reports error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load report" },
      { status: 500 },
    );
  }
}