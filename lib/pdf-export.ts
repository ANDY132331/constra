import type { ClockEntry, Worker, Project, Estimate, Invoice, DailyReport, ChangeOrder } from "./mock-data";
import { moneyTotals, lineAmount } from "@/lib/money";

type PdfReportInput = {
  workers: Worker[];
  projects: Project[];
  clockEntries: ClockEntry[];
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  currency: string;
  companyName?: string;
  overtime?: { enabled: boolean; dailyThreshold: number | null; weeklyThreshold: number | null; multiplier: number };
};

function fmt(n: number, currency: string) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(n);
}

function fmtHours(n: number) {
  return n.toFixed(2) + "h";
}

export async function exportReportPdf(input: PdfReportInput) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const { computeWorkerOvertime } = await import("./overtime");

  const { workers, projects, clockEntries, periodStart, periodEnd, periodLabel, currency, companyName, overtime } = input;
  const company = companyName || "Constra";
  const otSettings = overtime ?? { enabled: false, dailyThreshold: null, weeklyThreshold: null, multiplier: 1.5 };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 16;
  const CW = W - M * 2;

  // Site palette: ink, concrete, paper, hi-vis
  const INK: [number, number, number] = [21, 22, 23];
  const INK2: [number, number, number] = [75, 77, 80];
  const INK3: [number, number, number] = [130, 132, 135];
  const RULE: [number, number, number] = [214, 211, 205];
  const PAPER: [number, number, number] = [245, 244, 241];
  const HV: [number, number, number] = [245, 196, 0];
  const GO: [number, number, number] = [30, 122, 69];

  const hrs = (e: ClockEntry) => (new Date(e.clockOut!).getTime() - new Date(e.clockIn).getTime()) / 3600000;
  const entries = clockEntries.filter(
    (e) => e.clockOut && new Date(e.clockIn) >= periodStart && new Date(e.clockIn) <= periodEnd && hrs(e) > 0,
  );
  const workerMap = new Map(workers.map((w) => [w.id, w]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const money = (n: number) => fmt(n, currency);
  const h2 = (n: number) => n.toFixed(2);

  // ── Payroll per worker (overtime-aware) ────────────────────────────────────
  type Row = { id: string; name: string; role: string; rate: number; reg: number; ot: number; regPay: number; otPay: number; gross: number };
  const rows: Row[] = [];
  for (const w of workers) {
    const mine = entries.filter((e) => e.workerId === w.id);
    if (!mine.length) continue;
    const rate = w.hourlyRate ?? 0;
    const b = computeWorkerOvertime(mine, rate, otSettings);
    rows.push({
      id: w.id, name: w.name, role: w.customRole || w.role || "", rate,
      reg: b.regularHours, ot: b.overtimeHours, regPay: b.regularPay, otPay: b.overtimePay, gross: b.totalPay,
    });
  }
  rows.sort((a, b) => a.name.localeCompare(b.name));
  const T = rows.reduce(
    (t, r) => ({ reg: t.reg + r.reg, ot: t.ot + r.ot, regPay: t.regPay + r.regPay, otPay: t.otPay + r.otPay, gross: t.gross + r.gross }),
    { reg: 0, ot: 0, regPay: 0, otPay: 0, gross: 0 },
  );
  const missingRates = rows.filter((r) => r.rate <= 0).map((r) => r.name);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const tape = (y: number, h: number) => {
    doc.setFillColor(...HV);
    doc.rect(0, y, W, h, "F");
    doc.setFillColor(...INK);
    // Diagonal stripes: parallelograms of width h, every 2h
    for (let x = -h * 2; x < W + h; x += h * 2) {
      doc.triangle(x, y + h, x + h, y + h, x + h * 2, y, "F");
      doc.triangle(x, y + h, x + h * 2, y, x + h, y, "F");
    }
  };
  let y = 0;
  const ensure = (needed: number) => {
    if (y + needed > H - 22) { doc.addPage(); y = 20; }
  };
  const heading = (label: string, note?: string) => {
    ensure(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    doc.text(label.toUpperCase(), M, y);
    if (note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...INK3);
      doc.text(note, W - M, y, { align: "right" });
    }
    doc.setDrawColor(...INK);
    doc.setLineWidth(0.6);
    doc.line(M, y + 2, W - M, y + 2);
    y += 7;
  };
  const tableBase = {
    margin: { left: M, right: M },
    theme: "plain" as const,
    styles: { font: "helvetica", fontSize: 8, textColor: INK2, cellPadding: { top: 2.6, bottom: 2.6, left: 2.5, right: 2.5 }, lineColor: RULE, lineWidth: { bottom: 0.2 } },
    headStyles: { fontStyle: "bold" as const, fontSize: 7, textColor: INK3, fillColor: [255, 255, 255] as [number, number, number], lineWidth: { bottom: 0.4 }, lineColor: INK },
    footStyles: { fontStyle: "bold" as const, fontSize: 8.5, textColor: INK, fillColor: PAPER, lineWidth: { top: 0.4 }, lineColor: INK },
  };

  // ── Cover band ─────────────────────────────────────────────────────────────
  tape(0, 5);
  doc.setFillColor(...INK);
  doc.rect(0, 5, W, 38, "F");
  doc.setFillColor(...HV);
  doc.rect(M, 14, 9, 9, "F");
  doc.setTextColor(...INK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(company.charAt(0).toUpperCase(), M + 4.5, 20.3, { align: "center" });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text(company.toUpperCase(), M + 13, 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(200, 200, 196);
  doc.text("PAYROLL REGISTER", M, 34);
  doc.setTextColor(...HV);
  doc.setFont("helvetica", "bold");
  doc.text(periodLabel.toUpperCase(), M + 34, 34);

  const fmtDay = (d: Date) => d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(200, 200, 196);
  doc.text(`${fmtDay(periodStart)} – ${fmtDay(periodEnd)}`, W - M, 18, { align: "right" });
  doc.text(`Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, W - M, 24, { align: "right" });
  doc.text(otSettings.enabled ? `Overtime at ${otSettings.multiplier}× pay` : "Overtime not applied", W - M, 30, { align: "right" });
  doc.setTextColor(...HV);
  doc.text("CONFIDENTIAL", W - M, 36, { align: "right" });

  // ── Summary figures ────────────────────────────────────────────────────────
  y = 52;
  const stats = [
    { label: "Gross pay", value: money(T.gross), strong: true },
    { label: "Total hours", value: h2(T.reg + T.ot) },
    { label: "Regular hours", value: h2(T.reg) },
    { label: "Overtime hours", value: h2(T.ot) },
    { label: "Crew paid", value: String(rows.length) },
  ];
  const sw = CW / stats.length;
  stats.forEach((s, i) => {
    const x = M + i * sw;
    if (i > 0) { doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.line(x, y - 1, x, y + 15); }
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.setTextColor(...INK3);
    doc.text(s.label.toUpperCase(), x + (i ? 4 : 0), y + 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(s.strong ? 15 : 13);
    doc.setTextColor(...INK);
    doc.text(s.value, x + (i ? 4 : 0), y + 11);
    if (s.strong) { doc.setFillColor(...HV); doc.rect(x, y + 13.5, 26, 1.4, "F"); }
  });
  y += 24;

  if (missingRates.length) {
    doc.setFillColor(255, 247, 214);
    doc.rect(M, y, CW, 9, "F");
    doc.setFillColor(...HV);
    doc.rect(M, y, 1.5, 9, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...INK2);
    const msg = `No hourly rate set for ${missingRates.slice(0, 4).join(", ")}${missingRates.length > 4 ? ` and ${missingRates.length - 4} more` : ""} — their pay shows as $0. Set rates under Crew.`;
    doc.text(msg, M + 4, y + 5.7);
    y += 17;
  }

  // ── Payroll ────────────────────────────────────────────────────────────────
  heading("Payroll", `${rows.length} ${rows.length === 1 ? "person" : "people"}`);
  if (!rows.length) {
    doc.setFont("helvetica", "italic"); doc.setFontSize(8.5); doc.setTextColor(...INK3);
    doc.text("No completed time entries in this period.", M, y + 4);
    y += 12;
  } else {
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["WORKER", "ROLE", "RATE", "REG H", "OT H", "REGULAR PAY", "OT PAY", "GROSS"]],
      body: rows.map((r) => [r.name, r.role, r.rate > 0 ? money(r.rate) : "—", h2(r.reg), r.ot > 0 ? h2(r.ot) : "—", money(r.regPay), r.otPay > 0 ? money(r.otPay) : "—", money(r.gross)]),
      foot: [["Total", "", "", h2(T.reg), h2(T.ot), money(T.regPay), money(T.otPay), money(T.gross)]],
      columnStyles: {
        0: { textColor: INK, fontStyle: "bold" },
        2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "right" },
        5: { halign: "right" }, 6: { halign: "right" }, 7: { halign: "right", textColor: INK, fontStyle: "bold" },
      },
      didParseCell(d) {
        if (d.section === "head" && d.column.index >= 2) d.cell.styles.halign = "right";
        if (d.section === "foot" && d.column.index >= 3) d.cell.styles.halign = "right";
        if (d.section === "body" && d.column.index === 4 && d.cell.raw !== "—") d.cell.styles.textColor = [168, 100, 0];
      },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // ── Hours per day chart ────────────────────────────────────────────────────
  const days: { key: string; label: string; date: Date; hours: number }[] = [];
  const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const spanDays = Math.round((dayStart(periodEnd) - dayStart(periodStart)) / 86400000) + 1;
  if (entries.length && spanDays <= 35) {
    for (let i = 0; i < spanDays; i++) {
      const d = new Date(periodStart);
      d.setDate(d.getDate() + i);
      days.push({ key: d.toDateString(), label: spanDays <= 7 ? d.toLocaleDateString("en-CA", { weekday: "short" }) : String(d.getDate()), date: d, hours: 0 });
    }
    for (const e of entries) {
      const day = days.find((d) => d.key === new Date(e.clockIn).toDateString());
      if (day) day.hours += hrs(e);
    }
    const chartH = 34;
    ensure(chartH + 22);
    heading("Hours per day");
    const maxH = Math.max(8, ...days.map((d) => d.hours));
    const step = maxH <= 16 ? 4 : maxH <= 40 ? 10 : 20;
    const top = Math.ceil(maxH / step) * step;
    const baseY = y + chartH;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    for (let v = 0; v <= top; v += step) {
      const gy = baseY - (v / top) * chartH;
      doc.setDrawColor(...RULE); doc.setLineWidth(0.15);
      doc.line(M + 8, gy, W - M, gy);
      doc.setTextColor(...INK3);
      doc.text(String(v), M + 6, gy + 1, { align: "right" });
    }
    const slot = (CW - 10) / days.length;
    const bw = Math.min(10, slot * 0.62);
    days.forEach((d, i) => {
      const cx = M + 10 + slot * i + slot / 2;
      const bh = (d.hours / top) * chartH;
      if (bh > 0) {
        const weekend = d.date.getDay() === 0 || d.date.getDay() === 6;
        doc.setFillColor(...(weekend ? INK2 : INK));
        doc.rect(cx - bw / 2, baseY - bh, bw, bh, "F");
        if (spanDays <= 14) {
          doc.setTextColor(...INK); doc.setFont("helvetica", "bold"); doc.setFontSize(6.5);
          doc.text(d.hours.toFixed(1), cx, baseY - bh - 1.5, { align: "center" });
          doc.setFont("helvetica", "normal");
        }
      }
      if (spanDays <= 14 || i % 2 === 0) {
        doc.setTextColor(...INK3); doc.setFontSize(6.5);
        doc.text(d.label, cx, baseY + 4.5, { align: "center" });
      }
    });
    doc.setDrawColor(...INK); doc.setLineWidth(0.4);
    doc.line(M + 8, baseY, W - M, baseY);
    y = baseY + 14;
  }

  // ── Labour cost by project ─────────────────────────────────────────────────
  const byProject = new Map<string, { hours: number; cost: number }>();
  for (const e of entries) {
    const rate = workerMap.get(e.workerId)?.hourlyRate ?? 0;
    const cur = byProject.get(e.projectId) ?? { hours: 0, cost: 0 };
    cur.hours += hrs(e);
    cur.cost += hrs(e) * rate;
    byProject.set(e.projectId, cur);
  }
  if (byProject.size) {
    ensure(30);
    heading("Labour by project", "Straight-time cost, before overtime premium");
    const prow = [...byProject.entries()]
      .map(([id, v]) => ({ name: projectMap.get(id)?.name ?? "Unassigned", ...v, budget: projectMap.get(id)?.budget ?? 0 }))
      .sort((a, b) => b.cost - a.cost);
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["PROJECT", "HOURS", "LABOUR COST", "SHARE", "PROJECT BUDGET"]],
      body: prow.map((p) => [p.name, h2(p.hours), money(p.cost), T.regPay + T.otPay > 0 || p.cost > 0 ? `${Math.round((p.hours / (T.reg + T.ot || 1)) * 100)}%` : "—", p.budget > 0 ? money(p.budget) : "—"]),
      columnStyles: { 0: { textColor: INK, fontStyle: "bold" }, 1: { halign: "right" }, 2: { halign: "right", textColor: INK }, 3: { halign: "right" }, 4: { halign: "right" } },
      didParseCell(d) { if (d.section === "head" && d.column.index >= 1) d.cell.styles.halign = "right"; },
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;
  }

  // ── Timesheets by worker ───────────────────────────────────────────────────
  if (rows.length) {
    ensure(30);
    heading("Timesheets", `${entries.length} shifts`);
    for (const r of rows) {
      const mine = entries
        .filter((e) => e.workerId === r.id)
        .sort((a, b) => new Date(a.clockIn).getTime() - new Date(b.clockIn).getTime());
      ensure(24);
      doc.setFillColor(...PAPER);
      doc.rect(M, y, CW, 7, "F");
      doc.setFillColor(...HV);
      doc.rect(M, y, 1.5, 7, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
      doc.text(r.name, M + 4, y + 4.8);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...INK3);
      doc.text(`${h2(r.reg + r.ot)} h · ${money(r.gross)}`, W - M - 2, y + 4.8, { align: "right" });
      y += 8;
      autoTable(doc, {
        ...tableBase,
        startY: y,
        showHead: "firstPage",
        head: [["DATE", "PROJECT", "IN", "OUT", "HOURS"]],
        body: mine.map((e) => [
          new Date(e.clockIn).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }),
          projectMap.get(e.projectId)?.name ?? "—",
          new Date(e.clockIn).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          new Date(e.clockOut!).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          h2(hrs(e)),
        ]),
        columnStyles: { 0: { cellWidth: 30 }, 2: { halign: "right", cellWidth: 22 }, 3: { halign: "right", cellWidth: 22 }, 4: { halign: "right", cellWidth: 18, textColor: INK, fontStyle: "bold" } },
        didParseCell(d) { if (d.section === "head" && d.column.index >= 2) d.cell.styles.halign = "right"; },
        styles: { ...tableBase.styles, fontSize: 7.5, cellPadding: { top: 1.8, bottom: 1.8, left: 2.5, right: 2.5 } },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 7;
    }
  }

  // ── Sign-off ───────────────────────────────────────────────────────────────
  // The block is ~29mm tall; keep it on the current page whenever it clears the footer rule
  if (y + 31 > H - 15) { doc.addPage(); y = 20; }
  y += 4;
  heading("Approval");
  doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...INK2);
  doc.text("I have reviewed the hours and pay above and approve this payroll for processing.", M, y + 2);
  y += 13;
  const half = (CW - 12) / 2;
  [["Prepared by", M], ["Approved by", M + half + 12]].forEach(([label, x]) => {
    doc.setDrawColor(...INK); doc.setLineWidth(0.3);
    doc.line(x as number, y, (x as number) + half * 0.62, y);
    doc.line((x as number) + half * 0.7, y, (x as number) + half, y);
    doc.setFontSize(6.8); doc.setTextColor(...INK3);
    doc.text(`${label} — name & signature`, x as number, y + 4);
    doc.text("Date", (x as number) + half * 0.7, y + 4);
  });

  // ── Footer on every page ───────────────────────────────────────────────────
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    if (i > 1) tape(0, 3);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.2);
    doc.line(M, H - 13, W - M, H - 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...INK3);
    doc.text(`${company} · Payroll register · ${periodLabel} · Confidential`, M, H - 8);
    doc.text(`Page ${i} of ${pages}`, W - M, H - 8, { align: "right" });
    doc.setTextColor(...GO);
    doc.text("Made with Constra", W / 2, H - 8, { align: "center" });
  }

  doc.save(`payroll-${company.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${periodLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`);
}

// ── Materials Summary PDF ────────────────────────────────────────────────────
type MaterialSummaryRow = { name: string; unit: string; deliveries: number; usage: number };
type MaterialSummaryByTrade = Record<string, MaterialSummaryRow[]>;

export async function exportMaterialsPdf(
  projectName: string,
  summary: MaterialSummaryByTrade,
  companyName?: string,
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const AMBER = [245, 158, 11] as [number, number, number];
  const DARK = [13, 13, 13] as [number, number, number];
  const MID = [80, 80, 80] as [number, number, number];
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN = 18;

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 30, "F");
  doc.setTextColor(...AMBER);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(companyName ?? "Constra", MARGIN, 13);
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("MATERIALS SUMMARY REPORT", MARGIN, 21);
  doc.setTextColor(140, 140, 140);
  doc.setFontSize(8);
  doc.text(new Date().toLocaleDateString("en-CA", { dateStyle: "long" }), PAGE_W - MARGIN, 21, { align: "right" });

  let y = 40;

  // Project name
  doc.setTextColor(...MID);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.setTextColor(20, 20, 20);
  doc.text(projectName, MARGIN, y);
  y += 12;

  const trades = Object.keys(summary);
  if (trades.length === 0) {
    doc.setFontSize(9);
    doc.setTextColor(...MID);
    doc.text("No materials logged for this project.", MARGIN, y);
  }

  for (const trade of trades) {
    const items = summary[trade];
    if (!items || items.length === 0) continue;

    // Trade heading band
    doc.setFillColor(...AMBER);
    doc.rect(MARGIN, y, PAGE_W - MARGIN * 2, 6.5, "F");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(trade.toUpperCase(), MARGIN + 3, y + 4.5);
    y += 9;

    const rows = items.map((item) => {
      const onHand = item.deliveries - item.usage;
      return [
        item.name,
        `${item.deliveries} ${item.unit}`,
        `${item.usage} ${item.unit}`,
        `${onHand} ${item.unit}`,
        onHand < 0 ? "LOW" : "OK",
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Material", "Delivered", "Used", "On Hand", "Status"]],
      body: rows,
      headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8, textColor: MID },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles: { 1: { halign: "right" }, 2: { halign: "right" }, 3: { halign: "right" }, 4: { halign: "center" } },
      didParseCell(data) {
        if (data.column.index === 4 && data.section === "body") {
          if (String(data.cell.raw) === "LOW") data.cell.styles.textColor = [239, 68, 68];
          else data.cell.styles.textColor = [34, 197, 94];
        }
      },
      theme: "grid",
    });

    y = (doc as any).lastAutoTable.finalY + 8;
    if (y > doc.internal.pageSize.getHeight() - 25) {
      doc.addPage();
      y = 20;
    }
  }

  // Footer
  const pH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK);
  doc.rect(0, pH - 10, PAGE_W, 10, "F");
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${companyName ?? "Constra"} · ${projectName} · Materials Report`, MARGIN, pH - 4);
  doc.text(`Generated ${new Date().toLocaleDateString("en-CA")}`, PAGE_W - MARGIN, pH - 4, { align: "right" });

  doc.save(`materials-${projectName.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}

// ── Template Type ─────────────────────────────────────────────────────────────
export type InvoiceTemplate = "classic" | "modern" | "minimal";

// ── Estimate PDF ─────────────────────────────────────────────────────────────
export async function exportEstimatePdf(
  estimate: Estimate,
  currency: string,
  companyName?: string,
  companyAddress?: string,
  companyLogo?: string,
  template: InvoiceTemplate = "classic",
  mode: "save" | "dataurl" = "save",
): Promise<string | void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW   = doc.internal.pageSize.getWidth();
  const PH   = doc.internal.pageSize.getHeight();
  const ML   = 18;
  const MR   = 18;

  const ACCENT : [number,number,number] = [245, 196, 0];
  const DARK   : [number,number,number] = [22,  22,  22];
  const MID    : [number,number,number] = [90,  90,  90];
  const LGRAY  : [number,number,number] = [210, 210, 210];
  const WHITE  : [number,number,number] = [255, 255, 255];

  const currFmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(n);

  const { subtotal, tax, total } = moneyTotals(estimate.items, estimate.taxRate);

  const fmtDate = (d: Date) => d.toLocaleDateString("en-CA", { dateStyle: "medium" });

  // ── SHARED: draw logo / initial mark ──────────────────────────────────────
  const drawLogo = (x: number, y: number, size: number, light: boolean) => {
    if (companyLogo?.startsWith("data:image")) {
      doc.setFillColor(...(light ? WHITE : DARK));
      doc.roundedRect(x, y, size, size, 3, 3, "F");
      try {
        const ext = companyLogo.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(companyLogo, ext, x + 1, y + 1, size - 2, size - 2, undefined, "FAST");
      } catch { /* fallback */ }
    } else {
      doc.setFillColor(...(light ? ACCENT : ACCENT));
      doc.circle(x + size / 2, y + size / 2, size / 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size * 0.45);
      doc.setTextColor(...(light ? DARK : WHITE));
      doc.text((companyName ?? "C").charAt(0).toUpperCase(), x + size / 2, y + size / 2 + size * 0.15, { align: "center" });
    }
  };

  // ── SHARED: totals block ──────────────────────────────────────────────────
  const drawTotals = (startY: number, accentFill: [number,number,number]) => {
    const totW  = 88;
    const totX  = PW - MR - totW;
    const valX  = PW - MR;
    let   ty    = startY;

    const row = (label: string, value: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MID);
      doc.text(label, totX, ty);
      doc.setTextColor(...(bold ? DARK : MID));
      doc.text(value, valX, ty, { align: "right" });
      ty += 6;
    };

    row("Subtotal", currFmt(subtotal));
    if (estimate.taxRate > 0) row(`Tax (${estimate.taxRate}%)`, currFmt(tax));
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(totX, ty, valX, ty);
    ty += 4;
    row("Total", currFmt(total), true);

    // Balance Due pill
    const bdH = 9;
    doc.setFillColor(...accentFill);
    doc.roundedRect(totX - 4, ty, totW + 4, bdH, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...(accentFill[0] < 100 ? WHITE : DARK));
    doc.text("Total Estimate", totX, ty + 5.8);
    doc.text(currFmt(total), valX, ty + 5.8, { align: "right" });
    return ty + bdH + 8;
  };

  // ── SHARED: notes + footer ────────────────────────────────────────────────
  const drawNotes = (y: number) => {
    if (!estimate.notes) return y;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK);
    doc.text("Notes", ML, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MID);
    const lines = doc.splitTextToSize(estimate.notes, (PW - ML - MR) * 0.6);
    doc.text(lines, ML, y);
    return y + lines.length * 4 + 6;
  };

  const drawLineItems = (startY: number, headFill: [number,number,number], headText: [number,number,number]) => {
    autoTable(doc, {
      startY,
      margin: { left: ML, right: MR },
      head: [["#", "Description", "Category", "Qty", "Rate", "Amount"]],
      body: estimate.items.map((item, idx) => [
        String(idx + 1),
        item.description,
        item.category || "—",
        item.qty.toString(),
        currFmt(item.rate),
        currFmt(lineAmount(item.qty, item.rate)),
      ]),
      headStyles: { fillColor: headFill, textColor: headText, fontSize: 8, fontStyle: "bold", cellPadding: { top: 4, bottom: 4, left: 3, right: 3 } },
      bodyStyles: { fontSize: 8.5, textColor: DARK, cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 }, lineColor: [235, 235, 235], lineWidth: 0.1 },
      alternateRowStyles: { fillColor: [251, 251, 251] },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center", textColor: MID },
        1: { cellWidth: "auto" },
        2: { cellWidth: 28, halign: "center" },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 32, halign: "right", fontStyle: "bold" },
      },
      theme: "grid",
    });
    return (doc as any).lastAutoTable.finalY;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE: CLASSIC
  // ═══════════════════════════════════════════════════════════════════════════
  if (template === "classic") {
    // Dark header band
    doc.setFillColor(...DARK);
    doc.rect(0, 0, PW, 32, "F");

    // Company name in amber
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...ACCENT);
    doc.text(companyName ?? "Constra", ML, 15);

    // Address
    if (companyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(160, 160, 160);
      doc.text(companyAddress.split(",")[0]?.trim() ?? "", ML, 22);
    }

    // ESTIMATE label + number on right
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(160, 160, 160);
    doc.text("ESTIMATE", PW - MR, 12, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(estimate.number, PW - MR, 21, { align: "right" });

    // Total in header
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(130, 130, 130);
    doc.text("TOTAL ESTIMATE", PW - MR, 28, { align: "right" });

    let y = 42;

    // Project / client / dates row
    doc.setTextColor(...MID);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "bold");
    const col2 = ML + 72;
    const col3 = PW - MR - 60;
    doc.text("PROJECT", ML, y);
    doc.text("CLIENT", col2, y);
    doc.text("ISSUED", col3, y);
    doc.text("VALID UNTIL", PW - MR, y, { align: "right" });

    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK);
    doc.text(estimate.projectName, ML, y, { maxWidth: 65 });
    doc.text(estimate.clientName, col2, y, { maxWidth: 65 });
    doc.setFontSize(8.5);
    doc.text(fmtDate(estimate.issueDate), col3, y);
    doc.text(fmtDate(estimate.validUntil), PW - MR, y, { align: "right" });

    if (estimate.clientEmail) {
      y += 4.5;
      doc.setFontSize(7.5);
      doc.setTextColor(...MID);
      doc.text(estimate.clientEmail, col2, y);
    }
    y += 10;

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.25);
    doc.line(ML, y, PW - MR, y);
    y += 8;

    const tableEndY = drawLineItems(y, DARK, WHITE);
    const afterTotals = drawTotals(tableEndY + 10, ACCENT);
    const afterNotes = drawNotes(afterTotals);

    // Footer
    doc.setFillColor(...ACCENT);
    doc.rect(0, PH - 8, PW, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...DARK);
    doc.text(`${companyName ?? "Constra"}  ·  ${estimate.number}  ·  Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, ML, PH - 3);
    void afterNotes;

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE: MODERN
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (template === "modern") {
    const HDR = 48;

    // Dark header
    doc.setFillColor(28, 32, 38);
    doc.rect(0, 0, PW, HDR, "F");

    // Amber left accent strip
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, 4, HDR, "F");

    // Logo
    drawLogo(ML, 10, 26, false);

    // Company name + address in header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(companyName ?? "Constra", ML + 32, 20);
    if (companyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(160, 170, 185);
      const addrParts = companyAddress.split(",").map(s => s.trim()).filter(Boolean);
      addrParts.slice(0, 2).forEach((p, i) => doc.text(p, ML + 32, 26 + i * 4.5));
    }

    // Right side of header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...ACCENT);
    doc.text("ESTIMATE", PW - MR, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(160, 170, 185);
    doc.text(estimate.number, PW - MR, 26, { align: "right" });
    doc.setFontSize(7);
    doc.text("Total Value", PW - MR, 34, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...WHITE);
    doc.text(currFmt(total), PW - MR, 43, { align: "right" });

    let y = HDR + 10;

    // Meta row
    const metaLblX = ML;
    const metaValX = ML + 38;
    const meta2LblX = ML + 90;
    const meta2ValX = ML + 130;

    const metaRow = (lx: number, vx: number, label: string, value: string, ty: number) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text(label, lx, ty);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(value, vx, ty + 4.5);
    };

    metaRow(metaLblX, metaValX, "PROJECT", estimate.projectName, y);
    metaRow(meta2LblX, meta2ValX, "CLIENT", estimate.clientName, y);
    metaRow(PW - MR - 65, PW - MR, "ISSUED", fmtDate(estimate.issueDate), y);
    y += 18;
    metaRow(metaLblX, metaValX, "EMAIL", estimate.clientEmail || "—", y);
    metaRow(PW - MR - 65, PW - MR, "VALID UNTIL", fmtDate(estimate.validUntil), y);
    y += 14;

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.25);
    doc.line(ML, y, PW - MR, y);
    y += 8;

    const tableEndY = drawLineItems(y, [28, 32, 38] as [number,number,number], WHITE);
    const afterTotals = drawTotals(tableEndY + 10, ACCENT);
    const afterNotes = drawNotes(afterTotals);

    // Footer — thin accent line
    doc.setFillColor(...ACCENT);
    doc.rect(0, PH - 6, 4, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text(`${companyName ?? "Constra"}  ·  ${estimate.number}  ·  Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, ML, PH - 2);
    void afterNotes;

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE: MINIMAL
  // ═══════════════════════════════════════════════════════════════════════════
  } else {
    // White canvas
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, "F");

    // Company name top-left
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...DARK);
    doc.text(companyName ?? "Constra", ML, 20);

    let leftY = 26;
    if (companyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MID);
      const parts = companyAddress.split(",").map(s => s.trim()).filter(Boolean);
      parts.slice(0, 3).forEach(p => { doc.text(p, ML, leftY); leftY += 4; });
    }

    // ESTIMATE top-right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...DARK);
    doc.text("ESTIMATE", PW - MR, 22, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...MID);
    doc.text(estimate.number, PW - MR, 30, { align: "right" });

    let y = Math.max(leftY + 6, 38);

    // Hairline
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PW - MR, y);
    y += 8;

    // Bill to + meta
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...MID);
    doc.text("PROJECT / CLIENT", ML, y);
    doc.text("DETAILS", PW - MR - 60, y);

    y += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...DARK);
    doc.text(estimate.clientName, ML, y);

    // Details column
    const deets: [string, string][] = [
      ["Project",    estimate.projectName],
      ["Issued",     fmtDate(estimate.issueDate)],
      ["Valid Until",fmtDate(estimate.validUntil)],
    ];
    let dy = y - 1;
    deets.forEach(([lbl2, val]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...MID);
      doc.text(lbl2, PW - MR - 60, dy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...DARK);
      doc.text(val, PW - MR, dy + 4, { align: "right" });
      dy += 10;
    });

    y += 5;
    if (estimate.clientEmail) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MID);
      doc.text(estimate.clientEmail, ML, y);
      y += 5;
    }

    y = Math.max(y + 6, dy + 2);

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(ML, y, PW - MR, y);
    y += 7;

    // Minimal table — light gray header, no bold fill
    autoTable(doc, {
      startY: y,
      margin: { left: ML, right: MR },
      head: [["#", "Description", "Category", "Qty", "Rate", "Amount"]],
      body: estimate.items.map((item, idx) => [
        String(idx + 1),
        item.description,
        item.category || "—",
        item.qty.toString(),
        currFmt(item.rate),
        currFmt(lineAmount(item.qty, item.rate)),
      ]),
      headStyles: { fillColor: [245, 245, 245] as [number,number,number], textColor: MID, fontSize: 7.5, fontStyle: "bold", cellPadding: { top: 3.5, bottom: 3.5, left: 3, right: 3 } },
      bodyStyles: { fontSize: 8.5, textColor: DARK, cellPadding: { top: 4, bottom: 4, left: 3, right: 3 }, lineColor: [235, 235, 235], lineWidth: 0.15 },
      alternateRowStyles: { fillColor: [250, 250, 250] as [number,number,number] },
      columnStyles: {
        0: { cellWidth: 8,  halign: "center", textColor: MID },
        1: { cellWidth: "auto" },
        2: { cellWidth: 28, halign: "center" },
        3: { cellWidth: 12, halign: "center" },
        4: { cellWidth: 28, halign: "right" },
        5: { cellWidth: 32, halign: "right", fontStyle: "bold" },
      },
      theme: "plain",
    });

    const tableEndY = (doc as any).lastAutoTable.finalY;
    const totW  = 88;
    const totX  = PW - MR - totW;
    const valX  = PW - MR;
    let ty = tableEndY + 10;

    const minRow = (label: string, value: string, bold = false) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...MID);
      doc.text(label, totX, ty);
      doc.setTextColor(...DARK);
      doc.text(value, valX, ty, { align: "right" });
      ty += 6;
    };

    minRow("Subtotal", currFmt(subtotal));
    if (estimate.taxRate > 0) minRow(`Tax (${estimate.taxRate}%)`, currFmt(tax));
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(totX, ty, valX, ty);
    ty += 4;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text("Total Estimate", totX, ty);
    doc.text(currFmt(total), valX, ty, { align: "right" });
    ty += 12;

    const afterNotes2 = drawNotes(ty);
    void afterNotes2;

    // Minimal footer — thin line
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(ML, PH - 10, PW - MR, PH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(160, 160, 160);
    doc.text(`${companyName ?? "Constra"}  ·  ${estimate.number}`, ML, PH - 5);
    doc.text(`Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, PW - MR, PH - 5, { align: "right" });
  }

  if (mode === "dataurl") return doc.output("datauristring");
  doc.save(`${estimate.number}.pdf`);
}

export async function generateEstimatePdfDataUrl(
  estimate: Estimate,
  currency: string,
  companyName?: string,
  companyAddress?: string,
  companyLogo?: string,
  template: InvoiceTemplate = "classic",
): Promise<string> {
  return exportEstimatePdf(estimate, currency, companyName, companyAddress, companyLogo, template, "dataurl") as Promise<string>;
}

// ── Invoice PDF ──────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return [r, g, b];
}

function lighten(rgb: [number,number,number], pct: number): [number,number,number] {
  return rgb.map((c) => Math.round(c + (255 - c) * pct)) as [number,number,number];
}

export async function generateInvoicePdfDataUrl(
  invoice: Invoice,
  currency: string,
  companyName?: string,
  companyAddress?: string,
  companyLogo?: string,
  template: InvoiceTemplate = "classic",
): Promise<string> {
  return exportInvoicePdf(invoice, currency, companyName, companyAddress, companyLogo, "#F5C400", "dataurl", template) as Promise<string>;
}

export async function exportInvoicePdf(
  invoice: Invoice,
  currency: string,
  companyName?: string,
  companyAddress?: string,
  companyLogo?: string,
  accentHex = "#F5C400",
  mode: "save" | "dataurl" = "save",
  template: InvoiceTemplate = "classic",
): Promise<string | void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW   = doc.internal.pageSize.getWidth();
  const PH   = doc.internal.pageSize.getHeight();
  const ML   = 18;
  const MR   = 18;
  const CW   = PW - ML - MR;

  const ACCENT   = hexToRgb(accentHex);
  const ACCENT_L = lighten(ACCENT, 0.88);
  const BLACK    : [number,number,number] = [22,  22,  22 ];
  const DARK     : [number,number,number] = [50,  50,  50 ];
  const GRAY     : [number,number,number] = [120, 120, 120];
  const LGRAY    : [number,number,number] = [210, 210, 210];
  const WHITE    : [number,number,number] = [255, 255, 255];
  const GREEN    : [number,number,number] = [22,  163, 74 ];
  const RED      : [number,number,number] = [220, 38,  38 ];

  const currFmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(n);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });

  const { subtotal: sub, tax, total } = moneyTotals(invoice.items, invoice.taxRate);
  const balanceAmt = invoice.status === "paid" ? 0 : total;

  // ── SHARED: draw logo / initial mark ──────────────────────────────────────
  const drawLogo = (x: number, y: number, size: number, light: boolean) => {
    if (companyLogo?.startsWith("data:image")) {
      doc.setFillColor(...(light ? WHITE : ACCENT_L));
      doc.roundedRect(x, y, size, size, 3, 3, "F");
      try {
        const ext = companyLogo.startsWith("data:image/png") ? "PNG" : "JPEG";
        doc.addImage(companyLogo, ext, x + 1, y + 1, size - 2, size - 2, undefined, "FAST");
      } catch { /* fallback */ }
    } else {
      doc.setFillColor(...ACCENT);
      doc.circle(x + size / 2, y + size / 2, size / 2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size * 0.45);
      doc.setTextColor(...WHITE);
      doc.text((companyName ?? "C").charAt(0).toUpperCase(), x + size / 2, y + size / 2 + size * 0.15, { align: "center" });
    }
  };

  // ── SHARED: line items table ──────────────────────────────────────────────
  const drawLineItems = (startY: number, headFill: [number,number,number], headText: [number,number,number], theme: "grid" | "plain" = "grid") => {
    autoTable(doc, {
      startY,
      margin: { left: ML, right: MR },
      head: [["#", "Item & Description", "Qty", "Rate", "Amount"]],
      body: invoice.items.map((item, idx) => [
        String(idx + 1),
        item.description,
        item.qty.toString(),
        currFmt(item.rate),
        currFmt(lineAmount(item.qty, item.rate)),
      ]),
      headStyles: {
        fillColor: headFill, textColor: headText, fontStyle: "bold",
        fontSize: theme === "plain" ? 7.5 : 9,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      },
      bodyStyles: {
        fontSize: 9, textColor: DARK,
        cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
        lineColor: [235, 235, 235], lineWidth: 0.1,
      },
      alternateRowStyles: { fillColor: theme === "plain" ? [250, 250, 250] : [250, 250, 252] },
      columnStyles: {
        0: { cellWidth: 10, halign: "center", textColor: GRAY },
        1: { cellWidth: "auto" },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 32, halign: "right" },
        4: { cellWidth: 36, halign: "right", fontStyle: "bold" },
      },
      styles: { lineColor: [235, 235, 235], lineWidth: 0.1 },
      theme,
    });
    return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  };

  // ── SHARED: totals block (Sub Total / Tax / Total / Balance Due / Paid) ────
  const drawTotals = (startY: number, minimal = false) => {
    const totW    = 90;
    const totX    = PW - MR - totW;
    const totValX = PW - MR;
    let   totY    = startY;

    const totRow = (label: string, value: string, bold = false, color: [number,number,number] = DARK) => {
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(9);
      doc.setTextColor(...GRAY);
      doc.text(label, totX, totY);
      doc.setTextColor(...color);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(value, totValX, totY, { align: "right" });
      totY += 6.5;
    };

    totRow("Sub Total", currFmt(sub));
    if (invoice.taxRate > 0) totRow(`Tax Rate   ${invoice.taxRate}%`, currFmt(tax));

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(totX, totY, totValX, totY);
    totY += 4;
    totRow("Total", currFmt(total), true, BLACK);

    const bdH = 9;
    if (minimal) {
      // Minimal: text-only, no fill — matches the estimate Minimal template
      totY += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...BLACK);
      doc.text("Balance Due", totX, totY);
      doc.text(currFmt(balanceAmt), totValX, totY, { align: "right" });
      totY += bdH;
    } else {
      doc.setFillColor(...ACCENT);
      doc.roundedRect(totX - 4, totY - 0.5, totW + 4, bdH, 1.5, 1.5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...WHITE);
      doc.text("Balance Due", totX, totY + 5.5);
      doc.text(currFmt(balanceAmt), totValX, totY + 5.5, { align: "right" });
      totY += bdH + 8;
    }

    if (invoice.status === "paid") {
      if (!minimal) {
        doc.setFillColor(...GREEN);
        doc.roundedRect(totX - 4, totY - 2, totW + 4, 8, 2, 2, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...WHITE);
        doc.text("✓  PAID IN FULL", totX + (totW / 2), totY + 4, { align: "center" });
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...GREEN);
        doc.text("✓  PAID IN FULL", totValX, totY + 3, { align: "right" });
      }
      totY += 14;
    }

    return totY;
  };

  // ── SHARED: notes + terms ─────────────────────────────────────────────────
  const drawNotesAndTerms = (startY: number) => {
    let textY = startY;
    if (invoice.notes) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...BLACK);
      doc.text("Notes", ML, textY);
      textY += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      const noteLines = doc.splitTextToSize(invoice.notes, CW * 0.55);
      doc.text(noteLines, ML, textY);
      textY += noteLines.length * 4.2 + 6;
    }
    const termsText = "All payments are due as specified. Overdue accounts may be subject to late fees. Thank you for your business.";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text("Terms & Conditions", ML, textY);
    textY += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    const termLines = doc.splitTextToSize(termsText, CW * 0.55);
    doc.text(termLines, ML, textY);
    return textY;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE: CLASSIC
  // ═══════════════════════════════════════════════════════════════════════════
  if (template === "classic") {
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, "F");

    const LOGO_SIZE = 28;
    const logoX = ML, logoY = 14;
    drawLogo(logoX, logoY, LOGO_SIZE, false);

    let leftY = logoY + LOGO_SIZE + 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.setTextColor(...ACCENT);
    doc.text(companyName ?? "Constra", ML, leftY);
    leftY += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...GRAY);
    if (companyAddress) {
      const parts = companyAddress.split(",").map((s) => s.trim()).filter(Boolean);
      for (const part of parts) { doc.text(part, ML, leftY); leftY += 4.2; }
    }

    const rightX = PW - MR;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(36);
    doc.setTextColor(...BLACK);
    doc.text("INVOICE", rightX, logoY + 12, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...GRAY);
    doc.text(`# ${invoice.number}`, rightX, logoY + 20, { align: "right" });

    doc.setFontSize(8);
    doc.text("Balance Due", rightX, logoY + 29, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...BLACK);
    doc.text(currFmt(balanceAmt), rightX, logoY + 37, { align: "right" });

    const divY = Math.max(leftY + 3, logoY + 42);
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.25);
    doc.line(ML, divY, PW - MR, divY);

    let y = divY + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...GRAY);
    doc.text("BILL TO", ML, y);

    const metaLblX = PW - MR - 82;
    const metaValX = PW - MR;
    doc.text("Invoice Date", metaLblX, y);
    doc.text("Due Date", metaLblX, y + 8);
    doc.text("Terms", metaLblX, y + 16);

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...ACCENT);
    doc.text(invoice.clientName, ML, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...BLACK);
    doc.text(fmtDate(invoice.issueDate), metaValX, y - 2, { align: "right" });
    doc.setTextColor(...(invoice.status === "overdue" ? RED : BLACK));
    doc.text(fmtDate(invoice.dueDate), metaValX, y + 6, { align: "right" });
    doc.setTextColor(...BLACK);
    doc.text("Due on Receipt", metaValX, y + 14, { align: "right" });

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...DARK);
    if (invoice.clientAddress) {
      const addrLines = doc.splitTextToSize(invoice.clientAddress, 80);
      doc.text(addrLines, ML, y);
      y += addrLines.length * 4.5;
    }
    if (invoice.clientEmail) {
      doc.setTextColor(...GRAY);
      doc.text(invoice.clientEmail, ML, y);
      y += 5;
    }
    y = Math.max(y, divY + 34) + 8;

    const tableEndY = drawLineItems(y, ACCENT, WHITE, "grid");
    const afterTotals = drawTotals(tableEndY + 10);
    drawNotesAndTerms(Math.max(afterTotals, tableEndY + 14));

    doc.setFillColor(...ACCENT);
    doc.rect(0, PH - 8, PW, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...WHITE);
    doc.text(`${companyName ?? "Constra"}  ·  ${invoice.number}  ·  Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, ML, PH - 3);
    doc.text("1", PW - MR, PH - 3, { align: "right" });

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE: MODERN
  // ═══════════════════════════════════════════════════════════════════════════
  } else if (template === "modern") {
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, "F");

    const HDR = 48;
    doc.setFillColor(28, 32, 38);
    doc.rect(0, 0, PW, HDR, "F");
    doc.setFillColor(...ACCENT);
    doc.rect(0, 0, 4, HDR, "F");

    drawLogo(ML, 10, 26, false);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text(companyName ?? "Constra", ML + 32, 20);
    if (companyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(160, 170, 185);
      const addrParts = companyAddress.split(",").map(s => s.trim()).filter(Boolean);
      addrParts.slice(0, 2).forEach((p, i) => doc.text(p, ML + 32, 26 + i * 4.5));
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...ACCENT);
    doc.text("INVOICE", PW - MR, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(160, 170, 185);
    doc.text(invoice.number, PW - MR, 26, { align: "right" });
    doc.setFontSize(7);
    doc.text("Balance Due", PW - MR, 34, { align: "right" });
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...WHITE);
    doc.text(currFmt(balanceAmt), PW - MR, 43, { align: "right" });

    let y = HDR + 10;
    const metaLblX = ML, metaValX = ML + 38, meta2LblX = ML + 90, meta2ValX = ML + 130;
    const metaRow = (lx: number, vx: number, label: string, value: string, ty: number, color: [number,number,number] = BLACK) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(label, lx, ty);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...color);
      doc.text(value, vx, ty + 4.5);
    };

    metaRow(metaLblX, metaValX, "BILL TO", invoice.clientName, y);
    metaRow(meta2LblX, meta2ValX, "INVOICE DATE", fmtDate(invoice.issueDate), y);
    metaRow(PW - MR - 65, PW - MR, "DUE DATE", fmtDate(invoice.dueDate), y, invoice.status === "overdue" ? RED : BLACK);
    y += 18;
    metaRow(metaLblX, metaValX, "EMAIL", invoice.clientEmail || "—", y);
    metaRow(PW - MR - 65, PW - MR, "TERMS", "Due on Receipt", y);
    y += 14;

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.25);
    doc.line(ML, y, PW - MR, y);
    y += 8;

    const tableEndY = drawLineItems(y, [28, 32, 38] as [number,number,number], WHITE, "grid");
    const afterTotals = drawTotals(tableEndY + 10);
    drawNotesAndTerms(Math.max(afterTotals, tableEndY + 14));

    doc.setFillColor(...ACCENT);
    doc.rect(0, PH - 6, 4, 6, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`${companyName ?? "Constra"}  ·  ${invoice.number}  ·  Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, ML, PH - 2);

  // ═══════════════════════════════════════════════════════════════════════════
  // TEMPLATE: MINIMAL
  // ═══════════════════════════════════════════════════════════════════════════
  } else {
    doc.setFillColor(...WHITE);
    doc.rect(0, 0, PW, PH, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BLACK);
    doc.text(companyName ?? "Constra", ML, 20);

    let leftY = 26;
    if (companyAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY);
      const parts = companyAddress.split(",").map(s => s.trim()).filter(Boolean);
      parts.slice(0, 3).forEach(p => { doc.text(p, ML, leftY); leftY += 4; });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.setTextColor(...BLACK);
    doc.text("INVOICE", PW - MR, 22, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY);
    doc.text(invoice.number, PW - MR, 30, { align: "right" });

    let y = Math.max(leftY + 6, 38);
    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(ML, y, PW - MR, y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text("BILL TO", ML, y);
    doc.text("DETAILS", PW - MR - 60, y);

    y += 4.5;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...BLACK);
    doc.text(invoice.clientName, ML, y);

    const deets: [string, string, [number,number,number]?][] = [
      ["Invoice Date", fmtDate(invoice.issueDate)],
      ["Due Date", fmtDate(invoice.dueDate), invoice.status === "overdue" ? RED : undefined],
      ["Terms", "Due on Receipt"],
    ];
    let dy = y - 1;
    deets.forEach(([lbl, val, color]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...GRAY);
      doc.text(lbl, PW - MR - 60, dy);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...(color ?? BLACK));
      doc.text(val, PW - MR, dy + 4, { align: "right" });
      dy += 10;
    });

    y += 5;
    if (invoice.clientAddress) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      const addrLines = doc.splitTextToSize(invoice.clientAddress, 80);
      doc.text(addrLines, ML, y);
      y += addrLines.length * 4;
    }
    if (invoice.clientEmail) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY);
      doc.text(invoice.clientEmail, ML, y);
      y += 5;
    }
    y = Math.max(y + 6, dy + 2);

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.2);
    doc.line(ML, y, PW - MR, y);
    y += 7;

    const tableEndY = drawLineItems(y, [245, 245, 245] as [number,number,number], GRAY, "plain");
    const afterTotals = drawTotals(tableEndY + 10, true);
    drawNotesAndTerms(Math.max(afterTotals, tableEndY + 14));

    doc.setDrawColor(...LGRAY);
    doc.setLineWidth(0.3);
    doc.line(ML, PH - 10, PW - MR, PH - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...GRAY);
    doc.text(`${companyName ?? "Constra"}  ·  ${invoice.number}`, ML, PH - 5);
    doc.text(`Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, PW - MR, PH - 5, { align: "right" });
  }

  if (mode === "dataurl") return doc.output("datauristring");
  doc.save(`${invoice.number}.pdf`);
}

// ── Daily Report PDF ──────────────────────────────────────────────────────────

export async function exportDailyReportPdf({
  report,
  projectName,
  submitterName,
  companyName,
  metric = false,
}: {
  report: DailyReport;
  projectName: string;
  submitterName: string;
  companyName?: string;
  metric?: boolean;
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const AMBER = [245, 158, 11] as [number, number, number];
  const DARK = [13, 13, 13] as [number, number, number];
  const PW = doc.internal.pageSize.getWidth();
  const ML = 15;
  const CW = PW - ML * 2;
  let y = 0;

  // Header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 30, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(companyName ?? "Constra", ML, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("DAILY FIELD REPORT", ML, 19);
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(8);
  doc.text(`${projectName}  ·  Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, ML, 26);
  y = 38;

  // Date / meta block
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: ML },
    head: [["Field", "Value", "Field", "Value"]],
    body: [
      ["Date", report.date.toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" }), "Project", projectName],
      ["Weather", report.weather, "Temperature", report.temperatureF !== 0 ? (metric ? `${Math.round(((report.temperatureF - 32) * 5) / 9)}°C` : `${report.temperatureF}°F`) : "—"],
      ["Crew Count", String(report.crewCount), "Submitted By", submitterName],
    ],
    headStyles: { fillColor: AMBER, textColor: [0, 0, 0], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 2: { fontStyle: "bold", cellWidth: 35 } },
    theme: "striped",
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  const textBlock = (heading: string, text: string) => {
    if (!text) return;
    doc.setFillColor(...AMBER);
    doc.rect(ML, y, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(heading.toUpperCase(), ML + 2, y + 4.2);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, CW);
    doc.text(lines, ML, y);
    y += lines.length * 5 + 6;
  };

  textBlock("Work Completed", report.workCompleted);
  if (report.crewOnSite.length > 0) textBlock("Crew on Site", report.crewOnSite.join(", "));
  if (report.materialsUsed) textBlock("Materials Used", report.materialsUsed);
  if (report.delays) textBlock("Delays / Issues", report.delays);
  if (report.visitorLog) textBlock("Visitor Log", report.visitorLog);
  if (report.notes) textBlock("Notes", report.notes);

  // Footer
  const PH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK);
  doc.rect(0, PH - 10, PW, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(`${companyName ?? "Constra"}  ·  Daily Report  ·  ${projectName}`, ML, PH - 3);

  const dateStr = report.date.toISOString().slice(0, 10);
  doc.save(`daily-report-${projectName.replace(/\s+/g, "-").toLowerCase()}-${dateStr}.pdf`);
}

