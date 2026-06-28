import mongoose, { Schema, type Document, type Model } from "mongoose";
import type { UserRole } from "@/types";

export interface IShare extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  sharedBy: mongoose.Types.ObjectId;
  role: UserRole;
  createdAt: Date;
}

const ShareSchema = new Schema<IShare>(
  {
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
      index: true,
    },
    sharedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["owner", "editor", "viewer"],
      default: "viewer",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

ShareSchema.index({ documentId: 1, userId: 1 }, { unique: true });

export const Share: Model<IShare> =
  mongoose.models.Share ?? mongoose.model<IShare>("Share", ShareSchema);
