"use client";

import { X } from "lucide-react";
import { useScrollLock } from "@/lib/use-scroll-lock";

export function ConfirmModal({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useScrollLock(open);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
      onTouchMove={(e) => e.preventDefault()}
    >
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-[15px] font-bold text-white leading-snug">{title}</h3>
          <button onClick={onCancel} aria-label="Close" className="w-8 h-8 flex items-center justify-center text-white/25 hover:text-white/60 hover:bg-white/[0.05] rounded-lg transition-colors flex-shrink-0 -mt-1 -mr-1">
            <X size={14} />
          </button>
        </div>
        <p className="text-[13px] text-white/50 mb-5 leading-relaxed">{body}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] active:bg-white/[0.14] text-white/70 font-semibold text-[13px] py-3 rounded-full transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-bold text-[13px] py-3 rounded-full transition-colors active:scale-[0.98] ${
              danger
                ? "bg-red-500 hover:bg-red-400 active:bg-red-600 text-white"
                : "bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
