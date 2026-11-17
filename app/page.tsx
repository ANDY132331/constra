"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { HardHat, MapPin, Check, AlertTriangle, ArrowRight, ArrowLeft, Plus, WifiOff, FileSpreadsheet, Wallet } from "lucide-react";
import { PLAY_STORE_URL } from "@/lib/store-app";
import "./home.css";

function readOnboarded(): boolean {
  try {
    const raw = localStorage.getItem("constra_v1");
    return raw ? (JSON.parse(raw) as { onboarded?: boolean })?.onboarded === true : false;
  } catch {
    return false;
  }
}
const noopSubscribe = () => () => {};

const DAY = [
  { time: "06:58", title: "Crew clocks in", body: "A selfie and GPS fix are checked against the site's geofence. Punches from the truck stop or the couch get flagged for review.", chip: { icon: "pin", text: "38 m from site · inside 500 m" }, c: "#F5C400", fg: "#12161C" },
  { time: "09:40", title: "Hazard logged", body: "Open trench, no barricade. Photo, severity and location go into the safety log before anyone forgets.", chip: { icon: "alert", text: "Near miss · Medium" }, c: "#0B4FC4", fg: "#FFFFFF" },
  { time: "13:15", title: "Change order raised", body: "The client wants pot lights in the hallway. Price it, send it, and the project budget updates when they approve.", chip: { icon: "plus", text: "CO-07 · +$1,180" }, c: "#FF6B3D", fg: "#12161C" },
  { time: "16:30", title: "Daily report done", body: "Hours, weather, completed tasks and site photos are already in the report. Review it and share it.", chip: { icon: "check", text: "6 crew · 47.5 h · 12 photos" }, c: "#12161C", fg: "#FFFFFF" },
  { time: "17:05", title: "Invoice out the door", body: "Turn the estimate into an invoice and email a branded PDF to the client the same day the work was done.", chip: { icon: "check", text: "INV-0142 · $8,420.00 · Sent" }, c: "#FFFFFF", fg: "#12161C" },
] as const;

const FEATURES: { group: string; color: string; items: [string, string][] }[] = [
  {
    group: "Crew", color: "#F5C400",
    items: [
      ["GPS clock-in", "Selfie + location on every punch, per-site geofence"],
      ["Site alerts", "A phone alert when someone on the clock leaves the job, with the time and distance"],
      ["Scheduling", "Assign crew by project and shift, with the 7-day forecast"],
      ["Roles", "Separate views for owners, project managers, foremen and crew"],
      ["Messages", "Project chat with photos and files, no group texts"],
    ],
  },
  {
    group: "Hours & money", color: "#FF6B3D",
    items: [
      ["Timesheets", "One page per worker with your logo, as a PDF or Excel file"],
      ["Payroll export", "Hours to CSV, QuickBooks or Gusto; invoices to QuickBooks Online"],
      ["Job costs", "Live labour cost per job against budget, flagged at 80%"],
      ["Estimates & invoices", "Quotes built on site, turned into invoices in one step"],
      ["Change orders", "Priced, approved and tracked against budget"],
      ["Excel templates", "23 ready-made sheets with your logo. Fill them in on screen, then download Excel or PDF"],
    ],
  },
  {
    group: "Site", color: "#BBD6FF",
    items: [
      ["Daily reports", "Hours, weather, tasks and photos, compiled for you"],
      ["Safety log", "Near misses, injuries and hazards with photos"],
      ["Punch lists & RFIs", "Assigned, photographed, closed out, each one a PDF with your logo"],
      ["Equipment & materials", "Service dates, cert expiry, deliveries, low stock"],
      ["Client progress link", "Progress and recent photos for the client, no login, no prices"],
    ],
  },
  {
    group: "Plans & files", color: "#E4E0D2",
    items: [
      ["Blueprints", "Upload drawings and open them on site"],
      ["Documents", "Contracts, permits and specs, versioned by project"],
      ["Photos", "Every site photo, sorted by project and day"],
      ["Morning brief", "A morning summary of crew, overdue tasks and weather risk"],
      ["Forgot-to-clock-out reminder", "A nudge when a shift is still open hours later"],
    ],
  },
];

