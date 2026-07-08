"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Clock, User } from "lucide-react";

import { useAuditLogs } from "@/features/audit-logs/hooks";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export function AuditLogTable() {
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data, isLoading, isError } = useAuditLogs(page, pageSize);
  
  const logs = data?.data ?? [];
  const meta = data?.meta;

  const table = useReactTable({
    data: logs,
    columns: [
      {
        accessorKey: "timestamp",
        header: "Timestamp",
        cell: ({ row }) => (
          <div className="flex items-center text-muted-foreground whitespace-nowrap">
            <Clock className="mr-2 h-4 w-4" />
            {format(new Date(row.getValue("timestamp")), "MMM d, HH:mm:ss")}
          </div>
        ),
      },
      {
        accessorKey: "userFullName",
        header: "User",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="font-medium">
              {row.getValue("userFullName") || "System"}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "action",
        header: "Action",
        cell: ({ row }) => <span className="font-semibold">{row.getValue("action")}</span>,
      },
      {
        accessorKey: "details",
        header: "Details",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-sm">{row.getValue("details")}</span>
        ),
      },
    ],
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="space-y-4">
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
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  Failed to load audit logs.
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
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No audit logs found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-2">
        <p className="text-sm text-muted-foreground">
          Showing {logs.length} entries {meta && `of ${meta.total} total`}
        </p>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!meta || page >= meta.totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
