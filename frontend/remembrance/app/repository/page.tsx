"use client"
import { memo, useState } from "react";
import SideBar from "../components/sidebar";
import { MemoriesRepo, Memory } from "../lib/types";

const Memone : Memory = {
    name: 'Memory one',
    content: "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Placeat eveniet officia pariatur. Nihil minima voluptate enim. Aliquid numquam odit consequuntur minima, nihil quia tempora neque voluptate architecto soluta, voluptatum in.",
    topics: []
}
const memtow : Memory = {
    name: 'Memory Two',
    content: "Lorem ipsum dolor sit amet consectetur, adipisicing elit. Placeat eveniet officia pariatur. Nihil minima voluptate enim. Aliquid numquam odit consequuntur minima, nihil quia tempora neque voluptate architecto soluta, voluptatum in.",
    topics: []
}
const fillerData:MemoriesRepo = {

    memories: {
        name: 'root',
        contents: [
            {
                name: 'family',
                contents: [
                    {
                        name: 'Dad',
                        contents:[
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
        ]
    }
}

//still in progress
function FlattenRepo(repo : MemoriesRepo){
    let out = []
    for(let v of repo.memories.contents){
        out.push(v);


    }
}
export default function Page() {
    const repo = useState(fillerData);
    return <div className="flex w-screen h-screen flex-row items-center text-black">
        <SideBar selected={1}></SideBar>
        <div className="h-screen w-[20%] flex justify-start  flex-col pt-2">
            <button className="w-full flex flex-row justify-between px-5 hover:bg-[#DEDEDE]">
                <p>Add memory</p>
                <img src="/write.svg" alt="write" className = "w-[1vw] aspect-square" />
            </button>
            <button className="w-full flex flex-row justify-between px-5 hover:bg-[#DEDEDE]"><p>New Categorization</p>
                <img src="/folder.svg" alt="folder" className = "w-[1vw] aspect-square" /></button>
        </div>
    </div>
}