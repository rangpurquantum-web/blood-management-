import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import {
  LogOut, LayoutDashboard, Users, FileDown,
  ShieldAlert, Droplet, UserCheck, BarChart2, Shield, Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import { hasPermission } from "@/lib/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;
  const isAdmin = role === Role.ADMIN;
  const userName = session.user.name ?? "User";
  const userEmail = session.user.email ?? "";

  const canApprove = hasPermission(session.user, "approveReject");
  const canImport = hasPermission(session.user, "donorAdd");
  const canReports = hasPermission(session.user, "reportsExport");
  const canUserMgmt = hasPermission(session.user, "userManagement");

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r bg-card/50 backdrop-blur-sm hidden md:flex flex-col">
        <div className="flex h-14 items-center border-b px-4 gap-2 text-primary">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="font-semibold text-lg tracking-tight">BloodManager</span>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          <nav className="space-y-1 px-2">
            <Link href="/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            
            <Link href="/dashboard/donors" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
              <Users className="h-4 w-4" />
              Donors Directory
            </Link>
            


            {/* Admin Tools Section */}
            {(canApprove || canImport || canReports || canUserMgmt) && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Tools</p>
                </div>

                {canApprove && (
                  <Link href="/dashboard/donors/pending" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
                    <UserCheck className="h-4 w-4 text-amber-500" />
                    Pending Approvals
                  </Link>
                )}

                {canImport && (
                  <Link href="/dashboard/import" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
                    <FileDown className="h-4 w-4" />
                    Bulk Import
                  </Link>
                )}

                {canReports && (
                  <Link href="/dashboard/reports" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
                    <BarChart2 className="h-4 w-4 text-violet-500" />
                    Reports
                  </Link>
                )}

                {canUserMgmt && (
                  <Link href="/dashboard/audit-logs" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
                    <ShieldAlert className="h-4 w-4" />
                    Audit Logs
                  </Link>
                )}
              </>
            )}

            {/* Account */}
            <div className="pt-4 pb-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
            </div>
            <Link href="/dashboard/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            {canUserMgmt && (
              <Link href="/dashboard/users" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
                <Shield className="h-4 w-4 text-red-500" />
                User Management
              </Link>
            )}
          </nav>
        </div>
        
        {/* Sidebar footer — user info */}
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">{role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between border-b px-4 md:hidden bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-primary">
            <Droplet className="h-5 w-5 fill-current" />
            <span className="font-semibold">BloodManager</span>
          </div>
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="icon" type="submit">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </header>

        {/* Desktop Header */}
        <header className="hidden h-14 items-center justify-end border-b px-6 md:flex bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 gap-3">
          <ProfileDropdown
            name={userName}
            email={userEmail}
            role={role}
          />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
