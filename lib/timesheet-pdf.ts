import { saveFile } from "@/lib/native";
import {
  type Timesheet, fmtDate, fmtDayShort, fmtHours, fmtTime, loadLogo, periodLabel, timesheetFileName,
} from "./timesheet";

type RGB = [number, number, number];
const INK: RGB = [21, 22, 23];
const INK2: RGB = [75, 77, 80];
const INK3: RGB = [119, 121, 124];
const RULE: RGB = [224, 221, 215];
const PAPER: RGB = [247, 246, 243];
const HV: RGB = [245, 196, 0];
const OT: RGB = [154, 52, 18];

/** Past this many days a sheet lists only the days worked, or a month runs onto three pages */
const ALL_DAYS_UP_TO = 16;

/**
 * A timesheet someone could hand to a client or a payroll company: their logo, one person per
 * page with every day of the period, totals, and lines to sign.
 */
export async function exportTimesheetPdf(sheet: Timesheet, opts: { companyName: string; logo?: string }) {
  await saveFile(await buildTimesheetPdf(sheet, opts), timesheetFileName(opts.companyName || "Your company", sheet.start, sheet.end, "pdf"));
}

export async function buildTimesheetPdf(sheet: Timesheet, opts: { companyName: string; logo?: string }): Promise<Blob> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const logo = await loadLogo(opts.logo);
  const company = opts.companyName || "Your company";
  const period = periodLabel(sheet.start, sheet.end);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const CW = W - M * 2;
  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  const header = () => {
    let textX = M;
    if (logo) {
      const maxW = 38, maxH = 16;
      const r = Math.min(maxW / logo.width, maxH / logo.height);
      const w = logo.width * r, h = logo.height * r;
      // Same alias on every page, so the image is stored once however many pages there are
      doc.addImage(logo.dataUrl, logo.format, M, 14 + (maxH - h) / 2, w, h, "company-logo", "FAST");
      textX = M + w + 5;
    } else {
      doc.setFillColor(...INK);
      doc.roundedRect(M, 14, 16, 16, 2, 2, "F");
      doc.setTextColor(...HV); doc.setFont("helvetica", "bold"); doc.setFontSize(14);
      doc.text(company.charAt(0).toUpperCase(), M + 8, 24.6, { align: "center" });
      textX = M + 21;
    }
    doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(12);
    doc.text(company, textX, 21);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK3);
    doc.text(`Prepared ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, textX, 26.5);

    doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(20);
    doc.text("TIMESHEET", W - M, 21, { align: "right" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK2);
    doc.text(period, W - M, 27, { align: "right" });

    doc.setFillColor(...HV);
    doc.rect(M, 35, 18, 1.2, "F");
    doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
    doc.line(M + 18, 35.6, W - M, 35.6);
    return 46;
  };

  const stats = (y: number, items: { label: string; value: string; tone?: RGB }[]) => {
    const w = CW / items.length;
    items.forEach((s, i) => {
      const x = M + i * w;
      if (i > 0) { doc.setDrawColor(...RULE); doc.setLineWidth(0.25); doc.line(x, y - 1, x, y + 13); }
      const tx = x + (i ? 5 : 0);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...INK3);
      doc.text(s.label.toUpperCase(), tx, y + 2);
      doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.setTextColor(...(s.tone ?? INK));
      doc.text(s.value, tx, y + 10.5);
    });
    return y + 22;
  };

  const table = {
    margin: { left: M, right: M, top: 20, bottom: 22 },
    theme: "plain" as const,
    styles: { font: "helvetica", fontSize: 8.5, textColor: INK2, cellPadding: { top: 2.4, bottom: 2.4, left: 2.5, right: 2.5 }, lineColor: RULE, lineWidth: { bottom: 0.2 } },
    headStyles: { fontStyle: "bold" as const, fontSize: 7, textColor: INK3, fillColor: [255, 255, 255] as RGB, lineWidth: { bottom: 0.5 }, lineColor: INK },
    footStyles: { fontStyle: "bold" as const, fontSize: 9, textColor: INK, fillColor: PAPER, lineWidth: { top: 0.5 }, lineColor: INK },
  };

  // ── Summary page when more than one person is on the sheet ──────────────────
  if (sheet.people.length > 1) {
    let y = header();
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...INK);
    doc.text("Crew summary", M, y);
    y += 9;
    y = stats(y, [
      { label: "Total hours", value: fmtHours(sheet.totals.total) },
      ...(sheet.overtimeOn ? [{ label: "Regular", value: fmtHours(sheet.totals.regular) }] : []),
      ...(sheet.overtimeOn ? [{ label: "Overtime", value: fmtHours(sheet.totals.overtime), tone: sheet.totals.overtime > 0 ? OT : INK }] : []),
      { label: "People", value: String(sheet.people.length) },
      { label: "Shifts", value: String(sheet.totals.shifts) },
    ]);
    autoTable(doc, {
      ...table,
      startY: y,
      head: [["NAME", "ROLE", "DAYS", "SHIFTS", ...(sheet.overtimeOn ? ["REGULAR", "OVERTIME"] : []), "TOTAL HOURS"]],
      body: sheet.people.map((p) => [
        p.worker.name,
        p.worker.customRole || p.worker.role || "",
        String(p.days.filter((d) => d.hours > 0).length),
        String(p.shiftCount),
        ...(sheet.overtimeOn ? [fmtHours(p.regular), p.overtime > 0 ? fmtHours(p.overtime) : "—"] : []),
        fmtHours(p.total),
      ]),
      foot: [["Total", "", "", String(sheet.totals.shifts), ...(sheet.overtimeOn ? [fmtHours(sheet.totals.regular), fmtHours(sheet.totals.overtime)] : []), fmtHours(sheet.totals.total)]],
      columnStyles: { 0: { textColor: INK, fontStyle: "bold" } },
      didParseCell(d) {
        if (d.column.index >= 2) d.cell.styles.halign = "right";
        if (d.section === "body" && d.column.index === d.table.columns.length - 1) { d.cell.styles.textColor = INK; d.cell.styles.fontStyle = "bold"; }
        if (sheet.overtimeOn && d.section === "body" && d.column.index === 5 && d.cell.raw !== "—") d.cell.styles.textColor = OT;
      },
    });
    if (sheet.running > 0) {
      doc.setFont("helvetica", "italic"); doc.setFontSize(8); doc.setTextColor(...INK3);
      doc.text(`${sheet.running} shift${sheet.running === 1 ? " is" : "s are"} still running and not counted until clocked out.`, M, lastY() + 8);
    }
  }

  // ── One page per person ─────────────────────────────────────────────────────
  sheet.people.forEach((p, idx) => {
    if (sheet.people.length > 1 || idx > 0) doc.addPage();
    let y = header();
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...INK);
    doc.text(p.worker.name, M, y);
    const role = p.worker.customRole || p.worker.role || "";
    if (role) {
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...INK3);
      doc.text(role, M, y + 5.5);
    }
    y += 14;
    y = stats(y, [
      { label: "Total hours", value: fmtHours(p.total) },
      ...(sheet.overtimeOn ? [{ label: "Regular", value: fmtHours(p.regular) }, { label: "Overtime", value: fmtHours(p.overtime), tone: p.overtime > 0 ? OT : INK }] : []),
      { label: "Days worked", value: String(p.days.filter((d) => d.hours > 0).length) },
      { label: "Shifts", value: String(p.shiftCount) },
    ]);

    const showAll = p.days.length <= ALL_DAYS_UP_TO;
    const body: string[][] = [];
    const offRows = new Set<number>();
    for (const day of p.days) {
      if (!day.shifts.length) {
        if (!showAll) continue;
        offRows.add(body.length);
        body.push([fmtDayShort(day.date), fmtDate(day.date), "—", "", "", ""]);
        continue;
      }
      day.shifts.forEach((s, i) => {
        body.push([i === 0 ? fmtDayShort(day.date) : "", i === 0 ? fmtDate(day.date) : "", s.projectName, fmtTime(s.clockIn), fmtTime(s.clockOut), fmtHours(s.hours)]);
      });
    }
    autoTable(doc, {
      ...table,
      startY: y,
      head: [["DAY", "DATE", "JOB", "IN", "OUT", "HOURS"]],
      body,
      foot: [["Total", "", "", "", "", fmtHours(p.total)]],
      columnStyles: {
        0: { cellWidth: 16, textColor: INK, fontStyle: "bold" },
        1: { cellWidth: 22 },
        3: { cellWidth: 24 },
        4: { cellWidth: 24 },
        5: { cellWidth: 22, textColor: INK, fontStyle: "bold" },
      },
      didParseCell(d) {
        if (d.column.index >= 3) d.cell.styles.halign = "right";
        if (d.section === "body" && offRows.has(d.row.index)) {
          d.cell.styles.textColor = [176, 178, 180];
          d.cell.styles.fontStyle = "normal";
        }
      },
    });

    // Signatures stay together, on a new page if they won't fit
    let sy = lastY() + 22;
    if (sy + 18 > H - 22) { doc.addPage(); sy = header() + 14; }
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK2);
    doc.text("I confirm these hours are a true record of the time worked.", M, sy - 10);
    const half = (CW - 14) / 2;
    [["Employee signature", M], ["Supervisor signature", M + half + 14]].forEach(([label, x]) => {
      const xs = x as number;
      doc.setDrawColor(...INK); doc.setLineWidth(0.3);
      doc.line(xs, sy, xs + half * 0.64, sy);
      doc.line(xs + half * 0.72, sy, xs + half, sy);
      doc.setFontSize(7); doc.setTextColor(...INK3);
      doc.text(label as string, xs, sy + 4);
      doc.text("Date", xs + half * 0.72, sy + 4);
    });
  });

  if (!sheet.people.length) {
    const y = header();
    doc.setFont("helvetica", "normal"); doc.setFontSize(11); doc.setTextColor(...INK3);
    doc.text("No completed shifts in this period.", M, y + 6);
  }

  // ── Footer on every page ────────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.25);
    doc.line(M, H - 14, W - M, H - 14);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...INK3);
    doc.text(`${company}  ·  Timesheet  ·  ${period}`, M, H - 9);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 9, { align: "right" });
  }

  return doc.output("blob");
}