const FAQ: [string, string][] = [
  ["Do my workers each need to sign up?", "They join your company with an invite code from Settings. It takes about a minute and they only see what their role allows."],
  ["What happens when there's no signal on site?", "Clock-ins and updates are saved on the phone and sync automatically when the connection comes back."],
  ["Can someone clock in from home?", "Every punch records GPS and a photo. If it's outside the geofence you set for that project, it's flagged so you can review it before payroll."],
  ["Does it work on iPhone and Android?", "Yes. Constra runs in the browser on any phone or computer, and you can add it to your home screen like an app. Store apps for iPhone and Android are in testing."],
  ["Does it track my crew all day?", "No. It checks location at clock-in and clock-out, and every few minutes while someone is clocked in with the app open, only to notice when they leave or return to the job site. It saves the time and distance, not a trail of where they went, and stops at clock-out."],
  ["How do hours get into payroll?", "Export hours as a CSV, a Gusto-ready CSV, a QuickBooks Desktop file or a summary to enter in QuickBooks Online, with overtime split out where you've turned it on."],
  ["What does it cost?", "Constra is free during launch, with every feature included and no credit card required."],
  ["Can I take my data and leave?", "Yes. Invoices, reports and timesheets export to PDF, Excel or CSV, and you can delete your account from Settings at any time."],
];

// The phone in the middle of the page flips between real screens from the app
const SCREENS = [
  { label: "Clock in", src: "/site/app-clock.webp", alt: "Constra time screen: a worker on site for 8 hours 8 minutes with a Clock Out button" },
  { label: "Invoices", src: "/site/app-invoices.webp", alt: "Constra invoices list with outstanding, collected and overdue totals" },
  { label: "Daily report", src: "/site/app-daily-report.webp", alt: "Constra daily report screen" },
  { label: "Dashboard", src: "/site/app-dashboard.webp", alt: "Constra dashboard with today's crew and jobs" },
];

const TALK = [
  { tab: "On site only", color: "#0B4FC4", fg: "#FFFFFF", r: "-4deg", icon: "pin", text: "Every punch has a photo and a GPS fix. Clock in from the truck stop and it gets flagged." },
  { tab: "Builds itself", color: "#12161C", fg: "#FFFFFF", r: "3deg", icon: "sheet", text: "Hours, overtime and job costs add up as the crew works. Friday is a button, not a night shift." },
  { tab: "No signal? Fine", color: "#FF6B3D", fg: "#12161C", r: "-2deg", icon: "wifi", text: "Basements, backroads, bad towers. Everything saves on the phone and syncs when signal returns." },
  { tab: "Paid by Friday", color: "#F5C400", fg: "#12161C", r: "4deg", icon: "wallet", text: "Export hours to CSV, QuickBooks or Gusto. Invoices go out as branded PDFs the same day." },
];

function Chip({ icon, text }: { icon: string; text: string }) {
  const Icon = icon === "pin" ? MapPin : icon === "alert" ? AlertTriangle : icon === "plus" ? Plus : Check;
  return (
    <span className="mp-chip">
      <Icon size={13} strokeWidth={2.5} aria-hidden />
      {text}
    </span>
  );
}

