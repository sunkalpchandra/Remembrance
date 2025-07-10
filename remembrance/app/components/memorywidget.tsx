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
      className="bg-[#F9FAFB]  text-black px-4 py-3 rounded-lg w-full max-w-md shadow-sm cursor-pointer transition duration-150 hover:shadow-md"
      // onClick={() => setExpanded(!expanded)}
    >
      <div className="flex">
        <div className="font-semibold mb-1 rounded-md px-1 py-1 h-fit w-fit bg-[#C5F5A9] text-[9px] text-[#2D6D1A]"><p className="text-[#4DB960] inline">●</p> {title}</div>
        <a href="#" className="border border-gray-300 p-1  ml-auto flex items-center justify-center align-middle rounded-md w-5 h-5"><img src="/arrow-up-right.svg " className="w-4 h-4"></img></a>
      </div>
      <p className="text-[9px] w-2/3 whitespace-pre-wrap">{displayText}</p>
      {/* {isTruncated && (
        <div className="text-xs mt-1 text-gray-600">{expanded ? "Click to collapse" : "Click to expand"}</div>
      )} */}
    </div>
  );
}
