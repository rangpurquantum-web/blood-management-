"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, PlusCircle, DatabaseZap } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

type Branch = {
  id: number;
  name: string;
  slug: string;
  isActive: boolean;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [initializingId, setInitializingId] = useState<number | null>(null);

  async function loadBranches() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/superadmin/branches");
      const result = await res.json();

      if (result.success) {
        setBranches(result.branches);
      } else {
        toast.error(result.error ?? "Failed to load branches");
      }
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  async function initSchema(branch: Branch) {
    const confirmed = window.confirm(
      `Initialize schema for "${branch.name}"? This should only be run once, on a brand-new empty database.`,
    );

    if (!confirmed) return;

    setInitializingId(branch.id);

    try {
      const res = await fetch(
        `/api/superadmin/branches/${branch.id}/init-schema`,
        { method: "POST" },
      );
      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error ?? "Schema initialization failed");
        return;
      }

      toast.success(`Schema initialized for "${branch.name}"`);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setInitializingId(null);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-4 sm:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Branches</h1>
        <Link href="/superadmin/branches/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-3">
          {branches.map((branch) => (
            <Card key={branch.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="text-lg">{branch.name}</CardTitle>
                  <CardDescription>{branch.slug}</CardDescription>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    branch.isActive
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {branch.isActive ? "Active" : "Inactive"}
                </span>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={initializingId === branch.id}
                  onClick={() => initSchema(branch)}
                >
                  {initializingId === branch.id ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <DatabaseZap className="mr-2 h-4 w-4" />
                      Initialize Schema
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}