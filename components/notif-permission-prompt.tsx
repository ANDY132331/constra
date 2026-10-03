"use client";

import { useState, useEffect } from "react";
import { Bell, X, BellOff } from "lucide-react";
import { getPermission, requestPermission } from "@/lib/notifications";
import { useStore } from "@/lib/store";

const DISMISSED_KEY = "constra_notif_prompt_dismissed";
const VISITS_KEY = "constra_visits";
const INSTALL_DISMISSED_KEY = "constra_ctab_v1";

export function NotifPermissionPrompt() {
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const { projects, workers } = useStore();
  // Asking before there is anything to be notified about just gets declined, and a declined
  // permission can't be asked for again — so wait until the workspace is actually set up.
  const inUse = projects.length > 0 && workers.length > 1;

  useEffect(() => {
    if (typeof window === "undefined" || !inUse) return;
    if (getPermission() !== "default") return;
    let visits = 0;
    try {
      if (localStorage.getItem(DISMISSED_KEY)) return;
      // One promo at a time: let the install banner have its turn first
      if (!localStorage.getItem(INSTALL_DISMISSED_KEY)) return;
      visits = Number(localStorage.getItem(VISITS_KEY) ?? "0") + 1;
      localStorage.setItem(VISITS_KEY, String(visits));
    } catch { return; }
    if (visits < 3) return;
    const t = setTimeout(() => setShow(true), 8000);
    return () => clearTimeout(t);
  }, [inUse]);

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
    <div className="fixed bottom-24 lg:bottom-6 left-4 z-50 max-w-[320px] animate-in slide-in-from-bottom-4 duration-300">
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
              Get notified when workers clock in, safety incidents occur, and more — even when you&apos;re in another tab.
            </p>
          </div>
          <button
            onClick={dismiss}
            aria-label="Dismiss notification prompt"
            className="w-8 h-8 flex items-center justify-center text-white/25 hover:text-white/50 hover:bg-white/[0.05] rounded-lg transition-colors flex-shrink-0 -mr-1"
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
