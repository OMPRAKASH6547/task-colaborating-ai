import mongoose, { Schema, type Document, type Model } from "mongoose";

export interface ISession extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
}

const SessionSchema = new Schema<ISession>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refreshToken: { type: String, required: true, unique: true },
    userAgent: { type: String },
    ipAddress: { type: String },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const Session: Model<ISession> =
  mongoose.models.Session ??
  mongoose.model<ISession>("Session", SessionSchema);
