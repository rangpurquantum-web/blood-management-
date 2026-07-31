"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Settings, User, ChevronDown } from "lucide-react";
import Link from "next/link";

interface ProfileDropdownProps {
  name: string;
  email: string;
  role: string;
}

export function ProfileDropdown({ name, email, role }: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
  };

  return (
    <div className="relative" ref={ref}>
      <button
        id="profile-dropdown-trigger"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
          {name?.charAt(0).toUpperCase() ?? "U"}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium leading-none">{name}</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{role?.toLowerCase()}</p>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-52 rounded-xl border border-border bg-card shadow-lg z-50 overflow-hidden">
          {/* User info */}
          <div className="px-3 py-3 border-b border-border">
            <p className="text-sm font-semibold truncate">{name}</p>
            <p className="text-xs text-muted-foreground truncate">{email}</p>
          </div>

          {/* Menu items */}
          <div className="p-1">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings & Change Password
            </Link>
          </div>

          {/* Sign out */}
          <div className="p-1 border-t border-border">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
