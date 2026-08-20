"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchOption = { id: number; name: string; slug: string };

export function BranchSwitcher({
  branches,
  activeBranchId,
}: {
  branches: BranchOption[];
  activeBranchId: number | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleChange = async (value: string) => {
    setLoading(true);
    const res = await fetch("/api/branches/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchId: Number(value) }),
    });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    }
  };

  return (
    <Select
      value={activeBranchId ? String(activeBranchId) : undefined}
      onValueChange={handleChange}
      disabled={loading}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select branch" />
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={String(b.id)}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}