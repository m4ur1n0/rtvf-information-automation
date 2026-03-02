"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface EmailBodyEditorProps {
  initialContent: string;
  onChange: (html: string, text: string) => void;
  onImageAdd: (dataUrl: string) => void;
}

export function EmailBodyEditor({ initialContent, onChange, onImageAdd }: EmailBodyEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: initialContent,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'email-editor-content',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (const item of Array.from(items)) {
          if (item.type.startsWith('image/')) {
            event.preventDefault();
            const file = item.getAsFile();
            if (!file) continue;

            const reader = new FileReader();
            reader.onload = (e) => {
              const dataUrl = e.target?.result as string;
              if (dataUrl) {
                // Add to images array
                onImageAdd(dataUrl);
                // Insert into editor
                editor?.chain().focus().setImage({ src: dataUrl }).run();
              }
            };
            reader.readAsDataURL(file);
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const text = editor.getText();
      onChange(html, text);
    },
  });

  // Update content when initialContent changes
  useEffect(() => {
    if (editor && initialContent && editor.getText() !== initialContent) {
      editor.commands.setContent(initialContent);
    }
  }, [initialContent, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="email-body-editor">
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
        >
          Bullet List
        </button>
        <button
          type="button"
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          className={editor.isActive('link') ? 'is-active' : ''}
        >
          Link
        </button>
        <button
          type="button"
          onClick={() => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (event) => {
                const dataUrl = event.target?.result as string;
                if (dataUrl) {
                  onImageAdd(dataUrl);
                  editor.chain().focus().setImage({ src: dataUrl }).run();
                }
              };
              reader.readAsDataURL(file);
            };
            input.click();
          }}
        >
          Add Image
        </button>
      </div>
      <EditorContent editor={editor} />
      <div className="editor-hint">
        You can paste images directly (Cmd+V / Ctrl+V)
      </div>
    </div>
  );
}
