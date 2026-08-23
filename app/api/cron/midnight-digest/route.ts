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
    const now = new Date();
    const since = new Date();
    since.setHours(since.getHours() - 24);

    // আজকের দিনের শুরু ও শেষ (deferredUntil range check-এর জন্য)
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    const todayMonth = now.getMonth() + 1; // JS months are 0-indexed
    const todayDay = now.getDate();

    const branches = await centralPrisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    const branchSummaries: {
      branchId: number;
      name: string;
      count: number;
      birthdayCount: number;
      eligibleTodayCount: number;
    }[] = [];

    // প্রতিটা branch-এ গত ২৪ ঘণ্টার নতুন donor, আজকের জন্মদিন, এবং
    // আজ থেকে eligible হওয়া donor গোনা
    for (const branch of branches) {
      try {
        const branchDb = await getBranchDb(branch.id);

        const count = await branchDb.donor.count({
          where: {
            createdAt: { gte: since },
            status: "PENDING",
          },
        });

        // আজকের জন্মদিন — dob-এর মাস ও দিন আজকের সাথে মিললে (বছর বাদে)
        const birthdayResult = await branchDb.$queryRaw<{ count: bigint }[]>`
          SELECT COUNT(*)::bigint as count
          FROM "Donor"
          WHERE "isDeleted" = false
            AND dob IS NOT NULL
            AND EXTRACT(MONTH FROM dob) = ${todayMonth}
            AND EXTRACT(DAY FROM dob) = ${todayDay}
        `;
        const birthdayCount = Number(birthdayResult[0]?.count ?? 0);

        // আজ eligible হলেন — deferredUntil আজকের মধ্যে পড়লে
        const eligibleTodayCount = await branchDb.donor.count({
          where: {
            isDeleted: false,
            deferredUntil: { gte: todayStart, lt: todayEnd },
          },
        });

        branchSummaries.push({
          branchId: branch.id,
          name: branch.name,
          count,
          birthdayCount,
          eligibleTodayCount,
        });
      } catch (err) {
        console.error(`Digest: failed to read branch ${branch.id}`, err);
      }
    }

    // ১. প্রতিটা branch-এর staff-দের branch-specific digest পাঠানো
    for (const summary of branchSummaries) {
      const hasContent =
        summary.count > 0 || summary.birthdayCount > 0 || summary.eligibleTodayCount > 0;
      if (!hasContent) continue;

      const subs = await centralPrisma.pushSubscription.findMany({
        where: { userType: "BRANCH_USER", branchId: summary.branchId },
        select: { fcmToken: true },
      });
      const tokens = subs.map((s) => s.fcmToken).filter(Boolean);

      if (tokens.length > 0) {
        const parts: string[] = [];
        if (summary.count > 0) parts.push(`${summary.count}টি নতুন pending application`);
        if (summary.eligibleTodayCount > 0)
          parts.push(`${summary.eligibleTodayCount} জন আজ eligible হয়েছেন`);
        if (summary.birthdayCount > 0)
          parts.push(`${summary.birthdayCount} জনের আজ জন্মদিন`);

        await sendFCMNotification(
          tokens,
          "আজকের Digest",
          `${summary.name}: ${parts.join(", ")}`,
          {
            type: "midnight_digest",
            branchId: String(summary.branchId),
          },
        );
      }
    }

    // ২. SuperAdmin-দের কাছে সব branch মিলিয়ে সামারি
    const totalCount = branchSummaries.reduce((sum, b) => sum + b.count, 0);
    const totalBirthdays = branchSummaries.reduce((sum, b) => sum + b.birthdayCount, 0);
    const totalEligibleToday = branchSummaries.reduce(
      (sum, b) => sum + b.eligibleTodayCount,
      0,
    );

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

      const globalParts: string[] = [];
      globalParts.push(
        totalCount > 0
          ? `মোট ${totalCount}টি নতুন pending application (${breakdown})`
          : "গত ২৪ ঘণ্টায় কোনো নতুন application নেই",
      );
      if (totalEligibleToday > 0) globalParts.push(`আজ ${totalEligibleToday} জন eligible হয়েছেন`);
      if (totalBirthdays > 0) globalParts.push(`আজ ${totalBirthdays} জনের জন্মদিন`);

      await sendFCMNotification(
        superAdminTokens,
        "আজকের সব Branch Digest",
        globalParts.join(" | "),
        { type: "midnight_digest_global" },
      );
    }

    return NextResponse.json({
      success: true,
      branchSummaries,
      totalCount,
      totalBirthdays,
      totalEligibleToday,
    });
  } catch (err) {
    console.error("Digest cron failed:", err);
    return NextResponse.json({ error: "Digest failed" }, { status: 500 });
  }
}