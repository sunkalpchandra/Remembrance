import { useState } from "react"


interface Multibutton {
    imgURLS: string[]
    imgAlts: string[]
    callBacks: ((e: any) => void)[]
    black?: boolean
}

export default function MultiButton(props: Multibutton) {

    return <div className={`relative border-[#dedddb] rounded-full  items-center p-1    border-1 shadow-black shadow-2xs flex flex-row gap-2 cursor-pointer   ${props.black ? "bg-black hover:bg-gray-800 border-0 shadow-none" : ""}`}    >
        {props.imgURLS.map((e, i) => {
            return <img src = {e} alt = {props.imgAlts[i]} key = {i} className = "aspect-square min-w-[1vw]" onClick = {props.callBacks[i]}></img>
        })}
    </div>
}