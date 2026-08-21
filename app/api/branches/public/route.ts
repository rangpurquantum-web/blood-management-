import { NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";

export const dynamic = "force-dynamic";

export async function GET() {
  const branches = await centralPrisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true, slug: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ branches });
}