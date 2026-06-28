"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Wand2,
  Languages,
  Tag,
  MessageSquare,
  ListChecks,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import type { AIRequestInput } from "@/schemas";

interface AIPanelProps {
  content: string;
  selection?: string;
  onApply: (result: string) => void;
  onClose: () => void;
}

const actions: {
  action: AIRequestInput["action"];
  label: string;
  icon: React.ElementType;
}[] = [
  { action: "summarize", label: "Summarize", icon: FileText },
  { action: "rewrite", label: "Rewrite", icon: Wand2 },
  { action: "grammar", label: "Fix Grammar", icon: Check },
  { action: "translate", label: "Translate", icon: Languages },
  { action: "title", label: "Generate Title", icon: Sparkles },
  { action: "tags", label: "Generate Tags", icon: Tag },
  { action: "explain", label: "Explain Selection", icon: MessageSquare },
  { action: "continue", label: "Continue Writing", icon: Wand2 },
  { action: "meeting-notes", label: "Meeting Notes", icon: FileText },
  { action: "action-items", label: "Action Items", icon: ListChecks },
];

export function AIPanel({ content, selection, onApply, onClose }: AIPanelProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [chatPrompt, setChatPrompt] = useState("");
  const [copied, setCopied] = useState(false);

  const runAction = async (action: AIRequestInput["action"], prompt?: string) => {
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          content,
          selection,
          prompt,
          language: action === "translate" ? "Spanish" : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        toast.error(data.error ?? "AI request failed");
        return;
      }

      setResult(data.data.result);
    } catch {
      toast.error("AI service unavailable");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full border-l bg-card w-80 shrink-0">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-500" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ✕
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {actions.map(({ action, label, icon: Icon }) => (
            <Button
              key={action}
              variant="outline"
              size="sm"
              className="justify-start text-xs h-8"
              disabled={loading}
              onClick={() => runAction(action)}
            >
              <Icon className="mr-1.5 h-3 w-3" />
              {label}
            </Button>
          ))}
        </div>

        <div className="space-y-2">
          <Badge variant="secondary">Chat with Document</Badge>
          <div className="flex gap-2">
            <Input
              placeholder="Ask about this document..."
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && chatPrompt) {
                  runAction("chat", chatPrompt);
                }
              }}
            />
            <Button
              size="sm"
              disabled={loading || !chatPrompt}
              onClick={() => runAction("chat", chatPrompt)}
            >
              Ask
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {result && !loading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Badge>Result</Badge>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleCopy}>
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => onApply(result)}
                >
                  Apply
                </Button>
              </div>
            </div>
            <div className="rounded-md border bg-muted/50 p-3 text-sm whitespace-pre-wrap max-h-64 overflow-y-auto">
              {result}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
