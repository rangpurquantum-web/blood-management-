"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { donorSchema, DonorInput } from "@/features/donors/schemas";
import { usePublicRegisterDonor } from "@/features/donors/hooks";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PublicRegisterPage() {
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const publicRegister = usePublicRegisterDonor();

  const form = useForm<any>({
    resolver: zodResolver(donorSchema),
    defaultValues: {
      fullName: "",
      dob: "",
      gender: "Male",
      bloodType: "A+",
      phone: [{ number: "", label: "", isPrimary: true }],
      email: "",
      address: "",
      lastDonationDate: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "phone",
  });

  const setPrimary = (selectedIndex: number) => {
    const currentPhones = form.getValues("phone");
    currentPhones.forEach((_: any, idx: number) => {
      form.setValue(`phone.${idx}.isPrimary`, idx === selectedIndex);
    });
  };

  const onSubmit = (values: DonorInput) => {
    setServerError(null);
    publicRegister.mutate(values, {
      onSuccess: () => {
        setSubmittedSuccess(true);
        toast.success("Your application has been submitted");
      },
      onError: (err: any) => {
        const msg = err.error || "Failed to submit application. Please try again.";
        setServerError(msg);
        toast.error(msg);
      },
    });
  };

  const errors = form.formState.errors as any;

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#3D0B12]">
      {/* Ambient gradient blobs — matches homepage & check-donation */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-70"
          style={{ background: "radial-gradient(circle at 30% 30%, #FF7A8A, #B91C3C 60%, transparent 75%)" }}
        />
        <div
          className="absolute top-1/4 -right-32 h-[480px] w-[480px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle at 60% 40%, #F0576B, #7A1220 65%, transparent 75%)" }}
        />
      </div>

      <div className="relative z-10 min-h-screen py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
        <div className="w-full max-w-xl mb-6 text-center space-y-2">
          <Link href="/" className="inline-block text-white font-bold text-2xl tracking-tight">
            Quantum Blood Donor Pool
          </Link>
        </div>

        <Card className="w-full max-w-xl shadow-2xl border-0 bg-white">
          {submittedSuccess ? (
            <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-foreground">Thank you</h2>
                <p className="text-base font-medium text-emerald-700 bg-emerald-500/10 py-3 px-4 rounded-lg">
                  Your application has been submitted and will be reviewed for approval.
                </p>
                <p className="text-sm text-muted-foreground pt-2">
                  Our admin team will verify your information and add you to the donor directory shortly.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSubmittedSuccess(false);
                    form.reset();
                  }}
                >
                  Submit Another Application
                </Button>
                <Button asChild>
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-xl">
                  Voluntary Blood Donor Registration
                </CardTitle>
                <CardDescription>
                  Fill in your accurate information below to submit your application.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6">
                {serverError && (
                  <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm space-y-1">
                    <p className="font-semibold">Registration Failed</p>
                    <p>{serverError}</p>
                  </div>
                )}

                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                  {/* Full Name */}
                  <div className="grid gap-2">
                    <Label htmlFor="fullName" className="font-semibold">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      placeholder="Enter your full name"
                      {...form.register("fullName")}
                    />
                    {errors.fullName && (
                      <span className="text-xs text-destructive">{errors.fullName.message}</span>
                    )}
                  </div>

                  {/* DOB & Gender */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="dob" className="font-semibold">
                        Date of Birth <span className="text-muted-foreground text-xs font-normal">(optional)</span>
                      </Label>
                      <Input id="dob" type="date" {...form.register("dob")} />
                      {errors.dob && (
                        <span className="text-xs text-destructive">{errors.dob.message}</span>
                      )}
                    </div>

                    <div className="grid gap-2">
                      <Label className="font-semibold">
                        Gender <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        defaultValue={form.getValues("gender")}
                        onValueChange={(val) => form.setValue("gender", val)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
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

                  {/* Last Donation Date (Optional) */}
                  <div className="grid gap-2">
                    <Label htmlFor="lastDonationDate" className="font-semibold">
                      Last Donation Date <span className="text-muted-foreground text-xs font-normal">(optional — if you&apos;ve donated blood before)</span>
                    </Label>
                    <Input id="lastDonationDate" type="date" {...form.register("lastDonationDate")} />
                  </div>

                  {/* Blood Group */}
                  <div className="grid gap-2">
                    <Label className="font-semibold">
                      Blood Group <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      defaultValue={form.getValues("bloodType")}
                      onValueChange={(val: any) => form.setValue("bloodType", val)}
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_TYPES.map((bt) => (
                          <SelectItem key={bt} value={bt} className="font-mono">
                            {bt}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bloodType && (
                      <span className="text-xs text-destructive">{errors.bloodType.message}</span>
                    )}
                  </div>

                  {/* Dynamic Phone Numbers Section */}
                  <div className="space-y-3 border p-4 rounded-lg bg-muted/10">
                    <div className="flex flex-col gap-0.5">
                      <Label className="font-semibold">
                        Phone Numbers <span className="text-destructive">*</span>
                      </Label>
                      <span className="text-xs text-muted-foreground">
                        You can add multiple numbers; select one as Primary
                      </span>
                    </div>

                    {fields.map((field, index) => {
                      const isPrimarySelected = form.watch(`phone.${index}.isPrimary`);
                      return (
                        <div
                          key={field.id}
                          className={`rounded-lg border bg-background p-3 space-y-3 transition-colors ${
                            isPrimarySelected ? "border-primary/40 ring-1 ring-primary/20" : ""
                          }`}
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                            <div className="grid gap-1">
                              <Label className="text-xs text-muted-foreground">Mobile Number</Label>
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

                            <div className="grid gap-1 sm:w-[140px]">
                              <Label className="text-xs text-muted-foreground">Label</Label>
                              <Input
                                placeholder="e.g. Personal"
                                {...form.register(`phone.${index}.label` as const)}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t">
                            <label
                              htmlFor={`primary-${index}`}
                              className="flex items-center gap-2 text-sm cursor-pointer select-none pt-2"
                            >
                              <input
                                id={`primary-${index}`}
                                type="radio"
                                checked={isPrimarySelected}
                                onChange={() => setPrimary(index)}
                                className="h-4 w-4 accent-primary cursor-pointer"
                              />
                              <span className={isPrimarySelected ? "font-medium text-primary" : "text-muted-foreground"}>
                                {isPrimarySelected ? "Primary number" : "Set as Primary"}
                              </span>
                            </label>

                            {fields.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive hover:bg-destructive/10 mt-2"
                                onClick={() => remove(index)}
                              >
                                Remove
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {errors.phone?.root && (
                      <span className="text-xs text-destructive block">
                        {errors.phone.root.message}
                      </span>
                    )}

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => append({ number: "", label: "", isPrimary: false })}
                      className="w-full mt-2"
                    >
                      Add Another Phone Number
                    </Button>
                  </div>

                  {/* Email (Optional) */}
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="font-semibold">
                      Email Address <span className="text-muted-foreground text-xs">(optional)</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@mail.com"
                      {...form.register("email")}
                    />
                    {errors.email && (
                      <span className="text-xs text-destructive">{errors.email.message}</span>
                    )}
                  </div>

                  {/* Address / Area */}
                  <div className="grid gap-2">
                    <Label htmlFor="address" className="font-semibold">
                      Current Address / Area <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="address"
                      placeholder="Mention district, upazila, union, or area"
                      rows={3}
                      {...form.register("address")}
                    />
                    {errors.address && (
                      <span className="text-xs text-destructive">{errors.address.message}</span>
                    )}
                  </div>

                  {/* Submit Action */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row items-center sm:justify-between gap-4">
                    <Link
                      href="/"
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      Back
                    </Link>

                    <Button type="submit" size="lg" disabled={publicRegister.isPending} className="w-full sm:w-auto">
                      {publicRegister.isPending ? "Submitting..." : "Submit Application"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
