import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/branch";
import { prisma } from "@/lib/db";
import { withAuth, apiError } from "@/lib/api-helpers";
import { Role } from "@prisma/client";

// ─── GET /api/reports/donors ─────────────────────────────────────────────────
// Supports: bloodGroup, area, eligible, gender,
//           ageMin, ageMax,
//           createdFrom, createdTo,
//           lastDonationFrom, lastDonationTo,
//           page (default 1), pageSize (default 20)

export const GET = withAuth(
  async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);

  const bloodGroup    = searchParams.get("bloodGroup") ?? "";
  const area          = searchParams.get("area") ?? "";
  const eligibleParam = searchParams.get("eligible") ?? "";
  const gender        = searchParams.get("gender") ?? "";
  const ageMin        = searchParams.get("ageMin") ?? "";
  const ageMax        = searchParams.get("ageMax") ?? "";
  const createdFrom   = searchParams.get("createdFrom") ?? "";
  const createdTo     = searchParams.get("createdTo") ?? "";
  const lastDonationFrom = searchParams.get("lastDonationFrom") ?? "";
  const lastDonationTo   = searchParams.get("lastDonationTo") ?? "";
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const pageSize = Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10));

  const where: Prisma.DonorWhereInput = {
    isDeleted: false,
    status: "APPROVED",
  };

  if (bloodGroup) where.bloodType = bloodGroup;
  if (area)       where.address   = { contains: area, mode: "insensitive" };
  if (gender)     where.gender    = { equals: gender, mode: "insensitive" };

  if (eligibleParam !== "") {
    where.isEligible = eligibleParam === "true";
  }

  // Age range – convert to date-of-birth range
  const today = new Date();
  if (ageMin || ageMax) {
    const dobFilter: Prisma.DateTimeFilter = {};
    if (ageMax) {
      const minBirth = new Date(today);
      minBirth.setFullYear(minBirth.getFullYear() - parseInt(ageMax, 10) - 1);
      dobFilter.gte = minBirth;
    }
    if (ageMin) {
      const maxBirth = new Date(today);
      maxBirth.setFullYear(maxBirth.getFullYear() - parseInt(ageMin, 10));
      dobFilter.lte = maxBirth;
    }
    where.dob = dobFilter;
  }

  // Registration date range (createdAt)
  if (createdFrom || createdTo) {
    const createdFilter: Prisma.DateTimeFilter = {};
    if (createdFrom) createdFilter.gte = new Date(createdFrom);
    if (createdTo) {
      const end = new Date(createdTo);
      end.setHours(23, 59, 59, 999);
      createdFilter.lte = end;
    }
    where.createdAt = createdFilter;
  }

  // Last donation date filter – donors whose most recent donation falls in range
  if (lastDonationFrom || lastDonationTo) {
    const donationFilter: Prisma.DateTimeFilter = {};
    if (lastDonationFrom) donationFilter.gte = new Date(lastDonationFrom);
    if (lastDonationTo) {
      const end = new Date(lastDonationTo);
      end.setHours(23, 59, 59, 999);
      donationFilter.lte = end;
    }
    where.donations = {
      some: { donationDate: donationFilter },
    };
  }

  try {
    const [total, donors] = await prisma.$transaction([
      prisma.donor.count({ where }),
      prisma.donor.findMany({
        where,
        orderBy: { fullName: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          gender: true,
          dob: true,
          bloodType: true,
          address: true,
          isEligible: true,
          deferredUntil: true,
          createdAt: true,
          phone: {
            where: { isPrimary: true },
            select: { number: true, label: true },
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
      ...d,
      lastDonationDate: d.donations[0]?.donationDate ?? null,
    }));

    return NextResponse.json({ total, donors: enriched });
  } catch (err) {
    console.error("[/api/reports/donors]", err);
    return apiError("Internal server error", 500);
  }
},
{ roles: [Role.ADMIN] }
);
