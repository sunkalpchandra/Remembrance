"use client";

import { useState } from "react";
import { useEditor } from "novel";
import { Button } from "./ui/button";
import { Command, CommandInput } from "./ui/command";
import AISelectorCommands from "./aiSelectorCommands";
import { ArrowUp, Sparkles } from "lucide-react";
import Magic from "./ui/magic";

interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}   

const AISelector = ({ open }: AISelectorProps) => {
  const { editor } = useEditor();
  const [inputValue, setInputValue] = useState("");
  const [completion, setCompletion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open || !editor) return null;

  const handleComplete = async (prompt: string, option?: string) => {
    if (!prompt.trim() || !editor) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, command: option || inputValue }),
      });
      if (!res.ok) throw new Error("AI request failed");
      const data = await res.json();
      setCompletion(data.completion || "");
      editor.chain().focus().insertContent(data.completion || "").run();
      setInputValue("");
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Command className="w-full max-w-full rounded-xl shadow-2xl border bg-white p-0">
      <div className="flex items-center px-3 h-8 gap-1.5 group">
        <Magic className="h-5 w-5 text-blue-500 group-hover:text-black transition-colors mr-2" />
        <CommandInput
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          autoFocus
          placeholder="Ask AI to edit or generate..."
          disabled={isLoading}
          className="flex-1 border-none shadow-none focus:ring-0 bg-transparent h-8 px-0"
        />
        <Button
          size="icon"
          className="h-7 w-7 rounded-full bg-blue-500 hover:bg-blue-900 shadow-none border-none flex items-center justify-center"
          onClick={() => {
            const slice = editor.state.selection.content();
            const text = editor.storage.markdown.serializer.serialize(slice.content);
            handleComplete(text);
          }}
          disabled={isLoading}
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      {/* Gray divider below input row */}
      <div className="border-b border-gray-200 w-full" />
      {error && (
        <div className="text-red-500 text-xs px-3 pb-1">{error}</div>
      )}
      <div className="px-1 py-0">
        <AISelectorCommands
          onSelect={(value, option) => handleComplete(value, option)}
        />
      </div>
      {completion && (
        <div className="prose prose-sm p-2 px-3 bg-gray-50 rounded border mb-1 mt-1">
          {completion}
        </div>
      )}
      {isLoading && (
        <div className="flex h-8 w-full items-center px-3 text-sm font-medium text-muted-foreground text-blue-500">
          AI is thinking...
        </div>
      )}
    </Command>
  );
};

export default AISelector; 