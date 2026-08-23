import { Heart, Droplet, User, ArrowRight } from "lucide-react";

export function DonorToPatientStatic() {
  return (
    <div className="w-full rounded-3xl bg-white/95 px-6 py-8 shadow-[0_8px_30px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between gap-2">
        {/* Donor */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3D0B12]/10">
            <User className="h-8 w-8 text-[#3D0B12]" />
          </div>
          <span className="text-xs font-medium text-[#3D0B12]">Donor</span>
        </div>

        <ArrowRight className="h-5 w-5 text-[#B91C3C] shrink-0" />

        {/* Blood */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10">
            <Droplet className="h-8 w-8 text-red-600" fill="currentColor" />
          </div>
          <span className="text-xs font-medium text-[#3D0B12]">Blood</span>
        </div>

        <ArrowRight className="h-5 w-5 text-[#B91C3C] shrink-0" />

        {/* Patient */}
        <div className="flex flex-col items-center gap-2 flex-1">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#3D0B12]/10">
            <Heart className="h-8 w-8 text-[#3D0B12]" />
          </div>
          <span className="text-xs font-medium text-[#3D0B12]">Patient</span>
        </div>
      </div>

      <p className="mt-6 text-center text-sm text-[#3D0B12]/70">
        Every donation you make travels this path — from your arm to someone's life.
      </p>
    </div>
  );
}