import { NextRequest } from "next/server";
import { AuthService } from "@/services/auth.service";
import { forgotPasswordSchema } from "@/schemas";
import { rateLimit, apiSuccess, apiError } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 3);
  if (limited) return limited;

  try {
    const json = await request.json();
    const parsed = forgotPasswordSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    await AuthService.forgotPassword(parsed.data.email);

    return apiSuccess({
      message:
        "If an account exists with this email, a reset link has been sent.",
    });
  } catch {
    return apiSuccess({
      message:
        "If an account exists with this email, a reset link has been sent.",
    });
  }
}
