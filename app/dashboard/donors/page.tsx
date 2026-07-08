import { DonorTable } from "@/features/donors/components/donor-table";
import { DonorForm } from "@/features/donors/components/donor-form";

export default function DonorsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Donors Directory</h1>
          <p className="text-muted-foreground">Manage registered blood donors and search by availability.</p>
        </div>
        <DonorForm />
      </div>

      <DonorTable />
    </div>
  );
}
