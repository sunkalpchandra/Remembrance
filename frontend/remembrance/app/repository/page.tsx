"use client"
import { memo, useRef, useState } from "react";
import SideBar from "../components/sidebar";
import { MemoriesRepo, Memory, Topic } from "../lib/types";
import { send } from "process";
import { poppins } from "../lib/fonts";
import ReactMarkdown from "react-markdown";
//Filler data for testing
const Memone: Memory = {
    name: 'Memory one',
    content: "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Placeat eveniet officia pariatur. Nihil minima voluptate enim. Aliquid numquam odit consequuntur minima, nihil quia tempora neque voluptate architecto soluta, voluptatum in.",
    topics: [],
    symbol: "🏘",
    summary: "Lorem ipsum dolor"
}
const memtow: Memory = {
    name: 'Memory Two',
    content: "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Placeat eveniet officia pariatur. Nihil minima voluptate enim. Aliquid numquam odit consequuntur minima, nihil quia tempora neque voluptate architecto soluta, voluptatum in.",
    topics: [],
    symbol: "🌊",
    summary: "Lorem ipsum dolor"
}
const three: Memory = {
    name: 'Memory three',
    content: "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Placeat eveniet officia pariatur. Nihil minima voluptate enim. Aliquid numquam odit consequuntur minima, nihil quia tempora neque voluptate architecto soluta, voluptatum in.",
    topics: [],
    symbol: "🧳",
    summary: "Lorem ipsum dolor"
}
const fillerData: MemoriesRepo = {

    memories: {
        name: 'root',
        contents: [
            {
                name: 'family',
                contents: [
                    {
                        name: 'Dad',
                        contents: [
                            Memone
                        ]
                    },
                    {
                        name: 'Mom',
                        contents: [
                            Memone,
                            memtow
                        ]
                    }
                ]
            },
            {
                name: 'family2',
                contents: [
                    {
                        name: 'Dad2',
                        contents: [
                            three
                        ]
                    },
                    {
                        name: 'Mom2',
                        contents: [
                            three,
                            three
                        ]
                    }
                ]
            },
        ]
    }
}
//end filler data


//returns a list of every topic and memory in the repo
function FlattenRepo(repo: MemoriesRepo) {
    if (repo == undefined) {
        return []
    }
    let output = FlattenRepoRecurse(repo.memories.contents);
    let seen: Record<string, boolean> = {

    }
    return output.filter((e) => {
        if (e.name in seen) {
            return false;
        }
        else {
            seen[e.name] = true
            return true
        }

    })
}
function FlattenRepoRecurse(add: Array<Memory | Topic>) {
    let out: Array<Memory | Topic> = []
    for (let v of add) {
        out.push(v)
        if ('contents' in v) {
            out.push(...FlattenRepoRecurse(v.contents))
        }
    }
    return out
}




export default function Page() {
    const [repo, setRepo] = useState(fillerData);
    function GetPath(mem: Memory | Topic) {
        function Recurse(on: Topic): null | Array<Topic | Memory> {
            for (let v of on.contents) {
                if (v == mem) {
                    return [v]
                }
                if ('contents' in v) {
                    let out = Recurse(v)
                    if (out != null) {
                        return [v, ...out]
                    }
                }
            }
            return null;
        }
        for (let v of repo.memories.contents) {
            if (v == mem) {
                return [v]
            }
            if ('contents' in v) {
                let out = Recurse(v)
                if (out != null) {
                    return [v, ...out]
                }
            }

        }
    }
    const [current, setCurrent] = useState(null as Memory | Topic | null);
    const [width, setWidth] = useState(50);
    const resizeParent = useRef(null as any as HTMLDivElement);
    const [editingSummary, setEditingSummary] = useState(false);
    return <div className="flex w-screen h-screen flex-row items-center text-black">
        <SideBar selected={1}></SideBar>
        <div className="h-screen w-[20%] flex justify-start  flex-col pt-2">
            <button className="w-full flex flex-row justify-between px-5 hover:bg-[#DEDEDE] cursor-pointer">
                <p>Add memory</p>
                <img src="/write.svg" alt="write" className="w-[1vw] aspect-square" />
            </button>
            <button className="w-full flex flex-row justify-between px-5 hover:bg-[#DEDEDE]"><p>New Categorization</p>
                <img src="/folder.svg" alt="folder" className="w-[1vw] aspect-square" /></button>
            <div className="mt-3">
                {
                    FlattenRepo(repo).map((e, i) => {
                        return <p onClick={() => {
                            setCurrent(e)
                        }

                        } className="pl-10 px-3 hover:bg-[#DEDEDE] w-full cursor-pointer" key={i}>{e.name}</p>
                    })
                }
            </div>
        </div>
        <div className="w-full grow h-screen flex flex-row  " ref={resizeParent}>
            <div className="h-full flex flex-col bg-white" style={{
                width: (width) + "%",
                flexGrow: width / 100
            }}>
                <div className="h-[10%] w-full flex flex-row justify-between items-start" >
                    <div className="p-2 flex flex-row gap-2 text-[#7E7E7E]">
                        {
                            current && GetPath(current)?.map((e, i) => {
                                return <><p className="" key={i}>{e.name}</p>
                                    {<p key={i + "brace"}>{">"}</p>}</>
                            })
                        }

                    </div>
                    <div className=" gap-2 flex flex-row justify-evenly items-center p-2">
                        <button className="px-2 flex flex-row items-center gap-2 text-[#bfbfbf] border-2 rounded-md border-[#bfbfbf]  hover:border-black">
                            <img src="send.svg" alt=" " className=" aspect-square w-[1.3vw]" />
                            update
                        </button>
                        <img src="more.svg" alt="more" className="w-[1.3vw] cursor-pointer" />
                        <img src="sidebar.svg" alt="" className="w-[1.3vw] cursor-pointer" />
                    </div>
                </div>
                <div className="h-[90%] flex flex-col items-start pl-5">
                    <h1 className=" text-6xl">{current && !('contents' in current) ? (current as Memory).symbol : ""}</h1>
                    <h1 className={"text-6xl pt-6 font-bold " + poppins.className}>{current?.name}</h1>
                    <div className="w-[80%] bg-[#f5f5f5] rounded-xl p-5 flex flex-row items-start" onDoubleClick = {() => {
                        setEditingSummary(!editingSummary)
                    }}><div className="text-xl pr-3  ">❗</div>{<p className="text-[#B2B0AB]">{current && !('contents' in current) ? (current as Memory).summary : ""}</p>}
                    </div>
                    <ReactMarkdown className="w-[80%]">
                        {current && !('contents' in current) ? (current as Memory).content : ""}
                    </ReactMarkdown>
                </div>
            </div>
            <div className="h-screen p-0.5 cursor-col-resize bg-black" onMouseDown={(e) => {
                let start = e.clientX;
                let currentWidth = width;

                function mousemove(ev: MouseEvent) {
                    let dif = ev.clientX - start;
                    setWidth(currentWidth + (dif / resizeParent.current.clientWidth) * 100);
                }

                function mouseup() {
                    document.removeEventListener("mousemove", mousemove);
                    document.removeEventListener("mouseup", mouseup);
                }

                document.addEventListener("mousemove", mousemove);
                document.addEventListener("mouseup", mouseup);
            }}></div>
            <div className="h-full " style={{
                width: (1 - (width)) + "%",
                flexGrow: 1 - (width / 100)
            }}></div>
        </div>
    </div>
}