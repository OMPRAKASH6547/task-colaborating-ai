import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { DocumentStatus, VectorClock } from "@/types";

export interface IDocument extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  content: string;
  ownerId: mongoose.Types.ObjectId;
  tags: string[];
  status: DocumentStatus;
  isFavourite: boolean;
  version: number;
  vectorClock: VectorClock;
  lastModifiedBy: mongoose.Types.ObjectId;
  encrypted: boolean;
  encryptionKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const DocumentSchema = new Schema<IDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, default: "" },
    ownerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    tags: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["active", "deleted", "archived"],
      default: "active",
    },
    isFavourite: { type: Boolean, default: false },
    version: { type: Number, default: 0 },
    vectorClock: { type: Map, of: Number, default: {} },
    lastModifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    encrypted: { type: Boolean, default: false },
    encryptionKey: { type: String, select: false },
  },
  { timestamps: true },
);

DocumentSchema.index({ ownerId: 1, status: 1 });
DocumentSchema.index({ title: "text", content: "text" });
DocumentSchema.index({ tags: 1 });
DocumentSchema.index({ updatedAt: -1 });

export const DocumentModel: Model<IDocument> =
  mongoose.models.Document ??
  mongoose.model<IDocument>("Document", DocumentSchema);
