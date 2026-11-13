import { loadLogo } from "./timesheet";

// A small .xlsx writer for the templates (an .xlsx is zipped XML, so no spreadsheet library is
// needed). It covers what the templates use: styles, real Excel Tables (filter buttons, banding,
// totals row, calculated columns that fill down), drop-down lists, conditional colours, frozen
// rows, a logo, and print setup. Dates are real serial numbers and formulas are live.

export type Border = { style: "thin" | "medium" | "hair" | "thick"; color?: string };
export type StyleSpec = {
  bold?: boolean; italic?: boolean; size?: number; color?: string; fill?: string;
  align?: "left" | "center" | "right"; valign?: "top" | "center" | "bottom"; wrap?: boolean; indent?: number;
  numFmt?: string; top?: Border; bottom?: Border; left?: Border; right?: Border; font?: string;
};

export type Cell =
  | { s: string; st?: number }                       // text
  | { n: number; st?: number }                       // number or date serial
  | { f: string; v?: number | string; st?: number }  // formula, with the value to show before Excel recalculates
  | null;

export type Row = { cells: Cell[]; height?: number };

export type TableDef = {
  name: string;           // letters, digits and underscores only
  headRow: number;        // 1-based row of the header
  firstCol: number;       // 0-based column
  columns: { name: string; total?: "sum" | "count" | "average" | "label"; totalLabel?: string; calc?: string }[];
  rows: number;           // data rows in the table, excluding header and totals
  totals?: boolean;
};

export type Validation = { sqref: string; type: "list"; list: string[]; prompt?: string } | { sqref: string; type: "decimal" | "whole"; min: number; max?: number };
export type CfRule = { kind: "equal"; value: string; dxf: number } | { kind: "expr"; formula: string; dxf: number };
export type Cf = { sqref: string; rules: CfRule[] };

export type SheetDef = {
  name: string;
  rows: Row[];
  widths: number[];
  merges?: string[];
  freezeRow?: number;       // rows kept in view (counting from the top)
  tables?: TableDef[];
  validations?: Validation[];
  cfs?: Cf[];
  landscape?: boolean;
  printTitleRow?: number;   // a header row repeated on each printed page
  tabColor?: string;
  logoRows?: number;        // the logo sits over the first N rows, from the top-left
};

const esc = (s: string) =>
  s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const colName = (i: number) => {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
};
export const cellRef = (col: number, row: number, abs = false) => (abs ? `$${colName(col)}$${row}` : `${colName(col)}${row}`);

/** Excel's serial date for a date as it reads on the device */
export const serialDay = (d: Date) => Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000) + 25569;

const rgb = (hex: string) => "FF" + hex.replace("#", "").toUpperCase();

export class Book {
  private fonts: string[] = [];
  private fills: string[] = [`<fill><patternFill patternType="none"/></fill>`, `<fill><patternFill patternType="gray125"/></fill>`];
  private borders: string[] = [`<border><left/><right/><top/><bottom/><diagonal/></border>`];
  private fmts = new Map<string, number>();
  private xfs: string[] = [];
  private xfIndex = new Map<string, number>();
  private dxfs: string[] = [];
  sheets: SheetDef[] = [];

  constructor() {
    this.style({}); // xf 0 is the default
  }

  private idx(list: string[], xml: string) {
    const i = list.indexOf(xml);
    if (i >= 0) return i;
    list.push(xml);
    return list.length - 1;
  }

