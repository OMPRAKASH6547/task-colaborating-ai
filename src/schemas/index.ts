import { z } from "zod";

export const userRoleSchema = z.enum(["owner", "editor", "viewer"]);

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const documentSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

export const updateDocumentSchema = documentSchema.partial();

export const shareDocumentSchema = z.object({
  email: z.string().email(),
  role: userRoleSchema.exclude(["owner"]),
});

export const commentSchema = z.object({
  content: z.string().min(1).max(5000),
  position: z.number().min(0),
});

export const vectorClockSchema = z.record(z.string(), z.number());

export const operationPayloadSchema = z.object({
  content: z.string().optional(),
  position: z.number().optional(),
  length: z.number().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  snapshot: z.string().optional(),
});

export const operationSchema = z.object({
  operationId: z.string().uuid(),
  documentId: z.string().uuid(),
  userId: z.string(),
  timestamp: z.number(),
  version: z.number().int().min(0),
  vectorClock: vectorClockSchema,
  operationType: z.enum(["insert", "delete", "replace", "restore"]),
  payload: operationPayloadSchema,
});

export const syncBatchSchema = z.object({
  operations: z.array(operationSchema).min(1).max(100),
  lastSyncedVersion: z.number().int().min(0),
});

export const aiRequestSchema = z.object({
  action: z.enum([
    "summarize",
    "rewrite",
    "grammar",
    "translate",
    "title",
    "tags",
    "explain",
    "continue",
    "meeting-notes",
    "action-items",
    "chat",
  ]),
  content: z.string().min(1).max(100000),
  selection: z.string().max(10000).optional(),
  language: z.string().optional(),
  prompt: z.string().max(5000).optional(),
});

export const versionSnapshotSchema = z.object({
  title: z.string().optional(),
  changeSummary: z.string().max(500).optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DocumentInput = z.infer<typeof documentSchema>;
export type ShareDocumentInput = z.infer<typeof shareDocumentSchema>;
export type CommentInput = z.infer<typeof commentSchema>;
export type OperationInput = z.infer<typeof operationSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
export type AIRequestInput = z.infer<typeof aiRequestSchema>;
