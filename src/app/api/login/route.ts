import { NextRequest } from "next/server";
import { AuthService } from "@/services/auth.service";
import { loginSchema } from "@/schemas";
import {
  rateLimit,
  apiSuccess,
  apiError,
} from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 5);
  if (limited) return limited;

  try {
    const json = await request.json();
    const parsed = loginSchema.safeParse(json);
    if (!parsed.success) {
      return apiError(parsed.error.issues[0]?.message ?? "Invalid input");
    }

    const result = await AuthService.login(
      parsed.data.email,
      parsed.data.password,
      {
        userAgent: request.headers.get("user-agent") ?? undefined,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0] ?? undefined,
      },
    );

    const response = apiSuccess({
      user: {
        id: result.user._id.toString(),
        name: result.user.name,
        email: result.user.email,
        role: result.user.role,
        emailVerified: result.user.emailVerified,
      },
    });

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
    const message = error instanceof Error ? error.message : "Login failed";
    return apiError(message, 401);
  }
}
