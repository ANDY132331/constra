"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileSpreadsheet, LogOut, MapPin } from "lucide-react";

// "How it works" as a flight that plays by itself: a 32-second loop over a city job site that
// drops to the gate, circles the tower and rises again (marketing/hero/flight/flyvideo.mjs).
// The cards follow the video's own clock, so each stage explains one step of the product.
const STEPS = [
  { at: 0, icon: MapPin, tag: "1 · Draw the fence", title: "Every job gets a boundary.", body: "Set a radius around each site on a map. It is what the app checks every punch against." },
  { at: 0.26, icon: Camera, tag: "2 · Clock in", title: "Crew punch in at the gate.", body: "One tap, with GPS and a photo. Nobody clocks in from the couch, and you see who is on site now." },
  { at: 0.5, icon: LogOut, tag: "3 · Site alerts", title: "You hear when someone leaves.", body: "A phone alert with the exact time and distance when a person on the clock walks off the job." },
  { at: 0.72, icon: FileSpreadsheet, tag: "4 · Friday payroll", title: "Timesheets write themselves.", body: "One page per worker with your logo, as a PDF or Excel file, ready for payroll or QuickBooks." },
];

export default function FlyIn() {
  const sectionRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const section = sectionRef.current, v = videoRef.current;
    if (!section || !v) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const frugal = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
    const set = window.matchMedia("(max-width: 760px)").matches ? "p" : "w";
    v.poster = "/hero/fly-poster.webp";
    if (reduced || frugal) return; // a still, with the first step showing

    let loaded = false;
    const io = new IntersectionObserver((entries) => {
      const on = entries.some((e) => e.isIntersecting);
      if (on && !loaded) { loaded = true; v.src = `/hero/fly-${set}.mp4`; }
      if (on) v.play().catch(() => {});
      else v.pause();
    }, { rootMargin: "200px 0px", threshold: 0.15 });
    io.observe(section);

    const onTime = () => {
      if (!v.duration) return;
      const p = v.currentTime / v.duration;
      setPct(p);
      let s = 0;
      STEPS.forEach((st, k) => { if (p >= st.at) s = k; });
      setStep(s);
    };
    v.addEventListener("timeupdate", onTime);
    return () => { io.disconnect(); v.removeEventListener("timeupdate", onTime); };
  }, []);

  const Icon = STEPS[step].icon;
  return (
    <section ref={sectionRef} className="fi" aria-labelledby="fi-title" id="how">
      <style>{CSS}</style>
      <video ref={videoRef} className="fi-video" muted loop playsInline preload="none" aria-hidden />
      <div className="fi-shade" aria-hidden />
      <div className="lp-wrap fi-inner">
        <p className="fi-kicker"><span aria-hidden />How it works</p>
        <h2 id="fi-title" className="fi-h2">From the sky<br />to the timesheet.</h2>
        <div className="fi-card" key={step} aria-live="off">
          <span className="fi-tag"><Icon size={15} aria-hidden /> {STEPS[step].tag}</span>
          <p className="fi-title">{STEPS[step].title}</p>
          <p className="fi-body">{STEPS[step].body}</p>
        </div>
        <ol className="fi-rail" aria-hidden>
          {STEPS.map((s, k) => (
            <li key={s.tag} data-on={k <= step}><span /></li>
          ))}
          <i style={{ transform: `scaleY(${pct})` }} />
        </ol>
      </div>
    </section>
  );
}

const CSS = `
.fi{position:relative; min-height:max(640px, 100vh); background:#2a2038; color:#fff; overflow:hidden; isolation:isolate}
.fi-video{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; z-index:-2}
.fi-shade{position:absolute; inset:0; z-index:-1; pointer-events:none; background:linear-gradient(90deg, rgba(14,10,24,.72) 0%, rgba(14,10,24,.38) 32%, rgba(14,10,24,0) 55%), linear-gradient(0deg, rgba(14,10,24,.4) 0%, rgba(14,10,24,0) 26%)}
.fi-inner{position:relative; min-height:inherit; display:flex; flex-direction:column; justify-content:center; padding-block:96px 72px}
.fi-kicker{display:flex; align-items:center; gap:10px; margin:0 0 14px; font-family:var(--mono); font-size:12px; letter-spacing:.12em; text-transform:uppercase; font-weight:600}
.fi-kicker span{width:18px; height:8px; background:repeating-linear-gradient(135deg,#fff 0 4px,#F5C400 4px 8px)}
.fi-h2{margin:0; font-family:var(--display); font-weight:900; text-transform:uppercase; font-size:clamp(44px,6vw,92px); line-height:.9}
.fi-card{margin-top:30px; width:min(400px,100%); min-height:176px; color:#151617; background:#fff; border-radius:2px; padding:20px 22px 22px; box-shadow:0 24px 60px rgba(10,20,30,.28); border-top:5px solid #F5C400; animation:fi-in .5s cubic-bezier(.2,.7,.2,1) both}
.fi-tag{display:inline-flex; align-items:center; gap:8px; font-family:var(--mono); font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; font-weight:600; color:#4b4d50}
.fi-title{margin:12px 0 6px; font-family:var(--display); font-weight:800; text-transform:uppercase; font-size:30px; line-height:1}
.fi-body{margin:0; font-size:15px; line-height:1.5; color:#45484C}
.fi-rail{position:absolute; right:24px; top:50%; transform:translateY(-50%); list-style:none; margin:0; padding:0; height:220px; width:3px; background:rgba(255,255,255,.3); display:flex; flex-direction:column; justify-content:space-between}
.fi-rail i{position:absolute; inset:0; background:#F5C400; transform-origin:top; box-shadow:none}
.fi-rail li{position:relative; z-index:1; height:0}
.fi-rail li span{position:absolute; left:-5px; top:-6px; width:13px; height:13px; background:#2a2038; border:2px solid #fff; transition:background .25s}
.fi-rail li[data-on="true"] span{background:#F5C400}
@keyframes fi-in{from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:none}}
@media (max-width:760px){
  .fi{min-height:max(620px, 100svh)}
  .fi-shade{background:linear-gradient(180deg, rgba(14,10,24,.8) 0%, rgba(14,10,24,.45) 32%, rgba(14,10,24,0) 55%), linear-gradient(0deg, rgba(14,10,24,.3), rgba(14,10,24,0) 30%)}
  .fi-inner{justify-content:flex-start; padding-block:72px 24px}
  .fi-h2{font-size:clamp(38px,12vw,56px)}
  .fi-card{margin-top:auto; width:100%; padding:16px 18px 18px; min-height:150px}
  .fi-title{font-size:25px}
  .fi-body{font-size:14px}
  .fi-rail{display:none}
}
@media (prefers-reduced-motion: reduce){.fi-card{animation:none}}
`;
