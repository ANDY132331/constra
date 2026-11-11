"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Camera, ChevronsRight, FileSpreadsheet, HardHat, LogOut, MapPin, Play, WifiOff } from "lucide-react";

// A ~1 KB blurred copy of the first frame, so the shot is there instantly
const TINY_W = "data:image/webp;base64,UklGRjADAABXRUJQVlA4WAoAAAAgAAAAHwAAEQAASUNDUMgBAAAAAAHIAAAAAAQwAABtbnRyUkdCIFhZWiAH4AABAAEAAAAAAABhY3NwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA9tYAAQAAAADTLQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAlkZXNjAAAA8AAAACRyWFlaAAABFAAAABRnWFlaAAABKAAAABRiWFlaAAABPAAAABR3dHB0AAABUAAAABRyVFJDAAABZAAAAChnVFJDAAABZAAAAChiVFJDAAABZAAAAChjcHJ0AAABjAAAADxtbHVjAAAAAAAAAAEAAAAMZW5VUwAAAAgAAAAcAHMAUgBHAEJYWVogAAAAAAAAb6IAADj1AAADkFhZWiAAAAAAAABimQAAt4UAABjaWFlaIAAAAAAAACSgAAAPhAAAts9YWVogAAAAAAAA9tYAAQAAAADTLXBhcmEAAAAAAAQAAAACZmYAAPKnAAANWQAAE9AAAApbAAAAAAAAAABtbHVjAAAAAAAAAAEAAAAMZW5VUwAAACAAAAAcAEcAbwBvAGcAbABlACAASQBuAGMALgAgADIAMAAxADZWUDggQgEAAHAGAJ0BKiAAEgA+0VSjS6gkoyGwCAEAGglAE6QekwBHgbNDUA6O3kgDx4DEXRa+FWckl/BfFug9fLhqAAD+sBKx9WuEseOkI6N1v5FASmI3GFD+USK7ppmacY0tvCkRcsN0DgdQxCZ4lkXYlOwDec8PFA6emEO70hxqvsXVkIe0ZqumSnqSR5PF8BksZlx6EZlRktE0Fi/s9Nxx6CTtTl6qo+B2wnMkGu6K0waW6JT8ylJT37PjoewR/fGf91BpujvuB5F9Wf4u5jm37b4anDLAg5IBi5j39/acrXHxgFBDaGtRavRCzbQDH3sC87zstfqdPptDlF4K/7WjntHZoe3E5lC8tUyQfAMr2EiEx5ZHxQbne0YFG9y3VaoRy5H4Mz1aukHKPHy8R0M3ON9dWMF/85dnnkOjvhQmnxQTakwwAAA=";

/**
 * The opening shot in daylight: a 3D flight around a city job site (a tower going up, two cranes,
 * the dig next door), rendered from marketing/hero/flight and looped seamlessly. A light wash on
 * the left keeps the headline readable and white cards sit across the bottom edge. On phones the
 * shot is a wide panel under the buttons. The video only loads once the page has; data saver
 * and reduced motion get a still instead.
 */
