"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { bloodRequestSchema, type BloodRequestInput } from "@/features/requests/schemas";
import { useCreateRequest } from "@/features/requests/hooks";
import { BLOOD_TYPES } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function RequestForm() {
  const [open, setOpen] = useState(false);
  const createRequest = useCreateRequest();

  const form = useForm<BloodRequestInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(bloodRequestSchema) as any,
    defaultValues: {
      patientName: "",
      bloodGroup: undefined,
      requiredUnits: 1,
      requiredDate: new Date(),
      contactPerson: "",
      contactNumber: "",
      notes: "",
      status: "Pending",
    },
  });

  const onSubmit = (data: BloodRequestInput) => {
    createRequest.mutate(data, {
      onSuccess: () => {
        toast.success("Blood request logged successfully");
        form.reset();
        setOpen(false);
      },
      onError: (err: any) => {
        toast.error(err.error || "Failed to log blood request");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>New Blood Request</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Blood Request</DialogTitle>
          <DialogDescription>
            Enter details for the required blood donation.
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
          
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Blood Group</Label>
              <Select onValueChange={(val: any) => form.setValue("bloodGroup", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.bloodGroup && (
                <span className="text-xs text-destructive">{form.formState.errors.bloodGroup.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="requiredUnits">Required Units</Label>
              <Input id="requiredUnits" type="number" min="1" {...form.register("requiredUnits", { valueAsNumber: true })} />
              {form.formState.errors.requiredUnits && (
                <span className="text-xs text-destructive">{form.formState.errors.requiredUnits.message}</span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="requiredDate">Required By (Target Date)</Label>
            <Input id="requiredDate" type="date" {...form.register("requiredDate")} />
            {form.formState.errors.requiredDate && (
              <span className="text-xs text-destructive">{form.formState.errors.requiredDate.message}</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="contactPerson">Contact Person</Label>
              <Input id="contactPerson" {...form.register("contactPerson")} />
              {form.formState.errors.contactPerson && (
                <span className="text-xs text-destructive">{form.formState.errors.contactPerson.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contactNumber">Contact Number</Label>
              <Input id="contactNumber" type="tel" {...form.register("contactNumber")} />
              {form.formState.errors.contactNumber && (
                <span className="text-xs text-destructive">{form.formState.errors.contactNumber.message}</span>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea id="notes" {...form.register("notes")} />
            {form.formState.errors.notes && (
              <span className="text-xs text-destructive">{form.formState.errors.notes.message}</span>
            )}
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
