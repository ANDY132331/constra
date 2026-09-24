"use client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ChevronLeft, Send, CheckCircle2, XCircle, Clock, Mail,
  FileDown, Link2, Check, Copy, Trash2, Plus, X, Pencil,
} from "lucide-react";
import { useStore } from "@/lib/store";
import { formatCurrency } from "@/lib/currency";
import type { Estimate } from "@/lib/mock-data";
import { exportEstimatePdf } from "@/lib/pdf-export";
import { ConfirmModal } from "@/components/confirm-modal";
import { TemplatePicker, useTemplateChoice } from "@/components/pdf-template-picker";
import type { InvoiceTemplate } from "@/lib/pdf-export";

// ── Paper styles ─────────────────────────────────────────────────────────────
function paperStyles(t: InvoiceTemplate, isAccepted: boolean) {
  if (t === "modern") return {
    headerBg: "bg-[#1c2026]", headerBorder: "border-[#2a2e38]", accentStrip: true,
    companyNameColor: "text-white", companyAddrColor: "text-white/40",
    titleColor: "text-amber-400", numColor: "text-white/35",
    totalLabelColor: "text-white/40", totalAmtColor: "text-white",
    tableHeadBg: "bg-[#1c2026]", tableHeadText: "text-white/80", altRowBg: "bg-gray-50",
    totalBg: isAccepted ? "bg-emerald-500" : "bg-amber-500",
    footerBg: "bg-[#1c2026]", footerText: "text-white/60", clientNameColor: "text-amber-400",
  } as const;
  if (t === "minimal") return {
    headerBg: "bg-white", headerBorder: "border-gray-200", accentStrip: false,
    companyNameColor: "text-gray-700", companyAddrColor: "text-gray-400",
    titleColor: "text-gray-300", numColor: "text-gray-400",
    totalLabelColor: "text-gray-400", totalAmtColor: "text-gray-800",
    tableHeadBg: "bg-gray-50", tableHeadText: "text-gray-500", altRowBg: "",
    totalBg: isAccepted ? "bg-emerald-500" : "bg-gray-800",
    footerBg: "bg-gray-100", footerText: "text-gray-400", clientNameColor: "text-gray-700",
  } as const;
  return {
    headerBg: "bg-white", headerBorder: "border-gray-100", accentStrip: false,
    companyNameColor: "text-amber-600", companyAddrColor: "text-gray-400",
    titleColor: "text-gray-800", numColor: "text-gray-400",
    totalLabelColor: "text-gray-400", totalAmtColor: "text-gray-900",
    tableHeadBg: "bg-amber-500", tableHeadText: "text-white", altRowBg: "bg-gray-50",
    totalBg: isAccepted ? "bg-emerald-500" : "bg-amber-500",
    footerBg: "bg-amber-500", footerText: "text-white/80", clientNameColor: "text-amber-600",
  } as const;
}

// ── Draft types ───────────────────────────────────────────────────────────────
type DraftItem = { description: string; qty: string; rate: string; category: string };
type Draft = {
  projectName: string; clientName: string; clientEmail: string;
  issueDate: string; validUntil: string; taxRate: string; notes: string;
  items: DraftItem[];
};

