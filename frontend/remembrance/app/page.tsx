"use client"
import SideBar from "@/app/components/sidebar"
import { useEffect, useRef, useState } from "react";
import type { Conversation, ConversationMessage } from "@/app/lib/types";
import CircleButton from "@/app/components/circlebutton";
import OvalButton from "@/app/components/ovalbutton";
import { IBM, ManRope } from "./lib/fonts";
import { HumanMessage } from "./components/messages/humanmessage";
import { BotMessage } from "./components/messages/botmessage";

export default function Home() {

  function sendHumanMessage(msg: string) {
    let newconversation = conversation
    if (newconversation == undefined) {
      newconversation = {
        name: "Unamed",
        date: new Date(),
        messages: [{
          sentByUser: true,
          text: msg
        }]
      }
    }
    else {
      newconversation.messages = [...newconversation.messages, {
        sentByUser: true,
        text: msg
      }]
    }
    //spread here to ensure a rerender
    SetConversation({ ...newconversation });
  }
  function sendBotMessage() {
    let newconversation = conversation;
    let message: ConversationMessage = {
      sentByUser: false,
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
    }
    if (newconversation == undefined) {
      return;
    }
    newconversation.messages = [...newconversation?.messages, message]
    SetConversation({ ...newconversation })
  }
  const [conversation, SetConversation] = useState(undefined as Conversation | undefined);
  const textInput = useRef(null as any as HTMLTextAreaElement);
  useEffect(() => {
    if (conversation == undefined) {
      return
    }
    let last = conversation.messages.at(-1)
    if (last?.sentByUser) {
      sendBotMessage();
    }
    //TODO scroll to bottom
  }, [conversation])
  return <div className="w-screen flex flex-row bg-[##f9f8f6]">
    <SideBar selected={0}></SideBar>
    <div className=" grow h-screen flex flex-col-reverse gap-5 ">
      {conversation != undefined && <div className="mx-2 border-2 border-[#A3A3A3] rounded-xl bg-white flex flex-col mb-2 ">
        <div className="w-full ">
          <textarea className="w-full pt-5 px-2 " placeholder="Illustrate your memories based on your people you love..." ref={textInput} onKeyUp={(e) => {
            if (e.key == "Enter" && !e.shiftKey) {
              sendHumanMessage(textInput.current.value);
              textInput.current.value = "";
            }
          }}>

          </textarea>
        </div>
        <div className="w-full flex flex-row justify-between items-end">
          <div className="flex-row m-3 flex  gap-1">
            <CircleButton imgURL={"/paperclip.svg"} onClick={function (e: any): void {
              //TODO
              console.error("file upload no implmented")
            }} imgAlt={"File"} hoverText={"Choose a file to upload"} popUpAbove></CircleButton>
            <OvalButton popUpAbove imgURL={"/map.svg"} onClick={function (e: any): void {
              //TODO no idea what this button is called/supposed to
            }} imgAlt={"map"} hoverText={"Choose memory"} text={"remembrance-1"}></OvalButton>
            <CircleButton imgURL={"/emoji.png"} onClick={function (e: any): void {
              //TODO
              console.error("emoji select not implented ")
            }} imgAlt={"Emoji"} hoverText={"begin convo with emoji"} popUpAbove></CircleButton>
          </div>
          <button className="p-2 rounded-full bg-black m-3" onClick={
            async () => {
              if (textInput.current.value != "") {
                sendHumanMessage(textInput.current.value);
                textInput.current.value = ""
              }
            }
          }>
            <img src="/arrow-up.svg" className="w-5 " alt="Send" />
          </button>
        </div>
      </div>}
      <div className="grow w-full flex items-center flex-col justify-center p-2">
        {
          conversation == undefined ?
            <div>
              <h1 className="text-6xl">Welcome to Remembrance</h1>

              <div className={` ${ManRope.className} gap-2 w-full border-[#afaead] border-1 mt-5 text-lg px-2 shadow-xs rounded-full flex flex-row items-center justify-between`}>
                <CircleButton imgURL={"/paperclip.svg"}  onClick={function (e: any): void {
                  //TODO
                  console.error("file upload no implmented")
                }} imgAlt={"File"} hoverText={"Choose a file to upload"} popUpAbove
                imgClassName = "m-1 "></CircleButton>
                <input type="text" id="FirstMessage" placeholder="Turn your complex thoughts into simple graphs..." className={`relative w-full ${ManRope.className}`}>
                </input>
                <div className=" flex flex-row my-1 gap-2">
                  <CircleButton black imgAlt="Send" imgURL="arrow-up.svg" hoverText="Start Conversation" onClick={() => {
                    let newconversation: Conversation | undefined = conversation;
                    newconversation = {
                      name: "Unamed",
                      date: new Date(),
                      messages: [{
                        sentByUser: true,
                        text: (document.getElementById("FirstMessage") as HTMLInputElement)?.value || ""
                      }]
                    }
                    SetConversation(newconversation);
                  }}
                  imgClassName = "w-[2vw] p-0.5"></CircleButton>
                </div>
              </div>

            </div>
            : <div className="w-full h-full flex flex-col items-center overflow-y-scroll relative max-h-[80vh] mt-5 gap-9">
              {
                conversation.messages.map((e, i) => {
                  if (e.sentByUser) {
                    return <HumanMessage message={e} key={i + e.text}></HumanMessage>
                  }
                  else {
                    return <BotMessage message={e} time={40} botName={"remeberance"} key={i + e.text} suggestions = {[
                      {
                        person: "father",
                        name: "Perfers to store family-centric lorum is p um as  as d a sd",
                        href: "/todo",
                        color: "#4DB960"
                      },
                      {
                        person: "mother",
                        name: "short",
                        href: "/todo",
                        color: "#4DB960"
                      }
                    ]} ></BotMessage>
                  }
                })
              }
            </div>
        }
      </div>
    </div>
  </div>
}
