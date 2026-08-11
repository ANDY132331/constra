"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  HardHat, Clock, ShieldCheck, FileText, BarChart3,
  Zap, Globe, ArrowRight, Check, Sparkles, CalendarDays,
  ClipboardList, Package, MessageSquare,
  ChevronRight, Layers, WifiOff, MapPin, Truck,
} from "lucide-react";

// ─── Phone SVGs ───────────────────────────────────────────────────────────────
function dashSVG() {
  return `<svg viewBox="0 0 272 560" xmlns="http://www.w3.org/2000/svg" width="272" height="560">
  <defs>
    <linearGradient id="dag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F5C400"/><stop offset="100%" stop-color="#F5C400"/></linearGradient>
    <filter id="dgf"><feGaussianBlur stdDeviation="4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="272" height="560" fill="#0a0a12"/>
  <rect width="272" height="42" fill="#06060a"/>
  <text x="18" y="28" font-size="13" fill="rgba(255,255,255,.85)" font-weight="600" font-family="system-ui">9:41</text>
  <rect x="232" y="20" width="26" height="11" rx="3.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
  <rect x="234" y="22" width="20" height="7" rx="2" fill="#F5C400"/>
  <rect x="96" y="9" width="80" height="22" rx="11" fill="#06060a"/>
  <rect y="42" width="272" height="52" fill="#0e0e18"/>
  <text x="18" y="74" font-size="13.5" fill="white" font-weight="900" letter-spacing="3.5" font-family="system-ui">CONSTRA</text>
  <rect x="185" y="57" width="72" height="22" rx="11" fill="rgba(0,230,118,.1)"/>
  <circle cx="197" cy="68" r="3.5" fill="#00E676"/>
  <text x="205" y="72" font-size="9.5" fill="#00E676" font-weight="700" font-family="system-ui">8 ACTIVE</text>
  <text x="18" y="114" font-size="11.5" fill="rgba(255,255,255,.3)" font-family="system-ui">Good morning, Mike 👷</text>
  <rect x="8" y="128" width="77" height="62" rx="12" fill="#111120" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="46" y="156" text-anchor="middle" font-size="28" font-weight="900" fill="white" font-family="system-ui">12</text>
  <text x="46" y="180" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">WORKERS</text>
  <rect x="93" y="128" width="86" height="62" rx="12" fill="#111120" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="136" y="156" text-anchor="middle" font-size="28" font-weight="900" fill="#F5C400" font-family="system-ui">3</text>
  <text x="136" y="180" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">PROJECTS</text>
  <rect x="187" y="128" width="77" height="62" rx="12" fill="#111120" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="225" y="151" text-anchor="middle" font-size="20" font-weight="900" fill="white" font-family="system-ui">$42k</text>
  <text x="225" y="171" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">THIS MONTH</text>
  <rect y="206" width="272" height="140" fill="#08080f"/>
  <text x="18" y="224" font-size="7.5" fill="rgba(255,255,255,.2)" letter-spacing="2" font-family="system-ui">CREW LOCATIONS</text>
  <line x1="0" y1="232" x2="272" y2="232" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="45" y1="206" x2="45" y2="346" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="267" x2="272" y2="267" stroke="rgba(255,255,255,.07)" stroke-width="2"/>
  <line x1="118" y1="206" x2="118" y2="346" stroke="rgba(255,255,255,.07)" stroke-width="2"/>
  <line x1="0" y1="306" x2="272" y2="306" stroke="rgba(255,255,255,.04)" stroke-width="1.5"/>
  <circle cx="118" cy="267" r="20" fill="rgba(245,196,0,.12)" filter="url(#dgf)"/>
  <circle cx="118" cy="267" r="10" fill="rgba(245,196,0,.28)"/>
  <circle cx="118" cy="267" r="5" fill="#F5C400"/>
  <circle cx="118" cy="267" r="20" fill="none" stroke="rgba(245,196,0,.25)" stroke-width="1.5">
    <animate attributeName="r" from="16" to="40" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" from=".6" to="0" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <rect x="60" y="238" width="116" height="19" rx="6" fill="rgba(0,0,0,.75)"/>
  <text x="118" y="252" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,.7)" font-family="system-ui">📍 Downtown · 8 on-site</text>
  <circle cx="192" cy="299" r="8" fill="rgba(155,89,255,.28)"/><circle cx="192" cy="299" r="4" fill="#9B59FF"/>
  <circle cx="66" cy="311" r="8" fill="rgba(0,230,118,.28)"/><circle cx="66" cy="311" r="4" fill="#00E676"/>
  <text x="18" y="360" font-size="7.5" fill="rgba(255,255,255,.2)" letter-spacing="2" font-family="system-ui">RECENT CLOCK-INS</text>
  <rect y="372" width="272" height="44" fill="#0c0c18"/>
  <rect x="10" y="378" width="27" height="27" rx="8" fill="rgba(245,196,0,.12)"/>
  <text x="24" y="396" text-anchor="middle" font-size="9" fill="#F5C400" font-weight="700" font-family="system-ui">MJ</text>
  <text x="48" y="392" font-size="11.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">M. Johnson</text>
  <text x="48" y="407" font-size="8.5" fill="rgba(255,255,255,.28)" font-family="system-ui">Foreman · 6:52 AM · GPS ✓</text>
  <rect x="208" y="380" width="52" height="17" rx="8" fill="rgba(0,230,118,.1)"/>
  <text x="234" y="393" text-anchor="middle" font-size="8.5" fill="#00E676" font-weight="700" font-family="system-ui">In</text>
  <rect y="416" width="272" height="44" fill="#09090f"/>
  <rect x="10" y="422" width="27" height="27" rx="8" fill="rgba(155,89,255,.12)"/>
  <text x="24" y="440" text-anchor="middle" font-size="9" fill="#9B59FF" font-weight="700" font-family="system-ui">SP</text>
  <text x="48" y="436" font-size="11.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">S. Patel</text>
  <text x="48" y="451" font-size="8.5" fill="rgba(255,255,255,.28)" font-family="system-ui">Electrician · 7:08 AM · GPS ✓</text>
  <rect x="208" y="424" width="52" height="17" rx="8" fill="rgba(0,230,118,.1)"/>
  <text x="234" y="437" text-anchor="middle" font-size="8.5" fill="#00E676" font-weight="700" font-family="system-ui">In</text>
  <rect y="460" width="272" height="44" fill="#0c0c18"/>
  <rect x="10" y="466" width="27" height="27" rx="8" fill="rgba(255,255,255,.04)"/>
  <text x="24" y="484" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.22)" font-weight="700" font-family="system-ui">DT</text>
  <text x="48" y="480" font-size="11.5" fill="rgba(255,255,255,.38)" font-weight="600" font-family="system-ui">D. Torres</text>
  <text x="48" y="495" font-size="8.5" fill="rgba(255,255,255,.18)" font-family="system-ui">Pipe Layer · Off today</text>
  <rect x="208" y="468" width="52" height="17" rx="8" fill="rgba(255,255,255,.04)"/>
  <text x="234" y="481" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,.2)" font-weight="700" font-family="system-ui">Off</text>
  <rect y="516" width="272" height="44" fill="#06060a"/>
  <line x1="0" y1="516" x2="272" y2="516" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="34" y="537" text-anchor="middle" font-size="16">🏠</text><text x="34" y="552" text-anchor="middle" font-size="7" fill="#F5C400" font-family="system-ui">HOME</text>
  <text x="82" y="537" text-anchor="middle" font-size="16">⏱</text><text x="82" y="552" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.22)" font-family="system-ui">TIME</text>
  <text x="136" y="537" text-anchor="middle" font-size="16">📋</text><text x="136" y="552" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.22)" font-family="system-ui">JOBS</text>
  <text x="190" y="537" text-anchor="middle" font-size="16">💬</text><text x="190" y="552" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.22)" font-family="system-ui">CHAT</text>
  <text x="240" y="537" text-anchor="middle" font-size="16">⚙️</text><text x="240" y="552" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.22)" font-family="system-ui">MORE</text>
  <rect x="97" y="554" width="78" height="4" rx="2" fill="rgba(255,255,255,.24)"/>
</svg>`;
}

