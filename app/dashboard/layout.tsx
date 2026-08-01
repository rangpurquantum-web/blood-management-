import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { Droplet } from "lucide-react";
import { ProfileDropdown } from "@/components/layout/profile-dropdown";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { SignOutButton } from "@/components/layout/signout-button";
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
      {/* Sidebar (desktop only) */}
      <aside className="w-64 flex-shrink-0 border-r bg-card/50 backdrop-blur-sm hidden md:flex flex-col">
        <div className="flex h-14 items-center border-b px-4 gap-2 text-primary">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="font-semibold text-lg tracking-tight">Quantum Blood Donor Pool</span>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <DashboardNav
            canApprove={canApprove}
            canImport={canImport}
            canReports={canReports}
            canUserMgmt={canUserMgmt}
          />
        </div>

        <div className="border-t p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{userName}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">{role.toLowerCase()}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-14 items-center justify-center border-b px-4 md:hidden bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-primary">
            <Droplet className="h-5 w-5 fill-current" />
            <span className="font-semibold">Quantum Blood Donor Pool</span>
          </div>
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

        {/* Bottom Tab Bar (mobile only) */}
        <BottomNav
          canApprove={canApprove}
          canImport={canImport}
          canReports={canReports}
          canUserMgmt={canUserMgmt}
        />
      </div>
    </div>
  );
}