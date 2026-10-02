"use client";

import { useId, useState } from "react";

// Visitor-driven estimate of what time paperwork costs a crew. Every input is theirs;
// the only fixed assumption (working days per month) is printed under the result.
const WORK_DAYS = 21.7;

function Slider({ label, value, min, max, step, onChange, format }: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format: (v: number) => string;
}) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="lp-calc-row">
      <div className="lp-calc-label">
        <label htmlFor={id}>{label}</label>
        <output htmlFor={id}>{format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ["--pct" as string]: `${pct}%` }}
      />
    </div>
  );
}

export default function SavingsCalc() {
  const [crew, setCrew] = useState(12);
  const [rate, setRate] = useState(34);
  const [mins, setMins] = useState(15);

  const hoursMonth = (crew * mins * WORK_DAYS) / 60;
  const costMonth = hoursMonth * rate;
  const money = (v: number) => v.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });

  return (
    <section className="lp-calc" aria-labelledby="calc-title">
      <div className="lp-wrap lp-calc-grid">
        <div>
          <p className="lp-kicker">Run your numbers</p>
          <h2 id="calc-title" className="lp-h2">What paperwork<br />costs your crew.</h2>
          <p className="lp-section-note">
            Writing up timesheets, chasing missing hours, re-typing them for payroll. Move the sliders to match your crew and see what those minutes add up to.
          </p>
        </div>

        <div className="lp-calc-card">
          <Slider label="People on your crew" value={crew} min={1} max={150} step={1} onChange={setCrew} format={(v) => String(v)} />
          <Slider label="Average hourly wage" value={rate} min={18} max={90} step={1} onChange={setRate} format={(v) => `$${v}/h`} />
          <Slider label="Minutes per person, per day, on paperwork" value={mins} min={0} max={60} step={5} onChange={setMins} format={(v) => `${v} min`} />

          <div className="lp-calc-out" aria-live="polite">
            <div>
              <span className="lp-mono">Paid hours a month</span>
              <b>{Math.round(hoursMonth).toLocaleString("en-CA")} h</b>
            </div>
            <div className="lp-calc-big">
              <span className="lp-mono">Wages a month</span>
              <b>{money(costMonth)}</b>
            </div>
          </div>
          <p className="lp-calc-foot lp-mono">
            Your estimate: crew × minutes × {WORK_DAYS} work days × wage. {money(costMonth * 12)} a year.
          </p>
        </div>
      </div>
    </section>
  );
}
