import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/login"
        forceRedirectUrl="/link-account"
      />
    </main>
  );
}
