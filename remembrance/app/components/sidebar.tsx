"use client";

import type React from "react";

import { useContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { UserContext } from "@/app/components/usercontext";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import {
  BiChevronRight,
  BiHash,
  BiPlus,
  BiPencil,
  BiCheck,
  BiTrash,
} from "react-icons/bi";
import { UserProfile } from "./userprofile";
import SettingsModal from "./SettingsModal";
import NotificationsBell from "./notifications";
import { TfiLayersAlt } from "react-icons/tfi";
import { useAuth } from "@clerk/nextjs";

interface SidebarProps {
  selected: number;
}

const CHATS_CACHE_KEY = (uid: string) => `chats:${uid}`;

function DeleteChatModal({ name, onConfirm, onClose }: { name: string; onConfirm: () => void; onClose: () => void }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm bg-white text-gray-900 rounded-xl shadow-2xl overflow-hidden border border-gray-200 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold text-gray-900 mb-2">Delete thread?</h3>
        <p className="text-sm text-gray-600 mb-6">
          <strong>"{name}"</strong> will be permanently deleted. This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors">Delete</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function SideBarChatList({ userId }: { userId: string | any }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [chats, setChats] = useState<{ id: string; name: string }[]>(() => {
    if (typeof window === "undefined" || !userId) return [];
    try {
      const raw = localStorage.getItem(CHATS_CACHE_KEY(userId));
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const params = useParams();
  const currentId = params.id;

  const loadChats = async () => {
    if (!userId) return;
    try {
      const token = await getToken();
      const response = await fetch("/api/conversations", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await response.json();
      if (response.ok && Array.isArray(data.data)) {
        setChats(data.data);
        try { localStorage.setItem(CHATS_CACHE_KEY(userId), JSON.stringify(data.data)); } catch {}
      }
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  useEffect(() => {
    loadChats();
  }, [userId]);

  // Keep sidebar in sync with title changes and new conversations
  useEffect(() => {
    const onRenamed = (e: Event) => {
      const { id, name } = (e as CustomEvent).detail;
      setChats((prev) => {
        const updated = prev.map((c) => c.id === id ? { ...c, name } : c);
        try { localStorage.setItem(CHATS_CACHE_KEY(userId), JSON.stringify(updated)); } catch {}
        return updated;
      });
    };
    const onCreated = (e: Event) => {
      const { id, name } = (e as CustomEvent).detail;
      setChats((prev) => {
        if (prev.find((c) => c.id === id)) return prev;
        const updated = [{ id, name }, ...prev];
        try { localStorage.setItem(CHATS_CACHE_KEY(userId), JSON.stringify(updated)); } catch {}
        return updated;
      });
    };
    window.addEventListener("conversation-renamed", onRenamed);
    window.addEventListener("conversation-created", onCreated);
    return () => {
      window.removeEventListener("conversation-renamed", onRenamed);
      window.removeEventListener("conversation-created", onCreated);
    };
  }, [userId]);

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;

    const updatedChats = chats.map((chat) =>
      chat.id === id ? { ...chat, name: newName.trim() } : chat,
    );
    setChats(updatedChats);
    try { localStorage.setItem(CHATS_CACHE_KEY(userId), JSON.stringify(updatedChats)); } catch {}
    setEditingId(null);

    try {
      const token = await getToken();
      const response = await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: newName.trim() }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename conversation");
      }
    } catch (error) {
      console.error("Failed to rename chat:", error);
      setChats(chats);
    }
  };

  const handleChatClick = (chatId: string) => {
    if (editingId) return;
    router.push(`/chat/${chatId}`);
  };

  const handleChatHover = (chatId: string) => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(`conv:${chatId}`)) return; // already cached
    fetch(`/api/conversations/${chatId}`).then(async (r) => {
      if (!r.ok) return;
      const data = await r.json();
      try { localStorage.setItem(`conv:${chatId}`, JSON.stringify(data)); } catch {}
    }).catch(() => {});
  };

  const startEditing = (
    e: React.MouseEvent,
    chatId: string,
    chatName: string,
  ) => {
    e.stopPropagation(); // Prevent chat navigation
    setEditingId(chatId);
    setEditingName(chatName || "");
  };

  const handleDelete = async (chatId: string) => {
    try {
      const token = await getToken();
      const response = await fetch(`/api/conversations/${chatId}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      });
      if (!response.ok) throw new Error("Failed to delete conversation");
      setChats((prev) => {
        const next = prev.filter((chat) => chat.id !== chatId);
        try { localStorage.setItem(CHATS_CACHE_KEY(userId), JSON.stringify(next)); } catch {}
        return next;
      });
      try { localStorage.removeItem(`conv:${chatId}`); } catch {}
      if (currentId === chatId) router.push("/");
    } catch (error: any) {
      console.error("Failed to delete chat: ", error);
    }
  };

  return (
    <div className="px-2 py-1">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className="group flex items-center gap-2 px-2 py-1 rounded hover:bg-gray-100 transition-colors duration-75"
        >
          <BiHash className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {editingId === chat.id ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleRename(chat.id, editingName);
                }
                if (e.key === "Escape") {
                  setEditingId(null);
                  setEditingName("");
                }
              }}
              onBlur={() => {
                if (editingName.trim() && editingName !== chat.name) {
                  handleRename(chat.id, editingName);
                } else {
                  setEditingId(null);
                }
              }}
              className="flex-1 min-w-0 text-sm font-medium bg-white border border-gray-300 rounded px-2 py-0.5 focus:outline-none focus:border-blue-500"
            />
          ) : (
            <div
              className={`flex-1 min-w-0 text-sm font-medium truncate cursor-pointer transition-colors duration-75 ${
                chat.id === currentId
                  ? "text-gray-900 font-semibold"
                  : "text-gray-700 hover:text-gray-900"
              }`}
              onClick={() => handleChatClick(chat.id)}
              onMouseEnter={() => handleChatHover(chat.id)}
              title={chat.name}
            >
              {chat.name || "Untitled"}
            </div>
          )}
          {editingId !== chat.id ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteConfirm({ id: chat.id, name: chat.name || "Untitled" });
              }}
              className={`p-1 rounded hover:bg-red-100 transition-colors ${
                editingId === chat.id
                  ? "opacity-0"
                  : "opacity-0 group-hover:opacity-100"
              }`}
              title="Delete Chat"
            >
              <BiTrash color="red" />
            </button>
          ) : null}
          <div
            className={`flex items-center transition-opacity duration-75 flex-shrink-0 ${
              editingId === chat.id
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {editingId === chat.id ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRename(chat.id, editingName);
                }}
                className="p-1 hover:bg-green-200 bg-green-100 rounded transition-colors duration-75"
                title="Save changes"
              >
                <BiCheck className="w-4 h-4 text-green-600" />
              </button>
            ) : (
              <button
                onClick={(e) => startEditing(e, chat.id, chat.name)}
                className="p-1 hover:bg-gray-200 rounded transition-colors duration-75"
                title="Rename chat"
              >
                <BiPencil className="w-3 h-3 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      ))}
      {deleteConfirm && (
        <DeleteChatModal
          name={deleteConfirm.name}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={() => { handleDelete(deleteConfirm.id); setDeleteConfirm(null); }}
        />
      )}
    </div>
  );
}

export default function SideBar(props: SidebarProps) {
  const router = useRouter();
  const user = useContext(UserContext);
  const { getToken } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  };
  const [chatsExpanded, setChatsExpanded] = useState(true);

  const handleNewChat = () => {
    router.push("/");
    setChatsExpanded(true);
  };

  // Cmd/Ctrl+K starts a new chat from anywhere in the app shell
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <>
      {collapsed && (
        <button
          onClick={toggleCollapsed}
          className="md:hidden absolute top-4 left-4 z-50 p-2 bg-white/60 backdrop-blur-md rounded-xl shadow-sm border border-gray-200 hover:bg-gray-50"
        >
          <BiChevronRight className="w-5 h-5 text-gray-700" />
        </button>
      )}

      {!collapsed && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-[55]"
          onClick={() => setCollapsed(true)}
        />
      )}

      <div
        suppressHydrationWarning
        className={`transition-all duration-150 h-[100dvh] fixed md:relative z-[60] ${
          collapsed
            ? "-translate-x-full md:translate-x-0 md:w-16 w-64"
            : "translate-x-0 w-64"
        } bg-gray-50 border-r border-gray-200 flex flex-col shrink-0`}
      >
        {/* Header */}
        <div
          className={`border-b border-gray-200 ${collapsed ? "p-2" : "px-3 py-2"}`}
        >
          <div
            className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
          >
            {!collapsed && (
              <div className="flex items-center gap-2 flex-1 px-2">
                <span className="text-gray-900 text-sm font-medium">
                  Remembrance
                </span>
              </div>
            )}
            {!collapsed && <NotificationsBell />}
            <button
              onClick={toggleCollapsed}
              className={`hover:bg-gray-200 rounded-md transition-colors duration-75 ${collapsed ? "p-2" : "p-1.5"}`}
            >
              <BiChevronRight
                className={`w-4 h-4 text-gray-500 transition-transform duration-150 ${collapsed ? "" : "rotate-180"}`}
              />
            </button>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto">
          <div className={`space-y-0.5 ${collapsed ? "p-2" : "px-3 py-2"}`}>
            {/* New Chat */}
            <button
              onClick={handleNewChat}
              className={`flex items-center w-full text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-75 cursor-pointer ${
                collapsed ? "justify-center p-2" : "gap-3 px-2 py-1.5"
              }`}
              title={collapsed ? "New chat (⌘K)" : ""}
            >
              <BiPlus className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium flex-1 text-left">New chat</span>
              )}
              {!collapsed && (
                <kbd className="text-[10px] text-gray-400 border border-gray-200 rounded px-1 py-0.5 bg-white">⌘K</kbd>
              )}
            </button>

            {/* Memory Graph */}
            <button
              onClick={() => {
                router.push("/repository");
              }}
              className={`flex items-center w-full text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors duration-75 ${
                collapsed ? "justify-center p-2" : "gap-3 px-2 py-1.5"
              }`}
              title={collapsed ? "Memory" : ""}
            >
              <TfiLayersAlt className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Memory</span>
              )}
            </button>
          </div>

          {/* Chats Section */}
          {!collapsed && (
            <div className="mt-1">
              <button
                onClick={() => setChatsExpanded(!chatsExpanded)}
                className="flex items-center gap-2 px-3 py-1.5 w-full text-left hover:bg-gray-100 transition-colors duration-75"
              >
                <BiChevronRight
                  className={`w-3 h-3 text-gray-500 transition-transform duration-150 ${
                    chatsExpanded ? "rotate-90" : ""
                  }`}
                />
                <span className="text-gray-900 text-sm font-medium">
                  Recent
                </span>
              </button>

              {chatsExpanded && (
                <div className="mt-1">
                  <SideBarChatList userId={user?.uid} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Account footer */}
        <div
          className={`border-t border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors ${collapsed ? "p-2 flex justify-center" : "px-3 py-3"}`}
          onClick={() => setIsSettingsOpen(true)}
        >
          <div className={`flex items-center ${collapsed ? "" : "gap-2"}`}>
            <UserProfile className="w-8 h-8 pointer-events-none" />
            {!collapsed && (
              <span className="text-sm text-gray-700 truncate font-medium">
                {user?.displayName || "Account"}
              </span>
            )}
          </div>
        </div>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </>
  );
}
