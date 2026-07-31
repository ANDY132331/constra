"use client";

import { Mic, Square } from "lucide-react";
import { useSpeech } from "@/lib/use-speech";

interface MicButtonProps {
  onResult: (text: string) => void;
  size?: "sm" | "md";
  className?: string;
}

export function MicButton({ onResult, size = "md", className = "" }: MicButtonProps) {
  const { state, supported, start, stop, interim } = useSpeech();
  if (!supported) return null;

  const listening = state === "listening";
  const px = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const icon = size === "sm" ? 13 : 15;

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => (listening ? stop() : start(onResult))}
        title={listening ? "Stop recording" : "Speak to type"}
        className={`${px} flex items-center justify-center rounded-lg border transition-all ${
          listening
            ? "bg-red-500/15 border-red-500/35 text-red-400 hover:bg-red-500/25"
            : "bg-white/[0.05] border-white/[0.08] text-white/35 hover:text-white/65 hover:bg-white/[0.08]"
        }`}
      >
        {listening ? (
          <>
            <Square size={icon} className="fill-red-400 text-red-400" />
            <span className="absolute inset-0 rounded-lg border border-red-400/40 animate-ping" />
          </>
        ) : (
          <Mic size={icon} />
        )}
      </button>

      {listening && interim && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-[#1c1c1c] border border-white/10 rounded-lg px-3 py-2 text-[11px] text-white/50 italic whitespace-nowrap max-w-[260px] overflow-hidden text-ellipsis shadow-xl">
          {interim}…
        </div>
      )}
    </div>
  );
}
