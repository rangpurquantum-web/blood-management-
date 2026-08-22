"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const pathname = usePathname();

  const getLinkClass = (href: string, exact = false) => {
    const isActive = exact ? pathname === href : pathname.startsWith(href);

    return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
      isActive
        ? "bg-primary/10 text-primary"
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    }`;
  };

  return (
    <nav className="space-y-1 px-2">
      <Link href="/dashboard" className={getLinkClass("/dashboard", true)} onClick={onNavigate}>
        <LayoutDashboard className="h-4 w-4" />
        Dashboard
      </Link>

      <Link href="/dashboard/donors" className={getLinkClass("/dashboard/donors")} onClick={onNavigate}>
        <Users className="h-4 w-4" />
        Donors Directory
      </Link>

      {(canApprove || canImport || canReports || canUserMgmt) && (
        <>
          <div className="pt-4 pb-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Admin Tools</p>
          </div>

          {canApprove && (
            <Link href="/dashboard/donors/pending" className={getLinkClass("/dashboard/donors/pending")} onClick={onNavigate}>
              <UserCheck className="h-4 w-4 text-amber-500" />
              Pending Approvals
            </Link>
          )}

          {canImport && (
            <Link href="/dashboard/import" className={getLinkClass("/dashboard/import")} onClick={onNavigate}>
              <FileDown className="h-4 w-4" />
              Bulk Import
            </Link>
          )}

          {canReports && (
            <Link href="/dashboard/reports" className={getLinkClass("/dashboard/reports")} onClick={onNavigate}>
              <BarChart2 className="h-4 w-4 text-violet-500" />
              Reports
            </Link>
          )}

          {canUserMgmt && (
            <Link href="/dashboard/audit-logs" className={getLinkClass("/dashboard/audit-logs")} onClick={onNavigate}>
              <ShieldAlert className="h-4 w-4" />
              Audit Logs
            </Link>
          )}
        </>
      )}

      <div className="pt-4 pb-2">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">Account</p>
      </div>

      <Link href="/dashboard/settings" className={getLinkClass("/dashboard/settings")} onClick={onNavigate}>
        <Settings className="h-4 w-4" />
        Settings
      </Link>

      {canUserMgmt && (
        <Link href="/dashboard/users" className={getLinkClass("/dashboard/users")} onClick={onNavigate}>
          <Shield className="h-4 w-4 text-red-500" />
          User Management
        </Link>
      )}
    </nav>
  );
}