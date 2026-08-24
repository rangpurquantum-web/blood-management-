import { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

import { UserQrCode } from "@/components/user-qr-code";

import {
  User,
  Mail,
  Shield,
} from "lucide-react";

export const metadata: Metadata = {
  title: "My Account — BloodManager",
  description: "View and manage your account",
};

export default async function ProfilePage() {
  const session = await auth();

  // Login না থাকলে login page
  if (!session?.user) {
    redirect("/login");
  }

  const userId = Number(session.user.id);

  const userName =
    session.user.name?.trim() || "User";

  const userEmail =
    session.user.email?.trim() || "";

  const userRole =
    session.user.role || "VOLUNTEER";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">

      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <div className="flex items-center gap-3">

        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
          <User className="h-5 w-5 text-primary" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            My Account
          </h1>

          <p className="text-sm text-muted-foreground">
            View your account information and login QR code
          </p>
        </div>

      </div>


      {/* =====================================================
          ACCOUNT INFORMATION
      ====================================================== */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">

        <div className="mb-5">
          <h2 className="text-lg font-semibold">
            Account Information
          </h2>

          <p className="text-sm text-muted-foreground">
            Your current system account details
          </p>
        </div>


        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* NAME */}
          <div className="rounded-xl border bg-muted/20 p-4">

            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <User className="h-4 w-4" />

              <span className="text-xs font-medium uppercase tracking-wide">
                Name
              </span>
            </div>

            <p className="text-sm font-semibold">
              {userName}
            </p>

          </div>


          {/* EMAIL */}
          <div className="rounded-xl border bg-muted/20 p-4">

            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4" />

              <span className="text-xs font-medium uppercase tracking-wide">
                Email
              </span>
            </div>

            <p className="break-all text-sm font-semibold">
              {userEmail || "No email"}
            </p>

          </div>


          {/* ROLE */}
          <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2">

            <div className="mb-2 flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4" />

              <span className="text-xs font-medium uppercase tracking-wide">
                Role
              </span>
            </div>

            <p className="text-sm font-semibold">
              {userRole}
            </p>

          </div>

        </div>

      </div>


      {/* =====================================================
          MY LOGIN QR
      ====================================================== */}
      <div className="rounded-2xl border bg-card p-5 shadow-sm">

        <div className="mb-5">

          <h2 className="text-lg font-semibold">
            My Login QR Code
          </h2>

          <p className="text-sm text-muted-foreground">
            Download or print your personal staff login QR code.
          </p>

        </div>


        <div className="flex justify-center">

          <UserQrCode
            userId={userId}
            userName={userName}
          />

        </div>

      </div>

    </div>
  );
}