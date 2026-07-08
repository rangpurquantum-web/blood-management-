"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { useRequests, useUpdateRequest } from "@/features/requests/hooks";
import { BLOOD_TYPES, BLOOD_REQUEST_STATUSES } from "@/types";

import { Button } from "@/components/ui/button";
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

export function RequestTable() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [bloodGroupFilter, setBloodGroupFilter] = useState<string>("all");

  const { data: requests, isLoading, isError } = useRequests({
    status: statusFilter === "all" ? undefined : statusFilter,
    bloodGroup: bloodGroupFilter === "all" ? undefined : bloodGroupFilter,
  });

  const updateRequest = useUpdateRequest(0); // ID will be passed directly in mutate

  const handleStatusChange = (id: number, newStatus: string) => {
    updateRequest.mutate(
      { status: newStatus },
      {
        onSuccess: () => toast.success("Request status updated"),
        onError: () => toast.error("Failed to update status"),
      }
    );
  };

  const table = useReactTable({
    data: requests ?? [],
    columns: [
      {
        accessorKey: "patientName",
        header: "Patient",
      },
      {
        accessorKey: "bloodGroup",
        header: "Group",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono bg-destructive/10 text-destructive border-destructive/20">
            {row.getValue("bloodGroup")}
          </Badge>
        ),
      },
      {
        accessorKey: "requiredUnits",
        header: "Units",
        cell: ({ row }) => `${row.getValue("requiredUnits")} units`,
      },
      {
        accessorKey: "requiredDate",
        header: "Required By",
        cell: ({ row }) => format(new Date(row.getValue("requiredDate")), "MMM d, yyyy"),
      },
      {
        accessorKey: "contactNumber",
        header: "Contact",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          const reqId = (row.original as any).id;
          
          return (
            <Select 
              value={status} 
              onValueChange={(val) => handleStatusChange(reqId, val)}
            >
              <SelectTrigger className={`h-8 w-[110px] ${
                status === "Pending" ? "bg-amber-100 text-amber-800 border-amber-200" :
                status === "Fulfilled" ? "bg-emerald-100 text-emerald-800 border-emerald-200" :
                "bg-red-100 text-red-800 border-red-200"
              }`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BLOOD_REQUEST_STATUSES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
    ],
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
        <div className="flex gap-2 w-full sm:w-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {BLOOD_REQUEST_STATUSES.map((bt) => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={bloodGroupFilter} onValueChange={setBloodGroupFilter}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder="Blood Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {BLOOD_TYPES.map((bt) => (
                <SelectItem key={bt} value={bt}>{bt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-[110px] rounded-md" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Error loading requests.
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No requests found.
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
