"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { BloodRequest } from "@prisma/client";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const requestKeys = {
  all: ["requests"] as const,
  list: (filters: { status?: string; bloodGroup?: string }) =>
    ["requests", "list", filters] as const,
  detail: (id: number) => ["requests", "detail", id] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchRequests(filters: { status?: string; bloodGroup?: string }): Promise<BloodRequest[]> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.bloodGroup) params.set("bloodGroup", filters.bloodGroup);

  const res = await fetch(`/api/requests?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useRequests(filters: { status?: string; bloodGroup?: string } = {}) {
  return useQuery({
    queryKey: requestKeys.list(filters),
    queryFn: () => fetchRequests(filters),
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
    },
  });
}

export function useUpdateRequest(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: requestKeys.all });
      queryClient.invalidateQueries({ queryKey: requestKeys.detail(id) });
    },
  });
}
