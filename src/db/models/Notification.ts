import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "share" | "comment" | "mention" | "sync" | "system";
  title: string;
  message: string;
  documentId?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["share", "comment", "mention", "sync", "system"],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    documentId: { type: Schema.Types.ObjectId, ref: "Document" },
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export const Notification: Model<INotification> =
  mongoose.models.Notification ??
  mongoose.model<INotification>("Notification", NotificationSchema);
