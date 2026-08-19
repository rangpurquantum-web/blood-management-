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

  const today = new Date();
  const todayString = today.toISOString().split("T")[0];

  const form = useForm<DonationInput>({
    resolver: zodResolver(donationSchema),

    defaultValues: {
      patientName: "",
      hospitalName: "",
      donationDate: today,
      notes: "",
    },
  });

  const onSubmit = (data: DonationInput) => {
    // Make absolutely sure the date sent to the API is a Date.
    const donationDate =
      data.donationDate instanceof Date
        ? data.donationDate
        : new Date(data.donationDate);

    if (Number.isNaN(donationDate.getTime())) {
      toast.error("Invalid donation date");
      return;
    }

    if (donationDate > new Date()) {
      toast.error("Donation date cannot be in the future");
      return;
    }

    recordDonation.mutate(
      {
        ...data,
        donationDate: donationDate.toISOString(),
      },
      {
        onSuccess: () => {
          toast.success(
            "Donation history recorded successfully. Donor will be deferred for 120 days.",
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
            Recording a donation will automatically calculate
            the donor's eligibility using the 120-day waiting
            period.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid gap-4 py-4"
        >
          {/* Patient */}
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

          {/* Hospital */}
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

          {/* Donation Date */}
          <div className="grid gap-2">
            <Label htmlFor="donationDate">
              Donation Date
            </Label>

            <Input
              id="donationDate"
              type="date"
              max={todayString}
              {...form.register("donationDate", {
                setValueAs: (value) =>
                  value ? new Date(`${value}T00:00:00`) : value,
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
          </div>

          {/* Notes */}
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
                {form.formState.errors.notes.message}
              </span>
            )}
          </div>

          {/* Submit */}
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