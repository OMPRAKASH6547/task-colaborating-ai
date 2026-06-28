import { connectDB } from "@/db/connection";
import {
  DocumentModel,
  Share,
  Operation,
  DocumentVersion,
  Comment,
  Notification,
  type IDocument,
} from "@/db/models";
import type { UserRole } from "@/types";
import type { DocumentInput } from "@/schemas";
import mongoose from "mongoose";

export class DocumentRepository {
  static async create(
    ownerId: string,
    data: DocumentInput,
  ): Promise<IDocument> {
    await connectDB();
    return DocumentModel.create({
      ...data,
      ownerId: new mongoose.Types.ObjectId(ownerId),
      lastModifiedBy: new mongoose.Types.ObjectId(ownerId),
      vectorClock: { [ownerId]: 0 },
    });
  }

  static async findById(id: string): Promise<IDocument | null> {
    await connectDB();
    return DocumentModel.findById(id);
  }

  static async findByOwner(
    ownerId: string,
    filter: {
      status?: string;
      isFavourite?: boolean;
    } = {},
  ): Promise<IDocument[]> {
    await connectDB();
    return DocumentModel.find({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      ...filter,
    })
      .sort({ updatedAt: -1 })
      .lean();
  }

  static async findShared(userId: string): Promise<IDocument[]> {
    await connectDB();
    const shares = await Share.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();
    const docIds = shares.map((s) => s.documentId);
    return DocumentModel.find({
      _id: { $in: docIds },
      status: "active",
    })
      .sort({ updatedAt: -1 })
      .lean();
  }

  static async findDeleted(ownerId: string): Promise<IDocument[]> {
    await connectDB();
    return DocumentModel.find({
      ownerId: new mongoose.Types.ObjectId(ownerId),
      status: "deleted",
    })
      .sort({ updatedAt: -1 })
      .lean();
  }

  static async update(
    id: string,
    data: Partial<DocumentInput & { version: number; vectorClock: Record<string, number> }>,
    userId: string,
  ): Promise<IDocument | null> {
    await connectDB();
    return DocumentModel.findByIdAndUpdate(
      id,
      {
        ...data,
        lastModifiedBy: new mongoose.Types.ObjectId(userId),
      },
      { new: true },
    );
  }

  static async softDelete(id: string): Promise<IDocument | null> {
    await connectDB();
    return DocumentModel.findByIdAndUpdate(
      id,
      { status: "deleted" },
      { new: true },
    );
  }

  static async restore(id: string): Promise<IDocument | null> {
    await connectDB();
    return DocumentModel.findByIdAndUpdate(
      id,
      { status: "active" },
      { new: true },
    );
  }

  static async toggleFavourite(
    id: string,
    isFavourite: boolean,
  ): Promise<IDocument | null> {
    await connectDB();
    return DocumentModel.findByIdAndUpdate(
      id,
      { isFavourite },
      { new: true },
    );
  }

