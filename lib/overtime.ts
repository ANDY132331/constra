// Overtime calculation — company-configurable daily/weekly thresholds + multiplier.
//
// Design: an employer can set a daily threshold (hours/day), a weekly threshold
// (hours/week), both, or neither. When both are set, daily overtime is set aside
// first (per day), then whatever regular time remains for the week is checked
// against the weekly threshold — this matches how jurisdictions with both rules
// (e.g. several Canadian provinces) actually calculate it, and avoids
// double-counting the same hours as both daily and weekly overtime.

import type { ClockEntry } from "./mock-data";

export type OvertimeSettings = {
  enabled: boolean;
  dailyThreshold: number | null;
  weeklyThreshold: number | null;
  multiplier: number;
};

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

function dayKey(d: Date): string {
  return d.toDateString();
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
  const weeks = new Map<string, Map<string, number>>();
  for (const e of entries) {
    if (!e.clockOut) continue;
    const hours = (e.clockOut.getTime() - e.clockIn.getTime()) / 3600000;
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

  const regularPay = regularHours * hourlyRate;
  const overtimePay = overtimeHours * hourlyRate * settings.multiplier;

  return {
    regularHours: Math.round(regularHours * 100) / 100,
    overtimeHours: Math.round(overtimeHours * 100) / 100,
    regularPay: Math.round(regularPay * 100) / 100,
    overtimePay: Math.round(overtimePay * 100) / 100,
    totalPay: Math.round((regularPay + overtimePay) * 100) / 100,
  };
}
