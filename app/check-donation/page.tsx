"use client";

import { useState } from "react";
import Link from "next/link";
import { Droplet, Search, ArrowLeft, Loader2, CheckCircle2, XCircle, Droplets } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface CheckResult {
  fullName: string;
  bloodType: string;
  isEligible: boolean;
  deferredUntil: string | null;
  lastDonationDate: string | null;
}

export default function CheckDonationPage() {
  const [phone, setPhone] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    const trimmed = phone.trim();
    if (!/^01\d{9}$/.test(trimmed)) {
      setError("একটি সঠিক ১১-ডিজিটের মোবাইল নম্বর দিন (01XXXXXXXXX)");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/public/check-donation?phone=${encodeURIComponent(trimmed)}`);
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "কিছু একটা সমস্যা হয়েছে, আবার চেষ্টা করুন");
        return;
      }

      setResult(json);
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যাচ্ছে না, আবার চেষ্টা করুন");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="w-full max-w-md mb-6 text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 text-primary font-bold text-2xl tracking-tight">
          <Droplet className="h-8 w-8 text-destructive fill-destructive" />
          <span>Quantum Blood Donor Pool</span>
        </Link>
        <p className="text-sm text-muted-foreground">
          আপনার সর্বশেষ রক্তদানের তারিখ যাচাই করুন
        </p>
      </div>

      <Card className="w-full max-w-md shadow-lg border-muted bg-card">
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Check Your Last Donation Date
          </CardTitle>
          <CardDescription>
            আপনার রেজিস্ট্রেশনে দেওয়া মোবাইল নম্বরটি দিন
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="phone" className="font-semibold">
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="01XXXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                maxLength={11}
              />
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  খোঁজা হচ্ছে...
                </>
              ) : (
                "Check Now"
              )}
            </Button>
          </form>

          {result && (
            <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="h-5 w-5" />
                <h3 className="font-semibold">Donor Found</h3>
              </div>

              <div className="space-y-1.5 text-sm">
                <p>
                  <span className="text-muted-foreground">Name: </span>
                  <span className="font-medium">{result.fullName}</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Blood Type: </span>
                  <span className="font-mono font-semibold">{result.bloodType}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Last Donation: </span>
                  <span className="font-medium">
                    {result.lastDonationDate
                      ? formatDate(result.lastDonationDate)
                      : "কোনো রেকর্ড পাওয়া যায়নি"}
                  </span>
                </p>
                <p className="flex items-center gap-1.5 pt-1">
                  <Droplets className="h-4 w-4 text-muted-foreground" />
                  {result.isEligible ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                      এখন রক্তদানের জন্য উপযুক্ত
                    </span>
                  ) : (
                    <span className="text-amber-700 dark:text-amber-400 font-medium">
                      {result.deferredUntil
                        ? `${formatDate(result.deferredUntil)} পর্যন্ত রক্তদান করা যাবে না`
                        : "বর্তমানে রক্তদানের জন্য উপযুক্ত নয়"}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {error && !result && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 flex items-start gap-2">
              <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="pt-2 border-t">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 pt-4"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}