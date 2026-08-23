"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

import { registerSchema, RegisterInput } from "@/features/donors/schemas";
import { usePublicRegisterDonor, usePublicBranches } from "@/features/donors/hooks";
import { BLOOD_TYPES } from "@/types";

import { Button, buttonVariants } from "@/components/ui/button";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Step definitions ────────────────────────────────────────────────────────
// প্রতিটা ধাপে কোন কোন ফিল্ড validate হবে সেটা এখানে ম্যাপ করা

const STEPS = [
  { key: "branch", title: "Select Your Branch", fields: ["branchId"] },
  { key: "name", title: "What's your name?", fields: ["fullName"] },
  { key: "personal", title: "Personal Details", fields: ["dob", "gender"] },
  { key: "bloodType", title: "Blood Group", fields: ["bloodType"] },
  { key: "phone", title: "Phone Number", fields: ["phone"] },
  { key: "contact", title: "Contact & Address", fields: ["email", "address"] },
  { key: "review", title: "Almost done", fields: ["lastDonationDate"] },
] as const;

export default function PublicRegisterPage() {
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);

  const publicRegister = usePublicRegisterDonor();
  const { data: branches, isLoading: branchesLoading } = usePublicBranches();

  const form = useForm<any>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
    defaultValues: {
      branchId: "",
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

  const errors = form.formState.errors as any;
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const currentStep = STEPS[stepIndex] ?? STEPS[0];

  const handleNext = async () => {
    const fieldsToValidate = currentStep.fields as any;
    const valid = await form.trigger(fieldsToValidate);
    if (!valid) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const handleBack = () => {
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const onSubmit = (values: RegisterInput) => {
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
                    setStepIndex(0);
                    form.reset();
                  }}
                >
                  Submit Another Application
                </Button>
                <Link href="/" className={buttonVariants({ variant: "default" })}>
                  Back to Home
                </Link>
              </div>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b pb-4 space-y-3">
                <CardTitle className="text-xl">
                  Voluntary Blood Donor Registration
                </CardTitle>

                {/* ── Step Progress Indicator ────────────────────────── */}
                <div className="flex items-center gap-1.5">
                  {STEPS.map((s, idx) => (
                    <div
                      key={s.key}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        idx <= stepIndex ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Step {stepIndex + 1} of {STEPS.length}
                </p>
              </CardHeader>

              <CardContent className="pt-6">
                {serverError && (
                  <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm space-y-1">
                    <p className="font-semibold">Registration Failed</p>
                    <p>{serverError}</p>
                  </div>
                )}

                <form
                  onSubmit={
                    isLastStep
                      ? form.handleSubmit(onSubmit)
                      : (e) => {
                          e.preventDefault();
                          handleNext();
                        }
                  }
                  className="space-y-5 min-h-[280px] flex flex-col"
                >
                  <div className="flex-1 space-y-5">
                    <h3 className="text-lg font-semibold text-foreground">
                      {currentStep.title}
                    </h3>

                    {/* ── Step 1: Branch ─────────────────────────────── */}
                    {currentStep.key === "branch" && (
                      <div className="grid gap-2">
                        <Label className="font-semibold">
                          Branch / Area <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          disabled={branchesLoading}
                          defaultValue={form.getValues("branchId")}
                          onValueChange={(val) => form.setValue("branchId", val)}
                        >
                          <SelectTrigger>
                            <SelectValue
                              placeholder={branchesLoading ? "Loading branches..." : "Select your branch"}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {branches?.map((b) => (
                              <SelectItem key={b.id} value={String(b.id)}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.branchId && (
                          <span className="text-xs text-destructive">{errors.branchId.message}</span>
                        )}
                      </div>
                    )}

                    {/* ── Step 2: Full Name ──────────────────────────── */}
                    {currentStep.key === "name" && (
                      <div className="grid gap-2">
                        <Label htmlFor="fullName" className="font-semibold">
                          Full Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="fullName"
                          placeholder="Enter your full name"
                          autoFocus
                          {...form.register("fullName")}
                        />
                        {errors.fullName && (
                          <span className="text-xs text-destructive">{errors.fullName.message}</span>
                        )}
                      </div>
                    )}

                    {/* ── Step 3: DOB & Gender ───────────────────────── */}
                    {currentStep.key === "personal" && (
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
                    )}

                    {/* ── Step 4: Blood Group ────────────────────────── */}
                    {currentStep.key === "bloodType" && (
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
                    )}

                    {/* ── Step 5: Phone Numbers ──────────────────────── */}
                    {currentStep.key === "phone" && (
                      <div className="space-y-3">
                        <span className="text-xs text-muted-foreground block">
                          You can add multiple numbers; select one as Primary
                        </span>

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
                    )}

                    {/* ── Step 6: Email + Address ────────────────────── */}
                    {currentStep.key === "contact" && (
                      <div className="space-y-4">
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
                      </div>
                    )}

                    {/* ── Step 7: Last Donation Date + Review ───────── */}
                    {currentStep.key === "review" && (
                      <div className="space-y-5">
                        <div className="grid gap-2">
                          <Label htmlFor="lastDonationDate" className="font-semibold">
                            Last Donation Date{" "}
                            <span className="text-muted-foreground text-xs font-normal">
                              (optional — if you&apos;ve donated blood before)
                            </span>
                          </Label>
                          <Input id="lastDonationDate" type="date" {...form.register("lastDonationDate")} />
                        </div>

                        <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <Check className="h-4 w-4 text-emerald-600" />
                            Review your details
                          </p>
                          <div className="text-muted-foreground space-y-1">
                            <p>Name: <span className="text-foreground">{form.getValues("fullName") || "-"}</span></p>
                            <p>Blood Group: <span className="text-foreground font-mono">{form.getValues("bloodType")}</span></p>
                            <p>Phone: <span className="text-foreground font-mono">{form.getValues("phone")?.[0]?.number || "-"}</span></p>
                            <p>Address: <span className="text-foreground">{form.getValues("address") || "-"}</span></p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ── Navigation ─────────────────────────────────────── */}
                  <div className="pt-4 flex items-center justify-between gap-4 border-t">
                    {isFirstStep ? (
                      <Link
                        href="/"
                        className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back to Home
                      </Link>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleBack}
                        className="flex items-center gap-1"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                      </Button>
                    )}

                    {isLastStep ? (
                      <Button type="submit" size="lg" disabled={publicRegister.isPending}>
                        {publicRegister.isPending ? "Submitting..." : "Submit Application"}
                      </Button>
                    ) : (
                      <Button type="submit" className="flex items-center gap-1">
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    )}
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