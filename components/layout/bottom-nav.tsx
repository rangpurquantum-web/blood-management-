"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LayoutGrid, UserCircle } from "lucide-react";

interface BottomNavProps {
  canApprove: boolean;
  canImport: boolean;
  canReports: boolean;
  canUserMgmt: boolean;
  isSuperAdmin?: boolean;
}

export function BottomNav({ canApprove, canImport, canReports, canUserMgmt, isSuperAdmin }: BottomNavProps) {
  const pathname = usePathname();
  const showAdmin = canApprove || canImport || canReports || canUserMgmt || isSuperAdmin;

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
        <Link href="/dashboard" className={tabClass(pathname === "/dashboard")}>
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

        {showAdmin && (
          <Link href="/dashboard/admin" className={tabClass(isActive("/dashboard/admin"))}>
            <span className={iconWrapClass(isActive("/dashboard/admin"))}>
              <LayoutGrid className="h-5 w-5" />
            </span>
            Admin
          </Link>
        )}

        <Link href="/dashboard/settings" className={tabClass(isActive("/dashboard/settings"))}>
          <span className={iconWrapClass(isActive("/dashboard/settings"))}>
            <UserCircle className="h-5 w-5" />
          </span>
          Profile
        </Link>
      </nav>
      <div className="h-16 md:hidden" />
    </>
  );
}