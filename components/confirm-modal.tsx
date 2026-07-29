"use client";

import { X } from "lucide-react";

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
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <h3 className="text-[15px] font-bold text-white leading-snug">{title}</h3>
          <button onClick={onCancel} className="p-0.5 text-white/25 hover:text-white/60 transition-colors flex-shrink-0 mt-0.5">
            <X size={14} />
          </button>
        </div>
        <p className="text-[13px] text-white/50 mb-5 leading-relaxed">{body}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-white/[0.06] hover:bg-white/[0.10] text-white/70 font-semibold text-[13px] py-2.5 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 font-bold text-[13px] py-2.5 rounded-xl transition-colors ${
              danger
                ? "bg-red-500 hover:bg-red-400 text-white"
                : "bg-amber-500 hover:bg-amber-400 text-black"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
