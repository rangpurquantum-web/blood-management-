import { NextRequest, NextResponse } from "next/server";
import { centralPrisma } from "@/lib/central-db";
import { getBranchDb } from "@/lib/branch-db";
import { sendFCMNotification } from "@/lib/send-notification";

export async function GET(req: NextRequest) {
  // Vercel Cron থেকে আসা call ভেরিফাই করা
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const since = new Date();
    since.setHours(since.getHours() - 24);

    const branches = await centralPrisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const branchSummaries: { branchId: number; name: string; count: number }[] = [];

    // প্রতিটা branch-এ গত ২৪ ঘণ্টার নতুন donor গোনা
    for (const branch of branches) {
      try {
        const branchDb = await getBranchDb(branch.id);
        const count = await branchDb.donor.count({
          where: {
            createdAt: { gte: since },
            status: "PENDING",
          },
        });
        branchSummaries.push({ branchId: branch.id, name: branch.name, count });
      } catch (err) {
        console.error(`Digest: failed to read branch ${branch.id}`, err);
      }
    }

    // ১. প্রতিটা branch-এর staff-দের branch-specific digest পাঠানো
    for (const summary of branchSummaries) {
      if (summary.count === 0) continue; // শূন্য হলে notification পাঠানোর দরকার নেই

      const subs = await centralPrisma.pushSubscription.findMany({
        where: { userType: "BRANCH_USER", branchId: summary.branchId },
        select: { fcmToken: true },
      });
      const tokens = subs.map((s) => s.fcmToken).filter(Boolean);

      if (tokens.length > 0) {
        await sendFCMNotification(
          tokens,
          "আজকের Digest",
          `${summary.name}-এ গত ২৪ ঘণ্টায় ${summary.count}টি নতুন pending application`,
          { type: "midnight_digest", branchId: String(summary.branchId) },
        );
      }
    }

    // ২. SuperAdmin-দের কাছে সব branch মিলিয়ে সামারি
    const totalCount = branchSummaries.reduce((sum, b) => sum + b.count, 0);
    const superAdminSubs = await centralPrisma.pushSubscription.findMany({
      where: { userType: "SUPER_ADMIN" },
      select: { fcmToken: true },
    });
    const superAdminTokens = superAdminSubs.map((s) => s.fcmToken).filter(Boolean);

    if (superAdminTokens.length > 0) {
      const breakdown = branchSummaries
        .filter((b) => b.count > 0)
        .map((b) => `${b.name}: ${b.count}`)
        .join(", ");

      await sendFCMNotification(
        superAdminTokens,
        "আজকের সব Branch Digest",
        totalCount > 0
          ? `মোট ${totalCount}টি নতুন pending application (${breakdown})`
          : "গত ২৪ ঘণ্টায় কোনো নতুন application নেই",
        { type: "midnight_digest_global" },
      );
    }

    return NextResponse.json({ success: true, branchSummaries, totalCount });
  } catch (err) {
    console.error("Digest cron failed:", err);
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}