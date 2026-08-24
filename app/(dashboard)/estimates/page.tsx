"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { isAdminOrAbove } from "@/lib/permissions";
import {
  Plus, Search, Send, CheckCircle2, XCircle, Clock,
  Lock, Trash2, X, FileText, FileDown, Eye, ChevronRight, Pencil, Mail,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency, formatCurrencyCompact } from "@/lib/currency";
import { useT } from "@/lib/i18n";
import type { Estimate } from "@/lib/mock-data";
import { exportEstimatePdf } from "@/lib/pdf-export";
import { ConfirmModal } from "@/components/confirm-modal";
import { CustomSelect } from "@/components/ui/custom-select";

// ── Status config ─────────────────────────────────────────────────────────────
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

// ── Estimate detail panel ────────────────────────────────────────────────────

function EstimateDetail({
  estimate, currency, companyName, companyLogo,
  onUpdate, onDelete, onEdit, onConvert, onClose,
}: {
  estimate: Estimate;
  currency: string;
  companyName: string;
  companyLogo: string;
  onUpdate: (id: string, u: Partial<Estimate>) => void;
  onDelete: (id: string) => void;
  onEdit: (estimate: Estimate) => void;
  onConvert: (estimate: Estimate) => void;
  onClose: () => void;
}) {
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [sendLoading, setSendLoading]   = useState(false);
  const [sendStatus, setSendStatus]     = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!sendStatus) return;
    const t = setTimeout(() => setSendStatus(null), 4000);
    return () => clearTimeout(t);
  }, [sendStatus]);

  const sub   = estimate.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax   = sub * (estimate.taxRate / 100);
  const total = sub + tax;
  const cfg       = STATUS_CONFIG[estimate.status];
  const isDraft   = estimate.status === "draft";
  const isSent    = estimate.status === "sent";
  const isAccepted = estimate.status === "accepted";
  const isDeclined = estimate.status === "declined";
  const isExpired = estimate.validUntil < new Date() && isSent;

  return (
    <div className="flex flex-col h-full">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] flex-shrink-0 bg-[#0d0d0d]">
        <div className="flex items-center gap-2.5">
          <button onClick={onClose} aria-label="Back" className="lg:hidden p-1.5 rounded-lg text-white/30 hover:text-white/60 transition-colors">
            <ChevronRight size={15} className="rotate-180" />
          </button>
          <span className="font-mono text-[12px] text-white/35 tracking-wider">{estimate.number}</span>
          <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
            {cfg.label}
          </span>
          {isExpired && (
            <span className="text-[10px] text-red-400 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full">EXPIRED</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {sendStatus && (
            <span className={`text-[11px] font-semibold mr-2 ${sendStatus.ok ? "text-emerald-400" : "text-red-400"}`}>
              {sendStatus.msg}
            </span>
          )}
          {/* Email send button */}
          <button
            disabled={sendLoading || !estimate.clientEmail}
            onClick={async () => {
              if (!estimate.clientEmail) return;
              setSendLoading(true);
              try {
                const amountStr = formatCurrency(Math.round(total), currency as never);
                const validStr = estimate.validUntil.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
                const res = await fetch("/api/invoice/email", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    to: estimate.clientEmail,
                    invoiceNumber: estimate.number,
                    clientName: estimate.clientName,
                    amount: amountStr,
                    dueDate: validStr,
                    companyName,
                    notes: estimate.notes,
                    isReminder: false,
                  }),
                });
                if (res.ok) {
                  if (isDraft) onUpdate(estimate.id, { status: "sent" });
                  setSendStatus({ ok: true, msg: `Sent to ${estimate.clientEmail}` });
                } else {
                  setSendStatus({ ok: false, msg: "Failed — check RESEND_API_KEY in Vercel." });
                }
              } catch {
                setSendStatus({ ok: false, msg: "Network error." });
              } finally {
                setSendLoading(false);
              }
            }}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <Mail size={13} />
            {sendLoading ? "Sending…" : "Send"}
          </button>
          {/* PDF button */}
          <button
            onClick={async () => {
              setPdfLoading(true);
              try { await exportEstimatePdf(estimate, currency, companyName); }
              finally { setPdfLoading(false); }
            }}
            disabled={pdfLoading}
            className="flex items-center gap-1.5 text-[12px] font-semibold text-white/50 hover:text-white bg-white/[0.05] hover:bg-white/[0.09] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <FileDown size={13} /> {pdfLoading ? "…" : "PDF"}
          </button>
          <button onClick={() => onEdit(estimate)} aria-label="Edit estimate"
            className="p-1.5 rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => setDeleteConfirm(true)} aria-label="Delete estimate"
            className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* ── Estimate document (white-paper preview) ── */}
      <div className="flex-1 overflow-y-auto bg-[#1a1a1a]">
        <div className="max-w-[640px] mx-auto my-6 px-4 sm:px-0">
          <div className="bg-white rounded-2xl overflow-hidden shadow-2xl shadow-black/60 text-[#161616]">

            {/* ── Header ── */}
            <div className="px-8 pt-8 pb-6 border-b border-gray-100">
              <div className="flex items-start justify-between gap-4">
                {/* Logo + company */}
                <div className="flex items-center gap-4 min-w-0">
                  {companyLogo ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-amber-50">
                      <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/30">
                      <span className="text-white text-[22px] font-black">{(companyName ?? "C").charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[17px] font-black text-amber-600 leading-tight truncate">{companyName}</p>
                  </div>
                </div>
                {/* Estimate type + number + total */}
                <div className="text-right flex-shrink-0">
                  <p className="text-[30px] font-black text-gray-800 leading-none tracking-tight">ESTIMATE</p>
                  <p className="text-[12px] text-gray-400 mt-0.5 font-mono">#{estimate.number}</p>
                  <div className="mt-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-bold">Total Amount</p>
                    <p className="text-[24px] font-black text-gray-900 leading-tight">
                      {formatCurrency(Math.round(total), currency as never)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Status banners ── */}
            {isAccepted && (
              <div className="mx-8 mt-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                <CheckCircle2 size={15} className="text-emerald-600 flex-shrink-0" />
                <p className="text-[12px] font-bold text-emerald-700">Estimate Accepted</p>
              </div>
            )}
            {isDeclined && (
              <div className="mx-8 mt-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <XCircle size={15} className="text-red-600 flex-shrink-0" />
                <p className="text-[12px] font-bold text-red-700">Estimate Declined</p>
              </div>
            )}
            {isExpired && (
              <div className="mx-8 mt-5 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
                <Clock size={15} className="text-orange-500 flex-shrink-0" />
                <p className="text-[12px] font-bold text-orange-700">Estimate expired — was valid until {estimate.validUntil.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}</p>
              </div>
            )}

            {/* ── Bill To / Dates ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0 px-8 pt-6 pb-5 border-b border-gray-100">
              <div className="sm:col-span-2 pr-6 sm:border-r border-gray-100 mb-4 sm:mb-0">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Prepared For</p>
                <p className="text-[14px] font-bold text-amber-600">{estimate.clientName}</p>
                {estimate.clientEmail && (
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                    <Mail size={10} className="text-gray-300" />
                    {estimate.clientEmail}
                  </p>
                )}
                {estimate.projectName && (
                  <div className="mt-2">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Project</p>
                    <p className="text-[12px] text-gray-700 font-semibold">{estimate.projectName}</p>
                  </div>
                )}
              </div>
              <div className="px-0 sm:px-6 space-y-3">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Issue Date</p>
                  <p className="text-[12px] text-gray-700 font-semibold">
                    {estimate.issueDate.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Valid Until</p>
                  <p className={`text-[12px] font-semibold ${isExpired ? "text-red-600" : "text-gray-700"}`}>
                    {estimate.validUntil.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-0.5">Status</p>
                  <p className="text-[12px] text-gray-700 font-semibold">{STATUS_CONFIG[estimate.status].label}</p>
                </div>
              </div>
            </div>

            {/* ── Line items ── */}
            <div className="px-8 pt-5 pb-2">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-amber-500 text-white">
                    <th className="text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 rounded-tl-lg w-8">#</th>
                    <th className="text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3">Description</th>
                    <th className="text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 w-24 hidden sm:table-cell">Category</th>
                    <th className="text-center text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 w-12">Qty</th>
                    <th className="text-right text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 w-24">Rate</th>
                    <th className="text-right text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 rounded-tr-lg w-28">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {estimate.items.map((item, i) => (
                    <tr key={i} className={`border-b border-gray-100 ${i % 2 === 1 ? "bg-gray-50" : ""}`}>
                      <td className="py-3.5 px-3 text-gray-400 text-center">{i + 1}</td>
                      <td className="py-3.5 px-3 text-gray-800 font-medium">{item.description}</td>
                      <td className="py-3.5 px-3 text-gray-400 hidden sm:table-cell">{item.category}</td>
                      <td className="py-3.5 px-3 text-center text-gray-500">{item.qty}</td>
                      <td className="py-3.5 px-3 text-right text-gray-500">{formatCurrency(item.rate, currency as never)}</td>
                      <td className="py-3.5 px-3 text-right text-gray-800 font-bold">{formatCurrency(item.qty * item.rate, currency as never)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Totals ── */}
            <div className="px-8 pt-4 pb-6 flex justify-end">
              <div className="w-72">
                <div className="flex justify-between py-2 text-[12px]">
                  <span className="text-gray-500">Sub Total</span>
                  <span className="text-gray-800 font-semibold">{formatCurrency(sub, currency as never)}</span>
                </div>
                {estimate.taxRate > 0 && (
                  <div className="flex justify-between py-2 text-[12px] border-b border-gray-100">
                    <span className="text-gray-500">Tax Rate &nbsp; {estimate.taxRate}%</span>
                    <span className="text-gray-800 font-semibold">{formatCurrency(tax, currency as never)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 text-[13px] border-b border-gray-200">
                  <span className="text-gray-700 font-bold">Total</span>
                  <span className="text-gray-900 font-bold">{formatCurrency(Math.round(total), currency as never)}</span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 mt-1 rounded-xl bg-amber-500">
                  <span className="text-[13px] font-black text-white">Estimate Total</span>
                  <span className="text-[18px] font-black text-white">
                    {formatCurrency(Math.round(total), currency as never)}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Notes ── */}
            {estimate.notes && (
              <div className="mx-8 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Notes &amp; Scope</p>
                <p className="text-[12px] text-gray-600 leading-relaxed">{estimate.notes}</p>
              </div>
            )}

            {/* ── Terms ── */}
            <div className="mx-8 mb-8">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Terms &amp; Conditions</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">This estimate is valid until the date stated above. Prices are subject to change after expiry. Acceptance of this estimate constitutes agreement to the stated scope and pricing.</p>
            </div>

            {/* ── Footer band ── */}
            <div className="bg-amber-500 px-8 py-3 flex items-center justify-between">
              <p className="text-[10px] text-white/80 font-medium">{companyName} · {estimate.number}</p>
              <p className="text-[10px] text-white/60">Page 1</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Action bar ── */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-t border-white/[0.06] flex-shrink-0 bg-[#0d0d0d]">
        {isDraft && (
          <button onClick={() => onUpdate(estimate.id, { status: "sent" })}
            className="flex items-center gap-1.5 text-[12px] font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-lg transition-colors">
            <Send size={13} /> Mark as Sent
          </button>
        )}
        {isSent && (
          <>
            <button onClick={() => onUpdate(estimate.id, { status: "accepted" })}
              className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-4 py-2 rounded-lg transition-colors">
              <CheckCircle2 size={13} /> Mark Accepted
            </button>
            <button onClick={() => onUpdate(estimate.id, { status: "declined" })}
              className="flex items-center gap-1.5 text-[12px] font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-2 rounded-lg transition-colors">
              <XCircle size={12} /> Mark Declined
            </button>
          </>
        )}
        {isAccepted && (
          <button onClick={() => onConvert(estimate)}
            className="flex items-center gap-1.5 text-[12px] font-bold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 rounded-lg transition-colors">
            <FileDown size={13} /> Convert to Invoice
          </button>
        )}
        {isDeclined && (
          <span className="flex items-center gap-1.5 text-[12px] font-bold text-red-400">
            <XCircle size={13} /> Declined
          </span>
        )}
        <div className="ml-auto text-[11px] text-white/20">
          {estimate.items.length} line item{estimate.items.length !== 1 ? "s" : ""}
        </div>
      </div>

      <ConfirmModal
        open={deleteConfirm}
        title={`Delete ${estimate.number}?`}
        body="This estimate will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => { onDelete(estimate.id); onClose(); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}

// ── Estimate list row ────────────────────────────────────────────────────────

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

// ── Main page ────────────────────────────────────────────────────────────────

export default function EstimatesPage() {
  const { estimates, addEstimate, updateEstimate, deleteEstimate, invoices, addInvoice, currency, companyName, companyLogo, currentUser, defaultTaxRate } = useStore();
  const router = useRouter();
  const t = useT();

  useEffect(() => {
    if (!isAdminOrAbove(currentUser.role)) router.replace("/dashboard");
  }, [currentUser.role, router]);

  const [search, setSearch]           = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Estimate["status"]>("all");
  const [showModal, setShowModal]     = useState(false);
  const [editId, setEditId]           = useState<string | null>(null);
  const [form, setForm]               = useState<EstForm>(blank);
  const [selectedId, setSelectedId]   = useState<string | null>(estimates[0]?.id ?? null);
  const [mobilePreviewId, setMobilePreviewId] = useState<string | null>(null);
  const [convertedNotice, setConvertedNotice] = useState<string | null>(null);
  const convertedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // estimates arrives asynchronously from the store (Supabase load after mount) —
  // auto-selecting the first one once it's actually available.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!selectedId && estimates[0]?.id) setSelectedId(estimates[0].id);
  }, [estimates, selectedId]);

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
    if (convertedTimerRef.current) clearTimeout(convertedTimerRef.current);
    convertedTimerRef.current = setTimeout(() => setConvertedNotice(null), 5000);
  };

  const filtered = estimates.filter((e) => {
    if (statusFilter !== "all" && e.status !== statusFilter) return false;
    const q = search.toLowerCase();
    return !q || e.projectName.toLowerCase().includes(q) || e.clientName.toLowerCase().includes(q) || e.number.toLowerCase().includes(q);
  });

  const selectedEstimate = selectedId !== null
    ? (filtered.find((e) => e.id === selectedId) ?? filtered[0] ?? null)
    : null;

  const totalPending = estimates
    .filter((e) => e.status === "sent")
    .reduce((s, e) => s + estimateTotal(e), 0);
  const totalAccepted = estimates
    .filter((e) => e.status === "accepted")
    .reduce((s, e) => s + estimateTotal(e), 0);
  const declinedCount = estimates.filter((e) => e.status === "declined").length;

  const nextNumber = (() => {
    const nums = estimates.map((e) => parseInt(e.number.replace("EST-", "")) || 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `EST-${String(max + 1).padStart(3, "0")}`;
  })();

  const updateItem = (idx: number, field: keyof LineItem, val: string) =>
    setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));
  const addItem    = () => setForm((f) => ({ ...f, items: [...f.items, blankItem()] }));
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
    setForm({ ...blank, taxRate: String(defaultTaxRate) });
    setEditId(null);
    setShowModal(false);
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
      {/* ══════════════ MOBILE ══════════════ */}
      <div className="lg:hidden -mx-4 -mt-4 pb-6">
        {convertedNotice && (
          <div className="flex items-center justify-between gap-3 mx-4 mt-4 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <p className="text-[13px] text-emerald-400 font-semibold">Invoice {convertedNotice} created — find it in Invoices.</p>
            <button onClick={() => setConvertedNotice(null)} className="text-emerald-400/50 hover:text-emerald-400">✕</button>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <h1 className="text-[22px] font-black text-white">Estimates</h1>
          <button
            onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0], taxRate: String(defaultTaxRate) }); setShowModal(true); }}
            className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[12px] px-3 py-2 rounded-lg transition-colors"
          >
            <Plus size={13} /> New Estimate
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 px-4 mb-3">
          <div className="bg-[#131110] border border-white/[0.07] rounded-2xl p-3">
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">Pending</p>
            <p className="text-[15px] font-black text-amber-400">{formatCurrencyCompact(Math.round(totalPending), currency as never)}</p>
          </div>
          <div className="bg-[#131110] border border-white/[0.07] rounded-2xl p-3">
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">Accepted</p>
            <p className="text-[15px] font-black text-emerald-400">{formatCurrencyCompact(Math.round(totalAccepted), currency as never)}</p>
          </div>
          <div className="bg-[#131110] border border-white/[0.07] rounded-2xl p-3">
            <p className="text-[9px] font-bold text-white/30 uppercase tracking-wider mb-0.5">Declined</p>
            <p className={`text-[15px] font-black ${declinedCount > 0 ? "text-red-400" : "text-white/30"}`}>{declinedCount}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-2 bg-white/[0.05] mx-4 mb-3 px-3 py-2.5 rounded-xl">
          <Search size={13} className="text-white/30" />
          <input
            className="bg-transparent text-[13px] text-white/70 placeholder:text-white/25 outline-none flex-1"
            placeholder="Search project or client…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1.5 px-4 pb-3 overflow-x-auto no-scrollbar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors ${statusFilter === tab.key ? "bg-amber-500/15 text-amber-400" : "text-white/35 bg-white/[0.04]"}`}
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
          <div className="text-center py-16 text-white/25 space-y-2 px-4">
            <FileText size={32} className="mx-auto opacity-30" />
            <p className="text-[13px]">No estimates</p>
            <button onClick={() => setShowModal(true)} className="text-amber-400 text-[12px]">+ Create one</button>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {filtered.map((est) => {
              const total = estimateTotal(est);
              const cfg = STATUS_CONFIG[est.status];
              const isAccepted = est.status === "accepted";
              const isDeclined = est.status === "declined";
              return (
                <button
                  key={est.id}
                  onClick={() => setMobilePreviewId(est.id)}
                  className="px-4 py-3.5 w-full text-left active:bg-white/[0.03] transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[10px] text-white/30">{est.number}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      <p className="text-[14px] font-semibold text-white/90 truncate">{est.projectName}</p>
                      <p className="text-[11px] mt-0.5 text-white/35">{est.clientName}</p>
                    </div>
                    <p className={`text-[16px] font-black flex-shrink-0 ${isAccepted ? "text-emerald-400" : isDeclined ? "text-red-400" : "text-white"}`}>
                      {formatCurrencyCompact(Math.round(total), currency as never)}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ══════════════ DESKTOP ══════════════ */}
      <div className="hidden lg:block h-full">
        <div className="h-full flex flex-col -m-4 md:-m-6">

          {/* ── Top stats bar ── */}
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
            {convertedNotice && (
              <div className="flex items-center gap-3 px-4 py-3 border-r border-white/[0.05] bg-emerald-500/5">
                <p className="text-[12px] text-emerald-400 font-semibold">Invoice {convertedNotice} created!</p>
                <button onClick={() => setConvertedNotice(null)} className="text-emerald-400/50 hover:text-emerald-400">✕</button>
              </div>
            )}
            <div className="flex items-center gap-2 px-5 py-3.5 ml-auto flex-shrink-0">
              <div className="flex items-center gap-1.5 text-[10px] text-amber-400/70 bg-amber-500/10 px-2.5 py-1 rounded-full">
                <Lock size={9} /> Private
              </div>
              <button
                onClick={() => { setEditId(null); setForm({ ...blank, issueDate: new Date().toISOString().split("T")[0], taxRate: String(defaultTaxRate) }); setShowModal(true); }}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-black font-bold text-[12px] px-3.5 py-2 rounded-lg transition-colors"
              >
                <Plus size={14} /> New Estimate
              </button>
            </div>
          </div>

          {/* ── Master / Detail layout ── */}
          <div className="flex flex-1 overflow-hidden">

            {/* Left: list panel */}
            <div className={`flex flex-col border-r border-white/[0.06] flex-shrink-0 ${selectedId !== null ? "hidden lg:flex w-72 xl:w-80" : "flex w-full"}`}>
              {/* Search + filter */}
              <div className="px-3 py-3 border-b border-white/[0.05] space-y-2 flex-shrink-0">
                <div className="flex items-center gap-2 bg-white/[0.04] rounded-lg px-3 py-2">
                  <Search size={13} className="text-white/30 flex-shrink-0" />
                  <input
                    className="bg-transparent text-[12px] text-white/70 placeholder:text-white/25 outline-none flex-1 min-w-0"
                    placeholder="Search project or client…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-1 overflow-x-auto pb-0.5">
                  {TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setStatusFilter(tab.key)}
                      className={`flex-shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors ${
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
                  <div className="flex flex-col items-center gap-2 py-16 text-white/25">
                    <FileText size={28} className="opacity-40" />
                    <p className="text-[13px]">No estimates</p>
                    <button onClick={() => setShowModal(true)} className="text-[12px] text-amber-400 hover:text-amber-300 transition-colors">
                      + Create one
                    </button>
                  </div>
                ) : (
                  filtered.map((est) => (
                    <EstimateRow
                      key={est.id}
                      estimate={est}
                      currency={currency}
                      selected={selectedEstimate?.id === est.id}
                      onClick={() => setSelectedId(est.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Right: detail panel */}
            {selectedEstimate ? (
              <div className="flex-1 overflow-hidden flex flex-col">
                <EstimateDetail
                  estimate={selectedEstimate}
                  currency={currency}
                  companyName={companyName}
                  companyLogo={companyLogo ?? ""}
                  onUpdate={updateEstimate}
                  onDelete={(id) => { deleteEstimate(id); setSelectedId(null); }}
                  onEdit={openEdit}
                  onConvert={handleConvertToInvoice}
                  onClose={() => setSelectedId(null)}
                />
              </div>
            ) : (
              <div className="hidden lg:flex flex-1 items-center justify-center flex-col gap-3 text-white/20">
                <Eye size={36} className="opacity-40" />
                <p className="text-[14px]">Select an estimate to preview</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── New / Edit Estimate Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161616] border border-white/[0.08] rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/[0.06]">
              <div>
                <h3 className="text-[15px] font-bold text-white">{editId ? "Edit Estimate" : "New Estimate"}</h3>
                {!editId && <p className="text-[11px] text-white/30 mt-0.5 font-mono">{nextNumber}</p>}
              </div>
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
                  <div className="grid grid-cols-[80px_1fr_56px_80px_20px] gap-1.5 text-[9px] font-bold text-white/25 uppercase tracking-wider px-1">
                    <span>Category</span><span>Description</span><span>Qty</span><span>Rate ($)</span><span />
                  </div>
                  {form.items.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-[80px_1fr_56px_80px_20px] gap-1.5 items-center">
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
                      <button onClick={() => removeItem(idx)} className="text-white/20 hover:text-red-400 transition-colors p-1">
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
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2.5">
                      <p className="text-[9px] text-amber-400/60 uppercase tracking-widest font-bold">Total</p>
                      <p className="text-[20px] font-black text-amber-400 leading-tight">{formatCurrency(Math.round(previewTotal), currency as never)}</p>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className={lbl}>Notes &amp; Scope</label>
                <textarea className={inp + " resize-none"} rows={2} placeholder="Scope, assumptions, exclusions…"
                  value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => { setShowModal(false); setEditId(null); }}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white/40 bg-white/5 hover:bg-white/8 transition-colors">
                {t.common.cancel}
              </button>
              <button onClick={handleSave} disabled={!form.projectName.trim() || !form.clientName.trim()}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {editId ? "Save Changes" : "Create Estimate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile preview modal ── */}
      {mobilePreviewId && (() => {
        const est = estimates.find((e) => e.id === mobilePreviewId);
        if (!est) return null;
        return (
          <div className="lg:hidden fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col">
            <EstimateDetail
              estimate={est}
              currency={currency}
              companyName={companyName}
              companyLogo={companyLogo ?? ""}
              onUpdate={(id, u) => updateEstimate(id, u)}
              onDelete={(id) => { deleteEstimate(id); setMobilePreviewId(null); }}
              onEdit={(e) => { setMobilePreviewId(null); openEdit(e); }}
              onConvert={(e) => { handleConvertToInvoice(e); setMobilePreviewId(null); }}
              onClose={() => setMobilePreviewId(null)}
            />
          </div>
        );
      })()}
    </>
  );
}
