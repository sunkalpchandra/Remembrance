import { useContext } from "react"
import type { SideBarChoiceProps } from "./sidebarchoice"
import SideBarChoice from "./sidebarchoice"
import { BaseSideBar, type SideBarBaseProps } from "./sidebarchoicebase"
import { UserContext } from "@/app/components/usercontext"
import { IBM } from "../lib/fonts"


interface SidebarProps {
    selected: number
}
const SideBarOptions = [
    {
        text: "New chat",
        iconPath: "/chat.svg"
    },
    {
        text: "Repository",
        iconPath: "/repo.svg",
        tag: "beta",
        tagcolor: "#629DAD"
    },
    {
        text: "Family Care",
        iconPath: "/family.svg",
        tag: "coming soon",
         tagcolor: "#4B4D4E"
    }
] as SideBarChoiceProps[]


const BaseOptions = [
    {
        text: "Open Source",
        iconURL: "/github.svg"
    },
    {
        text: "Support",
        iconURL: "/question.svg"
    },
    {
        text: "Changelog",
        iconURL: "/pencil.svg"
    }

] as SideBarBaseProps[]
export default function SideBar(props: SidebarProps) {
    const user = useContext(UserContext);
    return <div className=" h-screen w-[13%] bg-[#f0eeec] flex flex-col justify-between border-r-1 border-[#9a9a98] py-5 left-0 top-0">
        <div className=" w-full flex flex-col">
            <div className="flex w-full flex-row justify-between px-5">
                <img src="/rlogo.svg" alt="" className="w-[9%]" /><img src="/sidebar.svg" alt="" className="w-[15%]" />
            </div>
            <div className="flex flex-col items-center  text-black text-xs pt-8 ">
                {SideBarOptions.map((opt, i) => {

                    return <SideBarChoice key = {i} {...SideBarOptions[i]} selected = {(i == props.selected)}></SideBarChoice>
                }) }
            </div>
        </div>
        <div className = "flex flex-col">
            <div className=" w-full flex flex-col cursor-pointer">
                {
                    BaseOptions.map((e, i) => {
                        return <BaseSideBar {...e} key = {i}></BaseSideBar>
                    })
                }
            </div>
            <div className = {`border-t-1 border-[#d9d9d9] flex flex-row justify-between px-2 items-center ${IBM.className}`}>
                <div className = "flex flex-col pt-2"><p>{user.name}</p> <p className = " text-xs text-[#787776]"> {user.email}</p></div>
                <img src="/up.svg" alt="expand" className = "w-[2vw]" />
            </div>
        </div>
    </div>
}