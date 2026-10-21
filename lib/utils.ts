import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert a Date or date string to a local YYYY-MM-DD for <input type="date"> values.
 *
 *  Two different kinds of input arrive here and they need opposite handling:
 *   - A bare "2026-10-12" is a calendar date with no timezone. Parsing it directly gives UTC
 *     midnight, which is the previous day anywhere west of Greenwich, so parse it at local
 *     noon where no timezone or DST shift can move it off that day.
 *   - A Date, or a full ISO timestamp like "2026-10-12T00:00:00.000Z", is an instant. We want
 *     the calendar day it falls on locally, so read it as-is.
 *
 *  The old version appended "T12:00:00" to every string, which turned a full ISO timestamp
 *  into "…000ZT12:00:00" — an invalid date, and "NaN-NaN-NaN" out. A date input rejects that
 *  and shows empty, so opening a record and saving it would have silently dropped the date.
 *  The store currently revives these as Date objects, but the signature accepts strings and
 *  rows from the database arrive as strings.
 */
/** Return a new Date set to 23:59:59.999 on the same local calendar day as d.
 *
 *  Dates in this app are stored at local noon (form.date + "T12:00:00") to
 *  survive timezone shifts. Comparing one directly to `new Date()` marks it
 *  overdue from noon; comparing against endOfDay() waits until midnight.
 */
/**
 * Text colour from a person's or project's colour, which can be any shade the admin picked.
 * Mixed toward the theme's ink (`--ink-mix` / `--ink-base` in globals.css): lighter on dark so
 * a plum or navy avatar stays readable, darker on light so hi-vis yellow does. Inline styles
 * can't be reached by the light-theme class remaps, so they go through this instead.
 */
export function ink(color: string | undefined | null): string | undefined {
  return color ? `color-mix(in oklab, ${color} var(--ink-mix, 65%), var(--ink-base, #fff))` : undefined;
}

/** Readable text colour for a label sitting on a solid `#rrggbb` fill: near-black on light fills (hi-vis yellow), white on dark ones. */
export function textOn(hex: string | undefined | null): string {
  const m = /^#?([0-9a-f]{6})/i.exec(hex ?? "");
  if (!m) return "#fff";
  const n = parseInt(m[1], 16);
  const lin = (c: number) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  // above ~0.18 white falls under 4.5:1 while near-black clears it
  return L > 0.18 ? "#111" : "#fff";
}

export function endOfDay(d: Date | string): Date {
  const t = d instanceof Date ? new Date(d) : new Date(d);
  t.setHours(23, 59, 59, 999);
  return t;
}

export function toLocalDateString(d: Date | string): string {
  const t = d instanceof Date
    ? d
    : /^\d{4}-\d{2}-\d{2}$/.test(d)
      ? new Date(`${d}T12:00:00`)
      : new Date(d);
  // Better an empty date field than "NaN-NaN-NaN", which reads as a value and saves as junk.
  if (Number.isNaN(t.getTime())) return "";
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
