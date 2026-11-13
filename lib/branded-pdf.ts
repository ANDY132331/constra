import { loadLogo } from "./timesheet";
import { saveFile } from "./native";

// One layout for every paper record the app produces: the company logo and name on top, the
// document type and number, a hi-vis rule, the details, long text sections, an optional table,
// signature lines, and "Page x of y" at the bottom. Used for RFIs, change orders, punch items,
// incident and daily reports, and for whole-list exports.

type RGB = [number, number, number];
const INK: RGB = [21, 22, 23], INK2: RGB = [75, 77, 80], INK3: RGB = [119, 121, 124], RULE: RGB = [214, 211, 205], PAPER: RGB = [245, 244, 241], HV: RGB = [245, 196, 0];
export type Tone = "good" | "warn" | "bad" | "info";
const TONE: Record<Tone, RGB> = { good: [30, 122, 69], warn: [166, 110, 0], bad: [185, 56, 44], info: [47, 74, 107] };

export type Brand = { company: string; logo?: string; address?: string };

export type RecordPdf = {
  brand: Brand;
  /** "RFI", "Change order" */
  kind: string;
  number?: string;
  title: string;
  status?: { label: string; tone: Tone };
  fields: [string, string][];
  sections?: { heading: string; body: string }[];
  table?: { heading?: string; head: string[]; rows: string[][]; foot?: string[]; align?: ("left" | "right" | "center")[] };
  signatures?: string[];
  filename: string;
};

export type ListPdf = {
  brand: Brand;
  title: string;
  subtitle?: string;
  summary?: [string, string][];
  columns: { label: string; w?: number; align?: "left" | "right" | "center" }[];
  rows: string[][];
  landscape?: boolean;
  filename: string;
  /** colours the cell in this column by its text */
  toneColumn?: { index: number; tones: Record<string, Tone> };
};

const today = () => new Date().toLocaleDateString("en-CA", { dateStyle: "long" });
export const safeName = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "") || "Constra";
// The built-in PDF fonts only cover Western characters, so a stray character from another
// alphabet would print as garbage; swap the few punctuation marks that don't exist for ones that do.
const t = (s: string | number | null | undefined) => String(s ?? "").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/…/g, "...").replace(/[•]/g, "-").replace(/ /g, " ");

type Jspdf = import("jspdf").jsPDF;

async function start(brand: Brand, landscape = false) {
  const { default: JsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");
  const logo = await loadLogo(brand.logo);
  const doc = new JsPDF({ orientation: landscape ? "landscape" : "portrait", unit: "mm", format: "letter" });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight();
  const M = 16;
  return { doc, autoTable, logo, W, H, M, CW: W - M * 2 };
}
type Ctx = Awaited<ReturnType<typeof start>>;

const lastY = (doc: Jspdf) => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

/** Logo (or an initial in a hi-vis square), company name and address, then the document kind and number on the right */
function drawTop(c: Ctx, brand: Brand, kind: string, number?: string) {
  const { doc, W, M } = c;
  let x = M;
  const top = 12;
  if (c.logo) {
    const r = Math.min(46 / c.logo.width, 16 / c.logo.height);
    const w = c.logo.width * r, h = c.logo.height * r;
    doc.addImage(c.logo.dataUrl, "PNG", M, top, w, h, "logo", "FAST");
    x = M + w + 5;
  } else {
    doc.setFillColor(...HV); doc.roundedRect(M, top, 14, 14, 1.5, 1.5, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(13); doc.setTextColor(...INK);
    doc.text(t((brand.company || "C").charAt(0).toUpperCase()), M + 7, top + 9.4, { align: "center" });
    x = M + 19;
  }
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(...INK);
  doc.text(t(brand.company || "Your company"), x, top + 6);
  if (brand.address) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK3);
    doc.text(doc.splitTextToSize(t(brand.address), W - M - x - 60).slice(0, 2), x, top + 11);
  }
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK3);
  {
    // letter-spaced text can't be right-aligned by the PDF library (it ignores the spacing), so place it by its width
    const kt = t(kind).toUpperCase(), cs = 0.6;
    doc.text(kt, W - M - (doc.getTextWidth(kt) + cs * (kt.length - 1)), top + 4, { charSpace: cs });
  }
  if (number) { doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(...INK); doc.text(t(number), W - M, top + 12, { align: "right" }); }
  doc.setFillColor(...HV); doc.rect(M, 33, W - M * 2, 1.1, "F");
}

