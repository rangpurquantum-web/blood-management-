"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { donorSchema, type DonorInput } from "@/features/donors/schemas";
import { useCreateDonor } from "@/features/donors/hooks";
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

export function DonorForm({ onSuccess }: { onSuccess?: () => void }) {
  const [open, setOpen] = useState(false);
  const createDonor = useCreateDonor();

  const form = useForm<DonorInput>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullName: "",
      gender: "",
      bloodType: undefined,
      phone: "",
      email: "",
      address: "",
    },
  });

  const onSubmit = (data: DonorInput) => {
    createDonor.mutate(data, {
      onSuccess: () => {
        toast.success("Donor registered successfully");
        form.reset();
        setOpen(false);
        onSuccess?.();
      },
      onError: (err: any) => {
        toast.error(err.error || "Failed to register donor");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Register New Donor</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Register Donor</DialogTitle>
          <DialogDescription>
            Enter the donor's details below to register them in the system.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...form.register("fullName")} />
            {form.formState.errors.fullName && (
              <span className="text-xs text-destructive">{form.formState.errors.fullName.message}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" {...form.register("dob")} />
              {form.formState.errors.dob && (
                <span className="text-xs text-destructive">{form.formState.errors.dob.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select onValueChange={(val) => form.setValue("gender", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <span className="text-xs text-destructive">{form.formState.errors.gender.message}</span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Blood Type</Label>
              <Select onValueChange={(val: any) => form.setValue("bloodType", val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.bloodType && (
                <span className="text-xs text-destructive">{form.formState.errors.bloodType.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" type="tel" {...form.register("phone")} />
              {form.formState.errors.phone && (
                <span className="text-xs text-destructive">{form.formState.errors.phone.message}</span>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <span className="text-xs text-destructive">{form.formState.errors.email.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...form.register("address")} />
            {form.formState.errors.address && (
              <span className="text-xs text-destructive">{form.formState.errors.address.message}</span>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={createDonor.isPending}>
              {createDonor.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Donor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
