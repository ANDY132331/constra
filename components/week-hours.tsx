"use client";

import { useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ClockEntry, Worker } from "@/lib/mock-data";
import { hoursBetween } from "@/lib/hours";
import { computeWorkerOvertime, type OvertimeSettings } from "@/lib/overtime";
import { ink } from "@/lib/utils";

/** The slice of an entry this summary reads. Running shifts come in with no clockOut. */
export type WeekEntry = Pick<ClockEntry, "id" | "workerId" | "clockIn" | "clockOut">;

const DAY = 86_400_000;
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function rangeLabel(start: Date) {
  const end = new Date(start.getTime() + 6 * DAY);
  const sameMonth = start.getMonth() === end.getMonth();
  const a = start.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
  const b = end.toLocaleDateString("en-CA", sameMonth ? { day: "numeric" } : { month: "short", day: "numeric" });
  return `${a} – ${b}`;
}

const hrs = (h: number) => (h >= 100 ? h.toFixed(0) : h.toFixed(1));

/**
 * One week of hours at a glance: the total, a bar per day, and each worker's share. The list
 * below it used to be every shift ever recorded, so "how many hours did Marco do this week"
 * meant scrolling and adding up in your head.
 */
export function WeekHours({
  entries, weekStart, weekOffset, onWeekChange, getWorker, overtime, now,
}: {
  entries: WeekEntry[];
  weekStart: Date;
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  getWorker: (id: string) => Worker | undefined;
  overtime: OvertimeSettings;
  /** Passed in so running shifts tick with the page's own timer */
  now: number;
}) {
  const summary = useMemo(() => {
    const days = Array.from({ length: 7 }, () => 0);
    const people = new Map<string, { hours: number; shifts: number; live: boolean; done: ClockEntry[] }>();
    let total = 0;
    let running = 0;
    for (const e of entries) {
      const live = !e.clockOut;
      const h = hoursBetween(e.clockIn, live ? now : e.clockOut);
      const day = Math.floor((new Date(e.clockIn).getTime() - weekStart.getTime()) / DAY);
      if (day >= 0 && day < 7) days[day] += h;
      total += h;
      if (live) running++;
      const p = people.get(e.workerId) ?? { hours: 0, shifts: 0, live: false, done: [] };
      p.hours += h;
      p.shifts++;
      p.live ||= live;
      if (!live) p.done.push(e as ClockEntry);
      people.set(e.workerId, p);
    }
    const rows = [...people].flatMap(([id, p]) => {
      const worker = getWorker(id);
      if (!worker) return [];
      // Same engine payroll uses, so this never promises overtime payroll won't pay
      const ot = overtime.enabled ? computeWorkerOvertime(p.done, worker.hourlyRate ?? 0, overtime).overtimeHours : 0;
      return [{ worker, ...p, overtime: ot }];
    }).sort((a, b) => b.hours - a.hours);
    const overtimeTotal = rows.reduce((s, r) => s + r.overtime, 0);
    return { days, rows, total, running, overtimeTotal, shifts: entries.length };
  }, [entries, weekStart, getWorker, overtime, now]);

  const maxDay = Math.max(...summary.days, 1);
  const maxPerson = Math.max(...summary.rows.map((r) => r.hours), 1);
  const todayIndex = weekOffset === 0 ? new Date(now).getDay() : -1;
  const weekTitle = weekOffset === 0 ? "This week" : weekOffset === -1 ? "Last week" : rangeLabel(weekStart);

  return (
    <section aria-label="Hours by week" className="bg-[#111111] border border-white/[0.07] rounded-2xl overflow-hidden">
      {/* Week switcher */}
      <div className="flex items-center justify-between gap-2 px-2 pt-2">
        <button type="button" onClick={() => onWeekChange(weekOffset - 1)} aria-label="Previous week"
          className="w-11 h-11 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors">
          <ChevronLeft size={18} />
        </button>
        <div className="text-center min-w-0">
          <p className="text-[14px] font-bold text-white">{weekTitle}</p>
          <p className="text-[11px] text-white/50 tabular-nums">{rangeLabel(weekStart)}</p>
        </div>
        <button type="button" onClick={() => onWeekChange(weekOffset + 1)} disabled={weekOffset >= 0} aria-label="Next week"
          className="w-11 h-11 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-25 disabled:pointer-events-none">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="px-4 sm:px-5 pb-4 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8 lg:items-start">
        <div>
          {/* Total */}
          <div className="flex items-end justify-between gap-3 mt-2">
            <div>
              <p className="font-display text-[44px] leading-[0.9] font-extrabold text-white tabular-nums">
                {hrs(summary.total)}<span className="text-[22px] text-white/50 ml-0.5">h</span>
              </p>
              <p className="text-[12px] text-white/55 mt-1.5">
                {summary.shifts} shift{summary.shifts === 1 ? "" : "s"} · {summary.rows.length} worker{summary.rows.length === 1 ? "" : "s"}
                {summary.running > 0 && <> · <span className="text-green-400">{summary.running} running</span></>}
              </p>
            </div>
            {summary.overtimeTotal > 0 && (
              <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 rounded-full px-2.5 py-1 tabular-nums flex-shrink-0">
                {hrs(summary.overtimeTotal)}h overtime
              </span>
            )}
          </div>

          {/* A bar per day */}
          <div className="grid grid-cols-7 gap-1.5 mt-5" role="list" aria-label="Hours per day">
            {summary.days.map((h, i) => {
              const isToday = i === todayIndex;
              const future = todayIndex >= 0 && i > todayIndex;
              const date = new Date(weekStart.getTime() + i * DAY);
              return (
                <div key={i} role="listitem" aria-label={`${date.toLocaleDateString("en-CA", { weekday: "long" })}: ${h.toFixed(1)} hours`} className="flex flex-col items-center gap-1.5">
                  <span className={`text-[10px] font-semibold tabular-nums h-3 ${h > 0 ? (isToday ? "text-amber-400" : "text-white/60") : "text-transparent"}`}>
                    {h > 0 ? hrs(h) : "0"}
                  </span>
                  <div className="w-full h-20 rounded-md bg-white/[0.04] flex items-end overflow-hidden">
                    <div
                      className={`week-bar w-full rounded-md ${isToday ? "bg-amber-400" : "bg-sky-500/70"}`}
                      style={{ height: `${h > 0 ? Math.max(6, (h / maxDay) * 100) : 0}%` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold ${isToday ? "text-amber-400" : future ? "text-white/30" : "text-white/55"}`}>
                    {DAY_LETTERS[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Each worker's share */}
        {summary.rows.length > 0 ? (
          <ul className="mt-5 lg:mt-2 space-y-3" aria-label="Hours per worker">
            {summary.rows.map((r) => (
              <li key={r.worker.id} className="flex items-center gap-3">
                <div className="relative w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center text-[11px] font-black"
                  style={{ backgroundColor: r.worker.color + "22", color: ink(r.worker.color) }}>
                  {r.worker.photo ? <img src={r.worker.photo} alt="" className="w-full h-full object-cover" /> : r.worker.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-white truncate flex items-center gap-1.5">
                      {r.live && <span className="crew-pulse w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" aria-label="On shift now" />}
                      {r.worker.name}
                    </p>
                    <p className="text-[13px] font-bold text-white tabular-nums flex-shrink-0">
                      {hrs(r.hours)}h
                      {r.overtime > 0 && <span className="text-orange-400 text-[11px] font-semibold ml-1.5">+{hrs(r.overtime)} OT</span>}
                    </p>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-white/[0.06] overflow-hidden flex">
                    <div className="week-bar h-full bg-sky-500/80" style={{ width: `${((r.hours - r.overtime) / maxPerson) * 100}%` }} />
                    {r.overtime > 0 && <div className="week-bar h-full bg-orange-400" style={{ width: `${(r.overtime / maxPerson) * 100}%` }} />}
                  </div>
                  <p className="text-[11px] text-white/45 mt-1">{r.shifts} shift{r.shifts === 1 ? "" : "s"}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-5 lg:mt-2 text-[13px] text-white/55 text-center py-4">No shifts this week.</p>
        )}
      </div>
    </section>
  );
}
