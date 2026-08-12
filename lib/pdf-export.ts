import type { ClockEntry, Worker, Project, Estimate, Invoice, DailyReport, ChangeOrder } from "./mock-data";

type PdfReportInput = {
  workers: Worker[];
  projects: Project[];
  clockEntries: ClockEntry[];
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
  currency: string;
  companyName?: string;
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

  const { workers, projects, clockEntries, periodStart, periodEnd, periodLabel, currency, companyName } = input;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });

  const periodEntries = clockEntries.filter(
    (e) => e.clockOut && e.clockIn >= periodStart && e.clockIn <= periodEnd
  );

  const workerMap = new Map(workers.map((w) => [w.id, w]));
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  // ── Color tokens ─────────────────────────────────────────────────────────────
  const AMBER  = [245, 158, 11]  as [number, number, number];
  const AMBER_L= [254, 243, 199] as [number, number, number];  // amber-100
  const DARK   = [15,  15,  15]  as [number, number, number];
  const DARK2  = [28,  28,  28]  as [number, number, number];
  const MID    = [90,  90,  90]  as [number, number, number];
  const LIGHT  = [246, 246, 246] as [number, number, number];
  const WHITE  = [255, 255, 255] as [number, number, number];
  const GREEN  = [34,  197, 94]  as [number, number, number];
  const RED    = [239, 68,  68]  as [number, number, number];

  const PAGE_W  = doc.internal.pageSize.getWidth();
  const PAGE_H  = doc.internal.pageSize.getHeight();
  const MARGIN  = 16;
  const CW      = PAGE_W - MARGIN * 2;
  const genDate = new Date().toLocaleDateString("en-CA", { dateStyle: "long" });

  // ── Summary stats ─────────────────────────────────────────────────────────────
  const totalHours = periodEntries.reduce(
    (s, e) => s + (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000, 0
  );
  const activeWorkerIds = new Set(periodEntries.map((e) => e.workerId));
  const payrollByWorker = new Map<string, { name: string; role: string; hours: number; pay: number }>();
  for (const e of periodEntries) {
    const w = workerMap.get(e.workerId);
    if (!w) continue;
    const hours = (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000;
    const existing = payrollByWorker.get(w.id) ?? { name: w.name, role: w.customRole ?? w.role ?? "", hours: 0, pay: 0 };
    existing.hours += hours;
    existing.pay += hours * (w.hourlyRate ?? 0);
    payrollByWorker.set(w.id, existing);
  }
  const totalPay = [...payrollByWorker.values()].reduce((s, r) => s + r.pay, 0);
  const budgetProjects = projects.filter((p) => p.budget > 0);
  const totalBudget = budgetProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent  = budgetProjects.reduce((s, p) => s + p.spent, 0);

  // ── Header block (dark, 48mm tall) ────────────────────────────────────────────
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 48, "F");

  // Left amber accent bar
  doc.setFillColor(...AMBER);
  doc.rect(0, 0, 5, 48, "F");

  // Company name
  doc.setTextColor(...AMBER);
  doc.setFontSize(21);
  doc.setFont("helvetica", "bold");
  doc.text(companyName ?? "Constra", MARGIN + 4, 17);

  // Report label
  doc.setTextColor(...WHITE);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("PAYROLL & TIME REPORT", MARGIN + 4, 27);

  // Period + generated
  doc.setTextColor(160, 160, 160);
  doc.setFontSize(7.5);
  doc.text(`Period: ${periodLabel}`, MARGIN + 4, 35);
  doc.text(`Generated: ${genDate}`, MARGIN + 4, 42);

  // Right-side: confidential badge
  doc.setFillColor(40, 40, 40);
  doc.roundedRect(PAGE_W - MARGIN - 30, 10, 30, 8, 1.5, 1.5, "F");
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(6.5);
  doc.setFont("helvetica", "bold");
  doc.text("CONFIDENTIAL", PAGE_W - MARGIN - 15, 15.2, { align: "center" });

  // ── KPI summary row (4 cards side by side) ────────────────────────────────────
  const cardY = 55;
  const cardH = 24;
  const cardW = (CW - 9) / 4;  // 3 gaps of 3mm between 4 cards

  const kpis = [
    { label: "Total Hours", value: totalHours > 0 ? fmtHours(totalHours) : "0h", sub: `${periodEntries.length} sessions` },
    { label: "Crew Active", value: activeWorkerIds.size.toString(), sub: `of ${workers.length} workers` },
    { label: "Gross Pay", value: fmt(totalPay, currency), sub: totalPay > 0 ? "estimated" : "no rate data" },
    { label: "Budget Used", value: totalBudget > 0 ? `${((totalSpent / totalBudget) * 100).toFixed(0)}%` : "—", sub: totalBudget > 0 ? fmt(totalSpent, currency) + " spent" : "no budgets set" },
  ];

  kpis.forEach((kpi, i) => {
    const cx = MARGIN + i * (cardW + 3);
    doc.setFillColor(26, 26, 26);
    doc.roundedRect(cx, cardY, cardW, cardH, 2, 2, "F");
    // Amber top border accent
    doc.setFillColor(...AMBER);
    doc.rect(cx, cardY, cardW, 1.5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...WHITE);
    doc.text(kpi.value, cx + cardW / 2, cardY + 13, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6);
    doc.setTextColor(...AMBER);
    doc.text(kpi.label.toUpperCase(), cx + cardW / 2, cardY + 7, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(110, 110, 110);
    doc.text(kpi.sub, cx + cardW / 2, cardY + 20, { align: "center" });
  });

  // ── Section helper ─────────────────────────────────────────────────────────────
  let y = cardY + cardH + 12;

  const section = (title: string, icon?: string) => {
    if (y > PAGE_H - 30) { doc.addPage(); y = 20; }
    // Section heading row
    doc.setFillColor(...DARK2);
    doc.rect(MARGIN, y, CW, 8, "F");
    // Left accent bar
    doc.setFillColor(...AMBER);
    doc.rect(MARGIN, y, 3, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...WHITE);
    doc.text((icon ? icon + "  " : "") + title.toUpperCase(), MARGIN + 7, y + 5.5);
    y += 11;
  };

  // ── 1. Payroll Summary ─────────────────────────────────────────────────────────
  section("Payroll Summary");

  const payrollRows = [...payrollByWorker.values()]
    .sort((a, b) => b.hours - a.hours)
    .map((r) => [r.name, r.role, fmtHours(r.hours), fmt(r.pay, currency)]);

  const totalPayHours = [...payrollByWorker.values()].reduce((s, r) => s + r.hours, 0);

  if (payrollRows.length === 0) {
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("No hours recorded in this period.", MARGIN + 6, y + 5);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Worker", "Role", "Total Hours", "Gross Pay"]],
      body: payrollRows,
      foot: [["", "TOTALS", fmtHours(totalPayHours), fmt(totalPay, currency)]],
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize: 8, fontStyle: "bold", cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 } },
      footStyles: { fillColor: AMBER_L, textColor: [80, 50, 0], fontSize: 8, fontStyle: "bold", cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      bodyStyles: { fontSize: 8, textColor: MID, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 } },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right", fontStyle: "bold", textColor: DARK } },
      styles: { lineColor: [232, 232, 232], lineWidth: 0.15 },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── 2. Timesheet Detail ────────────────────────────────────────────────────────
  if (y > PAGE_H - 50) { doc.addPage(); y = 20; }
  section("Timesheet Detail");

  const timesheetRows = periodEntries
    .map((e) => {
      const w = workerMap.get(e.workerId);
      const p = projectMap.get(e.projectId);
      const hours = (e.clockOut!.getTime() - e.clockIn.getTime()) / 3600000;
      return {
        date: e.clockIn.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" }),
        worker: w?.name ?? "—",
        project: p?.name ?? "—",
        clockIn: e.clockIn.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        clockOut: e.clockOut!.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        hours,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.worker.localeCompare(b.worker));

  if (timesheetRows.length === 0) {
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("No timesheet entries in this period.", MARGIN + 6, y + 5);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Date", "Worker", "Project", "In", "Out", "Hours"]],
      body: timesheetRows.map((r) => [r.date, r.worker, r.project, r.clockIn, r.clockOut, fmtHours(r.hours)]),
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize: 8, fontStyle: "bold", cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 } },
      bodyStyles: { fontSize: 7.5, textColor: MID, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 28 },
        3: { halign: "center", cellWidth: 18 },
        4: { halign: "center", cellWidth: 18 },
        5: { halign: "right", fontStyle: "bold", textColor: DARK, cellWidth: 16 },
      },
      styles: { lineColor: [232, 232, 232], lineWidth: 0.15 },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── 3. Project Cost Report ─────────────────────────────────────────────────────
  if (y > PAGE_H - 50) { doc.addPage(); y = 20; }
  section("Project Budget Report");

  const budgetRows = projects
    .filter((p) => p.budget > 0 || p.spent > 0)
    .map((p) => {
      const pct = p.budget > 0 ? ((p.spent / p.budget) * 100).toFixed(0) + "%" : "—";
      const remaining = p.budget > 0 ? p.budget - p.spent : 0;
      const health = p.budget > 0 && p.spent > p.budget ? "Over Budget"
        : p.budget > 0 && p.spent / p.budget > 0.9 ? "At Risk"
        : "On Track";
      return [p.name, p.status, fmt(p.budget, currency), fmt(p.spent, currency), fmt(remaining, currency), pct, health];
    });

  if (budgetRows.length === 0) {
    doc.setTextColor(140, 140, 140);
    doc.setFontSize(8);
    doc.setFont("helvetica", "italic");
    doc.text("No projects with budget data.", MARGIN + 6, y + 5);
    y += 14;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [["Project", "Status", "Budget", "Spent", "Remaining", "Used %", "Health"]],
      body: budgetRows,
      headStyles: { fillColor: DARK, textColor: WHITE, fontSize: 8, fontStyle: "bold", cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 } },
      bodyStyles: { fontSize: 7.5, textColor: MID, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        2: { halign: "right" },
        3: { halign: "right", fontStyle: "bold" },
        4: { halign: "right" },
        5: { halign: "right" },
        6: { halign: "center", fontStyle: "bold" },
      },
      didParseCell(data) {
        if (data.column.index === 6 && data.section === "body") {
          const val = String(data.cell.raw);
          data.cell.styles.textColor = val === "Over Budget" ? RED : val === "At Risk" ? AMBER : GREEN;
        }
        if (data.column.index === 3 && data.section === "body") {
          // Highlight "Spent" red if over budget
          const row = budgetRows[data.row.index];
          if (row) {
            const proj = projects.find((p) => p.name === row[0]);
            if (proj && proj.budget > 0 && proj.spent > proj.budget) {
              data.cell.styles.textColor = RED;
            }
          }
        }
      },
      styles: { lineColor: [232, 232, 232], lineWidth: 0.15 },
      theme: "grid",
    });
    y = (doc as any).lastAutoTable.finalY + 12;
  }

  // ── Footer on every page ───────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Dark footer strip
    doc.setFillColor(...DARK);
    doc.rect(0, PAGE_H - 10, PAGE_W, 10, "F");
    // Amber left border on footer
    doc.setFillColor(...AMBER);
    doc.rect(0, PAGE_H - 10, 5, 10, "F");

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(`${companyName ?? "Constra"} · Payroll & Time Report · ${periodLabel}`, MARGIN, PAGE_H - 4);
    doc.text(`Page ${i} of ${pageCount}`, PAGE_W - MARGIN, PAGE_H - 4, { align: "right" });
  }

  const filename = `report-${periodLabel.replace(/\s/g, "-").toLowerCase()}.pdf`;
  doc.save(filename);
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

