// // memorywidget.tsx
import { useState } from "react";

export interface MemoryWidgetProps {
  title?: string;
  memoryText: string;
}

export default function MemoryWidget({ title = "Relevant Memory", memoryText }: MemoryWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  const isTruncated = memoryText.length > 100;
  const displayText = expanded || !isTruncated ? memoryText : memoryText.slice(0, 100) + "...";

  return (
    <div
      className="bg-[#F9FAFB]  text-black px-4 py-3 rounded-lg w-full max-w-md shadow-sm cursor-pointer transition duration-150 hover:shadow-md"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="font-semibold mb-1 rounded-md px-1 py-1 h-fit w-fit bg-[#C5F5A9] text-[9px] text-[#2D6D1A]"><p className="text-[#4DB960] inline">●</p> {title}</div>
      <p className="text-[9px] whitespace-pre-wrap">{displayText}</p>
      {isTruncated && (
        <div className="text-xs mt-1 text-gray-600">{expanded ? "Click to collapse" : "Click to expand"}</div>
      )}
    </div>
  );
}