// ── Change Order PDF ──────────────────────────────────────────────────────────

export async function exportChangeOrderPdf({
  changeOrder,
  projectName,
  submitterName,
  currency,
  companyName,
}: {
  changeOrder: ChangeOrder;
  projectName: string;
  submitterName: string;
  currency: string;
  companyName?: string;
}) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const AMBER = [245, 158, 11] as [number, number, number];
  const DARK = [13, 13, 13] as [number, number, number];
  const PW = doc.internal.pageSize.getWidth();
  const ML = 15;
  const CW = PW - ML * 2;
  const PH = doc.internal.pageSize.getHeight();

  const statusColors: Record<string, [number, number, number]> = {
    pending: [245, 158, 11],
    approved: [34, 197, 94],
    rejected: [239, 68, 68],
    void: [113, 113, 122],
  };
  const statusColor = statusColors[changeOrder.status] ?? AMBER;

  const fmtAmt = new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(changeOrder.amount);

  // Header
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PW, 30, "F");
  doc.setTextColor(245, 158, 11);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(companyName ?? "Constra", ML, 12);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CHANGE ORDER", ML, 19);
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(8);
  doc.text(`${changeOrder.number}  ·  ${projectName}  ·  Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, ML, 26);

  // Status badge
  doc.setFillColor(...statusColor);
  doc.roundedRect(PW - ML - 28, 10, 28, 10, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(changeOrder.status === "pending" ? 0 : 255, changeOrder.status === "pending" ? 0 : 255, changeOrder.status === "pending" ? 0 : 255);
  doc.text(changeOrder.status.toUpperCase(), PW - ML - 14, 16.5, { align: "center" });

  let y = 38;

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text(changeOrder.title, ML, y);
  y += 8;

  // Meta table
  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: ML },
    body: [
      ["CO Number", changeOrder.number, "Amount", fmtAmt],
      ["Project", projectName, "Status", changeOrder.status.charAt(0).toUpperCase() + changeOrder.status.slice(1)],
      ["Submitted By", submitterName, "Date", new Date(changeOrder.submittedAt).toLocaleDateString("en-CA", { dateStyle: "medium" })],
      ...(changeOrder.approvedAt
        ? [["Approved By", changeOrder.approvedBy ?? "—", "Approved On", changeOrder.approvedAt.toLocaleDateString("en-CA", { dateStyle: "medium" })]]
        : []),
    ],
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 }, 2: { fontStyle: "bold", cellWidth: 38 } },
    theme: "striped",
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  const section = (heading: string, text: string) => {
    if (!text) return;
    doc.setFillColor(...AMBER);
    doc.rect(ML, y, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(heading.toUpperCase(), ML + 2, y + 4.2);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    const lines = doc.splitTextToSize(text, CW);
    doc.text(lines, ML, y);
    y += lines.length * 5 + 6;
  };

  if (changeOrder.description) section("Description", changeOrder.description);
  if (changeOrder.reason) section("Reason for Change", changeOrder.reason);

  // Amount callout
  y += 4;
  doc.setFillColor(...statusColor);
  doc.roundedRect(ML, y, CW, 16, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(changeOrder.status === "pending" ? 0 : 255, changeOrder.status === "pending" ? 0 : 255, changeOrder.status === "pending" ? 0 : 255);
  doc.text(`Total Change Amount: ${fmtAmt}`, ML + CW / 2, y + 10, { align: "center" });

  // Signature lines
  y += 26;
  const sigLine = (label: string, x: number) => {
    doc.setDrawColor(180, 180, 180);
    doc.line(x, y + 12, x + 70, y + 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(label, x, y + 17);
  };
  if (PH - y > 50) {
    sigLine("Client Signature / Date", ML);
    sigLine("Contractor Signature / Date", ML + CW - 70);
  }

  // Footer
  doc.setFillColor(...DARK);
  doc.rect(0, PH - 10, PW, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(160, 160, 160);
  doc.text(`${companyName ?? "Constra"}  ·  Change Order  ·  ${changeOrder.number}`, ML, PH - 3);

  doc.save(`${changeOrder.number.replace(/\s+/g, "-")}.pdf`);
}
