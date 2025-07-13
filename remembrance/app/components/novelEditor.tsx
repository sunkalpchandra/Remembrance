"use client";

import { EditorContent, EditorRoot, EditorBubble, Color } from "novel";
import { defaultExtensions } from "./extensions";
import { JSONContent } from "novel";
import { useState } from "react";
import { NodeSelector } from "@/app/components/novel/selectors/nodeSelector";
import { LinkSelector } from "@/app/components/novel/selectors/linkSelector";
import { ColorSelector } from "@/app/components/novel/selectors/colorSelector";
import { TextButtons } from "@/app/components/novel/selectors/textButtons";

interface NovelEditorProps {
  content?: JSONContent;
  onUpdate?: (content: JSONContent) => void;
  onCommandKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}

export default function NovelEditor({ 
  content, 
  onUpdate, 
  onCommandKeyDown,
  className = ""
}: NovelEditorProps)
  {
    const [openNode, setOpenNode] = useState(false);
    const [openLink, setOpenLink] = useState(false);
    const [openColor, setOpenColor] = useState(false);
    const [openAI, setOpenAI] = useState(false);

    return (
      <EditorRoot>
        <EditorContent
          extensions={defaultExtensions}
          className={`w-full ${className}`}
          editorProps={{
            handleDOMEvents: {
              keydown: (_view, event: any) => {
                if (event.key === "/") {
                  onCommandKeyDown?.(event);
                }
              },
            },
            attributes: {
              class: "prose prose-sm dark:prose-invert focus:outline-none max-w-full",
            },
          }}
          initialContent={content}
          onUpdate={({ editor }) => {
            const json = editor.getJSON();
            onUpdate?.(json);
          }}
        >
          <EditorBubble
            tippyOptions={{
              placement: openAI ? "bottom-start" : "top",
            }}
            className="flex w-fit max-w-[90vw] overflow-hidden rounded border border-muted bg-white ground shadow-xl"
          >
            <NodeSelector open={openNode} onOpenChange={setOpenNode} />
            <LinkSelector open={openLink} onOpenChange={setOpenLink} />
            <TextButtons />
            <ColorSelector open={openColor} onOpenChange={setOpenColor} />
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    );
}