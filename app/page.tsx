import Link from "next/link";
import { Droplet, Search, LogIn, UserPlus } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-muted/20 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center space-y-2 mb-10">
        <div className="inline-flex items-center gap-2 text-primary font-bold text-3xl tracking-tight">
          <Droplet className="h-9 w-9 text-destructive fill-destructive" />
          <span>Quantum Blood Donor Pool</span>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage donors, track donations, and help save lives
        </p>
      </div>

      <div className="w-full max-w-md space-y-4">
        {/* Primary actions — bigger */}
        <Link
          href="/check-donation"
          className="flex items-center gap-4 w-full rounded-xl border bg-card px-6 py-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Search className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-base">Check Your Last Donation Date</p>
            <p className="text-sm text-muted-foreground">
              Enter your phone number to see your donation history
            </p>
          </div>
        </Link>

        <Link
          href="/register"
          className="flex items-center gap-4 w-full rounded-xl border bg-card px-6 py-5 shadow-sm hover:shadow-md hover:border-primary/40 transition-all"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <UserPlus className="h-6 w-6" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-base">Register as a New Donor</p>
            <p className="text-sm text-muted-foreground">
              Sign up to join our voluntary donor directory
            </p>
          </div>
        </Link>

        {/* Secondary action — smaller, for staff/admin */}
        <div className="pt-4 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogIn className="h-4 w-4" />
            Staff Login
          </Link>
        </div>
      </div>
    </div>
  );
}
