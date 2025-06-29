"use client"

import { useContext } from "react"
import { UserContext } from "./usercontext"
import { hedvig } from "../lib/fonts";
function getInitals(name : string) : string{
    name = name.trim()
    let num = name.split(" ");

    let first = name.substring(0,1)
    if(num.length == 1){
        return first.toUpperCase();
    }
    else {
        return first + "" + name.substring(num[0].length + 1, num[0].length + 2)
    }

}

export function BotProfile(props : {
    name: string,
}){


    return <div className ={`bg-white rounded-full p-1 text-black  aspect-square text-lg ml-2 text-center grow-0 max-w-[3%] min-w-[3%] ${hedvig.className} shadow-2xs flex items-center flex-row justify-center`}>
        {
            getInitals(props.name)
        }
    </div>
}