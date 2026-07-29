"use client";

import { useState, useEffect } from "react";
import { Bell, X, BellOff } from "lucide-react";
import { getPermission, requestPermission } from "@/lib/notifications";

const DISMISSED_KEY = "constra_notif_prompt_dismissed";

export function NotifPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only show if browser supports it, permission not yet decided, and user hasn't dismissed
    const perm = getPermission();
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (perm === "default" && !dismissed) {
      // Delay 4 s so it doesn't appear the instant the page loads
      const t = setTimeout(() => setShow(true), 4000);
      return () => clearTimeout(t);
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setShow(false);
  };

  const enable = async () => {
    setRequesting(true);
    const result = await requestPermission();
    setRequesting(false);
    if (result === "granted") {
      localStorage.setItem(DISMISSED_KEY, "1");
      setShow(false);
    } else {
      dismiss();
    }
  };

  return (
    <div className="fixed bottom-20 left-4 z-50 max-w-[320px] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-4 shadow-2xl shadow-black/60">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Bell size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-white leading-snug">
              Stay on top of your site
            </p>
            <p className="text-[11px] text-white/40 mt-1 leading-relaxed">
              Get notified when workers clock in, safety incidents occur, and more — even when you're in another tab.
            </p>
          </div>
          <button
            onClick={dismiss}
            className="text-white/25 hover:text-white/50 transition-colors flex-shrink-0 -mt-0.5"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={enable}
            disabled={requesting}
            className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-black text-[12px] font-bold px-3 py-2 rounded-lg transition-colors"
          >
            {requesting ? "Enabling…" : "Enable Notifications"}
          </button>
          <button
            onClick={dismiss}
            className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
            title="Not now"
          >
            <BellOff size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
