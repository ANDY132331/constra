// Leaving and coming back to a job site during a shift. Each move is kept as a flag on the open
// clock entry, so the owner sees exact times on Time and the dashboard, and payroll keeps the
// evidence next to the hours it affects.

import type { ClockEntry, VerificationFlag } from "./mock-data";

export type SiteMove = { kind: "left" | "returned"; at: Date; note: string; metres?: number };

export function siteMoves(entry: Pick<ClockEntry, "verificationFlags">): SiteMove[] {
  return (entry.verificationFlags ?? [])
    .filter((f) => f.type === "left-site" || f.type === "returned-site")
    .map((f) => ({
      kind: f.type === "left-site" ? "left" as const : "returned" as const,
      at: new Date(f.detectedAt),
      note: f.note,
      metres: f.metres,
    }))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

/** True when the last recorded move on this shift was leaving */
export function isAwayFromSite(entry: Pick<ClockEntry, "verificationFlags">): boolean {
  const moves = siteMoves(entry);
  return moves.length > 0 && moves[moves.length - 1].kind === "left";
}

export function leftFlag(projectName: string, metres: number, at: Date): VerificationFlag {
  return {
    type: "left-site",
    severity: "medium",
    note: `Left ${projectName} at ${at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}, ${fmtDistance(metres)} from the site`,
    detectedAt: at,
    metres: Math.round(metres),
  };
}

export function returnedFlag(projectName: string, at: Date): VerificationFlag {
  return {
    type: "returned-site",
    severity: "low",
    note: `Back at ${projectName} at ${at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
    detectedAt: at,
  };
}

export function fmtDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(m >= 10_000 ? 0 : 1)} km` : `${Math.round(m)} m`;
}

export function metresBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
