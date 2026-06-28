import { Queue, Worker } from "bullmq";
import { connectDB } from "@/db/connection";
import { SyncQueue } from "@/db/models";
import mongoose from "mongoose";

const connection = {
  url: process.env.REDIS_URL ?? "redis://localhost:6379",
  maxRetriesPerRequest: null,
};

export const syncQueue = new Queue("document-sync", { connection });

export function createSyncWorker() {
  return new Worker(
    "document-sync",
    async (job) => {
      await connectDB();
      const { operationId, userId, documentId, payload } = job.data;

      const existing = await SyncQueue.findOne({ operationId });
      if (existing?.status === "completed") return;

      try {
        await SyncQueue.findOneAndUpdate(
          { operationId },
          {
            userId: new mongoose.Types.ObjectId(userId),
            documentId: new mongoose.Types.ObjectId(documentId),
            operationId,
            payload,
            status: "completed",
            processedAt: new Date(),
          },
          { upsert: true },
        );
      } catch (error) {
        await SyncQueue.findOneAndUpdate(
          { operationId },
          {
            status: "failed",
            error: error instanceof Error ? error.message : "Unknown error",
            $inc: { retryCount: 1 },
          },
        );
        throw error;
      }
    },
    {
      connection,
      concurrency: 5,
      limiter: { max: 100, duration: 60000 },
    },
  );
}

export async function enqueueSyncJob(data: {
  operationId: string;
  userId: string;
  documentId: string;
  payload: Record<string, unknown>;
}) {
  await syncQueue.add("process-operation", data, {
    attempts: 5,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}
