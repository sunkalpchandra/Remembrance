"use client"
import SideBar from "@/app/components/sidebar"
import { useEffect, useRef, useState } from "react";
import type { Conversation, ConversationMessage } from "@/app/lib/types";
import CircleButton from "@/app/components/circlebutton";
import OvalButton from "@/app/components/ovalbutton";
import { IBM } from "./lib/fonts";
import { HumanMessage } from "./components/messages/humanmessage";
import { BotMessage } from "./components/messages/botmessage";

export default function Home() {
  function sendBotMessage(){
    let newconversation = conversation;
    let message : ConversationMessage = {
      sentByUser: false,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    }
    if(newconversation == undefined){
      return;
    }
    newconversation.messages = [...newconversation?.messages, message]
    SetConversation({...newconversation})
  }
  const [suggestion, SetSuggestion] = useState("Suggestion");
  const [conversation, SetConversation] = useState(undefined as Conversation | undefined);
  const textInput = useRef(null as any as HTMLTextAreaElement);
  useEffect(() => {
    if(conversation == undefined){
      return
    }
    let last = conversation.messages.at(-1)
    if(last?.sentByUser){
      sendBotMessage();
    }
  }, [conversation])
  return <div className="w-screen flex flex-row bg-[##f9f8f6]">
    <SideBar selected={1}></SideBar>
    <div className=" grow h-screen flex flex-col-reverse ">
      <div className="mx-2 border-2 border-[#A3A3A3] rounded-xl bg-white flex flex-col mb-2 ">
        <div className="w-full ">
          <textarea className="w-full pt-5 px-2 " placeholder="Illustrate your memories based on your people you love..." ref = {textInput}>

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
          <button className="p-2 rounded-full bg-black m-3" onClick = {
            async () => {
              if(textInput.current.value != ""){
                let newconversation = conversation
                if(newconversation == undefined){
                  newconversation = {
                    name:"Unamed",
                    date: new Date(),
                    messages: [{
                      sentByUser: true,
                      text: textInput.current.value
                    }]
                  }
                }
                else {
                  newconversation.messages  = [...newconversation.messages, {
                    sentByUser: true,
                    text: textInput.current.value
                  }]
                }
                //spread here to ensure a rerender
                SetConversation({...newconversation});
              }
            }
          }>
            <img src="/arrow-up.svg" className="w-5 " alt="Send" />
          </button>
        </div>
      </div>
      <div className="grow w-full flex items-center flex-col justify-center ">
        {
          conversation == undefined ?
          <div>
          <h1 className = "text-6xl">Welcome to Remembrance</h1>

          <div className = "w-full border-[#afaead] border-1 mt-5 text-lg px-2 shadow-xs shadow-[#00000071] flex flex-row items-center justify-between">
            <div className = {`relative ${IBM.className}`}>
            {suggestion}
            </div>
            <div className=" flex flex-row my-1 gap-2">
              <CircleButton imgAlt = "refresh" imgURL = "/refresh.svg" hoverText = "suggest me again" onClick = {() => {
                SetSuggestion("random new " + Math.random())
              }}></CircleButton>
              <CircleButton imgAlt = "Use" imgURL = "arrow-up-right.svg" hoverText = "use this message" onClick = {() => {
                let newconversation: Conversation | undefined = conversation;
                newconversation = {
                    name:"Unamed",
                    date: new Date(),
                    messages: [{
                      sentByUser: true,
                      text: suggestion
                    }]
                  }
                  SetConversation(newconversation);
              }}></CircleButton>
              </div>
          </div>

        </div>
        : <div className = "w-full h-full flex flex-col items-center overflow-y-scroll mt-5 gap-9">
          {
            conversation.messages.map((e, i )=> {
              if(e.sentByUser){
                return <HumanMessage message = {e} key = {i}></HumanMessage>
              }
              else {
                return <BotMessage message={e} time={40} botName={"remeberance"} key = {i} ></BotMessage>
              }
            })
          }
        </div>
        }
      </div>
    </div>
  </div>
}
