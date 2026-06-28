import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import {
  DocumentRepository,
  OperationRepository,
} from "@/services/repositories";
import { ConflictResolver } from "@/services/conflict-resolver";
import { syncBatchSchema } from "@/schemas";
import { SyncQueue } from "@/db/models";
import mongoose from "mongoose";
import {
  rateLimit,
  apiSuccess,
  apiError,
  getAuthHeader,
  validatePayloadSize,
} from "@/lib/api-utils";
import { sanitizeHtml } from "@/lib/sanitize";

async function authenticate(request: NextRequest) {
  const token = getAuthHeader(request) ?? request.cookies.get("accessToken")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const documentId = request.nextUrl.searchParams.get("documentId");
  const sinceVersion = parseInt(
    request.nextUrl.searchParams.get("sinceVersion") ?? "0",
  );

  if (!documentId) return apiError("documentId is required");

  const role = await DocumentRepository.getUserRole(documentId, user.sub);
  if (!role) return apiError("Forbidden", 403);

  try {
    const operations = await OperationRepository.findByDocument(
      documentId,
      sinceVersion,
    );

    return apiSuccess({
      operations: operations.map((op) => ({
        operationId: op.operationId,
        documentId: op.documentId.toString(),
        userId: op.userId.toString(),
        timestamp: op.timestamp,
        version: op.version,
        vectorClock: Object.fromEntries(op.vectorClock ?? new Map()),
        operationType: op.operationType,
        payload: op.payload,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync fetch failed";
    return apiError(message, 500);
  }
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 10);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const body = await request.text();
  if (!validatePayloadSize(body, 512 * 1024)) {
    return apiError("Payload too large", 413);
  }

  try {
    const json = JSON.parse(body);
    const parsed = syncBatchSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid sync payload");
    }

    const { operations, lastSyncedVersion } = parsed.data;

    for (const op of operations) {
      if (op.userId !== user.sub) {
        return apiError("Unauthorized operation", 403);
      }

      const existing = await OperationRepository.findByOperationId(
        op.operationId,
      );
      if (existing) {
        return apiError("Duplicate operation detected", 409);
      }

      const canEdit = await DocumentRepository.canEdit(op.documentId, user.sub);
      if (!canEdit) return apiError("Forbidden", 403);
    }

    const documentId = operations[0].documentId;
    const doc = await DocumentRepository.findById(documentId);
    if (!doc) return apiError("Document not found", 404);

    if (lastSyncedVersion < doc.version - operations.length) {
      return apiError("Version conflict detected", 409);
    }

    const serverOps = await OperationRepository.findByDocument(
      documentId,
      lastSyncedVersion,
    );

    let content = doc.content;
    const remoteOps = serverOps.map((op) => ({
      operationId: op.operationId,
      documentId: op.documentId.toString(),
      userId: op.userId.toString(),
      timestamp: op.timestamp,
      version: op.version,
      vectorClock: Object.fromEntries(op.vectorClock ?? new Map()),
      operationType: op.operationType as "insert" | "delete" | "replace" | "restore",
      payload: op.payload,
    }));

    const { content: mergedContent, mergedClock } =
      ConflictResolver.mergeOperations(
        operations,
        remoteOps,
        content,
      );

    const latestVersion = await OperationRepository.getLatestVersion(documentId);
    const newVersion = latestVersion + operations.length;

    const dbOperations = operations.map((op, index) => ({
      operationId: op.operationId,
      documentId: new mongoose.Types.ObjectId(op.documentId),
      userId: new mongoose.Types.ObjectId(op.userId),
      timestamp: op.timestamp,
      version: latestVersion + index + 1,
      vectorClock: op.vectorClock,
      operationType: op.operationType,
      payload: {
        ...op.payload,
        snapshot: op.payload.snapshot
          ? sanitizeHtml(op.payload.snapshot)
          : undefined,
        content: op.payload.content
          ? sanitizeHtml(op.payload.content)
          : undefined,
      },
      synced: true,
    }));

    await OperationRepository.createMany(dbOperations);

    await DocumentRepository.update(
      documentId,
      {
        content: sanitizeHtml(mergedContent),
        version: newVersion,
        vectorClock: mergedClock,
      },
      user.sub,
    );

    for (const op of dbOperations) {
      await SyncQueue.create({
        userId: new mongoose.Types.ObjectId(user.sub),
        documentId: new mongoose.Types.ObjectId(documentId),
        operationId: op.operationId,
        payload: op,
        status: "completed",
        processedAt: new Date(),
      });
    }

    return apiSuccess({
      mergedContent: sanitizeHtml(mergedContent),
      version: newVersion,
      vectorClock: mergedClock,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return apiError(message, 500);
  }
}
