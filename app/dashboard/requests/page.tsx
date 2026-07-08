import { RequestTable } from "@/features/requests/components/request-table";
import { RequestForm } from "@/features/requests/components/request-form";

export default function RequestsPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blood Requests</h1>
          <p className="text-muted-foreground">Log and coordinate incoming patient blood requests.</p>
        </div>
        <RequestForm />
      </div>

      <RequestTable />
    </div>
  );
}
