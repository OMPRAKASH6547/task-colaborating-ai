import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import { DocumentRepository } from "@/services/repositories";
import { updateDocumentSchema } from "@/schemas";
import {
  rateLimit,
  apiSuccess,
  apiError,
  getAuthHeader,
} from "@/lib/api-utils";
import { sanitizeHtml } from "@/lib/sanitize";

async function authenticate(request: NextRequest) {
  const token = getAuthHeader(request) ?? request.cookies.get("accessToken")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;

  try {
    const role = await DocumentRepository.getUserRole(id, user.sub);
    if (!role) return apiError("Document not found", 404);

    const doc = await DocumentRepository.findById(id);
    if (!doc) return apiError("Document not found", 404);

    return apiSuccess({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      ownerId: doc.ownerId.toString(),
      tags: doc.tags,
      isFavourite: doc.isFavourite,
      version: doc.version,
      vectorClock: Object.fromEntries(doc.vectorClock ?? new Map()),
      role,
      status: doc.status,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch document";
    return apiError(message, 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;

  const canEdit = await DocumentRepository.canEdit(id, user.sub);
  if (!canEdit) return apiError("Forbidden", 403);

  try {
    const json = await request.json();
    const parsed = updateDocumentSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const updateData = { ...parsed.data };
    if (updateData.content) {
      updateData.content = sanitizeHtml(updateData.content);
    }

    const doc = await DocumentRepository.update(id, updateData, user.sub);
    if (!doc) return apiError("Document not found", 404);

    return apiSuccess({
      id: doc._id.toString(),
      title: doc.title,
      content: doc.content,
      tags: doc.tags,
      version: doc.version,
      updatedAt: doc.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update document";
    return apiError(message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const role = await DocumentRepository.getUserRole(id, user.sub);
  if (role !== "owner") return apiError("Forbidden", 403);

  try {
    const doc = await DocumentRepository.softDelete(id);
    if (!doc) return apiError("Document not found", 404);
    return apiSuccess({ message: "Document deleted" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return apiError(message, 500);
  }
}
