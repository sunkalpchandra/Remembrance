import { ConversationMessage } from "@/app/lib/types";
import { useEffect, useRef } from "react";
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
      <p className="w-full whitespace-pre-line leading-relaxed">
        {props.message.text}
      </p>
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