function invoiceSVG() {
  return `<svg viewBox="0 0 272 560" xmlns="http://www.w3.org/2000/svg" width="272" height="560">
  <defs><linearGradient id="iag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F5C400"/><stop offset="100%" stop-color="#F5C400"/></linearGradient></defs>
  <rect width="272" height="560" fill="#0a0a12"/>
  <rect width="272" height="42" fill="#06060a"/>
  <text x="18" y="28" font-size="13" fill="rgba(255,255,255,.85)" font-weight="600" font-family="system-ui">9:41</text>
  <rect x="96" y="9" width="80" height="22" rx="11" fill="#06060a"/>
  <rect y="42" width="272" height="52" fill="#0e0e18"/>
  <text x="18" y="75" font-size="22" fill="rgba(255,255,255,.35)" font-family="system-ui">‹</text>
  <text x="136" y="74" text-anchor="middle" font-size="14" fill="white" font-weight="700" font-family="system-ui">Invoice</text>
  <text x="258" y="73" text-anchor="middle" font-size="22" fill="rgba(255,255,255,.35)" font-family="system-ui">⋯</text>
  <rect x="10" y="108" width="252" height="118" rx="16" fill="#111120" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="26" y="133" font-size="9.5" fill="rgba(255,255,255,.25)" letter-spacing="1.5" font-family="system-ui">INVOICE</text>
  <text x="26" y="152" font-size="18" fill="white" font-weight="800" font-family="system-ui">#INV-2847</text>
  <rect x="168" y="120" width="80" height="22" rx="11" fill="rgba(245,196,0,.1)" stroke="rgba(245,196,0,.25)" stroke-width="1"/>
  <text x="208" y="135" text-anchor="middle" font-size="9" fill="#F5C400" font-weight="700" font-family="system-ui">PENDING</text>
  <text x="26" y="176" font-size="10.5" fill="rgba(255,255,255,.28)" font-family="system-ui">Riverside Development Inc.</text>
  <text x="26" y="192" font-size="10" fill="rgba(255,255,255,.18)" font-family="system-ui">Due Aug 15, 2026</text>
  <line x1="18" y1="204" x2="254" y2="204" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="218" font-size="9.5" fill="rgba(255,255,255,.25)" font-family="system-ui">TOTAL DUE</text>
  <text x="254" y="219" text-anchor="end" font-size="26" fill="#F5C400" font-weight="900" font-family="system-ui">$14,012</text>
  <text x="18" y="252" font-size="8" fill="rgba(255,255,255,.18)" letter-spacing="2" font-family="system-ui">LINE ITEMS</text>
  <rect x="10" y="260" width="252" height="46" rx="11" fill="#111120" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="279" font-size="12" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Foundation Work</text>
  <text x="26" y="295" font-size="9" fill="rgba(255,255,255,.28)" font-family="system-ui">40 hrs × $120/hr</text>
  <text x="254" y="287" text-anchor="end" font-size="13" fill="white" font-weight="700" font-family="system-ui">$4,800</text>
  <rect x="10" y="312" width="252" height="46" rx="11" fill="#111120" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="331" font-size="12" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Materials Supply</text>
  <text x="26" y="347" font-size="9" fill="rgba(255,255,255,.28)" font-family="system-ui">Concrete + structural rebar</text>
  <text x="254" y="339" text-anchor="end" font-size="13" fill="white" font-weight="700" font-family="system-ui">$5,200</text>
  <rect x="10" y="364" width="252" height="46" rx="11" fill="#111120" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="383" font-size="12" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Equipment Rental</text>
  <text x="26" y="399" font-size="9" fill="rgba(255,255,255,.28)" font-family="system-ui">Excavator · 3 days + operator</text>
  <text x="254" y="391" text-anchor="end" font-size="13" fill="white" font-weight="700" font-family="system-ui">$2,400</text>
  <line x1="18" y1="424" x2="254" y2="424" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="26" y="443" font-size="11" fill="rgba(255,255,255,.25)" font-family="system-ui">HST (13%)</text>
  <text x="254" y="443" text-anchor="end" font-size="11" fill="rgba(255,255,255,.25)" font-family="system-ui">+$1,612</text>
  <text x="26" y="462" font-size="14" fill="white" font-weight="700" font-family="system-ui">Total</text>
  <text x="254" y="463" text-anchor="end" font-size="18" fill="#F5C400" font-weight="900" font-family="system-ui">$14,012</text>
  <rect x="10" y="478" width="252" height="50" rx="14" fill="url(#iag)"/>
  <text x="136" y="509" text-anchor="middle" font-size="14" fill="#000" font-weight="800" font-family="system-ui">Send to Client →</text>
  <rect x="10" y="536" width="120" height="36" rx="10" fill="#141422" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="70" y="559" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.38)" font-family="system-ui">⬇ Download PDF</text>
  <rect x="142" y="536" width="120" height="36" rx="10" fill="#141422" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="202" y="559" text-anchor="middle" font-size="10" fill="rgba(255,255,255,.38)" font-family="system-ui">📤 Share</text>
  <rect x="97" y="554" width="78" height="4" rx="2" fill="rgba(255,255,255,.22)"/>
</svg>`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock,         color: "#22c55e", title: "GPS Clock-In + Photos",             body: "Workers clock in with a live selfie, GPS-verified to your site. Off-site and duplicate check-ins flagged automatically." },
  { icon: ShieldCheck,   color: "#ef4444", title: "Safety Incident Logs",              body: "Log near-misses, injuries, and hazards on the spot. Generate reports in one tap." },
  { icon: CalendarDays,  color: "#3b82f6", title: "Weather-Aware Scheduling",          body: "Live 7-day forecast on your project calendar. Severe weather highlighted before it's a problem." },
  { icon: FileText,      color: "#F5C400", title: "Estimates & Invoices",              body: "Build itemized estimates, convert to invoices with one click, export branded PDFs." },
  { icon: BarChart3,     color: "#8b5cf6", title: "Reports & Payroll Export",          body: "Payroll summaries, cost reports, timesheet detail — exportable to PDF and CSV." },
  { icon: Sparkles,      color: "#F5C400", title: "AI Daily Brief",                   body: "AI-generated site briefing every morning — crew status, overdue tasks, what to tackle first." },
  { icon: ClipboardList, color: "#06b6d4", title: "Punch Lists & RFIs",               body: "Assign punch items with photos. Track RFIs end-to-end without email chains." },
  { icon: Package,       color: "#10b981", title: "Material Tracker",                  body: "Log deliveries and usage by trade. Auto low-stock alerts. Export per project." },
  { icon: MessageSquare, color: "#6366f1", title: "Crew Messaging",                    body: "Per-project group chats with file sharing. Real-time delivery." },
  { icon: MapPin,        color: "#f97316", title: "GPS Site Map",                      body: "Every project on an interactive map. Clock-in locations pinned per worker." },
  { icon: Truck,         color: "#84cc16", title: "Equipment Management",              body: "Track status, assignment, daily rate, and maintenance across all sites." },
  { icon: Globe,         color: "#a78bfa", title: "15-Language Support",               body: "Full localization in English, French, Spanish, Arabic, Punjabi, Hindi, and more." },
  { icon: WifiOff,       color: "#22d3ee", title: "Works Offline",                     body: "Clock in and log incidents with no signal. Syncs automatically when back online." },
];

