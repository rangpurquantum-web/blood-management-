"use client";

import { useState } from "react";
import { Phone, Copy, Check, Cake } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWhatsAppUrl(number: string) {
  const cleanNumber = number.replace(/\D/g, "");

  if (cleanNumber.startsWith("880")) {
    return `https://wa.me/${cleanNumber}`;
  }

  if (cleanNumber.startsWith("0")) {
    return `https://wa.me/880${cleanNumber.substring(1)}`;
  }

  if (cleanNumber.startsWith("1")) {
    return `https://wa.me/880${cleanNumber}`;
  }

  return `https://wa.me/${cleanNumber}`;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.711-1.465L0 24zm6.59-4.846c1.6.95 3.498 1.453 5.418 1.454 5.918 0 10.732-4.814 10.735-10.736.001-2.868-1.115-5.566-3.144-7.596C17.628 2.247 14.927 1.13 12.05 1.13c-5.923 0-10.74 4.817-10.743 10.74 0 1.954.51 3.86 1.478 5.564L1.758 21.32l4.89-1.282c1.611.879 3.42 1.34 5.253 1.342zm11.754-8.012c-.322-.16-.1.9-.3.948s-.58.12-.9.08a4.8 4.8 0 0 1-2.48-1.56 5.3 5.3 0 0 1-1.26-1.92c-.22-.38.02-.58.18-.74.16-.16.32-.32.48-.48a1.1 1.1 0 0 0 .16-.48c.04-.32-.08-.6-.16-.76-.08-.16-.72-1.72-.98-2.36-.26-.62-.52-.54-.72-.54h-.62c-.2 0-.52.08-.8.38a3.1 3.1 0 0 0-1 2.3c0 1.46.74 2.8 1 3.2.1.18 2.92 4.46 7.08 6.26 1 .44 1.76.7 2.36.9.98.32 1.88.28 2.58.18.78-.12 2.4-.98 2.74-1.92.34-.94.34-1.76.24-1.92-.1-.16-.38-.26-.7-.42z" />
  </svg>
);

// ─── Types ────────────────────────────────────────────────────────────────────

export type BirthdayDonor = {
  id: number;
  fullName: string;
  bloodType: string;
  dob: string; // ISO string
  turningAge: number;
  phone: {
    id?: number;
    number: string;
    label?: string | null;
    isPrimary?: boolean;
  }[];
};

// ─── Component ────────────────────────────────────────────────────────────────

export function BirthdayList({ donors }: { donors: BirthdayDonor[] }) {
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopiedNumber(num);
    toast.success("Phone number copied to clipboard");
    setTimeout(() => setCopiedNumber(null), 1500);
  };

  if (donors.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Cake className="h-4 w-4" />
        <span>No birthdays today</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {donors.map((donor) => {
        const primaryPhone =
          donor.phone.find((p) => p.isPrimary) ||
          (donor.phone.length > 0 ? donor.phone[0] : null);

        return (
          <div
            key={donor.id}
            className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3"
          >
            <div className="min-w-0 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-500/10 text-pink-600 shrink-0">
                <Cake className="h-4 w-4" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm truncate">
                    {donor.fullName}
                  </span>

                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] px-1.5 py-0 bg-destructive/10 text-destructive border-destructive/20"
                  >
                    {donor.bloodType}
                  </Badge>

                  <span className="text-xs text-muted-foreground">
                    Turning {donor.turningAge}
                  </span>
                </div>

                {primaryPhone && (
                  <span className="text-xs font-mono text-muted-foreground">
                    {primaryPhone.number}
                  </span>
                )}
              </div>
            </div>

            {primaryPhone && (
              <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1 shrink-0">
                {/* Call */}
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-500/10"
                  title="Call"
                >
                  <a href={`tel:${primaryPhone.number}`}>
                    <Phone className="h-3.5 w-3.5" />
                  </a>
                </Button>

                {/* WhatsApp */}
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                  title="WhatsApp"
                >
                  <a
                    href={getWhatsAppUrl(primaryPhone.number)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <WhatsAppIcon className="h-3.5 w-3.5" />
                  </a>
                </Button>

                {/* Copy */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={() => handleCopy(primaryPhone.number)}
                  title="Copy Number"
                >
                  {copiedNumber === primaryPhone.number ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
