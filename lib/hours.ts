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
