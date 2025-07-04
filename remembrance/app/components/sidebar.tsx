"use client"
import { useContext, useEffect, useState } from "react"
import type { SideBarChoiceProps } from "./sidebarchoice"
import SideBarChoice from "./sidebarchoice"
import { BaseSideBar, type SideBarBaseProps } from "./sidebarchoicebase"
import { UserContext } from "@/app/components/usercontext"
import { IBM } from "../lib/fonts"
import { useRouter } from "next/navigation"
import { getConversationsForUser } from "@/backend/lib/db";

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

function SideBarChatList({userId}: {userId: string | any}) {
    const [chats, setChats] = useState<{id: string, name: string}[]>([]);
    const router = useRouter();

    useEffect(() => {
        if (userId) {
            getConversationsForUser(userId).then((data: any) => setChats(data));
        }
    }, [userId]);

    return (
        <div className="pt-4 px-4 flex flex-col gap-2">
            <p className="font-bold text-xs text-gray-600 mb-2">Previous Chats</p>
            {chats.map((chat) => (
                <div key={chat.id} className="cursor-pointer text-sm text-black truncate hover:underline" onClick={() => router.push(`/chat/${chat.id}`)}>
                    {chat.name || "Untitled"}
                </div>
            ))}
        </div>
    )
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
                    <SideBarChatList userId={user?.uid} />
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