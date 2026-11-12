"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, FileSpreadsheet, LogOut, MapPin } from "lucide-react";

// A scroll-driven flight: as the page scrolls, the camera drops from high over the city to the
// site gate, round the tower and back up. The frames are 3D renders of the same job site as the
// hero (marketing/hero/flight/fly.mjs). Each stage of the flight explains one step of the product.
const FRAMES = 72;
const src = (i: number) => `/hero/fly/f-${String(i).padStart(3, "0")}.webp`;

const STEPS = [
  { at: 0, icon: MapPin, tag: "1 · Draw the fence", title: "Every job gets a boundary.", body: "Set a radius around each site on a map. It is what the app checks every punch against." },
  { at: 0.3, icon: Camera, tag: "2 · Clock in", title: "Crew punch in at the gate.", body: "One tap, with GPS and a photo. Nobody clocks in from the couch, and you see who is on site now." },
  { at: 0.6, icon: LogOut, tag: "3 · Site alerts", title: "You hear when someone leaves.", body: "A phone alert with the exact time and distance when a person on the clock walks off the job." },
  { at: 0.82, icon: FileSpreadsheet, tag: "4 · Friday payroll", title: "Timesheets write themselves.", body: "One page per worker with your logo, as a PDF or Excel file, ready for payroll or QuickBooks." },
];

export default function FlyIn() {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [step, setStep] = useState(0);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const section = sectionRef.current, canvas = canvasRef.current;
    if (!section || !canvas) return;
    const g = canvas.getContext("2d");
    if (!g) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const frugal = !!conn?.saveData;
    const scroller: Element | Window = section.closest(".lp") ?? window;
    const imgs: (HTMLImageElement | undefined)[] = new Array(FRAMES);
    let started = false, raf = 0, shown = -1, target = 0;

    const draw = () => {
      raf = 0;
      // nearest frame that has arrived
      let i = Math.round(target * (FRAMES - 1)), d = 0, found: HTMLImageElement | undefined;
      while (d < FRAMES) {
        const a = imgs[i - d], b = imgs[i + d];
        if (a?.complete && a.naturalWidth) { found = a; i -= d; break; }
        if (b?.complete && b.naturalWidth) { found = b; i += d; break; }
        d++;
      }
      if (found && i !== shown) { shown = i; g.drawImage(found, 0, 0, canvas.width, canvas.height); }
    };
    const queue = () => { if (!raf) raf = requestAnimationFrame(draw); };

    const load = () => {
      if (started) return;
      started = true;
      // every 8th frame first so scrubbing works at once, then fill in the rest
      const order = [...Array(FRAMES).keys()].sort((a, b) => (a % 8 === 0 ? -1 : 0) - (b % 8 === 0 ? -1 : 0) || a - b);
      const step = frugal ? 3 : 1;
      order.filter((n) => n % 8 === 0 || n % step === 0).forEach((n) => {
        const im = new Image(); im.decoding = "async"; im.onload = queue; im.src = src(n); imgs[n] = im;
      });
    };

    const update = () => {
      const r = section.getBoundingClientRect(), h = window.innerHeight;
      if (r.top < h * 2.2 && r.bottom > -h) load();
      const p = reduced ? 0.45 : Math.min(1, Math.max(0, -r.top / Math.max(1, r.height - h)));
      target = p;
      setPct(p);
      let s = 0;
      STEPS.forEach((st, k) => { if (p >= st.at) s = k; });
      setStep(s);
      queue();
    };
    const onScroll = () => requestAnimationFrame(update);
    update();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const Icon = STEPS[step].icon;
  return (
    <section ref={sectionRef} className="fi" aria-labelledby="fi-title" id="how">
      <style>{CSS}</style>
      <div className="fi-stage">
        <canvas ref={canvasRef} className="fi-canvas" width={1152} height={648} aria-hidden />
        <div className="fi-shade" aria-hidden />
        <div className="lp-wrap fi-inner">
          <p className="fi-kicker"><span aria-hidden />How it works</p>
          <h2 id="fi-title" className="fi-h2">From the sky<br />to the timesheet.</h2>
          <div className="fi-card" key={step} aria-live="polite">
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
      </div>
    </section>
  );
}

