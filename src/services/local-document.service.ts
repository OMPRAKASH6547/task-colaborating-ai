import { getDB } from "@/lib/db/dexie";
import { ConflictResolver } from "@/services/conflict-resolver";
import { syncEngine } from "@/services/sync-engine";
import type { LocalDocument, UserRole } from "@/types";
import { generateId } from "@/lib/utils";

export class LocalDocumentService {
  static async create(
    ownerId: string,
    title = "Untitled Document",
  ): Promise<LocalDocument> {
    const db = getDB();
    const now = Date.now();

    const doc: LocalDocument = {
      id: generateId(),
      title,
      content: "",
      ownerId,
      tags: [],
      isFavourite: false,
      isOffline: true,
      isDeleted: false,
      isShared: false,
      role: "owner",
      version: 0,
      vectorClock: { [ownerId]: 0 },
      lastModified: now,
      lastSyncedAt: null,
      syncStatus: "pending",
      createdAt: now,
      updatedAt: now,
    };

    await db.documents.put(doc);
    return doc;
  }

  static async get(id: string): Promise<LocalDocument | undefined> {
    const db = getDB();
    return db.documents.get(id);
  }

  static async getAll(): Promise<LocalDocument[]> {
    const db = getDB();
    return db.documents.orderBy("lastModified").reverse().toArray();
  }

  static async getRecent(limit = 10): Promise<LocalDocument[]> {
    const db = getDB();
    const docs = await db.documents
      .filter((d) => !d.isDeleted)
      .reverse()
      .sortBy("lastModified");
    return docs.slice(0, limit);
  }

  static async getShared(): Promise<LocalDocument[]> {
    const db = getDB();
    return db.documents.filter((d) => d.isShared && !d.isDeleted).toArray();
  }

  static async getOffline(): Promise<LocalDocument[]> {
    const db = getDB();
    return db.documents.filter((d) => d.isOffline).toArray();
  }

  static async getFavourites(): Promise<LocalDocument[]> {
    const db = getDB();
    return db.documents
      .filter((d) => d.isFavourite && !d.isDeleted)
      .toArray();
  }

  static async getDeleted(): Promise<LocalDocument[]> {
    const db = getDB();
    return db.documents.filter((d) => d.isDeleted).toArray();
  }

  static async updateContent(
    id: string,
    content: string,
    userId: string,
  ): Promise<LocalDocument | undefined> {
    const db = getDB();
    const doc = await db.documents.get(id);
    if (!doc) return undefined;

    if (doc.role === "viewer") {
      throw new Error("Viewers cannot edit documents");
    }

    const operation = ConflictResolver.createOperation(
      id,
      userId,
      "replace",
      { snapshot: content },
      doc.version,
      doc.vectorClock,
    );

    const now = Date.now();
    await db.documents.update(id, {
      content,
      version: operation.version,
      vectorClock: operation.vectorClock,
      lastModified: now,
      updatedAt: now,
      syncStatus: "pending",
    });

    await syncEngine.enqueueOperation(operation);
    return db.documents.get(id);
  }

  static async updateTitle(
    id: string,
    title: string,
    userId: string,
  ): Promise<LocalDocument | undefined> {
    const db = getDB();
    const doc = await db.documents.get(id);
    if (!doc || doc.role === "viewer") return undefined;

    const now = Date.now();
    await db.documents.update(id, {
      title,
      lastModified: now,
      updatedAt: now,
      syncStatus: "pending",
    });

    const operation = ConflictResolver.createOperation(
      id,
      userId,
      "replace",
      { content: title, attributes: { field: "title" } },
      doc.version,
      doc.vectorClock,
    );

    await syncEngine.enqueueOperation(operation);
    return db.documents.get(id);
  }

  static async toggleFavourite(id: string): Promise<void> {
    const db = getDB();
    const doc = await db.documents.get(id);
    if (!doc) return;
    await db.documents.update(id, {
      isFavourite: !doc.isFavourite,
      updatedAt: Date.now(),
    });
  }

  static async softDelete(id: string, userId: string): Promise<void> {
    const db = getDB();
    const doc = await db.documents.get(id);
    if (!doc || doc.role === "viewer") return;

    await db.documents.update(id, {
      isDeleted: true,
      updatedAt: Date.now(),
      syncStatus: "pending",
    });

    const operation = ConflictResolver.createOperation(
      id,
      userId,
      "delete",
      {},
      doc.version,
      doc.vectorClock,
    );
    await syncEngine.enqueueOperation(operation);
  }

  static async restore(id: string, userId: string): Promise<void> {
    const db = getDB();
    const doc = await db.documents.get(id);
    if (!doc) return;

    await db.documents.update(id, {
      isDeleted: false,
      updatedAt: Date.now(),
      syncStatus: "pending",
    });

    const operation = ConflictResolver.createOperation(
      id,
      userId,
      "restore",
      { snapshot: doc.content },
      doc.version,
      doc.vectorClock,
    );
    await syncEngine.enqueueOperation(operation);
  }

  static async upsertFromServer(
    serverDoc: Partial<LocalDocument> & { id: string },
    role: UserRole = "viewer",
  ): Promise<void> {
    const db = getDB();
    const existing = await db.documents.get(serverDoc.id);
    const now = Date.now();

    const doc: LocalDocument = {
      id: serverDoc.id,
      title: serverDoc.title ?? existing?.title ?? "Untitled",
      content: serverDoc.content ?? existing?.content ?? "",
      ownerId: serverDoc.ownerId ?? existing?.ownerId ?? "",
      tags: serverDoc.tags ?? existing?.tags ?? [],
      isFavourite: serverDoc.isFavourite ?? existing?.isFavourite ?? false,
      isOffline: false,
      isDeleted: serverDoc.isDeleted ?? existing?.isDeleted ?? false,
      isShared: role !== "owner",
      role,
      version: serverDoc.version ?? existing?.version ?? 0,
      vectorClock: serverDoc.vectorClock ?? existing?.vectorClock ?? {},
      lastModified: serverDoc.lastModified ?? now,
      lastSyncedAt: now,
      syncStatus: "completed",
      createdAt: serverDoc.createdAt ?? existing?.createdAt ?? now,
      updatedAt: now,
    };

    await db.documents.put(doc);
  }
}
