import { ConversationMessage } from "@/app/lib/types";
import { BotProfile } from "../botprofile";
import { useEffect, useRef } from "react";
import MemoryWidget, { MemoryWidgetProps } from "../memorywidget";
import { IBM } from "@/app/lib/fonts";

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
    <div className="bg-gray-50/90 border border-gray-200 text-gray-800 flex flex-row items-start w-[80%] gap-2 rounded-2xl shadow-sm p-4 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md animate-fade-in">
      <BotProfile name="R E" />
      <div className="w-full h-full flex flex-col items-start gap-2">
        <div className="w-full flex flex-row items-center ">
          <p className={`grow-0 text-black ${IBM.className} text-sm`}>
            {props.botName}
          </p>
          {/* <p className={`grow-0 text-black ${IBM.className} text-sm`}>[try to answer in {props.time} seconds]</p> */}
        </div>
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
    </div>
  );
}
