"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      return;
    }

    fetch(`/api/verify-email?token=${token}`)
      .then((res) => res.json())
      .then((data) => setStatus(data.success ? "success" : "error"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <Card className="w-full max-w-md text-center">
      <CardHeader>
        <CardTitle>Email Verification</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        {status === "loading" && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            <p>Verifying your email...</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p>Your email has been verified successfully!</p>
            <Button onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          </>
        )}
        {status === "error" && (
          <>
            <XCircle className="h-12 w-12 text-destructive" />
            <p>Verification failed. The link may be expired.</p>
            <Link href="/login">
              <Button variant="outline">Back to Login</Button>
            </Link>
          </>
        )}
      </CardContent>
    </Card>
  );
}
