"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * The opening shot: real drone footage of a job site that flies as you scroll, like coming in
 * to land. Scroll down and the camera orbits the building; scroll up and it reverses.
 *
 * The footage is a run of still frames (public/hero, from a free Pexels clip) drawn to a canvas,
 * because scrubbing a <video> by scroll stutters on phones. Only the first frame loads with the
 * page; the rest stream in afterwards, coarse first then fine, and a slow connection or data
 * saver stops at a quarter of them. Reduced motion gets a still.
 */
const FRAMES = 120;
// A tiny blurred copy of the first frame for each layout, inline so the shot is there instantly.
// Low-detail on purpose: the browser doesn't treat it as the page's main content, so the
// headline stays what the page is measured by.
const TINY_W = "data:image/webp;base64,UklGRhYDAABXRUJQVlA4WAoAAAAgAAAAHwAAEQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggKAEAADAGAJ0BKiAAEgA+0VSjS6gkoyGwCAEAGgllAMadIHhh3BhH4z39VFJmFY3tcbsPG4qG//bXUYmBUCAA/vLLwzxoG22te8lG1KPTMyf2HaUgz0eIGPmG0BGbGCI7ksQZc9dMFA8iM9cL7aZJGPqCghEW3y+Ww7lhJJFZMwrSikVOjJEQRwy/S4IGGGdb1MLUaT9ENazuGAmdmiHRkINVSF11uiPHJSSfYbNhpfA68rfqbSE9J58ZBuTzDPqs9AIZVZqyIfnYqvVf4hA/dE7qwBrHYPGefKPeGm0k1KIQ4KfePUYuvwlx3XZMiL80xrFXLl2Nh0D8RmOAx9KEKcoMxtMQkw8hx0P9T14ZOwAkFiFICEnjTXpJRsokH9dJEWX5lDJWld7IAAAA";
const TINY_M = "data:image/webp;base64,UklGRsICAABXRUJQVlA4WAoAAAAgAAAAEQAAHwAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDgg1AAAAHAFAJ0BKhIAIAA+0VikTSgkoyIwGAgBABoJZQC7AYvMavZr0+fR/8Q1tNv5k8LJNLpqsvQA/trV+TcwZyRER2JnVjWAwvUrmL5spIYFJ6Vt71+r0iEXWZsOtBtz5th1Alz7xEezcvn0QVl7wMh+ASIQ2X/y0ijXyzzH4nDNwR62ZaL0Sx1r1kpUWSPho9pKUPOPzDRXy27zIr4zWzrFUWAj5h5vlAkog8ZHYQZOdlJMvrCw1+MfqxAcmbmjzQLronzKn2aqpmtxkCXzuPNhCwQ7QUAA";
const src = (set: "w" | "m", i: number) => `/hero/${set}/${String(i).padStart(3, "0")}.webp`;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = (x: number) => 1 - Math.pow(1 - clamp(x), 3);
/** 0..1 for a window inside the scroll, then fully visible until it fades out */
const band = (p: number, a: number, b: number, fade = 0.06) => Math.min(clamp((p - a) / fade), clamp((b - p) / fade));

