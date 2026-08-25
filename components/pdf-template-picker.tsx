"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronDown, Check } from "lucide-react";
import type { InvoiceTemplate } from "@/lib/pdf-export";

const TEMPLATES: { id: InvoiceTemplate; label: string; desc: string }[] = [
  { id: "classic", label: "Classic", desc: "Bold dark header, amber accents" },
  { id: "modern",  label: "Modern",  desc: "Dark header, amber side accent bar" },
  { id: "minimal", label: "Minimal", desc: "Clean, text-forward, no fills" },
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
        title="Choose PDF template"
        className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] px-3 py-1.5 rounded-lg transition-colors"
      >
        {current.label}
        <ChevronDown size={11} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="pop-in absolute right-0 top-full mt-2 w-56 bg-[#1a1a1a] border border-white/[0.10] rounded-xl shadow-2xl overflow-hidden z-50">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/25 px-4 pt-3 pb-2">PDF Template</p>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              onClick={() => { onChange(t.id); setOpen(false); }}
              className="w-full flex items-start gap-2.5 px-4 py-2.5 text-left hover:bg-white/[0.05] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-white/80">{t.label}</p>
                <p className="text-[10.5px] text-white/35">{t.desc}</p>
              </div>
              {value === t.id && <Check size={13} className="text-amber-400 flex-shrink-0 mt-0.5" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
