import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import {
  DocumentRepository,
  ShareRepository,
  NotificationRepository,
} from "@/services/repositories";
import { User } from "@/db/models";
import { shareDocumentSchema } from "@/schemas";
import { connectDB } from "@/db/connection";
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

  const shares = await ShareRepository.getShares(id);
  return apiSuccess(shares);
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
  if (role !== "owner") return apiError("Forbidden", 403);

  try {
    const json = await request.json();
    const parsed = shareDocumentSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    await connectDB();
    const targetUser = await User.findOne({
      email: parsed.data.email.toLowerCase(),
    });
    if (!targetUser) {
      return apiError("User not found with this email", 404);
    }

    const share = await ShareRepository.share(
      id,
      targetUser._id.toString(),
      user.sub,
      parsed.data.role,
    );

    await NotificationRepository.create({
      userId: targetUser._id.toString(),
      type: "share",
      title: "Document shared with you",
      message: `A document has been shared with you as ${parsed.data.role}`,
      documentId: id,
    });

    return apiSuccess(
      {
        userId: targetUser._id.toString(),
        email: targetUser.email,
        name: targetUser.name,
        role: share?.role,
      },
      201,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to share document";
    return apiError(message, 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const { id } = await params;
  const role = await DocumentRepository.getUserRole(id, user.sub);
  if (role !== "owner") return apiError("Forbidden", 403);

  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) return apiError("userId is required");

  await ShareRepository.removeShare(id, userId);
  return apiSuccess({ message: "Share removed" });
}
