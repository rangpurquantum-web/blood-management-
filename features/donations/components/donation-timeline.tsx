"use client";

import { useDonorHistory } from "@/features/donations/hooks";
import { format } from "date-fns";
import {
  Calendar,
  Building,
  User,
  FileText,
} from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function DonationTimeline({
  donorId,
}: {
  donorId: number;
}) {
  const {
    data,
    isLoading,
    isError,
  } = useDonorHistory(donorId);

  // ─────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 pt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-3 w-3 rounded-full bg-muted" />
              <div className="h-full w-px bg-muted" />
            </div>

            <div className="pb-6 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-16 w-64" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error
  // ─────────────────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="text-muted-foreground pt-4">
        Failed to load donation history.
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // API response
  // ─────────────────────────────────────────────────────────────────────────

  const history = data?.donations ?? [];

  // ─────────────────────────────────────────────────────────────────────────
  // Empty
  // ─────────────────────────────────────────────────────────────────────────

  if (history.length === 0) {
    return (
      <div className="text-center p-8 bg-muted/20 rounded-lg border border-dashed mt-4">
        <p className="text-muted-foreground">
          No donation history recorded yet.
        </p>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Timeline
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pt-6 pl-2">
      {history.map((record, index) => {
        const donationDate = new Date(
          record.donationDate,
        );

        return (
          <div
            key={record.id}
            className="relative flex gap-6"
          >
            {/* Timeline Line */}
            {index !== history.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-[-24px] w-px bg-border" />
            )}

            {/* Timeline Dot */}
            <div className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/10">
              <div className="h-2 w-2 rounded-full bg-primary" />
            </div>

            {/* Content */}
            <div className="flex-1 pb-6">
              {/* Date */}
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />

                <span className="font-semibold text-sm">
                  {format(
                    donationDate,
                    "MMMM d, yyyy",
                  )}
                </span>
              </div>

              {/* Donation Card */}
              <div className="rounded-md border bg-card p-4 space-y-3 shadow-sm">
                <div className="grid sm:grid-cols-2 gap-4">
                  {/* Patient */}
                  <div className="flex items-start gap-2">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Patient
                      </p>

                      <p className="text-sm font-medium">
                        {record.patientName}
                      </p>
                    </div>
                  </div>

                  {/* Hospital */}
                  <div className="flex items-start gap-2">
                    <Building className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Hospital
                      </p>

                      <p className="text-sm font-medium">
                        {record.hospitalName}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {record.notes && (
                  <div className="flex items-start gap-2 pt-2 border-t">
                    <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />

                    <div>
                      <p className="text-xs text-muted-foreground">
                        Notes
                      </p>

                      <p className="text-sm italic">
                        {record.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}