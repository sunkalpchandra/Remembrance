"use client";
import SideBar from "@/app/components/sidebar";
import { io } from "socket.io-client";
import type React from "react";
import { useContext, useEffect, useRef, useState } from "react";
import type { Conversation } from "@/app/lib/types";
import { HumanMessage } from "@/app/components/messages/humanmessage";
import { BotMessage } from "@/app/components/messages/botmessage";
import { UserContext } from "@/app/components/usercontext";
import { useParams, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import {
  getConversationById,
  createConversation,
  saveMessage,
  renameConversation,
} from "@/app/actions";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/novel/ui/button";
import { Plus, ArrowUp, X, ChevronDown, Check } from "lucide-react";
import { LeopardMicButton } from "@/app/components/LeopardMicButton";
import { useAuth } from "@clerk/nextjs";
import {
  LuSignalHigh,
  LuSignalLow,
  LuSignalMedium,
  LuSignalZero,
} from "react-icons/lu";
import { useTypewriter } from "@/app/hooks/useTypewriter";
import { useProfile } from "@/app/hooks/useProfile";
import { IdentityPanel } from "@/app/components/identity-panel";
import { ProactivePrompts } from "@/app/components/proactive-prompts";
import { useDropzone } from "react-dropzone";

interface FileData {
  name: string,
  type: string,
  size: number,
  data: string
}

const conversationCache: Record<string, Conversation> = {};

function readConvCache(id: string): Conversation | undefined {
  if (conversationCache[id]) return conversationCache[id];
  try {
    const raw = localStorage.getItem(`conv:${id}`);
    if (raw) { const c = JSON.parse(raw); conversationCache[id] = c; return c; }
  } catch {}
  return undefined;
}

function writeConvCache(id: string, conv: Conversation) {
  conversationCache[id] = conv;
  try { localStorage.setItem(`conv:${id}`, JSON.stringify(conv)); } catch {}
}

export default function Home() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
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
  const initialId = (params?.chatId as string[])?.at(-1) || undefined;
  const [conversation, SetConversation] = useState<Conversation | undefined>(
    initialId ? readConvCache(initialId) : undefined,
  );
  const [ConversationId, setConversationId] = useState<string | undefined>(
    initialId,
  );
  const conversationId = ConversationId;
  const currentConversationId = useRef<string | undefined>(ConversationId);
  const textInput = useRef(null as any as HTMLTextAreaElement);
  const isGeneratingRef = useRef(false);

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
    const newId = (params?.chatId as string[])?.at(-1) || undefined;
    setConversationId(newId);
    if (!newId && path === "/") {
      SetConversation(undefined);
    } else if (newId !== ConversationId) {
      SetConversation(newId ? readConvCache(newId) : undefined);
    }
  }, [params?.chatId, path, ConversationId]);

  useEffect(() => {
    currentConversationId.current = ConversationId;
    if (ConversationId && user) {
      getConversationById(ConversationId)
        .then((res) => {
          if (currentConversationId.current !== ConversationId) return;
          if (res.success && res.data) {
            SetConversation((prev) => {
              const fetched = res.data as unknown as Conversation;
              if (
                prev &&
                prev.messages &&
                fetched.messages &&
                prev.messages.length >= fetched.messages.length
              ) {
                return prev;
              }
              writeConvCache(ConversationId, fetched);
              return fetched;
            });
          } else if (!res.success) {
            console.error("Failed to load conversation:", res.error);
          }
        })
        .catch((err) => {
          console.error("Error loading conversation:", err);
        });
    }
  }, [ConversationId, user]);

  useEffect(() => {
    if (ConversationId && conversation) {
      conversationCache[ConversationId] = conversation;
    }
  }, [conversation, ConversationId]);

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

  // Transport selection: a configured NEXT_PUBLIC_BACKEND_URL means the
  // realtime socket backend; otherwise chat streams through /api/chat SSE,
  // which needs no separate backend process (e.g. on Vercel).
  const socketBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  // Initialize socket connection on mount so the first message doesn't pay
  // the connection handshake cost.
  useEffect(() => {
    if (!socketBackendUrl) return;
    const initSocket = async () => {
      try {
        const clerkToken = await getToken();
        if (!clerkToken) return;

        const backendUrl = socketBackendUrl;

        if (!(window as any).chatSocket) {
          const socket = io(backendUrl, {
            transports: ["websocket"],
            auth: { token: clerkToken },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
          });
          (window as any).chatSocket = socket;
        } else if (!(window as any).chatSocket.connected) {
          (window as any).chatSocket.auth = { token: clerkToken };
          (window as any).chatSocket.connect();
        }
      } catch (err) {
        console.error("[Socket] Failed to initialize on mount:", err);
      }
    };

    initSocket();
  }, [getToken]);

  async function sendHumanMessage(msg: string) {
    let newconversation = conversation;
    let convoId = conversationId;

    if (newconversation == undefined || !convoId) {
      convoId = uuidv4();
      setConversationId(convoId);
      newconversation = {
        name: "New Conversation",
        date: new Date(),
        messages: [],
      };

      // Fire-and-forget background creation
      createConversation("New Conversation", convoId).then(() => {
        window.dispatchEvent(new CustomEvent("conversation-created", { detail: { id: convoId, name: "New Conversation" } }));
      }).catch(console.error);
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
        conversationCache[convoId] = { ...newconversation };
      }

      if (convoId) {
        saveMessage(convoId, msg, true).catch(console.error);
      }
    }
    return convoId;
  }

  const convertFilesToBase64 = async (
    files: File[],
  ): Promise<Array<{ name: string; type: string; size: number; data: string }>> => {
    const fileData = [];
    for (const file of files) {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data (remove the data:mime/type;base64, prefix)
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      fileData.push({
        name: file.name,
        type: file.type,
        size: file.size,
        data,
      });
    }
    return fileData;
  };

  const handleSendMessage = async (customMessageText?: string) => {
    const messageText = (
      customMessageText !== undefined ? customMessageText : chatInput
    ).trim();

    if (!messageText && !selectedFiles.length) return;
    if (isUploading) return;

    setIsUploading(true);
    try {
      const newConvoId = await sendHumanMessage(messageText);
      setChatInput("");
      if (path === "/" && newConvoId) {
        router.push("/chat/" + newConvoId);
      }
    } finally {
      clearSelectedFiles();
      setIsUploading(false);
    }
  };

  async function sendBotMessage() {
    if (!conversation) return;

    const lastUserMsg = conversation.messages.at(-1)?.text;
    if (!lastUserMsg) return;

    if (isGeneratingRef.current) return;
    isGeneratingRef.current = true;

    // Add empty placeholder message that we'll stream into
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const currentSocket = (window as any).chatSocket;
    const placeholder = {
      sentByUser: false,
      text: " ",
      status:
        !socketBackendUrl || currentSocket?.connected
          ? undefined
          : "Connecting...",
      request_id: requestId,
      streamState: "streaming" as const,
      thinkingText: "",
    };
    SetConversation((prev) => {
      const next = prev
        ? { ...prev, messages: [...prev.messages, placeholder] }
        : prev;
      if (conversationId && next) conversationCache[conversationId] = next;
      return next;
    });

    // ── Shared stream handlers (used by both transports) ──────────────────
    let accumulatedThinking = "";
    let accumulatedAnswer = "";

    const patchLast = (
      patch: Partial<Conversation["messages"][number]>,
      extra?: Partial<Conversation>,
    ) => {
      SetConversation((prev) => {
        if (!prev) return prev;
        const msgs = [...prev.messages];
        const current = msgs[msgs.length - 1] as any;
        if (current?.request_id && current.request_id !== requestId)
          return prev;
        msgs[msgs.length - 1] = {
          ...current,
          request_id: requestId,
          sentByUser: false,
          ...patch,
        };
        return { ...prev, ...(extra || {}), messages: msgs };
      });
    };

    const applyThinking = (text: string) => {
      accumulatedThinking += text;
      patchLast({
        streamState: "streaming",
        text: accumulatedAnswer,
        thinkingText: accumulatedThinking,
      });
    };

    const applyAnswer = (text: string) => {
      accumulatedAnswer += text;
      patchLast({
        streamState: "streaming",
        text: accumulatedAnswer,
        thinkingText: accumulatedThinking,
      });
    };

    const applyDone = async () => {
      const finalText = accumulatedAnswer || "";
      patchLast({
        streamState: "done",
        // Keep whatever the placeholder holds when the stream produced no text
        ...(finalText ? { text: finalText } : {}),
        thinkingText: accumulatedThinking,
        status: "Done",
      });
      isGeneratingRef.current = false;
      if (conversationId && finalText) {
        await saveMessage(conversationId, finalText, false);
      }
    };

    const applyTitle = (newTitle?: string) => {
      if (!newTitle || !conversationId) return;
      renameConversation(conversationId, newTitle).catch(() => {});
      SetConversation((prev) => {
        if (!prev) return prev;
        const updated = { ...prev, name: newTitle };
        writeConvCache(conversationId, updated);
        return updated;
      });
      window.dispatchEvent(
        new CustomEvent("conversation-renamed", {
          detail: { id: conversationId, name: newTitle },
        }),
      );
    };

    const applyError = (detail?: string) => {
      patchLast({
        streamState: "error",
        text: `Sorry, the model is busy right now. Please try again in a moment.${detail ? ` (${detail})` : ""}`,
      });
      isGeneratingRef.current = false;
    };

    // ── Transport: serverless SSE via /api/chat ───────────────────────────
    const streamViaApi = async (queryPayload: any) => {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryPayload),
      });
      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({}) as any);
        throw new Error(err?.error || `Chat request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let sawDone = false;

      const handleEvent = async (event: string, payload: any) => {
        if (payload?.request_id && payload.request_id !== requestId) return;
        switch (event) {
          case "thinking_chunk":
            applyThinking(payload.text || "");
            break;
          case "answer_chunk":
            applyAnswer(payload.text || "");
            break;
          case "done":
            sawDone = true;
            await applyDone();
            break;
          case "title":
            applyTitle(payload.title);
            break;
          case "error":
            sawDone = true;
            applyError(payload.message || payload.error);
            break;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const rawEvent = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          let event = "message";
          let dataStr = "";
          for (const line of rawEvent.split("\n")) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            else if (line.startsWith("data: ")) dataStr += line.slice(6);
          }
          if (!dataStr) continue;
          let payload: any;
          try {
            payload = JSON.parse(dataStr);
          } catch {
            continue;
          }
          await handleEvent(event, payload);
        }
      }

      // Stream closed without a terminal event — finalize what we have
      if (!sawDone) {
        if (accumulatedAnswer) await applyDone();
        else applyError("connection closed early");
      }
    };

    // ── Transport: realtime socket backend ────────────────────────────────
    const streamViaSocket = async (queryPayload: any, backendUrl: string) => {
      let socket = (window as any).chatSocket;

      if (!socket || !socket.connected) {
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

        if (!socket) {
          socket = io(backendUrl, {
            transports: ["websocket"],
            auth: { token: clerkToken },
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
          });
          (window as any).chatSocket = socket;
        } else {
          socket.auth = { token: clerkToken };
          socket.connect();
        }
      }

      // Wait for socket to be ready
      if (!socket.connected) {
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Socket connection timeout"));
          }, 5000);

          socket.once("connect", () => {
            clearTimeout(timeout);
            resolve();
          });

          socket.once("connect_error", (err: any) => {
            clearTimeout(timeout);
            reject(err);
          });
        });
      }

      // Clean up previous listeners
      socket.off("connect");
      socket.off("status");
      socket.off("thinking_chunk");
      socket.off("answer_chunk");
      socket.off("done");
      socket.off("title");
      socket.off("error");
      socket.off("connect_error");

      let didReceiveResponse = false;

      const guard =
        (fn: (payload: any) => void) =>
        (payload: any) => {
          if (payload?.request_id && payload.request_id !== requestId) return;
          didReceiveResponse = true;
          fn(payload);
        };

      socket.on("status", guard(() => {}));
      socket.on(
        "thinking_chunk",
        guard((p: any) => applyThinking(p.text || "")),
      );
      socket.on(
        "answer_chunk",
        guard((p: any) => applyAnswer(p.text || "")),
      );
      socket.on(
        "done",
        guard(() => {
          applyDone();
        }),
      );
      socket.on("title", (payload: any) => {
        if (payload?.request_id && payload.request_id !== requestId) return;
        applyTitle(payload?.title);
      });
      socket.on(
        "error",
        guard((p: any) => applyError(p.message || p.error)),
      );
      socket.on("connect_error", (error: any) => {
        console.error("Socket error", error);
        applyError("connection error");
      });

      const emitQuery = () => {
        socket.emit("query_ws", queryPayload);
      };

      emitQuery();

      // Retry once if the first emit is lost during initial handshake
      setTimeout(() => {
        if (!didReceiveResponse) {
          emitQuery();
        }
      }, 1200);
    };

    try {
      // Convert selected files to base64 for transmission
      let filesData: FileData[] = [];
      if (selectedFiles.length) {
        filesData = await convertFilesToBase64(selectedFiles);
      }

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
        files: filesData,
      };

      if (socketBackendUrl) {
        await streamViaSocket(queryPayload, socketBackendUrl);
      } else {
        await streamViaApi(queryPayload);
      }
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
      isGeneratingRef.current = false;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      <SideBar></SideBar>
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
                <LeopardMicButton
                  onTranscript={(t) => setChatInput((prev) => prev ? prev + " " + t : t)}
                  size="sm"
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
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!landingInput.trim() && !selectedFiles.length) return;
                  if (isUploading) return;

                  setLandingTransitioning(true);
                  handleSendMessage(landingInput).catch((error) => {
                    console.error("Error in landing form submission:", error);
                    setLandingTransitioning(false);
                    alert("An error occurred. Please try again.");
                  });
                  setLandingInput("");
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
                  <LeopardMicButton
                    onTranscript={(t) => setLandingInput((prev) => prev ? prev + " " + t : t)}
                    size="md"
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
              <ProactivePrompts
                onSelect={(p) => {
                  if (isUploading) return;
                  setLandingTransitioning(true);
                  handleSendMessage(p).catch((error) => {
                    console.error("Error sending prompt:", error);
                    setLandingTransitioning(false);
                  });
                }}
              />
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
