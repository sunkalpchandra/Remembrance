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
import { RotatingPhotos } from "@/app/components/rotating-photos";
import { useTypewriter } from "@/app/hooks/useTypewriter";
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
  const [landingTransitioning, setLandingTransitioning] = useState(false);
  const typewriterText = useTypewriter();
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
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
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
        addFiles(Array.from(dataTransfer.files));
      }
    },
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUploadClick = () => {
    fileInputRef.current?.click();
  };
  //const files = acceptedFiles.map(file => <li key={file.path}>{file.path}</li>);

  const addFiles = (files: File[]) => {
    if (!files.length) return;
    const previews = files.map((f) =>
      f.type.startsWith("image/") ? URL.createObjectURL(f) : "/file2.svg",
    );
    setSelectedFiles((prev) => [...prev, ...files]);
    setFilePreviews((prev) => [...prev, ...previews]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    addFiles(files);
  };

  const removeFileAt = (index: number) => {
    setFilePreviews((prev) => {
      const url = prev[index];
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const clearSelectedFiles = () => {
    filePreviews.forEach((url) => {
      if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
    });
    setSelectedFiles([]);
    setFilePreviews([]);
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
    if (!selectedFiles.length || !user) return;

    setIsUploading(true);
    try {
      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_id", user.uid);

        const response = await axios.post(
          `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000"}/upload`,
          formData,
          {
            headers: { "Content-Type": "multipart/form-data" },
          },
        );

        const result = response.data?.message || "Uploaded Successfully";
        sendHumanMessage(`Uploaded file: ${file.name}`);
        SetConversation((prev) =>
          prev
            ? {
                ...prev,
                messages: [...prev.messages, { sentByUser: false, text: result }],
              }
            : undefined,
        );
      }
    } catch (err: any) {
      console.error("Upload failed: ", err);
      alert("Upload failed, please try again");
    } finally {
      setIsUploading(false);
      clearSelectedFiles();
    }
  };

  const handleSendMessage = async () => {
    const messageText = chatInput.trim();

    if (!messageText && !selectedFiles.length) return;
    if (isUploading) return;

    if (selectedFiles.length) {
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

    // Add empty placeholder message that we'll stream into
    const placeholder = { sentByUser: false, text: "" };
    SetConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, placeholder] } : prev
    );

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: conversation.messages, user_id: user.uid }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";
      let finalMemories: string[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const raw = decoder.decode(value, { stream: true });
        for (const line of raw.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const payload = JSON.parse(line.slice(6));
            if (payload.text) {
              accumulated += payload.text;
              const snapshot = accumulated;
              SetConversation((prev) => {
                if (!prev) return prev;
                const msgs = [...prev.messages];
                msgs[msgs.length - 1] = { sentByUser: false, text: snapshot };
                return { ...prev, messages: msgs };
              });
            }
            if (payload.done) {
              finalMemories = payload.memories || [];
            }
          } catch {}
        }
      }

      const latestMemories = finalMemories.map((memory: string) => {
        const firstSentence = memory.split(".")[0];
        return { title: firstSentence.slice(0, 40) + (firstSentence.length > 40 ? "..." : ""), memoryText: memory };
      });

      SetConversation((prev) =>
        prev ? { ...prev, latestMemories } : prev
      );
    } catch (err) {
      console.error("Stream error:", err);
      SetConversation((prev) => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        msgs[msgs.length - 1] = { sentByUser: false, text: "Sorry, there was an error generating a response." };
        return { ...prev, messages: msgs };
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
      filePreviews.forEach((url) => {
        if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [filePreviews]);

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
              {selectedFiles.length > 0 && (
                <div className="flex items-center gap-2 px-3 pt-3 overflow-x-auto no-scrollbar">
                  {selectedFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 rounded-xl flex-shrink-0"
                    >
                      <img
                        src={filePreviews[i]}
                        alt="Attachment preview"
                        className="h-8 w-8 object-cover rounded-md flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 truncate max-w-[180px]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFileAt(i)}
                        className="p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                        aria-label="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  ))}
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
                    multiple
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    className="p-1.5 rounded-full bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    onClick={handleSendMessage}
                    disabled={
                      isUploading || (!chatInput.trim() && !selectedFiles.length)
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
          {conversation == undefined && <RotatingPhotos />}
          {conversation == undefined ? (
            <div
              className={`relative z-10 flex flex-col items-center w-full transition-all duration-300 ease-out ${
                landingTransitioning
                  ? "opacity-0 translate-y-2 scale-[0.98] pointer-events-none"
                  : "opacity-100 translate-y-0 scale-100"
              }`}
            >
              <h1
                className="text-4xl font-normal text-gray-900 text-center mb-6 select-none animate-fade-in"
                style={{ animationFillMode: "both" }}
              >
                Remembrance
              </h1>
              {selectedFiles.length > 0 && (
                <div className="w-full max-w-md mb-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  {selectedFiles.map((file, i) => (
                    <div
                      key={`${file.name}-${i}`}
                      className="flex items-center gap-2 px-2 py-1.5 bg-gray-100 rounded-xl flex-shrink-0"
                    >
                      <img
                        src={filePreviews[i]}
                        alt="Attachment preview"
                        className="h-8 w-8 object-cover rounded-md flex-shrink-0"
                      />
                      <span className="text-sm text-gray-700 truncate max-w-[180px]">
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFileAt(i)}
                        className="p-0.5 rounded-full hover:bg-gray-200 transition-colors"
                        aria-label="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <form
                className="flex w-fit flex-col gap-2 liquid-glass rounded-full p-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = landingInput.trim();

                  if (!trimmed && !selectedFiles.length) return;
                  if (isUploading) return;

                  if (selectedFiles.length) {
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
                    if (path == "/" && newId) router.prefetch("/chat/" + newId);

                    // 1. trigger fade-out of landing UI
                    setLandingTransitioning(true);

                    // 2. after the fade-out, swap to chat state and navigate
                    setTimeout(() => {
                      setConversationId(newId);
                      SetConversation(newconversation);
                      saveConversation(user.uid, newconversation, newId);
                      setLandingInput("");
                      if (path == "/" && newId) router.push("/chat/" + newId);
                    }, 280);
                  }
                }}
                role="search"
                aria-label="Start a new conversation"
              >
                <div className="flex items-center gap-2 pl-2 pr-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7 rounded-full flex-shrink-0"
                    aria-label="Attach file"
                    onClick={handleFileUploadClick}
                  >
                    <Plus className="w-4 h-4 text-gray-400" />
                  </Button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                    accept="image/*,.pdf,.txt,.docx"
                    multiple
                  />
                  <input
                    type="text"
                    ref={landingInputRef}
                    value={landingInput}
                    onChange={(e) => setLandingInput(e.target.value)}
                    placeholder={typewriterText}
                    className="w-80 bg-transparent outline-none text-sm px-2 placeholder-gray-400"
                    aria-label="Ask a question to start"
                    autoComplete="off"
                    autoFocus
                    maxLength={2000}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="w-7 h-7 rounded-full bg-black text-white hover:bg-gray-900 shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    aria-label="Start conversation"
                    disabled={
                      isUploading || (!landingInput.trim() && !selectedFiles.length)
                    }
                  >
                    {isUploading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArrowUp className="w-3.5 h-3.5" />
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
