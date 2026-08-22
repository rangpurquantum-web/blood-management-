"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import type { Donor, DonationHistory, DonorPhone } from "@/generated/branch";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DonorWithPhone = Donor & { phone: DonorPhone[] };
export type DonorWithDonations = Donor & { 
  donations: DonationHistory[];
  phone: DonorPhone[];
};

export interface DonorFilters {
  q?: string;
  bloodGroup?: string;
  eligible?: string;
  status?: string;
  area?: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const donorKeys = {
  all: ["donors"] as const,
  list: (filters: DonorFilters) => ["donors", "list", filters] as const,
  detail: (id: number) => ["donors", "detail", id] as const,
};

// ─── Public Branches (for registration form) ───────────────────────────────

export interface PublicBranch {
  id: number;
  name: string;
  slug: string;
}

async function fetchPublicBranches(): Promise<PublicBranch[]> {
  const res = await fetch("/api/branches/public", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch branches");
  const json = await res.json();
  return json.branches;
}

export function usePublicBranches() {
  return useQuery({
    queryKey: ["branches", "public"],
    queryFn: fetchPublicBranches,
  });
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────
// NOTE: cache: "no-store" is required on every donor fetch — without it the
// BROWSER's own HTTP cache can silently serve a stale response for an
// identical GET URL (e.g. right after creating a new donor + reload),
// even though the Next.js server itself is already force-dynamic.

async function fetchDonors(filters: DonorFilters): Promise<DonorWithPhone[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.bloodGroup) params.set("bloodGroup", filters.bloodGroup);
  if (filters.eligible) params.set("eligible", filters.eligible);
  if (filters.status) params.set("status", filters.status);
  if (filters.area) params.set("area", filters.area);

  const res = await fetch(`/api/donors?${params.toString()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch donors");
  return res.json();
}

async function fetchDonor(id: number): Promise<DonorWithDonations> {
  const res = await fetch(`/api/donors/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch donor");
  return res.json();
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useDonors(filters: DonorFilters = {}) {
  return useQuery({
    queryKey: donorKeys.list(filters),
    queryFn: () => fetchDonors(filters),
  });
}

export function useDonor(id: number) {
  return useQuery({
    queryKey: donorKeys.detail(id),
    queryFn: () => fetchDonor(id),
    enabled: id > 0,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateDonor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/donors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donorKeys.all });
    },
  });
}

export function usePublicRegisterDonor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donorKeys.all });
    },
  });
}

export function useUpdateDonor(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/donors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donorKeys.all });
      queryClient.invalidateQueries({ queryKey: donorKeys.detail(id) });
    },
  });
}

export function useDeleteDonor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/donors/${id}`, {
        method: "DELETE",
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donorKeys.all });
    },
  });
}

export function useDeferDonor(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { deferralReason: string; deferredUntil: string }) => {
      const res = await fetch(`/api/donors/${id}/eligibility`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donorKeys.all });
      queryClient.invalidateQueries({ queryKey: donorKeys.detail(id) });
    },
  });
}
