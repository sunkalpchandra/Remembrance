import { cn } from "@/app/lib/utils";
import { EditorBubbleItem, EditorInstance, useEditor } from "novel";
import { BoldIcon, ItalicIcon, UnderlineIcon, StrikethroughIcon, CodeIcon } from "lucide-react";
import type { SelectorItem } from "@/app/components/novel/selectors/nodeSelector";
import { Button } from "@/app/components/novel/ui/button";

export const TextButtons = () => {
  const { editor } = useEditor();
  if (!editor) return null;
  const items: SelectorItem[] = [
    {
      name: "bold",
      isActive: (editor: EditorInstance | any) => editor.isActive("bold"),
      command: (editor: EditorInstance | any) => editor.chain().focus().toggleBold().run(),
      icon: BoldIcon,
    },
    {
      name: "italic",
      isActive: (editor: EditorInstance | any) => editor.isActive("italic"),
      command: (editor: EditorInstance | any) => editor.chain().focus().toggleItalic().run(),
      icon: ItalicIcon,
    },
    {
      name: "underline",
      isActive: (editor: EditorInstance | any) => editor.isActive("underline"),
      command: (editor: EditorInstance | any) => editor.chain().focus().toggleUnderline().run(),
      icon: UnderlineIcon,
    },
    {
      name: "strike",
      isActive: (editor: EditorInstance | any) => editor.isActive("strike"),
      command: (editor: EditorInstance | any) => editor.chain().focus().toggleStrike().run(),
      icon: StrikethroughIcon,
    },
    {
      name: "code",
      isActive: (editor: EditorInstance | any) => editor.isActive("code"),
      command: (editor: EditorInstance | any) => editor.chain().focus().toggleCode().run(),
      icon: CodeIcon,
    },
  ];
  return (
    <div className='flex'>
      {items.map((item, index) => (
        <EditorBubbleItem
          key={index}
          onSelect={(editor) => {
            item.command(editor);
          }}>
          <Button size='icon' className='rounded-none' variant='ghost'>
            <item.icon
              className={cn("h-4 w-4", {
                "text-blue-500": item.isActive(editor),
              })}
            />
          </Button>
        </EditorBubbleItem>
      ))}
    </div>
  );
};