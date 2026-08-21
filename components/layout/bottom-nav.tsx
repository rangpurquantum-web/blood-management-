"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, UserCheck, Settings, Menu, ShieldCheck } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { SignOutButton } from "@/components/layout/signout-button";
import { Droplet } from "lucide-react";

interface BottomNavProps {
  canApprove: boolean;
  canImport: boolean;
  canReports: boolean;
  canUserMgmt: boolean;
  isSuperAdmin?: boolean;
}

export function BottomNav({ canApprove, canImport, canReports, canUserMgmt, isSuperAdmin }: BottomNavProps) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname.startsWith(href);

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-1 flex-1 py-2 text-xs font-medium transition-colors ${
      active ? "text-primary" : "text-muted-foreground"
    }`;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t bg-card/95 backdrop-blur-sm md:hidden">
        <Link href="/dashboard" className={tabClass(isActive("/dashboard") && pathname === "/dashboard")}>
          <LayoutDashboard className="h-5 w-5" />
          Home
        </Link>

        <Link href="/dashboard/donors" className={tabClass(isActive("/dashboard/donors"))}>
          <Users className="h-5 w-5" />
          Donors
        </Link>

        {canApprove && (
          <Link href="/dashboard/donors/pending" className={tabClass(isActive("/dashboard/donors/pending"))}>
            <UserCheck className="h-5 w-5" />
            Approvals
          </Link>
        )}

        <Link href="/dashboard/settings" className={tabClass(isActive("/dashboard/settings"))}>
          <Settings className="h-5 w-5" />
          Settings
        </Link>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className={tabClass(false)}>
              <Menu className="h-5 w-5" />
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 flex flex-col max-h-[80vh]">
            <div className="flex h-14 items-center border-b px-4 gap-2 text-primary shrink-0">
              <Droplet className="h-6 w-6 fill-current" />
              <span className="font-semibold text-lg tracking-tight">Quantum Blood Donor Pool</span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {isSuperAdmin && (
                <Link
                  href="/superadmin/branches"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors"
                >
                  <ShieldCheck className="h-5 w-5 text-muted-foreground" />
                  Branches (SuperAdmin)
                </Link>
              )}
              <DashboardNav
                canApprove={canApprove}
                canImport={canImport}
                canReports={canReports}
                canUserMgmt={canUserMgmt}
                onNavigate={() => setMoreOpen(false)}
              />
            </div>
            <div className="border-t p-3 shrink-0">
              <SignOutButton />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
      <div className="h-16 md:hidden" />
    </>
  );
}