"use client";

import { useQuery } from "@tanstack/react-query";

export interface AuditLogItem {
  id: number;
  userId: number | null;
  userFullName: string | null;
  action: string;
  details: string;
  timestamp: string;
}

export interface AuditLogResponse {
  data: AuditLogItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const auditLogKeys = {
  all: ["audit-logs"] as const,
  list: (page: number, pageSize: number) => ["audit-logs", "list", page, pageSize] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchAuditLogs(page: number, pageSize: number): Promise<AuditLogResponse> {
  const params = new URLSearchParams();
  params.set("page", page.toString());
  params.set("pageSize", pageSize.toString());

  const res = await fetch(`/api/audit-logs?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  return res.json();
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useAuditLogs(page: number, pageSize: number = 50) {
  return useQuery({
    queryKey: auditLogKeys.list(page, pageSize),
    queryFn: () => fetchAuditLogs(page, pageSize),
  });
}
