"use client";

import { useState } from "react";
import { useEditor } from "novel";
import { Button } from "./ui/button";
import { Command, CommandInput } from "./ui/command";
import AISelectorCommands from "./aiSelectorCommands";
import { ArrowUp, Sparkles } from "lucide-react";
import Magic from "./ui/magic";
import axios from "axios";
interface AISelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const AISelector = ({ open, onOpenChange }: AISelectorProps) => {
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
      const res = await axios.post("http://localhost:5000/api/ai/generate", {
        query: prompt,
      });

      const data = res.data;
      if (data.status !== "success") {
        throw new Error(data.error || "Ai Request Failed");
      }

      const aiResponse = data.message || "";
      setCompletion(aiResponse);

      if (option && !editor.state.selection.empty) {
        editor
          .chain()
          .focus()
          .deleteSelection()
          .insertContent(aiResponse)
          .run();
      } else {
        editor.chain().focus().insertContent(aiResponse).run();
      }

      setInputValue("");
      setTimeout(() => onOpenChange(false), 1000);
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
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const selectedText = editor.state.doc.textBetween(
                editor.state.selection.from,
                editor.state.selection.to,
                "",
              );

              if (inputValue.trim()) {
                if (selectedText.trim()) {
                  const combinedPrompt = `${inputValue} "${selectedText}"`;
                  handleComplete(combinedPrompt, "custom");
                } else {
                  handleComplete(inputValue);
                }
              } else if (selectedText.trim()) {
                handleComplete(selectedText);
              }
            } else if (e.key === "Escape") {
              e.preventDefault();
              onOpenChange(false);
            }
          }}
          autoFocus
          placeholder="Ask AI to edit or generate... (selected text will be included)"
          disabled={isLoading}
          className="flex-1 border-none shadow-none focus:ring-0 bg-transparent h-8 px-0"
        />
        <Button
          size="icon"
          className="h-7 w-7 rounded-full bg-blue-500 hover:bg-blue-900 shadow-none border-none flex items-center justify-center"
          onClick={() => {
            const selectedText = editor.state.doc.textBetween(
              editor.state.selection.from,
              editor.state.selection.to,
              "",
            );

            if (inputValue.trim()) {
              if (selectedText.trim()) {
                const combinedPrompt = `${inputValue} "${selectedText}"`;
                handleComplete(combinedPrompt, "custom");
              } else {
                handleComplete(inputValue);
              }
            } else if (selectedText.trim()) {
              handleComplete(selectedText);
            }
          }}
          disabled={
            isLoading || (!inputValue.trim() && editor.state.selection.empty)
          }
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
      <div className="border-b border-gray-200 w-full" />
      {error && <div className="text-red-500 text-xs px-3 pb-1">{error}</div>}
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
