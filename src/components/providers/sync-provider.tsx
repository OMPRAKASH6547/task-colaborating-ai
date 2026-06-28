"use client";

import { useEffect, type ReactNode } from "react";
import { syncEngine } from "@/services/sync-engine";
import { useAuthStore, useSyncStore } from "@/store";
import { OfflineBanner } from "@/components/shared/offline-banner";

interface SyncProviderProps {
  children: ReactNode;
}

export function SyncProvider({ children }: SyncProviderProps) {
  const accessToken = useAuthStore((s) => s.accessToken);
  const { setOnline, setStatus, setQueueCounts } = useSyncStore();

  useEffect(() => {
    syncEngine.setAccessToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      syncEngine.sync();
    };
    const handleOffline = () => setOnline(false);

    setOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    syncEngine.start();

    const unsub = syncEngine.onStatusChange((status) => {
      setStatus(status);
      syncEngine.getQueueStats().then((stats) => {
        setQueueCounts(stats.pending + stats.retry, stats.failed);
      });
    });

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      syncEngine.stop();
      unsub();
    };
  }, [setOnline, setStatus, setQueueCounts]);

  return (
    <>
      <OfflineBanner />
      {children}
    </>
  );
}
