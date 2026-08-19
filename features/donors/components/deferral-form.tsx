"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { donorEligibilitySchema, type DonorEligibilityInput } from "@/features/donors/schemas";
import { useDeferDonor } from "@/features/donors/hooks";

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

export function DeferralForm({
  donorId,
  trigger,
}: {
  donorId: number;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const deferDonor = useDeferDonor(donorId);

  const form = useForm<DonorEligibilityInput>({
    resolver: zodResolver(donorEligibilitySchema),
    defaultValues: {
      deferralReason: "",
      deferredUntil: new Date(),
    },
  });

  const onSubmit = (data: DonorEligibilityInput) => {
    deferDonor.mutate(
      {
        deferralReason: data.deferralReason,
        deferredUntil: data.deferredUntil.toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Donor has been manually deferred.");
          form.reset();
          setOpen(false);
        },
        onError: (err: any) => {
          toast.error(err.error || "Failed to defer donor");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" className="text-amber-600 border-amber-200 hover:bg-amber-50">
            <ShieldAlert className="mr-2 h-4 w-4" />
            Manual Deferral
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manual Donor Deferral</DialogTitle>
          <DialogDescription>
            Suspend this donor's eligibility for a specified time period due to medical or travel reasons.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="deferralReason">Reason for Deferral</Label>
            <Textarea
              id="deferralReason"
              placeholder="e.g., Recent travel to malaria-endemic region"
              {...form.register("deferralReason")}
            />
            {form.formState.errors.deferralReason && (
              <span className="text-xs text-destructive">{form.formState.errors.deferralReason.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="deferredUntil">Deferred Until</Label>
            <Input id="deferredUntil" type="date" {...form.register("deferredUntil")} />
            {form.formState.errors.deferredUntil && (
              <span className="text-xs text-destructive">{form.formState.errors.deferredUntil.message}</span>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" variant="destructive" disabled={deferDonor.isPending}>
              {deferDonor.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm Deferral
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}