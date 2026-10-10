"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LinkAccountForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.SyntheticEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/link-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not link account");
        return;
      }
      toast.success("Account linked");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Link code"
        autoComplete="off"
        autoCapitalize="characters"
        disabled={loading}
        className="h-12 text-center text-base tracking-widest"
      />
      <Button type="submit" className="h-12 w-full" disabled={loading || code.trim().length < 8}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link account"}
      </Button>
    </form>
  );
}
