import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { SyncStatus } from "@/types";

export interface ISyncQueue extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  operationId: string;
  payload: Record<string, unknown>;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
  processedAt?: Date;
  createdAt: Date;
}

const SyncQueueSchema = new Schema<ISyncQueue>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    operationId: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "retry"],
      default: "pending",
    },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 5 },
    error: { type: String },
    processedAt: { type: Date },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SyncQueueSchema.index({ userId: 1, status: 1 });
SyncQueueSchema.index({ operationId: 1 });

export const SyncQueue: Model<ISyncQueue> =
  mongoose.models.SyncQueue ??
  mongoose.model<ISyncQueue>("SyncQueue", SyncQueueSchema);