const TRADES = ["General Contracting","Civil / Utilities","Electrical","Plumbing","HVAC","Roofing","Concrete & Masonry","Steel / Structural","Framing","Drywall","Flooring","Painting","Excavation","Landscaping","Insulation"];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  useEffect(() => {
    let cancelled = false;

    // ── Phone — gentle mouse-parallax tilt (no auto-spin) ───────────────────
    const phoneEl = document.getElementById("phoneWrap");
    if (phoneEl) {
      phoneEl.style.transform = "rotateX(4deg) rotateY(-6deg)";
      const hero = document.getElementById("cl-hero");
      const onMM = (e: MouseEvent) => {
        if (cancelled) return;
        const ax = ((e.clientX / window.innerWidth) - .5) * 16;
        const ay = -((e.clientY / window.innerHeight) - .5) * 10;
        phoneEl.style.transform = `rotateX(${ay + 3}deg) rotateY(${ax}deg)`;
      };
      const onML = () => { phoneEl.style.transform = "rotateX(4deg) rotateY(-6deg)"; };
      document.addEventListener("mousemove", onMM);
      hero?.addEventListener("mouseleave", onML);
    }

    // ── Headline float ───────────────────────────────────────────────────────
    // Wait for each line's fade-in animation to FINISH before starting the float.
    // Using animationend avoids the mid-flight snap that setTimeout caused.
    document.querySelectorAll<HTMLElement>(".hl").forEach(el => {
      el.addEventListener("animationend", (e: AnimationEvent) => {
        if (e.animationName === "clFU" && !cancelled) {
          el.style.opacity = "1";
          el.classList.add("up");
        }
      }, { once: true });
    });

    // ── 3D card tilt ─────────────────────────────────────────────────────────
    const cards = document.querySelectorAll<HTMLElement>(".feat-card");
    cards.forEach(card => {
      const shine = card.querySelector<HTMLElement>(".feat-shine");
      card.addEventListener("mousemove", (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        card.style.transform = `perspective(700px) rotateX(${-y * 12}deg) rotateY(${x * 12}deg) translateZ(10px)`;
        if (shine) shine.style.background = `radial-gradient(circle at ${(x + .5) * 100}% ${(y + .5) * 100}%, rgba(255,255,255,.06) 0%, transparent 60%)`;
      });
      card.addEventListener("mouseleave", () => {
        card.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
        if (shine) shine.style.background = "none";
      });
    });

    // ── Scroll reveal ────────────────────────────────────────────────────────
    document.body.classList.add("reveal-active");
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("revealed"); revObs.unobserve(e.target); } });
    }, { threshold: 0.06, rootMargin: "0px 0px -30px 0px" });
    document.querySelectorAll(".reveal").forEach(el => revObs.observe(el));

    // ── Counters ─────────────────────────────────────────────────────────────
    const cntObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const target = parseInt(el.dataset.target || "0");
        const suffix = el.dataset.suffix || "", prefix = el.dataset.prefix || "";
        const dur = 1500, start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / dur, 1), eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.floor(eased * target).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        tick(); cntObs.unobserve(el);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll(".counter").forEach(el => cntObs.observe(el));

    // ── Marquee ──────────────────────────────────────────────────────────────
    const mq = document.getElementById("marqueeTrack");
    if (mq) {
      let pos = 0;
      const scrollMq = () => { if (cancelled) return; pos -= .4; if (pos <= -mq.scrollWidth / 2) pos = 0; mq.style.transform = `translateX(${pos}px)`; requestAnimationFrame(scrollMq); };
      scrollMq();
    }

    return () => {
      cancelled = true;
      document.body.classList.remove("reveal-active");
    };
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#0C0C0C" }}>

      {/* ── Nav ────────────────────────────────────────────────────────────── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, background: "rgba(12,12,12,.9)", borderBottom: "1px solid rgba(255,255,255,.05)", backdropFilter: "blur(20px)" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 30, height: 30, background: "#F5C400", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HardHat size={14} color="#000" strokeWidth={2.5} />
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, letterSpacing: "-.02em" }}>Constra</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/login" style={{ fontSize: 13, color: "rgba(255,255,255,.35)", textDecoration: "none", fontWeight: 500 }}>Sign In</Link>
            <Link href="/onboarding" style={{ background: "#F5C400", color: "#0a0a0a", fontWeight: 800, fontSize: 13, padding: "8px 18px", borderRadius: 6, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
              Get Started <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section id="cl-hero">
        <div className="cl-glow" />
        <div className="cl-inner">
          <div>
            <div className="cl-eye"><div className="cl-eye-dot" />Free During Beta · No Credit Card</div>
            <h1 className="cl-h">
              <span className="hl hl-1">STOP RUNNING</span>
              <span className="hl hl-2">YOUR SITE ON</span>
              <span className="hl hl-3">WHATSAPP.</span>
            </h1>
            <p className="cl-sub">GPS clock-in with photos, instant invoicing, crew scheduling, safety logs — every tool your job site needs in one login.</p>
            <div className="cl-ctas">
              <a className="cl-btn" href="/onboarding"><Zap size={14} /> Start for Free →</a>
              <a className="cl-btn-ghost" href="#features">See Features</a>
            </div>
            <div className="cl-trust">
              <div className="cl-avs">
                {[["MJ","rgba(245,196,0,.15)","#F5C400"],["SP","rgba(155,89,255,.15)","#9B59FF"],["DT","rgba(34,197,94,.15)","#22c55e"],["KL","rgba(239,68,68,.15)","#ef4444"]].map(([id,bg,c])=>(
                  <div key={id} className="cl-av" style={{background:bg as string,color:c as string}}>{id}</div>
                ))}
              </div>
              <p className="cl-trust-txt"><strong>Contractors</strong> ditching spreadsheets every day</p>
            </div>
          </div>
          <div className="cl-vis">
            <div className="cl-scene">
              <div className="cl-wrap" id="phoneWrap">
                <div className="cl-face"              dangerouslySetInnerHTML={{ __html: dashSVG() }} />
                <div className="cl-face cl-face-back" dangerouslySetInnerHTML={{ __html: invoiceSVG() }} />
                <div className="cl-fb cl-fb1">
                  <div className="cl-fb-ico" style={{background:"rgba(34,197,94,.1)",color:"#22c55e"}}>📍</div>
                  <div><div className="cl-fb-t">GPS Verified</div><div className="cl-fb-s">M. Johnson · Downtown Site</div></div>
                </div>
                <div className="cl-fb cl-fb2">
                  <div className="cl-fb-ico" style={{background:"rgba(245,196,0,.1)",color:"#F5C400"}}>💰</div>
                  <div><div className="cl-fb-t">Invoice Sent · $14,012</div><div className="cl-fb-s">Riverside Development</div></div>
                </div>
                <div className="cl-fb cl-fb3">
                  <div className="cl-fb-ico" style={{background:"rgba(59,130,246,.1)",color:"#60a5fa"}}>🛡️</div>
                  <div><div className="cl-fb-t">Safety Log Filed</div><div className="cl-fb-s">Hwy 401 · Near-miss report</div></div>
                </div>
              </div>
              <div className="cl-shadow" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee trust strip ──────────────────────────────────────────── */}
      <div style={{ background: "#0C0C0C00", borderTop: "1px solid rgba(255,255,255,.04)", borderBottom: "1px solid rgba(255,255,255,.04)", padding: "18px 0", overflow: "hidden", position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0C0C0C 0%, transparent 12%, transparent 88%, #0C0C0C 100%)", zIndex: 2, pointerEvents: "none" }} />
        <div id="marqueeTrack" style={{ display: "flex", gap: 48, width: "max-content", willChange: "transform" }}>
          {[...Array(2)].map((_, pass) => (
            <div key={pass} style={{ display: "flex", gap: 48, alignItems: "center" }}>
              {["✓ GPS Clock-In","✓ Real-Time Crew Dashboard","✓ Instant PDF Invoices","✓ Safety Incident Logs","✓ AI Daily Brief","✓ Offline-First","✓ 15 Languages","✓ No Credit Card","✓ Equipment Tracker","✓ Punch Lists & RFIs","✓ Weather Scheduling","✓ Payroll Export"].map((item) => (
                <span key={item} style={{ fontSize: 12, color: "rgba(255,255,255,.28)", whiteSpace: "nowrap", fontWeight: 600, letterSpacing: ".04em" }}>{item}</span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      <section className="reveal" style={{ padding: "100px 24px", background: "#111" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 56 }}>Built for serious contractors</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 2 }}>
            {[
              { target: 13, suffix: "+", label: "Tools in one app",    sub: "Time, invoicing, safety, GPS" },
              { target: 15, suffix: "",  label: "Languages",            sub: "Your crew speaks them all"   },
              { target: 0,  prefix:"$", suffix: "", label: "To start", sub: "No credit card required"     },
              { target: 100,suffix: "%", label: "Offline capable",     sub: "Works on any job site"        },
            ].map((s, i) => (
              <div key={i} style={{ padding: "40px 32px", borderRadius: 20, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.05)", textAlign: "center" }}>
                <div style={{ fontSize: 58, fontWeight: 900, lineHeight: 1, color: "#F5C400", marginBottom: 10, fontVariantNumeric: "tabular-nums" }}>
                  <span className="counter" data-target={s.target} data-suffix={s.suffix} data-prefix={s.prefix || ""}>{s.prefix || ""}{0}{s.suffix}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,.8)", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,.28)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Full-bleed photo ──────────────────────────────────────────────── */}
      <section style={{ position: "relative", minHeight: 560, display: "flex", alignItems: "center", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80" alt="Construction site" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .18 }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, #0C0C0C 35%, rgba(12,12,12,.7) 65%, rgba(12,12,12,.4) 100%)" }} />
        <div className="reveal" style={{ position: "relative", maxWidth: 1000, margin: "0 auto", padding: "80px 24px" }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#F5C400", marginBottom: 20 }}>Built for the field</p>
          <h2 style={{ fontSize: "clamp(36px,5vw,64px)", fontWeight: 900, lineHeight: .92, letterSpacing: "-.04em", marginBottom: 24 }}>
            Every job site<br />
            is <span style={{ color: "#F5C400" }}>different.</span><br />
            Your app shouldn&apos;t be.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.7, color: "rgba(255,255,255,.45)", maxWidth: 420, marginBottom: 32 }}>
            Constra adapts to how your crew actually works — on site, off grid, in 15 languages, across every trade.
          </p>
          <Link href="/onboarding" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#F5C400", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Start free today <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── 3 Big feature highlights ──────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "#0C0C0C" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, letterSpacing: "-.04em", marginBottom: 12 }}>Stop losing money to bad tools</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", maxWidth: 480, margin: "0 auto" }}>Three things that cost contractors thousands every month — solved.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 16 }}>
            {[
              { icon: "⏱", color: "#22c55e", glow: "rgba(34,197,94,.08)", border: "rgba(34,197,94,.18)", problem: "Crew clocking in from the couch", fix: "GPS + selfie verification locks workers to the site. Every check-in is photo-confirmed and location-stamped." },
              { icon: "📄", color: "#F5C400", glow: "rgba(245,196,0,.08)", border: "rgba(245,196,0,.18)", problem: "Chasing invoices for weeks", fix: "Build estimates in the field, convert to invoices in one tap, send professional PDFs directly to clients." },
              { icon: "🛡", color: "#ef4444", glow: "rgba(239,68,68,.08)", border: "rgba(239,68,68,.18)", problem: "Safety incidents with no paper trail", fix: "Log near-misses, injuries, and hazards with photos. Generate reports for compliance in seconds." },
            ].map((item, i) => (
              <div key={i} className="reveal" style={{ padding: "36px 32px", borderRadius: 24, border: `1px solid ${item.border}`, background: item.glow, transitionDelay: `${i * 80}ms` }}>
                <div style={{ fontSize: 36, marginBottom: 20 }}>{item.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: "rgba(255,255,255,.3)", marginBottom: 10 }}>The problem</div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: "white", marginBottom: 16, lineHeight: 1.2 }}>{item.problem}</h3>
                <div style={{ height: 1, background: "rgba(255,255,255,.06)", marginBottom: 16 }} />
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".15em", textTransform: "uppercase", color: item.color, marginBottom: 10 }}>The fix</div>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", lineHeight: 1.7 }}>{item.fix}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Photo strip ───────────────────────────────────────────────────── */}
      <div style={{ padding: "0 0 80px", overflow: "hidden", background: "#0C0C0C" }}>
        <p style={{ textAlign: "center", fontSize: 11, fontWeight: 600, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.18)", marginBottom: 28 }}>Real job sites. Real results.</p>
        <div style={{ display: "flex", gap: 12, overflowX: "auto", padding: "0 24px 8px", scrollbarWidth: "none" }}>
          {[
            "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=700&q=75",
            "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=700&q=75",
            "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=700&q=75",
            "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=700&q=75",
            "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=700&q=75",
            "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=700&q=75",
          ].map((src, i) => (
            <div key={i} style={{ flexShrink: 0, width: 280, height: 190, borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,255,255,.06)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Job site" style={{ width: "100%", height: "100%", objectFit: "cover", opacity: .5, transition: "opacity .3s,transform .4s", transform: "scale(1.04)" }}
                onMouseEnter={e => { const t = e.target as HTMLImageElement; t.style.opacity = ".75"; t.style.transform = "scale(1)"; }}
                onMouseLeave={e => { const t = e.target as HTMLImageElement; t.style.opacity = ".5"; t.style.transform = "scale(1.04)"; }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Features grid ─────────────────────────────────────────────────── */}
      <section id="features" style={{ padding: "100px 24px", background: "#111", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 60 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 16px", borderRadius: 100, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.03)", marginBottom: 20 }}>
              <Layers size={11} color="rgba(255,255,255,.3)" />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,.3)", fontWeight: 600, letterSpacing: ".06em" }}>Every feature · one app · no add-ons</span>
            </div>
            <h2 style={{ fontSize: "clamp(30px,4vw,52px)", fontWeight: 900, letterSpacing: "-.04em", marginBottom: 12 }}>Every tool your crew needs</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", maxWidth: 440, margin: "0 auto" }}>No integrations. No extra seats. Built in.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 12 }}>
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feat-card reveal" style={{ padding: "24px 24px 26px", borderRadius: 20, border: "1px solid rgba(255,255,255,.055)", background: "#161616", position: "relative", overflow: "hidden", cursor: "default", transitionDelay: `${(i % 6) * 35}ms` }}>
                <div className="feat-shine" style={{ position: "absolute", inset: 0, borderRadius: "inherit", pointerEvents: "none" }} />
                <div style={{ width: 42, height: 42, borderRadius: 13, background: f.color + "18", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 18 }}>
                  <f.icon size={17} color={f.color} />
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 8, lineHeight: 1.3 }}>{f.title}</h3>
                <p style={{ fontSize: 12.5, color: "rgba(255,255,255,.35)", lineHeight: 1.65 }}>{f.body}</p>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: f.color, opacity: 0, transition: "opacity .2s", borderRadius: "20px 20px 0 0" }} className="feat-top-bar" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "#0C0C0C", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{ fontSize: "clamp(28px,4vw,48px)", fontWeight: 900, letterSpacing: "-.04em", marginBottom: 12 }}>Up and running in minutes</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.35)" }}>No training. No onboarding calls. No IT department.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 32 }}>
            {[
              { n: "01", title: "Create your company", body: "Sign up, enter your company name and trade, invite your first crew member with a generated code. 2 minutes." },
              { n: "02", title: "Add projects & crew",  body: "Set up job sites, assign workers, configure roles. Most teams are running in under 10 minutes." },
              { n: "03", title: "Run your site",         body: "Crew clocks in from their phone. You see it live on your dashboard. Tasks, safety, invoices — all in one place." },
            ].map((s, i) => (
              <div key={s.n} className="reveal" style={{ transitionDelay: `${i * 80}ms` }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, border: "1px solid rgba(245,196,0,.2)", background: "rgba(245,196,0,.07)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                  <span style={{ fontSize: 13, fontWeight: 900, color: "#F5C400" }}>{s.n}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 10 }}>{s.title}</h3>
                <p style={{ fontSize: 13.5, color: "rgba(255,255,255,.38)", lineHeight: 1.7 }}>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trades ────────────────────────────────────────────────────────── */}
      <section style={{ padding: "60px 24px", background: "#111", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "rgba(255,255,255,.2)", marginBottom: 24 }}>Built for every trade</p>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8 }}>
            {TRADES.map(t => (
              <span key={t} style={{ padding: "7px 16px", borderRadius: 100, fontSize: 12, color: "rgba(255,255,255,.38)", fontWeight: 500, border: "1px solid rgba(255,255,255,.06)", background: "rgba(255,255,255,.02)" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section style={{ padding: "100px 24px", background: "#0C0C0C", borderTop: "1px solid rgba(255,255,255,.04)" }} id="pricing">
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <div className="reveal" style={{ textAlign: "center", marginBottom: 48 }}>
            <h2 style={{ fontSize: "clamp(32px,4vw,52px)", fontWeight: 900, letterSpacing: "-.04em", marginBottom: 10 }}>Free to start.</h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)" }}>Every feature unlocked. No credit card required.</p>
          </div>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 16 }}>
            {[
              { name: "Enterprise tools",  price: "$600–$1,200", note: "Per project pricing",          dim: true  },
              { name: "Mid-market apps",   price: "$200–$500",   note: "Features behind paywalls",     dim: true  },
              { name: "Constra",           price: "$0",          note: "All features included",        dim: false },
            ].map(c => (
              <div key={c.name} style={{ padding: "20px 16px", borderRadius: 18, border: `1px solid ${c.dim ? "rgba(255,255,255,.05)" : "rgba(245,196,0,.22)"}`, background: c.dim ? "rgba(255,255,255,.02)" : "rgba(245,196,0,.04)", opacity: c.dim ? .5 : 1, textAlign: "center" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: c.dim ? "rgba(255,255,255,.25)" : "#F5C400", marginBottom: 6 }}>{c.name}</p>
                <p style={{ fontSize: 22, fontWeight: 900, color: c.dim ? "rgba(255,255,255,.35)" : "white", marginBottom: 4 }}>{c.price}</p>
                <p style={{ fontSize: 10, color: c.dim ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.4)" }}>{c.note}</p>
              </div>
            ))}
          </div>
          <div className="reveal" style={{ padding: "40px 36px", borderRadius: 24, border: "1px solid rgba(245,196,0,.2)", background: "rgba(245,196,0,.04)", position: "relative" }}>
            <div style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "#F5C400", color: "#000", fontSize: 10, fontWeight: 900, padding: "5px 16px", borderRadius: 100, letterSpacing: ".08em", textTransform: "uppercase" }}>Early Access</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 20, marginBottom: 32 }}>
              <div>
                <div style={{ fontSize: 52, fontWeight: 900, lineHeight: 1, color: "white", marginBottom: 4 }}>$0</div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,.3)" }}>No credit card · All features included</p>
              </div>
              <Link href="/onboarding" style={{ background: "#F5C400", color: "#000", fontWeight: 900, fontSize: 14, padding: "14px 28px", borderRadius: 14, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 12px 36px rgba(245,196,0,.2)" }}>
                <Zap size={15} /> Get Started Free
              </Link>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 24px" }}>
              {["Unlimited crew members","GPS verification on every clock-in","Estimates & professional invoices","Safety incident logging","AI Daily Brief","Crew messaging","Weather-aware scheduling","Equipment management","RFIs & punch lists","PDF export","15-language support","Works offline"].map(f => (
                <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "rgba(255,255,255,.45)" }}>
                  <Check size={11} color="#F5C400" style={{ flexShrink: 0 }} />{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section style={{ padding: "120px 24px", background: "#111", borderTop: "1px solid rgba(255,255,255,.04)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(245,196,0,.06), transparent)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(to right, transparent, rgba(245,196,0,.15), transparent)" }} />
        <div className="reveal" style={{ maxWidth: 560, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div style={{ width: 56, height: 56, background: "#F5C400", borderRadius: 18, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 28px", boxShadow: "0 16px 48px rgba(245,196,0,.22)" }}>
            <HardHat size={24} color="#000" />
          </div>
          <h2 style={{ fontSize: "clamp(30px,4vw,50px)", fontWeight: 900, letterSpacing: "-.04em", lineHeight: .95, marginBottom: 18 }}>Your job site,<br />finally under control.</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,.38)", marginBottom: 36, lineHeight: 1.7 }}>The only construction app that covers everything — from first clock-in to final invoice.</p>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Link href="/onboarding" style={{ background: "#F5C400", color: "#000", fontWeight: 900, fontSize: 15, padding: "16px 36px", borderRadius: 16, textDecoration: "none", display: "flex", alignItems: "center", gap: 8, boxShadow: "0 16px 52px rgba(245,196,0,.22)", width: "100%", maxWidth: 360, justifyContent: "center" }}>
              <Zap size={16} /> Create Your Account — It&apos;s Free
            </Link>
            <Link href="/login" style={{ fontSize: 13, color: "rgba(255,255,255,.3)", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
              Already have an account? Sign In <ChevronRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "36px 24px", background: "#0C0C0C" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, background: "#F5C400", borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center" }}><HardHat size={11} color="#000" /></div>
            <span style={{ fontSize: 14, fontWeight: 800 }}>Constra</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,.2)" }}>· Field Workforce Management</span>
          </div>
          <div style={{ display: "flex", gap: 20 }}>
            {[["Sign In","/login"],["Get Started","/onboarding"],["Support","/support"],["Terms","/terms"],["Privacy","/privacy"]].map(([label,href]) => (
              <Link key={href} href={href} style={{ fontSize: 12, color: "rgba(255,255,255,.22)", textDecoration: "none" }}>{label}</Link>
            ))}
          </div>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,.15)" }}>© {new Date().getFullYear()} Constra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
