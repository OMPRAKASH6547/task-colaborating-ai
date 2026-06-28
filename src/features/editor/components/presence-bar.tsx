"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { usePresenceStore } from "@/store";

export function PresenceBar() {
  const users = usePresenceStore((s) => s.users);

  if (users.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        {users.length} online
      </span>
      <div className="flex -space-x-2">
        {users.slice(0, 5).map((user) => (
          <Avatar
            key={user.userId}
            className="h-7 w-7 border-2"
            style={{ borderColor: user.color }}
            title={`${user.name}${user.isTyping ? " (typing...)" : ""}`}
          >
            <AvatarFallback
              className="text-xs text-white"
              style={{ backgroundColor: user.color }}
            >
              {user.name[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
        {users.length > 5 && (
          <Avatar className="h-7 w-7 border-2 border-background">
            <AvatarFallback className="text-xs">
              +{users.length - 5}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
      {users.some((u) => u.isTyping) && (
        <span className="text-xs text-muted-foreground animate-pulse">
          Someone is typing...
        </span>
      )}
    </div>
  );
}
