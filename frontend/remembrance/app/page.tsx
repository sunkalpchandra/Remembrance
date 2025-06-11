"use client"
import SideBar from "@/app/components/sidebar"
import { useState } from "react";
import type { Conversation } from "@/app/lib/types";
import CircleButton from "@/app/components/circlebutton";
import OvalButton from "@/app/components/ovalbutton";


export default function Home() {

  const [suggestion, SetSuggestion] = useState("Suggestion");
  const [conversation, SetConversation] = useState(undefined as Conversation | undefined)
  return <div className="w-screen flex flex-row bg-[##f9f8f6]">
    <SideBar selected={1}></SideBar>
    <div className=" grow h-screen flex flex-col-reverse ">
      <div className="mx-2 border-2 border-[#A3A3A3] rounded-xl bg-white flex flex-col mb-5 ">
        <div className="w-full ">
          <textarea className="w-full pt-5 px-2 " placeholder="Illustrate your memories based on your people you love...">

          </textarea>
        </div>
        <div className="w-full flex flex-row justify-between items-end">
          <div className="flex-row m-3 flex  gap-1">
            <CircleButton imgURL={"/paperclip.svg"} onClick={function (e: any): void {
              //TODO
              console.error("file upload no implmented")
            } } imgAlt={"File"} hoverText={"Choose a file to upload"} popUpAbove></CircleButton>
            <OvalButton popUpAbove imgURL={"/map.svg"} onClick={function (e: any): void {
              //TODO no idea what this button is called/supposed to
            } } imgAlt={"map"} hoverText={"Choose memory"} text={"remembrance-1"}></OvalButton>
            <CircleButton imgURL={"/emoji.png"} onClick={function (e: any): void {
              //TODO
              console.error("emoji select not implented ")
            } } imgAlt={"Emoji"} hoverText={"begin convo with emoji"} popUpAbove></CircleButton>
          </div>
          <div className="p-2 rounded-full bg-black m-3">
            <img src="/arrow-up.svg" className="w-5 " alt="Send" />
          </div>
        </div>
      </div>
      <div className="grow w-full flex items-center flex-col justify-center ">
        {
          conversation == undefined ? 
          <div>
          <h1 className = "text-6xl">Welcome to Remembrance</h1>
          {//TODO: Change this font to IBM mono. nextjs handles fonts differently so Im going to wait till after the conversion to do so
          }
          <div className = "w-full border-[#afaead] border-1 text-lg px-2 shadow-xs shadow-[#000000af] flex flex-row items-center justify-between">
            <div className = "relative">
            {suggestion}
            </div>
            <div className=" flex flex-row my-1">
              <CircleButton imgAlt = "refresh" imgURL = "/refresh.svg" hoverText = "suggest me again" onClick = {() => {
                SetSuggestion("random new " + Math.random())
              }}></CircleButton>
              <CircleButton imgAlt = "Use" imgURL = "arrow-up-right.svg" hoverText = "use this message" onClick = {() => {
                //TODO start conversation with suggestion
              }}></CircleButton>
              </div>
          </div>

        </div>
        : <>
        </>
        }
      </div>
    </div>
  </div>
}
