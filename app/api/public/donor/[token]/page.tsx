"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DonorCardData {
  fullName: string;
  bloodType: string;
  isEligible: boolean;
  deferredUntil: string | null;
  lastDonationDate: string | null;
}

export default function DonorCardPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<DonorCardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justDonated, setJustDonated] = useState(false);

  const loadCard = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/donor/${token}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "কার্ডটি খুঁজে পাওয়া যায়নি");
        return;
      }
      setData(json);
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যাচ্ছে না");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadCard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleDonateToday = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/public/donor/${token}/donate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "আপডেট করা যায়নি, আবার চেষ্টা করুন");
        return;
      }
      setJustDonated(true);
      await loadCard();
    } catch {
      setError("সার্ভারের সাথে সংযোগ করা যাচ্ছে না");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#3D0B12]">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full blur-3xl opacity-70"
          style={{ background: "radial-gradient(circle at 30% 30%, #FF7A8A, #B91C3C 60%, transparent 75%)" }}
        />
        <div
          className="absolute top-1/3 -right-32 h-[480px] w-[480px] rounded-full blur-3xl opacity-50"
          style={{ background: "radial-gradient(circle at 60% 40%, #F0576B, #7A1220 65%, transparent 75%)" }}
        />
      </div>

      <div className="relative z-10 min-h-screen py-10 px-4 flex flex-col justify-center items-center">
        <div className="w-full max-w-md mb-6 text-center">
          <Link href="/" className="inline-block text-white font-bold text-2xl tracking-tight">
            Quantum Blood Donor Pool
          </Link>
        </div>

        <Card className="w-full max-w-md shadow-2xl border-0 bg-white">
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-xl">Donor Card</CardTitle>
            <CardDescription>আপনার রক্তদানের সর্বশেষ তথ্য</CardDescription>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {isLoading && (
              <p className="text-sm text-muted-foreground text-center py-6">লোড হচ্ছে...</p>
            )}

            {!isLoading && error && !data && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {!isLoading && data && (
              <>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Name: </span>
                    <span className="font-semibold text-base">{data.fullName}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Blood Type: </span>
                    <span className="font-mono font-semibold">{data.bloodType}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Last Donation: </span>
                    <span className="font-medium">
                      {data.lastDonationDate ? formatDate(data.lastDonationDate) : "কোনো রেকর্ড নেই"}
                    </span>
                  </p>
                  <p className="pt-1">
                    {data.isEligible ? (
                      <span className="text-emerald-700 font-medium">এখন রক্তদানের জন্য উপযুক্ত</span>
                    ) : (
                      <span className="text-amber-700 font-medium">
                        {data.deferredUntil
                          ? `${formatDate(data.deferredUntil)} পর্যন্ত রক্তদান করা যাবে না`
                          : "বর্তমানে রক্তদানের জন্য উপযুক্ত নয়"}
                      </span>
                    )}
                  </p>
                </div>

                {justDonated && (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
                    <p className="text-sm text-emerald-700 font-medium">
                      ধন্যবাদ! আপনার রক্তদানের তথ্য আপডেট করা হয়েছে।
                    </p>
                  </div>
                )}

                {error && data && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {data.isEligible && !justDonated && (
                  <Button
                    onClick={handleDonateToday}
                    disabled={isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? "আপডেট হচ্ছে..." : "I Donated Today"}
                  </Button>
                )}
              </>
            )}

            <div className="pt-2 border-t">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground inline-block pt-4">
                Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
