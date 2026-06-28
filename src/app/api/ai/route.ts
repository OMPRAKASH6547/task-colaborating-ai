import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/tokens";
import { DocumentRepository } from "@/services/repositories";
import { AIService } from "@/services/ai.service";
import { aiRequestSchema } from "@/schemas";
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

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 5);
  if (limited) return limited;

  const user = await authenticate(request);
  if (!user) return apiError("Unauthorized", 401);

  if (!AIService.isAvailable()) {
    return apiError("AI service not configured", 503);
  }

  try {
    const json = await request.json();
    const parsed = aiRequestSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    if (parsed.data.action !== "chat") {
      const docId = request.nextUrl.searchParams.get("documentId");
      if (docId) {
        const role = await DocumentRepository.getUserRole(docId, user.sub);
        if (!role) return apiError("Forbidden", 403);
      }
    }

    const result = await AIService.process(parsed.data);
    return apiSuccess({ result, action: parsed.data.action });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI processing failed";
    return apiError(message, 500);
  }
}
