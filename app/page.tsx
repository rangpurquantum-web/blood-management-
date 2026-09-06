import Link from "next/link";
import DonorToPatientHero from "@/components/DonorToPatientHero";
import UpdateButton from "@/components/UpdateButton";

export default function HomePage() {
  return (
    <div className="relative h-screen overflow-hidden bg-gradient-to-b from-slate-950 via-blue-950 to-slate-900 flex flex-col">
      {/* ── Ambient gradient blobs (Red, White & Blue palette) ───────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-70"
          style={{ background: "radial-gradient(circle at 30% 30%, #EF4444, #B91C1C 60%, transparent 75%)" }}
        />
        <div
          className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle at 60% 40%, #3B82F6, #1E3A8A 65%, transparent 75%)" }}
        />
        <div
          className="absolute -bottom-40 left-1/4 h-[480px] w-[480px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle at 50% 50%, #DC2626, #1E40AF 65%, transparent 75%)" }}
        />
      </div>

      {/* ── Top-right Login / Update ──────────────────────────────────── */}
      <div className="relative z-20 flex justify-end px-6 pt-8 shrink-0">
        <UpdateButton
          fallback={
            <Link
              href="/login"
              className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 shadow-[0_8px_25px_rgba(37,99,235,0.4)] hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-center font-semibold text-white text-sm">
                Login
              </span>
            </Link>
          }
        />
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 gap-3 min-h-0">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-md">
            Quantum Voluntary Blood Donation Programme
          </h1>
        </div>

        <div className="w-full max-w-xs mx-auto">
          <DonorToPatientHero />
        </div>

        {/* 1. Register as a New Donor */}
        <div className="w-full max-w-md">
          <Link
            href="/register"
            className="flex items-center justify-center w-full rounded-full bg-white px-7 py-4 shadow-[0_8px_30px_rgba(255,255,255,0.2)] hover:bg-slate-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-center font-bold text-blue-900 text-base">
              Register as a New Donor
            </span>
          </Link>
        </div>

        {/* 2. Request Blood Now */}
        <div className="w-full max-w-md">
          <Link
            href="/request-blood"
            className="flex items-center justify-center w-full rounded-full bg-red-600 px-7 py-4 shadow-[0_8px_30px_rgba(220,38,38,0.45)] hover:bg-red-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-center font-bold text-white text-base">
              Request Blood Now
            </span>
          </Link>
        </div>

        {/* 3. Check Your Last Donation Date */}
        <div className="w-full max-w-md">
          <Link
            href="/check-donation"
            className="flex items-center justify-center w-full rounded-full bg-blue-600 px-7 py-4 shadow-[0_8px_30px_rgba(37,99,235,0.35)] hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-center font-bold text-white text-base">
              Check Your Last Donation Date
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}