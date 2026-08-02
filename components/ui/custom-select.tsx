"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption = { value: string; label: string };

type Props = {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  className?: string;
};

export function CustomSelect({ value, onChange, options, placeholder = "Select…", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onOutsideClick);
    return () => document.removeEventListener("mousedown", onOutsideClick);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-[#0d0d0d] border border-white/[0.08] focus:border-amber-500/40 rounded-lg px-3 py-2.5 text-[13px] text-left outline-none transition-colors"
      >
        <span className={selected ? "text-white/80 truncate" : "text-white/25 truncate"}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={14}
          className={`text-white/30 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute z-[200] top-full left-0 right-0 mt-1.5 bg-[#1c1c1c] border border-white/[0.10] rounded-xl overflow-hidden shadow-2xl shadow-black/70 max-h-60 overflow-y-auto">
          {options.length === 0 && (
            <div className="px-4 py-3 text-[12px] text-white/30">No options</div>
          )}
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-[13px] text-left hover:bg-white/[0.05] active:bg-white/[0.08] transition-colors border-b border-white/[0.04] last:border-0"
            >
              <span className={o.value === value ? "text-amber-400 font-semibold" : "text-white/70"}>
                {o.label}
              </span>
              {o.value === value && <Check size={13} className="text-amber-400 flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
