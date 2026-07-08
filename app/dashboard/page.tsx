import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Droplet, Users, Activity, CheckCircle, Clock } from "lucide-react";
import { prisma } from "@/lib/db";
import { DashboardCharts } from "@/features/dashboard/components/dashboard-charts";

export default async function DashboardPage() {
  const [
    totalDonors,
    totalRequests,
    pendingRequests,
    recentDonations,
    donorsByBloodType,
    donationsLast7Days,
  ] = await Promise.all([
    prisma.donor.count(),
    prisma.bloodRequest.count(),
    prisma.bloodRequest.count({ where: { status: "Pending" } }),
    prisma.donationHistory.count({
      where: {
        donationDate: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    }),
    prisma.donor.groupBy({
      by: ["bloodType"],
      _count: true,
    }),
    // We would ideally group by day, but Prisma's groupBy on DateTime is tricky. 
    // We can pass the raw donations to the client chart component instead, or aggregate here.
    prisma.donationHistory.findMany({
      where: {
        donationDate: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      select: { donationDate: true },
    }),
  ]);

  // Aggregate donations by day for the chart
  const donationsByDay = donationsLast7Days.reduce((acc, curr) => {
    const dateStr = curr.donationDate.toISOString().split("T")[0];
    if (dateStr) {
      acc[dateStr] = (acc[dateStr] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  const trendData = Object.entries(donationsByDay).map(([date, count]) => ({
    date,
    count,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const bloodTypeData = donorsByBloodType.map(d => ({
    name: d.bloodType,
    value: d._count,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Overview</h1>
        <p className="text-muted-foreground">Welcome to the Internal Blood Management System.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Registered Donors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDonors}</div>
            <p className="text-xs text-muted-foreground">Available in directory</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Requests</CardTitle>
            <Activity className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingRequests}</div>
            <p className="text-xs text-muted-foreground">Out of {totalRequests} total requests</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Donations</CardTitle>
            <Droplet className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentDonations}</div>
            <p className="text-xs text-muted-foreground">In the last 30 days</p>
          </CardContent>
        </Card>
        
        <Card className="bg-card shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Online</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" /> Updated just now
            </p>
          </CardContent>
        </Card>
      </div>

      <DashboardCharts bloodTypeData={bloodTypeData} trendData={trendData} />
    </div>
  );
}
