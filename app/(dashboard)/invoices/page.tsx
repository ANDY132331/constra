"use client";
import { toast } from "sonner";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import {
  Plus, Search, Lock, X, FileText, ChevronRight,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import type { Invoice } from "@/lib/mock-data";
import { ConfirmModal } from "@/components/confirm-modal";
import { EmptyState } from "@/components/empty-state";
import { CustomSelect } from "@/components/ui/custom-select";
import { toLocalDateString } from "@/lib/utils";

const STATUS_CONFIG = {
  draft:   { label: "Draft",   bg: "bg-zinc-700/60",       text: "text-zinc-300",   dot: "bg-zinc-400",   bar: "bg-zinc-600" },
  sent:    { label: "Sent",    bg: "bg-blue-500/15",       text: "text-blue-400",   dot: "bg-blue-400",   bar: "bg-blue-500" },
  paid:    { label: "Paid",    bg: "bg-emerald-500/15",    text: "text-emerald-400",dot: "bg-emerald-400",bar: "bg-emerald-500" },
  overdue: { label: "Overdue", bg: "bg-red-500/15",        text: "text-red-400",    dot: "bg-red-500",    bar: "bg-red-500" },
};

const inp = "w-full bg-[#0d0d0d] border border-white/[0.08] rounded-lg px-3 py-2 text-[13px] text-white/80 placeholder:text-white/25 outline-none focus:border-amber-500/40 transition-colors";
const lbl = "block text-[10px] font-bold text-white/35 uppercase tracking-wider mb-1.5";

type LineItem = { description: string; qty: string; rate: string };
type InvForm = {
  clientName: string; clientEmail: string; clientAddress: string;
  status: "draft" | "sent" | "paid" | "overdue";
  issueDate: string; dueDate: string;
  taxRate: string; notes: string;
  items: LineItem[];
};

const blankItem = (): LineItem => ({ description: "", qty: "1", rate: "" });
const blank: InvForm = {
  clientName: "", clientEmail: "", clientAddress: "",
  status: "draft", issueDate: "", dueDate: "",
  taxRate: "13", notes: "", items: [blankItem()],
};

function invoiceTotal(inv: Invoice) {
  const sub = inv.items.reduce((s, i) => s + i.qty * i.rate, 0);
  return sub * (1 + inv.taxRate / 100);
}

// â"€â"€ Invoice list row â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

function InvoiceRow({ invoice, currency, onClick }: {
  invoice: Invoice; currency: string; onClick: () => void;
}) {
  const total = invoiceTotal(invoice);
  const isPastDue = invoice.status === "sent" && invoice.dueDate < new Date();
  const cfg = isPastDue ? STATUS_CONFIG.overdue : STATUS_CONFIG[invoice.status];
  const isOverdue = invoice.status === "overdue" || isPastDue;
  const isPaid = invoice.status === "paid";

  return (
    <button
      onClick={onClick}
      className="w-full text-left px-4 py-3.5 border-b border-white/[0.04] transition-all hover:bg-white/[0.04] active:bg-white/[0.06] group relative border-l-2 border-l-transparent hover:border-l-amber-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-[10px] text-white/30">{invoice.number}</span>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
          </div>
          <p className="text-[13px] font-semibold text-white/90 truncate" title={invoice.clientName}>{invoice.clientName}</p>
          <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-400" : "text-white/35"}`}>
            {isOverdue ? "Overdue Â· " : "Due "}
            {invoice.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className={`text-[14px] font-black ${isPaid ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-white"}`}>
            {formatCurrencyCompact(Math.round(total), currency as never)}
          </p>
          <ChevronRight size={13} className="text-white/20 group-hover:text-white/40 transition-colors ml-auto mt-0.5" />
        </div>
      </div>
    </button>
  );
}

// â"€â"€ Main page â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€â"€

export default function InvoicesPage() {
  const { invoices, addInvoice, currency, currentUser, defaultTaxRate } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (!isAdminOrAbove(currentUser.role)) router.replace("/dashboard");
  }, [currentUser.role, router]);
  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Invoice["status"]>("all");
  const [showModal, setShowModal]     = useState(false);
  const [form, setForm]               = useState<InvForm>(blank);
  const searchParams = useSearchParams();
  useEffect(() => { if (searchParams.get("new") === "1") { setForm({ ...blank, issueDate: toLocalDateString(new Date()), taxRate: String(defaultTaxRate) }); setShowModal(true); } }, [searchParams, defaultTaxRate]);

  const filtered = invoices.filter((i) => {
    if (statusFilter !== "all") {
      const isPastDue = i.status === "sent" && i.dueDate < now;
      const effectiveStatus = isPastDue ? "overdue" : i.status;
      if (effectiveStatus !== statusFilter) return false;
    }
    const q = search.toLowerCase();
    return !q || i.clientName.toLowerCase().includes(q) || i.number.toLowerCase().includes(q);
  });

  const totalOutstanding = invoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((s, i) => s + invoiceTotal(i), 0);

  const totalPaid = invoices
    .filter((i) => i.status === "paid")
    .reduce((s, i) => s + invoiceTotal(i), 0);

  const now = new Date();
  const overdueCount = invoices.filter((i) => i.status === "overdue" || (i.status === "sent" && i.dueDate < now)).length;

  const calcTotal = useCallback((items: LineItem[], taxRate: string) => {
    const sub = items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
    return sub * (1 + (parseFloat(taxRate) || 0) / 100);
  }, []);

  const nextNumber = (() => {
    const nums = invoices.map((i) => parseInt(i.number.split("-").pop() ?? "0", 10)).filter((n) => n > 0);
    const max = nums.length ? Math.max(...nums) : 0;
    return `INV-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`;
  })();

  const updateItem   = (idx: number, field: keyof LineItem, val: string) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
  const addItem      = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem   = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = () => {
    if (!form.clientName.trim()) { toast.error("Client name is required"); return; }
    if (form.issueDate && form.dueDate && new Date(form.dueDate + "T12:00:00") <= new Date(form.issueDate + "T12:00:00")) {
      toast.error("Due date must be after issue date"); return;
    }
    const items = form.items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description.trim(), qty: parseFloat(i.qty) || 1, rate: parseFloat(i.rate) || 0 }));
    if (!items.length) { toast.error("Add at least one line item"); return; }
    addInvoice({
      number: nextNumber,
      clientName: form.clientName.trim(),
      clientEmail: form.clientEmail.trim(),
      clientAddress: form.clientAddress.trim(),
      status: form.status,
      issueDate: form.issueDate ? new Date(form.issueDate + "T12:00:00") : new Date(),
      dueDate: form.dueDate ? new Date(form.dueDate + "T12:00:00") : new Date(Date.now() + 30 * 86400000),
      items,
      taxRate: parseFloat(form.taxRate) || 0,
      notes: form.notes.trim() || undefined,
    });
    setForm({ ...blank, taxRate: String(defaultTaxRate) });
    setShowModal(false);
    toast.success("Invoice created");
  };

  const previewTotal = calcTotal(form.items, form.taxRate);

  const TABS: Array<{ key: "all" | Invoice["status"]; label: string; count: number }> = [
    { key: "all",     label: "All",     count: invoices.length },
    { key: "draft",   label: "Draft",   count: invoices.filter((i) => i.status === "draft").length },
    { key: "sent",    label: "Sent",    count: invoices.filter((i) => i.status === "sent").length },
    { key: "paid",    label: "Paid",    count: invoices.filter((i) => i.status === "paid").length },
    { key: "overdue", label: "Overdue", count: overdueCount },
  ];

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-5 -mt-5 pb-6">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4">
          <div>
            <h1 className="text-[24px] font-bold text-white tracking-tight">Invoices</h1>
            <p className="text-[12px] text-white/35 mt-0.5">{invoices.length} total</p>
          </div>
          <button
            onClick={() => { setForm({ ...blank, issueDate: toLocalDateString(new Date()), taxRate: String(defaultTaxRate) }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 active:bg-amber-600 text-black font-bold text-[13px] px-4 py-2.5 rounded-full transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus size={15} /> New
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-2.5 px-5 mb-4 overflow-x-auto no-scrollbar">
          <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3.5">
            <p className="text-[11px] text-white/35 font-medium mb-1">Outstanding</p>
            <p className="text-[20px] font-bold text-amber-400 leading-none">{formatCurrencyCompact(Math.round(totalOutstanding), currency as never)}</p>
          </div>
          <div className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-2xl px-4 py-3.5">
            <p className="text-[11px] text-white/35 font-medium mb-1">Collected</p>
            <p className="text-[20px] font-bold text-emerald-400 leading-none">{formatCurrencyCompact(Math.round(totalPaid), currency as never)}</p>
          </div>
          {overdueCount > 0 && (
            <div className="flex-shrink-0 bg-red-500/[0.08] border border-red-500/20 rounded-2xl px-4 py-3.5">
              <p className="text-[11px] text-red-400/70 font-medium mb-1">Overdue</p>
              <p className="text-[20px] font-bold text-red-400 leading-none">{overdueCount}</p>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.06] mx-5 mb-3 px-3.5 py-3 rounded-2xl">
          <Search size={14} className="text-white/30 flex-shrink-0" />
          <input
            className="bg-transparent text-[13px] text-white/80 placeholder:text-white/30 outline-none flex-1"
            placeholder="Search client or invoice #…"
            autoComplete="off" spellCheck={false} maxLength={100}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto [&::-webkit-scrollbar]:hidden snap-x snap-mandatory">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-shrink-0 snap-start flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-2 rounded-full transition-all ${
                statusFilter === tab.key
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/25"
                  : "text-white/40 bg-white/[0.04] border border-transparent"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  statusFilter === tab.key ? "bg-amber-500/25 text-amber-300" : "bg-white/[0.07] text-white/25"
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Invoice list */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No invoices yet"
            body="Create your first invoice to start getting paid faster."
            action={{ label: "Create Invoice", onClick: () => setShowModal(true) }}
          />
        ) : (
          <div className="mx-5 space-y-2.5">
            {filtered.map((inv) => {
              const total = invoiceTotal(inv);
              const cfg = STATUS_CONFIG[inv.status];
              const isOverdue = inv.status === "overdue";
              const isPaid = inv.status === "paid";
              return (
                <button
                  key={inv.id}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                  className="card-hover w-full text-left bg-[#131110] border border-white/[0.07] rounded-2xl overflow-hidden active:scale-[0.985] active:opacity-90"
                >
                  <div className="px-4 py-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                        <span className="font-mono text-[10px] text-white/25">{inv.number}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-white/90 truncate">{inv.clientName}</p>
                      <p className={`text-[11px] mt-0.5 ${isOverdue ? "text-red-400" : "text-white/30"}`}>
                        {isOverdue ? "âš  Overdue Â· " : "Due "}
                        {inv.dueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <p className={`text-[18px] font-black flex-shrink-0 tabular-nums ${isPaid ? "text-emerald-400" : isOverdue ? "text-red-400" : "text-white"}`}>
                      {formatCurrencyCompact(Math.round(total), currency as never)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block h-full">
        <div className="h-full flex flex-col -m-4 md:-m-6">

          {/* â"€â"€ Top stats bar â"€â"€ */}
          <div className="flex items-stretch gap-0 border-b border-white/[0.06] flex-shrink-0 overflow-x-auto">
        <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[160px]">
          <div className="flex-1">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Outstanding</p>
            <p className="text-[18px] font-black text-amber-400 mt-0.5">{formatCurrencyCompact(Math.round(totalOutstanding), currency as never)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[140px]">
          <div className="flex-1">
            <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Collected</p>
            <p className="text-[18px] font-black text-emerald-400 mt-0.5">{formatCurrencyCompact(Math.round(totalPaid), currency as never)}</p>
          </div>
        </div>
        {overdueCount > 0 && (
          <div className="flex items-center gap-3 px-5 py-3.5 border-r border-white/[0.05] min-w-[120px]">
            <div className="flex-1">
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Overdue</p>
              <p className="text-[18px] font-black text-red-400 mt-0.5">{overdueCount}</p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 px-5 py-3.5 ml-auto flex-shrink-0">
          <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-500/10 px-2.5 py-1 rounded-full">
            <Lock size={9} /> Private
          </div>
          <button
            onClick={() => { setForm({ ...blank, issueDate: toLocalDateString(new Date()), taxRate: String(defaultTaxRate) }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[12px] px-3.5 py-2 rounded-full transition-colors"
          >
            <Plus size={14} /> New Invoice
          </button>
        </div>
      </div>

      {/* â"€â"€ Master / Detail layout â"€â"€ */}
      <div className="flex flex-1 overflow-hidden">

        {/* List panel */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Search + filter */}
          <div className="px-3 py-3 border-b border-white/[0.05] space-y-2 flex-shrink-0">
            <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
              <Search size={13} className="text-white/30 flex-shrink-0" />
              <input
                className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1 min-w-0"
                placeholder="Search client or number…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxLength={100}
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
                title="No invoices"
                body="Create your first invoice to get paid."
                action={{ label: "Create Invoice", onClick: () => setShowModal(true) }}
              />
            ) : (
              filtered.map((inv) => (
                <InvoiceRow
                  key={inv.id}
                  invoice={inv}
                  currency={currency}
                  onClick={() => router.push(`/invoices/${inv.id}`)}
                />
              ))
            )}
          </div>
        </div>

      </div>

        </div>
      </div>

      {/* â"€â"€ New Invoice Modal â"€â"€ */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/70 backdrop-blur-sm">
          <div className="sheet bg-[#161616] border border-white/[0.08] rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90dvh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-bold text-white">New Invoice</h3>
                <p className="text-[11px] text-white/30 mt-0.5 font-mono">{nextNumber}</p>
              </div>
              <button onClick={() => setShowModal(false)} aria-label="Close" className="w-10 h-10 flex items-center justify-center rounded-full text-white/30 hover:text-white/70 hover:bg-white/5 active:bg-white/10 transition-all -mr-1">
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-scroll overscroll-y-contain p-6 space-y-4" style={{touchAction:"pan-y"}}>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Client Name *</label>
                  <input className={inp} placeholder="Acme Corp" maxLength={100}
                    value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Client Email</label>
                  <input className={inp} type="email" placeholder="client@example.com" maxLength={100}
                    value={form.clientEmail} onChange={(e) => setForm((f) => ({ ...f, clientEmail: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={lbl}>Client Address</label>
                <input className={inp} placeholder="123 Main St, City, Province" maxLength={200}
                  value={form.clientAddress} onChange={(e) => setForm((f) => ({ ...f, clientAddress: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={lbl}>Status</label>
                  <CustomSelect
                    className={inp}
                    value={form.status}
                    onChange={(v) => setForm((f) => ({ ...f, status: v as InvForm["status"] }))}
                    options={[
                      { value: "draft", label: "Draft" },
                      { value: "sent", label: "Sent" },
                      { value: "paid", label: "Paid" },
                      { value: "overdue", label: "Overdue" },
                    ]}
                  />
                </div>
                <div>
                  <label className={lbl}>Issue Date</label>
                  <input className={inp} type="date" value={form.issueDate}
                    onChange={(e) => setForm((f) => ({ ...f, issueDate: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Due Date</label>
                  <input className={inp} type="date" value={form.dueDate}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className={lbl} style={{ marginBottom: 0 }}>Line Items</label>
                  <button onClick={addItem} className="text-[11px] text-amber-400 hover:text-amber-300 font-semibold transition-colors">+ Add line</button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid sm:grid-cols-[1fr_56px_80px_20px] gap-1.5 text-[9px] font-bold text-white/25 uppercase tracking-wider px-1">
                    <span>Description</span><span>Qty</span><span>Rate</span><span />
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="space-y-2 sm:space-y-0 sm:grid sm:grid-cols-[1fr_56px_80px_20px] sm:gap-1.5 sm:items-center bg-white/[0.03] sm:bg-transparent rounded-lg p-2 sm:p-0">
                      <input className={inp} placeholder="Description (e.g. Labour)" maxLength={200} value={item.description}
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
                  <input className={inp} type="number" placeholder="13" min="0" max="100" step="0.01" value={form.taxRate}
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
                <label className={lbl}>Notes</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="Payment terms, bank details…" maxLength={1000}
                  value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex-shrink-0 flex gap-3 px-5 pb-5 pt-3 border-t border-white/[0.06]">
              <button onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={!form.clientName.trim()}
                className="flex-1 py-2.5 rounded-full text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}

    </>
  );
}








