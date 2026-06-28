import type { Server as HTTPServer } from "http";
import type { Socket as NetSocket } from "net";
import { Server as SocketIOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";
import type { PresenceUser } from "@/types";

interface SocketServer extends HTTPServer {
  io?: SocketIOServer;
}

interface SocketWithIO extends NetSocket {
  server: SocketServer;
}

interface NextApiResponseWithSocket extends NextApiResponse {
  socket: SocketWithIO;
}

const documentRooms = new Map<string, Map<string, PresenceUser>>();

export function initSocket(
  req: NextApiRequest,
  res: NextApiResponseWithSocket,
) {
  if (!res.socket.server.io) {
    const io = new SocketIOServer(res.socket.server, {
      path: "/api/socket",
      addTrailingSlash: false,
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        methods: ["GET", "POST"],
      },
    });

    io.on("connection", (socket) => {
      socket.on(
        "join-document",
        (data: {
          documentId: string;
          user: Omit<PresenceUser, "isTyping" | "lastSeen">;
        }) => {
          const { documentId, user } = data;
          socket.join(documentId);

          if (!documentRooms.has(documentId)) {
            documentRooms.set(documentId, new Map());
          }

          const room = documentRooms.get(documentId)!;
          const presenceUser: PresenceUser = {
            ...user,
            isTyping: false,
            lastSeen: Date.now(),
          };
          room.set(user.userId, presenceUser);

          io.to(documentId).emit("presence-update", Array.from(room.values()));
          socket.to(documentId).emit("user-joined", presenceUser);
        },
      );

      socket.on(
        "leave-document",
        (data: { documentId: string; userId: string }) => {
          const { documentId, userId } = data;
          socket.leave(documentId);

          const room = documentRooms.get(documentId);
          if (room) {
            room.delete(userId);
            if (room.size === 0) {
              documentRooms.delete(documentId);
            } else {
              io.to(documentId).emit(
                "presence-update",
                Array.from(room.values()),
              );
            }
          }

          socket.to(documentId).emit("user-left", userId);
        },
      );

      socket.on(
        "cursor-move",
        (data: {
          documentId: string;
          userId: string;
          cursor: { from: number; to: number };
        }) => {
          const room = documentRooms.get(data.documentId);
          if (room) {
            const user = room.get(data.userId);
            if (user) {
              user.cursor = data.cursor;
              user.lastSeen = Date.now();
            }
          }
          socket.to(data.documentId).emit("cursor-update", {
            userId: data.userId,
            cursor: data.cursor,
          });
        },
      );

      socket.on(
        "typing",
        (data: { documentId: string; userId: string; isTyping: boolean }) => {
          const room = documentRooms.get(data.documentId);
          if (room) {
            const user = room.get(data.userId);
            if (user) user.isTyping = data.isTyping;
          }
          socket.to(data.documentId).emit("typing-update", {
            userId: data.userId,
            isTyping: data.isTyping,
          });
        },
      );

      socket.on(
        "content-change",
        (data: { documentId: string; userId: string; content: string }) => {
          socket.to(data.documentId).emit("content-update", {
            content: data.content,
            userId: data.userId,
          });
        },
      );

      socket.on(
        "add-comment",
        (data: { documentId: string; comment: Record<string, unknown> }) => {
          io.to(data.documentId).emit("comment-added", data.comment);
        },
      );

      socket.on("disconnect", () => {
        for (const [documentId, room] of documentRooms.entries()) {
          for (const [userId] of room.entries()) {
            if (socket.rooms.has(documentId)) {
              room.delete(userId);
              io.to(documentId).emit("user-left", userId);
              if (room.size === 0) documentRooms.delete(documentId);
            }
          }
        }
      });
    });

    res.socket.server.io = io;
  }

  return res.socket.server.io;
}
