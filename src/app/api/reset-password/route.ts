import { NextRequest } from "next/server";
import { AuthService } from "@/services/auth.service";
import { resetPasswordSchema } from "@/schemas";
import { rateLimit, apiSuccess, apiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 3);
  if (limited) return limited;

  try {
    const json = await request.json();
    const parsed = resetPasswordSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    await AuthService.resetPassword(parsed.data.token, parsed.data.password);
    return apiSuccess({ message: "Password reset successfully" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Password reset failed";
    return apiError(message, 400);
  }
}
