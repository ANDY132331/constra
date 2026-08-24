"use client";

import { Mic, Square, X, Loader2, AlertCircle } from "lucide-react";
import { useAudioRecorder } from "@/lib/use-audio-recorder";
import { useSpeech } from "@/lib/use-speech";

interface MicButtonProps {
  /** Voice-message mode: returns a base64 audio data URL + duration */
  onAudio?: (dataUrl: string, durationSeconds: number) => void;
  /** Speech-to-text mode: returns transcribed text (fallback for forms) */
  onResult?: (text: string) => void;
  size?: "sm" | "md";
  className?: string;
  /**
   * "dark"  — controls styled for dark backgrounds (default, dashboards)
   * "light" — controls styled for light backgrounds (messages page)
   */
  variant?: "dark" | "light";
}

/** Audio-recording mic (voice messages) */
function AudioMicButton({
  onAudio, size, className, variant = "dark",
}: Required<Pick<MicButtonProps, "onAudio">> & Pick<MicButtonProps, "size" | "className" | "variant">) {
  const { state, error, durationSeconds, supported, start, stop, cancel } = useAudioRecorder();

  if (!supported) return null;

  const recording  = state === "recording";
  const processing = state === "processing";
  const isError    = state === "error";
  const dim = size === "sm" ? "w-7 h-7" : "w-10 h-10";
  const iconSz = size === "sm" ? 13 : 17;
  const mins = String(Math.floor(durationSeconds / 60)).padStart(2, "0");
  const secs = String(durationSeconds % 60).padStart(2, "0");

  // ── Error state ─────────────────────────────────────────────────────────────
  if (isError) {
    const msg = error === "permission-denied"
      ? "Mic blocked — allow in browser settings"
      : error === "not-supported"
      ? "No microphone found"
      : "Mic failed — try again";

    if (variant === "light") {
      return (
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-red-500 font-semibold bg-red-50 border border-red-200 rounded-lg px-2 py-1 flex items-center gap-1">
            <AlertCircle size={11} />
            {msg}
          </span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-[11px] text-red-400 font-semibold bg-red-500/10 border border-red-500/20 rounded-lg px-2 py-1 flex items-center gap-1">
          <AlertCircle size={11} />
          {msg}
        </span>
      </div>
    );
  }

  // ── Recording / processing state ─────────────────────────────────────────────
  if (recording || processing) {
    if (variant === "light") {
      // Fully visible on white/light backgrounds
      return (
        <div className="flex items-center gap-2 flex-shrink-0">
          {recording && (
            <button
              type="button"
              onClick={cancel}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 border border-gray-300 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Cancel recording"
            >
              <X size={13} />
            </button>
          )}
          <span className="text-[12px] font-mono font-bold text-red-500 min-w-[40px] text-center select-none flex items-center gap-1">
            {recording && <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse flex-shrink-0" />}
            {processing ? "…" : `${mins}:${secs}`}
          </span>
          <button
            type="button"
            disabled={processing}
            onClick={async () => { const r = await stop(); if (r) onAudio(r.dataUrl, r.durationSeconds); }}
            className={`${dim} flex items-center justify-center rounded-full border transition-all relative
              ${processing
                ? "bg-gray-100 border-gray-300 text-gray-400 cursor-wait"
                : "bg-red-500 border-red-500 text-white hover:bg-red-600 shadow-md"}`}
            title="Stop and send"
          >
            {processing
              ? <Loader2 size={iconSz} className="animate-spin" />
              : <Square size={iconSz - 2} className="fill-white text-white" />}
            {recording && <span className="absolute inset-0 rounded-full border border-red-400 animate-ping pointer-events-none" />}
          </button>
        </div>
      );
    }

    // Dark variant (original)
    return (
      <div className={`flex items-center gap-2 flex-shrink-0 ${className ?? ""}`}>
        {recording && (
          <button type="button" onClick={cancel}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/40 hover:text-red-400 transition-colors"
            title="Cancel recording">
            <X size={13} />
          </button>
        )}
        <span className="text-[12px] font-mono font-bold text-red-400 min-w-[40px] text-center select-none flex items-center gap-1">
          {recording && <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse flex-shrink-0" />}
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

  // ── Idle state ────────────────────────────────────────────────────────────────
  if (variant === "light") {
    return (
      <button
        type="button"
        onClick={start}
        title="Record voice message"
        className={`${dim} flex items-center justify-center flex-shrink-0 rounded-full border-0
          bg-blue-500 text-white hover:bg-blue-600 active:scale-95
          transition-all shadow-md shadow-blue-500/30 ${className ?? ""}`}
      >
        <Mic size={iconSz} />
      </button>
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
function SpeechMicButton({
  onResult, size, className, variant = "dark",
}: Required<Pick<MicButtonProps, "onResult">> & Pick<MicButtonProps, "size" | "className" | "variant">) {
  const { state, supported, start, stop, interim } = useSpeech();
  if (!supported) return null;

  const listening = state === "listening";
  const dim = size === "sm" ? "w-7 h-7" : "w-8 h-8";
  const iconSz = size === "sm" ? 13 : 15;

  if (variant === "light") {
    return (
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => (listening ? stop() : start(onResult))}
          title={listening ? "Stop recording" : "Speak to type"}
          className={`${dim} flex items-center justify-center rounded-full border transition-all ${
            listening
              ? "bg-red-500 border-red-500 text-white hover:bg-red-600"
              : "bg-blue-500 border-blue-500 text-white hover:bg-blue-600"
          } ${className ?? ""}`}
        >
          {listening ? (
            <>
              <Square size={iconSz - 2} className="fill-white text-white" />
              <span className="absolute inset-0 rounded-full border border-red-400 animate-ping" />
            </>
          ) : (
            <Mic size={iconSz} />
          )}
        </button>
        {listening && interim && (
          <div className="absolute top-full right-0 mt-1.5 z-50 bg-white border border-gray-200 rounded-lg px-3 py-2 text-[11px] text-gray-500 italic whitespace-nowrap max-w-[260px] overflow-hidden text-ellipsis shadow-lg">
            {interim}…
          </div>
        )}
      </div>
    );
  }

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
export function MicButton({ onAudio, onResult, size = "md", className, variant = "dark" }: MicButtonProps) {
  if (onAudio) return <AudioMicButton onAudio={onAudio} size={size} className={className} variant={variant} />;
  if (onResult) return <SpeechMicButton onResult={onResult} size={size} className={className} variant={variant} />;
  return null;
}
