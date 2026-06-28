import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import {
  DocumentRepository,
  CommentRepository,
  NotificationRepository,
} from "@/services/repositories";
import { commentSchema } from "@/schemas";
import {
  rateLimit,
  apiSuccess,
  apiError,
  getAuthHeader,
  sanitizeInput,
} from "@/lib/api-utils";

async function authenticate(request: NextRequest) {
  const token = getAuthHeader(request) ?? request.cookies.get("accessToken")?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const role = await DocumentRepository.getUserRole(id, user.sub);
  if (!role) return apiError("Forbidden", 403);

  const comments = await CommentRepository.findByDocument(id);
  return apiSuccess(comments);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const role = await DocumentRepository.getUserRole(id, user.sub);
  if (!role || role === "viewer") return apiError("Forbidden", 403);

  try {
    const json = await request.json();
    const parsed = commentSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const comment = await CommentRepository.create({
      documentId: id,
      userId: user.sub,
      content: sanitizeInput(parsed.data.content),
      position: parsed.data.position,
    });

    return apiSuccess(
      {
        id: comment._id.toString(),
        content: comment.content,
        position: comment.position,
        createdAt: comment.createdAt,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create comment";
    return apiError(message, 500);
  }
}
