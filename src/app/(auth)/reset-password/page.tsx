import { Suspense } from "react";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Suspense fallback={<Skeleton className="h-[420px] w-full max-w-md" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
