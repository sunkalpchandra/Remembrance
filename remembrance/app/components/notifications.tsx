"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BiBell, BiBrain, BiNote } from "react-icons/bi";
import { timeAgo } from "@/app/lib/relative-time";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  read: boolean;
  createdAt: string;
}

const TYPE_STYLE: Record<string, { icon: typeof BiBrain; bg: string; fg: string }> = {
  memory_saved: { icon: BiBrain, bg: "bg-blue-50", fg: "text-blue-500" },
  note_added: { icon: BiNote, bg: "bg-purple-50", fg: "text-purple-500" },
};

export default function NotificationsBell({
  collapsed = false,
}: {
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[] | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setItems(data);
    } catch {}
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    load();
    const onClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open, load]);

  const unread = (items || []).filter((n) => !n.read).length;

  const markAllRead = async () => {
    setItems((prev) => (prev ? prev.map((n) => ({ ...n, read: true })) : prev));
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch {}
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className={`relative hover:bg-gray-200 rounded-md transition-colors duration-75 ${collapsed ? "p-2" : "p-1.5"}`}
        title="Notifications"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <BiBell className="w-4 h-4 text-gray-500" />
        {unread > 0 && (
          <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-blue-500 rounded-full" />
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-[80] animate-fade-in"
          style={{ animationDuration: "0.2s" }}
        >
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items === null ? (
              <div className="p-3 space-y-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <div className="w-7 h-7 bg-gray-100 rounded-full animate-pulse flex-shrink-0" />
                    <div className="flex-1 space-y-1.5 pt-0.5">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                      <div className="h-2.5 bg-gray-100 rounded animate-pulse w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <div className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center">
                  <BiBell className="w-5 h-5 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400">No notifications yet</p>
              </div>
            ) : (
              items.map((n) => {
                const style = TYPE_STYLE[n.type] || TYPE_STYLE.memory_saved;
                const Icon = style.icon;
                return (
                  <div
                    key={n.id}
                    className={`px-3 py-2.5 flex gap-2.5 items-start border-b border-gray-50 last:border-b-0 ${
                      n.read ? "" : "bg-blue-50/40"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 ${style.bg} rounded-full flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${style.fg}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {n.title}
                        </p>
                        <span className="text-[11px] text-gray-400 flex-shrink-0">
                          {timeAgo(n.createdAt)}
                        </span>
                      </div>
                      {n.message && (
                        <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">
                          {n.message}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