function slimHeader(c: Ctx, brand: Brand, label: string) {
  const { doc, W, M } = c;
  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(...INK);
  doc.text(t(brand.company), M, 12);
  doc.setFont("helvetica", "normal"); doc.setTextColor(...INK3);
  doc.text(t(label), W - M, 12, { align: "right" });
  doc.setFillColor(...HV); doc.rect(M, 14.5, W - M * 2, 0.7, "F");
}

function finish(c: Ctx, brand: Brand, label: string) {
  const { doc, W, H, M } = c;
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    if (i > 1) slimHeader(c, brand, label);
    doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.line(M, H - 13, W - M, H - 13);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(...INK3);
    doc.text(t(`${brand.company}  -  Generated ${today()}`), M, H - 8.5);
    doc.text(`Page ${i} of ${n}`, W - M, H - 8.5, { align: "right" });
  }
}

async function save(doc: Jspdf, filename: string) {
  await saveFile(doc.output("blob"), filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export async function exportRecordPdf(r: RecordPdf) {
  const c = await start(r.brand);
  const { doc, autoTable, W, H, M, CW } = c;
  drawTop(c, r.brand, r.kind, r.number);

  // title and status
  let y = 46;
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK);
  const titleW = r.status ? CW - 38 : CW;
  const titleLines = doc.splitTextToSize(t(r.title), titleW) as string[];
  doc.text(titleLines, M, y);
  if (r.status) {
    const col = TONE[r.status.tone];
    doc.setFont("helvetica", "bold"); doc.setFontSize(8);
    const lw = Math.max(24, doc.getTextWidth(t(r.status.label).toUpperCase()) + 8);
    doc.setFillColor(...col); doc.roundedRect(W - M - lw, y - 5.5, lw, 8, 1.2, 1.2, "F");
    doc.setTextColor(255, 255, 255); doc.text(t(r.status.label).toUpperCase(), W - M - lw / 2, y - 0.4, { align: "center", charSpace: 0.4 });
  }
  y += titleLines.length * 7 + 3;

  // details, two pairs per row
  const rows: string[][] = [];
  for (let i = 0; i < r.fields.length; i += 2) {
    const a = r.fields[i], b = r.fields[i + 1] ?? ["", ""];
    rows.push([a[0], t(a[1]) || "-", b[0], b[0] ? t(b[1]) || "-" : ""]);
  }
  autoTable(doc, {
    startY: y, margin: { left: M, right: M, top: 20 }, body: rows, theme: "plain",
    styles: { fontSize: 9.5, cellPadding: { top: 2.6, bottom: 2.6, left: 3, right: 3 }, textColor: INK, lineColor: RULE, lineWidth: 0 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: "bold", fontSize: 7.5, textColor: INK3, fillColor: PAPER },
      1: { cellWidth: (CW - 60) / 2, fillColor: PAPER },
      2: { cellWidth: 30, fontStyle: "bold", fontSize: 7.5, textColor: INK3, fillColor: PAPER },
      3: { cellWidth: (CW - 60) / 2, fillColor: PAPER },
    },
    didParseCell: (d) => { if (d.section === "body" && (d.column.index === 0 || d.column.index === 2)) d.cell.text = d.cell.text.map((s) => s.toUpperCase()); },
    didDrawCell: (d) => { if (d.section === "body" && d.column.index === 3) { doc.setDrawColor(...RULE); doc.setLineWidth(0.2); doc.line(M, d.cell.y + d.cell.height, W - M, d.cell.y + d.cell.height); } },
  });
  y = lastY(doc) + 8;

  const room = (need: number) => { if (y + need > H - 20) { doc.addPage(); y = 24; } };
  const heading = (txt: string) => {
    room(16);
    doc.setFillColor(...HV); doc.rect(M, y - 3, 3, 3, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...INK);
    doc.text(t(txt).toUpperCase(), M + 5.5, y - 0.4, { charSpace: 0.6 });
    y += 4;
  };

  for (const s of r.sections ?? []) {
    if (!s.body?.trim()) continue;
    heading(s.heading);
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...INK2);
    for (const line of doc.splitTextToSize(t(s.body), CW) as string[]) {
      room(6);
      doc.text(line, M, y);
      y += 5;
    }
    y += 5;
  }

  if (r.table) {
    if (r.table.heading) heading(r.table.heading);
    autoTable(doc, {
      startY: y, margin: { left: M, right: M, top: 20 }, head: [r.table.head.map(t)], body: r.table.rows.map((row) => row.map(t)), foot: r.table.foot ? [r.table.foot.map(t)] : undefined,
      theme: "plain", styles: { fontSize: 9, cellPadding: 2.6, textColor: INK2, lineColor: RULE, lineWidth: { bottom: 0.2 } },
      headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 8, lineWidth: 0 },
      footStyles: { fillColor: PAPER, textColor: INK, fontStyle: "bold", lineWidth: 0 },
      alternateRowStyles: { fillColor: [250, 250, 248] },
      columnStyles: Object.fromEntries((r.table.align ?? []).map((a, i) => [i, { halign: a }])),
    });
    y = lastY(doc) + 10;
  }

  if (r.signatures?.length) {
    room(26);
    y = Math.max(y + 8, y);
    const n = r.signatures.length, gap = 10, w = (CW - gap * (n - 1)) / n;
    r.signatures.forEach((label, i) => {
      const x = M + i * (w + gap);
      doc.setDrawColor(...INK); doc.setLineWidth(0.3); doc.line(x, y + 10, x + w, y + 10);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...INK3);
      doc.text(t(label), x, y + 14.5);
    });
  }

  finish(c, r.brand, `${r.kind}${r.number ? ` ${r.number}` : ""}`);
  await save(doc, r.filename);
}

