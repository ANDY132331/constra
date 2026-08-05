"use client";

import { useState, useRef, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "processing";

export interface AudioResult {
  dataUrl: string;   // base64 data URL
  mimeType: string;
  durationSeconds: number;
}

export interface UseAudioRecorderReturn {
  state: RecordingState;
  durationSeconds: number;
  supported: boolean;
  start: () => Promise<void>;
  stop: () => Promise<AudioResult | null>;
  cancel: () => void;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [state, setState] = useState<RecordingState>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);

  const recorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef    = useRef<Blob[]>([]);
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const resolveRef   = useRef<((r: AudioResult | null) => void) | null>(null);

  const supported =
    typeof window !== "undefined" &&
    "mediaDevices" in navigator &&
    typeof MediaRecorder !== "undefined";

  const start = useCallback(async () => {
    if (!supported) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

      // Pick best supported MIME type
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg;codecs=opus",
        "audio/ogg",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop mic
        stream.getTracks().forEach((t) => t.stop());

        const dur = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });

        const reader = new FileReader();
        reader.onload = () => {
          setState("idle");
          setDurationSeconds(0);
          resolveRef.current?.({ dataUrl: reader.result as string, mimeType: blob.type, durationSeconds: dur });
          resolveRef.current = null;
        };
        reader.readAsDataURL(blob);
      };

      recorder.start(100);
      recorderRef.current = recorder;
      startTimeRef.current = Date.now();
      setState("recording");

      timerRef.current = setInterval(() => {
        setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch (err) {
      console.error("[audio-recorder] failed to start:", err);
      setState("idle");
    }
  }, [supported]);

  const stop = useCallback((): Promise<AudioResult | null> => {
    return new Promise((resolve) => {
      if (!recorderRef.current || state !== "recording") {
        resolve(null);
        return;
      }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      resolveRef.current = resolve;
      setState("processing");
      recorderRef.current.stop();
      recorderRef.current = null;
    });
  }, [state]);

  const cancel = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (recorderRef.current) {
      resolveRef.current = null; // discard result
      recorderRef.current.stream?.getTracks().forEach((t) => t.stop());
      try { recorderRef.current.stop(); } catch { /* ignore */ }
      recorderRef.current = null;
    }
    setState("idle");
    setDurationSeconds(0);
  }, []);

  return { state, durationSeconds, supported, start, stop, cancel };
}
