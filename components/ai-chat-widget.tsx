"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  Phone,
  Mail,
  ChevronDown,
} from "lucide-react";

type Message = { role: "user" | "assistant"; content: string };

const WELCOME: Message = {
  role: "assistant",
  content:
    "Hi! I'm the Constra AI assistant. Ask me anything about the app — clock-ins, crew management, projects, billing, or anything else.",
};

const CONTACT_PHONE = "672-338-9890";
const CONTACT_EMAIL = "support@getconstra.com";

const ESCALATION_RE = [
  /contact support/i,
  /call us/i,
  /reach out/i,
  /672.338.9890/,
  /support@getconstra/i,
  /human support/i,
  /speak to a (human|person)/i,
  /talk to (a )?(human|person|agent|someone)/i,
];

function hasEscalation(text: string) {
  return ESCALATION_RE.some((r) => r.test(text));
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: Message = { role: "user", content: text };
    const history: Message[] = [...messages, userMsg];

    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        const snap = accumulated;
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: snap };
          return copy;
        });
      }

      if (hasEscalation(accumulated)) setShowContact(true);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content:
            "Sorry, something went wrong. Please try again or contact support at 672-338-9890.",
        };
        return copy;
      });
      setShowContact(true);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, messages, streaming]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* ── Responsive panel CSS ──
          Mobile  : full-width sheet that sits above the mobile nav bar
          Desktop : 380 px floating card, bottom-right corner          */}
      <style>{`
        .cc-fab {
          position: fixed;
          z-index: 50;
          right: 16px;
          bottom: calc(4.5rem + env(safe-area-inset-bottom));
        }
        @media (min-width: 1024px) {
          .cc-fab { bottom: 24px; }
        }

        .cc-panel {
          position: fixed;
          z-index: 50;
          left: 0;
          right: 0;
          bottom: calc(4rem + env(safe-area-inset-bottom));
          max-height: calc(100dvh - 5rem);
          display: flex;
          flex-direction: column;
          background: #111;
          border: 1px solid rgba(245,158,11,0.18);
          border-bottom: none;
          border-radius: 16px 16px 0 0;
          box-shadow: 0 -8px 48px rgba(0,0,0,0.7);
          overflow: hidden;
        }
        @media (min-width: 1024px) {
          .cc-panel {
            left: auto;
            right: 16px;
            bottom: 88px;
            width: 380px;
            max-height: 560px;
            border-radius: 16px;
            border-bottom: 1px solid rgba(245,158,11,0.18);
            box-shadow: 0 8px 64px rgba(0,0,0,0.8);
          }
        }
      `}</style>

      {/* ── FAB button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open AI support chat"
          className="cc-fab flex items-center justify-center bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-bold rounded-full shadow-xl shadow-amber-500/25 transition-all select-none"
        >
          {/* Desktop pill */}
          <span className="hidden lg:flex items-center gap-2 px-4 py-2.5">
            <Bot size={17} />
            <span className="text-[13px]">AI Support</span>
          </span>
          {/* Mobile circle */}
          <span className="flex lg:hidden items-center justify-center w-[52px] h-[52px]">
            <MessageCircle size={22} />
          </span>
        </button>
      )}

      {/* ── Chat panel ── */}
      {open && (
        <div className="cc-panel">
          {/* Header */}
          <div
            className="flex items-center gap-3 px-4 py-3 flex-shrink-0"
            style={{
              borderBottom: "1px solid rgba(245,158,11,0.10)",
              background: "#0d0d0d",
            }}
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Bot size={16} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white leading-none mb-0.5">
                Constra AI
              </p>
              <p className="text-[11px] text-white/30">Instant answers, always on</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-colors"
              aria-label="Close chat"
            >
              <X size={15} />
            </button>
          </div>

          {/* Messages */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ minHeight: 0 }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[84%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-[1.55] whitespace-pre-wrap break-words ${
                    msg.role === "user"
                      ? "bg-amber-500 text-black font-medium rounded-br-sm"
                      : "text-white/85 rounded-bl-sm"
                  }`}
                  style={
                    msg.role === "assistant"
                      ? { background: "#1c1c1c" }
                      : undefined
                  }
                >
                  {msg.content ? (
                    msg.content
                  ) : (
                    <span className="flex items-center gap-1.5 text-white/40">
                      <Loader2 size={12} className="animate-spin" />
                      Thinking…
                    </span>
                  )}
                </div>
              </div>
            ))}

            {/* Escalation card */}
            {showContact && (
              <div
                className="rounded-xl px-4 py-3 text-[12px] space-y-2"
                style={{
                  background: "#1a1209",
                  border: "1px solid rgba(245,158,11,0.22)",
                }}
              >
                <p className="text-amber-400 font-semibold text-[12px]">
                  Talk to a human
                </p>
                <a
                  href={`tel:+1${CONTACT_PHONE.replace(/-/g, "")}`}
                  className="flex items-center gap-2 text-white/65 hover:text-white transition-colors"
                >
                  <Phone size={12} className="text-amber-500 flex-shrink-0" />
                  {CONTACT_PHONE}
                </a>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-2 text-white/65 hover:text-white transition-colors"
                >
                  <Mail size={12} className="text-amber-500 flex-shrink-0" />
                  {CONTACT_EMAIL}
                </a>
                <p className="text-white/25 text-[11px]">Mon – Fri, 8am – 6pm PT</p>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* "Need a human?" footer — subtle, until escalation card shows */}
          {!showContact && (
            <div
              className="flex items-center justify-center py-1.5 flex-shrink-0"
              style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
            >
              <button
                onClick={() => setShowContact(true)}
                className="flex items-center gap-1 text-[11px] text-white/20 hover:text-white/45 transition-colors py-1"
              >
                <ChevronDown size={10} />
                Need a human?
              </button>
            </div>
          )}

          {/* Input */}
          <div
            className="flex items-end gap-2 px-3 pb-3 pt-2 flex-shrink-0"
            style={{ borderTop: "1px solid rgba(245,158,11,0.07)" }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder="Ask anything about Constra…"
              rows={1}
              disabled={streaming}
              className="flex-1 bg-[#1a1a1a] text-white text-[13px] placeholder-white/25 rounded-xl px-3.5 py-2.5 resize-none outline-none border border-white/[0.07] focus:border-amber-500/35 transition-colors leading-[1.5]"
              style={{ maxHeight: 96, overflowY: "auto" }}
            />
            <button
              onClick={send}
              disabled={!input.trim() || streaming}
              aria-label="Send"
              className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl bg-amber-500 disabled:bg-white/[0.07] disabled:cursor-not-allowed text-black transition-all active:scale-95 hover:bg-amber-400"
            >
              {streaming ? (
                <Loader2 size={15} className="animate-spin text-white/40" />
              ) : (
                <Send size={15} />
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
