import { Suspense } from "react";
import { VerifyEmailContent } from "@/features/auth/components/verify-email-content";
import { Skeleton } from "@/components/ui/skeleton";

export default function VerifyEmailPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Suspense fallback={<Skeleton className="h-[320px] w-full max-w-md" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}
