import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { OperationType, VectorClock } from "@/types";

export interface IOperation extends Document {
  _id: mongoose.Types.ObjectId;
  operationId: string;
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  timestamp: number;
  version: number;
  vectorClock: VectorClock;
  operationType: OperationType;
  payload: {
    content?: string;
    position?: number;
    length?: number;
    attributes?: Record<string, unknown>;
    snapshot?: string;
  };
  synced: boolean;
  createdAt: Date;
}

const OperationSchema = new Schema<IOperation>(
  {
    operationId: { type: String, required: true, unique: true },
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    timestamp: { type: Number, required: true },
    version: { type: Number, required: true },
    vectorClock: { type: Map, of: Number, default: {} },
    operationType: {
      type: String,
      enum: ["insert", "delete", "replace", "restore"],
      required: true,
    },
    payload: {
      content: String,
      position: Number,
      length: Number,
      attributes: Schema.Types.Mixed,
      snapshot: String,
    },
    synced: { type: Boolean, default: true },
  },
  { timestamps: true },
);

OperationSchema.index({ documentId: 1, version: 1 });
OperationSchema.index({ documentId: 1, timestamp: 1 });

export const Operation: Model<IOperation> =
  mongoose.models.Operation ??
  mongoose.model<IOperation>("Operation", OperationSchema);
