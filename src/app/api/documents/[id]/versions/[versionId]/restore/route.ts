import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import {
  DocumentRepository,
  VersionRepository,
} from "@/services/repositories";
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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { id, versionId } = await params;
  const canEdit = await DocumentRepository.canEdit(id, user.sub);
  if (!canEdit) return apiError("Forbidden", 403);

  try {
    const version = await VersionRepository.findById(versionId);
    if (!version || version.documentId.toString() !== id) {
      return apiError("Version not found", 404);
    }

    const doc = await DocumentRepository.update(
      id,
      {
        content: sanitizeHtml(version.content),
        title: version.title,
      },
      user.sub,
    );

    return apiSuccess({
      id: doc?._id.toString(),
      title: doc?.title,
      content: doc?.content,
      restoredFromVersion: version.version,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to restore version";
    return apiError(message, 500);
  }
}