function toDraft(est: Estimate): Draft {
  const ds = (d: Date | string) => { const t = d instanceof Date ? d : new Date(d); return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`; };
  return {
    projectName: est.projectName ?? "",
    clientName: est.clientName ?? "",
    clientEmail: est.clientEmail ?? "",
    issueDate: ds(est.issueDate),
    validUntil: ds(est.validUntil),
    taxRate: String(est.taxRate ?? 0),
    notes: est.notes ?? "",
    items: (est.items ?? []).map((i) => ({
      description: i.description ?? "",
      qty: String(i.qty ?? 1),
      rate: String(i.rate ?? 0),
      category: i.category ?? "Labour",
    })),
  };
}

const STATUS_CFG = {
  draft:    { label: "Draft",    bg: "bg-zinc-700/60",    text: "text-zinc-300",    dot: "bg-zinc-400" },
  sent:     { label: "Sent",     bg: "bg-blue-500/15",    text: "text-blue-400",    dot: "bg-blue-400" },
  accepted: { label: "Accepted", bg: "bg-emerald-500/15", text: "text-emerald-400", dot: "bg-emerald-400" },
  declined: { label: "Declined", bg: "bg-red-500/15",     text: "text-red-400",     dot: "bg-red-500" },
};

const CATEGORIES = ["Labour", "Materials", "Equipment", "Subcontractor", "Other"];

const ec = (extra = "") =>
  `bg-transparent border-b border-gray-200 hover:border-gray-400 focus:border-amber-500 focus:bg-amber-500/[0.03] outline-none transition-colors placeholder:text-gray-300 cursor-text rounded-sm ${extra}`;

export default function EstimateDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const {
    estimates, updateEstimate, deleteEstimate, addEstimate,
    invoices, addInvoice,
    currency, companyName, companyAddress, companyLogo,
  } = useStore();

  const estimate = estimates.find((e) => e.id === id) ?? null;

  useEffect(() => {
    if (!estimate) router.replace("/estimates");
  }, [estimate, router]);

  const [draft, setDraft] = useState<Draft>(() => estimate ? toDraft(estimate) : toDraft({} as Estimate));
  useEffect(() => { if (estimate) setDraft(toDraft(estimate)); }, [estimate?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const [pdfLoading, setPdfLoading]     = useState(false);
  const [sendLoading, setSendLoading]   = useState(false);
  const [linkCopied, setLinkCopied]     = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [template, setTemplate] = useTemplateChoice("constra_estimate_template");

  if (!estimate) return null;

  const isDirty = JSON.stringify(draft) !== JSON.stringify(toDraft(estimate));
  const cfg = STATUS_CFG[estimate.status];
  const isDraft    = estimate.status === "draft";
  const isSent     = estimate.status === "sent";
  const isAccepted = estimate.status === "accepted";
  const isDeclined = estimate.status === "declined";
  const isExpired  = estimate.validUntil < new Date() && isSent;
  const ps = paperStyles(template, isAccepted);

  const sub    = draft.items.reduce((s, i) => s + (parseFloat(i.qty) || 0) * (parseFloat(i.rate) || 0), 0);
  const taxPct = parseFloat(draft.taxRate) || 0;
  const tax    = sub * (taxPct / 100);
  const total  = sub + tax;

  const updItem = (idx: number, field: keyof DraftItem, val: string) =>
    setDraft((d) => ({ ...d, items: d.items.map((it, i) => i === idx ? { ...it, [field]: val } : it) }));

  function handleSave() {
    if (!estimate) return;
    if (!draft.clientName.trim()) { toast.error("Client name is required"); return; }
    const items = draft.items
      .filter((i) => i.description.trim())
      .map((i) => ({ description: i.description.trim(), qty: parseFloat(i.qty) || 1, rate: parseFloat(i.rate) || 0, category: i.category }));
    if (!items.length) { toast.error("Add at least one line item"); return; }
    const taxRate = parseFloat(draft.taxRate) || 0;
    updateEstimate(estimate.id, {
      projectName: draft.projectName.trim(),
      clientName: draft.clientName.trim(),
      clientEmail: draft.clientEmail.trim(),
      issueDate: draft.issueDate ? new Date(draft.issueDate + "T12:00:00") : estimate.issueDate,
      validUntil: draft.validUntil ? new Date(draft.validUntil + "T12:00:00") : estimate.validUntil,
      items, taxRate,
      notes: draft.notes.trim() || undefined,
    });
    setDraft({
      ...draft,
      projectName: draft.projectName.trim(),
      clientName: draft.clientName.trim(),
      clientEmail: draft.clientEmail.trim(),
      taxRate: String(taxRate),
      notes: draft.notes.trim(),
      items: items.map((i) => ({ description: i.description, qty: String(i.qty), rate: String(i.rate), category: i.category })),
    });
    toast.success("Estimate saved");
  }

  function handleDuplicate() {
    if (!estimate) return;
    const nums = estimates.map((e) => parseInt(e.number.split("-").pop() ?? "0", 10)).filter(Boolean);
    const num = `EST-${new Date().getFullYear()}-${String(Math.max(...nums, 0) + 1).padStart(3, "0")}`;
    addEstimate({ number: num, projectName: estimate.projectName, clientName: estimate.clientName, clientEmail: estimate.clientEmail, status: "draft", issueDate: new Date(), validUntil: new Date(Date.now() + 30 * 86400000), items: estimate.items, taxRate: estimate.taxRate, notes: estimate.notes });
    toast.success(`Duplicated as ${num}`);
    router.push("/estimates");
  }

  function handleConvertToInvoice() {
    if (!estimate) return;
    const nums = invoices.map((i) => parseInt(i.number.split("-").pop() ?? "0", 10)).filter(Boolean);
    const num = `INV-${new Date().getFullYear()}-${String(Math.max(...nums, 0) + 1).padStart(3, "0")}`;
    addInvoice({
      number: num, clientName: estimate.clientName, clientEmail: estimate.clientEmail,
      clientAddress: "", status: "draft", issueDate: new Date(), dueDate: new Date(Date.now() + 30 * 86400000),
      items: estimate.items.map(({ description, qty, rate }) => ({ description, qty, rate })),
      taxRate: estimate.taxRate, notes: estimate.notes,
    });
    toast.success(`Converted to invoice ${num}`);
    router.push("/invoices");
  }

  async function handleSend() {
    if (!estimate) return;
    if (!estimate.clientEmail) { toast.error("Add a client email first"); return; }
    setSendLoading(true);
    try {
      const amountStr = formatCurrency(Math.round(total), currency as never);
      const validStr = estimate.validUntil.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
      const res = await fetch("/api/invoice/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: estimate.clientEmail, invoiceNumber: estimate.number,
          clientName: estimate.clientName, amount: amountStr, dueDate: validStr,
          companyName, notes: estimate.notes, isReminder: false,
        }),
      });
      if (res.ok) {
        if (isDraft) updateEstimate(estimate.id, { status: "sent" });
        toast.success(`Estimate sent to ${estimate.clientEmail}`);
      } else {
        toast.error("Failed to send. Check RESEND_API_KEY in Vercel.");
      }
    } catch { toast.error("Network error"); }
    finally { setSendLoading(false); }
  }

  function copyLink() {
    if (!estimate) return;
    navigator.clipboard.writeText(`${window.location.origin}/share/${estimate.id}`).then(() => {
      setLinkCopied(true); setTimeout(() => setLinkCopied(false), 2500);
      toast.success("Link copied to clipboard");
    });
  }

  return (
    <div className="-mx-5 -mt-5 md:-mx-6 md:-mt-6 flex flex-col bg-[#080808]" style={{ minHeight: 'calc(100dvh - 3.5rem - env(safe-area-inset-top))' }}>

      {/* ── Top toolbar ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/[0.06] flex-shrink-0 sticky top-0 z-20 bg-[#080808]/95 backdrop-blur-sm">
        {/* Back */}
        <button
          onClick={() => router.push("/estimates")}
          className="flex items-center gap-1.5 text-white/40 hover:text-white/80 transition-colors mr-1"
        >
          <ChevronLeft size={18} />
          <span className="text-[12px] font-semibold hidden sm:inline">Estimates</span>
        </button>

        {/* Number + status */}
        <span className="font-mono text-[12px] text-white/40 tracking-wider">{estimate.number}</span>
        <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
          {cfg.label}
        </span>
        {isExpired && (
          <span className="text-[10px] text-orange-400 font-semibold bg-orange-500/10 px-2 py-0.5 rounded-full">EXPIRED</span>
        )}

        {/* Status actions */}
        <div className="ml-2 hidden sm:flex items-center gap-1">
          {isDraft && (
            <button onClick={() => { updateEstimate(estimate.id, { status: "sent" }); toast.success("Marked as sent"); }}
              className="text-[11px] font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full transition-colors">
              Mark Sent
            </button>
          )}
          {isSent && (
            <>
              <button onClick={() => { updateEstimate(estimate.id, { status: "accepted" }); toast.success("Marked as accepted"); }}
                className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-full transition-colors">
                Accepted
              </button>
              <button onClick={() => { updateEstimate(estimate.id, { status: "declined" }); toast.success("Marked as declined"); }}
                className="text-[11px] font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/15 px-3 py-1.5 rounded-full transition-colors">
                Declined
              </button>
            </>
          )}
          {isAccepted && (
            <button onClick={handleConvertToInvoice}
              className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full transition-colors">
              → Convert to Invoice
            </button>
          )}
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={handleSend}
          disabled={sendLoading || !estimate.clientEmail}
          title={!estimate.clientEmail ? "Add a client email first" : "Send estimate by email"}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-white/60 bg-white/[0.06] hover:bg-white/[0.10] hover:text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
        >
          <Mail size={13} />
          <span className="hidden sm:inline">{sendLoading ? "Sending…" : "Send"}</span>
        </button>

        <button
          onClick={copyLink}
          className={`flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-full transition-colors ${
            linkCopied ? "text-emerald-400 bg-emerald-500/10" : "text-white/60 bg-white/[0.06] hover:bg-white/[0.10] hover:text-white"
          }`}
        >
          {linkCopied ? <Check size={13} /> : <Link2 size={13} />}
          <span className="hidden sm:inline">{linkCopied ? "Copied!" : "Link"}</span>
        </button>

        <TemplatePicker value={template} onChange={setTemplate} />

        <button
          onClick={async () => {
            setPdfLoading(true);
            try { await exportEstimatePdf(estimate, currency, companyName, companyAddress, companyLogo, template); toast.success("PDF downloaded"); }
            catch { toast.error("Failed to export PDF"); }
            finally { setPdfLoading(false); }
          }}
          disabled={pdfLoading}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-white/60 bg-white/[0.06] hover:bg-white/[0.10] hover:text-white px-3 py-1.5 rounded-full transition-colors disabled:opacity-40"
        >
          <FileDown size={13} />
          <span className="hidden sm:inline">{pdfLoading ? "…" : "PDF"}</span>
        </button>

        <button onClick={handleDuplicate} title="Duplicate"
          className="w-9 h-9 flex items-center justify-center rounded-full text-white/50 hover:text-white/80 hover:bg-white/[0.06] transition-colors">
          <Copy size={14} />
        </button>

        <button onClick={() => setDeleteConfirm(true)}
          className="w-9 h-9 flex items-center justify-center rounded-full text-red-400/60 hover:text-red-400 hover:bg-red-500/[0.08] transition-colors">
          <Trash2 size={14} />
        </button>
      </div>

      {/* ── Mobile status actions ────────────────────────────────────────── */}
      <div className="sm:hidden flex flex-wrap gap-2 px-4 py-2.5 border-b border-white/[0.04]">
        {isDraft && (
          <button onClick={() => { updateEstimate(estimate.id, { status: "sent" }); toast.success("Marked as sent"); }}
            className="text-[12px] font-semibold text-blue-400 bg-blue-500/10 px-4 py-2 rounded-full">Mark Sent</button>
        )}
        {isSent && (
          <>
            <button onClick={() => { updateEstimate(estimate.id, { status: "accepted" }); toast.success("Accepted"); }}
              className="text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-full">Accepted</button>
            <button onClick={() => { updateEstimate(estimate.id, { status: "declined" }); toast.success("Declined"); }}
              className="text-[12px] font-semibold text-red-400 bg-red-500/10 px-4 py-2 rounded-full">Declined</button>
          </>
        )}
        {isAccepted && (
          <button onClick={handleConvertToInvoice}
            className="text-[12px] font-semibold text-amber-400 bg-amber-500/10 px-4 py-2 rounded-full">Convert to Invoice</button>
        )}
      </div>

      {/* ── Paper scroll area ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10">

          {/* Edit hint */}
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400/60 font-medium mb-3 px-1">
            <Pencil size={10} /> Click any field to edit directly on the estimate
          </div>

          {/* ── White paper ────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl overflow-hidden shadow-[0_8px_64px_rgba(0,0,0,0.7)] ring-1 ring-white/10">

            {/* Header */}
            <div className={`relative px-7 sm:px-12 pt-8 sm:pt-10 pb-7 sm:pb-8 border-b ${ps.headerBg} ${ps.headerBorder}`}>
              {ps.accentStrip && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-amber-500" />}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  {companyLogo ? (
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                      <img src={companyLogo} alt={companyName} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-[22px] font-black">{(companyName ?? "C").charAt(0)}</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className={`text-[18px] font-black leading-tight truncate ${ps.companyNameColor}`}>{companyName}</p>
                    {companyAddress && (
                      <p className={`text-[11px] mt-0.5 leading-snug ${ps.companyAddrColor}`}>
                        {companyAddress.split(",").slice(0, 2).map((s) => s.trim()).join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-[22px] sm:text-[32px] font-black leading-none tracking-tight ${ps.titleColor}`}>ESTIMATE</p>
                  <p className={`text-[11px] mt-1 font-mono ${ps.numColor}`}>#{estimate.number}</p>
                  <div className="mt-3">
                    <p className={`text-[9px] uppercase tracking-wider font-bold ${ps.totalLabelColor}`}>Total Amount</p>
                    <p className={`text-[20px] sm:text-[26px] font-black leading-tight ${ps.totalAmtColor}`}>
                      {formatCurrency(Math.round(total), currency as never)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Status banners */}
            {isAccepted && (
              <div className="mx-6 sm:mx-12 mt-5 flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3">
                <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />
                <p className="text-[12px] font-bold text-emerald-700">Estimate Accepted</p>
              </div>
            )}
            {isDeclined && (
              <div className="mx-6 sm:mx-12 mt-5 flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-4 py-3">
                <XCircle size={14} className="text-red-600 flex-shrink-0" />
                <p className="text-[12px] font-bold text-red-700">Estimate Declined</p>
              </div>
            )}
            {isExpired && (
              <div className="mx-6 sm:mx-12 mt-5 flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl px-4 py-3">
                <Clock size={14} className="text-orange-500 flex-shrink-0" />
                <p className="text-[12px] font-bold text-orange-700">
                  Expired — was valid until {estimate.validUntil.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" })}
                </p>
              </div>
            )}

            {/* Prepared For / Dates */}
            <div className="px-7 sm:px-12 pt-6 pb-5 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:gap-12">
                <div className="flex-1 mb-5 sm:mb-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-2">Prepared For</p>
                  <input
                    className={ec(`text-[16px] font-bold ${ps.clientNameColor} w-full`)}
                    value={draft.clientName}
                    onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))}
                    placeholder="Client name"
                    maxLength={100}
                  />
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Mail size={11} className="text-gray-300 flex-shrink-0" />
                    <input
                      className={ec("text-[12px] text-gray-400 flex-1")}
                      value={draft.clientEmail}
                      onChange={(e) => setDraft((d) => ({ ...d, clientEmail: e.target.value }))}
                      placeholder="client@email.com"
                      maxLength={100}
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Project</p>
                    <input
                      className={ec("text-[13px] text-gray-700 font-semibold w-full")}
                      value={draft.projectName}
                      onChange={(e) => setDraft((d) => ({ ...d, projectName: e.target.value }))}
                      placeholder="Project name"
                      maxLength={100}
                    />
                  </div>
                </div>
                <div className="flex flex-row sm:flex-col gap-6 sm:gap-4 flex-shrink-0">
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Issue Date</p>
                    <input
                      type="date"
                      className={ec("text-[13px] text-gray-700 font-semibold")}
                      value={draft.issueDate}
                      onChange={(e) => setDraft((d) => ({ ...d, issueDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Valid Until</p>
                    <input
                      type="date"
                      className={ec(`text-[13px] font-semibold ${isExpired ? "text-red-600" : "text-gray-700"}`)}
                      value={draft.validUntil}
                      onChange={(e) => setDraft((d) => ({ ...d, validUntil: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Line items */}
            <div className="px-7 sm:px-12 pt-5 pb-3">
              <div className="overflow-x-auto">
                <table className="w-full text-[13px] min-w-[500px]">
                  <thead>
                    <tr className={ps.tableHeadBg}>
                      <th className={`text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 rounded-tl-lg w-8 ${ps.tableHeadText}`}>#</th>
                      <th className={`text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 ${ps.tableHeadText}`}>Description</th>
                      <th className={`text-left text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 w-28 hidden sm:table-cell ${ps.tableHeadText}`}>Category</th>
                      <th className={`text-center text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 w-14 ${ps.tableHeadText}`}>Qty</th>
                      <th className={`text-right text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 w-24 ${ps.tableHeadText}`}>Rate</th>
                      <th className={`text-right text-[9px] font-black uppercase tracking-[0.12em] px-3 py-3 w-28 ${ps.tableHeadText}`}>Amount</th>
                      <th className="rounded-tr-lg w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {draft.items.map((item, i) => (
                      <tr key={i} className={`border-b border-gray-100 group ${i % 2 === 1 ? ps.altRowBg : ""}`}>
                        <td className="py-2.5 px-3 text-gray-400 text-center text-[12px]">{i + 1}</td>
                        <td className="py-2.5 px-3">
                          <input
                            className={ec("w-full text-gray-800 font-medium text-[13px]")}
                            value={item.description}
                            onChange={(e) => updItem(i, "description", e.target.value)}
                            placeholder="Description"
                            maxLength={200}
                          />
                        </td>
                        <td className="py-2.5 px-3 w-28 hidden sm:table-cell">
                          <select
                            className={ec("text-gray-500 text-[12px] w-full")}
                            value={item.category}
                            onChange={(e) => updItem(i, "category", e.target.value)}
                          >
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="py-2.5 px-3 w-14">
                          <input
                            type="number"
                            className={ec("w-full text-center text-gray-500 text-[13px]")}
                            value={item.qty}
                            onChange={(e) => updItem(i, "qty", e.target.value)}
                            min="0"
                          />
                        </td>
                        <td className="py-2.5 px-3 w-24">
                          <input
                            type="number"
                            className={ec("w-full text-right text-gray-500 text-[13px]")}
                            value={item.rate}
                            onChange={(e) => updItem(i, "rate", e.target.value)}
                            min="0"
                            placeholder="0.00"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right text-gray-800 font-bold text-[13px] w-28">
                          {formatCurrency((parseFloat(item.qty) || 0) * (parseFloat(item.rate) || 0), currency as never)}
                        </td>
                        <td className="py-2.5 px-1 text-center">
                          {draft.items.length > 1 && (
                            <button
                              onClick={() => setDraft((d) => ({ ...d, items: d.items.filter((_, j) => j !== i) }))}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-all"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={() => setDraft((d) => ({ ...d, items: [...d.items, { description: "", qty: "1", rate: "", category: "Labour" }] }))}
                className="mt-3 flex items-center gap-1.5 text-[12px] font-semibold text-amber-500 hover:text-amber-400 transition-colors px-1 py-1"
              >
                <Plus size={12} /> Add line item
              </button>
            </div>

            {/* Totals */}
            <div className="px-7 sm:px-12 pt-2 pb-7 flex justify-end">
              <div className="w-full sm:w-72">
                <div className="flex justify-between py-2 text-[13px]">
                  <span className="text-gray-500">Sub Total</span>
                  <span className="text-gray-800 font-semibold">{formatCurrency(sub, currency as never)}</span>
                </div>
                <div className="flex justify-between py-2 text-[13px] border-b border-gray-100 items-center">
                  <span className="text-gray-500">Tax</span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      className={ec("w-12 text-center text-gray-500 text-[12px]")}
                      value={draft.taxRate}
                      onChange={(e) => setDraft((d) => ({ ...d, taxRate: e.target.value }))}
                      min="0" max="100"
                    />
                    <span className="text-gray-400 text-[12px]">%</span>
                    <span className="text-gray-800 font-semibold">{formatCurrency(tax, currency as never)}</span>
                  </div>
                </div>
                <div className="flex justify-between py-2 text-[13px] border-b border-gray-200">
                  <span className="text-gray-700 font-bold">Total</span>
                  <span className="text-gray-900 font-bold">{formatCurrency(Math.round(total), currency as never)}</span>
                </div>
                <div className={`flex justify-between items-center px-5 py-3.5 mt-3 rounded-2xl ${ps.totalBg}`}>
                  <span className="text-[13px] font-black text-white">Estimate Total</span>
                  <span className="text-[20px] font-black text-white">
                    {formatCurrency(Math.round(total), currency as never)}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="mx-6 sm:mx-12 mb-5 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1.5">Notes &amp; Scope</p>
              <textarea
                className={ec("w-full text-[13px] text-gray-600 leading-relaxed resize-none")}
                rows={2}
                value={draft.notes}
                onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
                placeholder="Scope details, exclusions, payment terms…"
                maxLength={1000}
              />
            </div>

            {/* Terms */}
            <div className="mx-6 sm:mx-12 mb-7">
              <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">Terms &amp; Conditions</p>
              <p className="text-[11px] text-gray-400 leading-relaxed">This estimate is valid until the date stated above. Prices are subject to change after expiry. Acceptance constitutes agreement to the stated scope and pricing.</p>
            </div>

            {/* Footer band */}
            <div className={`${ps.footerBg} px-7 sm:px-12 py-3.5 flex items-center justify-between`}>
              <p className={`text-[11px] font-medium ${ps.footerText}`}>{companyName} · {estimate.number}</p>
              <p className={`text-[11px] ${ps.footerText} opacity-70`}>Page 1</p>
            </div>
          </div>

          {isDirty && <div className="h-20" />}
        </div>
      </div>

      {/* ── Floating save bar ──────────────────────────────────────────── */}
      {isDirty && (
        <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-3 px-5 py-3.5 bg-[#111]/90 backdrop-blur-md border-t border-amber-500/20 shadow-2xl" style={{ paddingBottom: "calc(0.875rem + env(safe-area-inset-bottom))" }}>
          <span className="text-[12px] text-amber-400/70 flex-1">Unsaved changes</span>
          <button
            onClick={() => setDraft(toDraft(estimate))}
            className="text-[13px] font-semibold text-white/40 hover:text-white px-4 py-2 rounded-full hover:bg-white/[0.06] transition-colors"
          >
            Discard
          </button>
          <button
            onClick={handleSave}
            className="text-[13px] font-bold text-black bg-amber-500 hover:bg-amber-400 px-6 py-2 rounded-full transition-colors shadow-lg shadow-amber-500/30"
          >
            Save Estimate
          </button>
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm}
        title={`Delete ${estimate.number}?`}
        body="This estimate will be permanently removed."
        confirmLabel="Delete"
        onConfirm={() => { deleteEstimate(estimate.id); toast.success("Estimate deleted"); router.push("/estimates"); }}
        onCancel={() => setDeleteConfirm(false)}
      />
    </div>
  );
}
