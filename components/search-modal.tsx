"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Users, FolderKanban, ClipboardList,
  Truck, FileText, ShieldAlert, Clock, Hash,
} from "lucide-react";
import { useStore } from "@/lib/store";

type Result = {
  id: string;
  label: string;
  sub: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
};

export function SearchModal() {
  const router = useRouter();
  const { workers, projects, punchItems, equipment, invoices, safetyIncidents } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => { setOpen(false); setQuery(""); setActiveIndex(-1); }, []);

  useEffect(() => {
    const onEvent = () => setOpen(true);
    window.addEventListener("open-search", onEvent);
    return () => window.removeEventListener("open-search", onEvent);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [close]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  // Reset active index when query changes
  useEffect(() => { setActiveIndex(-1); }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    const item = listRef.current.querySelectorAll("[data-item]")[activeIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const q = query.toLowerCase().trim();

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const items = q.length > 0 ? results : SHORTCUTS;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      const item = items[activeIndex];
      if (item) go(item.href, "label" in item ? item.label : undefined);
    }
  };

  const results: Result[] = q.length < 1 ? [] : [
    ...workers
      .filter((w) => w.name.toLowerCase().includes(q) || w.customRole.toLowerCase().includes(q) || w.email.toLowerCase().includes(q))
      .map((w) => ({
        id: "w-" + w.id,
        label: w.name,
        sub: w.customRole + (w.email ? " · " + w.email : ""),
        href: "/crew",
        icon: Users,
        color: "#22c55e",
      })),
    ...projects
      .filter((p) => p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q) || p.address.toLowerCase().includes(q))
      .map((p) => ({
        id: "p-" + p.id,
        label: p.name,
        sub: p.client + " · " + p.status,
        href: "/projects",
        icon: FolderKanban,
        color: "#f59e0b",
      })),
    ...projects
      .flatMap((p) => p.tasks.filter((t) => t.name.toLowerCase().includes(q)).map((t) => ({
        id: "t-" + t.id,
        label: t.name,
        sub: "Task · " + p.name,
        href: "/tasks",
        icon: Hash,
        color: "#8b5cf6",
      }))),
    ...punchItems
      .filter((i) => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
      .map((i) => ({
        id: "pi-" + i.id,
        label: i.title,
        sub: "Punch item · " + i.priority + " priority",
        href: "/punch-list",
        icon: ClipboardList,
        color: "#ef4444",
      })),
    ...equipment
      .filter((e) => e.name.toLowerCase().includes(q) || e.type.toLowerCase().includes(q))
      .map((e) => ({
        id: "eq-" + e.id,
        label: e.name,
        sub: "Equipment · " + e.type + " · " + e.status,
        href: "/equipment",
        icon: Truck,
        color: "#06b6d4",
      })),
    ...invoices
      .filter((i) => i.number.toLowerCase().includes(q) || i.clientName.toLowerCase().includes(q))
      .map((i) => ({
        id: "inv-" + i.id,
        label: i.number + " — " + i.clientName,
        sub: "Invoice · " + i.status,
        href: "/invoices",
        icon: FileText,
        color: "#f59e0b",
      })),
    ...safetyIncidents
      .filter((s) => s.description.toLowerCase().includes(q) || s.type.toLowerCase().includes(q))
      .map((s) => ({
        id: "si-" + s.id,
        label: s.type.replace("-", " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        sub: "Safety incident · " + s.severity + " severity",
        href: "/safety",
        icon: ShieldAlert,
        color: "#ef4444",
      })),
  ].slice(0, 8);

  const SHORTCUTS = [
    { label: "Dashboard", href: "/dashboard", icon: Clock, color: "#3b82f6" },
    { label: "Projects", href: "/projects", icon: FolderKanban, color: "#f59e0b" },
    { label: "Crew", href: "/crew", icon: Users, color: "#22c55e" },
    { label: "Punch List", href: "/punch-list", icon: ClipboardList, color: "#ef4444" },
    { label: "Invoices", href: "/invoices", icon: FileText, color: "#8b5cf6" },
    { label: "Safety", href: "/safety", icon: ShieldAlert, color: "#ef4444" },
  ];

  const go = (href: string, label?: string) => {
    if (label) {
      try { sessionStorage.setItem("search_prefill", JSON.stringify({ href, label, ts: Date.now() })); } catch {}
    }
    router.push(href);
    close();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={close} />
      <div className="relative w-full max-w-xl bg-[#141414] border border-white/[0.10] rounded-2xl shadow-2xl overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06]">
          <Search size={16} className="text-white/30 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            placeholder="Search workers, projects, tasks, equipment…"
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-white/25 outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-white/25 hover:text-white/50 transition-colors">
              <X size={14} />
            </button>
          )}
          <kbd className="text-[10px] bg-white/8 text-white/25 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto" ref={listRef}>
          {q.length > 0 ? (
            results.length > 0 ? (
              <div className="py-2">
                {results.map((r, i) => {
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      data-item=""
                      onClick={() => go(r.href, r.label)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${activeIndex === i ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: r.color + "18" }}>
                        <span style={{ color: r.color }}><Icon size={14} /></span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium text-white/85 truncate">{r.label}</p>
                        <p className="text-[11px] text-white/35 truncate">{r.sub}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-white/25 text-[13px]">
                No results for &ldquo;{query}&rdquo;
              </div>
            )
          ) : (
            <div className="py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/20 px-4 pb-2">Quick Links</p>
              {SHORTCUTS.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={s.href}
                    data-item=""
                    onClick={() => go(s.href)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${activeIndex === i ? "bg-white/[0.08]" : "hover:bg-white/[0.05]"}`}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: s.color + "18" }}>
                      <span style={{ color: s.color }}><Icon size={14} /></span>
                    </div>
                    <p className="text-[13px] font-medium text-white/70">{s.label}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-white/[0.06] px-4 py-2.5 flex items-center gap-4 text-[10px] text-white/20">
          <span><kbd className="bg-white/8 px-1 py-0.5 rounded font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="bg-white/8 px-1 py-0.5 rounded font-mono">↵</kbd> open</span>
          <span><kbd className="bg-white/8 px-1 py-0.5 rounded font-mono">⌘K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
