"use client";

import { WifiOff, RefreshCw, CheckCircle2, Cloud } from "lucide-react";
import { useStore } from "@/lib/store";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const { isOnline, pendingSync, isSaving, savedRecently } = useStore();
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    if (isOnline && pendingSync === 0 && !justSynced) return;
    if (isOnline && pendingSync === 0) {
      setJustSynced(true);
      const t = setTimeout(() => setJustSynced(false), 3000);
      return () => clearTimeout(t);
    }
  }, [isOnline, pendingSync, justSynced]);

  // Offline
  if (!isOnline) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2 shadow-2xl">
        <WifiOff size={13} className="text-amber-400 flex-shrink-0" />
        <span className="text-[12px] font-medium text-white/70">
          Offline — changes saved locally
          {pendingSync > 0 && `, ${pendingSync} pending`}
        </span>
      </div>
    );
  }

  // Syncing queued offline ops
  if (isOnline && pendingSync > 0) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2 shadow-2xl">
        <RefreshCw size={13} className="text-amber-400 animate-spin flex-shrink-0" />
        <span className="text-[12px] font-medium text-white/70">Syncing {pendingSync} change{pendingSync !== 1 ? "s" : ""}…</span>
      </div>
    );
  }

  // Queued sync just completed
  if (justSynced) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 bg-[#1a1a1a] border border-green-500/20 rounded-full px-4 py-2 shadow-2xl">
        <CheckCircle2 size={13} className="text-green-400 flex-shrink-0" />
        <span className="text-[12px] font-medium text-green-400">All changes synced</span>
      </div>
    );
  }

  // Live save in progress
  if (isSaving) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.07] rounded-full px-3 py-1.5 shadow-xl">
        <Cloud size={12} className="text-white/30 animate-pulse flex-shrink-0" />
        <span className="text-[11px] text-white/30">Saving…</span>
      </div>
    );
  }

  // Just saved
  if (savedRecently) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-[#1a1a1a] border border-white/[0.07] rounded-full px-3 py-1.5 shadow-xl">
        <CheckCircle2 size={12} className="text-green-400/60 flex-shrink-0" />
        <span className="text-[11px] text-white/30">Saved</span>
      </div>
    );
  }

  return null;
}
