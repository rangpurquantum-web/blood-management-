"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { useCreateBranch, useUpdateBranch, type Branch } from "@/features/branches/hooks";

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

interface BranchFormValues {
  name: string;
  slug: string;
  location: string;
  databaseUrlSecret: string;
}

export function BranchForm({
  branch,
  onSuccess,
  trigger,
}: {
  branch?: Branch;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch(branch?.id ?? 0);
  const isPending = createBranch.isPending || updateBranch.isPending;

  const form = useForm<BranchFormValues>({
    defaultValues: {
      name: branch?.name || "",
      slug: branch?.slug || "",
      location: branch?.location || "",
      databaseUrlSecret: "",
    },
  });

  const errors = form.formState.errors;

  const onSubmit = (data: BranchFormValues) => {
    if (!data.name.trim()) {
      toast.error("Branch name is required");
      return;
    }

    if (!data.slug.trim()) {
      toast.error("Branch slug is required");
      return;
    }

    // On create, database URL is required.
    // On edit, it's optional (only sent if the admin wants to change it).
    if (!branch && !data.databaseUrlSecret.trim()) {
      toast.error("Database connection URL is required");
      return;
    }

    if (branch) {
      const payload: Record<string, unknown> = {
        name: data.name,
        slug: data.slug,
        location: data.location || null,
      };

      if (data.databaseUrlSecret.trim()) {
        payload.databaseUrlSecret = data.databaseUrlSecret;
      }

      updateBranch.mutate(payload, {
        onSuccess: () => {
          toast.success("Branch updated successfully");
          setOpen(false);
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err.error || "Failed to update branch");
        },
      });
    } else {
      createBranch.mutate(data, {
        onSuccess: () => {
          toast.success("Branch created successfully");
          form.reset();
          setOpen(false);
          onSuccess?.();
        },
        onError: (err: any) => {
          toast.error(err.error || "Failed to create branch");
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button>Add Branch</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "Add New Branch"}</DialogTitle>
          <DialogDescription>
            {branch
              ? "Update this branch's details below."
              : "Create a new branch. Make sure the database URL points to a PostgreSQL database that already has the branch schema applied (Donor, DonationHistory, etc.)."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Branch Name</Label>
            <Input id="name" placeholder="e.g. Dhaka Branch" {...form.register("name")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">
              Slug <span className="text-muted-foreground text-xs font-normal">(lowercase, hyphens only, e.g. dhaka)</span>
            </Label>
            <Input id="slug" placeholder="e.g. dhaka" {...form.register("slug")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="location">
              Location <span className="text-muted-foreground text-xs font-normal">(optional)</span>
            </Label>
            <Input id="location" placeholder="e.g. Dhaka, Bangladesh" {...form.register("location")} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="databaseUrlSecret">
              Database Connection URL
              {branch && (
                <span className="text-muted-foreground text-xs font-normal">
                  {" "}(leave blank to keep current)
                </span>
              )}
            </Label>
            <Input
              id="databaseUrlSecret"
              type="password"
              placeholder="postgresql://..."
              {...form.register("databaseUrlSecret")}
            />
            <p className="text-[11px] text-muted-foreground">
              Must be a Neon (or any PostgreSQL) connection string, already provisioned with the branch schema.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {branch ? "Save Changes" : "Create Branch"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}