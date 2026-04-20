"use client";
import SideBar from "@/app/components/sidebar";
import { io } from "socket.io-client";
import type React from "react";
import { useContext, useEffect, useRef, useState } from "react";
import type { Conversation } from "@/app/lib/types";
import { HumanMessage } from "./components/messages/humanmessage";
import { BotMessage } from "./components/messages/botmessage";
import axios from "axios";
import { UserContext } from "./components/usercontext";
import { useParams, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getConversationById } from "@/app/actions";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/novel/ui/button";
import { Plus, ArrowUp, X, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import {
  LuSignalHigh,
  LuSignalLow,
  LuSignalMedium,
  LuSignalZero,
} from "react-icons/lu";
import { RotatingPhotos } from "@/app/components/rotating-photos";
import { useTypewriter } from "@/app/hooks/useTypewriter";
import { useProfile } from "@/app/hooks/useProfile";
import { IdentityPanel } from "@/app/components/identity-panel";
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
  const { profile } = useProfile();

  const [chatInput, setChatInput] = useState("");

  const { getToken } = useAuth();
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
  const [selectedModel, setSelectedModel] = useState("max");

  useEffect(() => {
    try {
      const savedModel = localStorage.getItem("selected-model");
      if (savedModel) {
        setSelectedModel(savedModel);
      }
    } catch {}
  }, []);

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
      getConversationById(conversationId)
        .then((res) => {
          if (res.success && res.data) {
            SetConversation(res.data as unknown as Conversation);
            setConversationId(conversationId);
          } else if (!res.success) {
            console.error("Failed to load conversation:", res.error);
          }
        })
        .catch((err) => {
          console.error("Error loading conversation:", err);
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
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropDown]);

  // Automatically syncing to backend
  useEffect(() => {
    // Relying on server actions for discrete updates instead of continuous bulk saving
  }, [conversation, conversationId, user]);

  // Monitor socket connection status
  useEffect(() => {
    const checkSocket = setInterval(() => {
      const socket = (window as any).chatSocket;
      if (socket) {
        console.log(
          "[Socket] Current status - Connected:",
          socket.connected,
          "ID:",
          socket.id,
        );
      }
    }, 5000);
    return () => clearInterval(checkSocket);
  }, []);

  async function sendHumanMessage(msg: string) {
    let newconversation = conversation;
    let convoId = conversationId;

    if (newconversation == undefined || !convoId) {
      const { createConversation } = await import("@/app/actions");
      const res = await createConversation("New Conversation");
      if (res.success && res.data) {
        convoId = res.data.id;
        setConversationId(convoId);
        newconversation = {
          name: "New Conversation",
          date: new Date(),
          messages: [],
        };
      }
    }

    if (newconversation) {
      newconversation.messages = [
        ...(newconversation.messages || []),
        {
          sentByUser: true,
          text: msg,
        },
      ];
      SetConversation({ ...newconversation });

      if (convoId) {
        const { saveMessage } = await import("@/app/actions");
        await saveMessage(convoId, msg, true);
      }
    }
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
                messages: [
                  ...prev.messages,
                  { sentByUser: false, text: result },
                ],
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
      await sendHumanMessage(messageText);
      setChatInput("");
    }
  };

  async function sendBotMessage() {
    if (!conversation) return;

    const lastUserMsg = conversation.messages.at(-1)?.text;
    if (!lastUserMsg) return;

    // Add empty placeholder message that we'll stream into
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const placeholder = {
      sentByUser: false,
      text: " ",
      status: "Connecting...",
      request_id: requestId,
      streamState: "streaming" as const,
      thinkingText: "",
    };
    SetConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, placeholder] } : prev,
    );

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5001";

      let clerkToken: string | null = null;
      try {
        clerkToken = await getToken();
      } catch (tokenErr) {
        console.error("[Socket] Failed to get Clerk token:", tokenErr);
        throw new Error("Failed to get authentication token");
      }

      if (!clerkToken) {
        throw new Error("Missing Clerk session token");
      }

      console.log("[Socket] Connecting to backend at:", backendUrl);

      let socket = (window as any).chatSocket;

      if (!socket) {
        console.log("[Socket] Creating new socket connection with auth token");
        socket = io(backendUrl, {
          transports: ["websocket"],
          auth: {
            token: clerkToken,
          },
          reconnection: true,
          reconnectionDelay: 1000,
          reconnectionAttempts: 5,
        });
        (window as any).chatSocket = socket;
      } else {
        console.log("[Socket] Reusing existing socket connection");
        socket.auth = {
          token: clerkToken,
        };
        if (!socket.connected) {
          console.log("[Socket] Reconnecting socket");
          socket.connect();
        }
      }

      // Wait for socket to be ready
      if (!socket.connected) {
        console.log("[Socket] Waiting for socket to connect...");
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Socket connection timeout"));
          }, 5000);

          socket.once("connect", () => {
            clearTimeout(timeout);
            console.log("[Socket] Socket connected successfully");
            resolve();
          });

          socket.once("connect_error", (err) => {
            clearTimeout(timeout);
            console.error("[Socket] Connection error:", err);
            reject(err);
          });
        });
      } else {
        console.log("[Socket] Socket already connected");
      }

      // Clean up previous listeners
      socket.off("connect");
      socket.off("status");
      socket.off("thinking_chunk");
      socket.off("answer_chunk");
      socket.off("done");
      socket.off("error");
      socket.off("connect_error");

      let accumulatedThinking = "";
      let accumulatedAnswer = "";
      let finalMemories: string[] = [];
      let didReceiveResponse = false;

      const queryPayload = {
        history: conversation.messages.slice(0, -1).map((m) => ({
          role: m.sentByUser ? "user" : "assistant",
          content: m.text,
        })),
        query: lastUserMsg,
        user_id: user.uid,
        model_id: selectedModel,
        profile,
        request_id: requestId,
      };

      // Set up ALL listeners BEFORE emitting query
      socket.on("status", (payload: any) => {
        if (payload?.request_id && payload.request_id !== requestId) return;
        didReceiveResponse = true;
        SetConversation((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const current = msgs[msgs.length - 1] as any;
          if (current?.request_id && current.request_id !== requestId)
            return prev;
          msgs[msgs.length - 1] = {
            ...current,
            request_id: requestId,
            streamState: "streaming",
            status: payload.status,
          };
          return { ...prev, messages: msgs };
        });
      });

      socket.on("thinking_chunk", (payload: any) => {
        if (payload?.request_id && payload.request_id !== requestId) return;
        didReceiveResponse = true;
        accumulatedThinking += payload.text || "";
        SetConversation((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const current = msgs[msgs.length - 1] as any;
          if (current?.request_id && current.request_id !== requestId)
            return prev;
          msgs[msgs.length - 1] = {
            ...current,
            request_id: requestId,
            streamState: "streaming",
            sentByUser: false,
            text: accumulatedAnswer,
            thinkingText: accumulatedThinking,
          };
          return { ...prev, messages: msgs };
        });
      });

      socket.on("answer_chunk", (payload: any) => {
        if (payload?.request_id && payload.request_id !== requestId) return;
        didReceiveResponse = true;
        accumulatedAnswer += payload.text || "";
        SetConversation((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const current = msgs[msgs.length - 1] as any;
          if (current?.request_id && current.request_id !== requestId)
            return prev;
          msgs[msgs.length - 1] = {
            ...current,
            request_id: requestId,
            streamState: "streaming",
            sentByUser: false,
            text: accumulatedAnswer,
            thinkingText: accumulatedThinking,
          };
          return { ...prev, messages: msgs };
        });
      });

      socket.on("done", async (payload: any) => {
        if (payload?.request_id && payload.request_id !== requestId) return;
        didReceiveResponse = true;
        finalMemories = payload.memories || [];
        const latestMemories = finalMemories.map((memory: string) => {
          const firstSentence = memory.split(".")[0];
          return {
            title:
              firstSentence.slice(0, 40) +
              (firstSentence.length > 40 ? "..." : ""),
            memoryText: memory,
          };
        });

        const finalText = accumulatedAnswer || "";

        SetConversation((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const current = msgs[msgs.length - 1] as any;
          if (current?.request_id && current.request_id !== requestId)
            return prev;
          msgs[msgs.length - 1] = {
            ...current,
            request_id: requestId,
            streamState: "done",
            sentByUser: false,
            text: finalText || current.text || "",
            thinkingText: accumulatedThinking,
            status: "Done",
          };
          return { ...prev, latestMemories, messages: msgs };
        });

        if (conversationId && finalText) {
          const { saveMessage } = await import("@/app/actions");
          await saveMessage(conversationId, finalText, false);
        }
      });

      socket.on("error", (payload: any) => {
        if (payload?.request_id && payload.request_id !== requestId) return;
        didReceiveResponse = true;
        const errText = `Sorry, the model is busy right now. Please try again in a moment. (${payload.message || payload.error})`;
        SetConversation((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          const current = msgs[msgs.length - 1] as any;
          if (current?.request_id && current.request_id !== requestId)
            return prev;
          msgs[msgs.length - 1] = {
            ...current,
            request_id: requestId,
            streamState: "error",
            sentByUser: false,
            text: errText,
          };
          return { ...prev, messages: msgs };
        });
      });

      socket.on("connect_error", (error: any) => {
        console.error("Socket error", error);
        SetConversation((prev) => {
          if (!prev) return prev;
          const msgs = [...prev.messages];
          msgs[msgs.length - 1] = {
            sentByUser: false,
            text: "Connection error occurred.",
          };
          return { ...prev, messages: msgs };
        });
      });

      const emitQuery = () => {
        socket.emit("query_ws", queryPayload);
      };

      // Bind listeners first, then emit to avoid first-message race conditions
      emitQuery();

      // Retry once if the first emit is lost during initial handshake
      setTimeout(() => {
        if (!didReceiveResponse) {
          emitQuery();
        }
      }, 1200);
    } catch (err) {
      console.error("Stream error:", err);
      SetConversation((prev) => {
        if (!prev) return prev;

        const msgs = [...prev.messages];
        msgs[msgs.length - 1] = {
          sentByUser: false,
          text: "Sorry, there was an error generating a response.",
        };
        return { ...prev, messages: msgs };
      });
    }
  }

  useEffect(() => {
    if (conversation == undefined) return;
    if (path === "/" && !conversationId) return;

    const last = conversation.messages.at(-1);
    if (last?.sentByUser) {
      sendBotMessage();
    }

    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [conversation, path, conversationId]);

  // Clean up object URLs
  useEffect(() => {
    return () => {
      filePreviews.forEach((url) => {
        if (url && url.startsWith("blob:")) URL.revokeObjectURL(url);
      });
    };
  }, [filePreviews]);

  return (
    <div className="w-screen h-[100dvh] flex flex-row bg-white relative overflow-hidden">
      <SideBar selected={0}></SideBar>
      <div
        className="absolute top-4 right-6 z-50 animate-fade-in"
        ref={dropDownRef}
      >
        <button
          onClick={() => setDropDown(!dropDown)}
          className="bg-white/60 backdrop-blur-md border border-gray-200 text-gray-700 text-sm rounded-xl hover:bg-gray-50 flex items-center justify-between w-48 px-3 py-2 shadow-sm outline-none cursor-pointer transition-all hover:shadow-md font-medium"
        >
          <div className="flex items-center gap-2 truncate">
            {(() => {
              const SelectedIcon =
                [
                  { id: "max", name: "Max", icon: LuSignalHigh },
                  { id: "high", name: "High", icon: LuSignalMedium },
                  { id: "medium", name: "Medium", icon: LuSignalLow },
                  { id: "low", name: "Low", icon: LuSignalZero },
                ].find((m) => m.id === selectedModel)?.icon || LuSignalZero;
              return <SelectedIcon className="w-4 h-4 text-gray-500" />;
            })()}
            <span className="truncate">
              Model:{" "}
              {selectedModel.charAt(0).toUpperCase() + selectedModel.slice(1)}
            </span>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${dropDown ? "rotate-180" : ""}`}
          />
        </button>

        {dropDown && (
          <div className="absolute top-full mt-2 right-0 w-64 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden flex flex-col">
            {[
              {
                id: "max",
                name: "Max",
                icon: LuSignalHigh,
                description: "Most capable model for complex tasks",
              },
              {
                id: "high",
                name: "High",
                icon: LuSignalMedium,
                description: "Balanced performance and speed",
              },
              {
                id: "medium",
                name: "Medium",
                icon: LuSignalLow,
                description: "Fast model for simple tasks",
              },
              {
                id: "low",
                name: "Low",
                icon: LuSignalZero,
                description: "Basic capabilities, highest speed",
              },
            ].map((model) => (
              <button
                key={model.id}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-100 flex items-center justify-between transition-colors"
                onClick={() => {
                  setSelectedModel(model.id);
                  setDropDown(false);
                  try {
                    localStorage.setItem("selected-model", model.id);
                  } catch {}
                }}
              >
                <div className="flex items-center gap-3">
                  <model.icon className="w-5 h-5 text-gray-500" />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-900">
                      {model.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {model.description}
                    </span>
                  </div>
                </div>
                {selectedModel === model.id && (
                  <Check className="w-4 h-4 text-black flex-shrink-0 ml-2" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        {...getRootProps({ className: "dropzone" })}
        className="grow h-[100dvh] flex flex-col-reverse gap-5 relative overflow-hidden max-w-full"
      >
        {!isDragAccept && conversation != undefined && (
          <div className="flex flex-col gap-3 mx-2 mb-16 items-center">
            {selectedFiles.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar max-w-md">
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
              key="chat-form"
              className="flex w-[90%] md:w-fit flex-col gap-2 liquid-glass rounded-full p-1"
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              role="search"
              aria-label="Send message"
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
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={typewriterText}
                  className="w-full md:w-[40rem] max-w-[85vw] md:max-w-[70vw] bg-transparent outline-none text-[16px] md:text-lg py-1 px-2 placeholder-gray-400"
                  aria-label="Message"
                  autoComplete="off"
                  maxLength={2000}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="w-9 h-9 rounded-full bg-black text-white hover:bg-gray-900 shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                  aria-label="Send message"
                  disabled={
                    isUploading || (!chatInput.trim() && !selectedFiles.length)
                  }
                >
                  {isUploading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </form>
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
                className="text-6xl font-normal text-gray-900 text-center mb-8 select-none animate-fade-in"
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
                key="landing-form"
                className="flex w-[90%] md:w-fit flex-col gap-2 liquid-glass rounded-full p-1"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const trimmed = landingInput.trim();

                  if (!trimmed && !selectedFiles.length) return;
                  if (isUploading) return;

                  try {
                    if (selectedFiles.length) {
                      await uploadFile();
                    }

                    if (trimmed) {
                      setLandingTransitioning(true);

                      const { createConversation, saveMessage } =
                        await import("@/app/actions");
                      const res = await createConversation("New Conversation");

                      if (!res.success || !res.data) {
                        console.error(
                          "Failed to create conversation:",
                          res.error,
                        );
                        setLandingTransitioning(false);
                        alert(
                          "Failed to create conversation. Please try again.",
                        );
                        return;
                      }

                      const newId = res.data.id;
                      const saveRes = await saveMessage(newId, trimmed, true);

                      if (!saveRes.success) {
                        console.error("Failed to save message:", saveRes.error);
                        setLandingTransitioning(false);
                        alert("Failed to save message. Please try again.");
                        return;
                      }

                      const newconversation: Conversation = {
                        name: "New Conversation",
                        date: new Date(),
                        messages: [
                          {
                            sentByUser: true,
                            text: trimmed,
                          },
                        ],
                      };

                      if (path == "/" && newId)
                        router.prefetch("/chat/" + newId);

                      setTimeout(() => {
                        setConversationId(newId);
                        SetConversation(newconversation);
                        setLandingInput("");
                        if (path == "/" && newId) router.push("/chat/" + newId);
                      }, 280);
                    }
                  } catch (error) {
                    console.error("Error in landing form submission:", error);
                    setLandingTransitioning(false);
                    alert("An error occurred. Please try again.");
                  }
                }}
                role="search"
                aria-label="Start a new conversation"
              >
                <div className="flex items-center gap-2 pl-2 pr-1 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 rounded-full flex-shrink-0"
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
                    multiple
                  />
                  <input
                    type="text"
                    ref={landingInputRef}
                    value={landingInput}
                    onChange={(e) => setLandingInput(e.target.value)}
                    placeholder={typewriterText}
                    className="w-full md:w-[40rem] max-w-[85vw] md:max-w-[70vw] bg-transparent outline-none text-[16px] md:text-lg py-1 px-2 placeholder-gray-400"
                    aria-label="Ask a question to start"
                    autoComplete="off"
                    autoFocus
                    maxLength={2000}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="w-9 h-9 rounded-full bg-black text-white hover:bg-gray-900 shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
                    aria-label="Start conversation"
                    disabled={
                      isUploading ||
                      (!landingInput.trim() && !selectedFiles.length)
                    }
                  >
                    {isUploading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <ArrowUp className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </form>
            </div>
          ) : !isDragAccept ? (
            <div className="w-full h-full flex flex-col items-center overflow-y-scroll relative max-h-[80vh] mt-5 gap-9">
              <IdentityPanel profile={profile} />
              <div className="my-5"></div>
              {conversation?.messages
                ?.filter((e) => !e.isMemorySnippet)
                ?.map((e, i) => {
                  const stableKey = e.request_id || `msg-${i}`;
                  if (e.sentByUser) {
                    return (
                      <HumanMessage message={e} key={stableKey}></HumanMessage>
                    );
                  } else {
                    return (
                      <BotMessage
                        message={e}
                        time={40}
                        botName={"remembrance"}
                        key={stableKey}
                        suggestions={
                          conversation?.latestMemories?.slice(0, 5) || []
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
