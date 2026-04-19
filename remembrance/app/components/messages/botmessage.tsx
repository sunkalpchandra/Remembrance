import { ConversationMessage } from "@/app/lib/types";
import { useEffect, useRef, useState } from "react";
import MemoryWidget, { MemoryWidgetProps } from "../memorywidget";

interface BotProps {
  message: ConversationMessage;
  time: number;
  botName: string;
  suggestions: MemoryWidgetProps[];
}

export function BotMessage(props: BotProps) {
  const progressbar = useRef(null as any as HTMLDivElement);
  const start = useRef(new Date());
  const [showThoughts, setShowThoughts] = useState(false);
  const thinkingText = (props.message as any).thinkingText || "";

  useEffect(() => {
    if (progressbar.current == null) return;
    start.current = new Date();
    let int = setInterval(() => {
      let progress =
        ((new Date().getTime() - start.current.getTime()) /
          ((props.time + 1) * 1000)) *
        100;
      progressbar.current.style.width = progress + "%";
      if (progress > 100) clearTimeout(int);
    }, 60);
  }, []);
  useEffect(() => {
    const el = progressbar.current;
    if (!el) return;
    el.style.opacity = "1";
  }, []);
  return (
    <div className="w-[80%] flex flex-col gap-2 text-gray-800 animate-fade-in">
      {thinkingText && thinkingText.trim().length > 0 && (
        <div className="mb-2 mt-1 rounded-xl border border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={() => setShowThoughts((prev) => !prev)}
            className="w-full px-3 py-2 text-left text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
            aria-expanded={showThoughts}
            aria-label="Toggle thought process"
          >
            {showThoughts ? "Hide thought process" : "Show thought process"}
          </button>
          {showThoughts && (
            <div className="px-3 pb-3">
              <p className="w-full whitespace-pre-line leading-relaxed text-sm text-gray-600">
                {thinkingText}
              </p>
            </div>
          )}
        </div>
      )}

      {!props.message.text || props.message.text.trim() === "" ? (
        <div className="flex items-center gap-2 text-gray-500">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
          </div>
          <span className="text-sm ml-2 italic animate-pulse">
            {props.message.status || "Remembrance is thinking..."}
          </span>
        </div>
      ) : (
        <p className="w-full whitespace-pre-line leading-relaxed">
          {props.message.text}
        </p>
      )}

      {props.suggestions.length > 0 && (
        <>
          <p className="text-sm text-black mb-2 mt-2">suggested memories</p>
          <div className="flex gap-3 overflow-x-auto pb-2 fade-scrollbar">
            {props.suggestions.map((suggestion, i) => (
              <div className="min-w-[180px] animate-fade-in" key={i}>
                <MemoryWidget {...suggestion} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
