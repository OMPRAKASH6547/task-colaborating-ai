import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import {
  DocumentRepository,
  VersionRepository,
} from "@/services/repositories";
import { versionSnapshotSchema } from "@/schemas";
import {
  rateLimit,
  apiSuccess,
  apiError,
  getAuthHeader,
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

  const versions = await VersionRepository.findByDocument(id);
  return apiSuccess(versions);
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
  const canEdit = await DocumentRepository.canEdit(id, user.sub);
  if (!canEdit) return apiError("Forbidden", 403);

  try {
    const json = await request.json();
    const parsed = versionSnapshotSchema.safeParse(json);

    const doc = await DocumentRepository.findById(id);
    if (!doc) return apiError("Document not found", 404);

    const versions = await VersionRepository.findByDocument(id);
    const nextVersion = (versions[0]?.version ?? 0) + 1;

    const version = await VersionRepository.create({
      documentId: id,
      version: nextVersion,
      title: doc.title,
      content: doc.content,
      createdBy: user.sub,
      changeSummary: parsed.data?.changeSummary ?? "Manual snapshot",
    });

    return apiSuccess(
      {
        id: version._id.toString(),
        version: version.version,
        createdAt: version.createdAt,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create snapshot";
    return apiError(message, 500);
  }
}
