"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { donorKeys } from "@/features/donors/hooks";

import type { DonationHistory } from "@prisma/client";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const donationKeys = {
  history: (donorId: number) => ["donations", "history", donorId] as const,
};

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDonorHistory(donorId: number): Promise<DonationHistory[]> {
  const res = await fetch(`/api/donors/${donorId}/history`);
  if (!res.ok) throw new Error("Failed to fetch donation history");
  return res.json();
}

// ─── Query Hooks ──────────────────────────────────────────────────────────────

export function useDonorHistory(donorId: number) {
  return useQuery({
    queryKey: donationKeys.history(donorId),
    queryFn: () => fetchDonorHistory(donorId),
    enabled: donorId > 0,
  });
}

// ─── Mutation Hooks ───────────────────────────────────────────────────────────

export function useRecordDonation(donorId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await fetch(`/api/donors/${donorId}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw json;
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: donationKeys.history(donorId) });
      queryClient.invalidateQueries({ queryKey: donorKeys.detail(donorId) });
      queryClient.invalidateQueries({ queryKey: donorKeys.all });
    },
  });
}
