"use client";

import { useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BiArrowBack, BiBook, BiPrinter } from "react-icons/bi";
import { UserContext } from "../components/usercontext";

interface BookMemory {
  id: string;
  name: string;
  summary: string;
  createdAt: string;
}

function monthLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Undated";
  return d.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

/**
 * A print-friendly book of every saved memory, grouped by month.
 * The Print button uses the browser's print dialog — that's also the
 * "export as PDF" path.
 */
export default function MemoryBookPage() {
  const router = useRouter();
  const user = useContext(UserContext);
  const [memories, setMemories] = useState<BookMemory[] | null>(null);

  useEffect(() => {
    fetch("/api/memories")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const list = Array.isArray(data?.memories) ? data.memories : [];
        setMemories(
          list.map((m: any) => ({
            id: m.id,
            name: m.name || "Untitled",
            summary: m.summary || "",
            createdAt: m.createdAt,
          })),
        );
      })
      .catch(() => setMemories([]));
  }, []);

  const groups = new Map<string, BookMemory[]>();
  for (const m of memories || []) {
    const key = monthLabel(m.createdAt);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .memory-card { box-shadow: none !important; border-color: #e5e7eb !important; break-inside: avoid; }
        }
      `}</style>

      {/* Toolbar */}
      <div className="no-print sticky top-0 z-10 bg-gray-50/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/repository")}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <BiArrowBack className="w-4 h-4" />
            Back to memories
          </button>
          <button
            onClick={() => window.print()}
            disabled={!memories || memories.length === 0}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2 px-4 rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BiPrinter className="w-4 h-4" />
            Print
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 md:py-14">
        {/* Title page */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-normal text-gray-900 mb-3">
            Memory Book
          </h1>
          <p className="text-gray-500 text-lg">
            {user?.displayName ? `The memories of ${user.displayName}` : "A collection of saved memories"}
          </p>
          {memories && memories.length > 0 && (
            <p className="text-sm text-gray-400 mt-2">
              {memories.length} {memories.length === 1 ? "memory" : "memories"}
            </p>
          )}
        </div>

        {memories === null ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl border border-gray-100 p-8"
              >
                <div className="h-5 bg-gray-100 rounded animate-pulse w-1/3 mb-3" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-full mb-2" />
                <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
              </div>
            ))}
          </div>
        ) : memories.length === 0 ? (
          <div className="flex flex-col items-center py-16">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <BiBook className="w-8 h-8 text-gray-300" />
            </div>
            <p className="text-gray-500 font-medium">No memories saved yet</p>
            <p className="text-sm text-gray-400 max-w-xs text-center mt-1">
              Chat with Remembrance and your saved memories will appear here,
              ready to print.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {[...groups.entries()].map(([month, items]) => (
              <section key={month}>
                <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">
                  {month}
                </h2>
                <div className="space-y-4">
                  {items.map((m) => (
                    <article
                      key={m.id}
                      className="memory-card bg-white rounded-3xl border border-gray-100 shadow-sm p-8"
                    >
                      <div className="flex items-baseline justify-between gap-4 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">
                          {m.name}
                        </h3>
                        <span className="text-xs text-gray-400 flex-shrink-0">
                          {new Date(m.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {m.summary && m.summary !== m.name && (
                        <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                          {m.summary}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
