import Link from "next/link";
import { Phone, MessageCircle, ArrowLeft } from "lucide-react";

const BRANCHES = [
  {
    name: "Rangpur",
    phone: "+8801XXXXXXXXX",
  },
  {
    name: "Rajshahi",
    phone: "+8801XXXXXXXXX",
  },
];

function toWhatsAppLink(phone: string) {
  const digits = phone.replace(/[^\d]/g, "");
  return `https://wa.me/${digits}`;
}

export default function RequestBloodPage() {
  return (
    <div className="relative min-h-screen bg-[#3D0B12] flex flex-col">
      <div className="relative z-10 flex flex-1 flex-col items-center px-6 py-10">
        <div className="w-full max-w-md flex items-center mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-rose-100/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </div>

        <div className="w-full max-w-md text-center mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
            Request Blood
          </h1>
          <p className="text-sm text-rose-100/70">
            Call or message the branch nearest to you directly
          </p>
        </div>

        <div className="w-full max-w-md space-y-4">
          {BRANCHES.map((branch) => (
            <div
              key={branch.name}
              className="rounded-2xl bg-white/95 p-5 shadow-[0_8px_30px_rgba(0,0,0,0.25)]"
            >
              <h2 className="text-lg font-semibold text-[#3D0B12] mb-1">
                {branch.name}
              </h2>
              <p className="text-sm text-[#3D0B12]/60 mb-4">{branch.phone}</p>

              <div className="flex gap-3">
                <a
                  href={`tel:${branch.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#3D0B12] px-4 py-3 text-sm font-medium text-white hover:bg-[#3D0B12]/90 transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Call
                </a>
                <a
                  href={toWhatsAppLink(branch.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-3 text-sm font-medium text-white hover:bg-green-500 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}