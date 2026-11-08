import { saveFile } from "@/lib/native";
import { type Timesheet, loadLogo, periodLabel, timesheetFileName } from "./timesheet";

// A real .xlsx built by hand (it's only zipped XML) rather than pulling in a spreadsheet library
// for one export. Dates, times and hours are real numbers, so a bookkeeper can sum and sort them.

type Cell =
  | { s: string; st?: number }                // text
  | { n: number; st?: number }                // number, date or time
  | { f: string; st?: number }                // formula
  | null;

// Style ids, matching cellXfs in STYLES below
const S = { title: 1, sub: 2, head: 3, text: 4, date: 5, time: 6, hours: 7, totalLabel: 8, totalHours: 9, name: 10, headRight: 11, ot: 12, count: 13, totalCount: 14 } as const;

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="2"><numFmt numFmtId="164" formatCode="ddd mmm d, yyyy"/><numFmt numFmtId="165" formatCode="h:mm AM/PM"/></numFmts>
<fonts count="7">
<font><sz val="11"/><color rgb="FF151617"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="18"/><color rgb="FF151617"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="11"/><color rgb="FF77797C"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF151617"/><name val="Calibri"/><family val="2"/></font>
<font><b/><sz val="11"/><color rgb="FF9A3412"/><name val="Calibri"/><family val="2"/></font>
<font><sz val="11"/><color rgb="FF4B4D50"/><name val="Calibri"/><family val="2"/></font>
</fonts>
<fills count="4">
<fill><patternFill patternType="none"/></fill>
<fill><patternFill patternType="gray125"/></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FF151617"/><bgColor indexed="64"/></patternFill></fill>
<fill><patternFill patternType="solid"><fgColor rgb="FFF5F4F1"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<borders count="3">
<border><left/><right/><top/><bottom/><diagonal/></border>
<border><left/><right/><top/><bottom style="thin"><color rgb="FFE0DDD7"/></bottom><diagonal/></border>
<border><left/><right/><top style="medium"><color rgb="FF151617"/></top><bottom/><diagonal/></border>
</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" indent="1"/></xf>
<xf numFmtId="0" fontId="6" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="164" fontId="6" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left"/></xf>
<xf numFmtId="165" fontId="6" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="2" fontId="4" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="2" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
<xf numFmtId="0" fontId="3" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment horizontal="right" vertical="center" indent="1"/></xf>
<xf numFmtId="2" fontId="5" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="1" fontId="6" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1"/>
<xf numFmtId="1" fontId="4" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};

/** Excel's serial date for the wall-clock time shown on the device */
const serial = (d: Date) =>
  (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), d.getSeconds()) / 86_400_000) + 25569;
const serialDay = (d: Date) => Math.floor(serial(d));
const serialTime = (d: Date) => serial(d) - serialDay(d);

