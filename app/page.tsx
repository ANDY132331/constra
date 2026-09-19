"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isAlreadyOnboarded()) {
      router.replace("/dashboard");
    } else {
      setChecking(false);
    }
  }, [router]);

  // Scroll reveal + counters — guard with checking so hooks always run
  useEffect(() => {
    if (checking) return;
    let cancelled = false;

    // Scroll reveal
    document.body.classList.add("reveal-active");
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("revealed"); revObs.unobserve(e.target); } });
    }, { threshold: 0.06, rootMargin: "0px 0px -30px 0px" });
    document.querySelectorAll(".reveal").forEach(el => revObs.observe(el));

    // Animated counters
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

    // Marquee
    const mq = document.getElementById("mq");
    if (mq) {
      let pos = 0;
      const run = () => { if (cancelled) return; pos -= 0.45; if (pos <= -mq.scrollWidth / 2) pos = 0; mq.style.transform = `translateX(${pos}px)`; requestAnimationFrame(run); };
      run();
    }

    return () => {
      cancelled = true;
      document.body.classList.remove("reveal-active");
    };
  }, [checking]);

  if (checking) return <div style={{ background: "#080808", width: "100vw", height: "100vh" }} aria-hidden />;

  return (
    <div style={{ position: "fixed", inset: 0, overflowY: "auto", overflowX: "hidden", background: "#000", color: "#fff" }}>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(0,0,0,.92)", borderBottom: "1px solid rgba(255,255,255,.07)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 28px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, background: "#F5C400", borderRadius: 0, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="8" width="4" height="7" rx="0.5" fill="#000"/>
                <rect x="6" y="3" width="4" height="12" rx="0.5" fill="#000"/>
                <rect x="11" y="5.5" width="4" height="9.5" rx="0.5" fill="#000"/>
              </svg>
            </div>
            <span style={{ fontFamily: BC, fontWeight: 900, fontSize: 22, letterSpacing: "0.04em", textTransform: "uppercase" }}>Constra</span>
          </div>
          {/* Nav links + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            <a href="#tools" style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textDecoration: "none", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Tools</a>
            <a href="#testimonials" style={{ fontSize: 12, color: "rgba(255,255,255,.4)", textDecoration: "none", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Reviews</a>
            <Link href="/login" style={{ fontSize: 12, color: "rgba(255,255,255,.35)", textDecoration: "none", fontWeight: 600, letterSpacing: ".04em", textTransform: "uppercase" }}>Sign In</Link>
            <Link href="/onboarding" style={{ background: "#F5C400", color: "#000", fontWeight: 900, fontSize: 12, padding: "9px 20px", borderRadius: 0, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase" }}>
              Get Started Free →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", background: "#000", overflow: "hidden", paddingTop: 58 }}>
        {/* Background photo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80"
          alt=""
          aria-hidden
          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.38 }}
        />
        {/* Left-to-right overlay for text readability */}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,.92) 0%, rgba(0,0,0,.72) 50%, rgba(0,0,0,.3) 100%)" }} />
        {/* Bottom fade */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 180, background: "linear-gradient(to top, #000, transparent)" }} />
        {/* Yellow left accent bar */}
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: "#F5C400" }} />

        {/* Hero content */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 1280, margin: "0 auto", padding: "60px 52px 80px", width: "100%" }}>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 32, border: "1px solid rgba(245,196,0,.35)", padding: "7px 16px", background: "rgba(245,196,0,.06)" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5C400", flexShrink: 0, animation: "pulse 2s ease-in-out infinite" }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".18em", textTransform: "uppercase", color: "#F5C400" }}>100% Free · No Credit Card Required</span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(72px, 11vw, 148px)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.87, marginBottom: 32, color: "#fff" }}>
            CONSTRA<br />
            <span style={{ color: "#F5C400" }}>BUILT FOR</span><br />
            THE JOB SITE.
          </h1>

          {/* Subhead */}
          <p style={{ fontSize: "clamp(15px,1.4vw,18px)", lineHeight: 1.75, color: "rgba(255,255,255,.65)", maxWidth: 520, marginBottom: 44 }}>
            GPS clock-ins with live photos. Professional invoicing. Crew scheduling. Safety logs. Every tool your job site needs — one app, completely free.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 64 }}>
            <Link href="/onboarding" className="cl-btn" style={{ fontFamily: BC, fontWeight: 900, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", padding: "16px 36px", borderRadius: 0, textDecoration: "none", background: "#F5C400", color: "#000", display: "inline-flex", alignItems: "center", gap: 10 }}>
              GET STARTED FREE →
            </Link>
            <a href="#tools" className="cl-btn-ghost" style={{ fontFamily: BC, fontWeight: 800, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", padding: "16px 36px", borderRadius: 0, textDecoration: "none", border: "1px solid rgba(255,255,255,.22)", color: "rgba(255,255,255,.7)", display: "inline-flex", alignItems: "center", gap: 8 }}>
              SEE OUR TOOLS ↓
            </a>
          </div>

          {/* Stats strip */}
          <div style={{ display: "flex", gap: 0, flexWrap: "wrap", borderTop: "1px solid rgba(255,255,255,.1)", paddingTop: 32 }}>
            {[
              { n: "12+", label: "Tools Built In", suffix: "" },
              { n: "15", label: "Languages", suffix: "" },
              { n: "$0", label: "To Get Started", suffix: "" },
              { n: "100%", label: "Offline Capable", suffix: "" },
            ].map((s, i) => (
              <div key={i} style={{ paddingRight: 48, marginRight: 48, borderRight: i < 3 ? "1px solid rgba(255,255,255,.1)" : "none" }}>
                <div style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(36px,4vw,52px)", color: "#F5C400", lineHeight: 1, letterSpacing: "-0.02em" }}>{s.n}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,.4)", letterSpacing: ".1em", textTransform: "uppercase", marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ANNOUNCEMENT STRIP ─────────────────────────────────────────────── */}
      <div style={{ background: "#F5C400", padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "center", gap: 24 }}>
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

      {/* ── MARQUEE ────────────────────────────────────────────────────────── */}
      <div style={{ background: "#0a0a0a", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "16px 0", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0a0a0a 0%, transparent 10%, transparent 90%, #0a0a0a 100%)", zIndex: 2, pointerEvents: "none" }} />
        <div id="mq" style={{ display: "flex", width: "max-content" }}>
          {[...Array(2)].map((_, pass) => (
            <div key={pass} style={{ display: "flex", alignItems: "center" }}>
              {["GPS Clock-In", "Invoices", "Safety Logs", "Daily Reports", "Crew Scheduling", "Blueprints", "Equipment Tracking", "RFIs", "Budget Management", "AI Daily Brief", "Offline-First", "15 Languages", "Change Orders", "Material Tracker", "Punch Lists"].map((item) => (
                <span key={item} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 32px", fontSize: 11, color: "rgba(255,255,255,.25)", whiteSpace: "nowrap", fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase" }}>
                  <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#F5C400", flexShrink: 0 }} />
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── WHO WE ARE ─────────────────────────────────────────────────────── */}
      <section className="reveal" style={{ background: "#0a0a0a", padding: "100px 52px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
          <div>
            {/* Section header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 36 }}>
              <div style={{ width: 4, background: "#F5C400", alignSelf: "stretch", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 8 }}>ABOUT CONSTRA</p>
                <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(36px,4vw,60px)", textTransform: "uppercase", lineHeight: 0.9, color: "#fff" }}>
                  CONSTRUCTION<br />MANAGEMENT<br />FOR EVERYONE.
                </h2>
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,.5)", marginBottom: 20 }}>
              Constra is a full-featured construction management platform built for contractors, foremen, and crews of every size. We give you the same tools that enterprise platforms charge thousands for — completely free.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,.5)", marginBottom: 36 }}>
              From first GPS clock-in to final invoice, Constra keeps your job site organised, your crew accountable, and your clients happy — whether you&apos;re running 3 workers or 300.
            </p>
            <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#F5C400", fontWeight: 800, fontSize: 13, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(245,196,0,.4)", paddingBottom: 4 }}>
              LEARN MORE <ChevronRight size={14} />
            </Link>
          </div>

          {/* Stat blocks */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
            {[
              { target: 12, suffix: "+", label: "Tools in one app", sub: "Time, invoicing, safety & more" },
              { target: 15, suffix: "",  label: "Languages", sub: "Your crew speaks them all" },
              { target: 0, prefix: "$", suffix: "", label: "To start", sub: "No credit card needed" },
              { target: 100, suffix: "%", label: "Offline capable", sub: "Works on any job site" },
            ].map((s, i) => (
              <div key={i} style={{ padding: "36px 28px", background: "#111", border: "1px solid rgba(255,255,255,.05)", borderTop: "3px solid #F5C400" }}>
                <div style={{ fontFamily: BC, fontWeight: 900, fontSize: 52, lineHeight: 1, color: "#F5C400", marginBottom: 10 }}>
                  <span className="counter" data-target={s.target} data-suffix={s.suffix} data-prefix={s.prefix || ""}>{s.prefix || ""}{s.target}{s.suffix}</span>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.3)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── OUR TOOLS ──────────────────────────────────────────────────────── */}
      <section id="tools" style={{ background: "#111", padding: "100px 52px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          {/* Section header */}
          <div className="reveal" style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 24 }}>
            <div style={{ width: 4, height: 64, background: "#F5C400", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 8 }}>WHAT WE OFFER</p>
              <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(42px,5vw,76px)", textTransform: "uppercase", lineHeight: 0.88, color: "#fff" }}>
                OUR TOOLS
              </h2>
            </div>
          </div>

          <p className="reveal" style={{ fontSize: 15, color: "rgba(255,255,255,.45)", maxWidth: 580, marginBottom: 60, lineHeight: 1.75 }}>
            Constra gives your team a reputation for bringing projects to completion on schedule and on budget — because every tool you need is in one place, from first clock-in to final invoice.
          </p>

          {/* Tool grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))", gap: 2 }}>
            {TOOLS.map((tool, i) => (
              <div key={tool.title} className="reveal" style={{ background: "#0a0a0a", borderLeft: `3px solid ${tool.color}`, padding: "28px 24px 28px 22px", transition: "background .2s", transitionDelay: `${(i % 4) * 40}ms`, cursor: "default" }}
                onMouseEnter={e => (e.currentTarget.style.background = "#0f0f0f")}
                onMouseLeave={e => (e.currentTarget.style.background = "#0a0a0a")}
              >
                <h3 style={{ fontFamily: BC, fontWeight: 800, fontSize: 18, textTransform: "uppercase", color: "#fff", letterSpacing: "0.01em", marginBottom: 10, lineHeight: 1.1 }}>{tool.title}</h3>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.4)", lineHeight: 1.7, marginBottom: 14 }}>{tool.body}</p>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: tool.color, display: "flex", alignItems: "center", gap: 4 }}>
                  INCLUDED FREE <ChevronRight size={11} />
                </span>
              </div>
            ))}
          </div>

          <div className="reveal" style={{ marginTop: 48 }}>
            <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 10, background: "#F5C400", color: "#000", fontFamily: BC, fontWeight: 900, fontSize: 14, letterSpacing: ".06em", textTransform: "uppercase", padding: "16px 36px", borderRadius: 0, textDecoration: "none" }}>
              GET ALL TOOLS FREE →
            </Link>
          </div>
        </div>
      </section>

      {/* ── PHOTO BREAK: GPS ───────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: 520, display: "flex", alignItems: "center", overflow: "hidden", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1600&q=80" alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.4 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,.92) 0%, rgba(0,0,0,.75) 55%, rgba(0,0,0,.35) 100%)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: "#22c55e" }} />
        <div className="reveal" style={{ position: "relative", zIndex: 2, maxWidth: 1280, margin: "0 auto", padding: "80px 52px", width: "100%" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#22c55e", marginBottom: 16 }}>GPS VERIFICATION</p>
          <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(42px,7vw,100px)", textTransform: "uppercase", lineHeight: 0.88, color: "#fff", marginBottom: 24, letterSpacing: "-0.02em" }}>
            GPS-VERIFIED<br />CLOCK-INS.<br /><span style={{ color: "#22c55e" }}>EVERY TIME.</span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(255,255,255,.6)", maxWidth: 480, marginBottom: 36 }}>
            Workers clock in with a live selfie, GPS-pinned to your exact site. Off-site check-ins and duplicate clock-ins are flagged automatically. No more phantom hours.
          </p>
          <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#22c55e", fontWeight: 800, fontSize: 13, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(34,197,94,.4)", paddingBottom: 4 }}>
            START FREE TODAY <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── SAFETY SECTION (like BB's COR section) ─────────────────────────── */}
      <section style={{ background: "#0a0a0a", padding: "100px 52px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>

          <div className="reveal">
            <div style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 36 }}>
              <div style={{ width: 4, height: 64, background: "#ef4444", flexShrink: 0 }} />
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#ef4444", marginBottom: 8 }}>SAFETY FIRST</p>
                <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(36px,4vw,60px)", textTransform: "uppercase", lineHeight: 0.9, color: "#fff" }}>
                  BUILT FOR<br />A SAFE SITE.
                </h2>
              </div>
            </div>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,.5)", marginBottom: 20 }}>
              Constra&apos;s safety tools help you create, administer, and maintain a comprehensive safety program for every job site.
            </p>
            <p style={{ fontSize: 15, lineHeight: 1.8, color: "rgba(255,255,255,.5)", marginBottom: 36 }}>
              Log near-misses, injuries, and hazards with photos the moment they happen. Generate compliance reports in seconds. Keep your crew safe and your records clean.
            </p>
          </div>

          <div className="reveal" style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {[
              { title: "INCIDENT LOGGING", body: "Log near-misses, injuries, and hazards on the spot with photo evidence.", color: "#ef4444" },
              { title: "COMPLIANCE REPORTS", body: "Generate safety reports for any date range, job site, or worker in seconds.", color: "#f97316" },
              { title: "HAZARD TRACKING", body: "Track open hazards by site and status. Close items with a photo and signature.", color: "#F5C400" },
              { title: "INSURANCE MANAGEMENT", body: "Store and track insurance policies, expiry dates, and certificates per project.", color: "#22c55e" },
            ].map(item => (
              <div key={item.title} style={{ background: "#111", borderLeft: `3px solid ${item.color}`, padding: "20px 20px 20px 18px" }}>
                <p style={{ fontFamily: BC, fontWeight: 800, fontSize: 14, textTransform: "uppercase", color: "#fff", letterSpacing: ".04em", marginBottom: 6 }}>{item.title}</p>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.4)", lineHeight: 1.6 }}>{item.body}</p>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ── PHOTO BREAK: Invoice ───────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: 480, display: "flex", alignItems: "center", overflow: "hidden", background: "#000" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=1600&q=80" alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.35 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,.88) 0%, rgba(0,0,0,.6) 55%, rgba(0,0,0,.25) 100%)" }} />
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 5, background: "#F5C400" }} />
        <div className="reveal" style={{ position: "relative", zIndex: 2, maxWidth: 1280, margin: "0 auto", padding: "80px 52px", width: "100%" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 16 }}>INVOICING</p>
          <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(42px,7vw,96px)", textTransform: "uppercase", lineHeight: 0.88, color: "#fff", marginBottom: 24, letterSpacing: "-0.02em" }}>
            STOP CHASING<br /><span style={{ color: "#F5C400" }}>INVOICES.</span>
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.75, color: "rgba(255,255,255,.6)", maxWidth: 480, marginBottom: 36 }}>
            Build itemised estimates in the field and convert them to professional invoices in one tap. Send branded PDFs directly to your client the same day the work is done.
          </p>
          <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#F5C400", fontWeight: 800, fontSize: 13, textDecoration: "none", letterSpacing: ".06em", textTransform: "uppercase", borderBottom: "1px solid rgba(245,196,0,.4)", paddingBottom: 4 }}>
            START INVOICING FREE <ChevronRight size={14} />
          </Link>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section id="testimonials" style={{ background: "#111", padding: "100px 52px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          <div className="reveal" style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 24 }}>
            <div style={{ width: 4, height: 60, background: "#F5C400", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 8 }}>REVIEWS</p>
              <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(36px,4vw,66px)", textTransform: "uppercase", lineHeight: 0.9, color: "#fff" }}>
                WHAT CONTRACTORS<br />ARE SAYING
              </h2>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px,1fr))", gap: 2, marginTop: 48 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="reveal" style={{ background: "#0a0a0a", padding: "36px 32px", borderTop: "3px solid #F5C400", transitionDelay: `${i * 80}ms` }}>
                <div style={{ fontFamily: BC, fontWeight: 900, fontSize: 72, color: "#F5C400", lineHeight: 0.7, marginBottom: 20, opacity: 0.6 }}>&ldquo;</div>
                <p style={{ fontSize: 14.5, color: "rgba(255,255,255,.65)", lineHeight: 1.8, marginBottom: 28, fontStyle: "italic" }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 20 }}>
                  <p style={{ fontFamily: BC, fontWeight: 800, fontSize: 15, textTransform: "uppercase", color: "#fff", letterSpacing: ".04em" }}>{t.name}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,.35)", marginTop: 3 }}>{t.company}</p>
                  <p style={{ fontSize: 10, color: "#F5C400", marginTop: 2, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>{t.trade}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ────────────────────────────────────────────────────────── */}
      <section id="pricing" style={{ background: "#0a0a0a", padding: "100px 52px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>

          <div className="reveal" style={{ display: "flex", alignItems: "flex-start", gap: 18, marginBottom: 60 }}>
            <div style={{ width: 4, height: 60, background: "#F5C400", flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 8 }}>PRICING</p>
              <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(36px,4vw,66px)", textTransform: "uppercase", lineHeight: 0.9, color: "#fff" }}>
                SIMPLE PRICING.<br />FREE FOREVER.
              </h2>
            </div>
          </div>

          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2, marginBottom: 40 }}>
            {[
              { name: "Enterprise Platforms",  price: "$600–$1,200/mo", note: "Per project pricing", dim: true  },
              { name: "Mid-Market Apps",        price: "$200–$500/mo",   note: "Features behind paywalls", dim: true  },
              { name: "Constra",                price: "$0",              note: "Every feature, forever", dim: false },
            ].map(c => (
              <div key={c.name} style={{ padding: "28px 24px", border: `1px solid ${c.dim ? "rgba(255,255,255,.05)" : "rgba(245,196,0,.3)"}`, borderTop: `3px solid ${c.dim ? "rgba(255,255,255,.08)" : "#F5C400"}`, background: c.dim ? "rgba(255,255,255,.02)" : "rgba(245,196,0,.04)", opacity: c.dim ? 0.45 : 1, textAlign: "center" }}>
                <p style={{ fontFamily: BC, fontWeight: 800, fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase", color: c.dim ? "rgba(255,255,255,.3)" : "#F5C400", marginBottom: 8 }}>{c.name}</p>
                <p style={{ fontFamily: BC, fontWeight: 900, fontSize: 36, color: c.dim ? "rgba(255,255,255,.3)" : "#fff", marginBottom: 6 }}>{c.price}</p>
                <p style={{ fontSize: 11, color: c.dim ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.45)" }}>{c.note}</p>
              </div>
            ))}
          </div>

          {/* Free card */}
          <div className="reveal" style={{ maxWidth: 780, border: "1px solid rgba(245,196,0,.25)", borderTop: "4px solid #F5C400", padding: "48px", background: "rgba(245,196,0,.03)", position: "relative" }}>
            <div style={{ position: "absolute", top: -14, left: 48, background: "#F5C400", color: "#000", fontSize: 10, fontWeight: 900, padding: "5px 18px", letterSpacing: ".1em", textTransform: "uppercase" }}>FREE ACCESS</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24, marginBottom: 36 }}>
              <div>
                <div style={{ fontFamily: BC, fontWeight: 900, fontSize: 72, lineHeight: 1, color: "#fff" }}>$0</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.35)", marginTop: 4 }}>No credit card · All features included · No limits</p>
              </div>
              <Link href="/onboarding" style={{ background: "#F5C400", color: "#000", fontFamily: BC, fontWeight: 900, fontSize: 15, letterSpacing: ".06em", textTransform: "uppercase", padding: "16px 36px", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 12px 36px rgba(245,196,0,.22)" }}>
                GET STARTED FREE →
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 32px" }}>
              {["Unlimited crew members", "GPS verification on every clock-in", "Estimates & professional invoices", "Safety incident logging", "AI Daily Brief every morning", "Crew messaging with file sharing", "Weather-aware scheduling", "Equipment management", "RFIs & punch lists", "PDF export — invoices & reports", "15-language support", "Works 100% offline"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "rgba(255,255,255,.5)" }}>
                  <Check size={11} color="#F5C400" style={{ flexShrink: 0 }} />{f}
                </div>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────────────── */}
      <section style={{ position: "relative", padding: "120px 52px", background: "#000", overflow: "hidden", textAlign: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1600&q=80" alt="" aria-hidden style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.22 }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 4, background: "#F5C400" }} />
        <div className="reveal" style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto" }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 24 }}>GET STARTED TODAY</p>
          <h2 style={{ fontFamily: BC, fontWeight: 900, fontSize: "clamp(52px,8vw,110px)", textTransform: "uppercase", letterSpacing: "-0.02em", lineHeight: 0.88, color: "#fff", marginBottom: 28 }}>
            YOUR SITE,<br />
            <span style={{ color: "#F5C400" }}>FINALLY</span><br />
            UNDER CONTROL.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.8, color: "rgba(255,255,255,.5)", maxWidth: 500, margin: "0 auto 44px" }}>
            The only construction app that covers everything — from first clock-in to final invoice. Free, forever.
          </p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <Link href="/onboarding" style={{ background: "#F5C400", color: "#000", fontFamily: BC, fontWeight: 900, fontSize: 16, letterSpacing: ".06em", textTransform: "uppercase", padding: "18px 52px", textDecoration: "none", display: "flex", alignItems: "center", gap: 10, boxShadow: "0 16px 52px rgba(245,196,0,.25)", maxWidth: 440, width: "100%", justifyContent: "center" }}>
              CREATE FREE ACCOUNT →
            </Link>
            <Link href="/login" style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4, letterSpacing: ".04em", textTransform: "uppercase", fontWeight: 600 }}>
              Already have an account? Sign In <ChevronRight size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{ background: "#0a0a0a", borderTop: "4px solid #F5C400", padding: "48px 52px 36px" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 40, marginBottom: 40 }}>
            {/* Brand */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, background: "#F5C400", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <rect x="1" y="8" width="4" height="7" rx="0.5" fill="#000"/>
                    <rect x="6" y="3" width="4" height="12" rx="0.5" fill="#000"/>
                    <rect x="11" y="5.5" width="4" height="9.5" rx="0.5" fill="#000"/>
                  </svg>
                </div>
                <span style={{ fontFamily: BC, fontWeight: 900, fontSize: 20, letterSpacing: ".04em", textTransform: "uppercase" }}>CONSTRA</span>
              </div>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.3)", maxWidth: 240, lineHeight: 1.7 }}>Field Workforce Management for Construction & Trades</p>
            </div>
            {/* Links */}
            <div style={{ display: "flex", gap: 48, flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#F5C400", marginBottom: 14 }}>Platform</p>
                {[["Sign In", "/login"], ["Get Started", "/onboarding"]].map(([l, h]) => (
                  <div key={h} style={{ marginBottom: 10 }}><Link href={h} style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textDecoration: "none", fontWeight: 500 }}>{l}</Link></div>
                ))}
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#F5C400", marginBottom: 14 }}>Company</p>
                {[["Support", "/support"], ["Terms", "/terms"], ["Privacy", "/privacy"]].map(([l, h]) => (
                  <div key={h} style={{ marginBottom: 10 }}><Link href={h} style={{ fontSize: 12, color: "rgba(255,255,255,.3)", textDecoration: "none", fontWeight: 500 }}>{l}</Link></div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 24, display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.15)" }}>© {new Date().getFullYear()} Constra. All rights reserved.</p>
            <p style={{ fontSize: 11, color: "rgba(255,255,255,.15)" }}>getconstra.com · Built for the Field</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
