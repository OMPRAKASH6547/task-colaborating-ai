import { NextRequest } from "next/server";
import { AuthService } from "@/services/auth.service";
import { rateLimit, apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return apiError("Token is required");

  try {
    await AuthService.verifyEmail(token);
    return apiSuccess({ message: "Email verified successfully" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Verification failed";
    return apiError(message, 400);
  }
}
