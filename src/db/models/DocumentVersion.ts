import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IDocumentVersion extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  version: number;
  title: string;
  content: string;
  createdBy: mongoose.Types.ObjectId;
  changeSummary: string;
  createdAt: Date;
}

const DocumentVersionSchema = new Schema<IDocumentVersion>(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    version: { type: Number, required: true },
    title: { type: String, required: true },
    content: { type: String, default: "" },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    changeSummary: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

DocumentVersionSchema.index({ documentId: 1, version: -1 });

export const DocumentVersion: Model<IDocumentVersion> =
  mongoose.models.DocumentVersion ??
  mongoose.model<IDocumentVersion>("DocumentVersion", DocumentVersionSchema);
