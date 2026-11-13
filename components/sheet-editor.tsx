"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, Loader2, Plus, Trash2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { saveFile } from "@/lib/native";
import { computeSheet, formatVal, serialToIso, typed, type RawRow, type Val } from "@/lib/sheet-calc";
import { screenRef, wrapBlankFormula, type Template, type TemplateData, type TplCol } from "@/lib/excel-templates";

// Fill a template in on screen: type into the rows, watch the totals and statuses work themselves
// out, then download it as an Excel file or a PDF with your logo. The draft is kept on this device,
// so closing the screen doesn't lose anything.

const TONE: Record<string, string> = {
  good: "bg-emerald-500/15 text-emerald-300", warn: "bg-amber-500/15 text-amber-300",
  bad: "bg-red-500/15 text-red-300", info: "bg-sky-500/15 text-sky-300",
};
const input = "w-full min-h-[44px] bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-3 text-[14px] text-white placeholder:text-white/30 focus:outline-none focus:border-amber-500/60";
const cellInput = "w-full min-h-[40px] bg-transparent border border-transparent hover:border-white/[0.1] focus:border-amber-500/60 focus:bg-[#1a1a1a] rounded-lg px-2 text-[13px] text-white placeholder:text-white/25 focus:outline-none";

const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DEFAULT_W: Record<string, number> = { text: 22, long: 38, money: 15, num: 11, int: 9, pct: 11, date: 14, list: 16 };
const numeric = (k: string) => k === "money" || k === "num" || k === "int" || k === "pct";

/** A record from the pre-fill, as the strings the inputs hold */
function toRaw(tpl: Template, rec: Record<string, unknown>): RawRow {
  const row: RawRow = {};
  for (const c of tpl.cols) {
    if (c.calc) continue;
    const v = rec[c.key];
    if (v === undefined || v === null || v === "") continue;
    if (c.kind === "date") row[c.key] = v instanceof Date ? isoOf(v) : "";
    else if (c.kind === "pct") row[c.key] = String(Math.round(Number(v) * 1000) / 10);
    else row[c.key] = String(v);
  }
  return row;
}

