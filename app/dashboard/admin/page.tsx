import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@/generated/branch";
import { hasPermission } from "@/lib/permissions";
import Link from "next/link";
import {
  UserCheck, FileDown, BarChart2, ShieldAlert, Shield, ShieldCheck, ChevronRight,
} from "lucide-react";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isSuperAdmin = session.user.isSuperAdmin === true;
  const canApprove = hasPermission(session.user, "approveReject");
  const canImport = hasPermission(session.user, "donorAdd");
  const canReports = hasPermission(session.user, "reportsExport");
  const canUserMgmt = hasPermission(session.user, "userManagement");

  if (!canApprove && !canImport && !canReports && !canUserMgmt && !isSuperAdmin) {
    redirect("/dashboard");
  }

  const tools = [
    canApprove && {
      href: "/dashboard/donors/pending",
      icon: UserCheck,
      iconClass: "text-amber-500 bg-amber-500/10",
      title: "Pending Approvals",
      desc: "Review and approve new donor submissions",
    },
    canImport && {
      href: "/dashboard/import",
      icon: FileDown,
      iconClass: "text-primary bg-primary/10",
      title: "Bulk Import",
      desc: "Import donor records in bulk",
    },
    canReports && {
      href: "/dashboard/reports",
      icon: BarChart2,
      iconClass: "text-violet-500 bg-violet-500/10",
      title: "Reports",
      desc: "View and export donor & donation reports",
    },
    canUserMgmt && {
      href: "/dashboard/audit-logs",
      icon: ShieldAlert,
      iconClass: "text-slate-500 bg-slate-500/10",
      title: "Audit Logs",
      desc: "Track system activity and changes",
    },
    canUserMgmt && {
      href: "/dashboard/users",
      icon: Shield,
      iconClass: "text-red-500 bg-red-500/10",
      title: "User Management",
      desc: "Manage staff accounts and roles",
    },
    isSuperAdmin && {
      href: "/superadmin/branches",
      icon: ShieldCheck,
      iconClass: "text-primary bg-primary/10",
      title: "Branches",
      desc: "Manage branches across the organization",
    },
  ].filter(Boolean) as {
    href: string;
    icon: typeof UserCheck;
    iconClass: string;
    title: string;
    desc: string;
  }[];

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Tools</h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Manage approvals, imports, reports, and system access.
      </p>

      <div className="space-y-2.5">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="flex items-center gap-3.5 rounded-2xl border border-border/60 bg-card p-4 hover:bg-muted/40 transition-colors"
          >
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tool.iconClass}`}>
              <tool.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{tool.title}</p>
              <p className="text-xs text-muted-foreground truncate">{tool.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}