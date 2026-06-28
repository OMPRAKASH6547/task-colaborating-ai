"use client";

import type { Editor } from "@tiptap/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Minus,
  Table,
  Image,
  Highlighter,
  Link,
  CheckSquare,
  Undo,
  Redo,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EditorToolbarProps {
  editor: Editor;
  onImageUpload: () => void;
}

export function EditorToolbar({ editor, onImageUpload }: EditorToolbarProps) {
  const ToolButton = ({
    onClick,
    active,
    children,
    title,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    title: string;
  }) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", active && "bg-accent")}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  );

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  };

  const insertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-y px-4 py-1.5 bg-muted/30">
      <ToolButton onClick={() => editor.chain().focus().undo().run()} title="Undo (Ctrl+Z)">
        <Undo className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={() => editor.chain().focus().redo().run()} title="Redo (Ctrl+Y)">
        <Redo className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        active={editor.isActive("heading", { level: 1 })}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Heading 3"
      >
        <Heading3 className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Strikethrough"
      >
        <Strikethrough className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        active={editor.isActive("highlight")}
        title="Highlight"
      >
        <Highlighter className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        active={editor.isActive("code")}
        title="Inline Code"
      >
        <Code className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolButton
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        active={editor.isActive("taskList")}
        title="Task List"
      >
        <CheckSquare className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        active={editor.isActive("codeBlock")}
        title="Code Block"
      >
        <Code className="h-4 w-4" />
      </ToolButton>
      <ToolButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal Rule"
      >
        <Minus className="h-4 w-4" />
      </ToolButton>

      <Separator orientation="vertical" className="mx-1 h-6" />

      <ToolButton onClick={insertTable} title="Insert Table">
        <Table className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={onImageUpload} title="Upload Image">
        <Image className="h-4 w-4" />
      </ToolButton>
      <ToolButton onClick={addLink} active={editor.isActive("link")} title="Add Link">
        <Link className="h-4 w-4" />
      </ToolButton>
    </div>
  );
}
