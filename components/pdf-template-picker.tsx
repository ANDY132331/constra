"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Check } from "lucide-react";
import type { InvoiceTemplate } from "@/lib/pdf-export";

// Mini SVG thumbnail for each template — rendered inside the picker
function ClassicThumb() {
  return (
    <svg viewBox="0 0 56 40" className="w-full h-auto" aria-hidden>
      <rect width="56" height="40" fill="#fff" />
      <circle cx="9" cy="9" r="5" fill="#F5C400" />
      <rect x="28" y="5" width="22" height="4" rx="1" fill="#161616" opacity="0.7" />
      <line x1="3" y1="18" x2="53" y2="18" stroke="#ddd" strokeWidth="0.5" />
      <rect x="3" y="21" width="50" height="3" rx="0.5" fill="#F5C400" opacity="0.6" />
      <rect x="3" y="26" width="50" height="2" rx="0.5" fill="#eee" />
      <rect x="3" y="30" width="50" height="2" rx="0.5" fill="#f5f5f5" />
      <rect x="0" y="36" width="56" height="4" fill="#F5C400" />
    </svg>
  );
}

function ModernThumb() {
  return (
    <svg viewBox="0 0 56 40" className="w-full h-auto" aria-hidden>
      <rect width="56" height="40" fill="#fff" />
      <rect width="56" height="13" fill="#1c2026" />
      <rect width="2.5" height="13" fill="#F5C400" />
      <circle cx="9" cy="6.5" r="3.5" fill="#F5C400" opacity="0.9" />
      <rect x="34" y="4" width="16" height="3" rx="0.5" fill="#F5C400" opacity="0.8" />
      <rect x="3" y="16" width="28" height="2" rx="0.5" fill="#ddd" />
      <rect x="3" y="20" width="20" height="2" rx="0.5" fill="#eee" />
      <rect x="3" y="24" width="50" height="3" rx="0.5" fill="#1c2026" opacity="0.8" />
      <rect x="3" y="29" width="50" height="2" rx="0.5" fill="#f0f0f0" />
      <rect x="3" y="33" width="50" height="2" rx="0.5" fill="#f5f5f5" />
    </svg>
  );
}

function MinimalThumb() {
  return (
    <svg viewBox="0 0 56 40" className="w-full h-auto" aria-hidden>
      <rect width="56" height="40" fill="#fff" />
      <rect x="3" y="5" width="18" height="3" rx="0.5" fill="#222" opacity="0.8" />
      <rect x="3" y="10" width="12" height="1.5" rx="0.5" fill="#bbb" />
      <rect x="32" y="4" width="20" height="4" rx="0.5" fill="#161616" opacity="0.6" />
      <line x1="3" y1="16" x2="53" y2="16" stroke="#ccc" strokeWidth="0.5" />
      <rect x="3" y="20" width="14" height="1.5" rx="0.5" fill="#ddd" />
      <rect x="3" y="23" width="22" height="2.5" rx="0.5" fill="#333" opacity="0.7" />
      <rect x="3" y="28" width="50" height="3" rx="0.5" fill="#f0f0f0" />
      <rect x="3" y="33" width="50" height="1.5" rx="0.5" fill="#f5f5f5" />
      <rect x="3" y="36" width="50" height="1.5" rx="0.5" fill="#fafafa" />
    </svg>
  );
}

const TEMPLATES: { id: InvoiceTemplate; label: string; desc: string; Thumb: () => React.ReactElement }[] = [
  { id: "classic", label: "Classic", desc: "Yellow header row and footer band", Thumb: ClassicThumb },
  { id: "modern", label: "Modern", desc: "Dark header with a yellow accent strip", Thumb: ModernThumb },
  { id: "minimal", label: "Minimal", desc: "Text only, hairline rules", Thumb: MinimalThumb },
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

/**
 * Picks the PDF style. This sits inside the document's action menu, so it lays the three
 * choices out in place rather than opening a second dropdown — a nested menu was wider than
 * its parent and got clipped, leaving one half-cut row and the rest unreachable.
 */
export function TemplatePicker({
  value,
  onChange,
  className,
}: {
  value: InvoiceTemplate;
  onChange: (t: InvoiceTemplate) => void;
  className?: string;
}) {
  const selected = TEMPLATES.find((t) => t.id === value) ?? TEMPLATES[0];

  return (
    <div className={className} role="radiogroup" aria-label="PDF style">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">PDF style</span>
        <span className="text-[10px] text-white/25">download only</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((t) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={`${t.label} — ${t.desc}`}
              onClick={() => onChange(t.id)}
              className={`group relative rounded-lg p-1 text-left transition-colors ${
                active ? "bg-amber-500/15 ring-1 ring-amber-400" : "bg-white/[0.04] ring-1 ring-white/[0.07] hover:ring-white/20"
              }`}
            >
              <span className="block rounded overflow-hidden border border-black/30">
                <t.Thumb />
              </span>
              <span className={`mt-1 block text-[10px] font-semibold text-center ${active ? "text-amber-300" : "text-white/55"}`}>
                {t.label}
              </span>
              {active && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
                  <Check size={10} strokeWidth={3} className="text-black" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-white/30 leading-snug">{selected.desc}</p>
    </div>
  );
}
