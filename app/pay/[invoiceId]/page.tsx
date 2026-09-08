"use client";

import { use, useEffect, useState, useCallback } from "react";
import {
  HardHat, Loader2, CheckCircle2, AlertTriangle, CreditCard,
  Calendar, FileText, Lock, ChevronRight,
} from "lucide-react";

type InvoiceItem = { description: string; qty: number; rate: number };

type PublicInvoice = {
  id: string;
  number: string;
  clientName: string;
  clientAddress: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";
  items: InvoiceItem[];
  taxRate: number;
  notes: string | null;
  subtotal: number;
  total: number;
  companyName: string;
  currency: string;
};

function fmt(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function fmtDate(d: string) {
  try {
    return new Date(d).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

function isOverdue(dueDate: string) {
  return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
}

export default function PayPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = use(params);
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/pay/invoice/${invoiceId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then(setInvoice)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  const handlePay = useCallback(async () => {
    if (!invoice || paying) return;
    setPaying(true);
    setPayError(null);

    try {
      const res = await fetch("/api/stripe/pay-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.total,
          currency: invoice.currency,
          description: `Invoice ${invoice.number} — ${invoice.companyName}`,
        }),
      });

      if (!res.ok) {
        const { error: msg } = await res.json().catch(() => ({}));
        throw new Error(msg || `Error ${res.status}`);
      }

      const { url } = await res.json();
      if (url) window.location.href = url;
      else throw new Error("No checkout URL returned");
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment could not be started. Please try again.");
      setPaying(false);
    }
  }, [invoice, paying]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--app-bg-1, #f5f5f5)" }}>
        <Loader2 size={22} className="animate-spin text-amber-500" />
      </div>
    );
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (error || !invoice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ background: "var(--app-bg-1, #f5f5f5)" }}>
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertTriangle size={22} className="text-red-500" />
        </div>
        <div>
          <h1 className="text-[20px] font-black" style={{ color: "var(--app-text, #111)" }}>Invoice not found</h1>
          <p className="text-[14px] mt-1" style={{ color: "var(--app-text-2, #555)" }}>
            This payment link may have expired or the invoice doesn&apos;t exist.
          </p>
        </div>
      </div>
    );
  }

  const paid = invoice.status === "paid";
  const overdue = !paid && invoice.status === "overdue";
  const sub = invoice.subtotal;
  const tax = invoice.total - sub;

  return (
    <div className="min-h-screen py-10 px-4" style={{ background: "var(--app-bg-1, #f5f5f5)" }}>
      <div className="max-w-lg mx-auto space-y-5">

        {/* ── Brand header ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <HardHat size={14} className="text-black" />
            </div>
            <span className="font-black text-[16px]" style={{ color: "var(--app-text, #111)" }}>
              {invoice.companyName}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--app-text-3, #888)" }}>
            <Lock size={10} />
            Secure payment
          </div>
        </div>

        {/* ── Paid badge (if already paid) ── */}
        {paid && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
            <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-[14px] font-bold text-emerald-600">Payment received — thank you!</p>
              <p className="text-[12px] text-emerald-600/70 mt-0.5">Invoice {invoice.number} has been paid in full.</p>
            </div>
          </div>
        )}

        {/* ── Overdue warning ── */}
        {overdue && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
            <AlertTriangle size={18} className="text-red-500 flex-shrink-0" />
            <div>
              <p className="text-[13px] font-bold text-red-600">Payment overdue</p>
              <p className="text-[12px] text-red-600/70 mt-0.5">
                This invoice was due {fmtDate(invoice.dueDate)}.
              </p>
            </div>
          </div>
        )}

        {/* ── Invoice card ── */}
        <div className="rounded-2xl overflow-hidden border"
          style={{ background: "var(--app-bg-2, #fff)", borderColor: "var(--app-border, rgba(0,0,0,0.08))" }}>

          {/* Invoice header */}
          <div className="px-6 pt-6 pb-5 border-b"
            style={{ borderColor: "var(--app-border, rgba(0,0,0,0.08))" }}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText size={13} style={{ color: "var(--app-text-3, #888)" }} />
                  <span className="text-[11px] font-bold uppercase tracking-widest"
                    style={{ color: "var(--app-text-3, #888)" }}>Invoice</span>
                </div>
                <h1 className="text-[22px] font-black" style={{ color: "var(--app-text, #111)" }}>
                  {invoice.number}
                </h1>
                <p className="text-[13px] mt-0.5" style={{ color: "var(--app-text-2, #555)" }}>
                  For: <strong>{invoice.clientName}</strong>
                </p>
                {invoice.clientAddress && (
                  <p className="text-[12px] mt-0.5" style={{ color: "var(--app-text-3, #888)" }}>
                    {invoice.clientAddress}
                  </p>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-[28px] font-black" style={{ color: "var(--app-text, #111)" }}>
                  {fmt(invoice.total, invoice.currency)}
                </p>
                <div className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full mt-1 ${
                  paid
                    ? "bg-emerald-500/12 text-emerald-600"
                    : overdue
                    ? "bg-red-500/12 text-red-600"
                    : "bg-blue-500/12 text-blue-600"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    paid ? "bg-emerald-500" : overdue ? "bg-red-500" : "bg-blue-500"
                  }`} />
                  {paid ? "Paid" : overdue ? "Overdue" : "Due"}
                </div>
              </div>
            </div>

            <div className="flex gap-6 mt-4">
              {[
                { label: "Issued", value: fmtDate(invoice.issueDate) },
                { label: "Due", value: fmtDate(invoice.dueDate) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <Calendar size={12} style={{ color: "var(--app-text-3, #888)" }} />
                  <span className="text-[11px]" style={{ color: "var(--app-text-3, #888)" }}>
                    {label}:
                  </span>
                  <span className="text-[12px] font-semibold" style={{ color: "var(--app-text, #111)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Line items */}
          <div className="px-6 py-4">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ color: "var(--app-text-3, #888)" }}>
                  <th className="text-left pb-2 font-semibold text-[11px] uppercase tracking-wider">Description</th>
                  <th className="text-right pb-2 font-semibold text-[11px] uppercase tracking-wider">Qty</th>
                  <th className="text-right pb-2 font-semibold text-[11px] uppercase tracking-wider">Rate</th>
                  <th className="text-right pb-2 font-semibold text-[11px] uppercase tracking-wider">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, i) => (
                  <tr key={i} className="border-t"
                    style={{ borderColor: "var(--app-border, rgba(0,0,0,0.06))" }}>
                    <td className="py-2.5 pr-4" style={{ color: "var(--app-text, #111)" }}>
                      {item.description}
                    </td>
                    <td className="py-2.5 text-right" style={{ color: "var(--app-text-2, #555)" }}>
                      {item.qty}
                    </td>
                    <td className="py-2.5 text-right" style={{ color: "var(--app-text-2, #555)" }}>
                      {fmt(item.rate, invoice.currency)}
                    </td>
                    <td className="py-2.5 text-right font-semibold" style={{ color: "var(--app-text, #111)" }}>
                      {fmt(item.qty * item.rate, invoice.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-6 pb-6 space-y-1.5">
            <div className="border-t pt-3" style={{ borderColor: "var(--app-border, rgba(0,0,0,0.08))" }}>
              <div className="flex justify-between text-[13px]">
                <span style={{ color: "var(--app-text-2, #555)" }}>Subtotal</span>
                <span style={{ color: "var(--app-text, #111)" }}>{fmt(sub, invoice.currency)}</span>
              </div>
              {invoice.taxRate > 0 && (
                <div className="flex justify-between text-[13px] mt-1">
                  <span style={{ color: "var(--app-text-2, #555)" }}>Tax ({invoice.taxRate}%)</span>
                  <span style={{ color: "var(--app-text, #111)" }}>{fmt(tax, invoice.currency)}</span>
                </div>
              )}
              <div className="flex justify-between text-[17px] font-black mt-3 pt-2 border-t"
                style={{ borderColor: "var(--app-border, rgba(0,0,0,0.10))", color: "var(--app-text, #111)" }}>
                <span>Total Due</span>
                <span>{fmt(invoice.total, invoice.currency)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {invoice.notes && (
            <div className="px-6 pb-5">
              <div className="rounded-xl px-4 py-3 text-[12px]"
                style={{
                  background: "var(--app-surface, rgba(0,0,0,0.03))",
                  color: "var(--app-text-2, #555)",
                  border: "1px solid var(--app-border, rgba(0,0,0,0.06))",
                }}>
                {invoice.notes}
              </div>
            </div>
          )}
        </div>

        {/* ── Pay button ── */}
        {!paid && (
          <div className="space-y-3">
            {payError && (
              <div className="flex items-center gap-2 text-[12px] text-red-600 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
                <AlertTriangle size={13} className="flex-shrink-0" />
                {payError}
              </div>
            )}

            <button
              onClick={handlePay}
              disabled={paying}
              className="w-full flex items-center justify-center gap-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-black font-black text-[15px] py-4 rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
            >
              {paying ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <CreditCard size={18} />
              )}
              {paying ? "Redirecting to checkout…" : `Pay ${fmt(invoice.total, invoice.currency)}`}
              {!paying && <ChevronRight size={16} />}
            </button>

            <p className="text-center text-[11px]" style={{ color: "var(--app-text-3, #888)" }}>
              <Lock size={10} className="inline mr-1 mb-0.5" />
              Payments processed securely by Stripe. Your card details are never stored.
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-[11px] pb-4" style={{ color: "var(--app-text-3, rgba(0,0,0,0.25))" }}>
          Powered by{" "}
          <span className="font-black text-amber-500">Constra</span>
          {" "}· Construction management software
        </p>
      </div>
    </div>
  );
}
