"use client";
import SideBar from "@/app/components/sidebar";
import type React from "react";

import { useContext, useEffect, useRef, useState } from "react";
import type { Conversation } from "@/app/lib/types";
import { HumanMessage } from "./components/messages/humanmessage";
import { BotMessage } from "./components/messages/botmessage";
import axios from "axios";
import { UserContext } from "./components/usercontext";
import { useParams, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getConversationById, saveConversation } from "@/backend/lib/db";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/novel/ui/button";
import { Plus, ArrowUp, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { text } from "stream/consumers";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const frameLength = 512;
  const path = usePathname();

  const [dropDown, setDropDown] = useState(false);
  const dropDownRef = useRef<HTMLDivElement | null>(null);

  const [landingInput, setLandingInput] = useState("");
  const landingInputRef = useRef<HTMLInputElement>(null);

  const [chatInput, setChatInput] = useState("");

  const user = useContext(UserContext);
  const params = useParams();
  const conversationId = params?.id as string | undefined;
  const [conversation, SetConversation] = useState(
    undefined as Conversation | undefined,
  );
  const [ConversationId, setConversationId] = useState<string | undefined>(
    undefined,
  );
  const textInput = useRef(null as any as HTMLTextAreaElement);

  // New state for file handling
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const {
    getRootProps,
    acceptedFiles,
    getInputProps,
    isFocused,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop: (incomingFiles) => {
      if (fileInputRef.current) {
        // Note the specific way we need to munge the file into the hidden input
        // https://stackoverflow.com/a/68182158/1068446
        const dataTransfer = new DataTransfer();
        incomingFiles.forEach((v) => {
          dataTransfer.items.add(v);
        });
        fileInputRef.current.files = dataTransfer.files;
        const file = dataTransfer.files[0];
        if (!file) return;

        setSelectedFile(file);

        if (file.type.startsWith("image/")) {
          const previewUrl = URL.createObjectURL(file);
          setFilePreview(previewUrl);
        } else {
          setFilePreview("/file2.svg");
        }
      }
    },
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };
  //const files = acceptedFiles.map(file => <li key={file.path}>{file.path}</li>);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    // Create preview for images
    if (file.type.startsWith("image/")) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    } else {
      setFilePreview("/file2.svg");
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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
      if (
        dropDownRef.current &&
        !dropDownRef.current.contains(event.target as Node)
      ) {
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
    };
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
    SetConversation({ ...newconversation });
  }

  const uploadFile = async () => {
    if (!selectedFile || !user) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("user_id", user.uid);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );

      const result = response.data?.message || "Uploaded Successfully";
      sendHumanMessage(`Uploaded file: ${selectedFile.name}`);
      SetConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [...prev.messages, { sentByUser: false, text: result }],
            }
          : undefined,
      );
    } catch (err: any) {
      console.error("Upload failed: ", err);
      alert("Upload failed, please try again");
    } finally {
      setIsUploading(false);
      removeSelectedFile();
    }
  };

  const handleSendMessage = async () => {
    const messageText = chatInput.trim();

    if (!messageText && !selectedFile) return;
    if (isUploading) return;

    if (selectedFile) {
      await uploadFile();
    }

    if (messageText) {
      sendHumanMessage(messageText);
      setChatInput("");
    }
  };

  async function sendBotMessage() {
    if (!conversation) return;

    const lastUserMsg = conversation.messages.at(-1)?.text;
    if (!lastUserMsg) return;

    try {
      const response = await axios.post(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/query`, {
        query: conversation.messages,
        user_id: user.uid,
      });

      const message = {
        sentByUser: false,
        text: response.data?.result_return || "No response given from server",
      };

      const memorySnippet = response.data?.memories || [];

      const latestMemories = memorySnippet.map((memory: string) => {
        const firstSentence = memory.split(".")[0];
        const words = firstSentence.split("");
        const title =
          words.length > 5
            ? words.slice(0, 5).join(" ") + "..."
            : firstSentence;

        return {
          title: title,
          memoryText: memory,
        };
      });

      SetConversation({
        ...conversation,
        messages: [...conversation.messages, message],
        latestMemories,
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
    if (conversation == undefined) return;
    const last = conversation.messages.at(-1);
    if (last?.sentByUser) {
      sendBotMessage();
    }

    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [conversation]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      if (filePreview) {
        URL.revokeObjectURL(filePreview);
      }
    };
  }, [filePreview]);

  return (
    <div className="w-screen flex flex-row bg-white">
      <SideBar selected={0}></SideBar>
      <div
        {...getRootProps({ className: "dropzone" })}
        className="grow h-screen flex flex-col-reverse gap-5 "
      >
        {!isDragAccept && conversation != undefined && (
          <div className="flex flex-col gap-3 mx-2 mb-6 items-center">
            <div className="w-[80%] max-w-3xl rounded-2xl liquid-glass flex flex-col">
              {filePreview && (
                <div className="flex items-center gap-2 px-3 pt-3">
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 rounded-xl max-w-full">
                    <img
                      src={filePreview}
                      alt="Attachment preview"
                      className="h-8 w-8 object-cover rounded-md flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700 truncate max-w-[240px]">
                      {selectedFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                      aria-label="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}

              <textarea
                ref={textInput}
                value={chatInput}
                onChange={(e) => {
                  setChatInput(e.target.value);
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 200) + "px";
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={1}
                placeholder="Turn your complex thoughts into graphs..."
                className="w-full outline-none resize-none px-4 pt-3 pb-1 text-sm placeholder-gray-400 bg-transparent max-h-[200px]"
                aria-label="Message"
              />

              <div className="flex flex-row justify-between items-center px-2 pb-2">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleFileUploadClick}
                    className="p-1.5 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    aria-label="Attach file"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept="image/*,.pdf,.txt,.docx"
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="p-1.5 rounded-full bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handleSendMessage}
                    disabled={
                      isUploading || (!chatInput.trim() && !selectedFile)
                    }
                    aria-label="Send message"
                  >
                    {isUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <img src="/arrow-up.svg" className="w-3.5" alt="" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="grow w-full flex items-center flex-col justify-center p-2 relative min-h-[80vh]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 flex items-center justify-center z-0"
          >
            <div className="w-[600px] h-[400px] bg-gradient-to-br from-blue-100 via-purple-100 to-transparent rounded-full blur-3xl opacity-60 animate-bounce-shadow" />
          </div>
          {conversation == undefined ? (
            <div className="relative z-10 flex flex-col items-center w-full">
              <h1
                className="text-4xl font-normal text-gray-900 text-center mb-2 select-none animate-fade-in"
                style={{ animationFillMode: "both" }}
              >
                Remembrance
              </h1>
              <p
                className="text-sm text-gray-500 font-medium mb-8 text-center max-w-xl select-none animate-fade-in"
                style={{ animationDelay: "0.25s", animationFillMode: "both" }}
              >
                Relive, preserve, and cherish your most important memories.
              </p>
              <form
                className="flex w-full max-w-md flex-col gap-2 liquid-glass rounded-full px-3 py-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = landingInput.trim();

                  if (!trimmed && !selectedFile) return;
                  if (isUploading) return;

                  if (selectedFile) {
                    await uploadFile();
                  }

                  if (trimmed) {
                    const newconversation: Conversation = {
                      name: "Untitled",
                      date: new Date(),
                      messages: [
                        {
                          sentByUser: true,
                          text: trimmed,
                        },
                      ],
                    };
                    const newId: string = uuidv4();
                    setConversationId(newId);
                    SetConversation(newconversation);
                    saveConversation(user.uid, newconversation, newId);
                    setLandingInput("");
                    if (path == "/" && newId) {
                      router.prefetch("/chat/" + newId);
                      router.push("/chat/" + newId);
                    }
                  }
                }}
                role="search"
                aria-label="Start a new conversation"
              >
                {filePreview && (
                  <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 rounded-xl self-start max-w-full">
                    <img
                      src={filePreview}
                      alt="Attachment preview"
                      className="h-8 w-8 object-cover rounded-md flex-shrink-0"
                    />
                    <span className="text-sm text-gray-700 truncate max-w-[240px]">
                      {selectedFile?.name}
                    </span>
                    <button
                      type="button"
                      onClick={removeSelectedFile}
                      className="p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                      aria-label="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full flex-shrink-0"
                    aria-label="Attach file"
                    onClick={handleFileUploadClick}
                  >
                    <Plus className="w-5 h-5 text-gray-400" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept="image/*,.pdf,.txt,.docx"
                  />
                  <input
                    type="text"
                    ref={landingInputRef}
                    value={landingInput}
                    onChange={(e) => setLandingInput(e.target.value)}
                    placeholder="Relive anything by asking"
                    className="flex-1 min-w-0 bg-transparent outline-none text-sm px-2 placeholder-gray-400"
                    aria-label="Ask a question to start"
                    autoComplete="off"
                    autoFocus
                    maxLength={2000}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="rounded-full bg-black text-white hover:bg-gray-900 shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    aria-label="Start conversation"
                    disabled={
                      isUploading || (!landingInput.trim() && !selectedFile)
                    }
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArrowUp className="w-5 h-5" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : !isDragAccept ? (
            <div className="w-full h-full flex flex-col items-center overflow-y-scroll relative max-h-[80vh] mt-5 gap-9">
              <div className="my-5"></div>
              {conversation.messages
                .filter((e) => !e.isMemorySnippet)
                .map((e, i) => {
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
                        suggestions={
                          conversation.latestMemories?.slice(0, 5) || []
                        }
                      ></BotMessage>
                    );
                  }
                })}
              <div ref={scrollRef}></div>
            </div>
          ) : (
            <div className="w-full h-full  flex items-center justify-center">
              <img
                alt="File"
                className="h-6 w-6 object-cover rounded"
                src="/file2.svg"
              />
              <h3>Drop Files here to add them to the conversation.</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
