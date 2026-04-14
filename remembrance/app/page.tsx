"use client";
import SideBar from "@/app/components/sidebar";
import type React from "react";

import { useContext, useEffect, useRef, useState } from "react";
import type { Conversation } from "@/app/lib/types";
import CircleButton from "@/app/components/circlebutton";
import { HumanMessage } from "./components/messages/humanmessage";
import { BotMessage } from "./components/messages/botmessage";
import axios from "axios";
import { UserContext } from "./components/usercontext";
import { useParams, usePathname } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { getConversationById, saveConversation } from "@/backend/lib/db";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/novel/ui/button";
import { Paperclip, ArrowUp, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { text } from "stream/consumers";

export default function Home() {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const frameLength = 512;
  const path = usePathname();

  const [dropDown, setDropDown] = useState(false);
  const dropDownRef = useRef<HTMLDivElement | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

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

  const handleRecordAudio = async () => {
    if (!isRecording) {
      // start the recording
      if (!("webkitSpeechRecognition" in window)) {
        alert("Your browser does not support speech recognition.");
        return;
      }

      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (textInput.current) {
          textInput.current.value = transcript;
        }
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognition.onerror = (error: any) => {
        console.error("Error occurred in recognition: ", error);
        setIsRecording(false);
        alert("Error occurred while recording audio. Please try again.");
      };
      recognitionRef.current = recognition;
      setIsRecording(true);
      setTimeout(async () => {
        await recognition.start();
      }, 4000);
    } else {
      await recognitionRef.current?.stop();
      setIsRecording(false);
    }
  };

  const handleSendMessage = async () => {
    const messageText = textInput.current.value.trim();

    if (!messageText && !selectedFile) return;

    if (selectedFile) {
      await uploadFile();
    }

    if (messageText) {
      sendHumanMessage(messageText);
      textInput.current.value = "";
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
          <div className="flex flex-col gap-4 mx-2 mb-4 items-center">
            <div className="border-1 border-opacity-10 border-[#A3A3A3] w-[80%] rounded-xl bg-white flex flex-col">
              {/* File preview section */}
              {filePreview && (
                <div className="relative p-2 border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={filePreview}
                        alt="Preview"
                        className="h-12 w-12 object-cover rounded"
                      />
                      <span className="text-sm text-gray-600">
                        {selectedFile?.name}
                      </span>
                    </div>
                    <button
                      onClick={removeSelectedFile}
                      className="p-1 rounded-full hover:bg-gray-100"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              )}

              <div className="w-full">
                <textarea
                  className="w-full outline-none resize-none pt-5 px-2"
                  placeholder="Turn your complex thoughts into graphs..."
                  ref={textInput}
                  onKeyUp={(e) => {
                    if (e.key == "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                ></textarea>
              </div>

              <div className="w-full flex flex-row justify-between items-end">
                <div className="flex-row m-3 justify-center flex gap-1">
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
                <div className="flex items-center">
                  <button
                    className={`p-2 rounded-full bg-black m-1 ${isRecording ? "bg-red-600" : "bg-black"}`}
                    onClick={handleRecordAudio}
                    aria-label={
                      isRecording ? "Stop recording" : "Start recording"
                    }
                  >
                    <img src="/microphone.svg" className="w-5" alt="Send" />
                  </button>
                  <button
                    className="p-2 rounded-full bg-black m-3 disabled:opacity-50"
                    onClick={handleSendMessage}
                    disabled={
                      isUploading ||
                      (!textInput.current?.value.trim() && !selectedFile)
                    }
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <img src="/arrow-up.svg" className="w-5" alt="Send" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div className="text-center text-sm text-gray-500 mb-4">
              Remembrance can make mistakes. Check important info.
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
                className="text-4xl font-extrabold bg-gradient-to-br from-black via-gray-800 to-gray-600 bg-clip-text text-transparent drop-shadow-lg text-center mb-2 select-none animate-fade-in"
                style={{ animationFillMode: "both" }}
              >
                Remembrance
              </h1>
              <p
                className="text-base text-gray-500 font-medium mb-8 text-center max-w-xl select-none animate-fade-in"
                style={{ animationDelay: "0.25s", animationFillMode: "both" }}
              >
                Relive, preserve, and cherish your most important memories.
                Start by asking anything or sharing a thought below.
              </p>
              <form
                className="flex w-full max-w-xl gap-2 items-center bg-white/80 border border-[#afaead] shadow-lg rounded-full px-6 py-3 transition-all duration-200 focus-within:shadow-2xl focus-within:scale-[1.025] backdrop-blur-md"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const firstMessage =
                    (
                      document.getElementById(
                        "FirstMessage",
                      ) as HTMLInputElement
                    )?.value || "";

                  if (!firstMessage.trim() && !selectedFile) return;

                  if (selectedFile) {
                    await uploadFile();
                  }

                  if (firstMessage.trim()) {
                    const newconversation: Conversation = {
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
                    console.clear();
                    if (path == "/" && newId) {
                      router.prefetch("/chat/" + newId);
                      router.push("/chat/" + newId);
                    }

                    (
                      document.getElementById(
                        "FirstMessage",
                      ) as HTMLInputElement
                    ).value = "";
                  }
                }}
                role="search"
                aria-label="Start a new conversation"
              >
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                  aria-label="Attach file"
                  onClick={handleFileUploadClick}
                >
                  <Paperclip className="w-5 h-5" />
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
                  id="FirstMessage"
                  placeholder="Relive anything by asking"
                  className="flex-1 bg-transparent outline-none text-lg px-2 placeholder-gray-400"
                  aria-label="Ask a question to start"
                  autoComplete="off"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full bg-black text-white hover:bg-gray-900 shadow-md"
                  aria-label="Start conversation"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <ArrowUp className="w-5 h-5" />
                  )}
                </Button>
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
