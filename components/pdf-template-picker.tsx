"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import type { InvoiceTemplate } from "@/lib/pdf-export";

// Mini SVG thumbnail for each template — rendered inside the picker dropdown
function ClassicThumb() {
  return (
    <svg viewBox="0 0 56 40" className="w-14 h-10 rounded border border-white/10 flex-shrink-0">
      <rect width="56" height="40" fill="#fff" />
      {/* amber circle logo */}
      <circle cx="9" cy="9" r="5" fill="#F5C400" />
      {/* INVOICE text */}
      <rect x="28" y="5" width="22" height="4" rx="1" fill="#161616" opacity="0.7" />
      {/* divider */}
      <line x1="3" y1="18" x2="53" y2="18" stroke="#ddd" strokeWidth="0.5" />
      {/* line items rows */}
      <rect x="3" y="21" width="50" height="3" rx="0.5" fill="#F5C400" opacity="0.6" />
      <rect x="3" y="26" width="50" height="2" rx="0.5" fill="#eee" />
      <rect x="3" y="30" width="50" height="2" rx="0.5" fill="#f5f5f5" />
      {/* amber footer */}
      <rect x="0" y="36" width="56" height="4" fill="#F5C400" />
    </svg>
  );
}

function ModernThumb() {
  return (
    <svg viewBox="0 0 56 40" className="w-14 h-10 rounded border border-white/10 flex-shrink-0">
      <rect width="56" height="40" fill="#fff" />
      {/* dark header */}
      <rect width="56" height="13" fill="#1c2026" />
      {/* amber left strip */}
      <rect width="2.5" height="13" fill="#F5C400" />
      {/* logo circle in header */}
      <circle cx="9" cy="6.5" r="3.5" fill="#F5C400" opacity="0.9" />
      {/* INVOICE amber text in header */}
      <rect x="34" y="4" width="16" height="3" rx="0.5" fill="#F5C400" opacity="0.8" />
      {/* meta rows */}
      <rect x="3" y="16" width="28" height="2" rx="0.5" fill="#ddd" />
      <rect x="3" y="20" width="20" height="2" rx="0.5" fill="#eee" />
      {/* dark table header */}
      <rect x="3" y="24" width="50" height="3" rx="0.5" fill="#1c2026" opacity="0.8" />
      <rect x="3" y="29" width="50" height="2" rx="0.5" fill="#f0f0f0" />
      <rect x="3" y="33" width="50" height="2" rx="0.5" fill="#f5f5f5" />
    </svg>
  );
}

function MinimalThumb() {
  return (
    <svg viewBox="0 0 56 40" className="w-14 h-10 rounded border border-white/10 flex-shrink-0">
      <rect width="56" height="40" fill="#fff" />
      {/* company name text */}
      <rect x="3" y="5" width="18" height="3" rx="0.5" fill="#222" opacity="0.8" />
      <rect x="3" y="10" width="12" height="1.5" rx="0.5" fill="#bbb" />
      {/* INVOICE text right */}
      <rect x="32" y="4" width="20" height="4" rx="0.5" fill="#161616" opacity="0.6" />
      {/* hairline divider */}
      <line x1="3" y1="16" x2="53" y2="16" stroke="#ccc" strokeWidth="0.5" />
      {/* bill to + details */}
      <rect x="3" y="20" width="14" height="1.5" rx="0.5" fill="#ddd" />
      <rect x="3" y="23" width="22" height="2.5" rx="0.5" fill="#333" opacity="0.7" />
      {/* light gray table header */}
      <rect x="3" y="28" width="50" height="3" rx="0.5" fill="#f0f0f0" />
      {/* rows */}
      <rect x="3" y="33" width="50" height="1.5" rx="0.5" fill="#f5f5f5" />
      <rect x="3" y="36" width="50" height="1.5" rx="0.5" fill="#fafafa" />
    </svg>
  );
}

const TEMPLATES: { id: InvoiceTemplate; label: string; desc: string; Thumb: () => React.ReactElement }[] = [
  { id: "classic", label: "Classic", desc: "Amber header row · bold INVOICE · colored footer", Thumb: ClassicThumb },
  { id: "modern",  label: "Modern",  desc: "Dark charcoal header · amber accent strip",        Thumb: ModernThumb },
  { id: "minimal", label: "Minimal", desc: "Clean & text-only · hairline separators",           Thumb: MinimalThumb },
];

/** Persists the chosen PDF template in localStorage under `storageKey`, defaulting to "classic". */
export function useTemplateChoice(storageKey: string): [InvoiceTemplate, (t: InvoiceTemplate) => void] {
  const [template, setTemplateState] = useState<InvoiceTemplate>("classic");

  useEffect(() => {
    // Hydrating from localStorage (external system) on mount.
    const saved = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === "classic" || saved === "modern" || saved === "minimal") setTemplateState(saved);
  }, [storageKey]);

  const setTemplate = useCallback((t: InvoiceTemplate) => {
    setTemplateState(t);
    try { localStorage.setItem(storageKey, t); } catch { /* ignore (private browsing, etc.) */ }
  }, [storageKey]);

  return [template, setTemplate];
}

export function TemplatePicker({
  value,
  onChange,
  className,
}: {
  value: InvoiceTemplate;
  onChange: (t: InvoiceTemplate) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const current = TEMPLATES.find((t) => t.id === value) ?? TEMPLATES[0];

  return (
    <div ref={ref} className={`relative flex-shrink-0 ${className ?? ""}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Choose PDF template style"
        className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] px-3 py-1.5 rounded-lg transition-colors"
      >
        {/* small color dot to indicate active template */}
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${value === "modern" ? "bg-[#1c2026] border border-white/20" : value === "minimal" ? "bg-white border border-white/30" : "bg-amber-400"}`} />
        {current.label}
        <span className="text-[10px] text-white/25 hidden sm:inline">PDF</span>
      </button>

      {open && (
        <div className="pop-in absolute right-0 top-full mt-2 w-72 bg-[#1a1a1a] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden z-50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 px-4 pt-3 pb-2">
            PDF Template — affects download only
          </p>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.05] transition-colors"
            >
              <t.Thumb />
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white/80">{t.label}</p>
                <p className="text-[10px] text-white/35 leading-snug">{t.desc}</p>
              </div>
              {value === t.id && <Check size={13} className="text-amber-400 flex-shrink-0" />}
            </button>
          ))}
          <p className="text-[9px] text-white/20 px-4 py-2 border-t border-white/[0.06]">
            Click PDF or Send to export with the selected style
          </p>
        </div>
      )}
    </div>
  );
}
