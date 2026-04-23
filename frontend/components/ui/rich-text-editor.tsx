"use client"

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Quote,
  Undo,
  Redo
} from 'lucide-react'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  icon: any;
  title: string;
}

const ToolbarButton = ({ 
  onClick, 
  active, 
  icon: Icon, 
  title 
}: ToolbarButtonProps) => (
  <Button
    variant="ghost"
    size="icon-sm"
    onClick={(e) => {
      e.preventDefault()
      onClick()
    }}
    className={cn(
      "h-8 w-8 rounded-md transition-all",
      active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
    )}
    title={title}
  >
    <Icon className="h-4 w-4" />
  </Button>
)

export function RichTextEditor({ value, onChange, className }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2],
        },
      }),
      Underline,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'prose prose-stone dark:prose-invert max-w-none min-h-[250px] p-4 focus:outline-none font-body text-base leading-relaxed',
      },
    },
  })

  // Sync content from outside
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  if (!editor) {
    return null
  }


  return (
    <div className={cn("border border-border/40 rounded-xl bg-card overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 transition-all", className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-1.5 border-b border-border/20 bg-muted/30">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          icon={Bold}
          title="Đậm"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          icon={Italic}
          title="Nghiêng"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive('underline')}
          icon={UnderlineIcon}
          title="Gạch chân"
        />
        
        <div className="w-px h-4 bg-border/40 mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive('heading', { level: 1 })}
          icon={Heading1}
          title="Tiêu đề 1"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive('heading', { level: 2 })}
          icon={Heading2}
          title="Tiêu đề 2"
        />
        
        <div className="w-px h-4 bg-border/40 mx-1" />
        
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          icon={List}
          title="Danh sách dấu chấm"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          icon={ListOrdered}
          title="Danh sách số"
        />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          icon={Quote}
          title="Trích dẫn"
        />
        
        <div className="ml-auto flex items-center gap-1">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            icon={Undo}
            title="Hoàn tác"
          />
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            icon={Redo}
            title="Làm lại"
          />
        </div>
      </div>

      {/* Editor Surface */}
      <EditorContent editor={editor} />
      
      {/* Footer Info */}
      <div className="px-4 py-2 bg-muted/10 border-t border-border/10 flex justify-between items-center">
         <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">TipTap Editor</p>
         <p className="text-[10px] text-muted-foreground">Nhấn để soạn thảo...</p>
      </div>
    </div>
  )
}
