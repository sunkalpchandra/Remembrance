"use client";

import type React from "react";

import { useContext, useEffect, useState, useRef } from "react";
import type { SideBarChoiceProps } from "./sidebarchoice";
import type { SideBarBaseProps } from "./sidebarchoicebase";
import { UserContext } from "@/app/components/usercontext";
import { useRouter } from "next/navigation";
import {
  getConversationById,
  getConversationsForUser,
  saveConversation,
  deleteConversation,
} from "@/backend/lib/db";
import { useParams } from "next/navigation";
import {
  BiChevronDown,
  BiChevronRight,
  BiHash,
  BiPlus,
  BiSearch,
  BiPencil,
  BiSolidDashboard,
  BiCheck,
  BiLogOut,
  BiCog,
  BiUser,
  BiHelpCircle,
  BiTrash,
} from "react-icons/bi";
import { TfiLayersAlt } from "react-icons/tfi";
import { BsBookHalf } from "react-icons/bs";

interface SidebarProps {
  selected: number;
}

const SideBarOptions = [
  {
    text: "New chat",
    iconPath: "/chat.svg",
    link: "/",
  },
  {
    text: "Memory-Graph",
    iconPath: "/repo.svg",
    link: "/repository",
    tag: "beta",
    tagcolor: "#000000",
  },
  {
    text: "Dashboard",
    iconPath: "/family.svg",
    link: "/dashboard",
    tag: "beta",
    tagcolor: "#000000",
  },
  {
    text: "Documentation",
    iconPath: "",
    link: "/docs",
    tag: "beta",
    tagcolor: "#000000"
  },

] as SideBarChoiceProps[];

function SideBarChatList({ userId }: { userId: string | any }) {
  const router = useRouter();
  const [chats, setChats] = useState<{ id: string; name: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const params = useParams();
  const currentId = params.id;

  useEffect(() => {
    if (!userId) return;
    getConversationsForUser(userId).then((data: any) => {
      if (Array.isArray(data)) {
        setChats(data);
      }
    });
  }, [userId]);

  const handleRename = async (id: string, newName: string) => {
    if (!newName.trim()) return;

    const updatedChats = chats.map((chat) =>
      chat.id === id ? { ...chat, name: newName.trim() } : chat,
    );
    setChats(updatedChats);
    setEditingId(null);

    try {
      const convo = await getConversationById(userId, id);
      if (convo) {
        convo.name = newName.trim();
        await saveConversation(userId, convo, id);
      }
    } catch (error) {
      console.error("Failed to rename chat:", error);
      // Revert the optimistic update on error
      setChats(chats);
    }
  };

  const handleChatClick = (chatId: string) => {
    if (editingId) return; // Don't navigate if we're editing
    router.push(`/chat/${chatId}`);
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
      await deleteConversation(userId, chatId);
      setChats((prev) => prev.filter((chat) => chat.id !== chatId));
      if (currentId === chatId) {
        router.push("/");
      }
    } catch (error: any) {
      console.error("Failed to delete chat: ", error);
      alert(error.message);
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
              title={chat.name}
            >
              {chat.name || "Untitled"}
            </div>
          )}
          {editingId !== chat.id ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(chat.id);
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
    </div>
  );
}

function ProfileDropdown({
  user,
  onClose,
}: {
  user: any;
  onClose: () => void;
}) {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-2 right-2 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50"
    >
      <div className="px-3 py-2 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 truncate">
          {user.displayName || "User"}
        </p>
        <p className="text-xs text-gray-500 truncate">{user.email}</p>
      </div>

      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <BiUser className="w-4 h-4" />
        Profile
      </button>

      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <BiCog className="w-4 h-4" />
        Settings
      </button>

      <button className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
        <BiHelpCircle className="w-4 h-4" />
        Help & Support
      </button>

      <div className="border-t border-gray-100 mt-1 pt-1">
        <button
          className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
          onClick={() => {
            onClose();
          }}
        >
          <BiLogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

const BaseOptions = [
  {
    text: "Open Source",
    iconURL: "/github.svg",
  },
  {
    text: "Support",
    iconURL: "/question.svg",
  },
] as SideBarBaseProps[];

export default function SideBar(props: SidebarProps) {
  const router = useRouter();
  const user = useContext(UserContext);
  const [collapsed, setCollapsed] = useState(false);
  const [chatsExpanded, setChatsExpanded] = useState(true);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const handleNewChat = () => {
    router.push("/");
    router.replace("/");
    setChatsExpanded(true);
  };

  return (
    <div
      className={`transition-all duration-150 h-screen ${
        collapsed ? "w-16" : "w-64"
      } bg-gray-50 border-r border-gray-200 flex flex-col`}
    >
      {/* Header */}
      <div
        className={`border-b border-gray-200 ${collapsed ? "p-2" : "px-3 py-2"}`}
      >
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
        >
          {!collapsed && (
            <div className="flex items-center gap-2 flex-1">
              <span className="font-bold text-gray-900">Remembrance</span>
            </div>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
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
            title={collapsed ? "New chat" : ""}
          >
            <BiPlus className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">New chat</span>
            )}
          </button>

          {/* Search */}
          <div
            className={`flex items-center text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors duration-75 ${
              collapsed ? "justify-center p-2" : "gap-3 px-2 py-1.5"
            }`}
            title={collapsed ? "Search" : ""}
          >
            <BiSearch className="w-4 h-4 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Search</span>}
          </div>

          {/* Memory */}
          <button
            onClick={() => {
              router.push("/repository");
            }}
            className={`flex items-center w-full text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors duration-75 ${
              collapsed ? "justify-center p-2" : "gap-3 px-2 py-1.5"
            }`}
            title={collapsed ? "Memory Graph" : ""}
          >
            <TfiLayersAlt className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">Memory Graph</span>
            )}
          </button>

          {/* Dashboard */}
          <div
            className={`flex items-center text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors duration-75 ${
              collapsed ? "justify-center p-2" : "gap-3 px-2 py-1.5"
            }`}
            title={collapsed ? "Dashboard" : ""}
          >
            <BiSolidDashboard className="w-4 h-4 flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm font-medium">Dashboard</span>
            )}
          </div>

          {/* Documentation */}
          <button
            onClick={() => {
              router.push("/docs");
            }}
            className={`flex items-center w-full text-gray-700 hover:bg-gray-100 rounded-md cursor-pointer transition-colors duration-75 ${
              collapsed ? "justify-center p-2" : "gap-3 px-2 py-1.5"
            }`}
            title={collapsed ? "Documentation" : ""}
          >
              <BsBookHalf className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <span className="text-sm font-medium">Documentation</span>
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
              <span className="text-sm font-semibold text-gray-700 tracking-wide">
                Chats
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

      {/* Bottom Section */}
      {!collapsed && (
        <div className="border-t border-gray-200 p-3 relative">
          {/* User Info */}
          {user && (
            <>
              <button
                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-100 rounded-md cursor-pointer transition-colors duration-75"
              >
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-semibold text-gray-700">
                    {user.displayName?.charAt(0) ||
                      user.email?.charAt(0) ||
                      "U"}
                  </span>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {user.displayName || "User"}
                  </p>
                  <p className="text-xs text-gray-500 truncate font-medium">
                    {user.email}
                  </p>
                </div>
                <BiChevronDown
                  className={`w-4 h-4 text-gray-500 flex-shrink-0 transition-transform duration-150 ${showProfileDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {showProfileDropdown && (
                <ProfileDropdown
                  user={user}
                  onClose={() => setShowProfileDropdown(false)}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
