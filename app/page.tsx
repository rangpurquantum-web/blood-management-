import Link from "next/link";
import DonorToPatientHero from "@/components/DonorToPatientHero";

export default function HomePage() {
  return (
    <div className="relative h-screen overflow-hidden bg-[#3D0B12] flex flex-col">
      {/* ── Ambient gradient blobs (signature background) ───────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-70"
          style={{ background: "radial-gradient(circle at 30% 30%, #FF7A8A, #B91C3C 60%, transparent 75%)" }}
        />
        <div
          className="absolute top-1/3 -right-32 h-[520px] w-[520px] rounded-full blur-3xl opacity-60"
          style={{ background: "radial-gradient(circle at 60% 40%, #F0576B, #7A1220 65%, transparent 75%)" }}
        />
        <div
          className="absolute -bottom-40 left-1/4 h-[480px] w-[480px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle at 50% 50%, #FF9EA8, #6B0F1A 65%, transparent 75%)" }}
        />
      </div>

      {/* ── Top-right Login ──────────────────────────────────────────── */}
        <div className="relative z-20 flex justify-end px-6 pt-8 shrink-0">
        <Link
          href="/login"
          className="flex items-center justify-center rounded-full bg-blue-600 px-6 py-2 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-blue-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <span className="text-center font-semibold text-white text-sm">
            Login
          </span>
        </Link>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 gap-3 min-h-0">
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Quantum Blood Donor Pool
          </h1>
        </div>

        <div className="w-full max-w-xs mx-auto">
          <DonorToPatientHero />
        </div>

        <div className="w-full max-w-md text-center">
          <h2 className="text-lg font-semibold text-white mb-1">
            Become a Proud Blood Donor
          </h2>
          <p className="text-xs text-rose-100/60">
            Life · Silver · Golden · Platinum member recognition for regular donors
          </p>
        </div>

        {/* Emergency CTA — priority; needs a /request-blood page + API */}
        <div className="w-full max-w-md">
          <Link
            href="/request-blood"
            className="flex items-center justify-center w-full rounded-full bg-red-600 px-7 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)] hover:bg-red-500 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-center font-semibold text-white text-base">
              Request Blood Now
            </span>
          </Link>
        </div>

        <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/check-donation"
            className="flex items-center justify-center w-full rounded-full bg-white/95 px-7 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-center font-semibold text-[#3D0B12] text-base">
              Check Your Last Donation Date
            </span>
          </Link>

          <Link
            href="/register"
            className="flex items-center justify-center w-full rounded-full bg-white/95 px-7 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="text-center font-semibold text-[#3D0B12] text-base">
              Register as a New Donor
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}