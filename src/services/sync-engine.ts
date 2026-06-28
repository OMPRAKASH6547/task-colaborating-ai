import { getDB } from "@/lib/db/dexie";
import { ConflictResolver } from "@/services/conflict-resolver";
import type {
  DocumentOperation,
  LocalDocument,
  SyncQueueItem,
  SyncStatus,
} from "@/types";
import { generateId } from "@/lib/utils";

const MAX_RETRIES = 5;
const SYNC_INTERVAL = 5000;

export class SyncEngine {
  private static instance: SyncEngine | null = null;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isSyncing = false;
  private accessToken: string | null = null;
  private listeners: Set<(status: SyncStatus) => void> = new Set();

  static getInstance(): SyncEngine {
    if (!SyncEngine.instance) {
      SyncEngine.instance = new SyncEngine();
    }
    return SyncEngine.instance;
  }

  setAccessToken(token: string | null): void {
    this.accessToken = token;
  }

  onStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(status: SyncStatus): void {
    this.listeners.forEach((l) => l(status));
  }

  start(): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => this.sync(), SYNC_INTERVAL);
    window.addEventListener("online", () => this.sync());
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async enqueueOperation(operation: DocumentOperation): Promise<void> {
    const db = getDB();
    await db.operations.put(operation);

    const queueItem: SyncQueueItem = {
      id: generateId(),
      operation,
      status: "pending",
      retryCount: 0,
      maxRetries: MAX_RETRIES,
      createdAt: Date.now(),
    };

    await db.syncQueue.put(queueItem);
    this.notifyListeners("pending");

    if (navigator.onLine) {
      this.sync();
    }
  }

  async sync(): Promise<void> {
    if (this.isSyncing || !navigator.onLine || !this.accessToken) return;

    this.isSyncing = true;
    this.notifyListeners("pending");

    try {
      await this.pushPendingOperations();
      await this.pullRemoteOperations();
      this.notifyListeners("completed");
    } catch (error) {
      console.error("Sync failed:", error);
      this.notifyListeners("failed");
    } finally {
      this.isSyncing = false;
    }
  }

  private async pushPendingOperations(): Promise<void> {
    const db = getDB();
    const pending = await db.syncQueue
      .where("status")
      .anyOf(["pending", "retry"])
      .toArray();

    for (const item of pending) {
      try {
        const response = await fetch("/api/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.accessToken}`,
          },
          body: JSON.stringify({
            operations: [item.operation],
            lastSyncedVersion: item.operation.version - 1,
          }),
        });

        if (!response.ok) {
          throw new Error(`Sync failed: ${response.statusText}`);
        }

        await db.syncQueue.update(item.id, {
          status: "completed",
          processedAt: Date.now(),
        });
      } catch (error) {
        const retryCount = item.retryCount + 1;
        const status: SyncStatus =
          retryCount >= item.maxRetries ? "failed" : "retry";

        await db.syncQueue.update(item.id, {
          status,
          retryCount,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }
  }

  private async pullRemoteOperations(): Promise<void> {
    const db = getDB();
    const documents = await db.documents.toArray();

    for (const doc of documents) {
      if (doc.lastSyncedAt === null) continue;

      try {
        const response = await fetch(
          `/api/sync?documentId=${doc.id}&sinceVersion=${doc.version}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          },
        );

        if (!response.ok) continue;

        const { data } = await response.json();
        if (!data?.operations?.length) continue;

        await this.mergeRemoteOperations(doc, data.operations);
      } catch {
        // Continue with next document
      }
    }
  }

  private async mergeRemoteOperations(
    localDoc: LocalDocument,
    remoteOps: DocumentOperation[],
  ): Promise<void> {
    const db = getDB();
    const localOps = await db.operations
      .where("documentId")
      .equals(localDoc.id)
      .toArray();

    const { content, mergedClock } = ConflictResolver.mergeOperations(
      localOps,
      remoteOps,
      localDoc.content,
    );

    const latestVersion = Math.max(
      localDoc.version,
      ...remoteOps.map((o) => o.version),
    );

    await db.documents.update(localDoc.id, {
      content,
      vectorClock: mergedClock,
      version: latestVersion,
      lastSyncedAt: Date.now(),
      syncStatus: "completed",
      updatedAt: Date.now(),
    });

    for (const op of remoteOps) {
      await db.operations.put(op);
    }
  }

  async getQueueStats(): Promise<{
    pending: number;
    completed: number;
    failed: number;
    retry: number;
  }> {
    const db = getDB();
    const all = await db.syncQueue.toArray();
    return {
      pending: all.filter((i) => i.status === "pending").length,
      completed: all.filter((i) => i.status === "completed").length,
      failed: all.filter((i) => i.status === "failed").length,
      retry: all.filter((i) => i.status === "retry").length,
    };
  }

  async retryFailed(): Promise<void> {
    const db = getDB();
    const failed = await db.syncQueue.where("status").equals("failed").toArray();
    for (const item of failed) {
      await db.syncQueue.update(item.id, {
        status: "retry",
        retryCount: 0,
        error: undefined,
      });
    }
    this.sync();
  }
}

export const syncEngine = SyncEngine.getInstance();
