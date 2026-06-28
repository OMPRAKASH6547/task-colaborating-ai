import type { NextRequest } from "next/server";
import { initSocket } from "@/lib/socket/server";
import type { NextApiRequest, NextApiResponse } from "next";

export async function GET(req: NextRequest) {
  const res = {
    socket: {
      server: {
        io: undefined as ReturnType<typeof initSocket> | undefined,
      },
    },
  };

  initSocket(req as unknown as NextApiRequest, res as unknown as NextApiResponse);

  return new Response("Socket.IO server initialized", { status: 200 });
}

export async function POST(req: NextRequest) {
  return GET(req);
}
