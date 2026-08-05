"use client";

import { Mic, Square, X, Loader2 } from "lucide-react";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { useSpeech } from "@/lib/use-speech";

interface MicButtonProps {
  /** Voice-message mode: returns a base64 audio data URL + duration */
  onAudio?: (dataUrl: string, durationSeconds: number) => void;
  /** Speech-to-text mode: returns transcribed text (fallback for forms) */
  onResult?: (text: string) => void;
  size?: "sm" | "md";
  className?: string;
}

/** Audio-recording mic (voice messages) */
function AudioMicButton({ onAudio, size, className }: Required<Pick<MicButtonProps, "onAudio">> & Pick<MicButtonProps, "size" | "className">) {
  const { state, durationSeconds, supported, start, stop, cancel } = useAudioRecorder();

  if (!supported) return null;

  const recording  = state === "recording";
  const processing = state === "processing";
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconSz = size === "sm" ? 13 : 15;
  const mins = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
  const secs = String(durationSeconds % 60).padStart(2, "0");

  if (recording || processing) {
    return (
      <div className={`flex items-center gap-2 flex-shrink-0 ${className ?? ""}`}>
        {recording && (
          <button type="button" onClick={cancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-red-400 transition-colors"
            title="Cancel recording">
            <X size={13} />
          </button>
        )}
        <span className="text-[12px] font-mono font-bold text-red-400 min-w-[40px] text-center select-none">
          {processing ? "…" : `${mins}:${secs}`}
        </span>
        <button type="button" disabled={processing}
          onClick={async () => { const r = await stop(); if (r) onAudio(r.dataUrl, r.durationSeconds); }}
          className={`${dim} flex items-center justify-center rounded-lg border transition-all relative
            ${processing ? "bg-white/[0.05] border-white/[0.08] text-white/30 cursor-wait"
              : "bg-red-500/15 border-red-500/35 text-red-400 hover:bg-red-500/25"}`}
          title="Stop and send">
          {processing ? <Loader2 size={iconSz} className="animate-spin" /> : <Square size={iconSz} className="fill-red-400 text-red-400" />}
          {recording && <span className="absolute inset-0 rounded-lg border border-red-400/40 animate-ping pointer-events-none" />}
        </button>
      </div>
    );
  }

  return (
    <button type="button" onClick={start} title="Record voice message"
      className={`${dim} flex items-center justify-center flex-shrink-0 rounded-lg border
        bg-white/[0.05] border-white/[0.08] text-white/35 hover:text-white/65 hover:bg-white/[0.08]
        transition-all ${className ?? ""}`}>
      <Mic size={iconSz} />
    </button>
  );
}

/** Speech-to-text mic (for text fields) */
function SpeechMicButton({ onResult, size, className }: Required<Pick<MicButtonProps, "onResult">> & Pick<MicButtonProps, "size" | "className">) {
  const { state, supported, start, stop, interim } = useSpeech();
  if (!supported) return null;

  const listening = state === "listening";
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconSz = size === "sm" ? 13 : 15;

  return (
    <div className={`relative flex-shrink-0 ${className ?? ""}`}>
      <button type="button"
        onClick={() => (listening ? stop() : start(onResult))}
        title={listening ? "Stop recording" : "Speak to type"}
        className={`${dim} flex items-center justify-center rounded-lg border transition-all ${
          listening
            ? "bg-red-500/15 border-red-500/35 text-red-400 hover:bg-red-500/25"
            : "bg-white/[0.05] border-white/[0.08] text-white/35 hover:text-white/65 hover:bg-white/[0.08]"
        }`}>
        {listening ? (
          <>
            <Square size={iconSz} className="fill-red-400 text-red-400" />
            <span className="absolute inset-0 rounded-lg border border-red-400/40 animate-ping" />
          </>
        ) : (
          <Mic size={iconSz} />
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

/** Unified MicButton — auto-selects audio-recording vs speech-to-text mode */
export function MicButton({ onAudio, onResult, size = "md", className }: MicButtonProps) {
  if (onAudio) return <AudioMicButton onAudio={onAudio} size={size} className={className} />;
  if (onResult) return <SpeechMicButton onResult={onResult} size={size} className={className} />;
  return null;
}
