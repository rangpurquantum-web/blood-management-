import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { KeyRound, User, ShieldCheck } from "lucide-react";
import { ChangePasswordForm } from "@/features/settings/components/change-password-form";

export const metadata: Metadata = {
  title: "Settings — BloodManager",
  description: "Manage your account settings",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Account Settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage your account credentials and security preferences
        </p>
      </div>

      {/* Profile Info Card */}
      <div className="rounded-2xl border border-muted bg-card p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm">Profile</h2>
            <p className="text-xs text-muted-foreground">Your account information</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Name</p>
            <p className="font-medium">{session.user.name ?? "—"}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Email</p>
            <p className="font-medium">{session.user.email ?? "—"}</p>
          </div>
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Role</p>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium capitalize">{session.user.role?.toLowerCase() ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Change Password */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-semibold">Security</h2>
        </div>
        <ChangePasswordForm />
      </div>
    </div>
  );
}