const CSS = `
.fi{position:relative; height:430vh; background:#9fc4e4}
.fi-stage{position:sticky; top:0; height:100vh; height:100svh; overflow:hidden; color:#151617; isolation:isolate}
.fi-canvas{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; z-index:-2; background:#b9d6ee}
.fi-shade{position:absolute; inset:0; z-index:-1; pointer-events:none; background:linear-gradient(90deg, rgba(214,234,248,.82) 0%, rgba(214,234,248,.4) 30%, rgba(214,234,248,0) 52%), linear-gradient(0deg, rgba(10,12,16,.35) 0%, rgba(10,12,16,0) 30%)}
.fi-inner{position:relative; height:100%; display:flex; flex-direction:column; justify-content:center; padding-block:96px 60px}
.fi-kicker{display:flex; align-items:center; gap:10px; margin:0 0 14px; font-family:var(--mono); font-size:12px; letter-spacing:.12em; text-transform:uppercase; font-weight:600}
.fi-kicker span{width:18px; height:8px; background:repeating-linear-gradient(135deg,#151617 0 4px,#F5C400 4px 8px)}
.fi-h2{margin:0; font-family:var(--display); font-weight:900; text-transform:uppercase; font-size:clamp(44px,6vw,92px); line-height:.9}
.fi-card{margin-top:30px; width:min(400px,100%); background:#fff; border-radius:2px; padding:20px 22px 22px; box-shadow:0 24px 60px rgba(10,20,30,.28); border-top:5px solid #F5C400; animation:fi-in .45s cubic-bezier(.2,.7,.2,1) both}
.fi-tag{display:inline-flex; align-items:center; gap:8px; font-family:var(--mono); font-size:11.5px; letter-spacing:.1em; text-transform:uppercase; font-weight:600; color:#4b4d50}
.fi-title{margin:12px 0 6px; font-family:var(--display); font-weight:800; text-transform:uppercase; font-size:30px; line-height:1}
.fi-body{margin:0; font-size:15px; line-height:1.5; color:#45484C}
.fi-rail{position:absolute; right:24px; top:50%; transform:translateY(-50%); list-style:none; margin:0; padding:0; height:220px; width:3px; background:rgba(21,22,23,.22); display:flex; flex-direction:column; justify-content:space-between}
.fi-rail i{position:absolute; inset:0; background:#F5C400; transform-origin:top; box-shadow:0 0 0 .5px #151617}
.fi-rail li{position:relative; z-index:1; height:0}
.fi-rail li span{position:absolute; left:-5px; top:-6px; width:13px; height:13px; background:#fff; border:2px solid #151617; transition:background .25s}
.fi-rail li[data-on="true"] span{background:#F5C400}
@keyframes fi-in{from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:none}}
@media (max-width:760px){
  .fi{height:380vh}
  .fi-shade{background:linear-gradient(180deg, rgba(214,234,248,.9) 0%, rgba(214,234,248,.5) 34%, rgba(214,234,248,0) 55%), linear-gradient(0deg, rgba(10,12,16,.25), rgba(10,12,16,0) 30%)}
  .fi-inner{justify-content:flex-start; padding-block:84px 24px}
  .fi-h2{font-size:clamp(38px,12vw,56px)}
  .fi-card{margin-top:auto; width:100%; padding:16px 18px 18px}
  .fi-title{font-size:25px}
  .fi-body{font-size:14px}
  .fi-rail{display:none}
}
@media (prefers-reduced-motion: reduce){.fi{height:auto} .fi-stage{position:relative} .fi-card{animation:none}}
`;
