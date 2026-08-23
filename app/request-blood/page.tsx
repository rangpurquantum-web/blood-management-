"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, MessageCircle, Phone } from "lucide-react";

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BRANCHES = [
  { name: "Rangpur", phone: "+8801783015101" },
  { name: "Rajshahi", phone: "+8801914999446" },
];

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const STEPS = [
  { key: "branch", title: "Select Branch" },
  { key: "patient", title: "Patient's Name" },
  { key: "hospital", title: "Hospital" },
  { key: "bloodGroup", title: "Blood Group" },
  { key: "emergency", title: "Emergency?" },
  { key: "contact", title: "Contact Number" },
  { key: "review", title: "Review & Send" },
] as const;

interface FormState {
  branchIndex: number | null;
  patientName: string;
  hospital: string;
  bloodGroup: string;
  emergency: boolean | null;
  contactPhone: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  branchIndex: null,
  patientName: "",
  hospital: "",
  bloodGroup: "",
  emergency: null,
  contactPhone: "",
  notes: "",
};

function toDigits(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

function buildWhatsAppMessage(data: FormState) {
  const lines = [
    `*রক্তের জরুরি অনুরোধ*`,
    ``,
    `*রোগীর নাম:* ${data.patientName}`,
    `*হাসপাতাল:* ${data.hospital}`,
    `*রক্তের গ্রুপ:* ${data.bloodGroup}`,
    `*জরুরি:* ${data.emergency ? "হ্যাঁ, এখনই প্রয়োজন" : "না"}`,
    `*যোগাযোগ নম্বর:* ${data.contactPhone}`,
  ];

  if (data.notes.trim()) {
    lines.push(``, `_অতিরিক্ত তথ্য:_`, data.notes.trim());
  }

  return lines.join("\n");
}

export default function RequestBloodPage() {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === STEPS.length - 1;
  const currentStep = STEPS[stepIndex] ?? STEPS[0];
  const selectedBranch =
    form.branchIndex !== null ? BRANCHES[form.branchIndex] : null;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validateStep(): boolean {
    setError(null);
    switch (currentStep.key) {
      case "branch":
        if (form.branchIndex === null) {
          setError("অনুগ্রহ করে একটি শাখা নির্বাচন করুন");
          return false;
        }
        return true;
      case "patient":
        if (!form.patientName.trim()) {
          setError("রোগীর নাম লিখুন");
          return false;
        }
        return true;
      case "hospital":
        if (!form.hospital.trim()) {
          setError("হাসপাতালের নাম লিখুন");
          return false;
        }
        return true;
      case "bloodGroup":
        if (!form.bloodGroup) {
          setError("রক্তের গ্রুপ নির্বাচন করুন");
          return false;
        }
        return true;
      case "emergency":
        if (form.emergency === null) {
          setError("অনুগ্রহ করে একটি অপশন নির্বাচন করুন");
          return false;
        }
        return true;
      case "contact":
        if (!form.contactPhone.trim()) {
          setError("যোগাযোগের নম্বর লিখুন");
          return false;
        }
        return true;
      default:
        return true;
    }
  }

  function handleNext() {
    if (!validateStep()) return;
    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  }

  function handleBack() {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  function handleSend() {
    if (!selectedBranch) return;
    const message = buildWhatsAppMessage(form);
    const digits = toDigits(selectedBranch.phone);
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#3D0B12]">
      {/* Ambient gradient blobs — matches homepage & other pages */}
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
          <CardHeader className="border-b pb-4 space-y-3">
            <CardTitle className="text-xl">Request Blood</CardTitle>

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
            {error && (
              <div className="mb-6 p-4 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (isLastStep) {
                  handleSend();
                } else {
                  handleNext();
                }
              }}
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
                      Branch <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      defaultValue={
                        form.branchIndex !== null ? String(form.branchIndex) : undefined
                      }
                      onValueChange={(val) => update("branchIndex", Number(val))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {BRANCHES.map((b, idx) => (
                          <SelectItem key={b.name} value={String(idx)}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ── Step 2: Patient Name ───────────────────────── */}
                {currentStep.key === "patient" && (
                  <div className="grid gap-2">
                    <Label htmlFor="patientName" className="font-semibold">
                      Patient&apos;s Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="patientName"
                      placeholder="রোগীর নাম লিখুন"
                      autoFocus
                      value={form.patientName}
                      onChange={(e) => update("patientName", e.target.value)}
                    />
                  </div>
                )}

                {/* ── Step 3: Hospital ────────────────────────────── */}
                {currentStep.key === "hospital" && (
                  <div className="grid gap-2">
                    <Label htmlFor="hospital" className="font-semibold">
                      Hospital <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="hospital"
                      placeholder="হাসপাতালের নাম লিখুন"
                      autoFocus
                      value={form.hospital}
                      onChange={(e) => update("hospital", e.target.value)}
                    />
                  </div>
                )}

                {/* ── Step 4: Blood Group ─────────────────────────── */}
                {currentStep.key === "bloodGroup" && (
                  <div className="grid gap-2">
                    <Label className="font-semibold">
                      Blood Group <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      defaultValue={form.bloodGroup || undefined}
                      onValueChange={(val) => update("bloodGroup", val)}
                    >
                      <SelectTrigger className="font-mono">
                        <SelectValue placeholder="Select blood group" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOOD_GROUPS.map((bg) => (
                          <SelectItem key={bg} value={bg} className="font-mono">
                            {bg}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* ── Step 5: Emergency ───────────────────────────── */}
                {currentStep.key === "emergency" && (
                  <div className="grid gap-2">
                    <Label className="font-semibold">
                      Is this urgent? <span className="text-destructive">*</span>
                    </Label>
                    <div className="flex gap-3">
                      <Button
                        type="button"
                        variant={form.emergency === true ? "default" : "outline"}
                        className={
                          form.emergency === true
                            ? "flex-1 bg-red-600 hover:bg-red-600"
                            : "flex-1"
                        }
                        onClick={() => update("emergency", true)}
                      >
                        হ্যাঁ, জরুরি
                      </Button>
                      <Button
                        type="button"
                        variant={form.emergency === false ? "default" : "outline"}
                        className="flex-1"
                        onClick={() => update("emergency", false)}
                      >
                        না
                      </Button>
                    </div>
                  </div>
                )}

                {/* ── Step 6: Contact Phone ───────────────────────── */}
                {currentStep.key === "contact" && (
                  <div className="grid gap-2">
                    <Label htmlFor="contactPhone" className="font-semibold">
                      Contact Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactPhone"
                      type="tel"
                      placeholder="01XXXXXXXXX"
                      autoFocus
                      value={form.contactPhone}
                      onChange={(e) => update("contactPhone", e.target.value)}
                    />
                  </div>
                )}

                {/* ── Step 7: Review ──────────────────────────────── */}
                {currentStep.key === "review" && (
                  <div className="space-y-5">
                    <div className="grid gap-2">
                      <Label htmlFor="notes" className="font-semibold">
                        Additional Notes{" "}
                        <span className="text-muted-foreground text-xs font-normal">
                          (optional)
                        </span>
                      </Label>
                      <Textarea
                        id="notes"
                        placeholder="যদি আরও কিছু জানানোর থাকে"
                        rows={3}
                        value={form.notes}
                        onChange={(e) => update("notes", e.target.value)}
                      />
                    </div>

                    <div className="rounded-lg border bg-muted/20 p-4 space-y-2 text-sm">
                      <p className="font-semibold text-foreground">Review your request</p>
                      <div className="text-muted-foreground space-y-1">
                        <p>Branch: <span className="text-foreground">{selectedBranch?.name || "-"}</span></p>
                        <p>Patient: <span className="text-foreground">{form.patientName || "-"}</span></p>
                        <p>Hospital: <span className="text-foreground">{form.hospital || "-"}</span></p>
                        <p>Blood Group: <span className="text-foreground font-mono">{form.bloodGroup || "-"}</span></p>
                        <p>Emergency: <span className="text-foreground">{form.emergency ? "হ্যাঁ" : "না"}</span></p>
                        <p>Contact: <span className="text-foreground font-mono">{form.contactPhone || "-"}</span></p>
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
                  <Button
                    type="submit"
                    size="lg"
                    className="bg-green-600 hover:bg-green-500 flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Send via WhatsApp
                  </Button>
                ) : (
                  <Button type="submit" className="flex items-center gap-1">
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </form>

            {isLastStep && selectedBranch && (
              <a
                href={`tel:${selectedBranch.phone}`}
                className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-3.5 w-3.5" />
                অথবা সরাসরি কল করুন: {selectedBranch.phone}
              </a>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}