"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
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

  const form = useForm<DonationInput>({
    resolver: zodResolver(donationSchema),

    defaultValues: {
      patientName: "",
      hospitalName: "",
      donationDate: new Date(),
      notes: "",
    },
  });

  const onSubmit = (data: DonationInput) => {
    // ─────────────────────────────────────────────────────────────────────────
    // Safely convert donation date to Date
    // ─────────────────────────────────────────────────────────────────────────

    const donationDate =
      data.donationDate instanceof Date
        ? data.donationDate
        : new Date(data.donationDate);

    if (Number.isNaN(donationDate.getTime())) {
      toast.error("Invalid donation date");
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Prevent future donation date
    // ─────────────────────────────────────────────────────────────────────────

    const today = new Date();

    today.setHours(23, 59, 59, 999);

    if (donationDate > today) {
      toast.error("Donation date cannot be in the future");
      return;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Send donation to API
    // ─────────────────────────────────────────────────────────────────────────

    recordDonation.mutate(
      {
        patientName: data.patientName.trim(),

        hospitalName: data.hospitalName.trim(),

        donationDate: donationDate.toISOString(),

        notes: data.notes?.trim() || "",
      },
      {
        onSuccess: () => {
          toast.success(
            "Donation history recorded successfully."
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
              "Failed to record donation"
          );
        },
      }
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >
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
            A donor will remain deferred until 120 days
            have passed from the donation date.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 py-4"
        >
          {/* ──────────────────────────────────────────────────────────────── */}
          {/* Patient Name */}
          {/* ──────────────────────────────────────────────────────────────── */}

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

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* Hospital Name */}
          {/* ──────────────────────────────────────────────────────────────── */}

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

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* Donation Date */}
          {/* ──────────────────────────────────────────────────────────────── */}

          <div className="grid gap-2">
            <Label htmlFor="donationDate">
              Donation Date
            </Label>

            <Input
              id="donationDate"
              type="date"
              {...form.register("donationDate", {
                setValueAs: (value) => {
                  if (!value) {
                    return undefined;
                  }

                  const [
                    year,
                    month,
                    day,
                  ] = value
                    .split("-")
                    .map(Number);

                  // Use local noon to prevent
                  // timezone shifting the date.
                  return new Date(
                    year,
                    month - 1,
                    day,
                    12,
                    0,
                    0,
                    0
                  );
                },
              })}
            />

            {form.formState.errors.donationDate && (
              <span className="text-xs text-destructive">
                {
                  form.formState.errors.donationDate
                    .message
                }
              </span>
            )}

            <p className="text-xs text-muted-foreground">
              Eligibility is calculated automatically
              using 120 days from this date.
            </p>
          </div>

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* Notes */}
          {/* ──────────────────────────────────────────────────────────────── */}

          <div className="grid gap-2">
            <Label htmlFor="notes">
              Notes (Optional)
            </Label>

            <Textarea
              id="notes"
              placeholder="Optional notes..."
              {...form.register("notes")}
            />

            {form.formState.errors.notes && (
              <span className="text-xs text-destructive">
                {
                  form.formState.errors.notes
                    .message
                }
              </span>
            )}
          </div>

          {/* ──────────────────────────────────────────────────────────────── */}
          {/* Submit */}
          {/* ──────────────────────────────────────────────────────────────── */}

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={recordDonation.isPending}
            >
              {recordDonation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}

              Save Record
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}