  style(sp: StyleSpec): number {
    const key = JSON.stringify(sp);
    const hit = this.xfIndex.get(key);
    if (hit !== undefined) return hit;
    const font = this.idx(this.fonts, `<font>${sp.bold ? "<b/>" : ""}${sp.italic ? "<i/>" : ""}<sz val="${sp.size ?? 11}"/><color rgb="${rgb(sp.color ?? "#151617")}"/><name val="${sp.font ?? "Calibri"}"/><family val="2"/></font>`);
    const fill = sp.fill ? this.idx(this.fills, `<fill><patternFill patternType="solid"><fgColor rgb="${rgb(sp.fill)}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
    const side = (tag: string, b?: Border) => (b ? `<${tag} style="${b.style}"><color rgb="${rgb(b.color ?? "#D6D3CD")}"/></${tag}>` : `<${tag}/>`);
    const border = this.idx(this.borders, `<border>${side("left", sp.left)}${side("right", sp.right)}${side("top", sp.top)}${side("bottom", sp.bottom)}<diagonal/></border>`);
    let numFmtId = 0;
    if (sp.numFmt) {
      if (!this.fmts.has(sp.numFmt)) this.fmts.set(sp.numFmt, 164 + this.fmts.size);
      numFmtId = this.fmts.get(sp.numFmt)!;
    }
    const align = sp.align || sp.valign || sp.wrap || sp.indent
      ? `<alignment${sp.align ? ` horizontal="${sp.align}"` : ""} vertical="${sp.valign ?? "center"}"${sp.wrap ? ` wrapText="1"` : ""}${sp.indent ? ` indent="${sp.indent}"` : ""}/>`
      : "";
    const xf = `<xf numFmtId="${numFmtId}" fontId="${font}" fillId="${fill}" borderId="${border}" xfId="0" applyFont="1"${fill ? ` applyFill="1"` : ""}${border ? ` applyBorder="1"` : ""}${numFmtId ? ` applyNumberFormat="1"` : ""}${align ? ` applyAlignment="1">${align}</xf>` : "/>"}`;
    this.xfs.push(xf);
    const i = this.xfs.length - 1;
    this.xfIndex.set(key, i);
    return i;
  }

  /** A colour/bold change applied by a conditional rule */
  dxf(sp: { color?: string; fill?: string; bold?: boolean }): number {
    const xml = `<dxf>${sp.color || sp.bold ? `<font>${sp.bold ? "<b/>" : ""}${sp.color ? `<color rgb="${rgb(sp.color)}"/>` : ""}</font>` : ""}${sp.fill ? `<fill><patternFill patternType="solid"><fgColor rgb="${rgb(sp.fill)}"/><bgColor rgb="${rgb(sp.fill)}"/></patternFill></fill>` : ""}</dxf>`;
    return this.idx(this.dxfs, xml);
  }

  private stylesXml() {
    const nf = [...this.fmts].map(([code, id]) => `<numFmt numFmtId="${id}" formatCode="${esc(code)}"/>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
${nf ? `<numFmts count="${this.fmts.size}">${nf}</numFmts>` : ""}
<fonts count="${this.fonts.length}">${this.fonts.join("")}</fonts>
<fills count="${this.fills.length}">${this.fills.join("")}</fills>
<borders count="${this.borders.length}">${this.borders.join("")}</borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="${this.xfs.length}">${this.xfs.join("")}</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
<dxfs count="${this.dxfs.length}">${this.dxfs.join("")}</dxfs>
<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`;
  }

  private sheetXml(sh: SheetDef, hasLogo: boolean, tableRelIds: string[]) {
    const rows = sh.rows.map((r, ri) => {
      const cells = r.cells.map((c, ci) => {
        if (!c) return "";
        const ref = `${colName(ci)}${ri + 1}`;
        const st = c.st ? ` s="${c.st}"` : "";
        if ("s" in c) return c.s === "" && c.st ? `<c r="${ref}"${st}/>` : `<c r="${ref}"${st} t="inlineStr"><is><t xml:space="preserve">${esc(c.s)}</t></is></c>`;
        if ("f" in c) {
          const isText = typeof c.v === "string";
          return `<c r="${ref}"${st}${isText ? ` t="str"` : ""}><f>${esc(c.f)}</f><v>${isText ? esc(c.v as string) : Number.isFinite(c.v as number) ? c.v ?? 0 : 0}</v></c>`;
        }
        return `<c r="${ref}"${st}><v>${Number.isFinite(c.n) ? c.n : 0}</v></c>`;
      }).join("");
      const ht = r.height ? ` ht="${r.height}" customHeight="1"` : "";
      return `<row r="${ri + 1}"${ht}>${cells}</row>`;
    }).join("");
    const pane = sh.freezeRow
      ? `<pane ySplit="${sh.freezeRow}" topLeftCell="A${sh.freezeRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${sh.freezeRow + 1}" sqref="A${sh.freezeRow + 1}"/>`
      : "";
    const dv = (sh.validations ?? []).map((v) => {
      if (v.type === "list") {
        const inline = `"${v.list.join(",").replace(/"/g, "")}"`;
        return `<dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="${v.sqref}"${v.prompt ? ` promptTitle="Pick one" prompt="${esc(v.prompt)}"` : ""}><formula1>${esc(inline)}</formula1></dataValidation>`;
      }
      return `<dataValidation type="${v.type}" operator="${v.max === undefined ? "greaterThanOrEqual" : "between"}" allowBlank="1" showErrorMessage="1" errorTitle="Number needed" error="Enter a number." sqref="${v.sqref}"><formula1>${v.min}</formula1>${v.max !== undefined ? `<formula2>${v.max}</formula2>` : ""}</dataValidation>`;
    }).join("");
    let prio = 1;
    const cf = (sh.cfs ?? []).map((c) =>
      `<conditionalFormatting sqref="${c.sqref}">${c.rules.map((r) =>
        r.kind === "equal"
          ? `<cfRule type="cellIs" dxfId="${r.dxf}" priority="${prio++}" operator="equal"><formula>${esc(r.value)}</formula></cfRule>`
          : `<cfRule type="expression" dxfId="${r.dxf}" priority="${prio++}"><formula>${esc(r.formula)}</formula></cfRule>`).join("")}</conditionalFormatting>`).join("");
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<sheetPr>${sh.tabColor ? `<tabColor rgb="${rgb(sh.tabColor)}"/>` : ""}<pageSetUpPr fitToPage="1"/></sheetPr>
<sheetViews><sheetView workbookViewId="0" showGridLines="0">${pane}</sheetView></sheetViews>
<sheetFormatPr defaultRowHeight="18"/>
<cols>${sh.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join("")}</cols>
<sheetData>${rows}</sheetData>
${sh.merges?.length ? `<mergeCells count="${sh.merges.length}">${sh.merges.map((m) => `<mergeCell ref="${m}"/>`).join("")}</mergeCells>` : ""}
${cf}
${dv ? `<dataValidations count="${(sh.validations ?? []).length}">${dv}</dataValidations>` : ""}
<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
<pageSetup orientation="${sh.landscape ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/>
<headerFooter><oddFooter>&amp;L&amp;8${esc(sh.name.replace(/&/g, "&&"))}&amp;R&amp;8Page &amp;P of &amp;N</oddFooter></headerFooter>
${hasLogo ? `<drawing r:id="rId1"/>` : ""}
${tableRelIds.length ? `<tableParts count="${tableRelIds.length}">${tableRelIds.map((id) => `<tablePart r:id="${id}"/>`).join("")}</tableParts>` : ""}
</worksheet>`;
  }

  async build(opts: { company: string; logo?: string; logoMaxW?: number; logoMaxH?: number }): Promise<Blob> {
    const { zipSync, strToU8 } = await import("fflate");
    const logo = await loadLogo(opts.logo);
    const files: Record<string, Uint8Array> = {};
    const ct: string[] = [];
    const wbSheets: string[] = [];
    const wbRels: string[] = [];
    const defined: string[] = [];
    let tableNo = 0;

    this.sheets.forEach((sh, i) => {
      const n = i + 1;
      const hasLogo = !!logo && !!sh.logoRows;
      const rels: string[] = [];
      let relNo = 1;
      if (hasLogo) rels.push(`<Relationship Id="rId${relNo++}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/>`);
      const tableRelIds: string[] = [];
      for (const t of sh.tables ?? []) {
        tableNo++;
        const rid = `rId${relNo++}`;
        tableRelIds.push(rid);
        rels.push(`<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/table" Target="../tables/table${tableNo}.xml"/>`);
        const first = t.firstCol, last = t.firstCol + t.columns.length - 1;
        const top = t.headRow, bottom = t.headRow + t.rows + (t.totals ? 1 : 0);
        const cols = t.columns.map((c, k) => {
          const tot = c.total === "label" ? ` totalsRowLabel="${esc(c.totalLabel ?? "Total")}"` : c.total ? ` totalsRowFunction="${c.total}"` : "";
          const calc = c.calc ? `<calculatedColumnFormula>${esc(c.calc)}</calculatedColumnFormula>` : "";
          return `<tableColumn id="${k + 1}" name="${esc(c.name)}"${tot}>${calc}</tableColumn>`;
        }).join("");
        files[`xl/tables/table${tableNo}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<table xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" id="${tableNo}" name="${t.name}" displayName="${t.name}" ref="${colName(first)}${top}:${colName(last)}${bottom}"${t.totals ? ` totalsRowCount="1"` : ` totalsRowShown="0"`}>
<autoFilter ref="${colName(first)}${top}:${colName(last)}${top + t.rows}"/>
<tableColumns count="${t.columns.length}">${cols}</tableColumns>
<tableStyleInfo showFirstColumn="0" showLastColumn="0" showRowStripes="0" showColumnStripes="0"/>
</table>`);
        ct.push(`<Override PartName="/xl/tables/table${tableNo}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`);
      }
      files[`xl/worksheets/sheet${n}.xml`] = strToU8(this.sheetXml(sh, hasLogo, tableRelIds));
      if (rels.length) {
        files[`xl/worksheets/_rels/sheet${n}.xml.rels`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`);
      }
      ct.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
      wbSheets.push(`<sheet name="${esc(sh.name)}" sheetId="${n}" r:id="rId${n}"/>`);
      wbRels.push(`<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${n}.xml"/>`);
      if (sh.printTitleRow) defined.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${esc(`'${sh.name.replace(/'/g, "''")}'!${sh.printTitleRow}:${sh.printTitleRow}`)}</definedName>`);

      if (hasLogo && logo) {
        const r = Math.min((opts.logoMaxW ?? 220) / logo.width, (opts.logoMaxH ?? 60) / logo.height);
        const cx = Math.round(logo.width * r * 9525), cy = Math.round(logo.height * r * 9525);
        files[`xl/drawings/_rels/drawing${n}.xml.rels`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/></Relationships>`);
        files[`xl/drawings/drawing${n}.xml`] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:oneCellAnchor>
<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>57150</xdr:rowOff></xdr:from>
<xdr:ext cx="${cx}" cy="${cy}"/>
<xdr:pic>
<xdr:nvPicPr><xdr:cNvPr id="2" name="Logo" descr="${esc(opts.company)} logo"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>
<xdr:blipFill><a:blip r:embed="rId1"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>
<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>
</xdr:pic>
<xdr:clientData/>
</xdr:oneCellAnchor>
</xdr:wsDr>`);
        ct.push(`<Override PartName="/xl/drawings/drawing${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
      }
    });

    if (logo) {
      const b64 = logo.dataUrl.slice(logo.dataUrl.indexOf(",") + 1);
      files["xl/media/image1.png"] = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    }
    const sn = this.sheets.length;
    files["[Content_Types].xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Default Extension="png" ContentType="image/png"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${ct.join("\n")}
</Types>`);
    files["_rels/.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    files["xl/workbook.xml"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<bookViews><workbookView/></bookViews>
<sheets>${wbSheets.join("")}</sheets>
${defined.length ? `<definedNames>${defined.join("")}</definedNames>` : ""}
<calcPr calcId="191029" fullCalcOnLoad="1"/>
</workbook>`);
    files["xl/_rels/workbook.xml.rels"] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${wbRels.join("")}<Relationship Id="rId${sn + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    files["xl/styles.xml"] = strToU8(this.stylesXml());
    return new Blob([zipSync(files, { level: 6 }) as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
}
