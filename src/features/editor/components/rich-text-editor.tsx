"use client";

import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import {
  Table,
  TableRow,
  TableCell,
  TableHeader,
} from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import CodeBlockLowlight from "@tiptap/extension-code-block-lowlight";
import Link from "@tiptap/extension-link";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import CharacterCount from "@tiptap/extension-character-count";
import { common, createLowlight } from "lowlight";
import { useCallback, useEffect, useRef } from "react";
import { debounce } from "@/lib/utils";
import { LocalDocumentService } from "@/services/local-document.service";
import { useEditorStore } from "@/store";
import { EditorToolbar } from "./editor-toolbar";
import { toast } from "sonner";

const lowlight = createLowlight(common);

interface RichTextEditorProps {
  documentId: string;
  userId: string;
  initialContent: string;
  initialTitle: string;
  readOnly?: boolean;
  onContentChange?: (content: string) => void;
  onTitleChange?: (title: string) => void;
}

export function RichTextEditor({
  documentId,
  userId,
  initialContent,
  initialTitle,
  readOnly = false,
  onContentChange,
  onTitleChange,
}: RichTextEditorProps) {
  const { setSaving, setLastSaved } = useEditorStore();
  const titleRef = useRef(initialTitle);

  const saveContent = useCallback(
    debounce(async (content: string) => {
      setSaving(true);
      try {
        await LocalDocumentService.updateContent(documentId, content, userId);
        setLastSaved(Date.now());
        onContentChange?.(content);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to save",
        );
      }
    }, 800),
    [documentId, userId, setSaving, setLastSaved, onContentChange],
  );

  const saveTitle = useCallback(
    debounce(async (title: string) => {
      if (title === titleRef.current) return;
      titleRef.current = title;
      try {
        await LocalDocumentService.updateTitle(documentId, title, userId);
        onTitleChange?.(title);
      } catch {
        toast.error("Failed to save title");
      }
    }, 500),
    [documentId, userId, onTitleChange],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        codeBlock: false,
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: "Start writing, or press '/' for commands...",
      }),
      Underline,
      Highlight.configure({ multicolor: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Image.configure({ allowBase64: true }),
      CodeBlockLowlight.configure({ lowlight }),
      Link.configure({ openOnClick: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      CharacterCount,
    ],
    content: initialContent,
    editable: !readOnly,
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base dark:prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-4",
      },
      handleKeyDown: (_view, event) => {
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case "b":
              event.preventDefault();
              editor?.chain().focus().toggleBold().run();
              return true;
            case "i":
              event.preventDefault();
              editor?.chain().focus().toggleItalic().run();
              return true;
            case "u":
              event.preventDefault();
              editor?.chain().focus().toggleUnderline().run();
              return true;
            case "s":
              event.preventDefault();
              if (editor) {
                saveContent(editor.getHTML());
              }
              return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      saveContent(ed.getHTML());
    },
  });

  useEffect(() => {
    if (editor && initialContent && editor.getHTML() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [documentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImageUpload = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file || !editor) return;

      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        editor
          .chain()
          .focus()
          .setImage({ src: reader.result as string })
          .run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [editor]);

  return (
    <div className="flex flex-col h-full">
      <input
        type="text"
        defaultValue={initialTitle}
        readOnly={readOnly}
        onChange={(e) => saveTitle(e.target.value)}
        placeholder="Untitled Document"
        className="border-none bg-transparent text-3xl font-bold px-8 pt-6 pb-2 focus:outline-none w-full"
      />
      {!readOnly && editor && (
        <EditorToolbar editor={editor} onImageUpload={handleImageUpload} />
      )}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
      {editor && (
        <div className="border-t px-8 py-2 text-xs text-muted-foreground">
          {editor.storage.characterCount.characters()} characters ·{" "}
          {editor.storage.characterCount.words()} words
        </div>
      )}
    </div>
  );
}

export type { Editor };
