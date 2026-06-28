import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import type { JwtPayload, UserRole } from "@/types";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fallback-secret-change-in-production-min-32-chars",
);

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY = "7d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createAccessToken(payload: {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(payload: {
  sub: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function verifyToken(token: string): Promise<JwtPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export function generateVerificationToken(): string {
  return crypto.randomUUID();
}

export function generateResetToken(): string {
  return crypto.randomUUID();
}

export function getTokenExpiry(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}
