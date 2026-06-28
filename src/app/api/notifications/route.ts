import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import { NotificationRepository } from "@/services/repositories";
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

export async function GET(request: NextRequest) {
  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const notifications = await NotificationRepository.findByUser(
    user.sub,
    unreadOnly,
  );

  return apiSuccess(notifications);
}

export async function PATCH(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  const json = await request.json();

  if (json.markAllRead) {
    await NotificationRepository.markAllRead(user.sub);
    return apiSuccess({ message: "All notifications marked as read" });
  }

  if (json.id) {
    await NotificationRepository.markRead(json.id);
    return apiSuccess({ message: "Notification marked as read" });
  }

  return apiError("Invalid request");
}
