import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
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
        <h1 className="text-2xl font-bold tracking-tight">Donor Reports</h1>
      </div>

      {/* Filter Builder + Preview Table */}
      <DonorReportBuilder />
    </div>
  );
}