"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { FileSpreadsheet, FileText, ImagePlus, Loader2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { isForemanOrAbove } from "@/lib/permissions";
import { CustomSelect } from "@/components/ui/custom-select";
import { PayrollEmail } from "@/components/payroll-email";
import { weekStartOf } from "@/lib/overtime";
import {
  buildTimesheet, fmtDate, fmtDayShort, fmtHours, fmtTime, periodLabel, type WorkerTimesheet,
} from "@/lib/timesheet";

type Preset = "this-week" | "last-week" | "two-weeks" | "this-month" | "last-month" | "custom";
const PRESETS: { id: Preset; label: string }[] = [
  { id: "this-week", label: "This week" },
  { id: "last-week", label: "Last week" },
  { id: "two-weeks", label: "Last 2 weeks" },
  { id: "this-month", label: "This month" },
  { id: "last-month", label: "Last month" },
  { id: "custom", label: "Pick dates" },
];
/** Longest custom range: two months is already a 60-row sheet per person */
const MAX_DAYS = 62;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fromIso = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

function presetRange(p: Preset, today: Date): [Date, Date] {
  const week = weekStartOf(today);
  switch (p) {
    case "last-week": return [addDays(week, -7), addDays(week, -1)];
    case "two-weeks": return [addDays(week, -7), addDays(week, 6)];
    case "this-month": return [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 0)];
    case "last-month": return [new Date(today.getFullYear(), today.getMonth() - 1, 1), new Date(today.getFullYear(), today.getMonth(), 0)];
    default: return [week, addDays(week, 6)];
  }
}

