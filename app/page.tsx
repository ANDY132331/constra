"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight } from "lucide-react";

// ── Auth check ────────────────────────────────────────────────────────────────
function isAlreadyOnboarded(): boolean {
  try {
    const raw = localStorage.getItem("constra_v1");
    if (!raw) return false;
    const data = JSON.parse(raw) as { onboarded?: boolean };
    return data?.onboarded === true;
  } catch {
    return false;
  }
}

// ── Data ──────────────────────────────────────────────────────────────────────
const TOOLS = [
  { title: "GPS Clock-In + Photos",    body: "Workers clock in with a live selfie, GPS-verified to your job site. Off-site check-ins flagged automatically.",     color: "#22c55e" },
  { title: "Estimates & Invoices",     body: "Build itemised estimates in the field, convert to professional invoices in one tap, export branded PDFs.",           color: "#F5C400" },
  { title: "Safety Incident Logs",     body: "Log near-misses, injuries, and hazards on the spot with photos. Generate compliance reports instantly.",             color: "#ef4444" },
  { title: "Project & Task Tracking",  body: "Track every project from start to finish. Assign tasks by trade, set due dates, and monitor progress in real time.", color: "#3b82f6" },
  { title: "Daily Reports",            body: "Auto-generated daily site reports from clock-in data, weather, and tasks. Share with clients in one tap.",           color: "#8b5cf6" },
  { title: "Crew Scheduling",          body: "Weather-aware calendar with 7-day forecast. Schedule crew by project and shift. Conflict detection built in.",       color: "#06b6d4" },
  { title: "Equipment Management",     body: "Track status, assignment, daily rate, and maintenance schedules across all your job sites.",                         color: "#84cc16" },
  { title: "Material Tracker",         body: "Log deliveries and usage by trade and project. Auto low-stock alerts. Exportable by project or date range.",        color: "#f97316" },
  { title: "RFIs & Punch Lists",       body: "Create and assign punch items with photos. Track RFIs from submission to close without email chains.",              color: "#a78bfa" },
  { title: "Budget & Change Orders",   body: "Monitor spend against budget in real time. Issue change orders with one tap and keep clients informed.",             color: "#10b981" },
  { title: "Blueprints & Documents",   body: "Upload, annotate, and share blueprints directly in the app. Organise all project documents by trade.",             color: "#64748b" },
  { title: "AI Daily Brief",           body: "AI-generated morning briefing — crew status, overdue tasks, weather risks, and what to tackle first.",             color: "#F5C400" },
] as const;

const TESTIMONIALS = [
  {
    quote: "Constra replaced three separate apps we were paying for. Clock-ins, invoices, and safety logs all in one place. Our crew picked it up in an afternoon.",
    name: "James Holloway",
    company: "Holloway General Contracting",
    trade: "General Contractor",
  },
  {
    quote: "The GPS clock-in stopped the phantom hours overnight. First month we saved over $4,000 in disputed time. I wish we had found this two years ago.",
    name: "Maria Santos",
    company: "Santos Electrical",
    trade: "Electrical Contractor",
  },
  {
    quote: "I send professional invoices from the job site the same day the work is done. Clients pay faster and I stopped chasing cheques. Totally changed how I run my business.",
    name: "Derek Nguyen",
    company: "Nguyen Plumbing & HVAC",
    trade: "Plumbing & HVAC",
  },
] as const;

const BC = "var(--font-barlow-condensed)";

// ── 3D tilt card hook ─────────────────────────────────────────────────────────
function useTilt(strength = 12) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      el.style.transform = `perspective(600px) rotateY(${x * strength}deg) rotateX(${-y * strength}deg) scale3d(1.02,1.02,1.02)`;
    };
    const onLeave = () => { el.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale3d(1,1,1)"; };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => { el.removeEventListener("mousemove", onMove); el.removeEventListener("mouseleave", onLeave); };
  }, [strength]);
  return ref;
}

// ── Hero parallax ─────────────────────────────────────────────────────────────
function useParallax() {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const scroll = () => {
      if (!ref.current) return;
      const y = window.scrollY;
      const bg = ref.current.querySelector<HTMLElement>(".par-bg");
      const mid = ref.current.querySelector<HTMLElement>(".par-mid");
      if (bg) bg.style.transform = `translateY(${y * 0.45}px)`;
      if (mid) mid.style.transform = `translateY(${y * 0.18}px)`;
    };
    window.addEventListener("scroll", scroll, { passive: true });
    return () => window.removeEventListener("scroll", scroll);
  }, []);
  return ref;
}

