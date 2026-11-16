// Overtime calculation — company-configurable daily/weekly thresholds + multiplier.
//
// Design: an employer can set a daily threshold (hours/day), a weekly threshold
// (hours/week), both, or neither. When both are set, daily overtime is set aside
// first (per day), then whatever regular time remains for the week is checked
// against the weekly threshold — this matches how jurisdictions with both rules
// (e.g. several Canadian provinces) actually calculate it, and avoids
// double-counting the same hours as both daily and weekly overtime.

import type { ClockEntry } from "./mock-data";
import { hoursBetween } from "./hours";

/**
 * A custom overtime rule. Two kinds, kept deliberately simple:
 *  - "after": once a person passes `after` hours in a day or a week, further hours pay `multiplier`×
 *  - "days": every hour worked on the chosen weekdays (0 = Sunday … 6 = Saturday) pays `multiplier`×
 * Several rules stack, so California is just three "after" rules.
 */
export type OvertimeRule =
  | { kind: "after"; per: "day" | "week"; after: number; multiplier: number }
  | { kind: "days"; days: number[]; multiplier: number };

export type OvertimeSettings = {
  enabled: boolean;
  dailyThreshold: number | null;
  weeklyThreshold: number | null;
  multiplier: number;
  /** When set and not empty, these replace the daily/weekly/multiplier fields above */
  rules?: OvertimeRule[] | null;
};

export type OvertimePreset = { id: string; name: string; where: string; rules: OvertimeRule[] };

