export type UserRole = "owner" | "editor" | "viewer";

export type OperationType = "insert" | "delete" | "replace" | "restore";

export type SyncStatus = "pending" | "completed" | "failed" | "retry";

export type DocumentStatus = "active" | "deleted" | "archived";

export interface VectorClock {
  [userId: string]: number;
}

export interface OperationPayload {
  content?: string;
  position?: number;
  length?: number;
  attributes?: Record<string, unknown>;
  snapshot?: string;
}

export interface DocumentOperation {
  operationId: string;
  documentId: string;
  userId: string;
  timestamp: number;
  version: number;
  vectorClock: VectorClock;
  operationType: OperationType;
  payload: OperationPayload;
}

export interface LocalDocument {
  id: string;
  title: string;
  content: string;
  ownerId: string;
  tags: string[];
  isFavourite: boolean;
  isOffline: boolean;
  isDeleted: boolean;
  isShared: boolean;
  role: UserRole;
  version: number;
  vectorClock: VectorClock;
  lastModified: number;
  lastSyncedAt: number | null;
  syncStatus: SyncStatus;
  createdAt: number;
  updatedAt: number;
}

export interface LocalComment {
  id: string;
  documentId: string;
  userId: string;
  userName: string;
  content: string;
  position: number;
  resolved: boolean;
  createdAt: number;
  updatedAt: number;
  syncStatus: SyncStatus;
}

export interface SyncQueueItem {
  id: string;
  operation: DocumentOperation;
  status: SyncStatus;
  retryCount: number;
  maxRetries: number;
  error?: string;
  createdAt: number;
  processedAt?: number;
}

export interface PresenceUser {
  userId: string;
  name: string;
  email: string;
  avatar?: string;
  color: string;
  cursor?: { from: number; to: number };
  isTyping: boolean;
  lastSeen: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  content: string;
  title: string;
  createdBy: string;
  createdByName: string;
  changeSummary: string;
  createdAt: number;
}

export interface Notification {
  id: string;
  userId: string;
  type: "share" | "comment" | "mention" | "sync" | "system";
  title: string;
  message: string;
  documentId?: string;
  read: boolean;
  createdAt: number;
}

export interface SharePermission {
  documentId: string;
  userId: string;
  email: string;
  role: UserRole;
  sharedBy: string;
  createdAt: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
  emailVerified: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

export interface CursorPosition {
  from: number;
  to: number;
}

export interface AIRequest {
  action:
    | "summarize"
    | "rewrite"
    | "grammar"
    | "translate"
    | "title"
    | "tags"
    | "explain"
    | "continue"
    | "meeting-notes"
    | "action-items"
    | "chat";
  content: string;
  selection?: string;
  language?: string;
  prompt?: string;
}