export default function DayHero({ startHref, startLabel }: { startHref: string; startLabel: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const saveData = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
    // Phones show a small panel, so they get a light cut of the same loop
    const set = window.matchMedia("(max-width: 760px)").matches ? "p" : "w";
    // A still for reduced motion and data saver (and if autoplay is refused)
    const still = () => { v.poster = `/hero/poster-${set}.webp`; };
    if (reduced || saveData) { still(); return; }
    const start = () => {
      v.src = `/hero/loop-${set}.mp4`;
      v.play().catch(still);
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);

  return (
    <section className="dh" aria-labelledby="dh-title">
      <style>{CSS}</style>
      <div className="dh-media" aria-hidden>
        <div className="dh-tiny" />
        <video ref={videoRef} className="dh-video" muted loop playsInline preload="none" />
      </div>
      <div className="dh-wash" aria-hidden />

      <div className="lp-wrap dh-grid">
        <div className="dh-copy">
          <a href="#features" className="dh-badge"><HardHat size={15} aria-hidden /> Built for construction crews</a>
          <h1 id="dh-title" className="dh-h1">Run the job,<br />not the<br />paperwork.</h1>
          <p className="dh-sub">Clock-ins, timesheets and site alerts from the phones your crew already carries.</p>
          <div className="dh-ctas">
            <Link href={startHref} className="dh-primary">{startLabel} <ChevronsRight size={18} aria-hidden /></Link>
            <span className="dh-divider" aria-hidden />
            <a href="#watch" className="dh-play">
              <span className="dh-play-ring"><Play size={16} fill="currentColor" aria-hidden /></span>
              Watch the 30-second video
            </a>
          </div>
        </div>

        <div className="dh-aside">
          <span className="dh-aside-mark" aria-hidden />
          <p>Time tracking, timesheets and payroll exports, built for <b>crews on site.</b></p>
          <a href="#features" className="dh-more">See features <ArrowUpRight size={15} aria-hidden /></a>
        </div>
      </div>

      <div className="lp-wrap dh-cards">
        <div className="dh-card dh-card-l">
          <img src="/hero/app-time.webp" alt="The Constra Time screen: this week's hours by day and by person" width={430} height={560} loading="lazy" decoding="async" />
          <div className="dh-card-body">
            <span className="dh-chip"><WifiOff size={13} aria-hidden /> Works offline</span>
            <p className="dh-card-title">Built for gloves, glare<br />and no signal</p>
            <Link href={startHref} className="dh-card-link">{startLabel} <ArrowUpRight size={14} aria-hidden /></Link>
          </div>
        </div>

        <div className="dh-mid">
          <span className="dh-mid-icons" aria-hidden><span><MapPin size={16} /></span><span><HardHat size={16} /></span></span>
          <p>Every clock-in comes with GPS and a photo, so Friday payroll is <b>real hours.</b></p>
        </div>

        <div className="dh-card dh-card-r">
          <a href="#day" className="dh-card-head">See a day on site <ArrowUpRight size={15} aria-hidden /></a>
          <ul className="dh-feed" aria-label="Example of what the office sees">
            <li><span className="dh-feed-i"><Camera size={15} aria-hidden /></span><span><b>Clocked in</b> GPS and photo</span><time>6:58 AM</time></li>
            <li><span className="dh-feed-i dh-feed-warn"><LogOut size={15} aria-hidden /></span><span><b>Left the site</b> alert sent</span><time>12:14 PM</time></li>
            <li><span className="dh-feed-i dh-feed-go"><FileSpreadsheet size={15} aria-hidden /></span><span><b>Timesheet ready</b> PDF and Excel</span><time>Fri</time></li>
          </ul>
          <div className="dh-card-foot">
            <p className="dh-card-title">Made for crews,<br />not paperwork</p>
            <span className="dh-mark" aria-hidden><HardHat size={16} strokeWidth={2.5} /></span>
          </div>
        </div>
      </div>
      <a href="#watch" className="dh-skip-cue" aria-hidden tabIndex={-1}><ArrowRight size={14} /></a>
    </section>
  );
}

const CSS = `
.dh{position:relative; margin-top:-61px; padding-top:61px; min-height:max(760px, 100vh); background:#cfe7f7; color:#151617; overflow:hidden; isolation:isolate}
.dh-media{position:absolute; inset:0; z-index:-2}
.dh-tiny{position:absolute; inset:-30px; background:url('${TINY_W}') center/cover no-repeat; filter:blur(22px)}
.dh-video{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; object-position:60% 50%; display:block}
.dh-wash{position:absolute; inset:0; z-index:-1; pointer-events:none; background:
  linear-gradient(90deg, rgba(212,235,250,.97) 0%, rgba(212,235,250,.9) 28%, rgba(212,235,250,.45) 48%, rgba(212,235,250,0) 64%),
  linear-gradient(180deg, rgba(212,235,250,.85) 0%, rgba(212,235,250,0) 16%, rgba(0,0,0,0) 62%, rgba(10,11,16,.55) 100%)}
.dh-grid{display:grid; grid-template-columns:minmax(0,1fr) 300px; gap:40px; padding-top:56px; align-items:start}
.dh-badge{display:inline-flex; align-items:center; gap:10px; padding:9px 18px; border:1.5px solid rgba(21,22,23,.35); border-radius:999px; font-size:14px; font-weight:600; text-decoration:none; color:#151617; background:rgba(255,255,255,.35)}
.dh-h1{margin-top:26px; font-family:var(--display); font-weight:900; text-transform:uppercase; font-size:clamp(58px, 6.6vw, 104px); line-height:.9; letter-spacing:.002em; color:#151617; max-width:12ch}
.dh-sub{margin-top:24px; font-size:18px; line-height:1.5; max-width:30ch; color:#232527; font-weight:500}
.dh-ctas{display:flex; align-items:center; gap:22px; margin-top:32px; flex-wrap:wrap}
.dh-primary{display:inline-flex; align-items:center; gap:10px; min-height:54px; padding:0 26px; background:#F5C400; color:#141414; font-weight:700; font-size:16px; text-transform:uppercase; letter-spacing:.03em; text-decoration:none; box-shadow:0 0 0 1.5px #141414 inset; transition:transform .12s, background .2s}
.dh-primary:hover{background:#ffd31a}
.dh-primary:active{transform:translateY(1px)}
.dh-divider{width:1px; height:44px; background:rgba(21,22,23,.25)}
.dh-play{display:inline-flex; align-items:center; gap:14px; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:.04em; text-decoration:none; color:#151617}
.dh-play-ring{width:52px; height:52px; border-radius:50%; border:1.5px solid #151617; display:flex; align-items:center; justify-content:center; padding-left:3px; transition:background .2s, color .2s}
.dh-play:hover .dh-play-ring{background:#151617; color:#F5C400}
.dh-aside{margin-top:40px; padding:20px 22px 22px; color:#151617; background:rgba(226,241,252,.78); backdrop-filter:blur(10px) saturate(1.1); -webkit-backdrop-filter:blur(10px) saturate(1.1); border:1px solid rgba(255,255,255,.6)}
.dh-aside-mark{display:block; width:30px; height:30px; margin-bottom:18px; background:
  radial-gradient(circle, #151617 2.5px, transparent 3px) 0 0/10px 10px; opacity:.85}
.dh-aside p{font-size:19px; line-height:1.35; font-weight:500}
.dh-aside b{font-weight:700}
.dh-more{display:inline-flex; align-items:center; gap:6px; margin-top:18px; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:.04em; color:#151617; text-decoration:underline; text-underline-offset:6px; text-decoration-thickness:1.5px}
.dh-cards{position:absolute; left:0; right:0; bottom:40px; display:grid; grid-template-columns:minmax(0,380px) minmax(0,1fr) minmax(0,290px); gap:28px; align-items:end}
.dh-card{background:#fff; color:#151617; border-radius:2px; box-shadow:0 20px 50px rgba(10,11,16,.18)}
.dh-card-title{font-family:var(--display); font-weight:800; text-transform:uppercase; font-size:22px; line-height:1}
.dh-card-l{display:flex; gap:18px; padding:16px; align-items:center}
.dh-card-l img{width:118px; height:154px; object-fit:cover; object-position:top; border-radius:12px; box-shadow:0 0 0 4px #151617; flex-shrink:0}
.dh-card-body{display:flex; flex-direction:column; gap:12px; min-width:0}
.dh-chip{align-self:flex-start; display:inline-flex; align-items:center; gap:7px; padding:5px 12px; border-radius:999px; background:#eef3f6; font-size:13px; font-weight:600}
.dh-card-link{display:inline-flex; align-items:center; gap:6px; font-weight:700; font-size:13px; text-transform:uppercase; letter-spacing:.04em; color:#151617; text-decoration:underline; text-underline-offset:5px}
.dh-mid{display:flex; flex-direction:column; align-items:center; text-align:center; gap:14px; padding-bottom:6px; color:#fff; text-shadow:0 2px 18px rgba(0,0,0,.45)}
.dh-mid p{font-family:var(--display); font-weight:700; text-transform:none; font-size:26px; line-height:1.15; max-width:24ch}
.dh-mid b{color:#F5C400}
.dh-mid-icons{display:flex}
.dh-mid-icons span{width:42px; height:42px; border-radius:50%; background:#fff; color:#151617; display:flex; align-items:center; justify-content:center; box-shadow:0 0 0 3px rgba(255,255,255,.4)}
.dh-mid-icons span + span{margin-left:-10px; background:#F5C400}
.dh-card-r{display:flex; flex-direction:column}
.dh-card-head{display:flex; justify-content:space-between; align-items:center; padding:13px 16px; font-size:15px; font-weight:600; color:#151617; text-decoration:none; border-bottom:1px solid #e6e8ea}
.dh-feed{list-style:none; margin:0; padding:6px 16px; display:grid}
.dh-feed li{display:grid; grid-template-columns:30px 1fr auto; gap:10px; align-items:center; padding:9px 0; font-size:13px; color:#4b4d50; border-bottom:1px solid #eef0f2}
.dh-feed b{display:block; color:#151617; font-size:14px; font-weight:600}
.dh-feed time{font-family:var(--mono); font-size:11px; color:#77797c; align-self:start; padding-top:2px}
.dh-feed-i{width:30px; height:30px; border-radius:4px; display:flex; align-items:center; justify-content:center; background:#F5C400; color:#141414}
.dh-feed-warn{background:#fde4df; color:#b9382c}
.dh-feed-go{background:#dcefe3; color:#1e7a45}
.dh-card-foot{display:flex; justify-content:space-between; align-items:flex-end; gap:12px; padding:14px 16px}
.dh-mark{width:34px; height:34px; border-radius:4px; background:#F5C400; color:#141414; display:flex; align-items:center; justify-content:center; flex-shrink:0}
.dh-skip-cue{display:none}
@media (max-width: 1100px){
  .dh-grid{grid-template-columns:1fr}
  .dh-aside{display:none}
  .dh-cards{grid-template-columns:minmax(0,1fr) minmax(0,260px)}
  .dh-mid{display:none}
}
@media (max-width: 760px){
  .dh{min-height:auto; display:flex; flex-direction:column; background:linear-gradient(180deg,#d4ebfa 0%,#e6f3fc 100%)}
  .dh-wash{display:none}
  .dh-grid{order:1; padding-top:30px; gap:0}
  .dh-media{order:2; position:relative; inset:auto; z-index:0; margin:28px 16px 0; height:64vw; max-height:360px; overflow:hidden; border-radius:2px; box-shadow:0 18px 40px rgba(10,11,16,.18)}
  .dh-tiny{inset:-20px}
  .dh-video{object-position:50% 50%}
  .dh-cards{order:3; position:relative; bottom:auto; margin-top:14px; padding-bottom:28px; grid-template-columns:1fr; gap:14px}
  .dh-h1{font-size:clamp(46px, 13vw, 70px); margin-top:20px}
  .dh-sub{font-size:16px; margin-top:16px}
  .dh-ctas{gap:16px; margin-top:24px}
  .dh-divider{display:none}
  .dh-play{font-size:13px}
  .dh-play-ring{width:46px; height:46px}
  .dh-card-r .dh-card-foot{display:none}
  .dh-card-title{font-size:20px}
}
`;
