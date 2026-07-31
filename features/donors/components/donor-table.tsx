"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
} from "@tanstack/react-table";
import { ArrowUpDown, Search, Phone, Copy, Check, MoreHorizontal, X, MapPin, Filter } from "lucide-react";
import { toast } from "sonner";

import { useDonors } from "@/features/donors/hooks";
import { BLOOD_TYPES } from "@/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Helpers & Icons ─────────────────────────────────────────────────────────

function getWhatsAppUrl(number: string) {
  const cleanNumber = number.replace(/\D/g, "");
  if (cleanNumber.startsWith("880")) {
    return `https://wa.me/${cleanNumber}`;
  }
  if (cleanNumber.startsWith("0")) {
    return `https://wa.me/880${cleanNumber.substring(1)}`;
  }
  if (cleanNumber.startsWith("1")) {
    return `https://wa.me/880${cleanNumber}`;
  }
  return `https://wa.me/${cleanNumber}`;
}

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.711-1.465L0 24zm6.59-4.846c1.6.95 3.498 1.453 5.418 1.454 5.918 0 10.732-4.814 10.735-10.736.001-2.868-1.115-5.566-3.144-7.596C17.628 2.247 14.927 1.13 12.05 1.13c-5.923 0-10.74 4.817-10.743 10.74 0 1.954.51 3.86 1.478 5.564L1.758 21.32l4.89-1.282c1.611.879 3.42 1.34 5.253 1.342zm11.754-8.012c-.322-.16-.1.9-.3.948s-.58.12-.9.08a4.8 4.8 0 0 1-2.48-1.56 5.3 5.3 0 0 1-1.26-1.92c-.22-.38.02-.58.18-.74.16-.16.32-.32.48-.48a1.1 1.1 0 0 0 .16-.48c.04-.32-.08-.6-.16-.76-.08-.16-.72-1.72-.98-2.36-.26-.62-.52-.54-.72-.54h-.62c-.2 0-.52.08-.8.38a3.1 3.1 0 0 0-1 2.3c0 1.46.74 2.8 1 3.2.1.18 2.92 4.46 7.08 6.26 1 .44 1.76.7 2.36.9.98.32 1.88.28 2.58.18.78-.12 2.4-.98 2.74-1.92.34-.94.34-1.76.24-1.92-.1-.16-.38-.26-.7-.42z" />
  </svg>
);

// ─── Cell Component ──────────────────────────────────────────────────────────

