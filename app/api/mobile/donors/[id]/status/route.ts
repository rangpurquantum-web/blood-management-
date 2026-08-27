import { NextRequest, NextResponse } from "next/server";
import { getBranchDb } from "@/lib/branch-db";
import { verifyMobileAuth, requireBranch, requireAdmin } from "@/lib/mobile-auth";

type RouteContext = {
  params: Promise<{ id: string }>;
};

// PATCH /api/mobile/donors/[id]/status
// body: { status: "APPROVED" | "REJECTED" }
export async function PATCH(req: NextRequest, context: RouteContext) {
  const authResult = verifyMobileAuth(req);
  if (!authResult.ok) return authResult.response;

  const branchResult = requireBranch(authResult.payload);
  if (!branchResult.ok) return branchResult.response;

  const adminResult = requireAdmin(authResult.payload);
  if (!adminResult.ok) return adminResult.response;

  const { id: idParam } = await context.params;
  const id = Number(idParam);

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid donor ID" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const status = (body as { status?: unknown })?.status;

  if (status !== "APPROVED" && status !== "REJECTED") {
    return NextResponse.json(
      { success: false, error: "status must be APPROVED or REJECTED" },
      { status: 400 },
    );
  }

  try {
    const branchDb = await getBranchDb(branchResult.branchId);

    const donor = await branchDb.donor.findFirst({
      where: { id, isDeleted: false },
    });

    if (!donor) {
      return NextResponse.json(
        { success: false, error: "Donor not found" },
        { status: 404 },
      );
    }

    const updated = await branchDb.donor.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      message:
        status === "APPROVED"
          ? "ডোনার অনুমোদন করা হয়েছে"
          : "ডোনার প্রত্যাখ্যান করা হয়েছে",
      donor: { id: updated.id, status: updated.status },
    });
  } catch (error) {
    console.error("Mobile donor status update error:", error);
    return NextResponse.json(
      { success: false, error: "Status আপডেট করা যায়নি" },
      { status: 500 },
    );
  }
}