export default function SheetEditor({ tpl, data, withData, projectName, onClose }: {
  tpl: Template; data: TemplateData; withData: boolean; projectName: string; onClose: () => void;
}) {
  const { companyName, companyLogo, companyAddress, currency, currentUser } = useStore();
  const key = `constra_sheet_v1_${tpl.id}`;
  const today = isoOf(new Date());

  // a saved draft is picked up once, unless we were asked to start from the company's records
  const [draft] = useState<{ rows?: RawRow[]; fields?: Record<string, string>; settings?: Record<string, string> } | null>(() => {
    if (withData) return null;
    try { return JSON.parse(localStorage.getItem(key) ?? "null"); } catch { return null; }
  });
  const [fields, setFields] = useState<Record<string, string>>(() => {
    const f: Record<string, string> = {};
    for (const name of tpl.fields ?? []) f[name] = draft?.fields?.[name] ?? (/date|week starting/i.test(name) ? today : name === "Project" ? projectName : name === "Prepared by" ? currentUser.name : "");
    return f;
  });
  const [settings, setSettings] = useState<Record<string, string>>(() => Object.fromEntries((tpl.settings ?? []).map((s) => [s.key, draft?.settings?.[s.key] ?? (s.kind === "pct" ? String(Math.round(s.value * 1000) / 10) : String(s.value))])));
  const [rows, setRows] = useState<RawRow[]>(() => {
    if (withData && tpl.prefill) { const r = tpl.prefill(data).map((x) => toRaw(tpl, x)); if (r.length) return r; }
    if (draft && Array.isArray(draft.rows) && draft.rows.length) return draft.rows;
    return Array.from({ length: Math.min(6, tpl.blank) }, () => ({}));
  });
  const [busy, setBusy] = useState<"xlsx" | "pdf" | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => { try { localStorage.setItem(key, JSON.stringify({ rows, fields, settings })); } catch { /* storage full or blocked */ } }, 500);
    return () => clearTimeout(t);
  }, [rows, fields, settings, key]);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", esc);
    return () => { document.body.style.overflow = prev; window.removeEventListener("keydown", esc); };
  }, [onClose]);

  const view = useMemo(() => {
    const ref = screenRef(tpl);
    return computeSheet(
      tpl, rows, settings,
      (k) => wrapBlankFormula(tpl.tableName, tpl.cols.find((c) => c.key === k)!.calc!(ref)),
      (prev) => (tpl.results ?? []).map((r) => r.formula(ref, prev)),
    );
  }, [tpl, rows, settings]);

  const setCell = (ri: number, k: string, v: string) => setRows((rs) => rs.map((r, i) => (i === ri ? { ...r, [k]: v } : r)));
  const addRows = (n: number) => setRows((rs) => [...rs, ...Array.from({ length: n }, () => ({}))]);
  const delRow = (ri: number) => setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== ri) : [{}]));
  const hasData = rows.some((r) => Object.values(r).some((v) => v && String(v).trim()));
  const show = (c: TplCol, v: Val | undefined) => formatVal(c.kind, v, currency);
  const toneOf = (c: TplCol, text: string) => (tpl.status && tpl.status.key === c.key ? TONE[tpl.status.tones[text] ?? ""] ?? "" : "");

  async function downloadXlsx() {
    setBusy("xlsx");
    try {
      const { buildTemplateXlsx, templateFileName } = await import("@/lib/excel-templates");
      const recs = rows.filter((r) => Object.values(r).some((v) => v && String(v).trim())).map((r) => {
        const rec: Record<string, string | number | Date | null> = {};
        for (const c of tpl.cols) {
          if (c.calc) continue;
          const v = typed(c.kind, r[c.key]);
          if (v === null) continue;
          if (c.kind === "date" && typeof v === "number") { const [y, m, d] = serialToIso(v).split("-").map(Number); rec[c.key] = new Date(y, m - 1, d, 12); } else rec[c.key] = v;
        }
        return rec;
      });
      const kept = rows.map((r, i) => (Object.values(r).some((v) => v && String(v).trim()) ? i : -1)).filter((i) => i >= 0);
      const cached: Record<string, (string | number | null)[]> = {};
      tpl.cols.forEach((c, ci) => { if (c.calc) cached[c.key] = kept.map((i) => { const v = view.values[i][ci]; return v === undefined ? null : v; }); });
      const setVals: Record<string, number> = {};
      for (const s of tpl.settings ?? []) { const v = typed(s.kind === "pct" ? "pct" : "num", settings[s.key]); if (typeof v === "number") setVals[s.key] = v; }
      const blob = await buildTemplateXlsx(tpl, {
        company: companyName, logo: companyLogo, currency, rows: recs.length ? recs : undefined,
        fieldValues: fields, settingValues: setVals, cached: recs.length ? cached : undefined, resultValues: view.results,
      });
      await saveFile(blob, templateFileName(companyName, tpl));
      toast.success("Excel file downloaded");
    } catch { toast.error("The Excel file couldn't be made. Try again."); } finally { setBusy(null); }
  }

  async function downloadPdf() {
    setBusy("pdf");
    try {
      const { exportListPdf, safeName } = await import("@/lib/branded-pdf");
      const cols = tpl.cols;
      const kept = rows.map((r, i) => (Object.values(r).some((v) => v && String(v).trim()) ? i : -1)).filter((i) => i >= 0);
      const body = kept.map((i) => cols.map((c, ci) => show(c, view.values[i][ci])));
      if (view.totals.some((t) => t !== undefined)) body.push(cols.map((c, ci) => (ci === 0 ? "Total" : view.totals[ci] !== undefined ? show(c, view.totals[ci] as Val) : "")));
      const sub = (tpl.fields ?? []).map((f) => [f, /date|week starting/i.test(f) && fields[f] ? formatVal("date", typed("date", fields[f]), currency) : fields[f]]).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join("   -   ");
      const summary: [string, string][] = (tpl.results ?? []).length
        ? (tpl.results ?? []).map((r, i): [string, string] => [r.label, formatVal(r.kind, view.results[i], currency)])
        : cols.flatMap((c, ci): [string, string][] => (view.totals[ci] !== undefined && ci > 0 ? [[`Total ${c.label.toLowerCase()}`, show(c, view.totals[ci] as Val)]] : [])).slice(0, 4);
      const statusIdx = tpl.status ? cols.findIndex((c) => c.key === tpl.status!.key) : -1;
      await exportListPdf({
        brand: { company: companyName || "Your company", logo: companyLogo || undefined, address: companyAddress || undefined },
        title: tpl.title, subtitle: sub || undefined, summary: summary.length ? summary : undefined,
        columns: cols.map((c) => ({ label: c.label, w: c.w ?? DEFAULT_W[c.kind], align: numeric(c.kind) ? "right" as const : "left" as const })),
        rows: body, totalRow: view.totals.some((t) => t !== undefined), landscape: cols.length > 5 || !!tpl.landscape,
        toneColumn: statusIdx >= 0 ? { index: statusIdx, tones: tpl.status!.tones } : undefined,
        filename: `${safeName(companyName)}-${safeName(tpl.title)}-${today}.pdf`,
      });
      toast.success("PDF downloaded");
    } catch { toast.error("The PDF couldn't be made. Try again."); } finally { setBusy(null); }
  }

  const cell = (c: TplCol, ri: number, compact: boolean) => {
    const cls = compact ? cellInput : input;
    const label = `${c.label}, row ${ri + 1}`;
    if (c.calc) {
      const text = show(c, view.values[ri][tpl.cols.indexOf(c)]);
      const tone = toneOf(c, text);
      return <div className={`${compact ? "px-2 min-h-[40px]" : "px-3 min-h-[44px]"} flex items-center ${numeric(c.kind) ? "justify-end" : ""} text-[13px] ${tone ? `rounded-lg font-semibold ${tone} justify-center` : "text-white/80 font-semibold"}`} aria-label={`${label}, worked out`}>{text || <span className="text-white/20">-</span>}</div>;
    }
    const v = rows[ri][c.key] ?? "";
    if (c.kind === "list") {
      const tone = toneOf(c, v);
      return (
        <select aria-label={label} value={v} onChange={(e) => setCell(ri, c.key, e.target.value)} className={`${cls} ${tone}`}>
          <option value="">-</option>
          {c.list?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    if (c.kind === "date") return <input aria-label={label} type="date" value={v} onChange={(e) => setCell(ri, c.key, e.target.value)} className={cls} />;
    if (c.kind === "long") return <textarea aria-label={label} rows={compact ? 1 : 2} value={v} onChange={(e) => setCell(ri, c.key, e.target.value)} maxLength={2000} className={`${cls} resize-y py-2`} />;
    if (numeric(c.kind)) {
      return (
        <div className="relative">
          <input aria-label={label} inputMode="decimal" value={v} placeholder={c.kind === "pct" ? "0" : c.kind === "money" ? "0.00" : ""} onChange={(e) => setCell(ri, c.key, e.target.value.replace(/[^0-9.,-]/g, ""))} className={`${cls} text-right ${c.kind === "pct" ? "pr-7" : ""}`} />
          {c.kind === "pct" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[12px] text-white/40 pointer-events-none">%</span>}
        </div>
      );
    }
    return <input aria-label={label} value={v} onChange={(e) => setCell(ri, c.key, e.target.value)} maxLength={300} className={cls} />;
  };

  const body = (
    <div className="fixed inset-0 z-[70] bg-[#0a0a0a] flex flex-col" role="dialog" aria-modal="true" aria-label={`${tpl.title}, fill in on screen`}>
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-white/[0.08] flex-shrink-0 pt-[max(12px,env(safe-area-inset-top))]">
        <button type="button" onClick={onClose} aria-label="Close" className="w-11 h-11 -ml-2 flex items-center justify-center rounded-full text-white/70 hover:bg-white/[0.08]"><X size={20} /></button>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-bold text-white truncate">{tpl.title}</h2>
          <p className="text-[11px] text-white/45">Saved on this device as you type</p>
        </div>
        <div className="hidden sm:flex gap-2">
          <button type="button" onClick={downloadPdf} disabled={!!busy} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-white/[0.15] text-white text-[13px] font-bold hover:bg-white/[0.06] disabled:opacity-40">{busy === "pdf" ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />} PDF</button>
          <button type="button" onClick={downloadXlsx} disabled={!!busy} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[13px] font-bold disabled:opacity-40">{busy === "xlsx" ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />} Excel</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 space-y-5 pb-36">
          {(tpl.fields?.length || tpl.settings?.length) ? (
            <section aria-label="Sheet details" className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {(tpl.fields ?? []).map((f) => {
                const isDate = /date|week starting/i.test(f);
                return (
                  <label key={f} className="block">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">{f}</span>
                    <input type={isDate ? "date" : "text"} value={fields[f] ?? ""} onChange={(e) => setFields((x) => ({ ...x, [f]: e.target.value }))} className={`${input} mt-1`} />
                  </label>
                );
              })}
              {(tpl.settings ?? []).map((s) => (
                <label key={s.key} className="block">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">{s.label}</span>
                  <div className="relative mt-1">
                    <input inputMode="decimal" value={settings[s.key] ?? ""} onChange={(e) => setSettings((x) => ({ ...x, [s.key]: e.target.value.replace(/[^0-9.,-]/g, "") }))} className={`${input} ${s.kind === "pct" ? "pr-8" : ""}`} />
                    {s.kind === "pct" && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-[13px] pointer-events-none">%</span>}
                  </div>
                </label>
              ))}
            </section>
          ) : null}

          {tpl.results?.length ? (
            <section aria-label="Results" className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {tpl.results.map((r, i) => (
                <div key={r.label} className={`rounded-2xl border p-4 ${r.big ? "bg-amber-500/[0.12] border-amber-500/40" : "bg-[#111111] border-white/[0.07]"}`}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/55">{r.label}</p>
                  <p className={`font-display font-extrabold tabular-nums mt-1 ${r.big ? "text-[30px] text-amber-300" : "text-[24px] text-white"}`}>{formatVal(r.kind, view.results[i], currency)}</p>
                </div>
              ))}
            </section>
          ) : null}

          {/* Desktop: a real table */}
          <section aria-label="Rows" className="hidden md:block rounded-2xl border border-white/[0.08] overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ minWidth: Math.max(720, tpl.cols.reduce((s, c) => s + (c.w ?? DEFAULT_W[c.kind]) * 6.5, 60)) }}>
              <thead>
                <tr className="bg-[#161616]">
                  <th className="w-9 px-2 py-3" aria-label="Row" />
                  {tpl.cols.map((c) => <th key={c.key} className={`px-2 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-white/60 ${numeric(c.kind) ? "text-right" : ""}`} style={{ width: (c.w ?? DEFAULT_W[c.kind]) * 6.5 }}>{c.label}</th>)}
                  <th className="w-10" aria-label="Remove" />
                </tr>
              </thead>
              <tbody>
                {rows.map((_, ri) => (
                  <tr key={ri} className="border-t border-white/[0.06] hover:bg-white/[0.02]">
                    <td className="px-2 text-[11px] text-white/30 tabular-nums">{ri + 1}</td>
                    {tpl.cols.map((c) => <td key={c.key} className="px-1 py-1 align-top">{cell(c, ri, true)}</td>)}
                    <td className="px-1"><button type="button" onClick={() => delRow(ri)} aria-label={`Remove row ${ri + 1}`} className="w-9 h-9 flex items-center justify-center rounded-full text-white/30 hover:text-red-400 hover:bg-red-500/10"><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
              {view.totals.some((t) => t !== undefined) && (
                <tfoot>
                  <tr className="border-t-2 border-white/20 bg-[#161616]">
                    <td />
                    {tpl.cols.map((c, ci) => <td key={c.key} className={`px-3 py-3 text-[13px] font-bold text-white tabular-nums ${numeric(c.kind) ? "text-right" : ""}`}>{ci === 0 ? "Total" : view.totals[ci] !== undefined ? show(c, view.totals[ci] as Val) : ""}</td>)}
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </section>

          {/* Phone: one card per row, easier to type into */}
          <section aria-label="Rows" className="md:hidden space-y-3">
            {rows.map((_, ri) => (
              <div key={ri} className="rounded-2xl border border-white/[0.08] bg-[#111111] p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">Row {ri + 1}</span>
                  <button type="button" onClick={() => delRow(ri)} aria-label={`Remove row ${ri + 1}`} className="w-11 h-11 -mr-2 -mt-2 flex items-center justify-center rounded-full text-white/40 active:text-red-400"><Trash2 size={15} /></button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                  {tpl.cols.map((c) => (
                    <div key={c.key} className={c.kind === "long" || (c.w ?? DEFAULT_W[c.kind]) >= 22 ? "col-span-2" : ""}>
                      <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/50">{c.label}</span>
                      <div className="mt-0.5">{cell(c, ri, false)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {view.totals.some((t) => t !== undefined) && (
              <div className="rounded-2xl border border-white/20 bg-[#161616] p-4 grid grid-cols-2 gap-3">
                {tpl.cols.map((c, ci) => (view.totals[ci] !== undefined && ci > 0 ? (
                  <div key={c.key}><p className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-white/50">Total {c.label.toLowerCase()}</p><p className="text-[16px] font-bold text-white tabular-nums">{show(c, view.totals[ci] as Val)}</p></div>
                ) : null))}
              </div>
            )}
          </section>

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => addRows(1)} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white text-[13px] font-bold"><Plus size={15} /> Add row</button>
            <button type="button" onClick={() => addRows(5)} className="inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full border border-white/[0.12] text-white/80 text-[13px] font-bold hover:bg-white/[0.05]">Add 5 rows</button>
            {hasData && (
              <button type="button" onClick={() => { if (!confirmClear) { setConfirmClear(true); setTimeout(() => setConfirmClear(false), 4000); return; } setRows(Array.from({ length: Math.min(6, tpl.blank) }, () => ({}))); setConfirmClear(false); }} className={`inline-flex items-center gap-2 min-h-[44px] px-4 rounded-full text-[13px] font-bold ${confirmClear ? "bg-red-500 text-white" : "text-white/50 hover:text-white/80"}`}>{confirmClear ? "Tap again to clear every row" : "Clear rows"}</button>
            )}
          </div>
        </div>
      </div>

      {/* Phone: the downloads stay in reach */}
      <div className="sm:hidden flex gap-2 px-4 pt-3 border-t border-white/[0.08] bg-[#0a0a0a] pb-[max(12px,env(safe-area-inset-bottom))] flex-shrink-0">
        <button type="button" onClick={downloadPdf} disabled={!!busy} className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full border border-white/[0.15] text-white text-[14px] font-bold disabled:opacity-40">{busy === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} PDF</button>
        <button type="button" onClick={downloadXlsx} disabled={!!busy} className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-amber-500 text-black text-[14px] font-bold disabled:opacity-40">{busy === "xlsx" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Excel</button>
      </div>
    </div>
  );

  return typeof document === "undefined" ? null : createPortal(body, document.body);
}
