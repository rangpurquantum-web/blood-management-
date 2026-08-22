"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Settings, ChevronDown } from "lucide-react";
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
        className="flex items-center gap-2.5 rounded-full pl-1.5 pr-2.5 py-1.5 hover:bg-muted/60 transition-colors"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
          {name?.charAt(0).toUpperCase() ?? "U"}
        </div>
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium leading-none">{name}</p>
          <p className="text-[11px] text-muted-foreground mt-1 capitalize">{role?.toLowerCase()}</p>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-sm shadow-lg z-50 overflow-hidden">
          {/* User info */}
          <div className="px-3.5 py-3.5 border-b border-border/60 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold shrink-0">
              {name?.charAt(0).toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-xs text-muted-foreground truncate">{email}</p>
              <span className="inline-block mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary capitalize">
                {role?.toLowerCase()}
              </span>
            </div>
          </div>

          {/* Menu items */}
          <div className="p-1.5">
            <Link
              href="/dashboard/settings"
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4" />
              Settings & Change Password
            </Link>
          </div>

          {/* Sign out */}
          <div className="p-1.5 border-t border-border/60">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
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