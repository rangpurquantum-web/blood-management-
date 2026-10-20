"use client";

import { todayISO } from "@/lib/date-utils";
import { DateInput } from "@/components/ui/date-input";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  donationSchema,
  type DonationInput,
} from "@/features/donations/schemas";

import { useRecordDonation } from "@/features/donations/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function DonationForm({
  donorId,
  disabled = false,
  trigger,
}: {
  donorId: number;
  disabled?: boolean;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const recordDonation = useRecordDonation(donorId);

  // ─────────────────────────────────────────────────────────────────────────
  // Form
  // ─────────────────────────────────────────────────────────────────────────

  const form = useForm<DonationInput>({
    resolver: zodResolver(donationSchema),

    defaultValues: {
      patientName: "",
      hospitalName: "",
      donationDate: new Date(),
      notes: "",
    },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Submit
  // ─────────────────────────────────────────────────────────────────────────

  const onSubmit = (data: DonationInput) => {
    // Make sure donationDate is a real Date before sending it.
    const donationDate =
      data.donationDate instanceof Date
        ? data.donationDate
        : new Date(data.donationDate);

    if (Number.isNaN(donationDate.getTime())) {
      toast.error("Invalid donation date");
      return;
    }

    // Donation cannot be in the future.
    const now = new Date();

    // Compare only the calendar date.
    const selectedDate = new Date(
      donationDate.getFullYear(),
      donationDate.getMonth(),
      donationDate.getDate(),
    );

    const today = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    if (selectedDate > today) {
      toast.error("Donation date cannot be in the future");
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Send normalized date to API
    // ─────────────────────────────────────────────────────────────────────────

    recordDonation.mutate(
      {
        patientName: data.patientName.trim(),
        hospitalName: data.hospitalName.trim(),

        // ISO date sent to API
        donationDate: donationDate.toISOString(),

        notes: data.notes?.trim() || "",
      },

      {
        onSuccess: () => {
          toast.success(
            "Donation history recorded successfully. Donor eligibility has been recalculated.",
          );

          form.reset({
            patientName: "",
            hospitalName: "",
            donationDate: new Date(),
            notes: "",
          });

          setOpen(false);
        },

        onError: (err: any) => {
          toast.error(
            err?.error ||
              err?.message ||
              "Failed to record donation",
          );
        },
      },
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Dialog
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button disabled={disabled}>
            Record Donation
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            Record Donation History
          </DialogTitle>

          <DialogDescription>
            The donor will remain deferred until 120 days have
            passed from the donation date. After 120 days,
            eligibility will automatically become active.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 py-4"
        >
          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Patient Name */}
          {/* ─────────────────────────────────────────────────────────────── */}

          <div className="grid gap-2">
            <Label htmlFor="patientName">
              Patient Name
            </Label>

            <Input
              id="patientName"
              placeholder="Enter patient name"
              {...form.register("patientName")}
            />

            {form.formState.errors.patientName && (
              <span className="text-xs text-destructive">
                {
                  form.formState.errors.patientName
                    .message
                }
              </span>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Hospital */}
          {/* ─────────────────────────────────────────────────────────────── */}

          <div className="grid gap-2">
            <Label htmlFor="hospitalName">
              Hospital Name
            </Label>

            <Input
              id="hospitalName"
              placeholder="Enter hospital name"
              {...form.register("hospitalName")}
            />

            {form.formState.errors.hospitalName && (
              <span className="text-xs text-destructive">
                {
                  form.formState.errors.hospitalName
                    .message
                }
              </span>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Donation Date */}
          {/* ─────────────────────────────────────────────────────────────── */}

          <div className="grid gap-2">
            <Label htmlFor="donationDate">
              Donation Date
            </Label>

            <Controller control={form.control} name="donationDate" render={({ field }) => (<DateInput id="donationDate" value={field.value instanceof Date && !Number.isNaN(field.value.getTime()) ? formatDateForInput(field.value) : ""} onChange={(iso) => { if (!iso) { field.onChange(undefined); return; } const [y, m, d] = iso.split("-").map(Number); field.onChange(new Date(Number(y), Number(m) - 1, Number(d))); }} max={todayISO()} />)} />

            {form.formState.errors.donationDate && (
              <span className="text-xs text-destructive">
                {
                  form.formState.errors.donationDate
                    .message
                }
              </span>
            )}

            <p className="text-xs text-muted-foreground">
              Enter the actual date on which the blood
              donation happened.
            </p>
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Notes */}
          {/* ─────────────────────────────────────────────────────────────── */}

          <div className="grid gap-2">
            <Label htmlFor="notes">
              Notes (Optional)
            </Label>

            <Textarea
              id="notes"
              placeholder="Additional information..."
              {...form.register("notes")}
            />

            {form.formState.errors.notes && (
              <span className="text-xs text-destructive">
                {
                  form.formState.errors.notes.message
                }
              </span>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────── */}
          {/* Submit */}
          {/* ─────────────────────────────────────────────────────────────── */}

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={recordDonation.isPending}
            >
              {recordDonation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              {recordDonation.isPending
                ? "Saving..."
                : "Save Record"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}