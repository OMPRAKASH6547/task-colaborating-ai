"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useSyncStore } from "@/store";
import { syncEngine } from "@/services/sync-engine";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { isOnline, status, pendingCount, failedCount } = useSyncStore();

  if (isOnline && status !== "failed" && pendingCount === 0) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium ${
        !isOnline
          ? "bg-amber-500 text-white"
          : status === "failed"
            ? "bg-red-500 text-white"
            : "bg-blue-500 text-white"
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4" />
          <span>You are offline. Changes are saved locally.</span>
        </>
      ) : status === "failed" ? (
        <>
          <span>{failedCount} sync operation(s) failed.</span>
          <Button
            size="sm"
            variant="secondary"
            className="h-7"
            onClick={() => syncEngine.retryFailed()}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Syncing {pendingCount} change(s)...</span>
        </>
      )}
    </div>
  );
}