export default function TimesheetsPage() {
  const {
    workers, projects, clockEntries, currentUser, companyName, companyLogo,
    overtimeEnabled, overtimeDailyThreshold, overtimeWeeklyThreshold, overtimeMultiplier,
  } = useStore();
  const canSeeCrew = isForemanOrAbove(currentUser.role);

  // The Monday reminder opens this page with ?send=last-week, ready to send in one tap
  const [preset, setPreset] = useState<Preset>(() => {
    try { return new URLSearchParams(window.location.search).get("send") === "last-week" ? "last-week" : "this-week"; } catch { return "this-week"; }
  });
  const [today] = useState(() => new Date());
  const [custom, setCustom] = useState(() => { const [a, b] = presetRange("this-week", new Date()); return { from: iso(a), to: iso(b) }; });
  const [person, setPerson] = useState("all");
  const [job, setJob] = useState("all");
  const [busy, setBusy] = useState<"pdf" | "xlsx" | null>(null);

  const [start, end] = useMemo<[Date, Date]>(() => {
    if (preset !== "custom") return presetRange(preset, today);
    let a = fromIso(custom.from), b = fromIso(custom.to);
    if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return presetRange("this-week", today);
    if (b < a) [a, b] = [b, a];
    if ((b.getTime() - a.getTime()) / 86_400_000 >= MAX_DAYS) b = addDays(a, MAX_DAYS - 1);
    return [a, b];
  }, [preset, custom, today]);

  const sheet = useMemo(() => buildTimesheet({
    entries: clockEntries,
    workers,
    projects,
    start,
    end,
    // Crew see their own sheet only, whatever is picked
    workerIds: !canSeeCrew ? [currentUser.id] : person === "all" ? undefined : [person],
    projectId: job === "all" ? undefined : job,
    overtime: { enabled: overtimeEnabled, dailyThreshold: overtimeDailyThreshold, weeklyThreshold: overtimeWeeklyThreshold, multiplier: overtimeMultiplier },
  }), [clockEntries, workers, projects, start, end, canSeeCrew, currentUser.id, person, job, overtimeEnabled, overtimeDailyThreshold, overtimeWeeklyThreshold, overtimeMultiplier]);

  const download = async (kind: "pdf" | "xlsx") => {
    if (busy) return;
    setBusy(kind);
    try {
      const opts = { companyName, logo: companyLogo || undefined };
      if (kind === "pdf") await (await import("@/lib/timesheet-pdf")).exportTimesheetPdf(sheet, opts);
      else await (await import("@/lib/timesheet-xlsx")).exportTimesheetXlsx(sheet, opts);
      toast.success(kind === "pdf" ? "Timesheet PDF saved" : "Timesheet saved for Excel");
    } catch (e) {
      console.error("[timesheets] export failed:", e);
      toast.error(navigator.onLine ? "Couldn't make the file. Try again." : "Couldn't make the file. Open Timesheets once with signal so it can load, then try again.");
    } finally {
      setBusy(null);
    }
  };

  const crewOptions = [
    { value: "all", label: "Everyone" },
    ...[...workers].sort((a, b) => a.name.localeCompare(b.name)).map((w) => ({ value: w.id, label: w.name })),
  ];
  const jobOptions = [{ value: "all", label: "All jobs" }, ...projects.map((p) => ({ value: p.id, label: p.name }))];
  const empty = sheet.people.length === 0;
  const period = periodLabel(sheet.start, sheet.end);

  return (
    <div className="max-w-4xl mx-auto pb-36 lg:pb-12 space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white">Timesheets</h2>
        <p className="text-[13px] text-white/60 mt-1">
          {canSeeCrew ? "Pick the dates and who's on it, check it here, then download." : "Your hours, ready to download or send."}
        </p>
      </div>

      {/* Controls */}
      <section aria-label="Timesheet options" className="bg-[#111111] border border-white/[0.07] rounded-2xl p-4 sm:p-5 space-y-4">
        <div className="flex gap-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap scrollbar-none" role="radiogroup" aria-label="Dates">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={preset === p.id}
              onClick={() => setPreset(p.id)}
              className={`flex-shrink-0 min-h-[40px] px-4 rounded-full text-[13px] font-semibold transition-colors ${preset === p.id ? "bg-amber-500 text-black" : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1]"}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {preset === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">From</span>
              <input id="ts-from" type="date" value={custom.from} max={custom.to} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, from: e.target.value }))}
                className="mt-1 w-full min-h-[44px] bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-3 text-[14px] text-white" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-white/55 uppercase tracking-wider">To</span>
              <input id="ts-to" type="date" value={custom.to} min={custom.from} onChange={(e) => e.target.value && setCustom((c) => ({ ...c, to: e.target.value }))}
                className="mt-1 w-full min-h-[44px] bg-[#1a1a1a] border border-white/[0.1] rounded-xl px-3 text-[14px] text-white" />
            </label>
            {(fromIso(custom.to).getTime() - fromIso(custom.from).getTime()) / 86_400_000 >= MAX_DAYS && (
              <p className="col-span-2 text-[12px] text-amber-400">Up to {MAX_DAYS} days at a time. Showing {period}.</p>
            )}
          </div>
        )}

        {canSeeCrew && (
          <div className="grid grid-cols-2 gap-3">
            <CustomSelect value={person} onChange={setPerson} options={crewOptions} />
            <CustomSelect value={job} onChange={setJob} options={jobOptions} />
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          <button type="button" onClick={() => download("pdf")} disabled={empty || !!busy}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-amber-500 hover:bg-amber-400 text-black text-[14px] font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none">
            {busy === "pdf" ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />} Download PDF
          </button>
          <button type="button" onClick={() => download("xlsx")} disabled={empty || !!busy}
            className="flex-1 inline-flex items-center justify-center gap-2 min-h-[48px] rounded-full bg-white/[0.08] hover:bg-white/[0.12] text-white text-[14px] font-bold transition-colors disabled:opacity-40 disabled:pointer-events-none">
            {busy === "xlsx" ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />} Download Excel
          </button>
        </div>

        {canSeeCrew && !companyLogo && (
          <Link href="/settings" className="flex items-center gap-2 text-[12px] text-white/60 hover:text-white/80 transition-colors">
            <ImagePlus size={14} className="text-amber-400 flex-shrink-0" />
            Add your company logo in Settings and it goes on every timesheet.
          </Link>
        )}
      </section>

      {(currentUser.role === "Admin" || currentUser.role === "Project Manager") && (
        <PayrollEmail sheet={sheet} period={period} empty={empty} />
      )}

      {/* The sheet as it will print */}
      <article aria-label={`Timesheet preview, ${period}`} className="ts-paper rounded-2xl overflow-hidden">
        {/* A div, not <header>: the app styles every header element as its top bar */}
        <div className="ts-head">
          <div className="flex items-center gap-3 min-w-0 w-full sm:w-auto">
            {companyLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={companyLogo} alt={`${companyName} logo`} className="ts-logo" />
            ) : (
              <span className="ts-mark" aria-hidden>{(companyName || "C").charAt(0).toUpperCase()}</span>
            )}
            <div className="min-w-0">
              <p className="ts-company truncate">{companyName || "Your company"}</p>
              <p className="ts-muted text-[11px]">Prepared {today.toLocaleDateString("en-CA", { dateStyle: "long" })}</p>
            </div>
          </div>
          <div className="flex items-baseline justify-between gap-3 w-full sm:w-auto sm:block sm:text-right flex-shrink-0">
            <p className="ts-title">Timesheet</p>
            <p className="ts-ink2 text-[12px] tabular-nums">{period}</p>
          </div>
        </div>
        <div className="ts-rule"><span /></div>

        {empty ? (
          <div className="px-5 sm:px-8 py-14 text-center">
            <p className="ts-ink font-semibold text-[15px]">No finished shifts in these dates</p>
            <p className="ts-muted text-[13px] mt-1">
              {sheet.running > 0 ? `${sheet.running} shift${sheet.running === 1 ? " is" : "s are"} still running. They show up here once clocked out.` : "Try other dates, or check that everyone clocked out."}
            </p>
          </div>
        ) : (
          <div className="px-5 sm:px-8 pb-8">
            {sheet.people.length > 1 && (
              <section aria-label="Crew summary" className="pt-6">
                <Stats items={[
                  { label: "Total hours", value: fmtHours(sheet.totals.total) },
                  ...(sheet.overtimeOn ? [{ label: "Overtime", value: fmtHours(sheet.totals.overtime), ot: sheet.totals.overtime > 0 }] : []),
                  { label: "People", value: String(sheet.people.length) },
                  { label: "Shifts", value: String(sheet.totals.shifts) },
                ]} />
                <ul className="mt-5">
                  {sheet.people.map((p) => (
                    <li key={p.worker.id}>
                      <a href={`#ts-${p.worker.id}`} className="ts-row flex items-center justify-between gap-3 py-3">
                        <span className="min-w-0">
                          <span className="ts-ink font-semibold text-[14px] block truncate">{p.worker.name}</span>
                          <span className="ts-muted text-[12px]">{p.shiftCount} shift{p.shiftCount === 1 ? "" : "s"}{p.overtime > 0 && <> · <span className="ts-ot">{fmtHours(p.overtime)} overtime</span></>}</span>
                        </span>
                        <span className="ts-ink font-bold text-[15px] tabular-nums">{fmtHours(p.total)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
                {sheet.running > 0 && (
                  <p className="ts-muted text-[12px] mt-3">{sheet.running} running shift{sheet.running === 1 ? "" : "s"} not counted until clocked out.</p>
                )}
              </section>
            )}

            {sheet.people.map((p) => <PersonSheet key={p.worker.id} p={p} overtimeOn={sheet.overtimeOn} />)}
          </div>
        )}
      </article>
    </div>
  );
}

