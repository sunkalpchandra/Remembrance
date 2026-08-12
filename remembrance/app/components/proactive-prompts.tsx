"use client";
import { useEffect, useState } from "react";

interface Props {
  onSelect: (prompt: string) => void;
}

/**
 * Conversation-starter chips under the landing input, fetched from
 * /api/prompts (personalized from stored memories when possible).
 */
export function ProactivePrompts({ onSelect }: Props) {
  const [prompts, setPrompts] = useState<string[] | null>(null);

  useEffect(() => {
    let aborted = false;
    fetch("/api/prompts")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!aborted && Array.isArray(data?.prompts)) {
          setPrompts(data.prompts.slice(0, 3));
        } else if (!aborted) {
          setPrompts([]);
        }
      })
      .catch(() => {
        if (!aborted) setPrompts([]);
      });
    return () => {
      aborted = true;
    };
  }, []);

  // Loading shimmer — keeps the landing layout from jumping
  if (prompts === null) {
    return (
      <div className="relative z-10 mt-6 flex flex-wrap justify-center gap-2 max-w-xl">
        {[120, 160, 140].map((w, i) => (
          <div
            key={i}
            className="h-9 bg-gray-100 rounded-full animate-pulse"
            style={{ width: w }}
          />
        ))}
      </div>
    );
  }

  if (prompts.length === 0) return null;

  return (
    <div className="relative z-10 mt-6 flex flex-wrap justify-center gap-2 max-w-xl animate-fade-in">
      {prompts.map((p, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onSelect(p)}
          className="text-sm text-gray-600 bg-white/80 hover:bg-gray-50 hover:text-gray-900 border border-gray-200 rounded-full px-4 py-2 transition-all shadow-sm hover:shadow-md backdrop-blur-sm cursor-pointer"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
