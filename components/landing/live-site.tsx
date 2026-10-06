"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const TALLY: [string, number, string, number][] = [
  // label, target, suffix, decimals
  ["Crew on site", 6, "", 0],
  ["Hours logged", 51.5, " h", 1],
  ["Site photos", 9, "", 0],
  ["Payroll ready", 12860, "", 0],
];

function useCountUp(target: number, run: boolean, decimals: number) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const k = Math.min(1, (now - t0) / 1100);
      setN(target * (1 - Math.pow(1 - k, 3)));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run]);
  return decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString("en-CA");
}

function Tally({ label, value, suffix, decimals, run }: { label: string; value: number; suffix: string; decimals: number; run: boolean }) {
  const shown = useCountUp(value, run, decimals);
  return (
    <div className="lp-tally">
      <span className="lp-tally-n">{label === "Payroll ready" ? "$" : ""}{shown}{suffix}</span>
      <span className="lp-tally-l">{label}</span>
    </div>
  );
}

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
  const [sceneReady, setSceneReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  // 0 while the section is still below the fold, 1 once it has settled in view
  const [reveal, setReveal] = useState(0);
  // A still of the scene covers the WebGL load (16KB). The clip is a full stand-in and only
  // downloads when WebGL can't run at all, so nobody pays 1.7MB for a fallback they don't need.
  const showPoster = !sceneReady && !failed;

  // Read the motion preference after hydration; reduced motion starts paused late in the day
  useEffect(() => {
    const r = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (r) { setReduce(true); setPlaying(false); setP(REDUCED_AT); }
    setMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Tie the camera to scroll position so the figures hand off into the site itself
  useEffect(() => {
    const el = sectionRef.current;
    const scroller = el?.closest(".lp") as HTMLElement | null;
    if (!el || !scroller) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const h = window.innerHeight || 1;
      // Fully revealed once the section top has risen through the lower third
      const k = 1 - (r.top - h * 0.12) / (h * 0.72);
      setReveal((prev) => { const next = Math.min(1, Math.max(0, k)); return Math.abs(next - prev) > 0.01 ? next : prev; });
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { cancelAnimationFrame(raf); scroller.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); };
  }, []);

  // Throttle React updates to visible changes (5-minute clock steps)
  const onProgress = useCallback((v: number) => setP((prev) => (Math.abs(prev - v) >= 0.004 || v === 0 || v === 1 ? v : prev)), []);
  const onReady = useCallback((ok: boolean) => (ok ? setSceneReady(true) : setFailed(true)), []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (failed) setP(1); }, [failed]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (playing && !reduce) void v.play().catch(() => {});
    else v.pause();
  }, [playing, reduce, failed]);

  const shown = EVENTS.filter((e) => p >= e.at);
  const latest = shown.length - 1;

  return (
    <section className="lp-sitecam" ref={sectionRef} aria-labelledby="live-title">
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
        <div className="lp-tallies" aria-label="What this sample day produced">
          {TALLY.map(([label, value, suffix, decimals]) => (
            <Tally key={label} label={label} value={value} suffix={suffix} decimals={decimals} run={reveal > 0.12} />
          ))}
        </div>
      </div>

      <div className="lp-wrap">
        <div className={`lp-stage3d${failed ? " lp-stage3d-flat" : ""}`}>
          {!failed && mounted && <SiteScene playing={playing} initialProgress={reduce ? REDUCED_AT : 0} reveal={reveal} onProgress={onProgress} onReady={onReady} />}
          {showPoster && (
            <img className="lp-scene-video" src="/site/site-tour-poster.webp" alt="" aria-hidden width={960} height={592} />
          )}
          {failed && (
            /* Recorded from this same scene, so machines without WebGL still see the day */
            <video
              preload="none"
              ref={videoRef}
              className="lp-scene-video"
              src="/site/site-tour.webm"
              poster="/site/site-tour-poster.webp"
              autoPlay={!reduce}
              loop
              muted
              playsInline
              controls={reduce}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) onProgress(Math.min(1, v.currentTime / v.duration));
              }}
              aria-label="A day on a Constra job site, from the first clock-in to the daily report"
            />
          )}

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
