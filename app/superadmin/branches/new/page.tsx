"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, PlusCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(2, "Branch name is required"),
  slug: z
    .string()
    .min(2, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Only lowercase letters, numbers, and hyphens allowed"),
  databaseUrlSecret: z.string().min(10, "Encrypted database URL is required"),
});

type FormValues = z.infer<typeof formSchema>;

export default function NewBranchPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      databaseUrlSecret: "",
    },
  });

  async function onSubmit(data: FormValues) {
    setIsLoading(true);

    try {
      const res = await fetch("/api/superadmin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        toast.error(result.error ?? "Failed to create branch");
        return;
      }

      toast.success(`Branch "${data.name}" created successfully`);
      router.push("/superadmin/branches");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-lg p-4 sm:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Add New Branch</CardTitle>
          <CardDescription>
            Paste the already-encrypted database connection string for this branch.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">Branch Name</Label>
              <Input
                id="name"
                placeholder="e.g. Dhaka"
                disabled={isLoading}
                {...form.register("name")}
              />
              {form.formState.errors.name && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                placeholder="e.g. dhaka"
                disabled={isLoading}
                {...form.register("slug")}
              />
              {form.formState.errors.slug && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.slug.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="databaseUrlSecret">Encrypted Database URL</Label>
              <Textarea
                id="databaseUrlSecret"
                placeholder="Paste the AES-256-GCM encrypted connection string here"
                rows={4}
                disabled={isLoading}
                {...form.register("databaseUrlSecret")}
              />
              {form.formState.errors.databaseUrlSecret && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.databaseUrlSecret.message}
                </p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Branch
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}