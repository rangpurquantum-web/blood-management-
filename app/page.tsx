import Link from "next/link";
import { Droplet, Search, UserPlus, LogIn } from "lucide-react";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#3D0B12] flex flex-col">
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
        {/* Signature drop silhouette */}
        <div
          className="absolute top-[8%] right-[8%] h-40 w-40 opacity-20 blur-sm"
          style={{
            background: "linear-gradient(135deg, #FFD8DC, #FF7A8A)",
            borderRadius: "50% 50% 50% 0",
            transform: "rotate(-45deg)",
          }}
        />
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center mb-14">
          <div className="inline-flex items-center gap-2.5 mb-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm ring-1 ring-white/20">
              <Droplet className="h-6 w-6 text-rose-200 fill-rose-200" />
            </span>
            <span className="text-2xl font-bold tracking-tight text-white">
              Quantum Blood Donor Pool
            </span>
          </div>
          <p className="text-sm text-rose-100/70">
            প্রতিটি রক্তদান একটি জীবন বাঁচাতে পারে
          </p>
        </div>

        <div className="w-full max-w-sm space-y-4">
          <Link
            href="/check-donation"
            className="group flex items-center gap-3 w-full rounded-full bg-white/95 px-7 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Search className="h-4.5 w-4.5" />
            </span>
            <span className="text-left font-semibold text-[#3D0B12] text-base">
              Check Your Last Donation Date
            </span>
          </Link>

          <Link
            href="/register"
            className="group flex items-center gap-3 w-full rounded-full bg-white/95 px-7 py-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)] hover:bg-white transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <UserPlus className="h-4.5 w-4.5" />
            </span>
            <span className="text-left font-semibold text-[#3D0B12] text-base">
              Register as a New Donor
            </span>
          </Link>

          <div className="pt-3 flex justify-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-rose-100/80 ring-1 ring-white/15 hover:text-white hover:ring-white/30 transition-colors"
            >
              <LogIn className="h-4 w-4" />
              Staff Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
