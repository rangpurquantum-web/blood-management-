"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
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
      <SelectTrigger
        className="w-auto min-w-[160px] gap-2 rounded-full border-border/60 bg-primary/10 px-3.5 py-1.5 h-9 text-sm font-medium text-primary hover:bg-primary/15 transition-colors focus:ring-primary/30 [&>svg:last-child]:text-primary/70"
      >
        <span className="flex items-center gap-2 truncate">
          {loading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4 shrink-0" />
          )}
          <SelectValue placeholder="Select branch" />
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/60">
        {branches.map((b) => (
          <SelectItem
            key={b.id}
            value={String(b.id)}
            className="rounded-lg text-sm focus:bg-primary/10 focus:text-primary"
          >
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}