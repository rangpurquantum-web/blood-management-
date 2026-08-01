import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { BarChart2 } from "lucide-react";
import { DonorReportBuilder } from "@/features/reports/components/donor-report-builder";

export const metadata: Metadata = {
  title: "Donor Reports — BloodManager",
  description: "Analyze donor data with custom filters.",
};

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== Role.ADMIN) redirect("/dashboard");

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-600/20 border border-violet-500/20">
              <BarChart2 className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Donor Reports</h1>
              <p className="text-sm text-muted-foreground">
                Analyze donor data with custom filters
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Builder + Preview Table */}
      <DonorReportBuilder />
    </div>
  );
}