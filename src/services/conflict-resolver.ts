import {
  compareVectorClocks,
  mergeVectorClocks,
  incrementVectorClock,
} from "@/lib/utils";
import type { DocumentOperation, OperationType } from "@/types";

export class ConflictResolver {
  static applyOperation(
    content: string,
    operation: DocumentOperation,
  ): string {
    const { operationType, payload } = operation;

    switch (operationType) {
      case "insert":
        return this.applyInsert(content, payload);
      case "delete":
        return this.applyDelete(content, payload);
      case "replace":
        return payload.snapshot ?? payload.content ?? content;
      case "restore":
        return payload.snapshot ?? content;
      default:
        return content;
    }
  }

  private static applyInsert(
    content: string,
    payload: DocumentOperation["payload"],
  ): string {
    const position = payload.position ?? content.length;
    const insertContent = payload.content ?? "";
    return (
      content.slice(0, position) + insertContent + content.slice(position)
    );
  }

  private static applyDelete(
    content: string,
    payload: DocumentOperation["payload"],
  ): string {
    const position = payload.position ?? 0;
    const length = payload.length ?? 0;
    return content.slice(0, position) + content.slice(position + length);
  }

  static mergeOperations(
    localOps: DocumentOperation[],
    remoteOps: DocumentOperation[],
    baseContent: string,
  ): { content: string; mergedClock: Record<string, number> } {
    const allOps = [...localOps, ...remoteOps].sort((a, b) => {
      if (a.timestamp !== b.timestamp) return a.timestamp - b.timestamp;
      return a.operationId.localeCompare(b.operationId);
    });

    let content = baseContent;
    let mergedClock: Record<string, number> = {};

    for (const op of allOps) {
      const comparison = compareVectorClocks(
        op.vectorClock,
        mergedClock,
      );

      if (comparison === "concurrent") {
        content = this.resolveConcurrent(content, op);
      } else {
        content = this.applyOperation(content, op);
      }

      mergedClock = mergeVectorClocks(mergedClock, op.vectorClock);
    }

    return { content, mergedClock };
  }

  private static resolveConcurrent(
    content: string,
    operation: DocumentOperation,
  ): string {
    if (operation.operationType === "replace") {
      return operation.payload.snapshot ?? operation.payload.content ?? content;
    }
    return this.applyOperation(content, operation);
  }

  static createOperation(
    documentId: string,
    userId: string,
    operationType: OperationType,
    payload: DocumentOperation["payload"],
    currentVersion: number,
    currentClock: Record<string, number>,
  ): DocumentOperation {
    const vectorClock = incrementVectorClock(currentClock, userId);

    return {
      operationId: crypto.randomUUID(),
      documentId,
      userId,
      timestamp: Date.now(),
      version: currentVersion + 1,
      vectorClock,
      operationType,
      payload,
    };
  }

  static transformOperation(
    op: DocumentOperation,
    against: DocumentOperation,
  ): DocumentOperation {
    if (op.operationType === "replace" || against.operationType === "replace") {
      return op;
    }

    const transformed = { ...op, payload: { ...op.payload } };

    if (
      op.operationType === "insert" &&
      against.operationType === "insert" &&
      op.payload.position !== undefined &&
      against.payload.position !== undefined &&
      against.payload.content
    ) {
      if (op.payload.position >= against.payload.position) {
        transformed.payload.position =
          op.payload.position + (against.payload.content.length ?? 0);
      }
    }

    if (
      op.operationType === "insert" &&
      against.operationType === "delete" &&
      op.payload.position !== undefined &&
      against.payload.position !== undefined
    ) {
      const deleteEnd =
        against.payload.position + (against.payload.length ?? 0);
      if (op.payload.position > against.payload.position) {
        transformed.payload.position = Math.max(
          against.payload.position,
          op.payload.position - (against.payload.length ?? 0),
        );
      }
      if (op.payload.position >= deleteEnd) {
        transformed.payload.position =
          op.payload.position - (against.payload.length ?? 0);
      }
    }

    return transformed;
  }
}
