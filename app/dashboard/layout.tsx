import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { centralPrisma } from "@/lib/central-db";
import { Role } from "@/generated/branch";
import { Droplet } from "lucide-react";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SignOutButton } from "@/components/layout/signout-button";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import { ACTIVE_BRANCH_COOKIE } from "@/lib/branch-cookie";
import { hasPermission } from "@/lib/permissions";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;
  const isAdmin = role === Role.ADMIN;
  const isSuperAdmin = session.user.isSuperAdmin === true;
  const userName = session.user.name ?? "User";
  const userEmail = session.user.email ?? "";

  const canApprove = hasPermission(session.user, "approveReject");
  const canImport = hasPermission(session.user, "donorAdd");
  const canReports = hasPermission(session.user, "reportsExport");
  const canUserMgmt = hasPermission(session.user, "userManagement");

  let branchSwitcherProps: {
    branches: { id: number; name: string; slug: string }[];
    activeBranchId: number | null;
  } | null = null;

  if (isSuperAdmin) {
    const branches = await centralPrisma.branch.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: "asc" },
    });

    const cookieStore = await cookies();
    const raw = cookieStore.get(ACTIVE_BRANCH_COOKIE)?.value ?? null;

    branchSwitcherProps = {
      branches,
      activeBranchId: raw ? Number(raw) : null,
    };
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      {/* Sidebar (desktop only) */}
      <aside className="w-64 flex-shrink-0 border-r border-border/60 bg-card hidden md:flex flex-col">
        <div className="flex h-16 items-center border-b border-border/60 px-5 gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Droplet className="h-5 w-5 fill-current" />
          </div>
          <span className="font-semibold text-[15px] tracking-tight leading-tight">
            Quantum Blood<br />Donor Pool
          </span>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-2">
          <DashboardNav
            canApprove={canApprove}
            canImport={canImport}
            canReports={canReports}
            canUserMgmt={canUserMgmt}
          />
          {isSuperAdmin && (
            <a
              href="/superadmin/branches"
              className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors mt-2 rounded-lg"
            >
              Branches (SuperAdmin)
            </a>
          )}
        </div>

        <div className="border-t border-border/60 p-3 space-y-3">
          <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium leading-none">{userName}</p>
              <p className="truncate text-xs text-muted-foreground capitalize mt-1">{role.toLowerCase()}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-between border-b border-border/60 px-4 md:hidden bg-card gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground shrink-0">
              <Droplet className="h-4 w-4 fill-current" />
            </div>
            <span className="font-semibold text-sm truncate">Quantum Blood Donor Pool</span>
          </div>
          {branchSwitcherProps && (
            <BranchSwitcher
              branches={branchSwitcherProps.branches}
              activeBranchId={branchSwitcherProps.activeBranchId}
            />
          )}
        </header>

        {/* Desktop Header */}
        <header className="hidden h-16 items-center justify-end border-b border-border/60 px-6 md:flex bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 gap-3">
          {branchSwitcherProps && (
            <BranchSwitcher
              branches={branchSwitcherProps.branches}
              activeBranchId={branchSwitcherProps.activeBranchId}
            />
          )}
          <ProfileDropdown
            name={userName}
            email={userEmail}
            role={role}
          />
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 pb-20 md:pb-8">
          {children}
        </main>

        {/* Bottom Tab Bar (mobile only) */}
        <BottomNav
          canApprove={canApprove}
          canImport={canImport}
          canReports={canReports}
          canUserMgmt={canUserMgmt}
          isSuperAdmin={isSuperAdmin}
        />
      </div>
    </div>
  );
}