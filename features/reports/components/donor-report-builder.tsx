"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RotateCcw, Search, Users, ChevronLeft, ChevronRight,
  Calendar, User, Activity, ChevronsLeft, ChevronsRight,
  FileText, Loader2, SlidersHorizontal, ChevronDown, ChevronUp,
  MapPin,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { BLOOD_TYPES } from "@/types";
import { Filters, EMPTY_FILTERS } from "@/features/reports/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ReportDonor {
  id: number;
  fullName: string;
  gender: string;
  dob: string;
  bloodType: string;
  address: string;
  isEligible: boolean;
  deferredUntil: string | null;
  createdAt: string;
  phone: { number: string; label: string }[];
  lastDonationDate: string | null;
}

interface ReportResponse {
  total: number;
  donors: ReportDonor[];
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

function filterSummary(f: Filters): string {
  const parts: string[] = [];
  if (f.bloodGroup)  parts.push(`Blood Group: ${f.bloodGroup}`);
  if (f.area)        parts.push(`Area: ${f.area}`);
  if (f.gender)      parts.push(`Gender: ${f.gender}`);
  if (f.eligible !== "") parts.push(f.eligible === "true" ? "Eligible Now" : "Not Eligible Yet");
  if (f.ageMin || f.ageMax) {
    parts.push(`Age: ${f.ageMin || "0"}–${f.ageMax || "∞"}`);
  }
  if (f.createdFrom || f.createdTo) {
    parts.push(`Registered: ${f.createdFrom || "…"} to ${f.createdTo || "…"}`);
  }
  if (f.lastDonationFrom || f.lastDonationTo) {
    parts.push(`Last Donation: ${f.lastDonationFrom || "…"} to ${f.lastDonationTo || "…"}`);
  }
  return parts.length ? parts.join(" · ") : "All donors";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DonorReportBuilder() {
  const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const PAGE_SIZE = 20;

  const queryKey = ["donor-report", applied, page];

  const { data, isLoading, isError, isFetching } = useQuery<ReportResponse>({
    queryKey,
    queryFn: async () => {
      const res = await fetch(`/api/reports/donors?${buildQueryString(applied, page, PAGE_SIZE)}`);
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
      await exportDonorReportToPdf(applied, data?.total ?? 0);
      toast.success("PDF report downloaded successfully!");
    } catch (err: any) {
      console.error("PDF export error:", err);
      toast.error(err?.message || "Failed to export PDF report");
    } finally {
      setIsPdfExporting(false);
    }
  };

  const handleApply = useCallback(() => {
    setApplied({ ...draft });
    setPage(1);
  }, [draft]);

  const handleReset = useCallback(() => {
    setDraft(EMPTY_FILTERS);
    setApplied(EMPTY_FILTERS);
    setPage(1);
    setShowAdvanced(false);
  }, []);

  const set = (key: keyof Filters) => (value: string) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const advancedActive = hasAdvancedFilters(applied);

  return (
    <div className="space-y-6">
      {/* ── Filter Panel ────────────────────────────────────────── */}
      <div className="rounded-2xl border border-muted bg-card shadow-sm overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 bg-gradient-to-r from-primary/5 to-transparent border-b border-muted gap-2">
          <h2 className="font-semibold text-sm">Custom Filter Builder</h2>

          <div className="flex items-center gap-2 shrink-0">
            {hasActiveFilters(applied) && (
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
            <Button
              id="rpt-apply"
              size="sm"
              onClick={handleApply}
              className="gap-1.5 bg-primary hover:bg-primary/90"
            >
              <Search className="h-3.5 w-3.5" />
              Apply
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Primary Filters — 2 columns even on mobile */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {/* Blood Group */}
            <Select value={draft.bloodGroup || "__all__"} onValueChange={(v) => set("bloodGroup")(v === "__all__" ? "" : v)}>
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
            <Select value={draft.gender || "__all__"} onValueChange={(v) => set("gender")(v === "__all__" ? "" : v)}>
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
            <Select value={draft.eligible || "__all__"} onValueChange={(v) => set("eligible")(v === "__all__" ? "" : v)}>
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
                value={draft.area}
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
                      value={draft.ageMin}
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
                      value={draft.ageMax}
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
                          value={draft.createdFrom}
                          onChange={(e) => set("createdFrom")(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">To</label>
                        <Input
                          id="rpt-created-to"
                          type="date"
                          className="h-9 text-sm"
                          value={draft.createdTo}
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
                          value={draft.lastDonationFrom}
                          onChange={(e) => set("lastDonationFrom")(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">To</label>
                        <Input
                          id="rpt-donation-to"
                          type="date"
                          className="h-9 text-sm"
                          value={draft.lastDonationTo}
                          onChange={(e) => set("lastDonationTo")(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button
              id="rpt-export-pdf"
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={isPdfExporting || !data || data.total === 0}
              className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
            >
              {isPdfExporting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <FileText className="h-3.5 w-3.5" />
              )}
              Export PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ── Results Panel ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-muted bg-card shadow-sm overflow-hidden">
        {/* Results header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3.5 border-b border-muted gap-2">
          <div className="min-w-0">
            {isLoading || isFetching ? (
              <Skeleton className="h-5 w-32" />
            ) : (
              <p className="font-semibold text-sm">
                {data?.total ?? 0} donors found
              </p>
            )}
            <p className="text-xs text-muted-foreground truncate max-w-xs">
              {filterSummary(applied)}
            </p>
          </div>
          {totalPages > 1 && (
            <p className="text-xs text-muted-foreground self-start sm:self-auto">
              Page {page} / {totalPages}
            </p>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Name</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Blood Group</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Gender</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Age</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Phone</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Area</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Availability</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Last Donation</TableHead>
                <TableHead className="font-semibold text-xs uppercase tracking-wider">Registered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                    Failed to load data. Please try again.
                  </TableCell>
                </TableRow>
              ) : !data || data.donors.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <Activity className="h-10 w-10 opacity-20" />
                      <p className="text-sm">No donors found.</p>
                      <p className="text-xs">Try adjusting or resetting the filters.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                data.donors.map((d) => {
                  const age = differenceInYears(new Date(), new Date(d.dob));
                  const primaryPhone = d.phone?.[0]?.number ?? "—";
                  return (
                    <TableRow key={d.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-sm">{d.fullName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono bg-destructive/10 text-destructive border-destructive/20 text-xs">
                          {d.bloodType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{d.gender}</TableCell>
                      <TableCell className="text-sm">{age} yrs</TableCell>
                      <TableCell className="font-mono text-sm">{primaryPhone}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[140px] truncate" title={d.address}>
                        {d.address}
                      </TableCell>
                      <TableCell>
                        {d.isEligible ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/20 text-xs">✅ Eligible</Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 text-xs">⏳ Deferred</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {d.lastDonationDate ? format(new Date(d.lastDonationDate), "dd MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(d.createdAt), "dd MMM yyyy")}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 px-4 sm:px-6 py-4 border-t border-muted">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const pageNum = Math.max(1, Math.min(totalPages - 6, page - 3)) + i;
              if (pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? "default" : "outline"}
                  size="icon"
                  className="h-8 w-8 text-xs"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}