function Spark({ style }: { style: React.CSSProperties }) {
  return (
    <svg className="mp-spark" viewBox="0 0 24 24" aria-hidden style={style}>
      <path d="M12 1C12 8 16 12 23 12C16 12 12 16 12 23C12 16 8 12 1 12C8 12 12 8 12 1Z" fill="none" stroke="#151617" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

/* Flat shapes for the yellow scene. Drawn here, not taken from anywhere. */
function Cone() {
  return (
    <svg viewBox="0 0 120 140" aria-hidden>
      <rect x="6" y="118" width="108" height="16" rx="5" fill="#151617" />
      <path d="M60 8 L98 118 H22 Z" fill="#FF6B3D" stroke="#151617" strokeWidth="5" strokeLinejoin="round" />
      <path d="M46 52 H74 L80 70 H40 Z" fill="#fff" />
    </svg>
  );
}
function Hat() {
  return (
    <svg viewBox="0 0 160 110" aria-hidden>
      <path d="M18 88 C18 38 50 14 80 14 C110 14 142 38 142 88 Z" fill="#fff" stroke="#151617" strokeWidth="5" strokeLinejoin="round" />
      <rect x="68" y="6" width="24" height="46" rx="8" fill="#FF6B3D" stroke="#151617" strokeWidth="5" />
      <rect x="6" y="86" width="148" height="18" rx="9" fill="#151617" />
    </svg>
  );
}
function Level() {
  return (
    <svg viewBox="0 0 200 60" aria-hidden>
      <rect x="4" y="8" width="192" height="44" rx="10" fill="#8CC3F4" stroke="#151617" strokeWidth="5" />
      <rect x="76" y="18" width="48" height="24" rx="12" fill="#fff" stroke="#151617" strokeWidth="4" />
      <circle cx="100" cy="30" r="7" fill="#1E7A45" />
    </svg>
  );
}
function Tape() {
  return (
    <svg viewBox="0 0 140 140" aria-hidden>
      <circle cx="70" cy="70" r="62" fill="#BBD6FF" stroke="#151617" strokeWidth="5" />
      <circle cx="70" cy="70" r="26" fill="#fff" stroke="#151617" strokeWidth="5" />
      <path d="M100 98 H136 V114 H92" fill="#fff" stroke="#151617" strokeWidth="5" strokeLinejoin="round" />
      <path d="M44 44 L96 96" stroke="#151617" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}
function Clip() {
  return (
    <svg viewBox="0 0 120 150" aria-hidden>
      <rect x="8" y="14" width="104" height="132" rx="14" fill="#fff" stroke="#151617" strokeWidth="5" />
      <rect x="38" y="4" width="44" height="24" rx="8" fill="#1E7A45" stroke="#151617" strokeWidth="5" />
      <path d="M28 62 H92 M28 88 H92 M28 114 H66" stroke="#151617" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
function Bolt() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden>
      <path d="M60 4 L74 40 L112 40 L82 62 L94 104 L60 80 L26 104 L38 62 L8 40 L46 40 Z" fill="#fff" stroke="#151617" strokeWidth="5" strokeLinejoin="round" />
    </svg>
  );
}

/* "Press Space to jump": a worker hops over cones. Starts only when asked, and only listens while it is on screen. */
function JumpGame() {
  const ref = useRef<HTMLCanvasElement>(null);
  const jumpRef = useRef<() => void>(() => {});
  const [label, setLabel] = useState("Press Space to jump");

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const H = 240;
    const ground = H - 56; let W = 600, raf = 0, last = 0, inView = false;
    const g = { mode: "idle" as "idle" | "play" | "over", y: 0, vy: 0, score: 0, speed: 420, cones: [] as { x: number }[], t: 0, next: 500 };
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.clientWidth;
      cv.width = W * dpr; cv.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const jump = () => {
      if (g.mode === "idle" || g.mode === "over") {
        g.mode = "play"; g.y = 0; g.vy = 0; g.score = 0; g.speed = 420; g.cones = []; g.next = 500; setLabel("");
      }
      if (g.y === 0) g.vy = 820;
    };
    jumpRef.current = jump;
    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.strokeStyle = "#151617"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, ground + 0.5); ctx.lineTo(W, ground + 0.5); ctx.stroke();
      // hills
      ctx.beginPath(); ctx.moveTo(0, ground - 30);
      for (let x = 0; x <= W; x += 20) ctx.lineTo(x, ground - 34 - Math.sin((x + g.t * 40) / 90) * 16);
      ctx.stroke();
      // cones
      for (const c of g.cones) {
        ctx.fillStyle = "#FF6B3D"; ctx.strokeStyle = "#151617"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(c.x + 17, ground - 46); ctx.lineTo(c.x + 32, ground); ctx.lineTo(c.x + 2, ground); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = "#fff"; ctx.fillRect(c.x + 11, ground - 26, 12, 6);
      }
      // worker
      const px = Math.round(W / 2), fy = ground - g.y, run = g.y === 0 && g.mode === "play" ? Math.sin(g.t * 18) * 9 : 0;
      ctx.strokeStyle = "#151617"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(px, fy - 30); ctx.lineTo(px - 8 + run, fy); ctx.moveTo(px, fy - 30); ctx.lineTo(px + 8 - run, fy); ctx.stroke();
      ctx.fillStyle = "#FF6B3D"; ctx.fillRect(px - 11, fy - 62, 22, 34);
      ctx.fillStyle = "#FFD9B8"; ctx.beginPath(); ctx.arc(px, fy - 74, 11, 0, 7); ctx.fill();
      ctx.fillStyle = "#F5C400"; ctx.beginPath(); ctx.arc(px, fy - 77, 12, Math.PI, 0); ctx.fill(); ctx.fillRect(px - 15, fy - 78, 30, 4);
      ctx.fillStyle = "#151617"; ctx.font = "500 14px ui-monospace, monospace"; ctx.textAlign = "right";
      ctx.fillText(g.mode === "idle" ? "" : String(Math.floor(g.score)).padStart(5, "0"), W - 16, 26);
    };
    const step = (now: number) => {
      raf = requestAnimationFrame(step);
      const dt = Math.min(0.04, (now - (last || now)) / 1000); last = now;
      if (!inView) return;
      g.t += dt;
      if (g.mode === "play") {
        g.score += dt * 10; g.speed = 420 + g.score * 1.4;
        g.vy -= 2300 * dt; g.y = Math.max(0, g.y + g.vy * dt); if (g.y === 0 && g.vy < 0) g.vy = 0;
        g.cones.forEach((c) => { c.x -= g.speed * dt; });
        g.cones = g.cones.filter((c) => c.x > -50);
        g.next -= g.speed * dt;
        if (g.next <= 0) { g.cones.push({ x: W + 20 }); g.next = 380 + Math.random() * 360; }
        if (g.cones.some((c) => c.x < W / 2 + 12 && c.x + 32 > W / 2 - 12 && g.y < 40)) { g.mode = "over"; setLabel("Oops. Press Space to go again"); }
      }
      draw();
    };
    const io = new IntersectionObserver(([e]) => { inView = !!e?.isIntersecting && e.intersectionRatio > 0.5; }, { threshold: [0, 0.5, 1] });
    io.observe(cv);
    const key = (e: KeyboardEvent) => {
      if (!inView || (e.code !== "Space" && e.code !== "ArrowUp")) return;
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|select/i.test(t.tagName)) return;
      e.preventDefault(); jump();
    };
    window.addEventListener("keydown", key);
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); io.disconnect(); window.removeEventListener("keydown", key); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="mp-game">
      <canvas ref={ref} role="img" aria-label="A small game: a worker jumps over traffic cones. Press space or tap to jump." onPointerDown={() => jumpRef.current()} />
      {label && <button type="button" className="mp-pill" onClick={() => jumpRef.current()}>{label}</button>}
    </div>
  );
}

