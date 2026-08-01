"use client";

import { useState } from "react";
import { Menu, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardNav } from "@/components/layout/dashboard-nav";
import { SignOutButton } from "@/components/layout/signout-button";

interface MobileSidebarProps {
  canApprove: boolean;
  canImport: boolean;
  canReports: boolean;
  canUserMgmt: boolean;
}

export function MobileSidebar({ canApprove, canImport, canReports, canUserMgmt }: MobileSidebarProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0 flex flex-col">
        <div className="flex h-14 items-center border-b px-4 gap-2 text-primary">
          <Droplet className="h-6 w-6 fill-current" />
          <span className="font-semibold text-lg tracking-tight">BloodManager</span>
        </div>
        <div className="flex-1 overflow-y-auto py-4">
          <DashboardNav
            canApprove={canApprove}
            canImport={canImport}
            canReports={canReports}
            canUserMgmt={canUserMgmt}
            onNavigate={() => setOpen(false)}
          />
        </div>
        <div className="border-t p-3">
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}