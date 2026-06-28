import Dexie, { type Table } from "dexie";
import type {
  LocalDocument,
  LocalComment,
  SyncQueueItem,
  DocumentOperation,
} from "@/types";

export class CollabDocsDB extends Dexie {
  documents!: Table<LocalDocument, string>;
  comments!: Table<LocalComment, string>;
  syncQueue!: Table<SyncQueueItem, string>;
  operations!: Table<DocumentOperation, string>;
  metadata!: Table<{ key: string; value: string }, string>;

  constructor() {
    super("CollabDocsDB");

    this.version(1).stores({
      documents:
        "id, ownerId, title, isFavourite, isDeleted, isShared, isOffline, syncStatus, lastModified, updatedAt",
      comments: "id, documentId, userId, syncStatus, createdAt",
      syncQueue: "id, status, createdAt, operation.documentId",
      operations: "operationId, documentId, userId, timestamp, version",
      metadata: "key",
    });
  }
}

let dbInstance: CollabDocsDB | null = null;

export function getDB(): CollabDocsDB {
  if (typeof window === "undefined") {
    throw new Error("IndexedDB is only available in the browser");
  }
  if (!dbInstance) {
    dbInstance = new CollabDocsDB();
  }
  return dbInstance;
}

export async function clearLocalDB(): Promise<void> {
  const db = getDB();
  await db.documents.clear();
  await db.comments.clear();
  await db.syncQueue.clear();
  await db.operations.clear();
  await db.metadata.clear();
}