// ── Estimate PDF ─────────────────────────────────────────────────────────────
export async function exportEstimatePdf(estimate: Estimate, currency: string, companyName?: string) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const AMBER = [245, 158, 11] as [number, number, number];
  const DARK = [13, 13, 13] as [number, number, number];
  const MID = [80, 80, 80] as [number, number, number];
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN = 18;

  const currFmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(n);

  // Header band
  doc.setFillColor(...DARK);
  doc.rect(0, 0, PAGE_W, 30, "F");
  doc.setTextColor(...AMBER);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(companyName ?? "Constra", MARGIN, 14);
  doc.setTextColor(200, 200, 200);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("ESTIMATE", PAGE_W - MARGIN, 11, { align: "right" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(estimate.number, PAGE_W - MARGIN, 19, { align: "right" });

  let y = 42;

  // Issued / valid / project
  doc.setTextColor(...MID);
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("PROJECT", MARGIN, y);
  doc.text("CLIENT", MARGIN + 70, y);
  doc.text("ISSUED", PAGE_W - MARGIN - 60, y);
  doc.text("VALID UNTIL", PAGE_W - MARGIN, y, { align: "right" });

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.text(estimate.projectName, MARGIN, y);
  doc.text(estimate.clientName, MARGIN + 70, y);
  doc.text(estimate.issueDate.toLocaleDateString("en-CA", { dateStyle: "medium" }), PAGE_W - MARGIN - 60, y);
  doc.text(estimate.validUntil.toLocaleDateString("en-CA", { dateStyle: "medium" }), PAGE_W - MARGIN, y, { align: "right" });

  if (estimate.clientEmail) {
    y += 4;
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(estimate.clientEmail, MARGIN + 70, y);
  }

  y += 12;

  // Divider
  doc.setDrawColor(230, 230, 230);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // Line items table
  const subtotal = estimate.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax = subtotal * (estimate.taxRate / 100);
  const total = subtotal + tax;

  autoTable(doc, {
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    head: [["Description", "Category", "Qty", "Rate", "Amount"]],
    body: estimate.items.map((item) => [
      item.description,
      item.category,
      item.qty.toString(),
      currFmt(item.rate),
      currFmt(item.qty * item.rate),
    ]),
    headStyles: { fillColor: DARK, textColor: [255, 255, 255], fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8.5, textColor: MID },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: { 0: { cellWidth: "auto" }, 2: { halign: "center" }, 3: { halign: "right" }, 4: { halign: "right" } },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 6;

  // Totals block (right-aligned)
  const totalsX = PAGE_W - MARGIN - 80;
  const amtX = PAGE_W - MARGIN;
  doc.setFontSize(8.5);
  doc.setTextColor(...MID);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", totalsX, y);
  doc.text(currFmt(subtotal), amtX, y, { align: "right" });
  y += 5;
  if (estimate.taxRate > 0) {
    doc.text(`Tax (${estimate.taxRate}%)`, totalsX, y);
    doc.text(currFmt(tax), amtX, y, { align: "right" });
    y += 5;
  }
  doc.setDrawColor(220, 220, 220);
  doc.line(totalsX, y, amtX, y);
  y += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text("TOTAL", totalsX, y);
  doc.setTextColor(...AMBER);
  doc.text(currFmt(total), amtX, y, { align: "right" });

  if (estimate.notes) {
    y += 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...MID);
    doc.text("NOTES", MARGIN, y);
    y += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    const lines = doc.splitTextToSize(estimate.notes, PAGE_W - MARGIN * 2);
    doc.text(lines, MARGIN, y);
  }

  // Footer
  const pH = doc.internal.pageSize.getHeight();
  doc.setFillColor(...DARK);
  doc.rect(0, pH - 10, PAGE_W, 10, "F");
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${companyName ?? "Constra"} · ${estimate.number}`, MARGIN, pH - 4);
  doc.text(`Generated ${new Date().toLocaleDateString("en-CA")}`, PAGE_W - MARGIN, pH - 4, { align: "right" });

  doc.save(`${estimate.number}.pdf`);
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
): Promise<string> {
  return exportInvoicePdf(invoice, currency, companyName, companyAddress, companyLogo, "#F5C400", "dataurl") as Promise<string>;
}

export async function exportInvoicePdf(
  invoice: Invoice,
  currency: string,
  companyName?: string,
  companyAddress?: string,
  companyLogo?: string,
  accentHex = "#F5C400",
  mode: "save" | "dataurl" = "save",
): Promise<string | void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc  = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
  const PW   = doc.internal.pageSize.getWidth();
  const PH   = doc.internal.pageSize.getHeight();
  const ML   = 20; // margin left
  const MR   = 20; // margin right
  const CW   = PW - ML - MR;

  const ACCENT  = hexToRgb(accentHex);
  const ACCENT_L = lighten(ACCENT, 0.88);
  const BLACK   : [number,number,number] = [22,  22,  22 ];
  const DARK    : [number,number,number] = [50,  50,  50 ];
  const GRAY    : [number,number,number] = [120, 120, 120];
  const LGRAY   : [number,number,number] = [200, 200, 200];
  const WHITE   : [number,number,number] = [255, 255, 255];
  const GREEN   : [number,number,number] = [22,  163, 74 ];
  const RED     : [number,number,number] = [220, 38,  38 ];

  const currFmt = (n: number) =>
    new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(n);

  const fmtDate = (d: Date) =>
    d.toLocaleDateString("en-CA", { day: "numeric", month: "long", year: "numeric" });

  // White canvas
  doc.setFillColor(...WHITE);
  doc.rect(0, 0, PW, PH, "F");

  // ── HEADER BLOCK ─────────────────────────────────────────────────────────
  const LOGO_SIZE = 28; // mm diameter
  const logoX = ML;
  const logoY = 14;

  // Logo circle / image
  if (companyLogo && companyLogo.startsWith("data:image")) {
    // Rounded square logo
    doc.setFillColor(...ACCENT_L);
    doc.roundedRect(logoX, logoY, LOGO_SIZE, LOGO_SIZE, 5, 5, "F");
    try {
      const ext = companyLogo.startsWith("data:image/png") ? "PNG" : "JPEG";
      doc.addImage(companyLogo, ext, logoX + 1, logoY + 1, LOGO_SIZE - 2, LOGO_SIZE - 2, undefined, "FAST");
    } catch { /* fallback to initials */ }
  } else {
    // Accent circle with company initial
    doc.setFillColor(...ACCENT);
    doc.circle(logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2, LOGO_SIZE / 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...WHITE);
    const initial = (companyName ?? "C").charAt(0).toUpperCase();
    doc.text(initial, logoX + LOGO_SIZE / 2, logoY + LOGO_SIZE / 2 + 5, { align: "center" });
  }

  // Company name + address (below logo)
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
    for (const part of parts) {
      doc.text(part, ML, leftY);
      leftY += 4.2;
    }
  }

  // Right column — "INVOICE" + number + balance due
  const rightX = PW - MR;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(36);
  doc.setTextColor(...BLACK);
  doc.text("INVOICE", rightX, logoY + 12, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...GRAY);
  doc.text(`# ${invoice.number}`, rightX, logoY + 20, { align: "right" });

  const balanceAmt = invoice.status === "paid" ? 0 : invoice.items.reduce((s, i) => s + i.qty * i.rate, 0) * (1 + invoice.taxRate / 100);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Balance Due", rightX, logoY + 29, { align: "right" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...BLACK);
  doc.text(currFmt(balanceAmt), rightX, logoY + 37, { align: "right" });

  // ── DIVIDER ──────────────────────────────────────────────────────────────
  const divY = Math.max(leftY + 3, logoY + 42);
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.25);
  doc.line(ML, divY, PW - MR, divY);

  // ── BILL TO + INVOICE META ────────────────────────────────────────────────
  let y = divY + 8;

  // "Bill To" label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...GRAY);
  doc.text("BILL TO", ML, y);

  // Invoice meta labels (right side)
  const metaLblX = PW - MR - 82;
  const metaValX = PW - MR;

  doc.text("Invoice Date", metaLblX, y);
  doc.text("Due Date", metaLblX, y + 8);
  doc.text("Terms", metaLblX, y + 16);

  y += 5;

  // Client name in accent
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...ACCENT);
  doc.text(invoice.clientName, ML, y);

  // Invoice meta values
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...BLACK);
  doc.text(fmtDate(invoice.issueDate), metaValX, y - 2, { align: "right" });
  const dueTxtColor = invoice.status === "overdue" ? RED : BLACK;
  doc.setTextColor(...dueTxtColor);
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

  // ── LINE ITEMS TABLE ──────────────────────────────────────────────────────
  const sub   = invoice.items.reduce((s, i) => s + i.qty * i.rate, 0);
  const tax   = sub * (invoice.taxRate / 100);
  const total = sub + tax;

  autoTable(doc, {
    startY: y,
    margin: { left: ML, right: MR },
    head: [["#", "Item & Description", "Qty", "Rate", "Amount"]],
    body: invoice.items.map((item, idx) => [
      String(idx + 1),
      item.description,
      item.qty.toString(),
      currFmt(item.rate),
      currFmt(item.qty * item.rate),
    ]),
    headStyles: {
      fillColor: ACCENT,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      textColor: DARK,
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
      lineColor: [235, 235, 235],
      lineWidth: 0.1,
    },
    alternateRowStyles: { fillColor: [250, 250, 252] },
    columnStyles: {
      0: { cellWidth: 10, halign: "center", textColor: GRAY },
      1: { cellWidth: "auto" },
      2: { cellWidth: 14, halign: "center" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 36, halign: "right", fontStyle: "bold" },
    },
    styles: { lineColor: [235, 235, 235], lineWidth: 0.1 },
    theme: "grid",
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // ── TOTALS BLOCK (right-aligned) ──────────────────────────────────────────
  const totW    = 90;
  const totX    = PW - MR - totW;
  const totValX = PW - MR;
  let   totY    = y;

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

  // Divider before total
  doc.setDrawColor(...LGRAY);
  doc.setLineWidth(0.2);
  doc.line(totX, totY, totValX, totY);
  totY += 4;
  totRow("Total", currFmt(total), true, BLACK);

  // Balance Due — highlighted row
  const bdH = 9;
  doc.setFillColor(...ACCENT);
  doc.roundedRect(totX - 4, totY - 0.5, totW + 4, bdH, 1.5, 1.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...WHITE);
  doc.text("Balance Due", totX, totY + 5.5);
  doc.text(currFmt(invoice.status === "paid" ? 0 : total), totValX, totY + 5.5, { align: "right" });
  totY += bdH + 8;

  // Paid stamp
  if (invoice.status === "paid") {
    doc.setFillColor(...GREEN);
    doc.roundedRect(totX - 4, totY - 2, totW + 4, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...WHITE);
    doc.text("✓  PAID IN FULL", totX + (totW / 2), totY + 4, { align: "center" });
    totY += 14;
  }

  // ── NOTES + TERMS ─────────────────────────────────────────────────────────
  const bottomY = Math.max(totY, y + 4);
  let textY = bottomY;

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

  // ── FOOTER ────────────────────────────────────────────────────────────────
  doc.setFillColor(...ACCENT);
  doc.rect(0, PH - 8, PW, 8, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...WHITE);
  doc.text(`${companyName ?? "Constra"}  ·  ${invoice.number}  ·  Generated ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}`, ML, PH - 3);
  doc.text("1", PW - MR, PH - 3, { align: "right" });

  if (mode === "dataurl") return doc.output("datauristring");
  doc.save(`${invoice.number}.pdf`);
}

// ── Daily Report PDF ──────────────────────────────────────────────────────────

export async function exportDailyReportPdf({
  report,
  projectName,
  submitterName,
  companyName,
}: {
  report: DailyReport;
  projectName: string;
  submitterName: string;
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
      ["Weather", report.weather, "Temperature", report.temperatureF > 0 ? `${report.temperatureF}°F` : "—"],
      ["Crew Count", String(report.crewCount), "Submitted By", submitterName],
    ],
    headStyles: { fillColor: AMBER, textColor: [0, 0, 0], fontStyle: "bold", fontSize: 8 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 35 }, 2: { fontStyle: "bold", cellWidth: 35 } },
    theme: "striped",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
      ["Submitted By", submitterName, "Date", changeOrder.submittedAt.toLocaleDateString("en-CA", { dateStyle: "medium" })],
      ...(changeOrder.approvedAt
        ? [["Approved By", changeOrder.approvedBy ?? "—", "Approved On", changeOrder.approvedAt.toLocaleDateString("en-CA", { dateStyle: "medium" })]]
        : []),
    ],
    bodyStyles: { fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 248, 248] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 38 }, 2: { fontStyle: "bold", cellWidth: 38 } },
    theme: "striped",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
