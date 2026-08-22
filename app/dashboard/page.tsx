import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Droplet,
  Users,
  UserCheck,
  Heart,
  Cake,
} from "lucide-react";
import { auth } from "@/auth";
import { getBranchDb } from "@/lib/branch-db";
import { centralPrisma } from "@/lib/central-db";
import { cookies } from "next/headers";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch-cookie";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";
import { BirthdayList } from "@/features/donors/components/birthday-list";
import { getTodaysBirthdays } from "@/features/donors/birthday-helpers";

export default async function DashboardPage() {
  const session = await auth();

  const isSuperAdmin = session?.user?.isSuperAdmin === true;
  let branchId: number | null =
    typeof session?.user?.branchId === "number" ? session.user.branchId : null;

  // SuperAdmin: resolve the branch they've selected via the branch-switcher cookie
  if (isSuperAdmin) {
    const cookieStore = await cookies();
    const raw = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value ?? null;
    branchId = raw ? Number(raw) : null;
  }

  if (!branchId || !Number.isInteger(branchId) || branchId <= 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
          <p className="text-muted-foreground">
            {isSuperAdmin
              ? "Please select a branch to view its dashboard."
              : "Your account is not associated with a valid branch."}
          </p>
        </div>
      </div>
    );
  }

  const prisma = await getBranchDb(branchId);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalActiveDonors,
    eligibleDonors,
    pendingApprovals,
    recentDonations,
    donorsByBloodType,
    donationsLast7Days,
    todaysBirthdays,
  ] = await Promise.all([
    // 1. Total Active Donors — APPROVED + not deleted
    prisma.donor.count({
      where: { isDeleted: false, status: "APPROVED" },
    }),

    // 2. Eligible Donors — APPROVED, not deleted, isEligible true OR deferredUntil <= today
    prisma.donor.count({
      where: {
        isDeleted: false,
        status: "APPROVED",
        OR: [
          { isEligible: true, deferredUntil: null },
          { isEligible: true, deferredUntil: { lte: today } },
        ],
      },
    }),

    // 3. Pending Approvals
    prisma.donor.count({
      where: { isDeleted: false, status: "PENDING" },
    }),

    // 4. Recent Donations (last 30 days)
    prisma.donationHistory.count({
      where: {
        donationDate: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
      },
    }),

    // 5. Blood group breakdown — APPROVED donors only
    prisma.donor.groupBy({
      where: { isDeleted: false, status: "APPROVED" },
      by: ["bloodType"],
      _count: true,
    }),

    prisma.donationHistory.findMany({
      where: {
        donationDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { donationDate: true },
    }),

    // 7. Today's birthdays (this branch only, Asia/Dhaka "today")
    getTodaysBirthdays(prisma),
  ]);

  // Aggregate donations by day
  const donationsByDay = donationsLast7Days.reduce(
    (acc, curr) => {
      const dateStr = curr.donationDate.toISOString().split("T")[0];
      if (dateStr) acc[dateStr] = (acc[dateStr] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const trendData = Object.entries(donationsByDay)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const bloodTypeData = donorsByBloodType
    .map((d) => ({ name: d.bloodType, value: d._count }))
    .sort((a, b) => b.value - a.value);

  // Ineligible percentage for display
  const ineligibleCount = totalActiveDonors - eligibleDonors;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">
          Welcome to the Internal Blood Management System.
        </p>
      </div>

      {/* ── Row 1: Key Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Active Donors */}
        <Card className="bg-card shadow-sm border-muted/50 hover:border-primary/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Donors</CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalActiveDonors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Approved &amp; active in directory
            </p>
          </CardContent>
        </Card>

        {/* Eligible Donors */}
        <Card className="bg-card shadow-sm border-muted/50 hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eligible Donors</CardTitle>
            <Heart className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{eligibleDonors}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ineligibleCount > 0
                ? `${ineligibleCount} deferred / ineligible`
                : "All active donors eligible"}
            </p>
          </CardContent>
        </Card>

        {/* Pending Approvals — clickable card */}
        <Link href="/dashboard/donors/pending" className="group">
          <Card
            className={`bg-card shadow-sm border-muted/50 h-full transition-all group-hover:border-amber-500/60 group-hover:shadow-md ${
              pendingApprovals > 0 ? "border-amber-500/30 bg-amber-500/5" : ""
            }`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <UserCheck
                className={`h-4 w-4 ${
                  pendingApprovals > 0 ? "text-amber-500" : "text-muted-foreground"
                }`}
              />
            </CardHeader>
            <CardContent>
              <div
                className={`text-3xl font-bold ${
                  pendingApprovals > 0 ? "text-amber-600" : ""
                }`}
              >
                {pendingApprovals}
              </div>
              <p className="text-xs text-muted-foreground mt-1 group-hover:text-amber-600 transition-colors">
                {pendingApprovals > 0
                  ? "Click to review applications →"
                  : "No pending applications"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* ── Row 2: Secondary Stats ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Recent Donations */}
        <Card className="bg-card shadow-sm border-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Donations</CardTitle>
            <Droplet className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{recentDonations}</div>
            <p className="text-xs text-muted-foreground mt-1">In the last 30 days</p>
          </CardContent>
        </Card>

        {/* Blood Group Breakdown */}
        <Card className="bg-card shadow-sm border-muted/50 sm:col-span-1 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Blood Group Breakdown</CardTitle>
              <Droplet className="h-4 w-4 text-destructive" />
            </div>
            <p className="text-xs text-muted-foreground">Active approved donors per blood group</p>
          </CardHeader>
          <CardContent>
            {bloodTypeData.length === 0 ? (
              <p className="text-xs text-muted-foreground">No donor data available.</p>
            ) : (
              <div className="space-y-2">
                {bloodTypeData.map((bt) => {
                  const pct =
                    totalActiveDonors > 0
                      ? Math.round((bt.value / totalActiveDonors) * 100)
                      : 0;
                  return (
                    <div key={bt.name} className="flex items-center gap-3">
                      <span className="w-10 shrink-0 text-right font-mono text-xs font-bold text-destructive">
                        {bt.name}
                      </span>
                      <div className="flex-1 h-2.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-destructive/80 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-xs text-muted-foreground">
                        {bt.value} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Row 3: Today's Birthdays ── */}
      <Card className="bg-card shadow-sm border-muted/50">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Today&apos;s Birthdays</CardTitle>
            <Cake className="h-4 w-4 text-pink-500" />
          </div>
          {todaysBirthdays.length > 0 && (
            <Link
              href="/dashboard/birthdays"
              className="text-xs text-primary hover:underline"
            >
              View all branches →
            </Link>
          )}
        </CardHeader>
        <CardContent>
          <BirthdayList donors={todaysBirthdays} />
        </CardContent>
      </Card>

      {/* ── Charts ── */}
      <DashboardCharts bloodTypeData={bloodTypeData} trendData={trendData} />
    </div>
  );
}
