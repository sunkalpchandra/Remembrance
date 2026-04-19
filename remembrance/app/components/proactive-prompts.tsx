"use client";
import { useEffect, useState } from "react";

interface Props {
  userId: string;
  onSelect: (prompt: string) => void;
}

export function ProactivePrompts({ userId, onSelect }: Props) {
  const [prompts, setPrompts] = useState<string[]>([]);

  useEffect(() => {
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001"}/proactive/${userId}`;
    let aborted = false;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        if (!aborted && Array.isArray(data?.prompts))
          setPrompts(data.prompts.slice(0, 3));
      })
      .catch(() => {});
    return () => {
      aborted = true;
    };
  }, [userId]);

  if (prompts.length === 0) return null;

  return (
    <div className="relative z-10 mt-5 flex flex-wrap justify-center gap-2 max-w-xl">
      {prompts.map((p, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(p)}
          className="text-sm text-gray-700 bg-white/80 hover:bg-gray-100 border border-gray-200 rounded-full px-3.5 py-1.5 transition-colors shadow-sm backdrop-blur-sm"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
