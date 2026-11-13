import type { Template } from "./excel-templates";

// Calculates a template's formulas on screen, so someone typing into a sheet sees the totals,
// balances and statuses change as they go. It reads the same formula text that goes into the
// Excel file (the Excel Table form, e.g. Payments[[#This Row],[Paid]]), so the screen and the
// downloaded file always agree. Only the handful of functions the templates use are supported.

export type Val = number | string | null;
type Tok = { t: "num" | "str" | "op" | "fn" | "id" | "row" | "range" | "col"; v: string; a?: string; b?: string };

class CalcError extends Error {}

/** Excel's serial day for a yyyy-mm-dd date */
export function isoToSerial(iso: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86_400_000) + 25569;
}
export function serialToIso(n: number): string {
  const d = new Date(Math.round((n - 25569) * 86_400_000));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
export function todaySerial(): number {
  const d = new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000) + 25569;
}

function tokenize(src: string, table: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '"') {
      let s = ""; i++;
      while (i < src.length) { if (src[i] === '"') { if (src[i + 1] === '"') { s += '"'; i += 2; continue; } break; } s += src[i++]; }
      i++; out.push({ t: "str", v: s }); continue;
    }
    if (/\d/.test(ch) || (ch === "." && /\d/.test(src[i + 1] ?? ""))) {
      const m = /^\d*\.?\d+(?:[eE][+-]?\d+)?/.exec(src.slice(i))!; out.push({ t: "num", v: m[0] }); i += m[0].length; continue;
    }
    if (src.startsWith(table + "[", i)) {
      // a table reference: balanced brackets
      let j = i + table.length, depth = 0;
      const start = j;
      for (; j < src.length; j++) { if (src[j] === "[") depth++; else if (src[j] === "]") { depth--; if (depth === 0) { j++; break; } } }
      const body = src.slice(start, j);
      const names = [...body.matchAll(/\[([^\[\]#]+)\]/g)].map((m) => m[1]);
      if (/#This Row/.test(body)) out.push(body.includes("]:[") && names.length === 2 ? { t: "range", v: "", a: names[0], b: names[1] } : { t: "row", v: names[0] });
      else out.push({ t: "col", v: names[0] });
      i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(src.slice(i))!;
      i += m[0].length;
      let k = i; while (src[k] === " ") k++;
      out.push({ t: src[k] === "(" ? "fn" : "id", v: m[0] }); continue;
    }
    const two = src.slice(i, i + 2);
    if (two === "<=" || two === ">=" || two === "<>") { out.push({ t: "op", v: two }); i += 2; continue; }
    out.push({ t: "op", v: ch }); i++;
  }
  return out;
}

export type Env = {
  /** this row's values by column label */
  row: Record<string, Val>;
  /** every row's values for a column label */
  col: (label: string) => Val[];
  rowIndex: number;
  setting: (key: string) => number;
  result: (i: number) => number;
};

type Node =
  | { k: "num"; v: number } | { k: "str"; v: string } | { k: "bin"; op: string; l: Node; r: Node } | { k: "neg"; x: Node }
  | { k: "fn"; name: string; args: Node[] } | { k: "ref"; ref: Tok };

function parse(toks: Tok[]): Node {
  let p = 0;
  const peek = () => toks[p];
  const eatOp = (v: string) => { if (toks[p]?.t === "op" && toks[p].v === v) { p++; return true; } return false; };
  const cmp = (): Node => {
    let l = add();
    while (toks[p]?.t === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(toks[p].v)) { const op = toks[p++].v; l = { k: "bin", op, l, r: add() }; }
    return l;
  };
  const add = (): Node => {
    let l = mul();
    while (toks[p]?.t === "op" && (toks[p].v === "+" || toks[p].v === "-" || toks[p].v === "&")) { const op = toks[p++].v; l = { k: "bin", op, l, r: mul() }; }
    return l;
  };
  const mul = (): Node => {
    let l = unary();
    while (toks[p]?.t === "op" && (toks[p].v === "*" || toks[p].v === "/")) { const op = toks[p++].v; l = { k: "bin", op, l, r: unary() }; }
    return l;
  };
  const unary = (): Node => (eatOp("-") ? { k: "neg", x: unary() } : (eatOp("+"), primary()));
  const primary = (): Node => {
    const t = peek();
    if (!t) throw new CalcError("end");
    if (t.t === "num") { p++; return { k: "num", v: parseFloat(t.v) }; }
    if (t.t === "str") { p++; return { k: "str", v: t.v }; }
    if (t.t === "row" || t.t === "range" || t.t === "col" || t.t === "id") { p++; return { k: "ref", ref: t }; }
    if (t.t === "fn") {
      p++; eatOp("(");
      const args: Node[] = [];
      if (!eatOp(")")) { do { args.push(cmp()); } while (eatOp(",")); eatOp(")"); }
      return { k: "fn", name: t.v.toUpperCase(), args };
    }
    if (eatOp("(")) { const e = cmp(); eatOp(")"); return e; }
    throw new CalcError("unexpected " + t.v);
  };
  const root = cmp();
  return root;
}

const blank = (v: Val | undefined) => v === null || v === undefined || v === "";
const num = (v: Val): number => {
  if (blank(v)) return 0;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v));
  if (!Number.isFinite(n) || String(v).trim() === "") throw new CalcError("value");
  return n;
};
const truthy = (v: Val) => (typeof v === "number" ? v !== 0 : !blank(v));

function ev(n: Node, env: Env, today: number): Val | Val[] {
  switch (n.k) {
    case "num": return n.v;
    case "str": return n.v;
    case "neg": return -num(ev(n.x, env, today) as Val);
    case "ref": {
      const r = n.ref;
      if (r.t === "row") return env.row[r.v] ?? null;
      if (r.t === "col") return env.col(r.v);
      if (r.t === "range") {
        const labels = Object.keys(env.row); const a = labels.indexOf(r.a!), b = labels.indexOf(r.b!);
        return labels.slice(Math.min(a, b), Math.max(a, b) + 1).map((l) => env.row[l]);
      }
      const id = r.v;
      if (id === "TRUE") return 1; if (id === "FALSE") return 0;
      if (id.startsWith("SETTING_")) return env.setting(id.slice(8));
      if (id.startsWith("RESULT_")) return env.result(+id.slice(7));
      throw new CalcError("name " + id);
    }
    case "bin": {
      const l = ev(n.l, env, today) as Val, r = ev(n.r, env, today) as Val;
      switch (n.op) {
        case "+": return num(l) + num(r);
        case "-": return num(l) - num(r);
        case "*": return num(l) * num(r);
        case "/": { const d = num(r); if (d === 0) throw new CalcError("div0"); return num(l) / d; }
        case "&": return String(blank(l) ? "" : l) + String(blank(r) ? "" : r);
        default: {
          let a: Val = l, b: Val = r;
          if (a === null) a = typeof b === "number" ? 0 : "";
          if (b === null) b = typeof a === "number" ? 0 : "";
          let c: number;
          if (typeof a === "number" && typeof b === "number") c = a - b;
          else if (typeof a === "string" && typeof b === "string") { const x = a.toLowerCase(), y = b.toLowerCase(); c = x < y ? -1 : x > y ? 1 : 0; }
          else c = typeof a === "string" ? 1 : -1; // text sorts after numbers, and is never equal to one
          if (n.op === "=") return c === 0 ? 1 : 0;
          if (n.op === "<>") return c !== 0 ? 1 : 0;
          if (n.op === "<") return c < 0 ? 1 : 0;
          if (n.op === ">") return c > 0 ? 1 : 0;
          if (n.op === "<=") return c <= 0 ? 1 : 0;
          return c >= 0 ? 1 : 0;
        }
      }
    }
    case "fn": {
      const a = n.args;
      const nums = (): number[] => a.flatMap((x) => { const v = ev(x, env, today); const arr = Array.isArray(v) ? v : [v]; return arr.filter((q): q is number => typeof q === "number"); });
      switch (n.name) {
        case "IF": return truthy(ev(a[0], env, today) as Val) ? (ev(a[1], env, today) as Val) : a[2] ? (ev(a[2], env, today) as Val) : 0;
        case "AND": return a.every((x) => truthy(ev(x, env, today) as Val)) ? 1 : 0;
        case "OR": return a.some((x) => truthy(ev(x, env, today) as Val)) ? 1 : 0;
        case "SUM": return nums().reduce((s, v) => s + v, 0);
        case "MIN": { const v = nums(); return v.length ? Math.min(...v) : 0; }
        case "MAX": { const v = nums(); return v.length ? Math.max(...v) : 0; }
        case "COUNT": return nums().length;
        case "ROUND": return Math.round(num(ev(a[0], env, today) as Val) * 10 ** num(ev(a[1], env, today) as Val)) / 10 ** num(ev(a[1], env, today) as Val);
        case "ABS": return Math.abs(num(ev(a[0], env, today) as Val));
        case "TODAY": return today;
        case "SUBTOTAL": {
          const fn = num(ev(a[0], env, today) as Val);
          const arr = ev(a[1], env, today); const vals = (Array.isArray(arr) ? arr : [arr]);
          const ns = vals.filter((q): q is number => typeof q === "number");
          if (fn === 103) return vals.filter((q) => !blank(q)).length;
          if (fn === 101) return ns.length ? ns.reduce((s, v) => s + v, 0) / ns.length : 0;
          return ns.reduce((s, v) => s + v, 0);
        }
        case "RUNCOL": {
          const label = String((ev(a[0], env, today) as Val) ?? "");
          return env.col(label).slice(0, env.rowIndex + 1).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);
        }
        default: throw new CalcError("fn " + n.name);
      }
    }
  }
}

/** Evaluates one formula; anything that would be an Excel error shows as blank */
export function evaluate(formula: string, table: string, env: Env, today = todaySerial()): Val {
  try {
    // a running total written for Excel as SUM(INDEX(T[Col],1):T[[#This Row],[Col]])
    const f = formula.replace(new RegExp(`INDEX\\(${table}\\[([^\\]]+)\\],1\\):${table}\\[\\[#This Row\\],\\[[^\\]]+\\]\\]`, "g"), 'RUNCOL("$1")');
    const v = ev(parse(tokenize(f, table)), env, today);
    return Array.isArray(v) ? null : v;
  } catch {
    return "";
  }
}

// ── A whole sheet ────────────────────────────────────────────────────────────────

export type RawRow = Record<string, string>;
export type SheetView = {
  /** value per row per column key */
  values: Val[][];
  totals: (Val | undefined)[];
  results: number[];
};

type ColLike = { key: string; label: string; kind: string; total?: string; calc?: unknown };

/** What a typed value is, as the formulas see it (dates as serial days, percentages as fractions) */
export function typed(kind: string, raw: string | undefined): Val {
  const s = (raw ?? "").trim();
  if (!s) return null; // an empty cell
  if (kind === "date") return isoToSerial(s);
  if (kind === "money" || kind === "num" || kind === "int") { const n = parseFloat(s.replace(/,/g, "")); return Number.isFinite(n) ? n : null; }
  if (kind === "pct") { const n = parseFloat(s.replace(/[%,]/g, "")); return Number.isFinite(n) ? n / 100 : null; }
  return s;
}

export function computeSheet(
  tpl: Template, rows: RawRow[], settings: Record<string, string>,
  formulaFor: (colKey: string) => string, resultFormulas: (prev: string[]) => string[],
): SheetView {
  const cols = tpl.cols as ColLike[];
  const T = tpl.tableName;
  const values: Val[][] = rows.map(() => cols.map(() => null as Val));
  const settingVal = (key: string): number => {
    const def = tpl.settings?.find((x) => x.key === key);
    if (settings[key] === undefined) return def?.value ?? 0;
    const v = typed(def?.kind === "pct" ? "pct" : "num", settings[key]);
    return typeof v === "number" ? v : 0;
  };

  cols.forEach((c, ci) => {
    rows.forEach((r, ri) => {
      if (!c.calc) { values[ri][ci] = typed(c.kind, r[c.key]); return; }
      const rowByLabel: Record<string, Val> = {};
      cols.forEach((cc, k) => { rowByLabel[cc.label] = values[ri][k]; });
      const env: Env = {
        row: rowByLabel, rowIndex: ri, setting: settingVal, result: () => 0,
        col: (label) => { const k = cols.findIndex((x) => x.label === label); return values.map((rv) => rv[k]); },
      };
      values[ri][ci] = evaluate(formulaFor(c.key), T, env);
    });
  });

  const colArr = (label: string) => { const k = cols.findIndex((x) => x.label === label); return values.map((rv) => rv[k]); };
  const totals = cols.map((c, ci) => {
    if (!c.total) return undefined;
    const col = values.map((rv) => rv[ci]);
    const ns = col.filter((q): q is number => typeof q === "number");
    if (c.total === "count") return col.filter((q) => !blank(q)).length;
    if (c.total === "average") return ns.length ? ns.reduce((s, v) => s + v, 0) / ns.length : 0;
    return ns.reduce((s, v) => s + v, 0);
  });

  const results: number[] = [];
  const names = (tpl.results ?? []).map((_, i) => `RESULT_${i}`);
  const resEnv: Env = { row: {}, rowIndex: 0, setting: settingVal, result: (i) => results[i] ?? 0, col: colArr };
  resultFormulas(names).forEach((f, i) => { const v = evaluate(f, T, resEnv); results[i] = typeof v === "number" ? v : 0; });
  return { values, totals, results };
}

/** A value as it reads on screen and on paper */
export function formatVal(kind: string, v: Val | undefined, currency: string): string {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string") return v;
  if (kind === "money") return new Intl.NumberFormat("en-CA", { style: "currency", currency: currency || "CAD" }).format(v);
  if (kind === "pct") return (Math.round(v * 1000) / 10).toLocaleString("en-CA", { maximumFractionDigits: 1 }) + "%";
  if (kind === "int") return Math.round(v).toLocaleString("en-CA");
  if (kind === "date") return new Date(Math.round((v - 25569) * 86_400_000)).toLocaleDateString("en-CA", { dateStyle: "medium", timeZone: "UTC" });
  return v.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