export default function LandingPage() {
  const alreadyIn = useSyncExternalStore(noopSubscribe, readOnboarded, () => false);
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [shot, setShot] = useState(0);

  // The opening scene: write progress to CSS variables so nothing re-renders while scrolling or moving the mouse
  useEffect(() => {
    const root = rootRef.current, track = trackRef.current;
    if (!root || !track) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const clamp = (v: number) => Math.min(1, Math.max(0, v));
    const ease = (v: number) => 1 - Math.pow(1 - v, 3);
    let raf = 0, praf = 0;
    const update = () => {
      raf = 0;
      root.classList.toggle("scrolled", root.scrollTop > 40);
      if (reduce) return;
      const r = track.getBoundingClientRect();
      const p = clamp(-r.top / Math.max(1, r.height - window.innerHeight));
      track.style.setProperty("--m", ease(clamp((p - 0.04) / 0.36)).toFixed(3));
      track.style.setProperty("--f", ease(clamp((p - 0.1) / 0.4)).toFixed(3));
      track.style.setProperty("--w", ease(clamp((p - 0.46) / 0.2)).toFixed(3));
      track.style.setProperty("--h", clamp((p - 0.6) / 0.2).toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    const onMove = (e: PointerEvent) => {
      if (reduce || e.pointerType !== "mouse") return;
      cancelAnimationFrame(praf);
      praf = requestAnimationFrame(() => {
        track.style.setProperty("--mx", ((e.clientX / window.innerWidth - 0.5) * 2).toFixed(3));
        track.style.setProperty("--my", ((e.clientY / window.innerHeight - 0.5) * 2).toFixed(3));
      });
    };
    update();
    root.addEventListener("scroll", onScroll, { passive: true });
    root.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { root.removeEventListener("scroll", onScroll); root.removeEventListener("pointermove", onMove); window.removeEventListener("resize", onScroll); cancelAnimationFrame(raf); cancelAnimationFrame(praf); };
  }, []);

  // The page scrolls inside this fixed container, so in-page anchors need manual scrolling
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      const id = a?.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.scrollTo({ top: target.getBoundingClientRect().top + root.scrollTop - 90, behavior: reduce ? "auto" : "smooth" });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  // Headings and blocks ease in as they scroll into view; nothing is hidden until this has run
  useEffect(() => {
    const root = rootRef.current;
    if (!root || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
    const els = Array.from(root.querySelectorAll<HTMLElement>(".mp-big, .mp-label, .mp-group, .mp-day-card, .mp-tile, .mp-frame, .mp-price-card, .mp-faq-list details, .mp-watch-grid p"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { (e.target as HTMLElement).classList.add("rv-in"); io.unobserve(e.target); } });
    }, { root, rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
    els.forEach((el, i) => { el.classList.add("rv"); el.style.setProperty("--rv-d", `${(i % 4) * 70}ms`); io.observe(el); });
    return () => { io.disconnect(); els.forEach((el) => el.classList.remove("rv", "rv-in")); };
  }, []);

  const startHref = alreadyIn ? "/dashboard" : "/onboarding";
  const startLabel = alreadyIn ? "Open dashboard" : "Start free";
  const flip = (d: number) => setShot((s) => (s + d + SCREENS.length) % SCREENS.length);

  return (
    <div ref={rootRef} className="mp">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />
      <a href="#main" className="mp-skip">Skip to content</a>

      <div className="mp-bar">Pre-launch · Free while we launch<span className="mp-bar-x"> · Works with no signal</span></div>

      <div className="mp-head" role="banner">
        <div className="mp-head-in">
          <Link href="/" className="mp-logo" aria-label="Constra home">
            <span className="mp-logo-mark"><HardHat size={18} strokeWidth={2.5} aria-hidden /></span>
            Constra
          </Link>
          <nav className="mp-nav" aria-label="Main">
            <span className="mp-nav-links">
              <a className="mp-pill" href="#how">How it works</a>
              <a className="mp-pill" href="#features">Features</a>
              <a className="mp-pill" href="#faq">FAQ</a>
            </span>
            {!alreadyIn && <Link href="/login" className="mp-pill mp-signin">Sign in</Link>}
            <Link href={startHref} className="mp-pill mp-pill-orange">{startLabel}</Link>
          </nav>
        </div>
      </div>

      <main id="main">
        {/* Opening scene: yellow hero, the phone rises in, blueprint blue floods around it */}
        <div ref={trackRef} className="mp-track">
          <div className="mp-stage">
            <div className="mp-hero">
              <Spark style={{ left: "24%", top: "14%", ["--s" as string]: "30px" }} />
              <Spark style={{ right: "22%", top: "13%", ["--s" as string]: "24px", ["--dl" as string]: "-2s" }} />
              <Spark style={{ left: "10%", top: "70%", ["--s" as string]: "28px", ["--dl" as string]: "-4s" }} />
              <Spark style={{ right: "9%", top: "68%", ["--s" as string]: "34px", ["--dl" as string]: "-1s" }} />
              <div className="mp-pop" style={{ left: "2.5%", top: "34%", width: "clamp(70px, 11vw, 160px)", ["--r" as string]: "-12deg", ["--pd" as string]: ".5s", ["--z" as string]: 18 }}><Hat /></div>
              <div className="mp-pop hide-sm" style={{ left: "3%", top: "56%", width: "clamp(50px, 7vw, 100px)", ["--r" as string]: "8deg", ["--pd" as string]: ".7s", ["--z" as string]: 26 }}><Cone /></div>
              <div className="mp-pop" style={{ right: "2.5%", top: "34%", width: "clamp(56px, 9vw, 130px)", ["--r" as string]: "10deg", ["--pd" as string]: ".6s", ["--z" as string]: -18 }}><Clip /></div>
              <div className="mp-pop hide-sm" style={{ right: "3%", top: "56%", width: "clamp(56px, 8vw, 120px)", ["--r" as string]: "-8deg", ["--pd" as string]: ".8s", ["--z" as string]: -26 }}><Tape /></div>
              <div className="mp-pop hide-sm" style={{ left: "2.5%", top: "17%", width: "clamp(70px, 9vw, 130px)", ["--r" as string]: "-5deg", ["--pd" as string]: ".9s", ["--z" as string]: 12 }}><Level /></div>
              <div className="mp-pop hide-sm" style={{ right: "3.5%", top: "16%", width: "clamp(40px, 5vw, 76px)", ["--r" as string]: "14deg", ["--pd" as string]: "1s", ["--z" as string]: -12 }}><Bolt /></div>

              <h1 className="mp-h1" aria-label="Run the job, not the paperwork">
                <span aria-hidden>Run the job</span>
                <span aria-hidden>not the</span>
                <span aria-hidden>paperwork</span>
              </h1>

              <div className="mp-hero-foot">
                <div className="mp-hero-l mp-intro">
                  <p>The free crew app for small contractors. Timesheets build themselves, and Friday payroll is one button.</p>
                  <Link href={startHref} className="mp-pill mp-pill-orange mp-pill-big">{startLabel} <ArrowRight size={20} aria-hidden /></Link>
                </div>
                <div className="mp-hero-r mp-intro">
                  <a href="#how" className="mp-pill mp-pill-big">See how it works</a>
                  <small>GPS + photo clock-in<br />Works offline</small>
                </div>
              </div>
            </div>

            <div className="mp-flood">
              <p className="mp-flood-label"><i /> Every screen is the real app</p>
              <div className="mp-words" aria-hidden>
                <span><i>Every</i><i>punch</i></span>
                <span><i>is</i><i>checked.</i></span>
              </div>
              <h2 className="mp-sr">Every punch is checked.</h2>
              <figure className="mp-float mp-float-a">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/site/site-morning.webp" width={1400} height={864} loading="lazy" decoding="async" alt="A 3D view of a job site in the morning" />
                <figcaption>06:58 · Crew clocks in</figcaption>
              </figure>
              <figure className="mp-float mp-float-b">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/site/site-midday.webp" width={1400} height={864} loading="lazy" decoding="async" alt="The same job site at midday with steel going up" />
                <figcaption>12:00 · Level 4 steel</figcaption>
              </figure>
              <figure className="mp-float mp-float-c">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/site/site-afternoon.webp" width={1400} height={864} loading="lazy" decoding="async" alt="The same job site in the afternoon with the deck poured" />
                <figcaption>16:00 · Report sent</figcaption>
              </figure>
            </div>

            <div className="mp-phone-wrap">
              <div className="mp-tilt">
                <div className="mp-phone-in">
                  <div className="mp-phone-box">
                    <div className="mp-phone">
                      {SCREENS.map((s, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={s.src} src={s.src} alt={i === shot ? s.alt : ""} aria-hidden={i !== shot} width={780} height={1688} className={i === shot ? "on" : ""} decoding="async" fetchPriority={i === 0 ? "high" : "auto"} />
                      ))}
                    </div>
                    {shot === 0 && ([
                      { x: 28, y: 22, t: "GPS checked at punch", s: "Where they clocked in", side: "l" },
                      { x: 65, y: 11.7, t: "Export to CSV", s: "One tap to payroll", side: "r" },
                      { x: 12, y: 52, t: "Overtime flagged", s: "Before payroll, not after", side: "l" },
                      { x: 49, y: 62, t: "Hours add up live", s: "Today across the crew", side: "l" },
                      { x: 85, y: 76, t: "Clock a worker out", s: "From the same list", side: "r" },
                    ] as const).map((h, i) => (
                      <div key={h.t} className={"mp-hs mp-hs-" + h.side} style={{ left: h.x + "%", top: h.y + "%", ["--i" as string]: i, ["--x" as string]: h.x }}>
                        <span className="mp-hs-dot" aria-hidden />
                        <span className="mp-hs-chip"><em>{h.t}</em>{h.s}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mp-ctrl">
              <button type="button" className="mp-pill mp-pill-round" onClick={() => flip(-1)} aria-label="Previous screen"><ArrowLeft size={22} aria-hidden /></button>
              <span className="mp-pill mp-pill-yellow" aria-live="polite">{SCREENS[shot].label}</span>
              <button type="button" className="mp-pill mp-pill-round" onClick={() => flip(1)} aria-label="Next screen"><ArrowRight size={22} aria-hidden /></button>
            </div>
          </div>
        </div>

        <section className="mp-spec" aria-label="At a glance">
          <div className="mp-wrap">
            <dl>
              <div><dt>Crew size</dt><dd>Unlimited</dd></div>
              <div><dt>Signal needed</dt><dd>None</dd></div>
              <div><dt>Cost</dt><dd>Free while we launch</dd></div>
              <div><dt>Works on</dt><dd>Any phone</dd></div>
            </dl>
          </div>
        </section>

        {/* What are we talking about */}
        <section id="how" className="mp-talk" aria-label="What Constra is">
          <h2>What is Constra?<br />What are we<br />talking about?</h2>
          <p>(Not another spreadsheet. Promise.)</p>
        </section>
        <div className="mp-cards" role="list" aria-label="What Constra does">
          {TALK.map((c) => (
            <div key={c.tab} role="listitem" className="mp-card" style={{ ["--tab" as string]: c.color, ["--tabfg" as string]: c.fg, ["--r" as string]: c.r }}>
              <div className="mp-card-tab">{c.tab}</div>
              <div className="mp-card-body">
                <p>{c.text}</p>
                {c.icon === "pin" ? <MapPin size={110} strokeWidth={1.6} aria-hidden /> : c.icon === "sheet" ? <FileSpreadsheet size={110} strokeWidth={1.6} aria-hidden /> : c.icon === "wifi" ? <WifiOff size={110} strokeWidth={1.6} aria-hidden /> : <Wallet size={110} strokeWidth={1.6} aria-hidden />}
              </div>
            </div>
          ))}
        </div>

        {/* A day on site */}
        <section id="day" className="mp-day" aria-label="One day on site">
          <div className="mp-wrap">
            <p className="mp-label">How it works</p>
            <h2 className="mp-big">One day on site,<br />start to invoice.</h2>
          </div>
          <ol className="mp-day-row" style={{ listStyle: "none" }}>
            {DAY.map((s, i) => (
              <li key={s.time} className="mp-day-card" style={{ ["--c" as string]: s.c, ["--fg" as string]: s.fg, ["--i" as string]: i, ["--tilt" as string]: i % 2 ? "1.6deg" : "-1.6deg" }}>
                <time>{s.time}</time>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <Chip icon={s.chip.icon} text={s.chip.text} />
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="mp-feat">
          <div className="mp-wrap">
            <p className="mp-label">Everything included on every account</p>
            <div className="mp-letters" role="heading" aria-level={2} aria-label="Features">
              {"Features".split("").map((l, i) => <span key={i} aria-hidden>{l}</span>)}
            </div>
            <div className="mp-groups">
              {FEATURES.map((g) => (
                <div key={g.group} className="mp-group" style={{ ["--g" as string]: g.color }}>
                  <h3>{g.group}</h3>
                  <dl>
                    {g.items.map(([k, v]) => (
                      <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* The 30-second ad */}
        <section id="watch" className="mp-watch" aria-label="See Constra in 30 seconds">
          <div className="mp-wrap mp-watch-grid">
            <div>
              <p className="mp-label">See it in 30 seconds</p>
              <h2 className="mp-big">Friday payroll,<br />without the guessing.</h2>
              <p>Your crew clocks in on their own phones. You hear when someone walks off site on the clock, and timesheets come out with your logo, ready for payroll. Every screen in the video is the real app.</p>
              <Link href={startHref} className="mp-pill mp-pill-orange mp-pill-big">{startLabel} <ArrowRight size={20} aria-hidden /></Link>
            </div>
            <div className="mp-frame">
              <video src="/marketing/constra-ad-web.mp4" poster="/marketing/constra-ad-poster.webp" controls playsInline preload="none" aria-label="Constra in 30 seconds: from paper timesheets to the app" />
            </div>
          </div>
        </section>

        {/* Built for the field */}
        <section className="mp-field">
          <div className="mp-wrap">
            <p className="mp-label">Built for the field</p>
            <h2 className="mp-big">Made for gloves, glare<br />and one bar of signal.</h2>
            <div className="mp-field-grid">
              <div className="mp-tile" style={{ ["--bg" as string]: "#0B4FC4", ["--tfg" as string]: "#FFFFFF" }}><b>Offline</b><h3>No signal, no problem</h3><p>Clock-ins, reports and photos save on the phone and sync when signal returns.</p></div>
              <div className="mp-tile" style={{ ["--bg" as string]: "#F5C400" }}><b>500 m</b><h3>Geofence</h3><p>Set each site&apos;s radius on a map. 500 m by default, adjustable per project.</p></div>
              <div className="mp-tile" style={{ ["--bg" as string]: "#12161C", ["--tfg" as string]: "#FFFFFF" }}><b>15</b><h3>Languages</h3><p>Menus and sign-up in 15 languages, from Spanish and Polish to Hindi, Arabic and Chinese. Each person picks their own.</p></div>
              <div className="mp-tile" style={{ ["--bg" as string]: "#FF6B3D" }}><b>OT</b><h3>Overtime your way</h3><p>Pick a ready-made rule set or write your own, then overtime is worked out from the punches, ready for payroll.</p></div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="mp-price">
          <div className="mp-wrap mp-price-grid">
            <div>
              <p className="mp-label">Pricing</p>
              <h2 className="mp-big">Free during launch.</h2>
              <p style={{ fontSize: 19, maxWidth: "44ch", margin: "20px 0 0" }}>Every feature, unlimited crew, no credit card. Sign up, invite your crew and run your next job on it.</p>
            </div>
            <div className="mp-price-card">
              <div className="mp-price-top"><span style={{ font: "500 13px var(--mono)", letterSpacing: ".1em", textTransform: "uppercase" }}>Constra · Launch</span><b>$0</b></div>
              <ul>
                {["Unlimited crew and projects", "GPS + photo clock-in, with site alerts", "Timesheets with your logo (PDF and Excel)", "Estimates, invoices and change orders", "Live job costs against budget", "Payroll export (CSV, QuickBooks, Gusto)", "Daily reports, safety logs and AI assistant"].map((f) => (
                  <li key={f}><Check size={17} strokeWidth={2.8} aria-hidden />{f}</li>
                ))}
              </ul>
              <Link href={startHref} className="mp-pill mp-pill-orange mp-pill-big" style={{ width: "100%" }}>{startLabel} <ArrowRight size={20} aria-hidden /></Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mp-faq">
          <div className="mp-wrap">
            <h2 className="mp-big">Questions<br />from the site.</h2>
            <div className="mp-faq-list">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}<Plus size={24} aria-hidden /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final call */}
        <section className="mp-final">
          <div className="mp-wrap">
            <h2 className="mp-big">Get your crew on it<br />before Monday.</h2>
            <div className="mp-final-btns">
              <Link href={startHref} className="mp-pill mp-pill-orange mp-pill-big">{startLabel} <ArrowRight size={20} aria-hidden /></Link>
              {PLAY_STORE_URL && <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="mp-link">Get the Android app</a>}
            </div>
          </div>
        </section>
      </main>

      <footer className="mp-foot">
        <JumpGame />
        <div className="mp-wrap mp-foot-row">
          <div>
            <strong style={{ font: "700 20px var(--display)", textTransform: "uppercase" }}>Constra</strong>
            <p style={{ margin: "4px 0 0", color: "var(--ink2)" }}>Run the job, not the paperwork. Pre-launch: free while we launch.</p>
          </div>
          <nav aria-label="Footer">
            <Link href="/login">Sign in</Link>
            <Link href="/onboarding">Create account</Link>
            <Link href="/for">Trades</Link>
            <Link href="/solutions">Solutions</Link>
            <Link href="/support">Support</Link>
            <a href="https://www.youtube.com/@getconstra" target="_blank" rel="noopener noreferrer">YouTube</a>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <p style={{ margin: 0, font: "400 13px var(--mono)", color: "var(--ink2)", width: "100%" }}>© {new Date().getFullYear()} Constra · getconstra.com</p>
        </div>
      </footer>
    </div>
  );
}

const JSON_LD = JSON.stringify([
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Constra",
    url: "https://getconstra.com",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Android, iOS, Web",
    description: "Field workforce management for construction and trades: GPS-verified timesheets, daily reports, safety logs, change orders and invoices.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "CAD" },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  },
]).replace(/</g, "\\u003c");
