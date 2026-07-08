import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { Role } from "@prisma/client";
import { LogOut, LayoutDashboard, Users, Activity, FileDown, ShieldAlert, Droplet } from "lucide-react";
import { Button } from "@/components/ui/button";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role as Role;
  const isAdmin = role === Role.Admin;

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
            
            <Link href="/dashboard/requests" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
              <Activity className="h-4 w-4" />
              Blood Requests
            </Link>

            {isAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Tools</p>
                </div>
                
                <Link href="/dashboard/import" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
                  <FileDown className="h-4 w-4" />
                  Bulk Import
                </Link>
                
                <Link href="/dashboard/audit-logs" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground text-muted-foreground transition-colors">
                  <ShieldAlert className="h-4 w-4" />
                  Audit Logs
                </Link>
              </>
            )}
          </nav>
        </div>
        
        <div className="border-t p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
              {session.user.name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium">{session.user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{role}</p>
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
        <header className="hidden h-14 items-center justify-end border-b px-6 md:flex bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <form action="/api/auth/signout" method="POST">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground" type="submit">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
