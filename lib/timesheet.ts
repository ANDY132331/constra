// One timesheet, three outputs. The on-screen preview, the PDF and the Excel file all read the
// result of buildTimesheet, so the hours in each can never disagree with each other.

import type { ClockEntry, Project, Worker } from "./mock-data";
import { hoursBetween } from "./hours";
import { computeWorkerOvertime, type OvertimeSettings } from "./overtime";

export type TimesheetShift = {
  id: string;
  projectName: string;
  clockIn: Date;
  clockOut: Date;
  hours: number;
};

export type TimesheetDay = {
  date: Date;
  shifts: TimesheetShift[];
  hours: number;
};

export type WorkerTimesheet = {
  worker: Worker;
  /** Every day in the period, worked or not, so the sheet reads like a paper timesheet */
  days: TimesheetDay[];
  shiftCount: number;
  regular: number;
  overtime: number;
  total: number;
};

export type Timesheet = {
  start: Date;
  /** Last day included (midnight at its start) */
  end: Date;
  people: WorkerTimesheet[];
  totals: { regular: number; overtime: number; total: number; shifts: number };
  /** Shifts in the period that haven't been clocked out, so aren't counted yet */
  running: number;
  overtimeOn: boolean;
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function buildTimesheet({
  entries, workers, projects, start, end, workerIds, projectId, overtime,
}: {
  entries: ClockEntry[];
  workers: Worker[];
  projects: Project[];
  start: Date;
  end: Date;
  /** Limit to these people; omit for everyone with a shift */
  workerIds?: string[];
  projectId?: string;
  overtime: OvertimeSettings;
}): Timesheet {
  const from = startOfDay(start);
  const lastDay = startOfDay(end);
  const until = new Date(lastDay); until.setDate(until.getDate() + 1);
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const only = workerIds ? new Set(workerIds) : null;

  const inPeriod = entries.filter((e) => {
    const t = new Date(e.clockIn).getTime();
    if (t < from.getTime() || t >= until.getTime()) return false;
    if (only && !only.has(e.workerId)) return false;
    if (projectId && e.projectId !== projectId) return false;
    return true;
  });
  const running = inPeriod.filter((e) => !e.clockOut).length;
  const done = inPeriod.filter((e) => e.clockOut && hoursBetween(e.clockIn, e.clockOut) > 0);

  const dayList: Date[] = [];
  for (const d = new Date(from); d < until; d.setDate(d.getDate() + 1)) dayList.push(new Date(d));

  const people: WorkerTimesheet[] = [];
  for (const worker of workers) {
    const mine = done
      .filter((e) => e.workerId === worker.id)
      .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
    if (!mine.length) continue;
    const days = dayList.map((date) => {
      const key = date.toDateString();
      const shifts = mine
        .filter((e) => new Date(e.clockIn).toDateString() === key)
        .map((e) => ({
          id: e.id,
          projectName: projectName.get(e.projectId) ?? "No job",
          clockIn: new Date(e.clockIn),
          clockOut: new Date(e.clockOut!),
          hours: hoursBetween(e.clockIn, e.clockOut),
        }));
      return { date, shifts, hours: shifts.reduce((s, x) => s + x.hours, 0) };
    });
    // The payroll engine decides overtime, so a timesheet never promises what payroll won't pay
    const split = computeWorkerOvertime(mine, worker.hourlyRate ?? 0, overtime);
    const total = days.reduce((s, d) => s + d.hours, 0);
    people.push({
      worker,
      days,
      shiftCount: mine.length,
      regular: overtime.enabled ? split.regularHours : total,
      overtime: overtime.enabled ? split.overtimeHours : 0,
      total,
    });
  }
  people.sort((a, b) => a.worker.name.localeCompare(b.worker.name));

  return {
    start: from,
    end: lastDay,
    people,
    totals: people.reduce(
      (t, p) => ({ regular: t.regular + p.regular, overtime: t.overtime + p.overtime, total: t.total + p.total, shifts: t.shifts + p.shiftCount }),
      { regular: 0, overtime: 0, total: 0, shifts: 0 },
    ),
    running,
    overtimeOn: overtime.enabled,
  };
}

export const fmtTime = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const fmtDayShort = (d: Date) => d.toLocaleDateString("en-CA", { weekday: "short" });
export const fmtDate = (d: Date) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
export const fmtHours = (h: number) => h.toFixed(2);

export function periodLabel(start: Date, end: Date) {
  const sameYear = start.getFullYear() === end.getFullYear();
  const a = start.toLocaleDateString("en-CA", { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
  const b = end.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  return `${a} – ${b}`;
}

export function timesheetFileName(company: string, start: Date, end: Date, ext: string) {
  const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `timesheet-${slug(company || "constra")}-${iso(start)}-to-${iso(end)}.${ext}`;
}

/**
 * The logo as a data URL with its pixel size, or null. It's stored as a data URL today, but
 * accept a hosted URL too so a later move to storage doesn't silently drop it from exports.
 */
export async function loadLogo(src: string | undefined): Promise<{ dataUrl: string; width: number; height: number; format: "PNG" | "JPEG" } | null> {
  if (!src) return null;
  try {
    let dataUrl = src;
    if (!src.startsWith("data:")) {
      const blob = await (await fetch(src)).blob();
      dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.onerror = rej;
        r.readAsDataURL(blob);
      });
    }
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = dataUrl;
    });
    // Redraw as PNG: covers SVG/WebP/GIF logos, which neither jsPDF nor Excel take reliably
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 600 / Math.max(img.naturalWidth, img.naturalHeight));
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return { dataUrl: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, format: "PNG" };
  } catch {
    return null;
  }
}
