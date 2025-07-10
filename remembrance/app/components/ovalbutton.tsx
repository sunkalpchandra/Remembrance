"use client"
import { useState } from "react"
import { IBM } from "../lib/fonts"


interface OvalButton {
    imgURL: string,
    onClick:(e: any) => void
    imgAlt: string
    hoverText: string
    text: string
    popUpAbove? : boolean
}

export default function OvalButton(props : OvalButton) {
    const [hover, setHover] = useState(false);
    return <div className = "relative border-[#dedddb] rounded-full flex items-center gap-2 p-1 border-1 shadow-black/20 shadow-md cursor-pointer px-2 hover:bg-[#DEDEDE]" onClick = {props.onClick}
    onMouseLeave = {() => {
        setHover(false);
    }}
     onMouseEnter = {() => {
        setHover(true)
     }}
    >
        <img src = {props.imgURL} alt = {props.imgAlt} className = "aspect-square w-[0.8vw] " ></img>
        <p className = {`text-xs ${IBM.className}`}> {props.text}</p>
        {//TODO change font
        }
        {hover && <div  className = {`absolute ${props.popUpAbove ? "bottom-full" : "top-full"} right-[50%] translate-x-[50%]  flex flex-row items-center text-center`} style = {{
             background: props.popUpAbove ? "url(/popup-flip.svg)":"url(/popup.svg)",
            backgroundSize: "100% 100%",
            backgroundRepeat: "no-repeat",
            display: "inline-block",
            whiteSpace: "nowrap",
        }}>
        <p className = {`text-sm text-white px-5 py-3 ${props.popUpAbove ? "mb-2": "mt-2"}`}>{props.hoverText}</p>
        </div>}
    </div>
}