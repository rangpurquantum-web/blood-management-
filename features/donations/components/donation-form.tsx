"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { donationSchema, type DonationInput } from "@/features/donations/schemas";
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
  disabled,
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
    recordDonation.mutate(data, {
      onSuccess: () => {
        toast.success("Donation history recorded. Donor is now deferred for 56 days.");
        form.reset();
        setOpen(false);
      },
      onError: (err: any) => {
        toast.error(err.error || "Failed to record donation");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button disabled={disabled}>Record Donation</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Donation History</DialogTitle>
          <DialogDescription>
            Logging a donation will automatically mark the donor as deferred for 56 days.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="patientName">Patient Name</Label>
            <Input id="patientName" {...form.register("patientName")} />
            {form.formState.errors.patientName && (
              <span className="text-xs text-destructive">{form.formState.errors.patientName.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="hospitalName">Hospital Name</Label>
            <Input id="hospitalName" {...form.register("hospitalName")} />
            {form.formState.errors.hospitalName && (
              <span className="text-xs text-destructive">{form.formState.errors.hospitalName.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="donationDate">Donation Date</Label>
            <Input id="donationDate" type="date" {...form.register("donationDate")} />
            {form.formState.errors.donationDate && (
              <span className="text-xs text-destructive">{form.formState.errors.donationDate.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" {...form.register("notes")} />
            {form.formState.errors.notes && (
              <span className="text-xs text-destructive">{form.formState.errors.notes.message}</span>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={recordDonation.isPending}>
              {recordDonation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Record
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}