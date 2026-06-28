import { RateLimiterMemory } from "rate-limiter-flexible";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const rateLimiter = new RateLimiterMemory({
  points: 100,
  duration: 60,
});

export async function rateLimit(
  request: NextRequest,
  points = 1,
): Promise<NextResponse | null> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown";

  try {
    await rateLimiter.consume(ip, points);
    return null;
  } catch {
    return NextResponse.json(
      { success: false, error: "Too many requests" },
      { status: 429 },
    );
  }
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .trim();
}

export function validatePayloadSize(
  body: string,
  maxBytes = 1024 * 1024,
): boolean {
  return new TextEncoder().encode(body).length <= maxBytes;
}

export function getAuthHeader(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status });
}
