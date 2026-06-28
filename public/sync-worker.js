/// <reference lib="webworker" />

const SYNC_INTERVAL = 10000;

let syncTimer: ReturnType<typeof setInterval> | null = null;

self.addEventListener("message", (event: MessageEvent) => {
  if (event.data.type === "START_SYNC") {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(() => {
      self.postMessage({ type: "SYNC_TICK" });
    }, SYNC_INTERVAL);
  }

  if (event.data.type === "STOP_SYNC") {
    if (syncTimer) {
      clearInterval(syncTimer);
      syncTimer = null;
    }
  }

  if (event.data.type === "FORCE_SYNC") {
    self.postMessage({ type: "SYNC_TICK" });
  }
});

export {};