function Stats({ items }: { items: { label: string; value: string; ot?: boolean }[] }) {
  return (
    <div className={`grid ${items.length === 3 ? "grid-cols-3" : "grid-cols-2"} sm:flex gap-y-4 gap-x-3 sm:gap-0`}>
      {items.map((s, i) => (
        <div key={s.label} className={`sm:flex-1 ${i > 0 ? "sm:pl-5 sm:border-l ts-border" : ""}`}>
          <p className="ts-muted text-[10px] font-semibold uppercase tracking-[0.1em]">{s.label}</p>
          <p className={`font-display text-[26px] sm:text-[30px] leading-none font-extrabold mt-1.5 tabular-nums ${s.ot ? "ts-ot" : "ts-ink"}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

function PersonSheet({ p, overtimeOn }: { p: WorkerTimesheet; overtimeOn: boolean }) {
  // Short periods list every day like a paper sheet; long ones only the days worked
  const days = p.days.length <= 16 ? p.days : p.days.filter((d) => d.shifts.length);
  return (
    <section id={`ts-${p.worker.id}`} aria-label={`${p.worker.name}'s hours`} className="pt-8 scroll-mt-24">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h3 className="ts-ink text-[20px] font-bold leading-tight truncate">{p.worker.name}</h3>
          <p className="ts-muted text-[12px]">{p.worker.customRole || p.worker.role}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="font-display ts-ink text-[30px] leading-none font-extrabold tabular-nums">{fmtHours(p.total)}<span className="ts-muted text-[16px] ml-0.5">h</span></p>
          {overtimeOn && <p className="text-[11px] ts-muted tabular-nums mt-1">{fmtHours(p.regular)} reg{p.overtime > 0 && <> · <span className="ts-ot font-semibold">{fmtHours(p.overtime)} OT</span></>}</p>}
        </div>
      </div>

      <ol className="mt-4 ts-table">
        {days.map((d) => (
          <li key={d.date.toDateString()} className={`flex gap-3 py-2.5 ${d.shifts.length ? "" : "ts-off"}`}>
            <div className="w-[52px] flex-shrink-0">
              <p className="ts-ink text-[13px] font-bold leading-tight">{fmtDayShort(d.date)}</p>
              <p className="ts-muted text-[11px] tabular-nums">{fmtDate(d.date)}</p>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              {d.shifts.length ? d.shifts.map((s) => (
                <div key={s.id} className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="ts-ink2 text-[13px] truncate">{s.projectName}</p>
                    <p className="ts-muted text-[11px] tabular-nums">{fmtTime(s.clockIn)} – {fmtTime(s.clockOut)}</p>
                  </div>
                  <p className="ts-ink text-[14px] font-bold tabular-nums flex-shrink-0">{fmtHours(s.hours)}</p>
                </div>
              )) : <p className="ts-muted text-[13px] leading-[2.2]">Off</p>}
            </div>
          </li>
        ))}
      </ol>
      <div className="ts-total flex items-center justify-between px-3 py-2.5 rounded-lg mt-1">
        <span className="ts-ink text-[13px] font-bold">Total</span>
        <span className="ts-ink text-[15px] font-bold tabular-nums">{fmtHours(p.total)}</span>
      </div>

      <div className="grid grid-cols-2 gap-6 mt-8">
        {["Employee signature", "Supervisor signature"].map((l) => (
          <div key={l}>
            <div className="ts-sign h-8" />
            <p className="ts-muted text-[10px] mt-1.5 uppercase tracking-wider">{l}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
