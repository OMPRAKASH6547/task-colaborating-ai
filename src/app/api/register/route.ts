import { NextRequest } from "next/server";
import { AuthService } from "@/services/auth.service";
import { registerSchema } from "@/schemas";
import {
  rateLimit,
  apiSuccess,
  apiError,
  validatePayloadSize,
} from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const body = await request.text();
  if (!validatePayloadSize(body)) {
    return apiError("Payload too large", 413);
  }

  try {
    const json = JSON.parse(body);
    const parsed = registerSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const result = await AuthService.register(parsed.data);

    const response = apiSuccess(
      {
        user: {
          id: result.user._id.toString(),
          name: result.user.name,
          email: result.user.email,
          role: result.user.role,
          emailVerified: result.user.emailVerified,
        },
      },
      201,
    );

    response.cookies.set("accessToken", result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60,
      path: "/",
    });

    response.cookies.set("refreshToken", result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Registration failed";
    return apiError(message, 400);
  }
}
