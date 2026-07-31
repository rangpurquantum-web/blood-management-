"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

import { donorSchema, type DonorInput } from "@/features/donors/schemas";
import { useCreateDonor, useUpdateDonor } from "@/features/donors/hooks";
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

export function DonorForm({
  donor,
  onSuccess,
  trigger,
}: {
  donor?: any;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createDonor = useCreateDonor();
  const updateDonor = useUpdateDonor(donor?.id ?? 0);
  const isPending = createDonor.isPending || updateDonor.isPending;

  const form = useForm<any>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullName: donor?.fullName || "",
      dob: donor?.dob ? new Date(donor.dob).toISOString().split("T")[0] : "",
      gender: donor?.gender || "",
      bloodType: donor?.bloodType || undefined,
      phone: donor?.phone && donor.phone.length > 0
        ? donor.phone.map((p: any) => ({ number: p.number, label: p.label, isPrimary: p.isPrimary }))
        : [{ number: "", label: "Primary", isPrimary: true }],
      email: donor?.email || "",
      address: donor?.address || "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phone",
  });

  const setPrimary = (index: number) => {
    fields.forEach((_, idx) => {
      form.setValue(`phone.${idx}.isPrimary`, idx === index);
    });
  };

  const onSubmit = (data: any) => {
    const submitData = {
      ...data,
      dob: new Date(data.dob),
    };
    if (donor) {
      updateDonor.mutate(submitData, {
        onSuccess: () => {
          toast.success("Donor updated successfully");
          setOpen(false);
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err.error || "Failed to update donor");
        },
      });
    } else {
      createDonor.mutate(submitData, {
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
    }
  };

  const errors = form.formState.errors as any;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Register New Donor</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{donor ? "Edit Donor Profile" : "Register Donor"}</DialogTitle>
          <DialogDescription>
            {donor
              ? "Update the donor's details below."
              : "Enter the donor's details below to register them in the system."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="fullName">Full Name</Label>
            <Input id="fullName" {...form.register("fullName")} />
            {errors.fullName && (
              <span className="text-xs text-destructive">{errors.fullName.message}</span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input id="dob" type="date" {...form.register("dob")} />
              {errors.dob && (
                <span className="text-xs text-destructive">{errors.dob.message}</span>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Gender</Label>
              <Select
                defaultValue={form.getValues("gender")}
                onValueChange={(val) => form.setValue("gender", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {errors.gender && (
                <span className="text-xs text-destructive">{errors.gender.message}</span>
              )}
            </div>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Blood Type</Label>
              <Select
                defaultValue={form.getValues("bloodType")}
                onValueChange={(val: any) => form.setValue("bloodType", val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {BLOOD_TYPES.map((bt) => (
                    <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.bloodType && (
                <span className="text-xs text-destructive">{errors.bloodType.message}</span>
              )}
            </div>
          </div>

          {/* Dynamic Phone Numbers Section */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Phone Numbers</Label>
            {fields.map((field, index) => (
              <div key={field.id} className="flex gap-2 items-start border p-3 rounded-lg bg-muted/20 relative">
                <div className="grid gap-1 flex-1">
                  <Label className="text-xs text-muted-foreground">Phone Number</Label>
                  <Input
                    placeholder="01XXXXXXXXX"
                    {...form.register(`phone.${index}.number` as const)}
                  />
                  {errors.phone?.[index]?.number && (
                    <span className="text-[11px] text-destructive">
                      {errors.phone[index].number.message}
                    </span>
                  )}
                </div>

                <div className="w-[120px] grid gap-1">
                  <Label className="text-xs text-muted-foreground">Label</Label>
                  <Input
                    placeholder="e.g. Primary"
                    {...form.register(`phone.${index}.label` as const)}
                  />
                  {errors.phone?.[index]?.label && (
                    <span className="text-[11px] text-destructive">
                      {errors.phone[index].label.message}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-center gap-1.5 px-2 self-center">
                  <span className="text-[10px] text-muted-foreground font-medium uppercase">Primary</span>
                  <input
                    type="radio"
                    checked={form.watch(`phone.${index}.isPrimary`)}
                    onChange={() => setPrimary(index)}
                    className="h-4 w-4 accent-primary cursor-pointer"
                  />
                </div>

                {fields.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 self-center"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}

            {errors.phone?.root && (
              <span className="text-xs text-destructive block">
                {errors.phone.root.message}
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ number: "", label: "Secondary", isPrimary: false })}
              className="w-full"
            >
              Add Number
            </Button>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...form.register("email")} />
            {errors.email && (
              <span className="text-xs text-destructive">{errors.email.message}</span>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...form.register("address")} />
            {errors.address && (
              <span className="text-xs text-destructive">{errors.address.message}</span>
            )}
          </div>
          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Donor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
