"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RotateCcw, Loader2, SlidersHorizontal, ChevronDown, ChevronUp,
  Calendar, User, MapPin,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { BLOOD_TYPES } from "@/types";
import { Filters, EMPTY_FILTERS } from "@/features/reports/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportResponse {
  total: number;
  donors: unknown[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function buildQueryString(filters: Filters, page: number, pageSize = 20) {
  const params = new URLSearchParams();
  if (filters.bloodGroup) params.set("bloodGroup", filters.bloodGroup);
  if (filters.area)       params.set("area",       filters.area);
  if (filters.eligible)   params.set("eligible",   filters.eligible);
  if (filters.gender)     params.set("gender",     filters.gender);
  if (filters.ageMin)     params.set("ageMin",     filters.ageMin);
  if (filters.ageMax)     params.set("ageMax",     filters.ageMax);
  if (filters.createdFrom)    params.set("createdFrom",    filters.createdFrom);
  if (filters.createdTo)      params.set("createdTo",      filters.createdTo);
  if (filters.lastDonationFrom) params.set("lastDonationFrom", filters.lastDonationFrom);
  if (filters.lastDonationTo)   params.set("lastDonationTo",   filters.lastDonationTo);
  params.set("page",     String(page));
  params.set("pageSize", String(pageSize));
  return params.toString();
}

function hasActiveFilters(f: Filters) {
  return Object.values(f).some((v) => v !== "");
}

function hasAdvancedFilters(f: Filters) {
  return Boolean(
    f.ageMin || f.ageMax || f.createdFrom || f.createdTo || f.lastDonationFrom || f.lastDonationTo
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DonorReportBuilder() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Kept only to know the total count (used by the PDF export), no table is rendered.
  const { data } = useQuery<ReportResponse>({
    queryKey: ["donor-report", filters],
    queryFn: async () => {
      const res = await fetch(`/api/reports/donors?${buildQueryString(filters, 1, 20)}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to fetch");
      return json;
    },
  });

  const [isPdfExporting, setIsPdfExporting] = useState(false);

  const handleExportPdf = async () => {
    try {
      setIsPdfExporting(true);
      const { exportDonorReportToPdf } = await import("@/features/reports/lib/export-pdf");
      await exportDonorReportToPdf(filters, data?.total ?? 0);
      toast.success("PDF report downloaded successfully!");
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error(err?.message || "Failed to export PDF report");
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setShowAdvanced(false);
  };

  const set = (key: keyof Filters) => (value: string) =>
    setFilters((prev) => ({ ...prev, [key]: value }));

  const advancedActive = hasAdvancedFilters(filters);

  return (
    <div className="space-y-6">
      {/* ── Filter Panel ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-muted bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-primary/5 to-transparent border-b border-muted gap-2">
          <h2 className="font-semibold text-sm">Custom Filter Builder</h2>

          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters(filters) && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-xs">
                Active
              </Badge>
            )}
            <Button
              id="rpt-reset"
              variant="outline"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              onClick={handleReset}
              title="Reset Filters"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Primary Filters — 2 columns even on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Blood Group */}
            <Select value={filters.bloodGroup || "__all__"} onValueChange={(v) => set("bloodGroup")(v === "__all__" ? "" : v)}>
              <SelectTrigger id="rpt-blood-group" className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Blood Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Blood Groups</SelectItem>
                {BLOOD_TYPES.map((bt) => (
                  <SelectItem key={bt} value={bt}>{bt}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Gender */}
            <Select value={filters.gender || "__all__"} onValueChange={(v) => set("gender")(v === "__all__" ? "" : v)}>
              <SelectTrigger id="rpt-gender" className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Genders</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            {/* Eligibility */}
            <Select value={filters.eligible || "__all__"} onValueChange={(v) => set("eligible")(v === "__all__" ? "" : v)}>
              <SelectTrigger id="rpt-eligibility" className="h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Availability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All Statuses</SelectItem>
                <SelectItem value="true">✅ Eligible Now</SelectItem>
                <SelectItem value="false">⏳ Not Eligible Yet</SelectItem>
              </SelectContent>
            </Select>

            {/* Area */}
            <div className="relative">
              <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="rpt-area"
                placeholder="Area / Thana"
                className="pl-8 h-9 text-xs sm:text-sm"
                value={filters.area}
                onChange={(e) => set("area")(e.target.value)}
              />
            </div>
          </div>

          {/* Advanced Filters toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {showAdvanced ? "Hide" : "More Filters"} (Age & Date)
            {advancedActive && !showAdvanced && (
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0 h-4">
                Active
              </Badge>
            )}
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1 animate-in slide-in-from-top-1 duration-200">
              <Separator />

              {/* Age Range */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Age Range
                </p>
                <div className="grid grid-cols-2 gap-2.5 max-w-xs">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Minimum Age</label>
                    <Input
                      id="rpt-age-min"
                      type="number"
                      placeholder="e.g. 18"
                      min={18}
                      max={80}
                      className="h-9 text-sm"
                      value={filters.ageMin}
                      onChange={(e) => set("ageMin")(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Maximum Age</label>
                    <Input
                      id="rpt-age-max"
                      type="number"
                      placeholder="e.g. 60"
                      min={18}
                      max={100}
                      className="h-9 text-sm"
                      value={filters.ageMax}
                      onChange={(e) => set("ageMax")(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Date Ranges */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Date Range
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Registration Date */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Registration Date</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">From</label>
                        <Input
                          id="rpt-created-from"
                          type="date"
                          className="h-9 text-sm"
                          value={filters.createdFrom}
                          onChange={(e) => set("createdFrom")(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">To</label>
                        <Input
                          id="rpt-created-to"
                          type="date"
                          className="h-9 text-sm"
                          value={filters.createdTo}
                          onChange={(e) => set("createdTo")(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Last Donation Date */}
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">Last Donation Date</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">From</label>
                        <Input
                          id="rpt-donation-from"
                          type="date"
                          className="h-9 text-sm"
                          value={filters.lastDonationFrom}
                          onChange={(e) => set("lastDonationFrom")(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">To</label>
                        <Input
                          id="rpt-donation-to"
                          type="date"
                          className="h-9 text-sm"
                          value={filters.lastDonationTo}
                          onChange={(e) => set("lastDonationTo")(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Export */}
          <div className="pt-1">
            <Button
              id="rpt-export-pdf"
              onClick={handleExportPdf}
              disabled={isPdfExporting}
              className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white"
            >
              {isPdfExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                "Export PDF"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}