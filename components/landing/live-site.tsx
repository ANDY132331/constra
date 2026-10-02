"use client";

import { useCallback, useEffect, useState } from "react";
import { Pause, Play, MapPin, Camera, HardHat, FileText, AlertTriangle, Receipt, Users } from "lucide-react";
import SiteScene from "./site-scene";

// Day runs 6:30 AM → 5:30 PM across the loop
const DAY_START = 6.5 * 60;
const DAY_LEN = 11 * 60;
const REDUCED_AT = 0.8;

const EVENTS = [
  { at: 0.045, icon: MapPin, title: "Marco R. clocked in", meta: "38 m from site · photo verified", tone: "go" },
  { at: 0.16, icon: Users, title: "6 crew on site", meta: "Dundas St. Reno · all inside the fence", tone: "go" },
  { at: 0.3, icon: HardHat, title: "Level 4 steel going up", meta: "Crane lift logged · 14 columns", tone: "" },
  { at: 0.44, icon: Camera, title: "Photo added", meta: "Rebar inspection, grid C-4", tone: "" },
  { at: 0.55, icon: AlertTriangle, title: "Near miss logged", meta: "Swing zone taped off · foreman notified", tone: "warn" },
  { at: 0.79, icon: FileText, title: "Daily report sent", meta: "Weather, crew, deck pour, 9 photos", tone: "" },
  { at: 0.96, icon: Receipt, title: "Payroll ready · INV-0143 drafted", meta: "51.5 crew hours · $12,860.00", tone: "go" },
] as const;

function clockLabel(p: number) {
  const mins = Math.round((DAY_START + p * DAY_LEN) / 5) * 5;
  const h = Math.floor(mins / 60), m = mins % 60;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

export default function LiveSite() {
  const [reduce, setReduce] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [p, setP] = useState(0);
  const [failed, setFailed] = useState(false);

  // Read the motion preference after hydration; reduced motion starts paused late in the day
  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (r) { setReduce(true); setPlaying(false); setP(REDUCED_AT); }
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Throttle React updates to visible changes (5-minute clock steps)
  const onProgress = useCallback((v: number) => setP((prev) => (Math.abs(prev - v) >= 0.004 || v === 0 || v === 1 ? v : prev)), []);
  const onReady = useCallback((ok: boolean) => { if (!ok) setFailed(true); }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (failed) setP(1); }, [failed]);

  const shown = EVENTS.filter((e) => p >= e.at);
  const latest = shown.length - 1;

  return (
    <section className="lp-sitecam" aria-labelledby="live-title">
      <div className="lp-wrap lp-live-head">
        <div>
          <p className="lp-kicker lp-kicker-inv">Live site view</p>
          <h2 id="live-title" className="lp-h2">Watch a whole day<br />land in your pocket.</h2>
        </div>
        <p className="lp-section-note">
          Every punch, lift, photo and report shows up the moment it happens, so the office knows what the site knows. Here&apos;s one day, sped up.
        </p>
      </div>

      <div className="lp-wrap">
        <div className={`lp-stage3d${failed ? " lp-stage3d-flat" : ""}`}>
          {!failed && mounted && <SiteScene playing={playing} initialProgress={reduce ? REDUCED_AT : 0} onProgress={onProgress} onReady={onReady} />}

          <div className="lp-hud lp-hud-clock" aria-hidden>
            <span className="lp-live-dot" data-on={p > 0.03 && p < 0.95} />
            <span className="lp-mono">Dundas St. Reno</span>
            <b>{clockLabel(p)}</b>
          </div>

          <ol className="lp-feed" aria-label="What the office saw that day">
            {EVENTS.map((e, i) => {
              const Icon = e.icon;
              const on = i <= latest;
              return (
                <li key={e.title} className={`lp-feed-item${on ? " is-on" : ""}${i === latest ? " is-new" : ""}${i < latest - 2 ? " is-old" : ""}`} data-tone={e.tone} aria-hidden={!on}>
                  <span className="lp-feed-icon"><Icon size={14} strokeWidth={2.4} aria-hidden /></span>
                  <span className="lp-feed-text">
                    <b>{e.title}</b>
                    <span>{e.meta}</span>
                  </span>
                  <time className="lp-mono">{clockLabel(e.at)}</time>
                </li>
              );
            })}
          </ol>

          {!failed && (
            <div className="lp-hud lp-hud-ctrl">
              <button type="button" className="lp-play" onClick={() => setPlaying((v) => !v)} aria-label={playing ? "Pause the site animation" : "Play the site animation"}>
                {playing ? <Pause size={15} aria-hidden /> : <Play size={15} aria-hidden />}
              </button>
              <div className="lp-scrub" aria-hidden><span style={{ transform: `scaleX(${p})` }} /></div>
              <span className="lp-mono lp-scrub-l">6:30</span>
              <span className="lp-mono lp-scrub-r">5:30</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
