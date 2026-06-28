import { Suspense } from "react";
import { LoginForm } from "@/features/auth/components/login-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Suspense fallback={<Skeleton className="h-[480px] w-full max-w-md" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
