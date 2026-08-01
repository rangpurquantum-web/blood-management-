import Link from "next/link";
import {
  LayoutDashboard, Users, FileDown,
  ShieldAlert, UserCheck, BarChart2, Shield, Settings,
} from "lucide-react";

interface DashboardNavProps {
  canApprove: boolean;
  canImport: boolean;
  canReports: boolean;
  canUserMgmt: boolean;
  onNavigate?: () => void;
}

export function DashboardNav({ canApprove, canImport, canReports, canUserMgmt, onNavigate }: DashboardNavProps) {
  const linkClass = "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors";

  return (
    <nav className="space-y-1 px-2">
      <Link href="/dashboard" className={linkClass} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>

      <Link href="/dashboard/donors" className={linkClass} onClick={onNavigate}>
        <Users className="h-4 w-4" />
        Donors Directory
      </Link>

      {(canApprove || canImport || canReports || canUserMgmt) && (
        <>
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Tools</p>
          </div>

          {canApprove && (
            <Link href="/dashboard/donors/pending" className={linkClass} onClick={onNavigate}>
              <UserCheck className="h-4 w-4 text-amber-500" />
              Pending Approvals
            </Link>
          )}

          {canImport && (
            <Link href="/dashboard/import" className={linkClass} onClick={onNavigate}>
              <FileDown className="h-4 w-4" />
              Bulk Import
            </Link>
          )}

          {canReports && (
            <Link href="/dashboard/reports" className={linkClass} onClick={onNavigate}>
              <BarChart2 className="h-4 w-4 text-violet-500" />
              Reports
            </Link>
          )}

          {canUserMgmt && (
            <Link href="/dashboard/audit-logs" className={linkClass} onClick={onNavigate}>
              <ShieldAlert className="h-4 w-4" />
              Audit Logs
            </Link>
          )}
        </>
      )}

      <div className="pt-4 pb-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
      </div>
      <Link href="/dashboard/settings" className={linkClass} onClick={onNavigate}>
        <Settings className="h-4 w-4" />
        Settings
      </Link>
      {canUserMgmt && (
        <Link href="/dashboard/users" className={linkClass} onClick={onNavigate}>
          <Shield className="h-4 w-4 text-red-500" />
          User Management
        </Link>
      )}
    </nav>
  );
}