function PhoneCellActions({ phoneData }: { phoneData: any }) {
  const [copied, setCopied] = useState(false);
  const [copiedSecondary, setCopiedSecondary] = useState<string | null>(null);

  const phones = Array.isArray(phoneData) ? phoneData : [];
  const primaryPhone = phones.find((p: any) => p.isPrimary) || phones[0];
  const secondaryPhones = phones.filter((p: any) => primaryPhone && p.id !== primaryPhone.id);

  const handleCopy = (num: string, isSecondary = false) => {
    navigator.clipboard.writeText(num);
    if (isSecondary) {
      setCopiedSecondary(num);
      setTimeout(() => setCopiedSecondary(null), 1500);
    } else {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    toast.success("Phone number copied to clipboard");
  };

  if (!primaryPhone) {
    if (typeof phoneData === "string" && phoneData) {
      return <PhoneCellActions phoneData={[{ number: phoneData, label: "Phone", isPrimary: true }]} />;
    }
    return <span className="text-muted-foreground">-</span>;
  }

  const renderButtons = (p: any, isSecondary = false) => {
    const isCopied = isSecondary ? copiedSecondary === p.number : copied;
    return (
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Call */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
          title="Call"
        >
          <a href={`tel:${p.number}`}>
            <Phone className="h-3 w-3" />
          </a>
        </Button>

        {/* WhatsApp */}
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-emerald-600 hover:bg-emerald-500/10"
          title="WhatsApp"
        >
          <a href={getWhatsAppUrl(p.number)} target="_blank" rel="noopener noreferrer">
            <WhatsAppIcon className="h-3 w-3" />
          </a>
        </Button>

        {/* Copy */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10"
          onClick={() => handleCopy(p.number, isSecondary)}
          title="Copy"
        >
          {isCopied ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  };

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-sm">{primaryPhone.number}</span>
      {renderButtons(primaryPhone)}

      {secondaryPhones.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-primary hover:bg-primary/10 ml-0.5"
              title="আরও নম্বর দেখুন"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-80 p-3 bg-popover border border-muted shadow-md rounded-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-2">
              <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wider">অন্যান্য ফোন নম্বর ({secondaryPhones.length})</h4>
              <div className="space-y-1 max-h-[180px] overflow-y-auto">
                {secondaryPhones.map((p: any) => (
                  <div key={p.id || p.number} className="flex items-center justify-between py-1 border-b border-muted last:border-0">
                    <span className="font-mono text-xs text-foreground">
                      {p.number} <span className="text-[10px] text-muted-foreground">({p.label})</span>
                    </span>
                    {renderButtons(p, true)}
                  </div>
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// ─── Table Component ─────────────────────────────────────────────────────────

export function DonorTable() {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [q, setQ] = useState("");
  const [bloodGroup, setBloodGroup] = useState<string>("");
  const [eligible, setEligible] = useState<string>("");
  const [area, setArea] = useState("");

  const hasActiveFilters = !!(q || (bloodGroup && bloodGroup !== "all") || (eligible && eligible !== "all") || area);

  const handleReset = () => {
    setQ("");
    setBloodGroup("");
    setEligible("");
    setArea("");
  };

  const { data: donors, isLoading, isError } = useDonors({
    q: q || undefined,
    bloodGroup: bloodGroup === "all" ? undefined : bloodGroup || undefined,
    eligible: eligible === "all" ? undefined : eligible || undefined,
    area: area || undefined,
  });

  const columns = useMemo(() => [
    {
      accessorKey: "fullName",
      header: ({ column }: any) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
            className="-ml-4 h-8 data-[state=open]:bg-accent"
          >
            Donor Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
    },
    {
      accessorKey: "bloodType",
      header: "Blood Group",
      cell: ({ row }: any) => (
        <Badge variant="outline" className="font-mono bg-destructive/10 text-destructive border-destructive/20">
          {row.getValue("bloodType")}
        </Badge>
      ),
    },
    {
      accessorKey: "phone",
      header: "Contact Phone",
      cell: ({ row }: any) => <PhoneCellActions phoneData={row.getValue("phone")} />,
    },
    {
      accessorKey: "isEligible",
      header: "Status",
      cell: ({ row }: any) => {
        const eligible = row.getValue("isEligible");
        return eligible ? (
          <Badge className="bg-emerald-500 hover:bg-emerald-600">Eligible</Badge>
        ) : (
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 hover:bg-amber-500/30">Deferred</Badge>
        );
      },
    },
  ], []);

  const tableData = useMemo(() => donors ?? [], [donors]);

  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
  });

  return (
    <div className="space-y-4">
      {/* ── Filter Bar ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-muted bg-card/60 backdrop-blur-sm p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Filter className="h-4 w-4" />
          ফিল্টার করুন
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Name / Phone Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="filter-search"
              placeholder="নাম বা ফোন খুঁজুন..."
              className="pl-8 h-9"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          {/* Blood Group */}
          <Select value={bloodGroup} onValueChange={setBloodGroup}>
            <SelectTrigger id="filter-blood-group" className="h-9">
              <SelectValue placeholder="ব্লাড গ্রুপ" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব ব্লাড গ্রুপ</SelectItem>
              {BLOOD_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Area search */}
          <div className="relative">
            <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="filter-area"
              placeholder="এলাকা / থানা..."
              className="pl-8 h-9"
              value={area}
              onChange={(e) => setArea(e.target.value)}
            />
          </div>

          {/* Availability */}
          <Select value={eligible} onValueChange={setEligible}>
            <SelectTrigger id="filter-eligibility" className="h-9">
              <SelectValue placeholder="Availability" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">সব স্ট্যাটাস</SelectItem>
              <SelectItem value="true">✅ Eligible Now</SelectItem>
              <SelectItem value="false">⏳ Not Eligible Yet</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Active filter badges + Reset */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">সক্রিয় ফিল্টার:</span>
            {q && (
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-0.5 font-medium">
                &ldquo;{q}&rdquo;
                <button onClick={() => setQ("")} className="ml-1 hover:text-primary/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {bloodGroup && bloodGroup !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive text-xs px-2.5 py-0.5 font-medium">
                {bloodGroup}
                <button onClick={() => setBloodGroup("")} className="ml-1 hover:text-destructive/70">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {area && (
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 text-blue-600 text-xs px-2.5 py-0.5 font-medium">
                📍 {area}
                <button onClick={() => setArea("")} className="ml-1 hover:text-blue-500">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {eligible && eligible !== "all" && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-700 text-xs px-2.5 py-0.5 font-medium">
                {eligible === "true" ? "✅ Eligible" : "⏳ Not Eligible"}
                <button onClick={() => setEligible("")} className="ml-1 hover:text-emerald-600">
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground ml-auto"
              onClick={handleReset}
            >
              <X className="h-3 w-3 mr-1" /> সব রিসেট করুন
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Error loading donors.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer transition-colors hover:bg-muted/50"
                  onClick={() => router.push(`/dashboard/donors/${(row.original as any).id}`)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No donors found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
