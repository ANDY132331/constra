"use client";
import { toast } from "sonner";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import {
  Plus, Search, Lock, X, FileText, ChevronRight,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import type { Estimate } from "@/lib/mock-data";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { CustomSelect } from "@/components/ui/custom-select";

// â”€â”€ Status config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const STATUS_CONFIG = {
  draft:    { label: "Draft",    bg: "bg-zinc-700/60",    text: "text-zinc-300",    dot: "bg-zinc-400"    },
  sent:     { label: "Sent",     bg: "bg-blue-500/15",    text: "text-blue-400",    dot: "bg-blue-400"    },
  accepted: { label: "Accepted", bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  declined: { label: "Declined", bg: "bg-red-500/15",     text: "text-red-400",     dot: "bg-red-500"     },
};

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type LineItem = { description: string; qty: string; rate: string; category: string };
type EstForm = {
  projectName: string; clientName: string; clientEmail: string;
  status: "draft" | "sent" | "accepted" | "declined";
  issueDate: string; validUntil: string;
  taxRate: string; notes: string;
  items: LineItem[];
};

const blankItem = (): LineItem => ({ description: "", qty: "1", rate: "", category: "Labour" });
const blank: EstForm = {
  projectName: "", clientName: "", clientEmail: "",
  status: "draft", issueDate: "", validUntil: "",
  taxRate: "13", notes: "", items: [blankItem()],
};

function estimateTotal(est: Estimate) {
  const sub = est.items.reduce((s, i) => s + i.qty * i.rate, 0);
  return sub * (1 + est.taxRate / 100);
}


// â”€â”€ Estimate list row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EstimateRow({ estimate, currency, selected, onClick }: {
  estimate: Estimate; currency: string; selected: boolean; onClick: () => void;
}) {
  const total = estimateTotal(estimate);
  const cfg = STATUS_CONFIG[estimate.status];
  const isAccepted = estimate.status === "accepted";
  const isDeclined = estimate.status === "declined";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-4 py-3.5 border-b border-white/[0.04] transition-all hover:bg-white/[0.04] active:bg-white/[0.06] group relative ${
        selected ? "bg-white/[0.06] border-l-2 border-l-amber-500" : "border-l-2 border-l-transparent"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-[10px] text-white/30">{estimate.number}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
          </div>
          <p className="text-[13px] font-semibold text-white/90 truncate">{estimate.projectName}</p>
          <p className="text-[11px] mt-0.5 text-white/35 truncate">{estimate.clientName}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-[14px] font-black ${isAccepted ? "text-emerald-400" : isDeclined ? "text-red-400" : "text-white"}`}>
            {formatCurrencyCompact(Math.round(total), currency as never)}
          </p>
          <ChevronRight size={13} className="text-white/20 group-hover:text-white/40 transition-colors ml-auto mt-0.5" />
        </div>
      </div>
    </button>
  );
}

// â”€â”€ Main page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function EstimatesPage() {
  const { estimates, addEstimate, currency, currentUser, defaultTaxRate } = useStore();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!isAdminOrAbove(currentUser.role)) router.replace("/dashboard");
  }, [currentUser.role, router]);

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Estimate["status"]>("all");
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<EstForm>(blank);
  const filtered = estimates.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || e.projectName.toLowerCase().includes(q) || e.clientName.toLowerCase().includes(q) || e.number.toLowerCase().includes(q);
  });

  const totalPending = estimates
    .filter((e) => e.status === "sent")
    .reduce((s, e) => s + estimateTotal(e), 0);
  const totalAccepted = estimates
    .filter((e) => e.status === "accepted")
    .reduce((s, e) => s + estimateTotal(e), 0);
  const declinedCount = estimates.filter((e) => e.status === "declined").length;

  const nextNumber = (() => {
    const nums = estimates.map((e) => parseInt(e.number.split("-").pop() ?? "0", 10)).filter(Boolean);
    const max = nums.length ? Math.max(...nums) : 0;
    return `EST-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`;
  })();

  const updateItem = (idx: number, field: keyof LineItem, val: string) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
  const addItem    = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = () => {
    if (!form.projectName.trim() || !form.clientName.trim()) { toast.error("Project name and client name are required"); return; }
    const items = form.items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description.trim(), qty: parseFloat(i.qty) || 1, rate: parseFloat(i.rate) || 0, category: i.category }));
    addEstimate({
      number: nextNumber,
      projectName: form.projectName.trim(),
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      status: form.status,
      issueDate: form.issueDate ? new Date(form.issueDate) : new Date(),
      validUntil: form.validUntil ? new Date(form.validUntil) : new Date(Date.now() + 30 * 86400000),
      items,
      taxRate: parseFloat(form.taxRate) || 0,
      notes: form.notes.trim() || undefined,
    });
    setForm({ ...blank, taxRate: String(defaultTaxRate) });
    setShowModal(false);
    toast.success("Estimate created");
  };

  const previewTotal = form.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0) * (1 + (parseFloat(form.taxRate) || 0) / 100);

  const TABS: Array<{ key: "all" | Estimate["status"]; label: string; count: number }> = [
    { key: "all",      label: "All",      count: estimates.length },
    { key: "draft",    label: "Draft",    count: estimates.filter((e) => e.status === "draft").length },
    { key: "sent",     label: "Sent",     count: estimates.filter((e) => e.status === "sent").length },
    { key: "accepted", label: "Accepted", count: estimates.filter((e) => e.status === "accepted").length },
    { key: "declined", label: "Declined", count: declinedCount },
  ];

  return (
    <>
      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• MOBILE â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="lg:hidden -mx-5 -mt-5 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <h1 className="text-[22px] font-bold text-white">Estimates</h1>
          <button
            onClick={() => { setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0], taxRate: String(defaultTaxRate) }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-full transition-colors"
          >
            <Plus size={14} /> New
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-2.5 px-5 mb-4 overflow-x-auto no-scrollbar">
          <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3">
            <p className="text-[20px] font-bold text-amber-400 leading-none">{formatCurrencyCompact(Math.round(totalPending), currency as never)}</p>
            <p className="text-[11px] text-white/40 font-medium mt-0.5">Pending</p>
          </div>
          <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3">
            <p className="text-[20px] font-bold text-emerald-400 leading-none">{formatCurrencyCompact(Math.round(totalAccepted), currency as never)}</p>
            <p className="text-[11px] text-white/40 font-medium mt-0.5">Accepted</p>
          </div>
          <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3">
            <p className={`text-[20px] font-bold leading-none ${declinedCount > 0 ? "text-red-400" : "text-white/30"}`}>{declinedCount}</p>
            <p className="text-[11px] text-white/40 font-medium mt-0.5">Declined</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-[#131110] border border-white/[0.07] mx-5 mb-4 px-3.5 py-3 rounded-2xl">
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            className="bg-transparent text-[14px] text-white/80 placeholder:text-white/25 outline-none flex-1"
            placeholder="Search project or client…"
            autoComplete="off" spellCheck={false}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 px-5 mb-4 overflow-x-auto [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-shrink-0 snap-start flex items-center gap-1 text-[13px] font-semibold px-3.5 py-2 rounded-full transition-colors ${statusFilter === tab.key ? "bg-amber-500 text-black" : "bg-[#131110] border border-white/[0.07] text-white/45"}`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[9px] px-1 py-0.5 rounded-full ${statusFilter === tab.key ? "bg-amber-500/25 text-amber-300" : "bg-white/[0.07] text-white/25"}`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No estimates yet"
            body="Create your first estimate to start winning more jobs."
            action={{ label: "New Estimate", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="px-5 space-y-2.5 pb-4">
            {filtered.map((est) => {
              const total = estimateTotal(est);
              const cfg = STATUS_CONFIG[est.status];
              const isAccepted = est.status === "accepted";
              const isDeclined = est.status === "declined";
              const borderColor = isAccepted ? "#22c55e" : isDeclined ? "#ef4444" : est.status === "sent" ? "#3b82f6" : "#52525b";
              return (
                <button
                  key={est.id}
                  onClick={() => router.push(`/estimates/${est.id}`)}
                  className="card-hover w-full text-left bg-[#131110] border border-white/[0.07] rounded-2xl overflow-hidden active:scale-[0.985] active:opacity-90 hover:border-white/[0.12]"
                  style={{ borderLeftColor: borderColor, borderLeftWidth: 3 }}
                >
                  <div className="px-4 py-4 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono text-[10px] text-white/30">{est.number}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      <p className="text-[14px] font-bold text-white/90 truncate">{est.projectName}</p>
                      <p className="text-[11px] mt-0.5 text-white/35">{est.clientName}</p>
                    </div>
                    <p className={`text-[18px] font-black flex-shrink-0 tabular-nums ${isAccepted ? "text-emerald-400" : isDeclined ? "text-red-400" : "text-white"}`}>
                      {formatCurrencyCompact(Math.round(total), currency as never)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â• DESKTOP â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="hidden lg:block h-full">
        <div className="h-full flex flex-col -m-4 md:-m-6">

          {/* â”€â”€ Top stats bar â”€â”€ */}
          <div className="flex items-stretch gap-0 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
            <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[160px]">
              <div className="flex-1">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Pending</p>
                <p className="text-[18px] font-black text-amber-400 mt-0.5">{formatCurrencyCompact(Math.round(totalPending), currency as never)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[140px]">
              <div className="flex-1">
                <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Accepted</p>
                <p className="text-[18px] font-black text-emerald-400 mt-0.5">{formatCurrencyCompact(Math.round(totalAccepted), currency as never)}</p>
              </div>
            </div>
            {declinedCount > 0 && (
              <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[120px]">
                <div className="flex-1">
                  <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Declined</p>
                  <p className="text-[18px] font-black text-red-400 mt-0.5">{declinedCount}</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 px-5 py-3.5 ml-auto flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-500/10 px-2.5 py-1 rounded-full">
                <Lock size={9} /> Private
              </div>
              <button
                onClick={() => { setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0], taxRate: String(defaultTaxRate) }); setShowModal(true); }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[12px] px-3.5 py-2 rounded-full transition-colors"
              >
                <Plus size={14} /> New Estimate
              </button>
            </div>
          </div>

          {/* â”€â”€ Master / Detail layout â”€â”€ */}
          <div className="flex flex-1 overflow-hidden">

            {/* List panel */}
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Search + filter */}
              <div className="px-3 py-3 border-b border-white/[0.05] space-y-2 flex-shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                  <Search size={13} className="text-white/30 flex-shrink-0" />
                  <input
                    className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1 min-w-0"
                    placeholder="Search project or clientâ€¦"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-0.5">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${
                        statusFilter === tab.key
                          ? "bg-amber-500/15 text-amber-400"
                          : "text-white/35 hover:text-white/60 hover:bg-white/[0.04]"
                      }`}
                    >
                      {tab.label}
                      {tab.count > 0 && (
                        <span className={`text-[9px] px-1 py-0.5 rounded-full ${statusFilter === tab.key ? "bg-amber-500/25 text-amber-300" : "bg-white/[0.07] text-white/25"}`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* List */}
              <div className="flex-1 overflow-y-auto">
                {filtered.length === 0 ? (
                  <EmptyState
                    icon={FileText}
                    title="No estimates yet"
                    body="Create your first estimate to start winning more jobs."
                    action={{ label: "New Estimate", onClick: () => setShowModal(true) }}
                  />
                ) : (
                  filtered.map((est) => (
                    <EstimateRow
                      key={est.id}
                      estimate={est}
                      currency={currency}
                      selected={false}
                      onClick={() => router.push(`/estimates/${est.id}`)}
                    />
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* â”€â”€ New / Edit Estimate Modal â”€â”€ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-bold text-white">New Estimate</h3>
                <p className="text-[11px] text-white/30 mt-0.5 font-mono">{nextNumber}</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-y-contain p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Project Name *</label>
                  <input className={inp} placeholder="Westside Condo Framing" maxLength={100}
                    value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Client Name *</label>
                  <input className={inp} placeholder="Acme Corp" maxLength={100}
                    value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Client Email</label>
                  <input className={inp} type="email" placeholder="client@example.com"
                    value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Status</label>
                  <CustomSelect
                    className={inp}
                    value={form.status}
                    onChange={(v) => setForm((f) => ({ ...f, status: v as EstForm["status"] }))}
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "sent", label: "Sent" },
                      { value: "accepted", label: "Accepted" },
                      { value: "declined", label: "Declined" },
                    ]}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Issue Date</label>
                  <input className={inp} type="date" value={form.issueDate}
                    onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Valid Until</label>
                  <input className={inp} type="date" value={form.validUntil}
                    onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={lbl} style={{ marginBottom: 0 }}>Line Items</label>
                  <button onClick={addItem} className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors">+ Add item</button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid sm:grid-cols-[80px_1fr_56px_80px_20px] gap-1.5 text-[9px] font-bold text-white/25 uppercase tracking-wider px-1">
                    <span>Category</span><span>Description</span><span>Qty</span><span>Rate ($)</span><span />
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[80px_1fr_56px_80px_20px] sm:gap-1.5 sm:items-center bg-white/[0.03] sm:bg-transparent rounded-lg p-2 sm:p-0">
                      <CustomSelect
                        className={inp}
                        value={item.category}
                        onChange={(v) => updateItem(idx, "category", v)}
                        options={[
                          { value: "Labour", label: "Labour" },
                          { value: "Material", label: "Material" },
                          { value: "Equipment", label: "Equipment" },
                          { value: "Other", label: "Other" },
                        ]}
                      />
                      <input className={inp} placeholder="Description…" maxLength={200} value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)} />
                      <div className="flex gap-2 sm:contents">
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1 sm:hidden">Qty</p>
                          <input className={inp} type="number" placeholder="1" value={item.qty}
                            onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                        </div>
                        <div className="flex-1">
                          <p className="text-[9px] font-bold text-white/25 uppercase tracking-wider mb-1 sm:hidden">Rate ($)</p>
                          <input className={inp} type="number" placeholder="0.00" value={item.rate}
                            onChange={(e) => updateItem(idx, "rate", e.target.value)} />
                        </div>
                        <button onClick={() => removeItem(idx)} className="self-end text-white/20 hover:text-red-400 transition-colors p-2 rounded-full hover:bg-red-500/10">
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Tax Rate (%)</label>
                  <input className={inp} type="number" placeholder="13" value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))} />
                </div>
                <div className="flex flex-col justify-end">
                  {previewTotal > 0 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                      <p className="text-[9px] text-amber-400/60 uppercase tracking-widest font-bold">Total</p>
                      <p className="text-[20px] font-black text-amber-400 leading-tight">{formatCurrency(Math.round(previewTotal), currency as never)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={lbl}>Notes &amp; Scope</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="Scope, assumptions, exclusions…" maxLength={1000}
                  value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06]">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                {t.common.cancel}
              </button>
              <button onClick={handleSave} disabled={!form.projectName.trim() || !form.clientName.trim()}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Create Estimate
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}








