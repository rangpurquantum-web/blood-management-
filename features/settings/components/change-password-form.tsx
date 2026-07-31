"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Lock, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "At least 8 characters")
      .regex(/[A-Z]/, "Must contain an uppercase letter")
      .regex(/[0-9]/, "Must contain a number"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export function ChangePasswordForm() {
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error ?? "Failed to change password");
        return;
      }
      toast.success("Password changed successfully!");
      form.reset();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const errors = form.formState.errors;

  return (
    <Card className="w-full max-w-md border-muted/40 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Lock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Change Password</CardTitle>
            <CardDescription className="text-sm">
              Verify current password, then set a new one
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Current Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-current" className={errors.currentPassword ? "text-destructive" : ""}>
              Current Password
            </Label>
            <div className="relative">
              <Input
                id="cp-current"
                type={showCurrent ? "text" : "password"}
                placeholder="Enter current password"
                autoComplete="current-password"
                disabled={loading}
                className={errors.currentPassword ? "border-destructive pr-10" : "pr-10"}
                {...form.register("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((s) => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.currentPassword && (
              <p className="text-xs text-destructive">{errors.currentPassword.message}</p>
            )}
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-new" className={errors.newPassword ? "text-destructive" : ""}>
              New Password
            </Label>
            <div className="relative">
              <Input
                id="cp-new"
                type={showNew ? "text" : "password"}
                placeholder="At least 8 chars, 1 uppercase, 1 number"
                autoComplete="new-password"
                disabled={loading}
                className={errors.newPassword ? "border-destructive pr-10" : "pr-10"}
                {...form.register("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew((s) => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.newPassword && (
              <p className="text-xs text-destructive">{errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <Label htmlFor="cp-confirm" className={errors.confirmPassword ? "text-destructive" : ""}>
              Confirm New Password
            </Label>
            <div className="relative">
              <Input
                id="cp-confirm"
                type={showConfirm ? "text" : "password"}
                placeholder="Repeat new password"
                autoComplete="new-password"
                disabled={loading}
                className={errors.confirmPassword ? "border-destructive pr-10" : "pr-10"}
                {...form.register("confirmPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((s) => !s)}
                className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground"
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Update Password
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
