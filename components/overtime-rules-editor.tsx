"use client";

// Overtime rules as a short list of plain sentences: "Pay 1.5× after 8 hours a day".
// Pick a ready-made set to start, then change anything. Rows keep their numbers as text while
// typing so a half-typed value never turns into odd pay; the page cleans them when it saves.

import { Plus, Trash2 } from "lucide-react";
import { OVERTIME_PRESETS, cleanRules, describeRules, type OvertimeRule } from "@/lib/overtime";

export type DraftRule =
  | { kind: "after"; per: "day" | "week"; after: string; mult: string }
  | { kind: "days"; days: number[]; mult: string };

export const toDrafts = (rules: OvertimeRule[]): DraftRule[] =>
  rules.map((r): DraftRule => (r.kind === "after"
    ? { kind: "after", per: r.per, after: String(r.after), mult: String(r.multiplier) }
    : { kind: "days", days: [...r.days], mult: String(r.multiplier) }));

export const fromDrafts = (drafts: DraftRule[]): OvertimeRule[] =>
  cleanRules(drafts.map((d): OvertimeRule => (d.kind === "after"
    ? { kind: "after", per: d.per, after: parseFloat(d.after), multiplier: parseFloat(d.mult) }
    : { kind: "days", days: d.days, multiplier: parseFloat(d.mult) })));

const inp = "bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 py-2 text-[14px] text-white outline-none focus:border-amber-500/40 transition-colors text-center";
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function OvertimeRulesEditor({ rules, onChange }: { rules: DraftRule[]; onChange: (r: DraftRule[]) => void }) {
  const set = (i: number, patch: Partial<DraftRule>) => onChange(rules.map((r, j) => (j === i ? ({ ...r, ...patch } as DraftRule) : r)));
  const clean = fromDrafts(rules);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-semibold text-white/40 uppercase tracking-wide mb-2">Start from a ready-made set</p>
        <div className="flex flex-wrap gap-2">
          {OVERTIME_PRESETS.map((p) => (
            <button key={p.id} type="button" title={p.where} onClick={() => onChange(toDrafts(p.rules))}
              className="min-h-[40px] px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.1] text-[12px] font-semibold text-white/75 transition-colors">
              {p.name}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-white/30 mt-2">These are common starting points, not legal advice. Laws and contracts differ by place and trade, so check yours and change anything below.</p>
      </div>

      <div className="space-y-2" role="list" aria-label="Your overtime rules">
        {rules.length === 0 && <p className="text-[12px] text-white/40 py-2">No rules yet, so everything is paid at the regular rate. Pick a set above or add your own.</p>}
        {rules.map((r, i) => (
          <div key={i} role="listitem" className="flex flex-wrap items-center gap-2 bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2.5">
            <span className="text-[13px] text-white/60">Pay</span>
            <input aria-label="Pay multiplier" className={`${inp} w-[68px]`} type="number" inputMode="decimal" min="1" step="0.25" value={r.mult} onChange={(e) => set(i, { mult: e.target.value })} />
            <span className="text-[13px] text-white/60">×</span>
            {r.kind === "after" ? (
              <>
                <span className="text-[13px] text-white/60">after</span>
                <input aria-label="After how many hours" className={`${inp} w-[68px]`} type="number" inputMode="decimal" min="0.5" step="0.5" value={r.after} onChange={(e) => set(i, { after: e.target.value })} />
                <span className="text-[13px] text-white/60">hours a</span>
                <select aria-label="Day or week" className={`${inp} text-left`} value={r.per} onChange={(e) => set(i, { per: e.target.value as "day" | "week" })}>
                  <option value="day">day</option>
                  <option value="week">week</option>
                </select>
              </>
            ) : (
              <>
                <span className="text-[13px] text-white/60">on</span>
                <div className="flex gap-1" role="group" aria-label="Which days">
                  {DAYS.map((d, n) => {
                    const on = r.days.includes(n);
                    return (
                      <button key={n} type="button" aria-pressed={on} aria-label={DAY_FULL[n]}
                        onClick={() => set(i, { days: on ? r.days.filter((x) => x !== n) : [...r.days, n].sort() })}
                        className={`w-9 h-9 rounded-full text-[12px] font-bold transition-colors ${on ? "bg-amber-500 text-black" : "bg-white/[0.06] text-white/50"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <button type="button" aria-label="Remove this rule" onClick={() => onChange(rules.filter((_, j) => j !== i))}
              className="ml-auto min-w-[40px] min-h-[40px] inline-flex items-center justify-center rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => onChange([...rules, { kind: "after", per: "day", after: "8", mult: "1.5" }])}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-full border border-white/[0.1] text-[12px] font-semibold text-white/70 hover:bg-white/[0.06] transition-colors">
          <Plus size={13} /> Add &ldquo;after X hours&rdquo;
        </button>
        <button type="button" onClick={() => onChange([...rules, { kind: "days", days: [0, 6], mult: "2" }])}
          className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-full border border-white/[0.1] text-[12px] font-semibold text-white/70 hover:bg-white/[0.06] transition-colors">
          <Plus size={13} /> Add &ldquo;certain days&rdquo;
        </button>
      </div>

      {clean.length > 0 && <p className="text-[11px] text-white/45">In short: {describeRules(clean)}. Hours past a rule&rsquo;s limit are paid at its rate, and the highest rate that applies wins.</p>}
    </div>
  );
}