  static async getUserRole(
    documentId: string,
    userId: string,
  ): Promise<UserRole | null> {
    await connectDB();
    const doc = await DocumentModel.findById(documentId);
    if (!doc) return null;
    if (doc.ownerId.toString() === userId) return "owner";

    const share = await Share.findOne({
      documentId: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
    return share?.role ?? null;
  }

  static async canEdit(documentId: string, userId: string): Promise<boolean> {
    const role = await this.getUserRole(documentId, userId);
    return role === "owner" || role === "editor";
  }

  static async search(
    userId: string,
    query: string,
  ): Promise<IDocument[]> {
    await connectDB();
    const shares = await Share.find({
      userId: new mongoose.Types.ObjectId(userId),
    }).lean();
    const sharedIds = shares.map((s) => s.documentId);

    return DocumentModel.find({
      $and: [
        {
          $or: [
            { ownerId: new mongoose.Types.ObjectId(userId) },
            { _id: { $in: sharedIds } },
          ],
        },
        { status: "active" },
        { $text: { $search: query } },
      ],
    })
      .sort({ score: { $meta: "textScore" } })
      .lean();
  }
}

export class ShareRepository {
  static async share(
    documentId: string,
    userId: string,
    sharedBy: string,
    role: UserRole,
  ) {
    await connectDB();
    return Share.findOneAndUpdate(
      {
        documentId: new mongoose.Types.ObjectId(documentId),
        userId: new mongoose.Types.ObjectId(userId),
      },
      {
        documentId: new mongoose.Types.ObjectId(documentId),
        userId: new mongoose.Types.ObjectId(userId),
        sharedBy: new mongoose.Types.ObjectId(sharedBy),
        role,
      },
      { upsert: true, new: true },
    );
  }

  static async getShares(documentId: string) {
    await connectDB();
    return Share.find({
      documentId: new mongoose.Types.ObjectId(documentId),
    })
      .populate("userId", "name email avatar")
      .lean();
  }

  static async removeShare(documentId: string, userId: string) {
    await connectDB();
    return Share.deleteOne({
      documentId: new mongoose.Types.ObjectId(documentId),
      userId: new mongoose.Types.ObjectId(userId),
    });
  }
}

export class OperationRepository {
  static async createMany(operations: Array<Record<string, unknown>>) {
    await connectDB();
    return Operation.insertMany(operations, { ordered: false });
  }

  static async findByDocument(
    documentId: string,
    sinceVersion = 0,
  ) {
    await connectDB();
    return Operation.find({
      documentId: new mongoose.Types.ObjectId(documentId),
      version: { $gt: sinceVersion },
    })
      .sort({ version: 1 })
      .lean();
  }

  static async findByOperationId(operationId: string) {
    await connectDB();
    return Operation.findOne({ operationId });
  }

  static async getLatestVersion(documentId: string): Promise<number> {
    await connectDB();
    const latest = await Operation.findOne({
      documentId: new mongoose.Types.ObjectId(documentId),
    })
      .sort({ version: -1 })
      .lean();
    return latest?.version ?? 0;
  }
}

export class VersionRepository {
  static async create(data: {
    documentId: string;
    version: number;
    title: string;
    content: string;
    createdBy: string;
    changeSummary: string;
  }) {
    await connectDB();
    return DocumentVersion.create({
      ...data,
      documentId: new mongoose.Types.ObjectId(data.documentId),
      createdBy: new mongoose.Types.ObjectId(data.createdBy),
    });
  }

  static async findByDocument(documentId: string) {
    await connectDB();
    return DocumentVersion.find({
      documentId: new mongoose.Types.ObjectId(documentId),
    })
      .populate("createdBy", "name email avatar")
      .sort({ version: -1 })
      .lean();
  }

  static async findById(id: string) {
    await connectDB();
    return DocumentVersion.findById(id).lean();
  }
}

export class CommentRepository {
  static async create(data: {
    documentId: string;
    userId: string;
    content: string;
    position: number;
  }) {
    await connectDB();
    return Comment.create({
      ...data,
      documentId: new mongoose.Types.ObjectId(data.documentId),
      userId: new mongoose.Types.ObjectId(data.userId),
    });
  }

  static async findByDocument(documentId: string) {
    await connectDB();
    return Comment.find({
      documentId: new mongoose.Types.ObjectId(documentId),
    })
      .populate("userId", "name email avatar")
      .sort({ createdAt: -1 })
      .lean();
  }

  static async resolve(id: string) {
    await connectDB();
    return Comment.findByIdAndUpdate(id, { resolved: true }, { new: true });
  }

  static async delete(id: string) {
    await connectDB();
    return Comment.findByIdAndDelete(id);
  }
}

export class NotificationRepository {
  static async create(data: {
    userId: string;
    type: "share" | "comment" | "mention" | "sync" | "system";
    title: string;
    message: string;
    documentId?: string;
  }) {
    await connectDB();
    return Notification.create({
      ...data,
      userId: new mongoose.Types.ObjectId(data.userId),
      documentId: data.documentId
        ? new mongoose.Types.ObjectId(data.documentId)
        : undefined,
    });
  }

  static async findByUser(userId: string, unreadOnly = false) {
    await connectDB();
    const filter: Record<string, unknown> = {
      userId: new mongoose.Types.ObjectId(userId),
    };
    if (unreadOnly) filter.read = false;
    return Notification.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  }

  static async markRead(id: string) {
    await connectDB();
    return Notification.findByIdAndUpdate(id, { read: true }, { new: true });
  }

  static async markAllRead(userId: string) {
    await connectDB();
    return Notification.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), read: false },
      { read: true },
    );
  }
}
