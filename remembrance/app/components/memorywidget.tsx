// // memorywidget.tsx
import { useState } from "react";

export interface MemoryWidgetProps {
  title?: string;
  memoryText: string;
}

export default function MemoryWidget({ title = "Relevant Memory", memoryText }: MemoryWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const isTruncated = memoryText.length > 31;
  const displayText = expanded || !isTruncated ? memoryText : memoryText.slice(0, 31) + "...";
  return (
    <div
      className="bg-white/60 backdrop-blur-md border border-gray-200 text-black px-4 py-3 rounded-2xl shadow-sm cursor-pointer transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:scale-105 min-w-[160px] max-w-xs animate-fade-in"
      // onClick={() => setExpanded(!expanded)}
      style={{ boxShadow: '0 1px 6px 0 rgba(0,0,0,0.04)' }} // Remove any blue shadow
    >
      <div className="flex items-center">
        <div className="font-semibold mb-1 rounded-md px-2 py-1 h-fit w-fit bg-[#C5F5A9] text-[10px] text-[#2D6D1A] mr-2"><span className="text-[#4DB960] inline">●</span> {title}</div>
        <a href="#" className="no-underline hover:no-underline border border-gray-300 p-1 ml-auto flex items-center justify-center align-middle rounded-md w-5 h-5 focus:outline-none focus:ring-0"><img src="/arrow-up-right.svg" className="w-4 h-4" /></a>
      </div>
      <p className="text-[11px] w-2/3 whitespace-pre-wrap mt-1">{displayText}</p>
    </div>
  );
}
