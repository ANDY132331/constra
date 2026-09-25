import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Convert a Date to a local YYYY-MM-DD string for <input type="date"> values.
 *  Avoids the UTC-midnight bug where toISOString() shows yesterday in UTC-negative timezones. */
export function toLocalDateString(d: Date | string): string {
  const t = d instanceof Date ? d : new Date(d + "T12:00:00");
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
}
