"use client";
import SideBar from "@/app/components/sidebar";
import { useEffect, useRef, useState } from "react";
import type { Conversation } from "@/app/lib/types";
import CircleButton from "@/app/components/circlebutton";
import OvalButton from "@/app/components/ovalbutton";
import { ManRope } from "./lib/fonts";
import { HumanMessage } from "./components/messages/humanmessage";
import { BotMessage } from "./components/messages/botmessage";
import axios from "axios";
import { auth } from "@/backend/firebaseConfig";
import { signOut } from "firebase/auth";
import { onAuthStateChanged, User } from "firebase/auth";
import { useParams } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getConversationById, saveConversation } from "@/backend/lib/db";
import MemoryWidget, {MemoryWidgetProps} from "./components/memorywidget";
import { useRouter } from "next/navigation";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const [dropDown, setDropDown] = useState(false);
  const dropDownRef = useRef<HTMLDivElement | null>(null);

  const [user, setUser] = useState<User | any>();
  const params = useParams();
  const conversationId = params?.id as string | undefined;
  const [conversation, SetConversation] = useState(
    undefined as Conversation | undefined,
  );
  const [ConversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  const textInput = useRef(null as any as HTMLTextAreaElement);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", user.uid);

    try {
      const response = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data"},
      });

      const result = response.data?.message || "Uploaded Successfully";
      sendHumanMessage(`Uploaded file: ${file.name}`);
      SetConversation((prev) =>
        prev
      ? {
        ...prev,
        messages: [
          ...prev.messages,
          { sentByUser: false, text: result},
        ],
      }
      : undefined
      )
    }
    catch (err: any) {
      console.error("Upload failed: ", err);
      alert("Upload failed, please try again");
    }
  }

  useEffect(() => {
    if (conversationId && user) {
      getConversationById(user.uid, conversationId).then((c) => {
        if (c) {
          SetConversation({ ...(c as Conversation) });
          setConversationId(conversationId);
        }
      });
    }
  }, [conversationId, user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropDownRef.current && !dropDownRef.current.contains(event.target as Node)) {
        setDropDown(false);
      }
    };

    if (dropDown) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [dropDown]);

  useEffect(() => {
    if (ConversationId && user.uid && conversation) {
      saveConversation(user.uid, { ...conversation }, ConversationId);
    }
  }, [conversation, conversationId, user]);

  function sendHumanMessage(msg: string) {
    let newconversation = conversation;
    if (newconversation == undefined) {
      newconversation = {
        name: "Unamed",
        date: new Date(),
        messages: [
          {
            sentByUser: true,
            text: msg,
          },
        ],
      };
    } else {
      newconversation.messages = [
        ...newconversation.messages,
        {
          sentByUser: true,
          text: msg,
        },
      ];
    }
    //spread here to ensure a rerender
    SetConversation({ ...newconversation });
  }
  async function sendBotMessage() {
    if (!conversation) {
      return;
    }

    const lastUserMsg = conversation.messages.at(-1)?.text;
    if (!lastUserMsg) {
      return;
    }

    try {
      // if (!conversation.messages) {}
      const response = await axios.post("http://localhost:5000/query", {
        // query: lastUserMsg, ==> testing for functionality
        query: conversation.messages, // adding in all data
        user_id: user?.uid, // use authed user user_id
      });

      const message = {
        sentByUser: false,
        text: response.data?.result_return || "No response given from server",
      };

      const memorySnippet = response.data?.memories || [];

      SetConversation({
        ...conversation,
        messages: [
          ...conversation.messages,
          message,
          ...memorySnippet.map((memory: string) => ({
            sentByUser: false,
            text: memory,
            isMemorySnippet: true,
          })),
        ],
      });
    } catch (err) {
      console.error("Error: ", err);
      SetConversation({
        ...conversation,
        messages: [
          ...conversation.messages,
          {
            sentByUser: false,
            text: "Sorry, there was an error generating a response from our model.",
          },
        ],
      });
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (conversation == undefined) {
      return;
    }
    let last = conversation.messages.at(-1);
    if (last?.sentByUser) {
      sendBotMessage();
    }

    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
    //TODO scroll to bottom
  }, [conversation]);
  return (
    <div className="w-screen flex flex-row bg-white">
      <SideBar selected={0}></SideBar>
      {/* {conversation && (
      <input
        value={conversation.name}
        onChange={((e: any) => {
          const newConv = {...conversation, name: e.target.value};
          SetConversation(newConv);
          if (ConversationId && user?.uid) {
            saveConversation(user.uid, newConv, ConversationId);
          }}
        )}
        className="text-xl font-bold p-2 border-b"
      />

    )} */}
      <div className="absolute top-4 right-6 z-50">
        {user && (
          <div className="relative group">
            <img
              src={user.photoURL || "/default-profile.png"}
              alt="profile"
              className="w-10 h-10 rounded-full cursor-pointer border border-gray-300"
              onClick={() => setDropDown((prev) => !prev)}
            />
            {dropDown && (
                <div className="absolute right-0 mt-2 flex flex-col bg-white border border-gray-300 rounded-md shadow-md">
                  <button
                    onClick={async () => {
                      await signOut(auth);
                      setDropDown(false);
                      router.push("/login");
                    }}
                    className="px-4 py-2 text-sm hover:bg-gray-100 text-left"
                  >
                    Logout
                  </button>
                </div>
              )
            }
          </div>
        )}
      </div>
      <div className=" grow h-screen flex flex-col-reverse gap-5 ">
        {conversation != undefined && (
          <div className="mx-2 border-2 border-[#A3A3A3] rounded-xl bg-white flex flex-col mb-2 ">
            <div className="w-full ">
              <textarea
                className="w-full outline-none resize-none pt-5 px-2 "
                placeholder="Illustrate your memories based on your people you love..."
                ref={textInput}
                onKeyUp={(e) => {
                  if (e.key == "Enter" && !e.shiftKey) {
                    sendHumanMessage(textInput.current.value);
                    textInput.current.value = "";
                  }
                }}
              ></textarea>
            </div>
            <div className="w-full flex flex-row justify-between items-end">
              <div className="flex-row m-3 flex  gap-1">
                <CircleButton
                  imgURL={"/paperclip.svg"}
                  onClick={handleFileUploadClick}
                  imgAlt={"File"}
                  hoverText={"Choose a file to upload"}
                  popUpAbove
                ></CircleButton>
                <input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                  accept="image/*,.pdf,.txt,.docx"
                />
               
              </div>
              <button
                className="p-2 rounded-full bg-black m-3"
                onClick={async () => {
                  if (textInput.current.value != "") {
                    sendHumanMessage(textInput.current.value);
                    textInput.current.value = "";
                  }
                }}
              >
                <img src="/arrow-up.svg" className="w-5 " alt="Send" />
              </button>
            </div>
          </div>
        )}
        <div className="grow w-full flex items-center flex-col justify-center p-2">
          {conversation == undefined ? (
            <div>
              <h1 className="text-6xl">Welcome to Remembrance</h1>

              <div
                className={` ${ManRope.className} gap-2 w-full border-[#afaead] border-1 mt-5 text-lg px-2 shadow-xs rounded-full flex flex-row items-center justify-between`}
              >
                <CircleButton
                  imgURL={"/paperclip.svg"}
                  onClick={function (e: any): void {
                    //TODO
                    console.error("file upload no implmented");
                  }}
                  imgAlt={"File"}
                  hoverText={"Choose a file to upload"}
                  popUpAbove
                  imgClassName="m-1 "
                ></CircleButton>
                <input
                  type="text"
                  id="FirstMessage"
                  placeholder="Relive anything by asking"
                  className={`relative w-full ${ManRope.className}`}
                ></input>
                <div className=" flex flex-row my-1 gap-2">
                  <CircleButton
                    black
                    imgAlt="Send"
                    imgURL="arrow-up.svg"
                    hoverText="Start Conversation"
                    onClick={() => {
                      const firstMessage =
                        (
                          document.getElementById(
                            "FirstMessage",
                          ) as HTMLInputElement
                        )?.value || "";
                      if (!firstMessage.trim()) return;

                      let newconversation: Conversation | undefined =
                        conversation;
                      newconversation = {
                        name: "Untitled",
                        date: new Date(),
                        messages: [
                          {
                            sentByUser: true,
                            text: firstMessage,
                          },
                        ],
                      };
                      const newId: string = uuidv4();
                      setConversationId(newId);
                      SetConversation(newconversation);
                      saveConversation(user.uid, newconversation, newId);
                    }}
                    imgClassName="w-[2vw] p-0.5"
                  ></CircleButton>
                </div>
              </div>
            </div>
          ) : (
          
            <div className="w-full h-full flex flex-col items-center overflow-y-scroll relative max-h-[80vh] mt-5 gap-9">
              <div className="my-5"></div>
              {conversation.messages.map((e, i) => {
                if (e.sentByUser) {
                  return (
                    <HumanMessage message={e} key={i + e.text}></HumanMessage>
                  );
                } else {
                  return (
                    <BotMessage
                      message={e}
                      time={40}
                      botName={"remembrance"}
                      key={i + e.text}
                      suggestions={[{title:"father",memoryText:"prefers store to family centric"},{title:"father",memoryText:"prefers store to family centric"},{title:"father",memoryText:"prefers store to family centric"}]}
                    ></BotMessage>
                  );
                }
              })}
              <div ref={scrollRef}></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