export async function exportListPdf(l: ListPdf) {
  const c = await start(l.brand, l.landscape);
  const { doc, autoTable, W, M, CW } = c;
  drawTop(c, l.brand, "Report", undefined);
  let y = 46;
  doc.setFont("helvetica", "bold"); doc.setFontSize(18); doc.setTextColor(...INK);
  doc.text(t(l.title), M, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9.5); doc.setTextColor(...INK3);
  doc.text(t(l.subtitle ?? `Generated ${today()}`), W - M, y, { align: "right" });
  y += 6;

  if (l.summary?.length) {
    const n = l.summary.length, w = CW / n;
    doc.setFillColor(...PAPER); doc.rect(M, y, CW, 15, "F");
    l.summary.forEach(([label, value], i) => {
      const x = M + i * w + 4;
      doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...INK3);
      doc.text(t(label).toUpperCase(), x, y + 5.5, { charSpace: 0.4 });
      doc.setFontSize(13); doc.setTextColor(...INK);
      doc.text(t(value), x, y + 12);
    });
    y += 21;
  } else y += 2;

  const total = l.columns.reduce((s, col) => s + (col.w ?? 1), 0);
  autoTable(doc, {
    startY: y, margin: { left: M, right: M, top: 20 }, head: [l.columns.map((col) => t(col.label))], body: l.rows.map((row) => row.map(t)),
    theme: "plain", styles: { fontSize: 8.5, cellPadding: 2.4, textColor: INK2, lineColor: RULE, lineWidth: { bottom: 0.2 }, valign: "top" },
    headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7.5, lineWidth: 0 },
    alternateRowStyles: { fillColor: [250, 250, 248] },
    columnStyles: Object.fromEntries(l.columns.map((col, i) => [i, { cellWidth: (CW * (col.w ?? 1)) / total, halign: col.align ?? "left" }])),
    didParseCell: (d) => {
      if (d.section === "body" && l.toneColumn && d.column.index === l.toneColumn.index) {
        const tone = l.toneColumn.tones[d.cell.text.join(" ")];
        if (tone) { d.cell.styles.textColor = TONE[tone]; d.cell.styles.fontStyle = "bold"; }
      }
    },
  });
  if (!l.rows.length) {
    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...INK3);
    doc.text("Nothing to list yet.", M, lastY(doc) + 8);
  }
  finish(c, l.brand, l.title);
  await save(doc, l.filename);
}
