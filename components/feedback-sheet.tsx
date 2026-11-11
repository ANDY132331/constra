"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { toast } from "sonner";
import { Lightbulb, Bug, MessageCircle, Loader2, Send, X } from "lucide-react";

const KINDS = [
  { id: "idea", label: "Idea", icon: Lightbulb, hint: "What would make Constra better for your crew?" },
  { id: "problem", label: "Problem", icon: Bug, hint: "What happened, and what did you expect instead?" },
  { id: "other", label: "Other", icon: MessageCircle, hint: "Anything else on your mind." },
] as const;

/**
 * "Tell us what's missing". Opens as a sheet, sends straight to the Constra team with who sent
 * it and which screen they were on, so a reply comes back to them by email.
 */
export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const [kind, setKind] = useState<(typeof KINDS)[number]["id"]>("idea");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const current = KINDS.find((k) => k.id === kind)!;

  const send = async () => {
    if (sending || message.trim().length < 3) return;
    setSending(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message, page: pathname }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "It didn't send");
      toast.success("Sent. Thank you!", { description: "We read every one, and reply by email." });
      onClose();
    } catch (e) {
      toast.error(navigator.onLine ? (e instanceof Error ? e.message : "It didn't send") : "Sending needs signal. Your note is still here; try again when you're back online.");
    } finally {
      setSending(false);
    }
  };

  // Rendered into <body>: the phone menu slides in with a transform, which would otherwise trap
  // this fixed panel inside the menu instead of covering the screen
  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="sheet relative w-full sm:max-w-md bg-[#141414] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-[17px] font-bold text-white">Tell us what&apos;s missing</h3>
            <p className="text-[13px] text-white/60 mt-0.5">It goes straight to the people who build Constra.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-white/50 hover:text-white">
            <X size={18} />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Kind of feedback">
          {KINDS.map((k) => (
            <button key={k.id} type="button" role="radio" aria-checked={kind === k.id} onClick={() => setKind(k.id)}
              className={`flex flex-col items-center gap-1.5 min-h-[64px] rounded-xl border text-[13px] font-semibold transition-colors ${kind === k.id ? "border-amber-500/60 bg-amber-500/10 text-amber-300" : "border-white/[0.08] text-white/70 hover:bg-white/[0.04]"}`}>
              <k.icon size={18} /> {k.label}
            </button>
          ))}
        </div>
        <textarea
          id="feedback-message"
          aria-label="Your feedback"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={current.hint}
          maxLength={4000}
          rows={5}
          className="w-full bg-[#1a1a1a] border border-white/[0.1] rounded-xl p-3.5 text-[15px] text-white placeholder:text-white/35 resize-none"
        />
        <button type="button" onClick={send} disabled={sending || message.trim().length < 3}
          className="w-full inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[15px] font-bold disabled:opacity-40">
          {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Send
        </button>
      </div>
    </div>,
    document.body,
  );
}
