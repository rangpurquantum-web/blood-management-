"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { donorKeys } from "@/features/donors/hooks";

import type { DonationHistory } from "@/generated/branch";

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const donationKeys = {
  history: (donorId: number) =>
    ["donations", "history", donorId] as const,
};

// ─── API Response Types ───────────────────────────────────────────────────────

interface DonorHistoryResponse {
  donor: {
    id: number;
    fullName: string;
    bloodType: string;
    isEligible: boolean;
    deferredUntil: Date | null;
  };
  donations: DonationHistory[];
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchDonorHistory(
  donorId: number
): Promise<DonorHistoryResponse> {
  const res = await fetch(`/api/donors/${donorId}/donations`);

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(
      json?.error || "Failed to fetch donation history"
    );
  }

  return json;
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
      const res = await fetch(`/api/donors/${donorId}/donations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        throw json ?? {
          error: "Failed to record donation",
        };
      }

      return json;
    },

    onSuccess: () => {
      // Refresh donation history
      queryClient.invalidateQueries({
        queryKey: donationKeys.history(donorId),
      });

      // Refresh donor profile / eligibility
      queryClient.invalidateQueries({
        queryKey: donorKeys.detail(donorId),
      });

      // Refresh donor list
      queryClient.invalidateQueries({
        queryKey: donorKeys.all,
      });
    },
  });
}