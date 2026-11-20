// Pay and overtime logic, run on the real code: an hourly and a salaried worker through the overtime
// engine and the CSV / Gusto payroll exports. No server needed.
//   node .claude/skills/field-testing/scripts/pay-logic.mjs        (from the repo root)
import { createRequire } from "module";
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

const require = createRequire(import.meta.url);
const ts = require("typescript");
const out = path.resolve(".tmp-paytest");
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out);
for (const f of ["overtime", "hours", "payroll-export"]) {
  let js = ts.transpileModule(fs.readFileSync(`lib/${f}.ts`, "utf8"), { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
  js = js.replace(/from "\.\/([a-z-]+)"/g, 'from "./$1.js"').replace(/from "@\/lib\/native"/g, 'from "./native-stub.js"');
  fs.writeFileSync(path.join(out, f + ".js"), js);
}
fs.writeFileSync(path.join(out, "native-stub.js"), "export const saveFile = async (blob) => { globalThis.__saved = await blob.text(); };\n");
fs.writeFileSync(path.join(out, "package.json"), '{"type":"module"}');
const { workerOvertime } = await import(pathToFileURL(path.join(out, "overtime.js")).href);
const P = await import(pathToFileURL(path.join(out, "payroll-export.js")).href);

const day = (d, h0, h1, who) => ({ id: who + d, workerId: who, projectId: "p", clockIn: new Date(2026, 10, d, h0), clockOut: new Date(2026, 10, d, h1) });
// Mon-Fri, 10 hours a day = 50 hours: overtime for an hourly worker under a 40 hour weekly rule
const mk = (who) => [2, 3, 4, 5, 6].map((d) => day(d, 7, 17, who));
const hourly = { id: "h", name: "Hal Hourly", email: "h@x", role: "Worker", customRole: "Carpenter", hourlyRate: 30 };
const salary = { id: "s", name: "Sal Salary", email: "s@x", role: "Foreman", customRole: "Site lead", hourlyRate: 45, payType: "salary" };
const settings = { enabled: true, dailyThreshold: null, weeklyThreshold: 40, multiplier: 1.5, rules: undefined };

let fails = 0;
const ok = (name, cond, note = "") => { console.log((cond ? "PASS  " : "FAIL  ") + name + (cond ? "" : "  [" + note + "]")); if (!cond) fails++; };

const H = workerOvertime(hourly, mk("h"), settings), S = workerOvertime(salary, mk("s"), settings);
ok("hourly: 50 hours is 40 regular + 10 overtime", H.regularHours === 40 && H.overtimeHours === 10, JSON.stringify(H));
ok("hourly: pay is 40x30 + 10x30x1.5", H.totalPay === 1650, String(H.totalPay));
ok("salary: all 50 hours are tracked, none is overtime", S.regularHours === 50 && S.overtimeHours === 0, JSON.stringify(S));
ok("salary: no pay is worked out from hours", S.totalPay === 0, String(S.totalPay));
ok("no payType behaves exactly like hourly (before migration 020)", JSON.stringify(workerOvertime({ ...hourly, payType: undefined }, mk("h"), settings)) === JSON.stringify(H));
ok("salary stays exempt even with custom rules", workerOvertime(salary, mk("s"), { ...settings, rules: [{ kind: "after", per: "day", after: 8, multiplier: 2 }] }).overtimeHours === 0);
ok("overtime switched off: hourly worker unchanged", workerOvertime(hourly, mk("h"), { ...settings, enabled: false }).overtimeHours === 0);

const exportAs = async (id) => {
  P.exportPayroll(id, [...mk("h"), ...mk("s")], [hourly, salary], [{ id: "p", name: "Job" }], new Date(2026, 10, 1), new Date(2026, 10, 30), "Nov 2026", settings);
  await new Promise((r) => setTimeout(r, 50));
  return (globalThis.__saved ?? "").split("\n");
};
const lines = await exportAs("csv");
const sal = lines.filter((l) => l.startsWith("Sal Salary") && l.split(",").length >= 10);
const hal = lines.filter((l) => l.startsWith("Hal Hourly") && l.split(",").length >= 10);
ok("CSV: salaried rows say Salary and carry no gross", sal.length === 5 && sal.every((l) => l.split(",")[8] === "Salary" && l.split(",")[9] === ""), sal[0]);
ok("CSV: hourly rows carry rate 30 and gross 300 a day", hal.length === 5 && hal.every((l) => l.split(",")[8] === "30" && l.split(",")[9] === "300"), hal[0]);
const ot = lines.filter((l) => l.startsWith("Sal Salary") && l.split(",").length === 7);
ok("CSV overtime section: salaried is 50 regular, 0 overtime, no pay", ot.length === 1 && ot[0].split(",")[2] === "50" && ot[0].split(",")[3] === "0" && ot[0].split(",")[6] === "0", ot[0]);
const oth = lines.filter((l) => l.startsWith("Hal Hourly") && l.split(",").length === 7);
ok("CSV overtime section: hourly is 40 regular, 10 overtime, 1650 pay", oth.length === 1 && oth[0].split(",")[2] === "40" && oth[0].split(",")[3] === "10" && oth[0].split(",")[6] === "1650", oth[0]);

const g = await exportAs("gusto");
ok("Gusto: salaried hours listed as Regular with no Overtime row", g.some((l) => l.startsWith("Sal Salary,50.00,Regular")) && !g.some((l) => l.startsWith("Sal Salary") && l.includes("Overtime")), g.filter((l) => l.includes("Sal")).join(" | "));
ok("Gusto: hourly gets Regular 40 and Overtime 10", g.some((l) => l.startsWith("Hal Hourly,40.00,Regular")) && g.some((l) => l.startsWith("Hal Hourly,10.00,Overtime")));

fs.rmSync(out, { recursive: true, force: true });
console.log(fails ? `${fails} failed` : "all passed");
process.exit(fails ? 1 : 0);
