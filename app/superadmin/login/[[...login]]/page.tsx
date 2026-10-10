import { SignIn } from "@clerk/nextjs";
import { Droplet } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-4 sm:p-8">
      <div className="absolute inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute -top-[30%] -right-[10%] h-[70%] w-[50%] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -bottom-[30%] -left-[10%] h-[70%] w-[50%] rounded-full bg-destructive/10 blur-[120px]" />
      </div>
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-destructive text-primary-foreground shadow-lg">
          <Droplet className="h-8 w-8 fill-current" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Quantum Blood Donor Pool</h1>
      </div>
      <SignIn
        path="/superadmin/login"
        routing="path"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
      <p className="text-xs text-muted-foreground">Authorized management personnel only.</p>
    </main>
  );
}
