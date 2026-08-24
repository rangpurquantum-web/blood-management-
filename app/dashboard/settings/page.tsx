import { Metadata } from "next";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

import {
  KeyRound,
  User,
  ShieldCheck,
  LogOut,
  QrCode,
} from "lucide-react";

import { ChangePasswordForm } from "@/features/settings/components/change-password-form";
import { SignOutButton } from "@/components/layout/signout-button";
import { UserQrCode } from "@/components/user-qr-code";

export const metadata: Metadata = {
  title: "Settings — BloodManager",
  description: "Manage your account settings",
};

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  // ============================================================
  // CURRENT LOGGED-IN USER
  // ============================================================

  const userId = Number(session.user.id);

  const userName =
    session.user.name?.trim() || "User";

  const userEmail =
    session.user.email?.trim() || "";

  const userRole =
    session.user.role?.toLowerCase() || "—";

  return (
    <div className="space-y-8 max-w-2xl mx-auto">

      {/* ========================================================
          HEADER
      ========================================================= */}

      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">
          Account Settings
        </h1>

        <p className="text-sm text-muted-foreground">
          Manage your account credentials and security preferences
        </p>
      </div>


      {/* ========================================================
          PROFILE INFO CARD
      ======================================================== */}

      <div className="rounded-2xl border border-muted bg-card p-6 shadow-sm space-y-4">

        <div className="flex items-center gap-3">

          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <User className="h-5 w-5 text-primary" />
          </div>

          <div>
            <h2 className="font-semibold text-sm">
              Profile
            </h2>

            <p className="text-xs text-muted-foreground">
              Your account information
            </p>
          </div>

        </div>


        <div className="grid grid-cols-2 gap-4 text-sm">

          {/* NAME */}

          <div className="space-y-0.5 min-w-0">

            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Name
            </p>

            <p className="font-medium truncate">
              {userName}
            </p>

          </div>


          {/* EMAIL */}

          <div className="space-y-0.5 min-w-0">

            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Email
            </p>

            <p
              className="font-medium truncate"
              title={userEmail || undefined}
            >
              {userEmail || "—"}
            </p>

          </div>


          {/* ROLE */}

          <div className="space-y-0.5 min-w-0">

            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
              Role
            </p>

            <div className="flex items-center gap-1.5">

              <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />

              <span className="font-medium capitalize truncate">
                {userRole}
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* ========================================================
          SECURITY
      ======================================================== */}

      <div className="space-y-4">

        <div className="flex items-center gap-2">

          <KeyRound className="h-5 w-5 text-muted-foreground" />

          <h2 className="text-base font-semibold">
            Security
          </h2>

        </div>


        <ChangePasswordForm />

      </div>


      {/* ========================================================
          MY LOGIN QR CODE
      ======================================================== */}

      <div className="space-y-4">

        <div className="flex items-center gap-2">

          <QrCode className="h-5 w-5 text-muted-foreground" />

          <div>
            <h2 className="text-base font-semibold">
              My Login QR Code
            </h2>

            <p className="text-xs text-muted-foreground">
              Your personal account login QR code
            </p>
          </div>

        </div>


        <div className="rounded-2xl border border-muted bg-card p-6 shadow-sm">

          <div className="text-center space-y-2 mb-5">

            <h3 className="font-semibold">
              {userName}'s Login QR
            </h3>

            <p className="text-sm text-muted-foreground">
              Use this QR code for quick login to your account.
            </p>

          </div>


          {/* ====================================================
              USER QR CODE

              IMPORTANT:
              এখানে session.user.id ব্যবহার হচ্ছে।
              তাই প্রত্যেক account নিজের QR-ই পাবে।
          ==================================================== */}

          <div className="flex justify-center">

            <UserQrCode
              userId={userId}
              userName={userName}
            />

          </div>


          {/* ACCOUNT INFO */}

          <div className="mt-5 rounded-xl bg-muted/40 border p-3 text-center">

            <p className="text-xs text-muted-foreground">
              QR Code belongs to
            </p>

            <p className="text-sm font-medium mt-0.5 break-all">
              {userEmail || userName}
            </p>

          </div>

        </div>

      </div>


      {/* ========================================================
          SIGN OUT
      ======================================================== */}

      <div className="space-y-4">

        <div className="flex items-center gap-2">

          <LogOut className="h-5 w-5 text-muted-foreground" />

          <h2 className="text-base font-semibold">
            Session
          </h2>

        </div>


        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">

          <p className="text-sm text-muted-foreground mb-3">
            Sign out of your account on this device.
          </p>

          <SignOutButton />

        </div>

      </div>

    </div>
  );
}