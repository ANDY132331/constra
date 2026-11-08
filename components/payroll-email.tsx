"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Send } from "lucide-react";
import { useStore } from "@/lib/store";
import type { Timesheet } from "@/lib/timesheet";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function toBase64(b: Blob) {
  const bytes = new Uint8Array(await b.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}

/**
 * Sends the sheet on screen to the company's payroll address. The files are built on this phone,
 * so the times are in the company's own time zone wherever in the world it is. Off until
 * migration 015 adds somewhere to keep the address.
 */
export function PayrollEmail({ sheet, period, empty }: { sheet: Timesheet; period: string; empty: boolean }) {
  const { payrollEmail, payrollEmailOn, setPayrollEmail, db015, companyName, companyLogo } = useStore();
  const [draft, setDraft] = useState(payrollEmail);
  const [sending, setSending] = useState(false);
  const trimmed = draft.trim();
  const dirty = trimmed !== payrollEmail;

  if (db015 === false) {
    return (
      <section aria-label="Email to payroll" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 sm:p-5">
        <h3 className="text-[15px] font-bold text-white">Email to payroll</h3>
        <p className="text-[13px] text-white/60 mt-1">Ready once this workspace&apos;s database update is finished. Until then, download the files above.</p>
      </section>
    );
  }

  const send = async () => {
    if (sending || empty) return;
    setSending(true);
    try {
      const opts = { companyName, logo: companyLogo || undefined };
      const [{ buildTimesheetPdf }, { buildTimesheetXlsx }, { timesheetFileName }] = await Promise.all([
        import("@/lib/timesheet-pdf"), import("@/lib/timesheet-xlsx"), import("@/lib/timesheet"),
      ]);
      const [pdf, xlsx] = await Promise.all([buildTimesheetPdf(sheet, opts), buildTimesheetXlsx(sheet, opts)]);
      const people = sheet.people.length;
      const res = await fetch("/api/timesheets/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          summary: `${sheet.totals.total.toFixed(2)} hours across ${people} ${people === 1 ? "person" : "people"}.`,
          files: [
            { name: timesheetFileName(companyName, sheet.start, sheet.end, "pdf"), base64: await toBase64(pdf) },
            { name: timesheetFileName(companyName, sheet.start, sheet.end, "xlsx"), base64: await toBase64(xlsx) },
          ],
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "The email didn't go");
      toast.success(`Timesheet sent to ${j.to}`);
    } catch (e) {
      toast.error(navigator.onLine ? (e instanceof Error ? e.message : "The email didn't go") : "Sending needs signal. Try again when you're back online.");
    } finally {
      setSending(false);
    }
  };

  const save = () => {
    setPayrollEmail(trimmed, trimmed ? payrollEmailOn : false);
    toast.success(trimmed ? "Payroll email saved" : "Payroll email removed");
  };

  return (
    <section aria-label="Email to payroll" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 sm:p-5 space-y-3">
      <div>
        <h3 className="text-[15px] font-bold text-white">Email to payroll</h3>
        <p className="text-[12px] text-white/60 mt-0.5">Sends the PDF and Excel file for {period} to your payroll person or bookkeeper.</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-2.5">
        <input
          id="payroll-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="payroll@yourbookkeeper.com"
          aria-label="Payroll email address"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="flex-1 min-h-[48px] bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-3.5 text-[14px] text-white placeholder:text-white/35"
        />
        {dirty ? (
          <button type="button" onClick={save} disabled={trimmed !== "" && !EMAIL.test(trimmed)}
            className="min-h-[48px] px-6 rounded-full bg-white/[0.1] hover:bg-white/[0.14] text-white text-[14px] font-bold disabled:opacity-40">
            Save
          </button>
        ) : (
          <button type="button" onClick={send} disabled={!payrollEmail || empty || sending}
            className="inline-flex items-center justify-center gap-2 min-h-[48px] px-6 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[14px] font-bold disabled:opacity-40 disabled:pointer-events-none">
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Email it now
          </button>
        )}
      </div>
      {payrollEmail && !dirty && (
        <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
          <input id="payroll-monday" type="checkbox" checked={payrollEmailOn} onChange={(e) => setPayrollEmail(payrollEmail, e.target.checked)} className="w-5 h-5 accent-amber-500" />
          <span className="text-[13px] text-white/75">Remind me every Monday to send last week&apos;s timesheet</span>
        </label>
      )}
    </section>
  );
}
