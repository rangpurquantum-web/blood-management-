import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Cake } from "lucide-react";
import { centralPrisma } from "@/lib/central-db";
import { getBranchDb } from "@/lib/branch-db";
import { BirthdayList, type BirthdayDonor } from "@/features/donors/components/birthday-list";
import { getTodaysBirthdays } from "@/features/donors/birthday-helpers";

export const dynamic = "force-dynamic";

type BranchBirthdays = {
  branchId: number;
  branchName: string;
  donors: BirthdayDonor[];
};

export default async function BirthdaysPage() {
  const branches = await centralPrisma.branch.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: BranchBirthdays[] = [];

  for (const branch of branches) {
    try {
      const branchDb = await getBranchDb(branch.id);
      const donors = await getTodaysBirthdays(branchDb);

      results.push({
        branchId: branch.id,
        branchName: branch.name,
        donors,
      });
    } catch (error) {
      console.error(
        `Failed to load birthdays for branch ${branch.id} (${branch.name}):`,
        error,
      );

      results.push({
        branchId: branch.id,
        branchName: branch.name,
        donors: [],
      });
    }
  }

  const totalToday = results.reduce((sum, r) => sum + r.donors.length, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          Today&apos;s Birthdays
          <Cake className="h-6 w-6 text-pink-500" />
        </h1>
        <p className="text-muted-foreground">
          {totalToday > 0
            ? `${totalToday} donor${totalToday > 1 ? "s" : ""} celebrating today, across all branches.`
            : "No donors are celebrating a birthday today, across all branches."}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {results.map((branch) => (
          <Card key={branch.branchId} className="bg-card shadow-sm border-muted/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">
                {branch.branchName}
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {branch.donors.length} today
              </span>
            </CardHeader>
            <CardContent>
              <BirthdayList donors={branch.donors} />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}