// Shift length in hours. Phone clocks drift and a clock-in can carry a timestamp slightly
// ahead of the device reading it, so a shift is never allowed to come out negative —
// negative hours would subtract real pay from a payroll total.

type When = Date | string | number;

const ms = (v: When) => (v instanceof Date ? v.getTime() : new Date(v).getTime());

export function hoursBetween(start: When, end?: When): number {
  const a = ms(start);
  const b = end === undefined ? Date.now() : ms(end);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, (b - a) / 3_600_000);
}

/** "6h 32m" for a running or finished shift. */
export function elapsedLabel(start: When, end?: When): string {
  const total = Math.round(hoursBetween(start, end) * 60);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

/** Past this, a shift is almost certainly a missed clock-out rather than real work. */
export const LONG_SHIFT_HOURS = 16;

/**
 * A forgotten clock-out is the most common error in a time system and the one that costs
 * the contractor money: leave on Friday without clocking out, come back Monday, and the
 * weekend is on the payroll. The other verification checks all run at clock-in and cannot
 * see it.
 *
 * This only reports. Rewriting a recorded time would destroy the evidence the record exists
 * for — a human decides what the shift really was.
 */
export function isImplausibleShift(start: When, end?: When): boolean {
  if (end === undefined) return false; // still running; judge it when it closes
  return hoursBetween(start, end) > LONG_SHIFT_HOURS;
}
