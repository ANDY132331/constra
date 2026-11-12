"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronsRight, Play } from "lucide-react";

/**
 * The opening shot: a golden-hour flight over a lit-up job site, built as a 3D scene
 * (marketing/hero/flight/dusk.mjs) and rendered to a seamless 30-second loop. The camera starts
 * wide over the city, glides in through the site gate, circles the rising tower and drifts
 * back out. Only a headline and one button sit on top. A still frame paints first, so the
 * page never waits on the video; data saver and reduced motion keep the still.
 */
export default function DayHero({ startHref, startLabel }: { startHref: string; startLabel: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    const saveData = !!conn?.saveData || /(^|-)2g$/.test(conn?.effectiveType ?? "");
    if (reduced || saveData) return;
    const set = window.matchMedia("(max-width: 760px)").matches ? "p" : "w";
    const start = () => {
      v.src = `/hero/dusk-${set}.mp4`;
      v.addEventListener("playing", () => v.classList.add("is-on"), { once: true });
      v.play().catch(() => { /* autoplay refused: the still stays */ });
    };
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
  }, []);

  return (
    <section className="dh" aria-labelledby="dh-title">
      <style>{CSS}</style>
      <div className="dh-still" aria-hidden />
      <video ref={videoRef} className="dh-video" muted loop playsInline preload="none" aria-hidden />
      <div className="dh-shade" aria-hidden />

      <div className="lp-wrap dh-center">
        <p className="dh-kicker">Field management for construction crews</p>
        <h1 id="dh-title" className="dh-h1">Run the job,<br />not the paperwork.</h1>
        <p className="dh-sub">Clock-ins, timesheets and site alerts from the phones your crew already carries.</p>
        <div className="dh-ctas">
          <Link href={startHref} className="dh-primary">{startLabel} <ChevronsRight size={18} aria-hidden /></Link>
          <a href="#how" className="dh-play">
            <span className="dh-play-ring"><Play size={14} fill="currentColor" aria-hidden /></span>
            See how it works
          </a>
        </div>
      </div>
    </section>
  );
}

const CSS = `
.dh{position:relative; margin-top:-61px; min-height:max(680px, 100vh); min-height:max(680px, 100svh); background:#3a2a4a; color:#fff; overflow:hidden; isolation:isolate; display:flex; align-items:center}
.dh-still{position:absolute; inset:0; z-index:-3; background:#3a2a4a url('/hero/dusk-poster-w.webp') center/cover no-repeat}
.dh-video{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block; z-index:-2; opacity:0; transition:opacity 1.2s ease}
.dh-video.is-on{opacity:1}
.dh-shade{position:absolute; inset:0; z-index:-1; pointer-events:none; background:
  radial-gradient(ellipse 62% 52% at 50% 50%, rgba(18,12,30,.5) 0%, rgba(18,12,30,.28) 55%, rgba(18,12,30,0) 100%),
  linear-gradient(180deg, rgba(14,10,24,.55) 0%, rgba(14,10,24,0) 22%),
  linear-gradient(0deg, rgba(14,10,24,.55) 0%, rgba(14,10,24,0) 24%)}
.dh-center{position:relative; width:100%; display:flex; flex-direction:column; align-items:center; text-align:center; padding-block:120px 96px}
.dh-kicker{margin:0 0 22px; font-family:var(--mono); font-size:12.5px; letter-spacing:.28em; text-transform:uppercase; color:rgba(255,255,255,.88); font-weight:500; text-shadow:0 1px 14px rgba(0,0,0,.5)}
.dh-h1{margin:0; font-family:var(--display); font-weight:900; text-transform:uppercase; font-size:clamp(54px, 8.4vw, 132px); line-height:.9; letter-spacing:.004em; color:#fff; text-shadow:0 2px 40px rgba(10,6,20,.55); text-wrap:balance}
.dh-sub{margin:26px 0 0; max-width:36ch; font-size:clamp(16px,1.5vw,19px); line-height:1.5; color:rgba(255,255,255,.92); font-weight:500; text-shadow:0 1px 18px rgba(0,0,0,.55)}
.dh-ctas{display:flex; align-items:center; justify-content:center; gap:26px; margin-top:36px; flex-wrap:wrap}
.dh-primary{display:inline-flex; align-items:center; gap:10px; min-height:56px; padding:0 30px; background:#F5C400; color:#141414; font-weight:700; font-size:16px; text-transform:uppercase; letter-spacing:.04em; text-decoration:none; transition:transform .12s, background .2s}
.dh-primary:hover{background:#ffd31a}
.dh-primary:active{transform:translateY(1px)}
.dh-play{display:inline-flex; align-items:center; gap:14px; font-weight:700; font-size:14px; text-transform:uppercase; letter-spacing:.06em; text-decoration:none; color:#fff; text-shadow:0 1px 14px rgba(0,0,0,.5)}
.dh-play-ring{width:48px; height:48px; border-radius:50%; border:1.5px solid rgba(255,255,255,.85); display:flex; align-items:center; justify-content:center; padding-left:3px; transition:background .2s, color .2s}
.dh-play:hover .dh-play-ring{background:#fff; color:#141414}
@keyframes dh-rise{from{opacity:0; transform:translateY(22px)} to{opacity:1; transform:none}}
.dh-kicker{animation:dh-rise 1.1s .2s cubic-bezier(.2,.7,.2,1) both}
.dh-h1{animation:dh-rise 1.2s .4s cubic-bezier(.2,.7,.2,1) both}
.dh-sub{animation:dh-rise 1.1s .7s cubic-bezier(.2,.7,.2,1) both}
.dh-ctas{animation:dh-rise 1.1s .95s cubic-bezier(.2,.7,.2,1) both}
@media (prefers-reduced-motion: reduce){.dh-kicker,.dh-h1,.dh-sub,.dh-ctas{animation:none}}
@media (max-width: 760px){
  .dh{min-height:max(640px, 100svh); align-items:flex-end}
  .dh-still{background-image:url('/hero/dusk-poster-p.webp')}
  .dh-shade{background:linear-gradient(180deg, rgba(14,10,24,.5) 0%, rgba(14,10,24,0) 24%), linear-gradient(0deg, rgba(14,10,24,.82) 0%, rgba(14,10,24,.5) 42%, rgba(14,10,24,0) 68%)}
  .dh-center{padding-block:100px 44px}
  .dh-kicker{font-size:11px; letter-spacing:.2em}
  .dh-h1{font-size:clamp(46px, 14vw, 72px)}
  .dh-sub{font-size:16px; margin-top:18px}
  .dh-ctas{margin-top:26px; gap:18px}
}
`;
