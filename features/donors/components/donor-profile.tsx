"use client";

import { useDonor } from "@/features/donors/hooks";
import { format } from "date-fns";
import { MapPin, Phone, Mail, User2, Calendar, Droplet, AlertTriangle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";

import { DonationForm } from "@/features/donations/components/donation-form";
import { DonationTimeline } from "@/features/donations/components/donation-timeline";
import { DeferralForm } from "@/features/donors/components/deferral-form";

export function DonorProfile({ donorId }: { donorId: number }) {
  const { data: donor, isLoading, isError } = useDonor(donorId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (isError || !donor) {
    return <div className="text-center p-8 text-destructive">Failed to load donor profile.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card className="bg-card shadow-sm border-muted">
        <CardHeader className="flex flex-row items-start justify-between pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User2 className="h-8 w-8" />
            </div>
            <div>
              <CardTitle className="text-2xl flex items-center gap-3">
                {donor.fullName}
                <Badge variant="outline" className="text-lg px-2 bg-destructive/10 text-destructive border-destructive/20 font-mono">
                  {donor.bloodType}
                </Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                {donor.isEligible ? (
                  <Badge className="bg-emerald-500">Eligible</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-amber-500/20 text-amber-700">Deferred</Badge>
                )}
                <span>•</span>
                <span>{donor.gender}</span>
                <span>•</span>
                <span>DOB: {format(new Date(donor.dob), "PP")}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <DeferralForm donorId={donor.id} />
            <DonationForm donorId={donor.id} disabled={!donor.isEligible} />
          </div>
        </CardHeader>
        
        <CardContent className="pt-6 grid sm:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Contact Info</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-primary" />
                <span>{donor.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span>{donor.email}</span>
              </div>
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span>{donor.address}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Eligibility Status</h3>
            <div className="rounded-md border p-4 bg-muted/30">
              {donor.isEligible ? (
                <div className="flex items-start gap-3">
                  <Droplet className="h-5 w-5 text-emerald-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm">Ready to Donate</p>
                    <p className="text-xs text-muted-foreground mt-1">This donor has passed the 56-day waiting period and is eligible for donation.</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                  <div>
                    <p className="font-medium text-sm text-amber-700">Deferred</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {donor.deferralReason || "Recent donation resting period."}
                    </p>
                    {donor.deferredUntil && (
                      <p className="text-xs font-semibold mt-2">
                        Eligible again on: {format(new Date(donor.deferredUntil), "PP")}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* History Card */}
      <Card className="bg-card shadow-sm border-muted">
        <CardHeader>
          <CardTitle className="text-lg">Donation History</CardTitle>
        </CardHeader>
        <CardContent>
          <Separator />
          <DonationTimeline donorId={donor.id} />
        </CardContent>
      </Card>
    </div>
  );
}