export default function FlyHero({ startHref, startLabel }: { startHref: string; startLabel: string }) {
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [p, setP] = useState(0);
  // Reduced motion: read like any outside setting, false on the server so markup matches
  const reduced = useSyncExternalStore(
    (cb) => { const m = window.matchMedia("(prefers-reduced-motion: reduce)"); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const setRef = useRef<"w" | "m">("w");
  const drawn = useRef(-1);

  // Which set, and stream the frames in after the page has loaded
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const set: "w" | "m" = window.matchMedia("(max-aspect-ratio: 1/1)").matches ? "m" : "w";
    setRef.current = set;
    frames.current = new Array(FRAMES).fill(null);
    let cancelled = false;

    const load = (i: number) => new Promise<void>((res) => {
      if (frames.current[i]) return res();
      const img = new Image();
      img.decoding = "async";
      img.onload = () => { if (!cancelled) { frames.current[i] = img; draw(); } res(); };
      img.onerror = () => res();
      img.src = src(set, i);
    });

    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const slow = !!conn?.saveData || /(^|-)(2g|3g)$/.test(conn?.effectiveType ?? "");
    // The first frame comes straight away; the rest wait until the page has loaded
    void load(0);
    const run = async () => {
      await load(0);
      if (mq.matches) return;
      // Coarse to fine, a few at a time, so scrubbing works early and the network isn't flooded
      for (const step of slow ? [8, 4] : [8, 4, 2, 1]) {
        const batch: number[] = [];
        for (let i = 0; i < FRAMES; i += step) if (!frames.current[i]) batch.push(i);
        for (let k = 0; k < batch.length && !cancelled; k += 6) await Promise.all(batch.slice(k, k + 6).map(load));
      }
    };
    const start = () => { void run(); };
    if (document.readyState === "complete") setTimeout(start, 300);
    else window.addEventListener("load", () => setTimeout(start, 300), { once: true });
    return () => { cancelled = true; };
  }, []);

  // Scroll progress through the section (the landing page scrolls inside .lp, not the window)
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const scroller = (section.closest(".lp") as HTMLElement | null) ?? document.scrollingElement ?? document.documentElement;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = section.getBoundingClientRect();
        const travel = r.height - window.innerHeight;
        setP(travel > 0 ? clamp(-r.top / travel) : 0);
      });
    };
    onScroll();
    scroller.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { scroller.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); };
  }, []);

  // Draw the frame for this point in the flight: the nearest one that has arrived
  const pRef = useRef(0);
  function draw() {
    const c = canvasRef.current;
    if (!c) return;
    const want = Math.round(pRef.current * (FRAMES - 1));
    let pick = -1;
    for (let d = 0; d < FRAMES; d++) {
      if (frames.current[want - d]) { pick = want - d; break; }
      if (frames.current[want + d]) { pick = want + d; break; }
    }
    if (pick < 0 || pick === drawn.current) return;
    const img = frames.current[pick]!;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = c.clientWidth, h = c.clientHeight;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); drawn.current = -1; }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    // cover
    const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    ctx.drawImage(img, (c.width - dw) / 2, (c.height - dh) / 2, dw, dh);
    drawn.current = pick;
  }
  useEffect(() => { pRef.current = reduced ? 0 : p; draw(); });
  useEffect(() => {
    const onResize = () => { drawn.current = -1; draw(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const q = reduced ? 0 : p;
  // Copy beats over the flight
  const a = 1 - clamp((q - 0.2) / 0.1);          // headline, leaves as the flight starts
  const bIn = band(q, 0.3, 0.64);                  // live cards
  const cIn = band(q, 0.68, 1.2);                  // the close
  const zoom = 1 + q * 0.08;
  const alt = Math.round(140 - q * 85);            // the HUD's "altitude", purely a flourish
  const hdg = Math.round(q * 112);

  return (
    <section ref={sectionRef} className={`fh${reduced ? " fh-still" : ""}`} aria-labelledby="fh-title">
      <style>{CSS}</style>
      <div className="fh-stick">
        <div className="fh-media" aria-hidden style={{ transform: `scale(${zoom})` }}>
          <div className="fh-poster" />
          <canvas ref={canvasRef} className="fh-canvas" />
        </div>
        <div className="fh-grade" aria-hidden />
        <div className="fh-hud" aria-hidden>
          <span className="fh-corner tl" /><span className="fh-corner tr" /><span className="fh-corner bl" /><span className="fh-corner br" />
          <div className="fh-readout"><span>ALT {alt} M</span><span>HDG {String(hdg).padStart(3, "0")}°</span><span className="fh-rec">● LIVE SITE</span></div>
          <div className="fh-progress"><span style={{ transform: `scaleY(${q})` }} /></div>
        </div>

        {/* Beat 1: the headline */}
        <div className="fh-copy" style={{ opacity: a, transform: `translateY(${(1 - a) * -40}px)`, pointerEvents: a > 0.5 ? "auto" : "none" }}>
          <a href="#features" className="lp-announce">
            <span className="lp-announce-tag">Offline</span>
            Clock-ins work with no signal
            <ArrowRight size={13} aria-hidden />
          </a>
          <h1 id="fh-title" className="lp-cine-h1">Run the job.</h1>
          <p className="lp-cine-sub">
            Timesheets, site alerts and invoices
            <br />
            from the phones your crew already carries.
          </p>
          <div className="lp-cine-ctas">
            <Link href={startHref} className="lp-cine-pill lp-shimmer">
              {startLabel}
              <span className="lp-cine-pill-go"><ArrowRight size={15} aria-hidden /></span>
            </Link>
            <a href="#watch" className="lp-cine-ghost">
              Watch the 30-second video <ArrowRight size={14} aria-hidden />
            </a>
          </div>
          <p className="fh-scrollcue" aria-hidden>Scroll to fly in</p>
        </div>

        {/* Beat 2: what you see from above, live */}
        <div className="fh-live" style={{ opacity: bIn, pointerEvents: "none" }} aria-hidden={bIn < 0.5}>
          <h2 className="fh-h2" style={{ transform: `translateY(${(1 - ease(bIn)) * 30}px)` }}>Every crew. Every site.<br /><span>Live.</span></h2>
          <div className="fh-card fh-c1" style={{ transform: `translate3d(${(1 - ease(bIn)) * -80}px, ${(q - 0.47) * -260}px, 0)` }}>
            <span className="fh-dot fh-green" /><div><b>4 on site</b><span>Queen St Condo · since 7:02 AM</span></div>
          </div>
          <div className="fh-card fh-c2" style={{ transform: `translate3d(${(1 - ease(bIn)) * 80}px, ${(q - 0.47) * -420}px, 0)` }}>
            <img src="/icon-192.png" alt="" width={44} height={44} />
            <div><b>Dev Lal left Dundas St Reno</b><span>11:42 AM · 1.8 km from the site</span></div>
          </div>
          <div className="fh-card fh-c3" style={{ transform: `translate3d(${(1 - ease(bIn)) * -60}px, ${(q - 0.47) * -180}px, 0)` }}>
            <span className="fh-dot fh-amber" /><div><b>Timesheet ready</b><span>PDF + Excel, with your logo</span></div>
          </div>
        </div>

        {/* Beat 3: the close */}
        <div className="fh-close" style={{ opacity: cIn, transform: `translateY(${(1 - ease(cIn)) * 40}px)`, pointerEvents: cIn > 0.5 ? "auto" : "none" }}>
          <h2 className="fh-h2">See the whole job<br /><span>from your pocket.</span></h2>
          <Link href={startHref} className="lp-cine-pill lp-shimmer">
            {startLabel}
            <span className="lp-cine-pill-go"><ArrowRight size={15} aria-hidden /></span>
          </Link>
          <p className="fh-fine">Free while we launch · No credit card</p>
        </div>
        <div className="lp-cine-horizon" aria-hidden />
      </div>
    </section>
  );
}

const CSS = `
.fh{position:relative; height:320vh; background:#07080a}
.fh.fh-still{height:100vh}
.fh-stick{position:sticky; top:0; height:100vh; height:100dvh; overflow:hidden}
.fh-media{position:absolute; inset:0; transform-origin:50% 45%; will-change:transform}
.fh-poster,.fh-canvas{position:absolute; inset:0; width:100%; height:100%; display:block}
.fh-poster{background:url('${TINY_W}') center/cover no-repeat; filter:blur(18px); transform:scale(1.08)}
@media (max-aspect-ratio: 1/1){ .fh-poster{background-image:url('${TINY_M}')} }
.fh-canvas{filter:none}
.fh-media{filter:brightness(.7) contrast(1.08) saturate(1.06)}
.fh-grade{position:absolute; inset:0; pointer-events:none;
  background:
    radial-gradient(120% 80% at 15% 35%, rgba(7,8,10,.82) 0%, rgba(7,8,10,.35) 45%, transparent 70%),
    linear-gradient(180deg, rgba(7,8,10,.55) 0%, transparent 22%, transparent 62%, rgba(7,8,10,.92) 100%);}
.fh-hud{position:absolute; inset:0; pointer-events:none; font-family:var(--mono); color:rgba(255,255,255,.72); font-size:11px; letter-spacing:.14em}
.fh-corner{position:absolute; width:26px; height:26px; border-color:rgba(255,255,255,.45); border-style:solid; border-width:0}
.fh-corner.tl{top:84px; left:28px; border-top-width:2px; border-left-width:2px}
.fh-corner.tr{top:84px; right:28px; border-top-width:2px; border-right-width:2px}
.fh-corner.bl{bottom:28px; left:28px; border-bottom-width:2px; border-left-width:2px}
.fh-corner.br{bottom:28px; right:28px; border-bottom-width:2px; border-right-width:2px}
.fh-readout{position:absolute; right:64px; top:96px; display:flex; flex-direction:column; align-items:flex-end; gap:6px}
.fh-rec{color:#F5C400}
.fh-progress{position:absolute; right:40px; top:50%; height:160px; margin-top:-80px; width:2px; background:rgba(255,255,255,.18)}
.fh-progress span{position:absolute; inset:0; background:#F5C400; transform-origin:top}
.fh-copy{position:absolute; left:max(24px, calc((100vw - 1152px) / 2)); right:24px; top:50%; translate:0 -50%; max-width:720px}
.fh-copy .lp-cine-h1{margin-top:22px}
.fh-scrollcue{margin-top:40px; font-family:var(--mono); font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:rgba(255,255,255,.55)}
.fh-scrollcue::after{content:""; display:block; width:1px; height:34px; margin-top:10px; background:linear-gradient(#F5C400, transparent); animation:fh-cue 1.6s ease-in-out infinite}
@keyframes fh-cue{0%{transform:scaleY(0); transform-origin:top} 50%{transform:scaleY(1); transform-origin:top} 51%{transform-origin:bottom} 100%{transform:scaleY(0); transform-origin:bottom}}
.fh-h2{font-family:var(--font-barlow-condensed),"Arial Narrow",sans-serif; font-weight:900; text-transform:uppercase; font-size:clamp(44px, 7vw, 104px); line-height:.9; letter-spacing:.005em; color:#fff; text-wrap:balance; text-shadow:0 6px 40px rgba(0,0,0,.5)}
.fh-h2 span{color:#F5C400}
.fh-live{position:absolute; inset:0}
.fh-live .fh-h2{position:absolute; left:0; right:0; top:22%; text-align:center; padding:0 24px}
.fh-card{position:absolute; display:flex; align-items:center; gap:12px; padding:16px 20px; border-radius:20px; font-size:16px; color:#fff;
  background:rgba(20,21,24,.62); backdrop-filter:blur(14px) saturate(1.2); -webkit-backdrop-filter:blur(14px) saturate(1.2);
  border:1px solid rgba(255,255,255,.14); box-shadow:0 24px 60px rgba(0,0,0,.45); will-change:transform; white-space:nowrap}
.fh-card b{font-weight:700}
.fh-card img{border-radius:12px}
.fh-card div{display:flex; flex-direction:column; gap:2px}
.fh-card div span{font-size:14px; color:rgba(255,255,255,.75)}
.fh-c1{left:10%; top:58%}
.fh-c2{right:8%; top:52%; border-color:rgba(245,196,0,.45)}
.fh-c3{left:28%; top:74%}
.fh-dot{width:10px; height:10px; border-radius:50%; display:inline-block; flex-shrink:0}
.fh-green{background:#2EAA62; box-shadow:0 0 0 4px rgba(46,170,98,.25)}
.fh-amber{background:#F5C400; box-shadow:0 0 0 4px rgba(245,196,0,.25)}
.fh-close{position:absolute; left:0; right:0; top:50%; translate:0 -50%; display:flex; flex-direction:column; align-items:center; gap:28px; text-align:center; padding:0 24px}
.fh-fine{font-family:var(--mono); font-size:12px; letter-spacing:.12em; text-transform:uppercase; color:rgba(255,255,255,.65)}
@media (max-width: 760px){
  .fh{height:280vh}
  .fh-readout{display:none}
  .fh-progress{right:22px; height:120px; margin-top:-60px}
  .fh-corner.tl,.fh-corner.tr{top:76px}
  .fh-corner.tl,.fh-corner.bl{left:14px}
  .fh-corner.tr,.fh-corner.br{right:14px}
  .fh-copy{left:20px; right:20px}
  .fh-live .fh-h2{top:16%}
  .fh-card{font-size:14px; padding:12px 14px; border-radius:16px; max-width:84vw}
  .fh-card div span{font-size:12px}
  .fh-c1{left:6%; top:46%}
  .fh-c2{right:5%; top:57%}
  .fh-c3{left:8%; top:70%}
}
@media (prefers-reduced-motion: reduce){ .fh-scrollcue::after{animation:none} }
`;
