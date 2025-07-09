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
      className="bg-yellow-100 border border-yellow-300 text-black px-4 py-3 rounded-lg w-full max-w-md shadow-sm cursor-pointer transition duration-150 hover:shadow-md"
      onClick={() => setExpanded(!expanded)}
    >
      <div className="font-semibold mb-1 text-sm">🔎 {title}</div>
      <p className="text-sm whitespace-pre-wrap">{displayText}</p>
      {isTruncated && (
        <div className="text-xs mt-1 text-gray-600">{expanded ? "Click to collapse" : "Click to expand"}</div>
      )}
    </div>
  );
}
