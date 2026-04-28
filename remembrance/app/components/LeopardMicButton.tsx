"use client";

import { useEffect, useRef, useState } from "react";
import { useLeopard } from "@picovoice/leopard-react";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface Props {
  onTranscript: (text: string) => void;
  size?: "sm" | "md";
}

export function LeopardMicButton({ onTranscript, size = "sm" }: Props) {
  const accessKey = process.env.NEXT_PUBLIC_PICOVOICE_ACCESS_KEY ?? "";
  const { result, isLoaded, isRecording, error, init, startRecording, stopRecording } = useLeopard();
  const [initializing, setInitializing] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (result?.transcript) {
      onTranscript(result.transcript);
    }
  }, [result]);

  const ensureInit = async () => {
    if (initialized.current || isLoaded) return;
    if (!accessKey) {
      console.warn("[Leopard] NEXT_PUBLIC_PICOVOICE_ACCESS_KEY is not set");
      return;
    }
    setInitializing(true);
    try {
      await init(accessKey, { publicPath: "/leopard_params.pv" }, { enableAutomaticPunctuation: true });
      initialized.current = true;
    } catch (e) {
      console.error("[Leopard] init failed:", e);
    } finally {
      setInitializing(false);
    }
  };

  const handleClick = async () => {
    if (initializing) return;
    if (isRecording) {
      await stopRecording();
      return;
    }
    await ensureInit();
    if (isLoaded || initialized.current) {
      await startRecording();
    }
  };

  const btnSize = size === "sm" ? "w-7 h-7" : "w-9 h-9";
  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!!error}
      title={error ? `Mic unavailable: ${error.message}` : isRecording ? "Stop recording" : "Speak"}
      aria-label={isRecording ? "Stop recording" : "Start voice input"}
      className={`${btnSize} rounded-full flex items-center justify-center flex-shrink-0 transition-all
        ${isRecording
          ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
          : error
          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
          : "hover:bg-gray-100 text-gray-400 hover:text-gray-700"
        }`}
    >
      {initializing ? (
        <Loader2 className={`${iconSize} animate-spin`} />
      ) : isRecording ? (
        <MicOff className={iconSize} />
      ) : (
        <Mic className={iconSize} />
      )}
    </button>
  );
}
