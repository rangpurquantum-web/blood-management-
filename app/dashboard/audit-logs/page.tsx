import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@/generated/branch";
import { AuditLogTable } from "@/features/audit-logs/components/audit-log-table";

export default async function AuditLogsPage() {
  const session = await auth();

  if (session?.user?.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">System Audit Logs</h1>
        <p className="text-muted-foreground">
          Track and review all system actions for compliance and security.
        </p>
      </div>

      <AuditLogTable />
    </div>
  );
}
