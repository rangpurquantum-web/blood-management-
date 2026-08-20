"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Branch {
  id: number;
  name: string;
  slug: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
  };
}

export interface CreateBranchInput {
  name: string;
  slug: string;
  location?: string;
  databaseUrlSecret: string;
}

export interface UpdateBranchInput {
  name?: string;
  slug?: string;
  location?: string | null;
  databaseUrlSecret?: string;
  isActive?: boolean;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const branchKeys = {
  all: ["branches"] as const,
  detail: (id: number) => ["branches", "detail", id] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchBranches(): Promise<Branch[]> {
  const res = await fetch("/api/branches");
  const json = await res.json();
  if (!res.ok) throw json;
  return json.branches;
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useBranches() {
  return useQuery({
    queryKey: branchKeys.all,
    queryFn: fetchBranches,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useCreateBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBranchInput) => {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}

export function useUpdateBranch(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBranchInput) => {
      const res = await fetch(`/api/branches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
      queryClient.invalidateQueries({ queryKey: branchKeys.detail(id) });
    },
  });
}

export function useDeleteBranch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/branches/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: branchKeys.all });
    },
  });
}