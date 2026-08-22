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
    `flex flex-col items-center justify-center gap-1 flex-1 py-2.5 text-[11px] font-medium transition-colors relative ${
      active ? "text-primary" : "text-muted-foreground"
    }`;

  const iconWrapClass = (active: boolean) =>
    `flex items-center justify-center rounded-full transition-all ${
      active ? "bg-primary/10 h-8 w-8" : "h-8 w-8"
    }`;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch border-t border-border/60 bg-card/95 backdrop-blur-sm shadow-[0_-2px_10px_rgba(0,0,0,0.04)] md:hidden">
        <Link href="/dashboard" className={tabClass(isActive("/dashboard") && pathname === "/dashboard")}>
          <span className={iconWrapClass(pathname === "/dashboard")}>
            <LayoutDashboard className="h-5 w-5" />
          </span>
          Home
        </Link>

        <Link href="/dashboard/donors" className={tabClass(isActive("/dashboard/donors"))}>
          <span className={iconWrapClass(isActive("/dashboard/donors"))}>
            <Users className="h-5 w-5" />
          </span>
          Donors
        </Link>

        {canApprove && (
          <Link href="/dashboard/donors/pending" className={tabClass(isActive("/dashboard/donors/pending"))}>
            <span className={iconWrapClass(isActive("/dashboard/donors/pending"))}>
              <UserCheck className="h-5 w-5" />
            </span>
            Approvals
          </Link>
        )}

        <Link href="/dashboard/settings" className={tabClass(isActive("/dashboard/settings"))}>
          <span className={iconWrapClass(isActive("/dashboard/settings"))}>
            <Settings className="h-5 w-5" />
          </span>
          Settings
        </Link>

        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button className={tabClass(false)}>
              <span className={iconWrapClass(false)}>
                <Menu className="h-5 w-5" />
              </span>
              More
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-0 flex flex-col max-h-[80vh] rounded-t-2xl">
            <div className="flex h-16 items-center border-b border-border/60 px-5 gap-2.5 shrink-0">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Droplet className="h-5 w-5 fill-current" />
              </div>
              <span className="font-semibold text-[15px] tracking-tight">Quantum Blood Donor Pool</span>
            </div>
            <div className="flex-1 overflow-y-auto py-4">
              {isSuperAdmin && (
                <Link
                  href="/superadmin/branches"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 mx-2 px-3 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/60 transition-colors"
                >
                  <ShieldCheck className="h-5 w-5" />
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
            <div className="border-t border-border/60 p-3 shrink-0">
              <SignOutButton />
            </div>
          </SheetContent>
        </Sheet>
      </nav>
      {/* Spacer so page content doesn't hide behind the fixed bottom bar */}
      <div className="h-16 md:hidden" />
    </>
  );
}