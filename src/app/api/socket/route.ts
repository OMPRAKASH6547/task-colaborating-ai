import { getSocketServer } from "@/lib/socket/server";

export async function GET() {
  const initialized = getSocketServer() !== null;
  return Response.json({
    success: true,
    message: initialized
      ? "Socket.IO server is running"
      : "Socket.IO initializes with the custom Node server (see server.ts)",
    initialized,
  });
}

export async function POST() {
  return GET();
}
