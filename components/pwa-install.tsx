"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, X } from "lucide-react";
import { subscribeToPush } from "@/lib/push-client";
import { useStore } from "@/lib/store";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const { currentUser, companyId } = useStore();

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        if (Notification.permission === "granted" && companyId && currentUser?.id) {
          subscribeToPush(companyId, currentUser.id).catch(() => {});
        }
        void reg;
      }).catch(() => {});
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [companyId, currentUser?.id]);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  }, [installPrompt]);

  if (dismissed || !installPrompt) return null;

  return (
    <div className="fixed bottom-24 lg:bottom-4 right-4 z-50 flex items-center gap-3 bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-4 py-3 shadow-xl max-w-xs">
      <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
        <Download size={14} className="text-black" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-bold text-white">Install Constra</p>
        <p className="text-[10px] text-white/40 mt-0.5">Add to home screen for quick access</p>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={handleInstall}
          className="text-[11px] font-bold text-black bg-amber-500 hover:bg-amber-400 px-2.5 py-1.5 rounded-lg transition-colors">
          Install
        </button>
        <button onClick={() => setDismissed(true)} className="p-1 text-white/30 hover:text-white/60 transition-colors">
          <X size={13} />
        </button>
      </div>
    </div>
  );
}
