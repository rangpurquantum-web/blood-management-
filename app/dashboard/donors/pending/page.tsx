"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  UserCheck,
  Check,
  X,
  Loader2,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { useDonors, useUpdateDonor } from "@/features/donors/hooks";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function PendingApprovalsPage() {
  const { data: pendingDonors, isLoading, isError } = useDonors({ status: "PENDING" });
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const updateDonorStatus = useUpdateDonor;

  const handleStatusChange = (donorId: number, newStatus: "APPROVED" | "REJECTED", fullName: string) => {
    setUpdatingId(donorId);

    // Call update API
    fetch(`/api/donors/${donorId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw data;
        return data;
      })
      .then(() => {
        if (newStatus === "APPROVED") {
          toast.success(`${fullName}-এর আবেদন অনুমোদন করা হয়েছে এবং ডিরেক্টরিতে যুক্ত হয়েছে`);
        } else {
          toast.success(`${fullName}-এর আবেদন বাতিল করা হয়েছে`);
        }
        // Force refresh by reloading window or query invalidation
        window.location.reload();
      })
      .catch((err) => {
        toast.error(err.error || "স্ট্যাটাস পরিবর্তন করতে ব্যর্থ হয়েছে");
      })
      .finally(() => {
        setUpdatingId(null);
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/donors"
              className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> ডোনার ডিরেক্টরি
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight mt-1 flex items-center gap-3">
            <UserCheck className="h-8 w-8 text-primary" />
            Pending Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            পাবলিক রেজিস্ট্রেশন বা নতুন আবেদনকারী ডোনারদের অনুমোদন বা বাতিল করার সেকশন।
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : isError ? (
        <Card className="bg-destructive/10 border-destructive/20 text-destructive p-6 text-center">
          অপেক্ষমান তালিকা লোড করতে ব্যর্থ হয়েছে।
        </Card>
      ) : !pendingDonors || pendingDonors.length === 0 ? (
        <Card className="bg-card shadow-sm border-muted p-12 text-center space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold">কোনো অপেক্ষমান আবেদন নেই</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            সবগুলো নতুন রেজিস্ট্রেশন রিভিউ করা হয়েছে। নতুন কোনো আবেদন জমা পড়লে এখানে দেখা যাবে।
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {pendingDonors.map((donor: any) => {
            const phones = Array.isArray(donor.phone) ? donor.phone : [];
            const primaryPhone = phones.find((p: any) => p.isPrimary) || phones[0];
            const isUpdating = updatingId === donor.id;

            return (
              <Card key={donor.id} className="bg-card shadow-sm border-muted transition-all hover:border-primary/30">
                <CardContent className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Donor Info */}
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-xl font-bold tracking-tight">{donor.fullName}</h3>
                      <Badge variant="outline" className="font-mono text-base px-2 bg-destructive/10 text-destructive border-destructive/20">
                        {donor.bloodType}
                      </Badge>
                      <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">
                        PENDING
                      </Badge>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-y-1 gap-x-4 text-sm text-muted-foreground pt-1">
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-mono text-foreground">{primaryPhone?.number || donor.phone || "-"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary shrink-0" />
                        <span>DOB: {format(new Date(donor.dob), "PP")}</span>
                      </div>
                      <div className="flex items-center gap-2 col-span-1 sm:col-span-2 md:col-span-1">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{donor.address}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center border-t md:border-t-0 pt-4 md:pt-0 w-full md:w-auto justify-end">
                    {/* Reject Button */}
                    <Button
                      variant="outline"
                      size="default"
                      className="border-destructive/30 text-destructive hover:bg-destructive/10"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(donor.id, "REJECTED", donor.fullName)}
                    >
                      {isUpdating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Reject
                    </Button>

                    {/* Approve Button */}
                    <Button
                      size="default"
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      disabled={isUpdating}
                      onClick={() => handleStatusChange(donor.id, "APPROVED", donor.fullName)}
                    >
                      {isUpdating ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
