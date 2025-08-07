"use client";

import { EditorContent, EditorRoot, EditorBubble, Color } from "novel";
import { defaultExtensions } from "./extensions";
import { JSONContent } from "novel";
import { useState } from "react";
import { NodeSelector } from "@/app/components/novel/selectors/nodeSelector";
import { LinkSelector } from "@/app/components/novel/selectors/linkSelector";
import { ColorSelector } from "@/app/components/novel/selectors/colorSelector";
import { TextButtons } from "@/app/components/novel/selectors/textButtons";
import AISelector from "./novel/aiSelector";
import Magic from "./novel/ui/magic";

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
      <EditorRoot >
        <EditorContent immediatelyRender = {false}
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
            className={
              openAI
                ? "flex w-full max-w-full rounded border border-muted bg-white ground shadow-xl z-50"
                : "flex w-fit max-w-[90vw] overflow-hidden rounded border border-muted bg-white ground shadow-xl z-50"
            }
          >
            {openAI ? (
              <AISelector open={openAI} onOpenChange={setOpenAI} />
            ) : (
              <>
                <button
                  className="min-w-[90px] gap-1 rounded-none text-blue-500 flex items-center justify-center px-2 py-1.5 bg-transparent border-none hover:bg-gray-100 focus:outline-none whitespace-nowrap group"
                  onClick={() => setOpenAI(true)}
                  type="button"
                  tabIndex={0}
                  aria-label="Ask AI"
                >
                  <Magic className="h-5 w-5 text-blue-500 group-hover:text-black transition-colors" />
                  <span className="font-medium text-base group-hover:text-black transition-colors">Ask AI</span>
                </button>
                <div className="border-l border-gray-200 self-stretch mx-1" />
                <NodeSelector open={openNode} onOpenChange={setOpenNode} />
                <div className="border-l border-gray-200 self-stretch mx-1" />
                <LinkSelector open={openLink} onOpenChange={setOpenLink} />
                <div className="border-l border-gray-200 self-stretch mx-1" />
                <TextButtons />
                <div className="border-l border-gray-200 self-stretch mx-1" />
                <ColorSelector open={openColor} onOpenChange={setOpenColor} />
              </>
            )}
          </EditorBubble>
        </EditorContent>
      </EditorRoot>
    );
}