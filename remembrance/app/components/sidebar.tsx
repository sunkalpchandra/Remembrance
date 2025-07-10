"use client"
import { useContext, useEffect, useState } from "react"
import type { SideBarChoiceProps } from "./sidebarchoice"
import SideBarChoice from "./sidebarchoice"
import { BaseSideBar, type SideBarBaseProps } from "./sidebarchoicebase"
import { UserContext } from "@/app/components/usercontext"
import { IBM } from "../lib/fonts"
import { useRouter } from "next/navigation"
import { getConversationById, getConversationsForUser, saveConversation } from "@/backend/lib/db";
import { useParams } from "next/navigation"

interface SidebarProps {
    selected: number
}
const SideBarOptions = [
    {
        text: "New chat",
        iconPath: "/chat.svg",
        link:"/"
    },
    {
        text: "Memory-Graph",
        iconPath: "/repo.svg",
        link: "/repository",
        tag: "beta",
        tagcolor: "#000000"
    },
    {
        text: "Dashboard",
        iconPath: "/family.svg",
        link: "/dashboard",
        tag: "beta",
         tagcolor: "#000000"
    }
] as SideBarChoiceProps[]

function SideBarChatList({ userId }: { userId: string | any }) {
  const [chats, setChats] = useState<{ id: string, name: string }[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>("");
  const router = useRouter();
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
    const updatedChats = chats.map(chat =>
      chat.id === id ? { ...chat, name: newName } : chat
    );
    setChats(updatedChats);
    setEditingId(null);

    const convo = await getConversationById(userId, id);
    if (convo) {
      convo.name = newName;
      await saveConversation(userId, convo, id);
    }
  };

  return (
    <div className="pt-4 px-4 flex flex-col gap-2">
      <p className="font-bold text-xs text-gray-600 mb-2">Previous Chats</p>
      {chats.map((chat) => (
        <div key={chat.id} className={`group flex items-center gap-2`}>
          {editingId === chat.id ? (
            <input
              autoFocus
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename(chat.id, editingName);
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={() => setEditingId(null)}
              className="w-full text-sm bg-white border border-gray-300 rounded px-1"
            />
          ) : (
            <div
              className={`cursor-pointer text-sm truncate grow ${
                chat.id === currentId ? "bg-gray-300 font-bold px-1 rounded" : ""
              }`}
              onClick={() => router.push(`/chat/${chat.id}`)}
              title={chat.name}
            >
              {chat.name || "Untitled"}
            </div>
          )}
          <img
            src="/pencil.svg" // TODO: add in an actual svg later
            alt="Edit"
            className="w-3 h-3 opacity-0 group-hover:opacity-100 cursor-pointer"
            onClick={() => {
              setEditingId(chat.id);
              setEditingName(chat.name || "");
            }}
          />
        </div>
      ))}
    </div>
  );
}

const BaseOptions = [
    {
        text: "Open Source",
        iconURL: "/github.svg"
    },
    {
        text: "Support",
        iconURL: "/question.svg"
    },


] as SideBarBaseProps[]
export default function SideBar(props: SidebarProps) {
    const user = useContext(UserContext);
    const [collapsed, setCollapsed] = useState(false)
    return (
        <div className={` transition-all h-screen ${collapsed ?  "min-w-[3vw] max-w-[3vw]" : "min-w-[13vw] max-w-[13vw]"} grow bg-[#f0eeec] flex flex-col justify-between border-r-1 border-[#9a9a98] py-5 left-0 top-0`}>
            <div className=" w-full flex flex-col">
                <div className="flex  flex-row justify-between px-5 w-full relative " >
                    <img src="/rlogo.svg" alt="" className="w-[1.5vw]" />
                    <img src="/sidebar.svg" alt="" className={` cursor-pointer w-[1.5vw] ${collapsed ? "absolute left-[100%] top-0 -translate-y-0.5 " : ""}`} onClick = {() => {
                    setCollapsed(!collapsed)
                }}/>
                </div>
                <div className="flex flex-col items-center  text-black text-xs  pt-8 ">
                    {    SideBarOptions.map((opt, i) => {

                        return <SideBarChoice key = {i} {...SideBarOptions[i]} collapsed={collapsed} selected = {(i == props.selected)}></SideBarChoice>
                    }) }
                    <div className="overflow-y-auto max-h-[60vh]">
                        <SideBarChatList userId={user?.uid} />
                    </div>
                </div>
            </div>
            <div className = "flex flex-col">
                <div className=" w-full flex flex-col cursor-pointer">
                    {
                        BaseOptions.map((e, i) => {
                            return <BaseSideBar {...e} key = {i} collapsed = {collapsed}></BaseSideBar>
                        })
                    }
                </div>
                {!collapsed && <div className = {`border-t-1 border-[#d9d9d9] flex flex-row justify-between px-2 items-center ${IBM.className}`}>
                    <div className = "flex flex-col pt-2"><p>{user?.displayName}</p> <p className = " text-xs text-[#787776]"> {user?.email}</p></div>
                    <img src="/up.svg" alt="expand" className = "w-[2vw]" />
                </div>}
            </div>
        </div>
    )
}