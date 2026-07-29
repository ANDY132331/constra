"use client";

import { useEffect, useState, useCallback } from "react";
import { Download, WifiOff, X, CheckCircle2 } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const QUEUE_KEY = "constra_offline_queue";

export type OfflineClockEvent = {
  id: string;
  workerId: string;
  workerName: string;
  type: "in" | "out";
  timestamp: number;
};

export function getOfflineQueue(): OfflineClockEvent[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function pushOfflineQueue(event: OfflineClockEvent) {
  const q = getOfflineQueue();
  q.push(event);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
}

export function clearOfflineQueue() {
  localStorage.removeItem(QUEUE_KEY);
}

export default function PwaInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [synced, setSynced] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // Capture install prompt
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Online/offline tracking
    const onOnline = () => {
      setIsOnline(true);
      // Flush offline queue on reconnect
      const q = getOfflineQueue();
      if (q.length > 0) {
        setSynced(true);
        clearOfflineQueue();
        setQueueCount(0);
        setTimeout(() => setSynced(false), 4000);
      }
    };
    const onOffline = () => setIsOnline(false);
    setIsOnline(navigator.onLine);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Poll queue count
    const interval = setInterval(() => {
      setQueueCount(getOfflineQueue().length);
    }, 2000);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  }, [installPrompt]);

  if (dismissed) return null;

  if (synced) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 bg-green-500/15 border border-green-500/25 rounded-xl px-4 py-3 text-[12px] text-green-400 font-semibold shadow-xl">
        <CheckCircle2 size={14} />
        Clock-in events synced
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 bg-amber-500/[0.12] border border-amber-500/25 rounded-xl px-4 py-3 shadow-xl">
        <WifiOff size={14} className="text-amber-400 flex-shrink-0" />
        <div>
          <p className="text-[12px] font-bold text-amber-300">You&apos;re offline</p>
          {queueCount > 0 && (
            <p className="text-[10px] text-amber-400/60 mt-0.5">{queueCount} clock event{queueCount !== 1 ? "s" : ""} queued — will sync when reconnected</p>
          )}
        </div>
      </div>
    );
  }

  if (installPrompt) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-4 py-3 shadow-xl max-w-xs">
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

  return null;
}
