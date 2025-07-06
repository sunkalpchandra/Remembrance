"use client"
import { memo, useEffect, useRef, useState } from "react";
import SideBar from "../components/sidebar";
import { Command, MemoriesRepo, Memory, Topic } from "../lib/types";
import { send } from "process";
import { poppins } from "../lib/fonts";
import Editor from "../components/mdEditor";
import { MDXEditor, MDXEditorMethods } from "@mdxeditor/editor";
import { All_Commands } from "../lib/commands";
import Neo4jGraph from "../components/neo4j";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/backend/firebaseConfig";


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
        children: [
            {
                name: 'family',
                children: [
                    {
                        name: 'Dad',
                        children: [
                            Memone
                        ]
                    },
                    {
                        name: 'Mom',

                        content: "Lorum Ispum",
                        children: [
                            Memone,
                            memtow
                        ]
                    }
                ]
            },
            {
                name: 'family2',
                children: [
                    {
                        name: 'Dad2',
                        children: [
                            three
                        ]
                    },
                    {
                        name: 'Mom2',
                        children: [
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
function decodeHTMLEntities(str: string) {
    const txt = document.createElement("textarea");
    txt.innerHTML = str;
    return txt.value;
}

const commands: Command[] = [

]
for (let v of All_Commands) {
    commands.push(new v());
}
//returns a list of every topic and memory in the repo
function FlattenRepo(repo: MemoriesRepo) {
    if (repo == undefined) {
        return []
    }
    let output = FlattenRepoRecurse(repo.memories.children);
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
        if ('children' in v) {
            out.push(...FlattenRepoRecurse(v.children))
        }
    }
    return out
}

export default function Page() {
    const [repo, setRepo] = useState(fillerData);
    const old = useRef("");
    function GetPath(mem: Memory | Topic) {
        function isTopic(obj: any): obj is Topic {
            return obj && Array.isArray(obj.children);
        }
        function Recurse(on: Topic): null | Array<Topic | Memory> {
            for (let v of on.children) {
                if (v == mem) {
                    return [v];
                }
                if (isTopic(v)) {
                    let out = Recurse(v);
                    if (out != null) {
                        return [v, ...out];
                    }
                }
            }
            return null;
        }
        for (let v of repo.memories.children) {
            if (v == mem) {
                return [v];
            }
            if (isTopic(v)) {
                let out = Recurse(v);
                if (out != null) {
                    return [v, ...out];
                }
            }
        }
    }
    const editorRef = useRef(null as MDXEditorMethods | null);
    const [current, setCurrent] = useState(null as Memory | Topic | null);
    const [width, setWidth] = useState(50);
    const resizeParent = useRef(null as any as HTMLDivElement);
    const [editingSummary, setEditingSummary] = useState(false);
    const [command, setCommand] = useState("");
    const [commandIndex, setCommandIndex] = useState(0);
    const [user, setUser] = useState<User | any>();
    useEffect(() => {
        if (editorRef.current) {
            editorRef.current.setMarkdown(current?.content || "")
        }
    }, [current])
    function updateRepo(current: Memory | Topic, newValue: Memory | Topic) {
        let cpRepo = { ...repo }
        for (let v of FlattenRepo(cpRepo)) {
            if (v.name == current.name) {
                Object.assign(v, current)
            }
        }
        setRepo(cpRepo)
    }

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
            setUser(firebaseUser)
        }
        });

        return () => unsubscribe();
    }, []);

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
                            setCommand("")
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
                {current && <div className="h-[90%] flex flex-col items-start pl-5">
                    <h1 className=" text-6xl">{current && !('contents' in current) ? (current as Memory).symbol : ""}</h1>
                    <h1 className={"text-6xl pt-6 font-bold " + poppins.className}>{current?.name}</h1>
                    <div className="w-[80%] bg-[#f5f5f5] rounded-xl p-5 flex flex-row items-start" onDoubleClick={() => {
                        setEditingSummary(!editingSummary);
                    }}><div className="text-xl pr-3  ">❗</div>{editingSummary ? <input type="text" value={current && !('contents' in current) ? (current as Memory).summary : ""} onChange={(e) => {
                        if (current == null) {
                            return
                        }
                        if (!("summary" in current)) {
                            return;
                        }
                        let copy = { ...current }
                        copy.summary = e.target.value;
                        setCurrent({ ...copy });
                        updateRepo(current, copy)
                    }} onKeyDown={
                        (e) => {
                            if (e.key == "Enter") {
                                setEditingSummary(false)
                            }
                        }
                    }></input> : <p className="text-[#B2B0AB]">{current && !('contents' in current) ? (current as Memory).summary : ""}</p>}
                    </div>
                    <div className=" relative" onKeyDownCapture={(e) => {
                        let indices = []
                        for (let i = 0; i < commands.length; i++) {
                            if (("/" + commands[i].name).toLowerCase().includes(command.split(" ")[0].toLowerCase())) {
                                indices.push(i)
                            }
                        }
                        if (indices.length == 0) {
                            setCommandIndex(0)
                            return;
                        }

                        let indicesIndex = indices.indexOf(commandIndex);
                        if (indicesIndex == -1) {
                            setCommandIndex(indices[0])
                            return
                        }
                        if (e.key == "ArrowUp") {
                            let next = indicesIndex - 1;
                            if (next < 0) {
                                setCommandIndex(indices[indices.length - 1]);
                            }
                            else {
                                setCommandIndex(indices[next])
                            }
                        }
                        if (e.key == "ArrowDown") {
                            setCommandIndex(indices[indicesIndex + 1 % indices.length])
                        }



                        if ((e.key == "Enter" || e.key == "Space" || e.key == "Tab") && command != "" && (!command.includes(" "))) {
                            e.stopPropagation();
                            e.preventDefault();
                            let selectedCommand = commands[commandIndex];
                            let txt = editorRef.current?.getMarkdown()
                            if (txt == undefined) {
                                console.warn("null on editor ref ")
                                return
                            }
                            let add = ("/" + selectedCommand.name).substring(command.length)
                            editorRef.current?.insertMarkdown(add + " ");
                            setCommand(add)
                        }
                    }
                    }>
                        {command != "" && <ol className="absolute z-[500] bg-white bottom-5 border-2 border-black rounded-md  max-h-[20vh] overflow-y-scroll" style={{
                        }}>
                            {
                                commands.map((e: Command, i) => {
                                    if (command != "") {
                                        console.log(e.name, command.split(" ")[0])
                                        let all = command.split(" ");
                                        if (all.length > e.params.length) {
                                            console.log("skippinglen" + e.name + " " + e.params.length, all.length)
                                            return <></>
                                        }
                                        else {
                                            let name = "/" + e.name;
                                            if (!name.toLowerCase().includes(command.split(" ")[0].toLowerCase())) {
                                                console.log("skipping" + e.name)
                                                return <></>
                                            }
                                            return <div className={`flex flex-col border-gray-500 p-2 ${i == commandIndex && "bg-[#DEDEDE]"}`}>
                                                <h2>{e.name}</h2>
                                                <div className="text-[#B2B0AB] text-xs">{e.summary}</div>
                                            </div>
                                        }
                                    }
                                    return <></>
                                })
                            }
                        </ol>}
                        <Editor editorRef={editorRef} change={
                            (e) => {
                                if (e.length > old.current.length) {
                                    //added
                                    let added = decodeHTMLEntities(e.substring(old.current.length));
                                    console.log(added);
                                    if (command != "") {

                                        setCommand(command + added);
                                    }
                                    else {
                                        if (added.includes("/")) {
                                            setCommand(added.substring(added.indexOf("/")))
                                        }
                                    }
                                }
                                else {
                                    //deleted
                                    let deleted = old.current.substring(e.length)
                                    if (command != "" && deleted.includes("/")) {
                                        setCommand("");
                                    }
                                    else if (command != "") {
                                        setCommand(command.substring(0, command.length - deleted.length))
                                    }
                                }
                                let copy = { ...current }
                                copy.content = e;
                                setCurrent({ ...copy });
                                updateRepo(current, copy);
                                old.current = e;
                            }
                        } markdown={
                            current?.content || ""
                        }></Editor>
                    </div>
                </div>}
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
                <div className="h-full w-full">
                    <Neo4jGraph userId={user.uid} />
                </div>
        </div>
    </div>
}