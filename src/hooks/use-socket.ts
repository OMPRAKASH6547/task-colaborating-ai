"use client";

import { useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { usePresenceStore } from "@/store";
import { generateUserColor } from "@/lib/utils";
import type { PresenceUser } from "@/types";

interface UseSocketOptions {
  documentId: string;
  userId: string;
  userName: string;
  userEmail: string;
  enabled?: boolean;
}

let socketInstance: Socket | null = null;

export function useSocket({
  documentId,
  userId,
  userName,
  userEmail,
  enabled = true,
}: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { setUsers, addUser, removeUser, updateCursor, setTyping } =
    usePresenceStore();

  useEffect(() => {
    if (!enabled || !documentId || !userId) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:3000";

    if (!socketInstance) {
      socketInstance = io(socketUrl, {
        path: "/api/socket",
        transports: ["websocket", "polling"],
        autoConnect: true,
      });
    }

    socketRef.current = socketInstance;

    const socket = socketRef.current;

    socket.emit("join-document", {
      documentId,
      user: {
        userId,
        name: userName,
        email: userEmail,
        color: generateUserColor(userId),
      },
    });

    socket.on("presence-update", (users: PresenceUser[]) => {
      setUsers(users);
    });

    socket.on("user-joined", (user: PresenceUser) => {
      addUser(user);
    });

    socket.on("user-left", (leftUserId: string) => {
      removeUser(leftUserId);
    });

    socket.on("cursor-update", (data: { userId: string; cursor: { from: number; to: number } }) => {
      updateCursor(data.userId, data.cursor);
    });

    socket.on("typing-update", (data: { userId: string; isTyping: boolean }) => {
      setTyping(data.userId, data.isTyping);
    });

    socket.on(
      "content-update",
      (data: { content: string; userId: string }) => {
        if (data.userId !== userId) {
          window.dispatchEvent(
            new CustomEvent("remote-content-update", { detail: data }),
          );
        }
      },
    );

    socket.on(
      "comment-added",
      (comment: Record<string, unknown>) => {
        window.dispatchEvent(
          new CustomEvent("remote-comment-added", { detail: comment }),
        );
      },
    );

    return () => {
      socket.emit("leave-document", { documentId, userId });
    };
  }, [
    documentId,
    userId,
    userName,
    userEmail,
    enabled,
    setUsers,
    addUser,
    removeUser,
    updateCursor,
    setTyping,
  ]);

  const emitCursor = (cursor: { from: number; to: number }) => {
    socketRef.current?.emit("cursor-move", { documentId, userId, cursor });
  };

  const emitTyping = (isTyping: boolean) => {
    socketRef.current?.emit("typing", { documentId, userId, isTyping });
  };

  const emitContentUpdate = (content: string) => {
    socketRef.current?.emit("content-change", {
      documentId,
      userId,
      content,
    });
  };

  const emitComment = (comment: Record<string, unknown>) => {
    socketRef.current?.emit("add-comment", { documentId, comment });
  };

  return { emitCursor, emitTyping, emitContentUpdate, emitComment, socket: socketRef };
}
