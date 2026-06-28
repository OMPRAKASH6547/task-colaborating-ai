"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { LocalDocumentService } from "@/services/local-document.service";
import type { LocalDocument } from "@/types";
import { RichTextEditor } from "@/features/editor/components/rich-text-editor";
import { AIPanel } from "@/features/editor/components/ai-panel";
import { VersionHistoryPanel } from "@/features/editor/components/version-history-panel";
import { CommentsPanel } from "@/features/editor/components/comments-panel";
import { PresenceBar } from "@/features/editor/components/presence-bar";
import { useSocket } from "@/hooks/use-socket";
import { useEditorStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRelativeTime } from "@/lib/utils";
import {
  ArrowLeft,
  Sparkles,
  History,
  MessageSquare,
  Save,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function EditorPageContent() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const documentId = params.id as string;

  const [document, setDocument] = useState<LocalDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");

  const {
    isSaving,
    lastSaved,
    showAI,
    showComments,
    showVersionHistory,
    toggleAI,
    toggleComments,
    toggleVersionHistory,
    setDocumentId,
  } = useEditorStore();

  const userId = session?.user?.id ?? "local-user";
  const userName = session?.user?.name ?? "Anonymous";
  const userEmail = session?.user?.email ?? "";
  const readOnly = document?.role === "viewer";

  const { emitContentUpdate } = useSocket({
    documentId,
    userId,
    userName,
    userEmail,
    enabled: !!session,
  });

  useEffect(() => {
    setDocumentId(documentId);
    LocalDocumentService.get(documentId).then((doc) => {
      if (!doc) {
        toast.error("Document not found");
        router.push("/dashboard");
        return;
      }
      setDocument(doc);
      setContent(doc.content);
      setLoading(false);
    });

    return () => setDocumentId(null);
  }, [documentId, router, setDocumentId]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail.content) {
        setContent(detail.content);
      }
    };
    window.addEventListener("remote-content-update", handler);
    return () => window.removeEventListener("remote-content-update", handler);
  }, []);

  const handleContentChange = useCallback(
    (newContent: string) => {
      setContent(newContent);
      emitContentUpdate(newContent);
    },
    [emitContentUpdate],
  );

  const handleRestore = (restoredContent: string, title: string) => {
    setContent(restoredContent);
    setDocument((prev) =>
      prev ? { ...prev, content: restoredContent, title } : prev,
    );
  };

  const handleAIApply = (result: string) => {
    setContent(result);
    LocalDocumentService.updateContent(documentId, result, userId);
    toast.success("AI result applied");
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen">
        <div className="border-b p-4">
          <Skeleton className="h-8 w-64" />
        </div>
        <Skeleton className="flex-1 m-4" />
      </div>
    );
  }

  if (!document) return null;

  return (
    <div className="flex flex-col h-screen">
      <header className="flex items-center gap-3 border-b px-4 py-2 shrink-0">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div className="flex-1 min-w-0">
          <PresenceBar />
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          ) : lastSaved ? (
            <>
              <Save className="h-3 w-3" />
              Saved {formatRelativeTime(lastSaved)}
            </>
          ) : null}
        </div>

        {readOnly && (
          <Badge variant="secondary">View Only</Badge>
        )}

        <Button
          variant={showComments ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={toggleComments}
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant={showVersionHistory ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={toggleVersionHistory}
        >
          <History className="h-4 w-4" />
        </Button>
        <Button
          variant={showAI ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8"
          onClick={toggleAI}
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <RichTextEditor
            documentId={documentId}
            userId={userId}
            initialContent={content}
            initialTitle={document.title}
            readOnly={readOnly}
            onContentChange={handleContentChange}
            onTitleChange={(title) =>
              setDocument((prev) => (prev ? { ...prev, title } : prev))
            }
          />
        </div>

        {showComments && (
          <CommentsPanel
            documentId={documentId}
            readOnly={readOnly}
            onClose={toggleComments}
          />
        )}
        {showVersionHistory && (
          <VersionHistoryPanel
            documentId={documentId}
            onRestore={handleRestore}
            onClose={toggleVersionHistory}
          />
        )}
        {showAI && (
          <AIPanel
            content={content}
            onApply={handleAIApply}
            onClose={toggleAI}
          />
        )}
      </div>
    </div>
  );
}
