"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import { Plus, Search, Send, CheckCircle2, XCircle, Clock, Lock, Trash2, X, FileText, FileDown, Pencil } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import type { Estimate } from "@/lib/mock-data";
import { exportEstimatePdf } from "@/lib/pdf-export";
import { ConfirmModal } from "@/components/confirm-modal";
import { CustomSelect, type SelectOption } from "@/components/ui/custom-select";

const STATUS_CONFIG = {
  draft: { label: "Draft", className: "bg-white/8 text-white/45", icon: Clock },
  sent: { label: "Sent", className: "bg-blue-500/15 text-blue-400", icon: Send },
  accepted: { label: "Accepted", className: "bg-green-500/15 text-green-400", icon: CheckCircle2 },
  declined: { label: "Declined", className: "bg-red-500/15 text-red-400", icon: XCircle },
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

function EstimateCard({ estimate, onUpdate, onDelete, onConvert, onEdit, currency, companyName }: { estimate: Estimate; onUpdate: (id: string, u: Partial<Estimate>) => void; onDelete: (id: string) => void; onConvert: (estimate: Estimate) => void; onEdit: (estimate: Estimate) => void; currency: string; companyName?: string }) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const subtotal = estimate.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = subtotal * (estimate.taxRate / 100);
  const total = subtotal + tax;
  const cfg = STATUS_CONFIG[estimate.status];
  const StatusIcon = cfg.icon;
  const isExpired = estimate.validUntil < new Date() && estimate.status === "sent";

  return (
    <div className="bg-[#111111] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/10 transition-all group">
      <div className="flex items-start justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
        <div>
          <p className="text-[11px] text-white/30 font-mono">{estimate.number}</p>
          <p className="text-[14px] font-bold text-white">{estimate.projectName}</p>
          <p className="text-[12px] text-white/45 mt-0.5">{estimate.clientName}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-full ${cfg.className}`}>
              <StatusIcon size={10} />
              {cfg.label}
            </span>
            <button onClick={() => onEdit(estimate)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white/60 transition-all p-1">
              <Pencil size={13} />
            </button>
            <button onClick={() => setDeleteConfirm(true)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all p-1">
              <Trash2 size={13} />
            </button>
          </div>
          {isExpired && <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">EXPIRED</span>}
        </div>
      </div>

      <div className="px-5 py-3">
        <div className="space-y-1.5 mb-3">
          {estimate.items.slice(0, 3).map((item, i) => (
            <div key={i} className="flex items-center justify-between text-[12px]">
              <span className="text-white/55 truncate flex-1 pr-2">{item.description}</span>
              <span className="text-white/70 font-semibold flex-shrink-0">{formatCurrency(item.qty * item.rate, currency as never)}</span>
            </div>
          ))}
          {estimate.items.length > 3 && <p className="text-[11px] text-white/25 italic">+{estimate.items.length - 3} more line items</p>}
        </div>
        <div className="border-t border-white/[0.06] pt-3 space-y-1">
          <div className="flex items-center justify-between text-[12px]">
            <span className="text-white/35">Subtotal</span>
            <span className="text-white/60">{formatCurrency(subtotal, currency as never)}</span>
          </div>
          {estimate.taxRate > 0 && (
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-white/35">Tax ({estimate.taxRate}%)</span>
              <span className="text-white/60">{formatCurrency(Math.round(tax), currency as never)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-[14px] font-bold pt-1">
            <span className="text-white">Total</span>
            <span className="text-amber-400">{formatCurrency(Math.round(total), currency as never)}</span>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 text-[11px] text-white/30">
          <span>Issued {estimate.issueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</span>
          <span>Valid until {estimate.validUntil.toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 px-5 pb-4 flex-wrap">
        {estimate.status === "draft" && (
          <button onClick={() => onUpdate(estimate.id, { status: "sent" })}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/15 px-3 py-1.5 rounded-lg transition-colors">
            <Send size={12} />
            Mark Sent
          </button>
        )}
        {estimate.status === "sent" && (
          <>
            <button onClick={() => onUpdate(estimate.id, { status: "accepted" })}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-green-400 hover:text-green-300 bg-green-500/10 hover:bg-green-500/15 px-3 py-1.5 rounded-lg transition-colors">
              <CheckCircle2 size={12} />
              Accepted
            </button>
            <button onClick={() => onUpdate(estimate.id, { status: "declined" })}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-lg transition-colors">
              <XCircle size={12} />
              Declined
            </button>
          </>
        )}
        {estimate.status === "accepted" && (
          <button onClick={() => onConvert(estimate)}
            className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 px-3 py-1.5 rounded-lg transition-colors">
            <FileDown size={12} />
            Convert to Invoice
          </button>
        )}
        <button
          onClick={async () => {
            setPdfLoading(true);
            try { await exportEstimatePdf(estimate, currency, companyName); }
            finally { setPdfLoading(false); }
          }}
          disabled={pdfLoading}
          className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/15 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
        >
          <FileText size={12} />
          {pdfLoading ? "…" : "PDF"}
        </button>
      </div>
      <ConfirmModal
        open={deleteConfirm}
        title={`Delete ${estimate.number}?`}
        body="This estimate will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => { onDelete(estimate.id); setDeleteConfirm(false); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

export default function EstimatesPage() {
  const { estimates, addEstimate, updateEstimate, deleteEstimate, invoices, addInvoice, currency, companyName, currentUser } = useStore();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!isAdminOrAbove(currentUser.role)) router.replace("/dashboard");
  }, [currentUser.role, router]);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [convertedMsg, setConvertedMsg] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EstForm>(blank);
  const [convertedNotice, setConvertedNotice] = useState<string | null>(null);

  const openEdit = (estimate: Estimate) => {
    setEditId(estimate.id);
    setForm({
      projectName: estimate.projectName,
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      status: estimate.status,
      issueDate: estimate.issueDate.toISOString().split("T")[0],
      validUntil: estimate.validUntil.toISOString().split("T")[0],
      taxRate: estimate.taxRate.toString(),
      notes: estimate.notes ?? "",
      items: estimate.items.map((i) => ({ description: i.description, qty: i.qty.toString(), rate: i.rate.toString(), category: i.category ?? "Labour" })),
    });
    setShowModal(true);
  };

  const handleConvertToInvoice = (estimate: Estimate) => {
    const nums = invoices.map((i) => parseInt(i.number.replace(/\D/g, ""), 10)).filter(Boolean);
    const max = nums.length ? Math.max(...nums) : 0;
    const nextInvNum = `INV-${new Date().getFullYear()}-${String(max + 1).padStart(3, "0")}`;
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + 30);
    addInvoice({
      number: nextInvNum,
      clientName: estimate.clientName,
      clientEmail: estimate.clientEmail,
      clientAddress: "",
      issueDate: now,
      dueDate,
      status: "draft",
      items: estimate.items.map(({ description, qty, rate }) => ({ description, qty, rate })),
      taxRate: estimate.taxRate,
      notes: estimate.notes,
    });
    setConvertedNotice(nextInvNum);
  };

  const filtered = estimates.filter(
    (e) => e.projectName.toLowerCase().includes(search.toLowerCase()) ||
      e.clientName.toLowerCase().includes(search.toLowerCase()) ||
      e.number.toLowerCase().includes(search.toLowerCase())
  );

  const totalPending = estimates.filter((e) => e.status === "sent")
    .reduce((s, e) => s + e.items.reduce((ss, i) => ss + i.qty * i.rate, 0) * (1 + e.taxRate / 100), 0);

  const nextNumber = (() => {
    const nums = estimates.map((e) => parseInt(e.number.replace("EST-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `EST-${String(max + 1).padStart(3, "0")}`;
  })();

  const updateItem = (idx: number, field: keyof LineItem, val: string) => {
    setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
  const removeItem = (idx: number) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = () => {
    if (!form.projectName.trim() || !form.clientName.trim()) return;
    const items = form.items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description.trim(), qty: parseFloat(i.qty) || 1, rate: parseFloat(i.rate) || 0, category: i.category }));
    if (editId) {
      updateEstimate(editId, {
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
    } else {
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
    }
    setForm(blank);
    setEditId(null);
    setShowModal(false);
  };

  const previewTotal = form.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0) * (1 + (parseFloat(form.taxRate) || 0) / 100);

  return (
    <>
      {/* MOBILE */}
      <div className="lg:hidden -mx-4 -mt-4 pb-6">
        {convertedNotice && (
          <div className="flex items-center justify-between gap-3 mx-4 mt-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-[13px] text-emerald-400 font-semibold">Invoice {convertedNotice} created — find it in Invoices.</p>
            <button onClick={() => setConvertedNotice(null)} className="text-emerald-400/50 hover:text-emerald-400 transition-colors">✕</button>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 bg-[#0d0c0b] border-b border-white/[0.06]">
          <div>
            <h1 className="text-[15px] font-bold text-white">Estimates</h1>
            <p className="text-[11px] text-white/35">{estimates.filter((e) => e.status === "sent").length} awaiting &bull; {formatCurrencyCompact(totalPending, currency as never)} pending</p>
          </div>
          <button
            onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0] }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-[12px] font-bold px-3 py-1.5 rounded-lg transition-colors">
            <Plus size={13} /> New
          </button>
        </div>

        <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar">
          {[
            { label: "Draft", count: estimates.filter((e) => e.status === "draft").length, color: "text-white/50" },
            { label: "Sent", count: estimates.filter((e) => e.status === "sent").length, color: "text-blue-400" },
            { label: "Accepted", count: estimates.filter((e) => e.status === "accepted").length, color: "text-green-400" },
            { label: "Declined", count: estimates.filter((e) => e.status === "declined").length, color: "text-red-400" },
          ].map(({ label, count, color }) => (
            <div key={label} className="flex-shrink-0 bg-[#131110] border border-white/[0.07] rounded-xl px-4 py-2 text-center">
              <p className={`text-[18px] font-bold ${color}`}>{count}</p>
              <p className="text-[10px] text-white/30">{label}</p>
            </div>
          ))}
        </div>

        <div className="px-4 mb-4">
          <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
            <Search size={13} className="text-white/30 flex-shrink-0" />
            <input className="flex-1 bg-transparent text-[13px] text-white/80 placeholder:text-white/25 outline-none"
              placeholder="Search estimates..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="px-4 space-y-3">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-white/30 text-[13px]">No estimates found</div>
          ) : filtered.map((e) => {
            const total = e.items.reduce((s, i) => s + i.qty * i.rate, 0) * (1 + e.taxRate / 100);
            const cfg = STATUS_CONFIG[e.status];
            const StatusIcon = cfg.icon;
            return (
              <div key={e.id} className="bg-[#131110] border border-white/[0.07] rounded-2xl p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-mono text-white/30">{e.number}</p>
                    <p className="text-[13px] font-bold text-white/90 mt-0.5">{e.projectName}</p>
                    <p className="text-[11px] text-white/40">{e.clientName}</p>
                  </div>
                  <span className={`flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0 ${cfg.className}`}>
                    <StatusIcon size={10} />
                    {cfg.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-[16px] font-bold text-white/85">{formatCurrency(Math.round(total), currency as never)}</p>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(e)} className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.09] text-white/50 transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0] }); setShowModal(true); }} className="hidden" />
                  </div>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0] }); setShowModal(true); }}
            className="w-full py-4 border-2 border-dashed border-white/[0.07] rounded-2xl text-[13px] text-white/30 hover:text-white/50 hover:border-amber-500/30 transition-all">
            + New Estimate
          </button>
        </div>
      </div>

      {/* DESKTOP */}
      <div className="hidden lg:block space-y-5 max-w-[1000px]">
      {convertedNotice && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <p className="text-[13px] text-emerald-400 font-semibold">Invoice {convertedNotice} created — find it in Invoices.</p>
          <button onClick={() => setConvertedNotice(null)} className="text-emerald-400/50 hover:text-emerald-400 transition-colors">✕</button>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-bold text-white tracking-tight">Estimates</h2>
            <div className="flex items-center gap-1 bg-amber-500/15 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full">
              <Lock size={9} />
              Private — only you can see these
            </div>
          </div>
          <p className="text-white/35 text-sm">
            {estimates.filter((e) => e.status === "sent").length} awaiting response · {formatCurrencyCompact(totalPending, currency as never)} pending
          </p>
        </div>
        <button onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0] }); setShowModal(true); }}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors">
          <Plus size={15} />
          New Estimate
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Draft", count: estimates.filter((e) => e.status === "draft").length, color: "#64748b" },
          { label: "Sent", count: estimates.filter((e) => e.status === "sent").length, color: "#3b82f6" },
          { label: "Accepted", count: estimates.filter((e) => e.status === "accepted").length, color: "#22c55e" },
          { label: "Declined", count: estimates.filter((e) => e.status === "declined").length, color: "#ef4444" },
        ].map(({ label, count, color }) => (
          <div key={label} className="bg-[#111111] border border-white/[0.06] rounded-xl p-4 text-center">
            <p className="text-2xl font-bold" style={{ color }}>{count}</p>
            <p className="text-[11px] text-white/40 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 bg-[#111111] border border-white/[0.06] rounded-lg px-3 py-2 max-w-64">
        <Search size={13} className="text-white/30" />
        <input className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1"
          placeholder={`${t.common.search} estimates…`} value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {estimates.length === 0 ? (
        <div className="text-center py-16 text-white/25 space-y-2">
          <p className="text-[14px]">No estimates yet</p>
          <button onClick={() => setShowModal(true)} className="text-amber-400 text-[12px] hover:text-amber-300 transition-colors">
            + Create your first estimate
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((e) => (
            <EstimateCard key={e.id} estimate={e} onUpdate={updateEstimate} onDelete={deleteEstimate} onConvert={handleConvertToInvoice} onEdit={openEdit} currency={currency} companyName={companyName} />
          ))}
          <button onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0] }); setShowModal(true); }}
            className="bg-[#111111] border-2 border-dashed border-white/[0.07] rounded-xl p-8 flex flex-col items-center justify-center gap-3 hover:border-amber-500/30 hover:bg-amber-500/[0.02] transition-all cursor-pointer group min-h-[260px]">
            <div className="w-12 h-12 rounded-xl bg-white/5 group-hover:bg-amber-500/10 flex items-center justify-center transition-colors">
              <Plus size={22} className="text-white/25 group-hover:text-amber-400 transition-colors" />
            </div>
            <p className="text-[13px] font-bold text-white/35 group-hover:text-white/55 transition-colors">Create New Estimate</p>
          </button>
        </div>
      )}

      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <h3 className="text-[15px] font-bold text-white">
                {editId ? "Edit Estimate" : <>New Estimate <span className="text-white/30 font-normal text-[13px]">{nextNumber}</span></>}
              </h3>
              <button onClick={() => { setShowModal(false); setEditId(null); }} className="p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Project Name *</label>
                  <input className={inp} placeholder="Westside Condo Framing"
                    value={form.projectName} onChange={(e) => setForm((f) => ({ ...f, projectName: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Client Name *</label>
                  <input className={inp} placeholder="Acme Corp"
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
                  <div className="grid grid-cols-[80px_1fr_60px_80px_20px] gap-1.5 text-[9px] font-bold text-white/25 uppercase tracking-wider px-1">
                    <span>Category</span><span>Description</span><span>Qty</span><span>Rate ($)</span><span />
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[80px_1fr_60px_80px_20px] gap-1.5 items-center">
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
                      <input className={inp} placeholder="Description…" value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)} />
                      <input className={inp} type="number" placeholder="1" value={item.qty}
                        onChange={(e) => updateItem(idx, "qty", e.target.value)} />
                      <input className={inp} type="number" placeholder="0.00" value={item.rate}
                        onChange={(e) => updateItem(idx, "rate", e.target.value)} />
                      <button onClick={() => removeItem(idx)} className="text-white/20 hover:text-red-400 transition-colors">
                        <X size={13} />
                      </button>
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
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                      <p className="text-[10px] text-amber-400/70 uppercase tracking-wide">Total</p>
                      <p className="text-[18px] font-black text-amber-400">{formatCurrency(Math.round(previewTotal), currency as never)}</p>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className={lbl}>Notes</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="Scope, assumptions, exclusions…"
                  value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">{t.common.cancel}</button>
              <button onClick={handleSave} disabled={!form.projectName.trim() || !form.clientName.trim()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Create Estimate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
