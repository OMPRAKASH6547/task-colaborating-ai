"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Check } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";

interface Comment {
  _id: string;
  content: string;
  position: number;
  resolved: boolean;
  createdAt: string;
  userId?: { name: string; email: string };
}

interface CommentsPanelProps {
  documentId: string;
  readOnly?: boolean;
  onClose: () => void;
}

export function CommentsPanel({
  documentId,
  readOnly,
  onClose,
}: CommentsPanelProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  const loadComments = () => {
    fetch(`/api/documents/${documentId}/comments`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setComments(data.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadComments();

    const handler = () => loadComments();
    window.addEventListener("remote-comment-added", handler);
    return () => window.removeEventListener("remote-comment-added", handler);
  }, [documentId]);

  const addComment = async () => {
    if (!newComment.trim()) return;

    const res = await fetch(`/api/documents/${documentId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment, position: 0 }),
    });

    const data = await res.json();
    if (data.success) {
      setNewComment("");
      loadComments();
      toast.success("Comment added");
    } else {
      toast.error(data.error ?? "Failed to add comment");
    }
  };

  return (
    <div className="flex flex-col h-full border-l bg-card w-80 shrink-0">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">Comments</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No comments yet. Start a discussion!
          </p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment._id}
              className={`rounded-md border p-3 ${comment.resolved ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {comment.userId?.name?.[0] ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">
                  {comment.userId?.name ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {formatRelativeTime(new Date(comment.createdAt).getTime())}
                </span>
              </div>
              <p className="text-sm mt-2">{comment.content}</p>
              {comment.resolved && (
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  Resolved
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!readOnly && (
        <div className="border-t p-4 flex gap-2">
          <Input
            placeholder="Add a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addComment()}
          />
          <Button size="icon" onClick={addComment} disabled={!newComment.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
