import { NextRequest } from "next/server";
import { AuthService } from "@/services/auth.service";
import { verifyToken } from "@/lib/auth/tokens";
import { rateLimit, apiSuccess, apiError, getAuthHeader } from "@/lib/api-utils";

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request);
  if (limited) return limited;

  const refreshToken =
    request.cookies.get("refreshToken")?.value ??
    (await request.json().then((b) => b.refreshToken).catch(() => null));

  if (!refreshToken) return apiError("Refresh token required", 401);

  try {
    const result = await AuthService.refreshAccessToken(refreshToken);

    const response = apiSuccess({ message: "Token refreshed" });
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
      error instanceof Error ? error.message : "Token refresh failed";
    return apiError(message, 401);
  }
}

export async function DELETE(request: NextRequest) {
  const refreshToken = request.cookies.get("refreshToken")?.value;
  if (refreshToken) {
    await AuthService.logout(refreshToken);
  }

  const response = apiSuccess({ message: "Logged out" });
  response.cookies.delete("accessToken");
  response.cookies.delete("refreshToken");
  return response;
}

export async function GET(request: NextRequest) {
  const token = getAuthHeader(request) ?? request.cookies.get("accessToken")?.value;
  if (!token) return apiError("Unauthorized", 401);

  const payload = await verifyToken(token);
  if (!payload) return apiError("Invalid token", 401);

  const user = await AuthService.getUserById(payload.sub);
  if (!user) return apiError("User not found", 404);

  return apiSuccess({
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      emailVerified: user.emailVerified,
    },
  });
}