/** Starting points only: laws differ by place, trade and contract, so people check and edit them. */
export const OVERTIME_PRESETS: OvertimePreset[] = [
  { id: "us-federal", name: "US federal", where: "1.5× after 40 hours a week", rules: [{ kind: "after", per: "week", after: 40, multiplier: 1.5 }] },
  { id: "california", name: "California", where: "1.5× after 8 a day, 2× after 12 a day, 1.5× after 40 a week", rules: [{ kind: "after", per: "day", after: 8, multiplier: 1.5 }, { kind: "after", per: "day", after: 12, multiplier: 2 }, { kind: "after", per: "week", after: 40, multiplier: 1.5 }] },
  { id: "ontario", name: "Canada: Ontario", where: "1.5× after 44 hours a week", rules: [{ kind: "after", per: "week", after: 44, multiplier: 1.5 }] },
  { id: "bc", name: "Canada: British Columbia", where: "1.5× after 8 a day, 2× after 12 a day, 1.5× after 40 a week", rules: [{ kind: "after", per: "day", after: 8, multiplier: 1.5 }, { kind: "after", per: "day", after: 12, multiplier: 2 }, { kind: "after", per: "week", after: 40, multiplier: 1.5 }] },
  { id: "alberta", name: "Canada: Alberta", where: "1.5× after 8 a day or 44 a week", rules: [{ kind: "after", per: "day", after: 8, multiplier: 1.5 }, { kind: "after", per: "week", after: 44, multiplier: 1.5 }] },
  { id: "daily8", name: "Time and a half after 8 a day", where: "A common company rule", rules: [{ kind: "after", per: "day", after: 8, multiplier: 1.5 }] },
  { id: "weekend", name: "Weekend double time", where: "2× on Saturday and Sunday, plus 1.5× after 40 a week", rules: [{ kind: "days", days: [0, 6], multiplier: 2 }, { kind: "after", per: "week", after: 40, multiplier: 1.5 }] },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Plain-words summary of a rule list, for screens and exports */
export function describeRules(rules: OvertimeRule[]): string {
  return rules.map((r) => r.kind === "after"
    ? `${r.multiplier}× after ${r.after} h/${r.per === "day" ? "day" : "week"}`
    : `${r.multiplier}× on ${r.days.map((d) => DAY_NAMES[d]).join(", ")}`).join("; ");
}

/** Drops rules that can't mean anything, so a half-typed row never turns into odd pay */
export function cleanRules(rules: OvertimeRule[] | null | undefined): OvertimeRule[] {
  return (rules ?? []).filter((r) => Number.isFinite(r.multiplier) && r.multiplier >= 1
    && (r.kind === "after" ? Number.isFinite(r.after) && r.after > 0 : Array.isArray(r.days) && r.days.length > 0));
}

export type OvertimeSplit = {
  regularHours: number;
  overtimeHours: number;
};

/** Sunday-start week boundary, matching the rest of the app's week calculations. */
export function weekStartOf(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  s.setDate(s.getDate() - s.getDay());
  return s;
}

function dayKey(d: Date | string): string {
  return new Date(d).toDateString();
}

/**
 * Splits a set of hours-per-day totals (already grouped into one worker's one
 * week) into regular vs. overtime hours per the given settings.
 */
export function splitWeekHours(hoursPerDay: number[], settings: OvertimeSettings): OvertimeSplit {
  if (!settings.enabled) {
    return { regularHours: hoursPerDay.reduce((s, h) => s + h, 0), overtimeHours: 0 };
  }

  let dailyOT = 0;
  let regularAfterDaily = 0;

  for (const hours of hoursPerDay) {
    if (settings.dailyThreshold != null && hours > settings.dailyThreshold) {
      dailyOT += hours - settings.dailyThreshold;
      regularAfterDaily += settings.dailyThreshold;
    } else {
      regularAfterDaily += hours;
    }
  }

  let weeklyOT = 0;
  let finalRegular = regularAfterDaily;
  if (settings.weeklyThreshold != null && regularAfterDaily > settings.weeklyThreshold) {
    weeklyOT = regularAfterDaily - settings.weeklyThreshold;
    finalRegular = settings.weeklyThreshold;
  }

  return { regularHours: finalRegular, overtimeHours: dailyOT + weeklyOT };
}

/**
 * Computes a full regular/overtime/pay breakdown for one worker across a set of
 * clock entries (any date range — entries are grouped into Sunday-start weeks
 * internally so overtime thresholds apply correctly even if the report period
 * doesn't align to week boundaries).
 */
export function computeWorkerOvertime(
  entries: ClockEntry[],
  hourlyRate: number,
  settings: OvertimeSettings,
): { regularHours: number; overtimeHours: number; regularPay: number; overtimePay: number; totalPay: number } {
  // Group completed entries by Sunday-start week, then by day within that week.
  const rules = settings.enabled ? cleanRules(settings.rules) : [];
  if (rules.length) return computeWithRules(entries, hourlyRate, rules);
  const weeks = new Map<string, Map<string, number>>();
  for (const e of entries) {
    if (!e.clockOut) continue;
    const hours = hoursBetween(e.clockIn, e.clockOut);
    if (hours <= 0) continue;
    const wKey = weekStartOf(e.clockIn).toISOString();
    const dKey = dayKey(e.clockIn);
    const week = weeks.get(wKey) ?? new Map<string, number>();
    week.set(dKey, (week.get(dKey) ?? 0) + hours);
    weeks.set(wKey, week);
  }

  let regularHours = 0;
  let overtimeHours = 0;
  for (const week of weeks.values()) {
    const { regularHours: r, overtimeHours: o } = splitWeekHours([...week.values()], settings);
    regularHours += r;
    overtimeHours += o;
  }

  // A rate or multiplier that never got set must not turn into NaN pay or unpaid overtime.
  // Overtime is premium time, so a multiplier below 1 is always a misconfiguration.
  const rate = Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : 0;
  const multiplier = Number.isFinite(settings.multiplier) && settings.multiplier >= 1 ? settings.multiplier : 1.5;

  const regularPay = regularHours * rate;
  const overtimePay = overtimeHours * rate * multiplier;

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    totalPay: Math.round((regularPay + overtimePay) * 100) / 100,
  };
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** The old three settings as rules, so existing companies open the new editor showing what they already have */
export function legacyToRules(daily: number | null, weekly: number | null, multiplier: number): OvertimeRule[] {
  const rules: OvertimeRule[] = [];
  if (daily != null) rules.push({ kind: "after", per: "day", after: daily, multiplier });
  if (weekly != null) rules.push({ kind: "after", per: "week", after: weekly, multiplier });
  return rules;
}

/**
 * Rules that fit the original daily/weekly/multiplier fields exactly (at most one of each, one
 * multiplier, no weekday rule) can be saved the old way, so most companies never need migration 016.
 */
export function rulesToLegacy(rules: OvertimeRule[]): { dailyThreshold: number | null; weeklyThreshold: number | null; multiplier: number } | null {
  const after = rules.filter((r): r is Extract<OvertimeRule, { kind: "after" }> => r.kind === "after");
  if (after.length !== rules.length) return null;
  const day = after.filter((r) => r.per === "day"), week = after.filter((r) => r.per === "week");
  if (day.length > 1 || week.length > 1) return null;
  if (new Set(after.map((r) => r.multiplier)).size > 1) return null;
  return { dailyThreshold: day[0]?.after ?? null, weeklyThreshold: week[0]?.after ?? null, multiplier: after[0]?.multiplier ?? 1.5 };
}

/** Splits `hours` that start `from` hours into the period into pieces, each with the multiplier of the tier it falls in */
function tierPieces(from: number, hours: number, tiers: { after: number; multiplier: number }[]): { hours: number; mult: number }[] {
  const out: { hours: number; mult: number }[] = [];
  const cuts = [...new Set(tiers.map((t) => t.after))].sort((a, b) => a - b).filter((c) => c > from && c < from + hours);
  const edges = [from, ...cuts, from + hours];
  for (let i = 0; i < edges.length - 1; i++) {
    const mid = (edges[i] + edges[i + 1]) / 2;
    const mult = tiers.reduce((m, t) => (mid >= t.after ? Math.max(m, t.multiplier) : m), 1);
    out.push({ hours: edges[i + 1] - edges[i], mult });
  }
  return out;
}

/**
 * Custom rules. Per day, the best matching rule wins ("days" rules, then the daily tiers). Hours
 * still at regular pay after that count toward the weekly tiers, so one hour is never paid
 * overtime twice. That matches how the daily/weekly settings above already behave.
 */
function computeWithRules(entries: ClockEntry[], hourlyRate: number, rules: OvertimeRule[]) {
  const dayRules = rules.filter((r): r is Extract<OvertimeRule, { kind: "days" }> => r.kind === "days");
  const dailyTiers = rules.filter((r): r is Extract<OvertimeRule, { kind: "after" }> => r.kind === "after" && r.per === "day");
  const weeklyTiers = rules.filter((r): r is Extract<OvertimeRule, { kind: "after" }> => r.kind === "after" && r.per === "week");

  const weeks = new Map<string, Map<string, { date: Date; hours: number }>>();
  for (const e of entries) {
    if (!e.clockOut) continue;
    const hours = hoursBetween(e.clockIn, e.clockOut);
    if (hours <= 0) continue;
    const wKey = weekStartOf(e.clockIn).toISOString();
    const dKey = dayKey(e.clockIn);
    const week = weeks.get(wKey) ?? new Map<string, { date: Date; hours: number }>();
    const cur = week.get(dKey) ?? { date: new Date(e.clockIn), hours: 0 };
    cur.hours += hours;
    week.set(dKey, cur);
    weeks.set(wKey, week);
  }

  let regular = 0, premium = 0, premiumPay = 0;
  const rate = Number.isFinite(hourlyRate) && hourlyRate > 0 ? hourlyRate : 0;
  const take = (h: number, mult: number) => { if (mult > 1) { premium += h; premiumPay += h * rate * mult; } else regular += h; };

  for (const week of weeks.values()) {
    let regularSoFar = 0;
    const days = [...week.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
    for (const day of days) {
      const dayMult = dayRules.filter((r) => r.days.includes(day.date.getDay())).reduce((m, r) => Math.max(m, r.multiplier), 1);
      const pieces = dayMult > 1 ? [{ hours: day.hours, mult: dayMult }] : tierPieces(0, day.hours, dailyTiers);
      for (const piece of pieces) {
        if (piece.mult > 1) { take(piece.hours, piece.mult); continue; }
        for (const w of tierPieces(regularSoFar, piece.hours, weeklyTiers)) take(w.hours, w.mult);
        regularSoFar += piece.hours;
      }
    }
  }

  const regularPay = regular * rate;
  return {
    regularHours: r2(regular),
    overtimeHours: r2(premium),
    regularPay: r2(regularPay),
    overtimePay: r2(premiumPay),
    totalPay: r2(regularPay + premiumPay),
  };
}
