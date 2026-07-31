"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type SpeechState = "idle" | "listening";

interface UseSpeechReturn {
  state: SpeechState;
  supported: boolean;
  start: (onResult: (text: string) => void) => void;
  stop: () => void;
  interim: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognition = any;

export function useSpeech(): UseSpeechReturn {
  const [state, setState] = useState<SpeechState>("idle");
  const [interim, setInterim] = useState("");
  const recRef = useRef<AnySpeechRecognition>(null);
  const cbRef = useRef<((text: string) => void) | null>(null);

  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setState("idle");
    setInterim("");
  }, []);

  const start = useCallback(
    (onResult: (text: string) => void) => {
      if (!supported) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
      if (!SR) return;
      cbRef.current = onResult;
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";
      rec.onstart = () => setState("listening");
      rec.onend = () => { setState("idle"); setInterim(""); };
      rec.onerror = () => { setState("idle"); setInterim(""); };
      rec.onresult = (e: AnySpeechRecognition) => {
        let final = "";
        let inter = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) final += e.results[i][0].transcript;
          else inter += e.results[i][0].transcript;
        }
        setInterim(inter);
        if (final) cbRef.current?.(final);
      };
      recRef.current = rec;
      rec.start();
    },
    [supported],
  );

  useEffect(() => () => { recRef.current?.stop(); }, []);

  return { state, supported, start, stop, interim };
}
