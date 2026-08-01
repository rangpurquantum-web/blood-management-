"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Droplet, Heart, CheckCircle2, Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
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
        toast.success("আপনার আবেদন জমা হয়েছে");
      },
      onError: (err: any) => {
        const msg = err.error || "আবেদন জমা দিতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন।";
        setServerError(msg);
        toast.error(msg);
      },
    });
  };

  const errors = form.formState.errors as any;

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      {/* Header Branding */}
      <div className="w-full max-w-xl mb-6 text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
          <Droplet className="h-8 w-8 text-destructive fill-destructive" />
          <span>Blood Management System</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          রক্তদান করে জীবন বাঁচান — স্বেচ্ছায় রক্তদাতা হিসেবে নিবন্ধন করুন
        </p>
      </div>

      <Card className="w-full max-w-xl shadow-lg border-muted bg-card">
        {submittedSuccess ? (
          <CardContent className="pt-8 pb-8 px-6 text-center space-y-6">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">ধন্যবাদ!</h2>
              <p className="text-base font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 py-3 px-4 rounded-lg">
                আপনার আবেদন জমা হয়েছে, রিভিউ করার পর অনুমোদন করা হবে
              </p>
              <p className="text-sm text-muted-foreground pt-2">
                আমাদের এডমিন প্যানেল আপনার দেওয়া তথ্য যাচাই-বাছাই করে দ্রুতই রক্তদাতা হিসেবে তালিকাভুক্ত করবেন।
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
                আরেকটি আবেদন করুন
              </Button>
              <Button asChild>
                <Link href="/">হোমপেজে ফিরে যান</Link>
              </Button>
            </div>
          </CardContent>
        ) : (
          <>
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-xl flex items-center gap-2">
                <Heart className="h-5 w-5 text-destructive" />
                স্বেচ্ছায় রক্তদাতা রেজিস্ট্রেশন ফর্ম
              </CardTitle>
              <CardDescription>
                নিচের ফর্মে আপনার সঠিক তথ্য প্রদান করে আবেদন জমা দিন।
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-6">
              {serverError && (
                <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm space-y-1">
                  <p className="font-semibold">রেজিস্ট্রেশন ব্যর্থ হয়েছে</p>
                  <p>{serverError}</p>
                </div>
              )}

              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {/* Full Name */}
                <div className="grid gap-2">
                  <Label htmlFor="fullName" className="font-semibold">
                    পূর্ণ নাম <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    placeholder="আপনার পূর্ণ নাম লিখুন"
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
                      জন্ম তারিখ <span className="text-destructive">*</span>
                    </Label>
                    <Input id="dob" type="date" {...form.register("dob")} />
                    {errors.dob && (
                      <span className="text-xs text-destructive">{errors.dob.message}</span>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label className="font-semibold">
                      লিঙ্গ <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      defaultValue={form.getValues("gender")}
                      onValueChange={(val) => form.setValue("gender", val)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="লিঙ্গ নির্বাচন করুন" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">পুরুষ (Male)</SelectItem>
                        <SelectItem value="Female">নারী (Female)</SelectItem>
                        <SelectItem value="Other">অন্যান্য (Other)</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.gender && (
                      <span className="text-xs text-destructive">{errors.gender.message}</span>
                    )}
                  </div>
                </div>

                {/* Blood Group */}
                <div className="grid gap-2">
                  <Label className="font-semibold">
                    ব্লাড গ্রুপ <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    defaultValue={form.getValues("bloodType")}
                    onValueChange={(val: any) => form.setValue("bloodType", val)}
                  >
                    <SelectTrigger className="font-mono">
                      <SelectValue placeholder="ব্লাড গ্রুপ নির্বাচন করুন" />
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
                      ফোন নম্বরসমূহ <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-xs text-muted-foreground">
                      একাধিক নম্বর যোগ করতে পারেন, একটি Primary হিসেবে নির্বাচন করুন
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
                            <Label className="text-xs text-muted-foreground">মোবাইল নম্বর</Label>
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
                            <Label className="text-xs text-muted-foreground">লেবেল (ঐচ্ছিক)</Label>
                            <Input
                              placeholder="যেমন: ব্যক্তিগত"
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
                              {isPrimarySelected ? "Primary নম্বর" : "Primary হিসেবে সেট করুন"}
                            </span>
                          </label>

                          {fields.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 mt-2"
                              onClick={() => remove(index)}
                            >
                              <Trash2 className="h-4 w-4" />
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
                    <Plus className="mr-2 h-4 w-4" /> আরও ফোন নম্বর যোগ করুন
                  </Button>
                </div>

                {/* Email (Optional) */}
                <div className="grid gap-2">
                  <Label htmlFor="email" className="font-semibold">
                    ইমেইল ঠিকানা <span className="text-muted-foreground text-xs">(ঐচ্ছিক)</span>
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
                    বর্তমান ঠিকানা / এলাকা <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="address"
                    placeholder="জেলা, উপজেলা, ইউনিয়ন বা এলাকা উল্লেখ করুন"
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
                    className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    <ArrowLeft className="h-4 w-4" /> ফিরে যান
                  </Link>

                  <Button type="submit" size="lg" disabled={publicRegister.isPending} className="w-full sm:w-auto">
                    {publicRegister.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        আবেদন জমা হচ্ছে...
                      </>
                    ) : (
                      "আবেদন জমা দিন"
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
}