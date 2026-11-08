// Fire-and-forget notifications for the crew plan and time off. A failure here never blocks the
// save itself; the change is already stored and shows in the app either way.

export function notifyTeam(body:
  | { event: "crew-plan"; workerId: string; date: string }
  | { event: "time-off-request" | "time-off-decision"; requestId: string }) {
  // Give the save a moment to reach the database before the server reads it back
  setTimeout(() => {
    fetch("/api/push/team", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
  }, 2500);
}

/** yyyy-MM-dd for a day in the phone's own calendar */
export function isoDay(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function fromIsoDay(s: string) {
  return new Date(`${s}T00:00:00`);
}

export function addDaysIso(s: string, n: number) {
  const d = fromIsoDay(s);
  d.setDate(d.getDate() + n);
  return isoDay(d);
}
