"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Droplet, Loader2, LogIn, Eye, EyeOff } from "lucide-react";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { InstallButton } from "@/components/install-button";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFormValues) {
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        if (
          result.error.includes("ACCOUNT_INACTIVE") ||
          result.error.includes("account_inactive")
        ) {
          toast.error("Your account has been deactivated. Please contact the Admin.", {
            duration: 6000,
          });
        } else {
          toast.error("Incorrect email or password");
        }
        return;
      }

      toast.success("Login successful");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center p-4 sm:p-8">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-background overflow-hidden -z-10">
        <div className="absolute -top-[30%] -right-[10%] h-[70%] w-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[30%] -left-[10%] h-[70%] w-[50%] rounded-full bg-destructive/10 blur-[120px]" />
      </div>

      <Card className="w-full max-w-md border-muted/40 bg-card/60 shadow-2xl backdrop-blur-xl">
        <CardHeader className="space-y-2 text-center pb-8">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-lg">
            <Droplet className="h-8 w-8 fill-current" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight">Quantum Blood Donor Pool</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Sign In
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email" className={form.formState.errors.email ? "text-destructive" : ""}>
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isLoading}
                className={`h-12 rounded-xl bg-background/50 text-base ${form.formState.errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`}
                {...form.register("email")}
              />
              {form.formState.errors.email && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className={form.formState.errors.password ? "text-destructive" : ""}>
                  Password
                </Label>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className={`h-12 rounded-xl bg-background/50 pr-11 text-base ${form.formState.errors.password ? "border-destructive focus-visible:ring-destructive" : ""}`}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <Button type="submit" className="h-12 w-full rounded-xl shadow-md" disabled={isLoading} size="lg">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </>
              )}
            </Button>
          </form>
        </CardContent>
        
        <CardFooter className="flex flex-col items-center gap-3 border-t border-border/40 p-4">
          <InstallButton />
          <p className="text-xs text-muted-foreground">
            Authorized management personnel only.
          </p>
        </CardFooter>
      </Card>
    </main>
  );
}