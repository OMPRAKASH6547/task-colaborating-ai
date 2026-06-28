import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/collabdocs"),
  JWT_SECRET: z
    .string()
    .min(32)
    .default("dev-jwt-secret-change-in-production-min-32-chars"),
  NEXTAUTH_SECRET: z
    .string()
    .min(32)
    .default("dev-nextauth-secret-change-in-production-32"),
  NEXTAUTH_URL: z.string().url().optional(),
  OPENAI_API_KEY: z.string().optional(),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  NEXT_PUBLIC_SOCKET_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