// ── Tilt card component ───────────────────────────────────────────────────────
function TiltCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useTilt(10);
  return (
    <div ref={ref} style={{ transition: "transform 0.12s ease-out", willChange: "transform", ...style }}>
      {children}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [alreadyIn, setAlreadyIn] = useState(false);
  const heroRef = useParallax();
  const heroMouseRef = useRef<HTMLElement>(null);

  // Detect returning user — show "Go to Dashboard" in nav, but never auto-redirect
  // so the landing page is always visible to everyone who opens the URL.
  useEffect(() => {
    setAlreadyIn(isAlreadyOnboarded());
  }, []);

  // Mouse parallax on hero
  useEffect(() => {
    const el = heroMouseRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      const dx = (e.clientX - cx) / cx, dy = (e.clientY - cy) / cy;
      const l1 = el.querySelector<HTMLElement>(".hero-d1");
      const l2 = el.querySelector<HTMLElement>(".hero-d2");
      const l3 = el.querySelector<HTMLElement>(".hero-d3");
      if (l1) l1.style.transform = `translate(${dx * -18}px, ${dy * -12}px)`;
      if (l2) l2.style.transform = `translate(${dx * 22}px, ${dy * 14}px)`;
      if (l3) l3.style.transform = `translate(${dx * -8}px, ${dy * 8}px)`;
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);

  // Scroll reveal + counters
  useEffect(() => {
    let cancelled = false;
    document.body.classList.add("reveal-active");
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("revealed"); revObs.unobserve(e.target); } });
    }, { threshold: 0.06, rootMargin: "0px 0px -30px 0px" });
    document.querySelectorAll(".reveal").forEach(el => revObs.observe(el));

    const cntObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const target = parseInt(el.dataset.target || "0");
        const suffix = el.dataset.suffix || "", prefix = el.dataset.prefix || "";
        const dur = 1600, start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.floor(eased * target).toLocaleString() + suffix;
          if (p < 1 && !cancelled) requestAnimationFrame(tick);
        };
        tick(); cntObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll(".counter").forEach(el => cntObs.observe(el));

    const mq = document.getElementById("mq");
    if (mq) {
      let pos = 0;
      const run = () => { if (cancelled) return; pos -= 0.45; if (pos <= -mq.scrollWidth / 2) pos = 0; mq.style.transform = `translateX(${pos}px)`; requestAnimationFrame(run); };
      run();
    }

    return () => { cancelled = true; document.body.classList.remove("reveal-active"); };
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;700;800;900&display=swap');

        :root { --bc: 'Barlow Condensed', sans-serif; }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        /* Reveal */
        .reveal-active .reveal { opacity: 0; transform: translateY(32px); transition: opacity .7s cubic-bezier(.2,.8,.3,1), transform .7s cubic-bezier(.2,.8,.3,1); }
        .reveal-active .reveal.revealed { opacity: 1; transform: translateY(0); }
        .reveal-active .reveal.stagger-1 { transition-delay: 80ms; }
        .reveal-active .reveal.stagger-2 { transition-delay: 160ms; }
        .reveal-active .reveal.stagger-3 { transition-delay: 240ms; }
        .reveal-active .reveal.stagger-4 { transition-delay: 320ms; }

        /* Floating animation */
        @keyframes float { 0%,100%{transform:translateY(0px)} 50%{transform:translateY(-14px)} }
        @keyframes float2 { 0%,100%{transform:translateY(0px) rotate(2deg)} 50%{transform:translateY(-10px) rotate(-2deg)} }
        @keyframes pulse { 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes glowpulse { 0%,100%{box-shadow:0 0 30px rgba(245,196,0,.15)} 50%{box-shadow:0 0 60px rgba(245,196,0,.35)} }

        /* Grid floor */
        .grid-floor {
          background-image: linear-gradient(rgba(245,196,0,.06) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(245,196,0,.06) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: linear-gradient(to bottom, transparent 0%, rgba(0,0,0,.8) 30%, rgba(0,0,0,.8) 70%, transparent 100%);
        }

        /* 3D perspective grid */
        .perspective-grid {
          perspective: 800px;
          perspective-origin: 50% 0%;
        }
        .perspective-grid-inner {
          transform: rotateX(65deg);
          background-image: linear-gradient(rgba(245,196,0,.08) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(245,196,0,.08) 1px, transparent 1px);
          background-size: 80px 80px;
          width: 200%;
          left: -50%;
          position: absolute;
          bottom: 0;
          height: 400px;
          mask-image: linear-gradient(to top, rgba(0,0,0,.5) 0%, transparent 80%);
        }

        /* Glass cards */
        .glass {
          background: rgba(255,255,255,.04);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,.1);
        }
        .glass-gold {
          background: rgba(245,196,0,.06);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(245,196,0,.2);
        }

        /* Neon glow */
        .glow-gold { box-shadow: 0 0 40px rgba(245,196,0,.2), 0 0 80px rgba(245,196,0,.08); }
        .glow-green { box-shadow: 0 0 40px rgba(34,197,94,.2), 0 0 80px rgba(34,197,94,.08); }
        .text-glow { text-shadow: 0 0 40px rgba(245,196,0,.5); }

        /* Tool card hover */
        .tool-card {
          transition: transform .25s cubic-bezier(.2,.8,.3,1), box-shadow .25s ease, background .2s;
        }
        .tool-card:hover {
          transform: perspective(600px) rotateX(-4deg) translateY(-4px) scale(1.01);
          background: #141414 !important;
        }

        /* Testimonial card */
        .test-card {
          transition: transform .3s cubic-bezier(.2,.8,.3,1), box-shadow .3s ease;
        }
        .test-card:hover {
          transform: perspective(800px) rotateY(-4deg) translateY(-6px);
          box-shadow: 20px 20px 60px rgba(0,0,0,.6), -2px 0 0 rgba(245,196,0,.4);
        }

        /* Stat tile */
        .stat-tile {
          transition: transform .25s ease, box-shadow .25s ease;
        }
        .stat-tile:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 0 20px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(245,196,0,.2), 0 0 40px rgba(245,196,0,.1);
        }

        /* CTA button */
        .btn-3d {
          position: relative;
          transition: transform .15s ease, box-shadow .15s ease;
          transform: perspective(200px) rotateX(0deg);
        }
        .btn-3d:hover {
          transform: perspective(200px) rotateX(4deg) translateY(-2px);
          box-shadow: 0 16px 40px rgba(245,196,0,.4), 0 4px 0 rgba(180,140,0,1);
        }
        .btn-3d:active {
          transform: perspective(200px) rotateX(4deg) translateY(2px);
          box-shadow: 0 4px 20px rgba(245,196,0,.2), 0 1px 0 rgba(180,140,0,1);
        }

        /* Ghost button */
        .btn-ghost {
          transition: transform .15s ease, box-shadow .15s ease, background .15s, color .15s;
        }
        .btn-ghost:hover {
          background: rgba(255,255,255,.06) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.3);
        }

        /* Nav */
        .nav-link { transition: color .15s; }
        .nav-link:hover { color: rgba(255,255,255,.85) !important; }

        /* Depth divider line */
        .depth-line {
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(245,196,0,.3) 30%, rgba(245,196,0,.6) 50%, rgba(245,196,0,.3) 70%, transparent);
        }

        /* Radial glow blob */
        .glow-blob {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          pointer-events: none;
        }

        /* Photo section 3D text */
        .cinematic-text {
          font-family: var(--bc), 'Barlow Condensed', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: -0.02em;
          line-height: 0.87;
        }

        /* Section eyebrow */
        .eyebrow {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .2em;
          text-transform: uppercase;
        }

        /* Pill badge */
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(245,196,0,.3);
          padding: 6px 14px;
          background: rgba(245,196,0,.06);
          border-radius: 2px;
        }

        /* Horizontal scroll marquee */
        #mq-wrap { overflow: hidden; position: relative; }
        #mq-wrap::before, #mq-wrap::after {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          width: 120px;
          z-index: 2;
          pointer-events: none;
        }
        #mq-wrap::before { left: 0; background: linear-gradient(to right, #050505, transparent); }
        #mq-wrap::after { right: 0; background: linear-gradient(to left, #050505, transparent); }

        /* Mobile overrides */
        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .hero-d1, .hero-d2, .hero-d3 { transition: none !important; }
          .tool-card:hover { transform: none; }
          .test-card:hover { transform: translateY(-4px); }
          .stat-tile:hover { transform: translateY(-2px); }
        }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #050505; }
        ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 2px; }
      `}</style>

      <div style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "#050505", color: "#fff" }}>

        {/* ── NAV ───────────────────────────────────────────────────────────── */}
        <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(5,5,5,.88)", borderBottom: "1px solid rgba(255,255,255,.05)", backdropFilter: "blur(24px)" }}>
          <div style={{ maxWidth: 1320, margin: "0 auto", padding: "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, background: "#F5C400", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 20px rgba(245,196,0,.3)" }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="8" width="4" height="7" rx="0.5" fill="#000"/>
                  <rect x="6" y="3" width="4" height="12" rx="0.5" fill="#000"/>
                  <rect x="11" y="5.5" width="4" height="9.5" rx="0.5" fill="#000"/>
                </svg>
              </div>
              <span style={{ fontFamily: BC, fontWeight: 900, fontSize: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>Constra</span>
            </div>
            {/* Nav links */}
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <a href="#tools" className="nav-link" style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "none", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Tools</a>
              <a href="#testimonials" className="nav-link hide-mobile" style={{ fontSize: 11, color: "rgba(255,255,255,.35)", textDecoration: "none", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Reviews</a>
              {!alreadyIn && (
                <Link href="/login" className="nav-link" style={{ fontSize: 11, color: "rgba(255,255,255,.3)", textDecoration: "none", fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase" }}>Sign In</Link>
              )}
              <Link href={alreadyIn ? "/dashboard" : "/onboarding"} className="btn-3d" style={{ background: "#F5C400", color: "#000", fontWeight: 900, fontFamily: BC, fontSize: 12, padding: "10px 22px", textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", boxShadow: "0 0 20px rgba(245,196,0,.25)" }}>
                {alreadyIn ? "Go to Dashboard →" : "Get Started →"}
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <section
          ref={(el) => {
            (heroRef as React.MutableRefObject<HTMLElement | null>).current = el;
            (heroMouseRef as React.MutableRefObject<HTMLElement | null>).current = el;
          }}
          style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", background: "#050505", overflow: "hidden", paddingTop: 60 }}
        >
          {/* Background photo - parallax layer */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="par-bg"
            src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80"
            alt=""
            aria-hidden
            style={{ position: "absolute", inset: 0, width: "100%", height: "115%", objectFit: "cover", opacity: 0.28, willChange: "transform" }}
          />

          {/* Perspective grid floor */}
          <div className="perspective-grid" style={{ position: "absolute", inset: 0 }}>
            <div className="perspective-grid-inner" />
          </div>

          {/* Glow blobs */}
          <div className="glow-blob" style={{ width: 600, height: 600, background: "rgba(245,196,0,.08)", top: "10%", left: "-10%" }} />
          <div className="glow-blob" style={{ width: 500, height: 500, background: "rgba(59,130,246,.05)", top: "20%", right: "-8%" }} />

          {/* Gradient overlays */}
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(5,5,5,.97) 0%, rgba(5,5,5,.80) 55%, rgba(5,5,5,.40) 100%)" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 200, background: "linear-gradient(to top, #050505, transparent)" }} />

          {/* Yellow left accent */}
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, transparent, #F5C400 20%, #F5C400 80%, transparent)", boxShadow: "0 0 24px rgba(245,196,0,.4)" }} />

          {/* ── 3D floating depth cards (desktop) ─ */}
          {/* Floating UI mockup card 1 */}
          <div className="hero-d1 hide-mobile" style={{ position: "absolute", right: "6%", top: "18%", animation: "float 6s ease-in-out infinite", willChange: "transform", zIndex: 3 }}>
            <TiltCard style={{ width: 200, padding: "16px 18px", borderRadius: 12, background: "rgba(20,20,20,.9)", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 24px 80px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.05)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px rgba(34,197,94,.6)" }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: "#22c55e", letterSpacing: ".08em", textTransform: "uppercase" }}>GPS Verified</span>
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,.5)", marginBottom: 8 }}>3 workers clocked in</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {["Mike T.", "Sarah L.", "Dev K."].map((n, i) => (
                  <div key={n} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", background: `hsl(${i * 80 + 200}, 60%, 40%)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, fontWeight: 700, color: "#fff" }}>{n[0]}</div>
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,.6)" }}>{n}</span>
                    <span style={{ marginLeft: "auto", fontSize: 9, color: "#22c55e", fontWeight: 700 }}>✓ On site</span>
                  </div>
                ))}
              </div>
            </TiltCard>
          </div>

          {/* Floating card 2 — invoice */}
          <div className="hero-d2 hide-mobile" style={{ position: "absolute", right: "18%", bottom: "22%", animation: "float2 7s ease-in-out infinite", willChange: "transform", zIndex: 3 }}>
            <TiltCard style={{ width: 180, padding: "14px 16px", borderRadius: 10, background: "rgba(20,20,20,.85)", border: "1px solid rgba(245,196,0,.15)", boxShadow: "0 20px 60px rgba(0,0,0,.6), 0 0 20px rgba(245,196,0,.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#F5C400", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 8 }}>Invoice #2041</div>
              <div style={{ fontSize: 22, fontFamily: BC, fontWeight: 900, color: "#fff", lineHeight: 1, marginBottom: 4 }}>$4,800</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", marginBottom: 10 }}>Renovation · Sent today</div>
              <div style={{ height: 1, background: "rgba(255,255,255,.06)", marginBottom: 10 }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,.35)" }}>Status</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: "#22c55e", background: "rgba(34,197,94,.1)", padding: "2px 6px", borderRadius: 2 }}>PAID</span>
              </div>
            </TiltCard>
          </div>

          {/* Floating card 3 — AI brief */}
          <div className="hero-d3 hide-mobile" style={{ position: "absolute", right: "3%", bottom: "28%", animation: "float 8s ease-in-out infinite 2s", willChange: "transform", zIndex: 3 }}>
            <TiltCard style={{ width: 160, padding: "12px 14px", borderRadius: 8, background: "rgba(15,15,15,.9)", border: "1px solid rgba(139,92,246,.2)", boxShadow: "0 16px 40px rgba(0,0,0,.5), 0 0 20px rgba(139,92,246,.08)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#8b5cf6", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 6 }}>AI Daily Brief</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,.55)", lineHeight: 1.5 }}>2 tasks overdue · Rain at 3pm · Crew attendance 94%</div>
            </TiltCard>
          </div>

          {/* Hero content - parallax mid */}
          <div className="par-mid" style={{ position: "relative", zIndex: 4, maxWidth: 1320, margin: "0 auto", padding: "60px 28px 80px", width: "100%", willChange: "transform" }}>

            {/* Badge */}
            <div className="badge" style={{ marginBottom: 32, display: "inline-flex" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C400", flexShrink: 0, animation: "pulse 2s ease-in-out infinite" }} />
              <span className="eyebrow" style={{ color: "#F5C400" }}>100% Free · No Credit Card Required</span>
            </div>

            {/* Headline */}
            <h1 className="cinematic-text" style={{ fontSize: "clamp(68px, 11vw, 152px)", marginBottom: 28, color: "#fff", maxWidth: 780 }}>
              CONSTRA<br />
              <span style={{ color: "#F5C400", textShadow: "0 0 60px rgba(245,196,0,.35)" }}>BUILT FOR</span><br />
              THE JOB SITE.
            </h1>

            {/* Depth line */}
            <div className="depth-line" style={{ width: 280, marginBottom: 28 }} />

            {/* Subhead */}
            <p style={{ fontSize: "clamp(14px,1.3vw,17px)", lineHeight: 1.8, color: "rgba(255,255,255,.55)", maxWidth: 480, marginBottom: 44 }}>
              GPS clock-ins with live photos. Professional invoicing. Crew scheduling. Safety logs. Every tool your job site needs — one app, completely free.
            </p>

            {/* CTAs */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 64 }}>
              <Link href={alreadyIn ? "/dashboard" : "/onboarding"} className="btn-3d" style={{ fontFamily: BC, fontWeight: 900, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", padding: "17px 38px", textDecoration: "none", background: "#F5C400", color: "#000", display: "inline-flex", alignItems: "center", gap: 10 }}>
                {alreadyIn ? "GO TO DASHBOARD →" : "GET STARTED FREE →"}
              </Link>
              <a href="#tools" className="btn-ghost" style={{ fontFamily: BC, fontWeight: 800, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", padding: "17px 38px", textDecoration: "none", border: "1px solid rgba(255,255,255,.16)", color: "rgba(255,255,255,.6)", display: "inline-flex", alignItems: "center", gap: 8 }}>
                SEE OUR TOOLS ↓
              </a>
            </div>

            {/* Stats strip */}
            <div style={{ display: "flex", gap: 0, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,.07)", paddingTop: 32 }}>
              {[
                { n: "12+", label: "Tools Built In" },
                { n: "15", label: "Languages" },
                { n: "$0", label: "To Get Started" },
                { n: "100%", label: "Offline Capable" },
              ].map((s, i) => (
                <div key={i} style={{ paddingRight: 40, marginRight: 40, borderRight: i < 3 ? "1px solid rgba(255,255,255,.07)" : "none", marginBottom: 16 }}>
                  <div style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(32px,4vw,52px)", color: "#F5C400", lineHeight: 1, letterSpacing: "-0.02em", textShadow: "0 0 30px rgba(245,196,0,.3)" }}>{s.n}</div>
                  <div style={{ fontSize: 10, fontWeight: 600, color: "rgba(255,255,255,.35)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scroll indicator */}
          <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)", zIndex: 5, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, opacity: 0.4 }}>
            <div style={{ width: 1, height: 40, background: "linear-gradient(to bottom, #F5C400, transparent)", animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: "#F5C400" }}>Scroll</span>
          </div>
        </section>

        {/* ── ANNOUNCEMENT STRIP ─────────────────────────────────────────── */}
        <div style={{ background: "#F5C400", padding: "13px 28px", display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#000" }}>
            Now available on Android & iOS — Download free
          </span>
          <div style={{ width: 1, height: 16, background: "rgba(0,0,0,.2)" }} />
          <a href="https://play.google.com/store/apps/details?id=com.getconstra.app" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "#000", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            GOOGLE PLAY <ChevronRight size={12} />
          </a>
          <a href="/onboarding" style={{ fontSize: 11, fontWeight: 900, letterSpacing: ".12em", textTransform: "uppercase", color: "#000", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
            IPHONE + WEB <ChevronRight size={12} />
          </a>
        </div>

        {/* ── MARQUEE ──────────────────────────────────────────────────────── */}
        <div id="mq-wrap" style={{ background: "#080808", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "16px 0" }}>
          <div id="mq" style={{ display: "flex", width: "max-content" }}>
            {[...Array(2)].map((_, pass) => (
              <div key={pass} style={{ display: "flex", alignItems: "center" }}>
                {["GPS Clock-In", "Invoices", "Safety Logs", "Daily Reports", "Crew Scheduling", "Blueprints", "Equipment Tracking", "RFIs", "Budget Management", "AI Daily Brief", "Offline-First", "15 Languages", "Change Orders", "Material Tracker", "Punch Lists"].map((item) => (
                  <span key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 32px", fontSize: 10, color: "rgba(255,255,255,.2)", whiteSpace: "nowrap", fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}>
                    <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#F5C400", flexShrink: 0, boxShadow: "0 0 4px rgba(245,196,0,.6)" }} />
                    {item}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ── ABOUT SECTION ─────────────────────────────────────────────────── */}
        <section className="reveal" style={{ background: "#080808", padding: "110px 28px", position: "relative", overflow: "hidden" }}>
          {/* Glow blob */}
          <div className="glow-blob" style={{ width: 500, height: 500, background: "rgba(245,196,0,.06)", top: "10%", right: "0%" }} />

          <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 80, alignItems: "center", position: "relative", zIndex: 1 }}>
            <div>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 36 }}>
                <div style={{ width: 4, background: "#F5C400", alignSelf: "stretch", flexShrink: 0, boxShadow: "0 0 12px rgba(245,196,0,.4)" }} />
                <div>
                  <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 10 }}>ABOUT CONSTRA</p>
                  <h2 className="cinematic-text" style={{ fontSize: "clamp(34px,4vw,62px)", color: "#fff" }}>
                    CONSTRUCTION<br />MANAGEMENT<br />FOR EVERYONE.
                  </h2>
                </div>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,.45)", marginBottom: 20 }}>
                Constra is a full-featured construction management platform built for contractors, foremen, and crews of every size. We give you the same tools that enterprise platforms charge thousands for — completely free.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,.45)", marginBottom: 36 }}>
                From first GPS clock-in to final invoice, Constra keeps your job site organised, your crew accountable, and your clients happy — whether you&apos;re running 3 workers or 300.
              </p>
              <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#F5C400", fontWeight: 800, fontSize: 12, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(245,196,0,.35)", paddingBottom: 4, transition: "gap .2s" }}>
                LEARN MORE <ChevronRight size={13} />
              </Link>
            </div>

            {/* Stat tiles — 3D hover */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3 }}>
              {[
                { target: 12, suffix: "+", label: "Tools in one app", sub: "Time, invoicing, safety & more" },
                { target: 15, suffix: "", label: "Languages", sub: "Your crew speaks them all" },
                { target: 0, prefix: "$", suffix: "", label: "To start", sub: "No credit card needed" },
                { target: 100, suffix: "%", label: "Offline capable", sub: "Works on any job site" },
              ].map((s, i) => (
                <div key={i} className="stat-tile" style={{ padding: "32px 24px", background: "#0f0f0f", border: "1px solid rgba(255,255,255,.05)", borderTop: "3px solid #F5C400", cursor: "default" }}>
                  <div style={{ fontFamily: BC, fontWeight: 900, fontSize: 50, lineHeight: 1, color: "#F5C400", marginBottom: 8, textShadow: "0 0 20px rgba(245,196,0,.3)" }}>
                    <span className="counter" data-target={s.target} data-suffix={s.suffix} data-prefix={s.prefix || ""}>{s.prefix || ""}{s.target}{s.suffix}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,.28)" }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TOOLS ────────────────────────────────────────────────────────── */}
        <section id="tools" style={{ background: "#0d0d0d", padding: "110px 28px", borderTop: "1px solid rgba(255,255,255,.04)", position: "relative", overflow: "hidden" }}>
          <div className="glow-blob" style={{ width: 400, height: 400, background: "rgba(59,130,246,.04)", bottom: "0%", left: "-5%" }} />

          <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="reveal" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 4, height: 60, background: "#F5C400", flexShrink: 0, boxShadow: "0 0 16px rgba(245,196,0,.4)" }} />
              <div>
                <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 10 }}>WHAT WE OFFER</p>
                <h2 className="cinematic-text" style={{ fontSize: "clamp(40px,5.5vw,80px)", color: "#fff" }}>OUR TOOLS</h2>
              </div>
            </div>

            <p className="reveal" style={{ fontSize: 15, color: "rgba(255,255,255,.4)", maxWidth: 560, marginBottom: 56, lineHeight: 1.8 }}>
              Constra gives your team a reputation for bringing projects to completion on schedule and on budget — because every tool you need is in one place, from first clock-in to final invoice.
            </p>

            {/* Tool grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 3 }}>
              {TOOLS.map((tool, i) => (
                <div
                  key={tool.title}
                  className={`tool-card reveal stagger-${(i % 4) + 1}`}
                  style={{ background: "#0a0a0a", borderLeft: `3px solid ${tool.color}`, padding: "26px 22px 24px 20px", cursor: "default", position: "relative", overflow: "hidden" }}
                >
                  {/* Subtle colored glow in corner */}
                  <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, background: `radial-gradient(circle at top right, ${tool.color}18, transparent 70%)`, pointerEvents: "none" }} />
                  <h3 style={{ fontFamily: BC, fontWeight: 800, fontSize: 17, textTransform: "uppercase", color: "#fff", letterSpacing: "0.01em", marginBottom: 10, lineHeight: 1.1 }}>{tool.title}</h3>
                  <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.38)", lineHeight: 1.7, marginBottom: 14 }}>{tool.body}</p>
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: tool.color, display: "flex", alignItems: "center", gap: 4 }}>
                    INCLUDED FREE <ChevronRight size={10} />
                  </span>
                </div>
              ))}
            </div>

            <div className="reveal" style={{ marginTop: 52 }}>
              <Link href="/onboarding" className="btn-3d" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#F5C400", color: "#000", fontFamily: BC, fontWeight: 900, fontSize: 14, letterSpacing: ".06em", textTransform: "uppercase", padding: "16px 38px", textDecoration: "none" }}>
                GET ALL TOOLS FREE →
              </Link>
            </div>
          </div>
        </section>

        {/* ── PHOTO BREAK: GPS ─────────────────────────────────────────────── */}
        <section style={{ position: "relative", minHeight: "80vh", display: "flex", alignItems: "center", overflow: "hidden", background: "#000" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1600&q=80" alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "120%", objectFit: "cover", opacity: 0.35, transform: "translateY(-10%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,.97) 0%, rgba(0,0,0,.80) 50%, rgba(0,0,0,.45) 100%)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, transparent, #22c55e 20%, #22c55e 80%, transparent)", boxShadow: "0 0 24px rgba(34,197,94,.5)" }} />

          {/* 3D depth text layers */}
          <div className="reveal" style={{ position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto", padding: "80px 28px", width: "100%" }}>
            <p className="eyebrow" style={{ color: "#22c55e", marginBottom: 20 }}>GPS VERIFICATION</p>
            <h2 className="cinematic-text" style={{ fontSize: "clamp(48px,9vw,120px)", color: "#fff", marginBottom: 24, textShadow: "0 4px 40px rgba(0,0,0,.8)" }}>
              GPS-VERIFIED<br />CLOCK-INS.<br /><span style={{ color: "#22c55e", textShadow: "0 0 40px rgba(34,197,94,.4)" }}>EVERY TIME.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,.55)", maxWidth: 440, marginBottom: 36 }}>
              Workers clock in with a live selfie, GPS-pinned to your exact site. Off-site check-ins and duplicate clock-ins are flagged automatically. No more phantom hours.
            </p>
            <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#22c55e", fontWeight: 800, fontSize: 12, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(34,197,94,.35)", paddingBottom: 4 }}>
              START FREE TODAY <ChevronRight size={13} />
            </Link>
          </div>
        </section>

        {/* ── SAFETY SECTION ───────────────────────────────────────────────── */}
        <section style={{ background: "#080808", padding: "110px 28px", borderTop: "1px solid rgba(255,255,255,.04)", position: "relative", overflow: "hidden" }}>
          <div className="glow-blob" style={{ width: 400, height: 400, background: "rgba(239,68,68,.04)", top: "10%", right: "0%" }} />

          <div style={{ maxWidth: 1320, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 80, alignItems: "center", position: "relative", zIndex: 1 }}>
            <div className="reveal">
              <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 36 }}>
                <div style={{ width: 4, height: 60, background: "#ef4444", flexShrink: 0, boxShadow: "0 0 16px rgba(239,68,68,.4)" }} />
                <div>
                  <p className="eyebrow" style={{ color: "#ef4444", marginBottom: 10 }}>SAFETY FIRST</p>
                  <h2 className="cinematic-text" style={{ fontSize: "clamp(34px,4vw,62px)", color: "#fff" }}>
                    BUILT FOR<br />A SAFE SITE.
                  </h2>
                </div>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,.45)", marginBottom: 20 }}>
                Constra&apos;s safety tools help you create, administer, and maintain a comprehensive safety program for every job site.
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.85, color: "rgba(255,255,255,.45)", marginBottom: 0 }}>
                Log near-misses, injuries, and hazards with photos the moment they happen. Generate compliance reports in seconds.
              </p>
            </div>

            <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {[
                { title: "INCIDENT LOGGING", body: "Log near-misses, injuries, and hazards on the spot with photo evidence.", color: "#ef4444" },
                { title: "COMPLIANCE REPORTS", body: "Generate safety reports for any date range, job site, or worker in seconds.", color: "#f97316" },
                { title: "HAZARD TRACKING", body: "Track open hazards by site and status. Close items with a photo and signature.", color: "#F5C400" },
                { title: "INSURANCE MANAGEMENT", body: "Store and track insurance policies, expiry dates, and certificates per project.", color: "#22c55e" },
              ].map(item => (
                <div key={item.title} className="tool-card" style={{ background: "#0f0f0f", borderLeft: `3px solid ${item.color}`, padding: "18px 18px 18px 16px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: 0, right: 0, width: 60, height: 60, background: `radial-gradient(circle at top right, ${item.color}14, transparent 70%)`, pointerEvents: "none" }} />
                  <p style={{ fontFamily: BC, fontWeight: 800, fontSize: 13, textTransform: "uppercase", color: "#fff", letterSpacing: ".04em", marginBottom: 6 }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.65 }}>{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PHOTO BREAK: Invoice ─────────────────────────────────────────── */}
        <section style={{ position: "relative", minHeight: "70vh", display: "flex", alignItems: "center", overflow: "hidden", background: "#000" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1600&q=80" alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "120%", objectFit: "cover", opacity: 0.3, transform: "translateY(-10%)" }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(0,0,0,.97) 0%, rgba(0,0,0,.82) 50%, rgba(0,0,0,.45) 100%)" }} />
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: "linear-gradient(to bottom, transparent, #F5C400 20%, #F5C400 80%, transparent)", boxShadow: "0 0 24px rgba(245,196,0,.5)" }} />

          <div className="reveal" style={{ position: "relative", zIndex: 2, maxWidth: 1320, margin: "0 auto", padding: "80px 28px", width: "100%" }}>
            <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 20 }}>INVOICING</p>
            <h2 className="cinematic-text" style={{ fontSize: "clamp(48px,9vw,116px)", color: "#fff", marginBottom: 24 }}>
              STOP CHASING<br /><span style={{ color: "#F5C400", textShadow: "0 0 40px rgba(245,196,0,.4)" }}>INVOICES.</span>
            </h2>
            <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,.55)", maxWidth: 440, marginBottom: 36 }}>
              Build itemised estimates in the field and convert them to professional invoices in one tap. Send branded PDFs directly to your client the same day the work is done.
            </p>
            <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#F5C400", fontWeight: 800, fontSize: 12, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(245,196,0,.35)", paddingBottom: 4 }}>
              START INVOICING FREE <ChevronRight size={13} />
            </Link>
          </div>
        </section>

        {/* ── TESTIMONIALS ─────────────────────────────────────────────────── */}
        <section id="testimonials" style={{ background: "#0d0d0d", padding: "110px 28px", borderTop: "1px solid rgba(255,255,255,.04)", position: "relative", overflow: "hidden" }}>
          <div className="glow-blob" style={{ width: 500, height: 500, background: "rgba(245,196,0,.05)", top: "20%", left: "-10%" }} />

          <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="reveal" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 56 }}>
              <div style={{ width: 4, height: 56, background: "#F5C400", flexShrink: 0, boxShadow: "0 0 16px rgba(245,196,0,.4)" }} />
              <div>
                <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 10 }}>REVIEWS</p>
                <h2 className="cinematic-text" style={{ fontSize: "clamp(34px,4.5vw,70px)", color: "#fff" }}>
                  WHAT CONTRACTORS<br />ARE SAYING
                </h2>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px,1fr))", gap: 3 }}>
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className={`test-card reveal stagger-${i + 1}`} style={{ background: "#0a0a0a", padding: "36px 30px", borderTop: "3px solid #F5C400", position: "relative", overflow: "hidden" }}>
                  {/* Quote glow */}
                  <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: "radial-gradient(circle at top right, rgba(245,196,0,.06), transparent 70%)", pointerEvents: "none" }} />
                  <div style={{ fontFamily: BC, fontWeight: 900, fontSize: 80, color: "#F5C400", lineHeight: 0.7, marginBottom: 18, opacity: 0.5, textShadow: "0 0 20px rgba(245,196,0,.3)" }}>&ldquo;</div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,.6)", lineHeight: 1.85, marginBottom: 28, fontStyle: "italic" }}>
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 20 }}>
                    <p style={{ fontFamily: BC, fontWeight: 800, fontSize: 14, textTransform: "uppercase", color: "#fff", letterSpacing: ".04em" }}>{t.name}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,.3)", marginTop: 3 }}>{t.company}</p>
                    <p style={{ fontSize: 9, color: "#F5C400", marginTop: 2, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>{t.trade}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ──────────────────────────────────────────────────────── */}
        <section id="pricing" style={{ background: "#080808", padding: "110px 28px", borderTop: "1px solid rgba(255,255,255,.04)", position: "relative", overflow: "hidden" }}>
          <div className="glow-blob" style={{ width: 400, height: 400, background: "rgba(245,196,0,.06)", bottom: "0%", right: "5%" }} />

          <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
            <div className="reveal" style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 56 }}>
              <div style={{ width: 4, height: 56, background: "#F5C400", flexShrink: 0, boxShadow: "0 0 16px rgba(245,196,0,.4)" }} />
              <div>
                <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 10 }}>PRICING</p>
                <h2 className="cinematic-text" style={{ fontSize: "clamp(34px,4vw,68px)", color: "#fff" }}>
                  SIMPLE PRICING.<br />FREE FOREVER.
                </h2>
              </div>
            </div>

            <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px,1fr))", gap: 3, marginBottom: 36 }}>
              {[
                { name: "Enterprise Platforms", price: "$600–$1,200/mo", note: "Per project pricing", dim: true },
                { name: "Mid-Market Apps", price: "$200–$500/mo", note: "Features behind paywalls", dim: true },
                { name: "Constra", price: "$0", note: "Every feature, forever", dim: false },
              ].map(c => (
                <div key={c.name} style={{ padding: "26px 22px", border: `1px solid ${c.dim ? "rgba(255,255,255,.04)" : "rgba(245,196,0,.25)"}`, borderTop: `3px solid ${c.dim ? "rgba(255,255,255,.06)" : "#F5C400"}`, background: c.dim ? "rgba(255,255,255,.015)" : "rgba(245,196,0,.04)", opacity: c.dim ? 0.38 : 1, textAlign: "center" }}>
                  <p style={{ fontFamily: BC, fontWeight: 800, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase", color: c.dim ? "rgba(255,255,255,.25)" : "#F5C400", marginBottom: 8 }}>{c.name}</p>
                  <p style={{ fontFamily: BC, fontWeight: 900, fontSize: 34, color: c.dim ? "rgba(255,255,255,.25)" : "#fff", marginBottom: 4 }}>{c.price}</p>
                  <p style={{ fontSize: 10, color: c.dim ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.4)" }}>{c.note}</p>
                </div>
              ))}
            </div>

            {/* Free card — 3D glass */}
            <div className="reveal glass-gold" style={{ maxWidth: 780, borderTop: "4px solid #F5C400", padding: "48px", position: "relative", animation: "glowpulse 4s ease-in-out infinite" }}>
              <div style={{ position: "absolute", top: -14, left: 48, background: "#F5C400", color: "#000", fontSize: 10, fontWeight: 900, padding: "5px 18px", letterSpacing: ".1em", textTransform: "uppercase" }}>FREE ACCESS</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 36 }}>
                <div>
                  <div style={{ fontFamily: BC, fontWeight: 900, fontSize: 76, lineHeight: 1, color: "#fff", textShadow: "0 0 40px rgba(245,196,0,.2)" }}>$0</div>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.3)", marginTop: 4 }}>No credit card · All features included · No limits</p>
                </div>
                <Link href="/onboarding" className="btn-3d" style={{ background: "#F5C400", color: "#000", fontFamily: BC, fontWeight: 900, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", padding: "16px 36px", textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
                  GET STARTED FREE →
                </Link>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: "10px 32px" }}>
                {["Unlimited crew members", "GPS verification on every clock-in", "Estimates & professional invoices", "Safety incident logging", "AI Daily Brief every morning", "Crew messaging with file sharing", "Weather-aware scheduling", "Equipment management", "RFIs & punch lists", "PDF export — invoices & reports", "15-language support", "Works 100% offline"].map(f => (
                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: "rgba(255,255,255,.45)" }}>
                    <Check size={10} color="#F5C400" style={{ flexShrink: 0 }} />{f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────────────────────── */}
        <section style={{ position: "relative", padding: "130px 28px", background: "#000", overflow: "hidden", textAlign: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=80" alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.18 }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.82)" }} />
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#F5C400", boxShadow: "0 0 24px rgba(245,196,0,.5)" }} />

          {/* Perspective grid in CTA */}
          <div className="perspective-grid" style={{ position: "absolute", inset: 0, opacity: 0.6 }}>
            <div className="perspective-grid-inner" />
          </div>

          {/* Glow blobs */}
          <div className="glow-blob" style={{ width: 400, height: 400, background: "rgba(245,196,0,.1)", top: "50%", left: "50%", transform: "translate(-50%,-50%)" }} />

          <div className="reveal" style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto" }}>
            <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 24 }}>GET STARTED TODAY</p>
            <h2 className="cinematic-text" style={{ fontSize: "clamp(52px,9vw,120px)", color: "#fff", marginBottom: 28, textShadow: "0 4px 60px rgba(0,0,0,.8)" }}>
              YOUR SITE,<br />
              <span style={{ color: "#F5C400", textShadow: "0 0 60px rgba(245,196,0,.5)" }}>FINALLY</span><br />
              UNDER CONTROL.
            </h2>
            <div className="depth-line" style={{ width: 200, margin: "0 auto 28px" }} />
            <p style={{ fontSize: 16, lineHeight: 1.85, color: "rgba(255,255,255,.45)", maxWidth: 440, margin: "0 auto 48px" }}>
              The only construction app that covers everything — from first clock-in to final invoice. Free, forever.
            </p>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <Link href={alreadyIn ? "/dashboard" : "/onboarding"} className="btn-3d" style={{ background: "#F5C400", color: "#000", fontFamily: BC, fontWeight: 900, fontSize: 16, letterSpacing: ".06em", textTransform: "uppercase", padding: "20px 56px", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, maxWidth: 440, width: "100%", justifyContent: "center" }}>
                {alreadyIn ? "GO TO DASHBOARD →" : "CREATE FREE ACCOUNT →"}
              </Link>
              {!alreadyIn && (
                <Link href="/login" style={{ fontSize: 11, color: "rgba(255,255,255,.28)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 600 }}>
                  Already have an account? Sign In <ChevronRight size={11} />
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────────────────────── */}
        <footer style={{ background: "#050505", borderTop: "3px solid #F5C400", padding: "52px 28px 36px", boxShadow: "0 -1px 0 rgba(255,255,255,.04)" }}>
          <div style={{ maxWidth: 1320, margin: "0 auto" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 40, marginBottom: 40 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 30, height: 30, background: "#F5C400", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 16px rgba(245,196,0,.3)" }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <rect x="1" y="8" width="4" height="7" rx="0.5" fill="#000"/>
                      <rect x="6" y="3" width="4" height="12" rx="0.5" fill="#000"/>
                      <rect x="11" y="5.5" width="4" height="9.5" rx="0.5" fill="#000"/>
                    </svg>
                  </div>
                  <span style={{ fontFamily: BC, fontWeight: 900, fontSize: 20, letterSpacing: ".04em", textTransform: "uppercase" }}>CONSTRA</span>
                </div>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,.25)", maxWidth: 220, lineHeight: 1.7 }}>Field Workforce Management for Construction & Trades</p>
              </div>
              <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
                <div>
                  <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 14 }}>Platform</p>
                  {[["Sign In", "/login"], ["Get Started", "/onboarding"]].map(([l, h]) => (
                    <div key={h} style={{ marginBottom: 10 }}><Link href={h} style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textDecoration: "none", fontWeight: 500 }}>{l}</Link></div>
                  ))}
                </div>
                <div>
                  <p className="eyebrow" style={{ color: "#F5C400", marginBottom: 14 }}>Company</p>
                  {[["Support", "/support"], ["Terms", "/terms"], ["Privacy", "/privacy"]].map(([l, h]) => (
                    <div key={h} style={{ marginBottom: 10 }}><Link href={h} style={{ fontSize: 12, color: "rgba(255,255,255,.25)", textDecoration: "none", fontWeight: 500 }}>{l}</Link></div>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.12)" }}>© {new Date().getFullYear()} Constra. All rights reserved.</p>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,.12)" }}>getconstra.com · Built for the Field</p>
            </div>
          </div>
        </footer>

      </div>
    </>
  );
}