function sheetXml(opts: {
  rows: { cells: Cell[]; height?: number }[];
  widths: number[];
  freezeRow?: number;
  filter?: string;
  merges?: string[];
  drawing?: boolean;
}) {
  const rows = opts.rows.map((r, ri) => {
    const cells = r.cells.map((c, ci) => {
      if (!c) return "";
      const ref = `${colName(ci)}${ri + 1}`;
      const st = c.st ? ` s="${c.st}"` : "";
      if ("s" in c) return `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(c.s)}</t></is></c>`;
      if ("f" in c) return `<c r="${ref}"${st}><f>${esc(c.f)}</f></c>`;
      return `<c r="${ref}"${st}><v>${Number.isFinite(c.n) ? c.n : 0}</v></c>`;
    }).join("");
    const ht = r.height ? ` ht="${r.height}" customHeight="1"` : "";
    return `<row r="${ri + 1}"${ht}>${cells}</row>`;
  }).join("");
  const pane = opts.freezeRow
    ? `<pane ySplit="${opts.freezeRow}" topLeftCell="A${opts.freezeRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${opts.freezeRow + 1}" sqref="A${opts.freezeRow + 1}"/>`
    : "";
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${opts.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows}</sheetData>
${opts.filter ? `<autoFilter ref="${opts.filter}"/>` : ""}
${opts.merges?.length ? `<mergeCells count="${opts.merges.length}">${opts.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}
<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>
<pageSetup orientation="portrait" fitToWidth="1" fitToHeight="0"/>
${opts.drawing ? `<drawing r:id="rId1"/>` : ""}
</worksheet>`;
}

export async function exportTimesheetXlsx(sheet: Timesheet, opts: { companyName: string; logo?: string }) {
  await saveFile(await buildTimesheetXlsx(sheet, opts), timesheetFileName(opts.companyName || "Your company", sheet.start, sheet.end, "xlsx"));
}

export async function buildTimesheetXlsx(sheet: Timesheet, opts: { companyName: string; logo?: string }): Promise<Blob> {
  const { zipSync, strToU8 } = await import("fflate");
  const logo = await loadLogo(opts.logo);
  const company = opts.companyName || "Your company";
  const ot = sheet.overtimeOn;

  // ── Summary ────────────────────────────────────────────────────────────────
  const top: { cells: Cell[]; height?: number }[] = [];
  if (logo) top.push({ cells: [], height: 54 }, { cells: [], height: 8 });
  top.push(
    { cells: [{ s: company, st: S.title }], height: 26 },
    { cells: [{ s: `Timesheet  ·  ${periodLabel(sheet.start, sheet.end)}`, st: S.sub }] },
    { cells: [{ s: `Prepared ${new Date().toLocaleDateString("en-CA", { dateStyle: "long" })}${sheet.running ? `  ·  ${sheet.running} running shift${sheet.running === 1 ? "" : "s"} not counted yet` : ""}`, st: S.sub }] },
    { cells: [] },
  );
  const head = ["Name", "Role", "Days worked", "Shifts", ...(ot ? ["Regular hours", "Overtime hours"] : []), "Total hours"];
  const headRow = top.length + 1;
  const summaryRows: { cells: Cell[]; height?: number }[] = [
    ...top,
    { cells: head.map((h, i) => ({ s: h, st: i >= 2 ? S.headRight : S.head })), height: 24 },
    ...sheet.people.map((p) => ({
      cells: [
        { s: p.worker.name, st: S.name },
        { s: p.worker.customRole || p.worker.role || "", st: S.text },
        { n: p.days.filter((d) => d.hours > 0).length, st: S.count },
        { n: p.shiftCount, st: S.count },
        ...(ot ? [{ n: p.regular, st: S.hours }, { n: p.overtime, st: p.overtime > 0 ? S.ot : S.hours }] : []),
        { n: p.total, st: S.hours },
      ] as Cell[],
    })),
  ];
  const first = headRow + 1, last = headRow + sheet.people.length;
  const sum = (col: number, st: number) => sheet.people.length ? { f: `SUM(${colName(col)}${first}:${colName(col)}${last})`, st } : { n: 0, st };
  summaryRows.push({
    cells: [
      { s: "Total", st: S.totalLabel }, { s: "", st: S.totalLabel },
      sum(2, S.totalCount), sum(3, S.totalCount),
      ...(ot ? [sum(4, S.totalHours), sum(5, S.totalHours)] : []),
      sum(head.length - 1, S.totalHours),
    ],
    height: 22,
  });

  // ── Shifts: one row per shift, for sorting, filtering and pivots ───────────
  const shiftHead = ["Name", "Date", "Job", "Clock in", "Clock out", "Hours"];
  const shiftRows: { cells: Cell[]; height?: number }[] = [
    { cells: shiftHead.map((h, i) => ({ s: h, st: i >= 3 ? S.headRight : S.head })), height: 24 },
  ];
  for (const p of sheet.people) {
    for (const d of p.days) {
      for (const s of d.shifts) {
        shiftRows.push({
          cells: [
            { s: p.worker.name, st: S.name },
            { n: serialDay(s.clockIn), st: S.date },
            { s: s.projectName, st: S.text },
            { n: serialTime(s.clockIn), st: S.time },
            // A shift past midnight keeps its date in the Date column; the time still reads right
            { n: serialTime(s.clockOut), st: S.time },
            { n: s.hours, st: S.hours },
          ],
        });
      }
    }
  }
  const lastShift = shiftRows.length;
  shiftRows.push({
    cells: [
      { s: "Total", st: S.totalLabel }, { s: "", st: S.totalLabel }, { s: "", st: S.totalLabel },
      { s: "", st: S.totalLabel }, { s: "", st: S.totalLabel },
      lastShift > 1 ? { f: `SUM(F2:F${lastShift})`, st: S.totalHours } : { n: 0, st: S.totalHours },
    ],
    height: 22,
  });

  const files: Record<string, Uint8Array> = {
    "[Content_Types].xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${logo ? `<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` : ""}
</Types>`),
    "_rels/.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`),
    "xl/workbook.xml": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets><sheet name="Summary" sheetId="1" r:id="rId1"/><sheet name="Shifts" sheetId="2" r:id="rId2"/></sheets>
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`),
    "xl/_rels/workbook.xml.rels": strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`),
    "xl/styles.xml": strToU8(STYLES),
    "xl/worksheets/sheet1.xml": strToU8(sheetXml({
      rows: summaryRows,
      widths: [26, 20, 13, 10, ...(ot ? [15, 16] : []), 14],
      drawing: !!logo,
    })),
    "xl/worksheets/sheet2.xml": strToU8(sheetXml({
      rows: shiftRows,
      widths: [24, 20, 26, 12, 12, 10],
      freezeRow: 1,
      filter: lastShift > 1 ? `A1:F${lastShift}` : undefined,
    })),
  };

  if (logo) {
    // Fit inside roughly 220×60 px at the top-left of the Summary sheet
    const r = Math.min(220 / logo.width, 60 / logo.height);
    const cx = Math.round(logo.width * r * 9525), cy = Math.round(logo.height * r * 9525);
    files["xl/worksheets/_rels/sheet1.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`);
    files["xl/drawings/_rels/drawing1.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>
</Relationships>`);
    files["xl/drawings/drawing1.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:oneCellAnchor>
<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>57150</xdr:rowOff></xdr:from>
<xdr:ext cx="${cx}" cy="${cy}"/>
<xdr:pic>
<xdr:nvPicPr><xdr:cNvPr id="2" name="Logo" descr="${esc(company)} logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
</xdr:pic>
<xdr:clientData/>
</xdr:oneCellAnchor>
</xdr:wsDr>`);
    const b64 = logo.dataUrl.slice(logo.dataUrl.indexOf(",") + 1);
    files["xl/media/image1.png"] = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  }

  // Hours stay unrounded; the 0.00 format rounds what shows, so every tab sums to the same total
  const zipped = zipSync(files, { level: 6 });
  const blob = new Blob([zipped as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  return blob;
}

