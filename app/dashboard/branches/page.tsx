"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Branch = {
  id: number;
  name: string;
  slug: string;
  location: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type BranchResponse = {
  success: boolean;
  branches?: Branch[];
  error?: string;
};

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [open, setOpen] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [location, setLocation] = useState("");
  const [databaseUrl, setDatabaseUrl] = useState("");

  async function loadBranches() {
    try {
      setLoading(true);

      const res = await fetch("/api/branches", {
        cache: "no-store",
      });

      const json: BranchResponse = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to load branches");
      }

      setBranches(json.branches ?? []);
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load branches",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBranches();
  }, []);

  function handleNameChange(value: string) {
    setName(value);

    const generatedSlug = value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");

    setSlug(generatedSlug);
  }

  async function handleCreateBranch(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!name.trim()) {
      toast.error("Branch name is required");
      return;
    }

    if (!slug.trim()) {
      toast.error("Branch slug is required");
      return;
    }

    if (!databaseUrl.trim()) {
      toast.error("Database URL is required");
      return;
    }

    try {
      setCreating(true);

      const res = await fetch("/api/branches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          location: location.trim() || null,
          databaseUrlSecret: databaseUrl.trim(),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json?.error || "Failed to create branch",
        );
      }

      toast.success("Branch created successfully");

      setName("");
      setSlug("");
      setLocation("");
      setDatabaseUrl("");

      setOpen(false);

      await loadBranches();
    } catch (error) {
      console.error(error);

      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to create branch",
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6" />

            <h1 className="text-2xl font-bold">
              Branches
            </h1>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization's branches and their
            database connections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadBranches}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />

            Refresh
          </Button>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Branch
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  Create New Branch
                </DialogTitle>

                <DialogDescription>
                  Add a new branch and its dedicated database
                  connection.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleCreateBranch}
                className="space-y-5 pt-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="branch-name">
                    Branch Name
                  </Label>

                  <Input
                    id="branch-name"
                    placeholder="Rajshahi"
                    value={name}
                    onChange={(e) =>
                      handleNameChange(e.target.value)
                    }
                    disabled={creating}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch-slug">
                    Slug
                  </Label>

                  <Input
                    id="branch-slug"
                    placeholder="rajshahi"
                    value={slug}
                    onChange={(e) =>
                      setSlug(
                        e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, ""),
                      )
                    }
                    disabled={creating}
                  />

                  <p className="text-xs text-muted-foreground">
                    Example: rajshahi
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="branch-location">
                    Location
                  </Label>

                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />

                    <Input
                      id="branch-location"
                      className="pl-9"
                      placeholder="Rajshahi, Bangladesh"
                      value={location}
                      onChange={(e) =>
                        setLocation(e.target.value)
                      }
                      disabled={creating}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="database-url">
                    Branch Database URL
                  </Label>

                  <Input
                    id="database-url"
                    type="password"
                    placeholder="postgresql://..."
                    value={databaseUrl}
                    onChange={(e) =>
                      setDatabaseUrl(e.target.value)
                    }
                    disabled={creating}
                    autoComplete="new-password"
                  />

                  <p className="text-xs text-muted-foreground">
                    The database connection string is stored
                    securely and is not displayed in the branch
                    list.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setOpen(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Branch
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="rounded-lg border p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin" />

          <p className="mt-2 text-sm text-muted-foreground">
            Loading branches...
          </p>
        </div>
      ) : branches.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />

          <h2 className="mt-4 font-semibold">
            No branches yet
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            Create your first branch to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className="rounded-xl border bg-card p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {branch.name}
                    </h3>

                    <p className="text-xs text-muted-foreground">
                      /{branch.slug}
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    branch.isActive
                      ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {branch.isActive
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>

              {branch.location && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />

                  <span>{branch.location}</span>
                </div>
              )}

              <div className="mt-4 border-t pt-4">
                <p className="text-xs text-muted-foreground">
                  Created
                </p>

                <p className="text-sm">
                  {new Date(
                    branch.createdAt,
                  ).toLocaleDateString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}