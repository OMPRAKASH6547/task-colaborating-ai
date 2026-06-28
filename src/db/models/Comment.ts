import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface IComment extends Document {
  _id: mongoose.Types.ObjectId;
  documentId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  position: number;
  resolved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
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
    },
    content: { type: String, required: true, maxlength: 5000 },
    position: { type: Number, required: true, min: 0 },
    resolved: { type: Boolean, default: false },
  },
  { timestamps: true },
);

CommentSchema.index({ documentId: 1, createdAt: -1 });

export const Comment: Model<IComment> =
  mongoose.models.Comment ??
  mongoose.model<IComment>("Comment", CommentSchema);
