"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  HardHat, Clock, ShieldCheck, FileText, BarChart3,
  Zap, Globe, ArrowRight, Check, Sparkles, CalendarDays,
  ClipboardList, Package, MessageSquare, Truck,
  ChevronRight, TrendingUp, Layers, WifiOff, MapPin,
} from "lucide-react";

// ─── Phone screen SVGs ────────────────────────────────────────────────────────
function dashSVG() {
  return `<svg viewBox="0 0 272 560" xmlns="http://www.w3.org/2000/svg" width="272" height="560">
  <defs>
    <linearGradient id="dag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#F97316"/></linearGradient>
    <linearGradient id="dmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#080d13"/><stop offset="100%" stop-color="#050a10"/></linearGradient>
    <filter id="dgf"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="272" height="560" fill="#0a0a0f"/>
  <rect width="272" height="42" fill="#060609"/>
  <text x="18" y="28" font-size="13" fill="rgba(255,255,255,.85)" font-weight="600" font-family="system-ui">9:41</text>
  <rect x="232" y="20" width="26" height="11" rx="3.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
  <rect x="234" y="22" width="20" height="7" rx="2" fill="#F59E0B"/>
  <rect x="96" y="9" width="80" height="22" rx="11" fill="#060609"/>
  <rect y="42" width="272" height="52" fill="#0e0e14"/>
  <text x="18" y="74" font-size="13.5" fill="white" font-weight="900" letter-spacing="3.5" font-family="system-ui">CONSTRA</text>
  <rect x="185" y="57" width="72" height="22" rx="11" fill="rgba(0,230,118,.1)"/>
  <circle cx="197" cy="68" r="3.5" fill="#00E676"/>
  <text x="205" y="72" font-size="9.5" fill="#00E676" font-weight="700" font-family="system-ui">8 ACTIVE</text>
  <rect y="94" width="272" height="34" fill="#0a0a0f"/>
  <text x="18" y="116" font-size="12" fill="rgba(255,255,255,.38)" font-family="system-ui">Good morning, Mike 👷</text>
  <rect y="128" width="272" height="78" fill="#0a0a0f"/>
  <rect x="8" y="134" width="77" height="62" rx="12" fill="#111118" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="46" y="162" text-anchor="middle" font-size="28" font-weight="900" fill="white" font-family="system-ui">12</text>
  <text x="46" y="186" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">WORKERS</text>
  <rect x="93" y="134" width="86" height="62" rx="12" fill="#111118" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="136" y="162" text-anchor="middle" font-size="28" font-weight="900" fill="#F59E0B" font-family="system-ui">3</text>
  <text x="136" y="186" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">PROJECTS</text>
  <rect x="187" y="134" width="77" height="62" rx="12" fill="#111118" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="225" y="157" text-anchor="middle" font-size="20" font-weight="900" fill="white" font-family="system-ui">$42k</text>
  <text x="225" y="173" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">THIS</text>
  <text x="225" y="186" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">MONTH</text>
  <rect y="218" width="272" height="128" fill="url(#dmg)"/>
  <text x="18" y="232" font-size="7.5" fill="rgba(255,255,255,.22)" letter-spacing="2" font-family="system-ui">CREW LOCATIONS</text>
  <line x1="0" y1="240" x2="272" y2="240" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="45" y1="218" x2="45" y2="346" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="273" x2="272" y2="273" stroke="rgba(255,255,255,.09)" stroke-width="2.5"/>
  <line x1="118" y1="218" x2="118" y2="346" stroke="rgba(255,255,255,.09)" stroke-width="2.5"/>
  <line x1="0" y1="310" x2="272" y2="310" stroke="rgba(255,255,255,.05)" stroke-width="1.5"/>
  <circle cx="118" cy="273" r="24" fill="rgba(245,158,11,.15)" filter="url(#dgf)"/>
  <circle cx="118" cy="273" r="12" fill="rgba(245,158,11,.32)"/>
  <circle cx="118" cy="273" r="5.5" fill="#F59E0B"/>
  <polygon points="118,257 123,269 118,282 113,269" fill="#F59E0B"/>
  <circle cx="118" cy="273" r="22" fill="none" stroke="rgba(245,158,11,.28)" stroke-width="1.5">
    <animate attributeName="r" from="18" to="44" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" from=".6" to="0" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <rect x="60" y="244" width="116" height="20" rx="6" fill="rgba(0,0,0,.78)"/>
  <text x="118" y="258" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,.75)" font-family="system-ui">📍 Downtown · 8 on-site</text>
  <circle cx="192" cy="305" r="9" fill="rgba(155,89,255,.3)"/><circle cx="192" cy="305" r="4.5" fill="#9B59FF"/>
  <circle cx="66" cy="317" r="9" fill="rgba(0,230,118,.3)"/><circle cx="66" cy="317" r="4.5" fill="#00E676"/>
  <rect y="346" width="272" height="28" fill="#0a0a0f"/>
  <text x="18" y="363" font-size="7.5" fill="rgba(255,255,255,.22)" letter-spacing="2" font-family="system-ui">RECENT CLOCK-INS</text>
  <rect y="374" width="272" height="46" fill="#0c0c12"/>
  <rect x="10" y="381" width="28" height="28" rx="8" fill="rgba(245,158,11,.13)"/>
  <text x="24" y="399" text-anchor="middle" font-size="9.5" fill="#F59E0B" font-weight="700" font-family="system-ui">MJ</text>
  <text x="50" y="395" font-size="12" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">M. Johnson</text>
  <text x="50" y="410" font-size="9" fill="rgba(255,255,255,.3)" font-family="system-ui">Foreman · 6:52 AM · GPS ✓</text>
  <rect x="208" y="383" width="52" height="18" rx="9" fill="rgba(0,230,118,.1)"/>
  <text x="234" y="396" text-anchor="middle" font-size="9" fill="#00E676" font-weight="700" font-family="system-ui">In</text>
  <rect y="420" width="272" height="46" fill="#0a0a0f"/>
  <rect x="10" y="427" width="28" height="28" rx="8" fill="rgba(155,89,255,.13)"/>
  <text x="24" y="445" text-anchor="middle" font-size="9.5" fill="#9B59FF" font-weight="700" font-family="system-ui">SP</text>
  <text x="50" y="441" font-size="12" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">S. Patel</text>
  <text x="50" y="456" font-size="9" fill="rgba(255,255,255,.3)" font-family="system-ui">Electrician · 7:08 AM · GPS ✓</text>
  <rect x="208" y="429" width="52" height="18" rx="9" fill="rgba(0,230,118,.1)"/>
  <text x="234" y="442" text-anchor="middle" font-size="9" fill="#00E676" font-weight="700" font-family="system-ui">In</text>
  <rect y="466" width="272" height="46" fill="#0c0c12"/>
  <rect x="10" y="473" width="28" height="28" rx="8" fill="rgba(255,255,255,.05)"/>
  <text x="24" y="491" text-anchor="middle" font-size="9.5" fill="rgba(255,255,255,.25)" font-weight="700" font-family="system-ui">DT</text>
  <text x="50" y="487" font-size="12" fill="rgba(255,255,255,.4)" font-weight="600" font-family="system-ui">D. Torres</text>
  <text x="50" y="502" font-size="9" fill="rgba(255,255,255,.2)" font-family="system-ui">Pipe Layer · Off today</text>
  <rect x="208" y="475" width="52" height="18" rx="9" fill="rgba(255,255,255,.04)"/>
  <text x="234" y="488" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.22)" font-weight="700" font-family="system-ui">Off</text>
  <rect y="518" width="272" height="42" fill="#060609"/>
  <line x1="0" y1="518" x2="272" y2="518" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="34" y="539" text-anchor="middle" font-size="17">🏠</text><text x="34" y="554" text-anchor="middle" font-size="7" fill="#F59E0B" font-family="system-ui">HOME</text>
  <text x="82" y="539" text-anchor="middle" font-size="17">⏱</text><text x="82" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">TIME</text>
  <text x="136" y="539" text-anchor="middle" font-size="17">📋</text><text x="136" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">JOBS</text>
  <text x="190" y="539" text-anchor="middle" font-size="17">💬</text><text x="190" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">CHAT</text>
  <text x="240" y="539" text-anchor="middle" font-size="17">⚙️</text><text x="240" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">MORE</text>
  <rect x="97" y="556" width="78" height="4" rx="2" fill="rgba(255,255,255,.26)"/>
</svg>`;
}

function invoiceSVG() {
  return `<svg viewBox="0 0 272 560" xmlns="http://www.w3.org/2000/svg" width="272" height="560">
  <defs><linearGradient id="iag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#F59E0B"/><stop offset="100%" stop-color="#F97316"/></linearGradient></defs>
  <rect width="272" height="560" fill="#0a0a0f"/>
  <rect width="272" height="42" fill="#060609"/>
  <text x="18" y="28" font-size="13" fill="rgba(255,255,255,.85)" font-weight="600" font-family="system-ui">9:41</text>
  <rect x="96" y="9" width="80" height="22" rx="11" fill="#060609"/>
  <rect y="42" width="272" height="52" fill="#0e0e14"/>
  <text x="18" y="75" font-size="22" fill="rgba(255,255,255,.4)" font-family="system-ui">‹</text>
  <text x="136" y="74" text-anchor="middle" font-size="14" fill="white" font-weight="700" font-family="system-ui">Invoice</text>
  <text x="258" y="73" text-anchor="middle" font-size="22" fill="rgba(255,255,255,.38)" font-family="system-ui">⋯</text>
  <rect x="10" y="108" width="252" height="118" rx="16" fill="#111118" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="26" y="133" font-size="9.5" fill="rgba(255,255,255,.28)" letter-spacing="1.5" font-family="system-ui">INVOICE</text>
  <text x="26" y="152" font-size="18" fill="white" font-weight="800" font-family="system-ui">#INV-2847</text>
  <rect x="168" y="120" width="80" height="22" rx="11" fill="rgba(245,158,11,.1)" stroke="rgba(245,158,11,.28)" stroke-width="1"/>
  <text x="208" y="135" text-anchor="middle" font-size="9" fill="#F59E0B" font-weight="700" font-family="system-ui">PENDING</text>
  <text x="26" y="176" font-size="10.5" fill="rgba(255,255,255,.3)" font-family="system-ui">Riverside Development Inc.</text>
  <text x="26" y="192" font-size="10" fill="rgba(255,255,255,.2)" font-family="system-ui">Due Aug 15, 2026</text>
  <line x1="18" y1="204" x2="254" y2="204" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="218" font-size="9.5" fill="rgba(255,255,255,.28)" font-family="system-ui">TOTAL DUE</text>
  <text x="254" y="219" text-anchor="end" font-size="25" fill="#F59E0B" font-weight="900" font-family="system-ui">$14,012</text>
  <text x="18" y="252" font-size="8" fill="rgba(255,255,255,.2)" letter-spacing="2" font-family="system-ui">LINE ITEMS</text>
  <rect x="10" y="260" width="252" height="48" rx="11" fill="#111118" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="281" font-size="12.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Foundation Work</text>
  <text x="26" y="297" font-size="9.5" fill="rgba(255,255,255,.3)" font-family="system-ui">40 hrs × $120/hr</text>
  <text x="254" y="290" text-anchor="end" font-size="14" fill="white" font-weight="700" font-family="system-ui">$4,800</text>
  <rect x="10" y="314" width="252" height="48" rx="11" fill="#111118" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="335" font-size="12.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Materials Supply</text>
  <text x="26" y="351" font-size="9.5" fill="rgba(255,255,255,.3)" font-family="system-ui">Concrete + structural rebar</text>
  <text x="254" y="344" text-anchor="end" font-size="14" fill="white" font-weight="700" font-family="system-ui">$5,200</text>
  <rect x="10" y="368" width="252" height="48" rx="11" fill="#111118" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="389" font-size="12.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Equipment Rental</text>
  <text x="26" y="405" font-size="9.5" fill="rgba(255,255,255,.3)" font-family="system-ui">Excavator · 3 days + operator</text>
  <text x="254" y="398" text-anchor="end" font-size="14" fill="white" font-weight="700" font-family="system-ui">$2,400</text>
  <line x1="18" y1="428" x2="254" y2="428" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="26" y="448" font-size="11" fill="rgba(255,255,255,.28)" font-family="system-ui">HST (13%)</text>
  <text x="254" y="448" text-anchor="end" font-size="11" fill="rgba(255,255,255,.28)" font-family="system-ui">+$1,612</text>
  <text x="26" y="466" font-size="14" fill="white" font-weight="700" font-family="system-ui">Total</text>
  <text x="254" y="467" text-anchor="end" font-size="18" fill="#F59E0B" font-weight="900" font-family="system-ui">$14,012</text>
  <rect x="10" y="482" width="252" height="52" rx="14" fill="url(#iag)"/>
  <text x="136" y="513" text-anchor="middle" font-size="14" fill="#000" font-weight="800" font-family="system-ui">Send to Client →</text>
  <rect x="10" y="542" width="120" height="38" rx="10" fill="#141420" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
  <text x="70" y="565" text-anchor="middle" font-size="10.5" fill="rgba(255,255,255,.42)" font-family="system-ui">⬇ Download PDF</text>
  <rect x="142" y="542" width="120" height="38" rx="10" fill="#141420" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
  <text x="202" y="565" text-anchor="middle" font-size="10.5" fill="rgba(255,255,255,.42)" font-family="system-ui">📤 Share</text>
  <rect x="97" y="556" width="78" height="4" rx="2" fill="rgba(255,255,255,.24)"/>
</svg>`;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock,         color: "#22c55e", title: "Time Tracking + Clock-In Photos",   body: "Workers clock in with a live selfie. GPS coordinates verified against the project site. Off-site and duplicate check-ins flagged automatically." },
  { icon: ShieldCheck,   color: "#ef4444", title: "Safety Incident Logs",              body: "Log near-misses, injuries, and hazards on the spot. Track severity, add witnesses, and generate incident reports in one tap." },
  { icon: CalendarDays,  color: "#3b82f6", title: "Weather-Aware Scheduling",          body: "Live 7-day forecast overlaid on your project calendar. Severe weather days highlighted automatically so you can reschedule before it's a problem." },
  { icon: FileText,      color: "#f59e0b", title: "Estimates & Invoices",              body: "Build itemized estimates, convert to invoices with one click, and export professional PDFs with your company branding." },
  { icon: BarChart3,     color: "#8b5cf6", title: "Reports & Payroll Export",          body: "Full payroll summaries, project cost reports, and timesheet detail — exportable to PDF and CSV." },
  { icon: Sparkles,      color: "#f59e0b", title: "AI Daily Brief",                   body: "Every morning, an AI-generated site briefing lands on your dashboard — crew on site, overdue tasks, safety issues, and what to tackle first." },
  { icon: ClipboardList, color: "#06b6d4", title: "Punch Lists & RFIs",               body: "Create punch list items with photos and assign them to crew. Submit and track RFIs end-to-end without email chains." },
  { icon: Package,       color: "#10b981", title: "Material Tracker",                  body: "Log deliveries and usage by trade. Automatic low-stock alerts. Export materials summaries as PDFs per project." },
  { icon: MessageSquare, color: "#6366f1", title: "Crew Messaging",                    body: "Per-project group chats with file and photo sharing. Real-time, reliable delivery — no app install needed for crew." },
  { icon: MapPin,        color: "#f97316", title: "GPS Site Map",                      body: "Every project plotted on an interactive map. Clock-in locations pinned per worker. Off-site check-ins flagged for review." },
  { icon: Truck,         color: "#84cc16", title: "Equipment Management",              body: "Track every piece of equipment — status, assignment, daily rate, and maintenance notes — across all your job sites." },
  { icon: Globe,         color: "#a78bfa", title: "15-Language Support",               body: "Full UI localization in English, French, Spanish, Portuguese, Arabic, Punjabi, Hindi, Tagalog, Polish, and more." },
  { icon: WifiOff,       color: "#22d3ee", title: "Works Offline",                     body: "Clock in, log tasks, and capture safety incidents even with no signal. Changes sync automatically when you're back online." },
];

const TRADES = ["General Contracting","Civil / Utilities","Electrical","Plumbing","HVAC","Roofing","Concrete & Masonry","Steel / Structural","Framing","Drywall","Flooring","Painting","Excavation","Landscaping","Insulation"];

const STEPS = [
  { n:"01", title:"Create your company",  body:"Sign up, enter your company name and trade, and invite your first crew member with a generated invite code. Takes under 2 minutes." },
  { n:"02", title:"Add projects & crew",  body:"Set up your job sites, assign workers, and configure roles. Most teams are running in under 10 minutes — no training required." },
  { n:"03", title:"Run your site",         body:"Crew clocks in from their phone. You see it live on your dashboard. Tasks, safety, invoices — all in one place." },
];

const STATS = [
  { target: 13, suffix: "+", label: "Tools built in", sub: "Time, invoices, safety, GPS, and more" },
  { target: 15, suffix: "",  label: "Languages",      sub: "Crew speaks your language" },
  { target: 0,  prefix: "$", suffix: "", label: "To start",  sub: "No credit card required" },
  { target: 100, suffix: "%", label: "Offline-capable", sub: "Works on any job site" },
];

const PHOTOS = [
  { src: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=900&q=80", alt: "Workers on scaffolding" },
  { src: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=900&q=80", alt: "Construction worker with hardhat" },
  { src: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=900&q=80", alt: "Job site overview" },
  { src: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=900&q=80", alt: "Building under construction" },
  { src: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=900&q=80", alt: "Crane on site" },
  { src: "https://images.unsplash.com/photo-1565008447742-97f6f38c985c?w=900&q=80", alt: "Safety on site" },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function LandingPage() {

  useEffect(() => {
    let cancelled = false;
    let starRaf: number;
    let phoneRaf: number;

    // ── Warp starfield ──────────────────────────────────────────────────────
    const cv = document.getElementById("starCanvas") as HTMLCanvasElement | null;
    if (cv) {
      const ctx = cv.getContext("2d")!;
      let W = 0, H = 0;
      const STARS = Array.from({ length: 140 }, () => ({
        x: (Math.random() - .5) * 2, y: (Math.random() - .5) * 2,
        z: Math.random() * .95 + .05, spd: Math.random() * .0006 + .0002,
        warm: Math.random() < .65,
      }));
      const resize = () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; };
      window.addEventListener("resize", resize); resize();
      const drawStars = () => {
        if (cancelled) return;
        ctx.fillStyle = "rgba(5,5,9,.12)";
        ctx.fillRect(0, 0, W, H);
        for (const s of STARS) {
          const sx = (s.x / s.z) * (W * .5) + W * .5;
          const sy = (s.y / s.z) * (H * .5) + H * .5;
          if (sx < -5 || sx > W + 5 || sy < -5 || sy > H + 5) {
            s.x = (Math.random() - .5) * 2; s.y = (Math.random() - .5) * 2; s.z = 1; continue;
          }
          const pz = s.z - s.spd;
          const px = (s.x / pz) * (W * .5) + W * .5;
          const py = (s.y / pz) * (H * .5) + H * .5;
          const sz = Math.max(.3, (1 - s.z) * 3.5);
          const al = Math.min(1, (1 - s.z) * 1.4 + .08);
          const col = s.warm ? `rgba(245,${Math.floor(130 + Math.random() * 100)},11,` : "rgba(255,255,255,";
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy);
          ctx.strokeStyle = col + (al * .45) + ")"; ctx.lineWidth = sz * .7; ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2);
          ctx.fillStyle = col + al + ")"; ctx.fill();
          s.z -= s.spd;
          if (s.z <= .02) { s.x = (Math.random() - .5) * 2; s.y = (Math.random() - .5) * 2; s.z = 1; }
        }
        starRaf = requestAnimationFrame(drawStars);
      };
      drawStars();
    }

    // ── Phone 3D spin ───────────────────────────────────────────────────────
    const phoneEl = document.getElementById("phoneWrap");
    if (phoneEl) {
      let angY = 0, angX = 6, hov = false, mox = 0, moy = 0, lastT = 0;
      const onMM = (e: MouseEvent) => { mox = e.clientX; moy = e.clientY; };
      const onME = () => { hov = true; };
      const onML = () => { hov = false; };
      document.addEventListener("mousemove", onMM);
      phoneEl.addEventListener("mouseenter", onME);
      phoneEl.addEventListener("mouseleave", onML);
      const spinLoop = (ts: number) => {
        if (cancelled) return;
        const dt = Math.min(ts - lastT, 50); lastT = ts;
        if (!hov) { angY += dt * .026; angX += (6 - angX) * .04; }
        else {
          const tX = -(moy / window.innerHeight - .5) * 28;
          const tY =  (mox / window.innerWidth  - .5) * 36;
          angX += (tX - angX) * .09; angY += (tY - angY) * .09;
        }
        phoneEl.style.transform = `rotateX(${angX}deg) rotateY(${angY}deg)`;
        phoneRaf = requestAnimationFrame(spinLoop);
      };
      phoneRaf = requestAnimationFrame(spinLoop);
      (phoneEl as any)._clCleanup = () => {
        document.removeEventListener("mousemove", onMM);
        phoneEl.removeEventListener("mouseenter", onME);
        phoneEl.removeEventListener("mouseleave", onML);
      };
    }

    // ── Floating headline ───────────────────────────────────────────────────
    [".hl-1", ".hl-2", ".hl-3"].forEach((sel, i) => {
      const el = document.querySelector(sel) as HTMLElement | null;
      setTimeout(() => {
        if (el && !cancelled) { el.style.opacity = "1"; el.classList.add("up"); }
      }, 1050 + i * 160);
    });

    // ── 3D card tilt ────────────────────────────────────────────────────────
    const cards = document.querySelectorAll<HTMLElement>(".feat-card");
    const cardCleanups: Array<() => void> = [];
    cards.forEach(card => {
      const shine = card.querySelector<HTMLElement>(".feat-shine");
      const mm = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5;
        const y = (e.clientY - r.top)  / r.height - .5;
        card.style.transform = `perspective(700px) rotateX(${-y * 13}deg) rotateY(${x * 13}deg) translateZ(10px)`;
        if (shine) shine.style.background = `radial-gradient(circle at ${(x+.5)*100}% ${(y+.5)*100}%, rgba(255,255,255,.07) 0%, transparent 65%)`;
      };
      const ml = () => {
        card.style.transform = "perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0px)";
        if (shine) shine.style.background = "none";
      };
      card.addEventListener("mousemove", mm);
      card.addEventListener("mouseleave", ml);
      cardCleanups.push(() => { card.removeEventListener("mousemove", mm); card.removeEventListener("mouseleave", ml); });
    });

    // ── Scroll reveal ───────────────────────────────────────────────────────
    // Add class to body FIRST so reveal elements are hidden only when JS works
    document.body.classList.add("reveal-active");
    const revObs = new IntersectionObserver((entries) => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("revealed"); revObs.unobserve(e.target); } });
    }, { threshold: 0.07, rootMargin: "0px 0px -40px 0px" });
    document.querySelectorAll(".reveal").forEach(el => revObs.observe(el));

    // ── Animated counters ───────────────────────────────────────────────────
    const cntObs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        const el = e.target as HTMLElement;
        const target = parseInt(el.dataset.target || "0");
        const suffix = el.dataset.suffix || "";
        const prefix = el.dataset.prefix || "";
        const dur = 1600;
        const start = Date.now();
        const tick = () => {
          const p = Math.min((Date.now() - start) / dur, 1);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = prefix + Math.floor(eased * target).toLocaleString() + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        tick();
        cntObs.unobserve(el);
      });
    }, { threshold: 0.6 });
    document.querySelectorAll(".counter").forEach(el => cntObs.observe(el));

    return () => {
      cancelled = true;
      cancelAnimationFrame(starRaf);
      cancelAnimationFrame(phoneRaf);
      const phoneEl2 = document.getElementById("phoneWrap");
      if (phoneEl2 && (phoneEl2 as any)._clCleanup) (phoneEl2 as any)._clCleanup();
      cardCleanups.forEach(fn => fn());
    };
  }, []);

  return (
    <div className="min-h-screen text-white overflow-x-hidden" style={{ background: "#06060e" }}>

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-white/[0.06]" style={{ background: "rgba(6,6,14,.92)" }}>
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-amber-500/20">
              <HardHat size={13} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[15px] font-black tracking-tight">Constra</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-[13px] text-white/40 hover:text-white/70 transition-colors font-medium hidden sm:block">Sign In</Link>
            <Link href="/onboarding" className="bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 text-black font-bold text-[12px] px-4 py-2 rounded-lg transition-opacity flex items-center gap-1.5 shadow-md shadow-amber-500/20">
              Get Started <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── 3D Cinematic Hero ─────────────────────────────────────────────── */}
      <section id="cl-hero">
        <canvas id="starCanvas" />
        <div className="cl-glow" />
        <div className="cl-inner">
          <div>
            <div className="cl-eye">
              <div className="cl-eye-dot" />
              Free During Beta · No Credit Card
            </div>
            <h1 className="cl-h">
              <span className="hl hl-1">STOP RUNNING</span>
              <span className="hl hl-2">YOUR SITE ON</span>
              <span className="hl hl-3">WHATSAPP.</span>
            </h1>
            <p className="cl-sub">
              GPS clock-in with photos, instant invoicing, crew scheduling, safety logs — every tool your job site needs in one login.
            </p>
            <div className="cl-ctas">
              <a className="cl-btn" href="/onboarding">
                <Zap size={14} /> Start for Free →
              </a>
              <a className="cl-btn-ghost" href="#features">See Features</a>
            </div>
            <div className="cl-trust">
              <div className="cl-avs">
                {[["MJ","rgba(245,158,11,.15)","#F59E0B"],["SP","rgba(155,89,255,.15)","#9B59FF"],["DT","rgba(0,230,118,.15)","#00E676"],["KL","rgba(239,68,68,.15)","#ef4444"]].map(([id,bg,c])=>(
                  <div key={id} className="cl-av" style={{background:bg,color:c}}>{id}</div>
                ))}
              </div>
              <p className="cl-trust-txt"><strong>Contractors</strong> ditching spreadsheets every day</p>
            </div>
          </div>
          <div className="cl-vis">
            <div className="cl-scene">
              <div className="cl-wrap" id="phoneWrap">
                <div className="cl-face"           dangerouslySetInnerHTML={{ __html: dashSVG() }} />
                <div className="cl-face cl-face-back" dangerouslySetInnerHTML={{ __html: invoiceSVG() }} />
                <div className="cl-fb cl-fb1">
                  <div className="cl-fb-ico" style={{ background:"rgba(0,230,118,.1)",color:"#00E676" }}>📍</div>
                  <div><div className="cl-fb-t">GPS Verified</div><div className="cl-fb-s">M. Johnson · Downtown Site</div></div>
                </div>
                <div className="cl-fb cl-fb2">
                  <div className="cl-fb-ico" style={{ background:"rgba(245,158,11,.1)",color:"#F59E0B" }}>💰</div>
                  <div><div className="cl-fb-t">Invoice Sent · $14,012</div><div className="cl-fb-s">Riverside Development</div></div>
                </div>
                <div className="cl-fb cl-fb3">
                  <div className="cl-fb-ico" style={{ background:"rgba(155,89,255,.1)",color:"#9B59FF" }}>🛡️</div>
                  <div><div className="cl-fb-t">Safety Log Filed</div><div className="cl-fb-s">Hwy 401 · Near-miss report</div></div>
                </div>
              </div>
              <div className="cl-shadow" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Animated Stats Bar ─────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-white/[0.04]" style={{ background: "#07070f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
            {STATS.map((s, i) => (
              <div key={i} className="reveal text-center" style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="text-[52px] md:text-[60px] font-black leading-none mb-2" style={{ color: "#F59E0B", fontVariantNumeric: "tabular-nums" }}>
                  <span className="counter" data-target={s.target} data-suffix={s.suffix} data-prefix={s.prefix || ""}>
                    {s.prefix || ""}{0}{s.suffix}
                  </span>
                </div>
                <div className="text-[15px] font-bold text-white/80 mb-1">{s.label}</div>
                <div className="text-[12px] text-white/30">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Full-Bleed Photo + Quote ──────────────────────────────────────── */}
      <section className="relative min-h-[520px] flex items-center overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80"
          alt="Construction site"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: .22 }}
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #06060e 0%, rgba(6,6,14,.85) 50%, rgba(6,6,14,.6) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, #06060e 30%, transparent 70%)" }} />
        <div className="relative max-w-5xl mx-auto px-6 py-28">
          <div className="max-w-2xl reveal">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-5" style={{ color: "#F59E0B" }}>Built for the field</p>
            <h2 className="text-[clamp(32px,5vw,58px)] font-black leading-[.92] tracking-tight mb-6 text-white">
              Every job site is<br />
              <span style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>different.</span><br />
              Your app shouldn't be.
            </h2>
            <p className="text-[16px] leading-relaxed text-white/50 max-w-md mb-8">
              Constra adapts to how your crew actually works — on site, off grid, in 15 languages, across every trade.
            </p>
            <Link href="/onboarding" className="inline-flex items-center gap-2 font-bold text-[14px]" style={{ color: "#F59E0B" }}>
              Get started free <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Scrolling Photo Strip ──────────────────────────────────────────── */}
      <section className="py-20 overflow-hidden" style={{ background: "#06060e" }}>
        <p className="text-center text-[11px] font-bold text-white/20 uppercase tracking-widest mb-10 px-6">Built for every job site</p>
        <div className="flex gap-4 px-6 overflow-x-auto no-scrollbar pb-2">
          {PHOTOS.map((photo, i) => (
            <div key={i} className="flex-shrink-0 rounded-2xl overflow-hidden reveal" style={{ width: 320, height: 220, transitionDelay: `${i * 60}ms` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.alt} className="w-full h-full object-cover" style={{ opacity: .55, transition: "opacity .4s, transform .5s", transform: "scale(1.02)" }}
                onMouseEnter={e => { (e.target as HTMLImageElement).style.opacity = ".75"; (e.target as HTMLImageElement).style.transform = "scale(1)"; }}
                onMouseLeave={e => { (e.target as HTMLImageElement).style.opacity = ".55"; (e.target as HTMLImageElement).style.transform = "scale(1.02)"; }}
              />
            </div>
          ))}
        </div>
      </section>

      {/* ── Pain Points ───────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/[0.04]" style={{ background: "#07070f" }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 reveal">
            <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "#F59E0B" }}>Sound familiar?</p>
            <h2 className="text-[clamp(28px,4vw,46px)] font-black tracking-tight">These problems end today.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { before:"Crew clocking in from the couch",          after:"GPS + selfie clock-in locks them to the site. Every check-in is time-stamped, location-verified, and photo-confirmed." },
              { before:"Chasing timesheets every Friday",          after:"Live crew status on your dashboard. Payroll summary exports to CSV or PDF the second the week ends — no chasing required." },
              { before:"Juggling WhatsApp, spreadsheets, & email", after:"Time tracking, invoicing, safety logs, scheduling, and crew chat — one app, one login, zero juggling." },
            ].map((p, i) => (
              <div key={i} className="reveal rounded-2xl p-7 border border-white/[0.06] hover:border-white/[0.10] transition-all" style={{ background: "#0b0b15", transitionDelay: `${i * 80}ms` }}>
                <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 mb-4 border" style={{ background: "rgba(239,68,68,.07)", borderColor: "rgba(239,68,68,.15)" }}>
                  <span className="text-[11px] font-bold" style={{ color: "#ef4444" }}>The problem</span>
                </div>
                <p className="text-[15px] font-bold text-white/80 leading-snug mb-5">{p.before}</p>
                <div className="h-px mb-5" style={{ background: "rgba(255,255,255,.05)" }} />
                <div className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 mb-4 border" style={{ background: "rgba(34,197,94,.07)", borderColor: "rgba(34,197,94,.15)" }}>
                  <span className="text-[11px] font-bold" style={{ color: "#22c55e" }}>The fix</span>
                </div>
                <p className="text-[13px] text-white/45 leading-relaxed">{p.after}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features (3D tilt cards) ──────────────────────────────────────── */}
      <section id="features" className="py-28 px-6 border-t border-white/[0.04]" style={{ background: "#06060e" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 reveal">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-2 border border-white/[0.07] mb-5" style={{ background: "rgba(255,255,255,.03)" }}>
              <Layers size={12} className="text-white/30" />
              <span className="text-[12px] text-white/35 font-semibold">Every feature · one app · no add-ons</span>
            </div>
            <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-tight mb-4">Every tool your crew needs</h2>
            <p className="text-[15px] text-white/40 max-w-lg mx-auto leading-relaxed">No integrations. No extra seats. No add-ons. Everything to run a job site, built in.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="feat-card reveal rounded-2xl p-6 border border-white/[0.06] relative overflow-hidden cursor-default" style={{ background: "#0c0c18", transition: "transform .15s ease, border-color .2s", transitionDelay: `${(i % 6) * 40}ms` }}>
                {/* Shine overlay */}
                <div className="feat-shine absolute inset-0 pointer-events-none" style={{ borderRadius: "inherit" }} />
                {/* Top color bar on hover */}
                <div className="absolute top-0 left-0 right-0 h-[2px] opacity-0 hover:opacity-100 transition-opacity" style={{ background: f.color }} />
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-transform" style={{ background: f.color + "18" }}>
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="text-[14px] font-bold text-white mb-2 leading-snug">{f.title}</h3>
                <p className="text-[13px] text-white/38 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/[0.04]" style={{ background: "#07070f" }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 reveal">
            <h2 className="text-[clamp(28px,4vw,46px)] font-black tracking-tight mb-4">Up and running in minutes</h2>
            <p className="text-[15px] text-white/40">No training. No onboarding calls. No IT department required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {STEPS.map((s, i) => (
              <div key={s.n} className="reveal" style={{ transitionDelay: `${i * 100}ms` }}>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0" style={{ background: "rgba(245,158,11,.08)", borderColor: "rgba(245,158,11,.18)" }}>
                    <span className="text-[13px] font-black" style={{ color: "#F59E0B" }}>{s.n}</span>
                  </div>
                  {i < 2 && <div className="h-px flex-1" style={{ background: "rgba(255,255,255,.05)" }} />}
                </div>
                <h3 className="text-[17px] font-bold text-white mb-3">{s.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trades ────────────────────────────────────────────────────────── */}
      <section className="py-16 px-6 border-t border-white/[0.04]" style={{ background: "#06060e" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[11px] font-bold text-white/20 uppercase tracking-widest mb-8">Built for every trade</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRADES.map((t) => (
              <span key={t} className="rounded-full px-4 py-1.5 text-[12px] text-white/40 font-medium border border-white/[0.06]" style={{ background: "rgba(255,255,255,.03)" }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Video Demo ────────────────────────────────────────────────────── */}
      {(() => {
        const VIDEO_EMBED_URL = "";
        return (
          <section className="py-28 px-6 border-t border-white/[0.04]" style={{ background: "#07070f" }}>
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-10 reveal">
                <p className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: "#F59E0B" }}>See It In Action</p>
                <h2 className="text-[clamp(26px,3.5vw,40px)] font-black tracking-tight mb-2">From chaos to clarity in 2 minutes</h2>
                <p className="text-[14px] text-white/35 mt-2">Watch how a real crew uses Constra on a job site</p>
              </div>
              <div className="reveal rounded-2xl overflow-hidden border border-white/[0.07] shadow-2xl" style={{ paddingBottom: VIDEO_EMBED_URL ? "56.25%" : undefined, position: VIDEO_EMBED_URL ? "relative" : undefined, background: "#0b0b15" }}>
                {VIDEO_EMBED_URL ? (
                  <iframe src={VIDEO_EMBED_URL} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen" allowFullScreen />
                ) : (
                  <div className="flex flex-col items-center justify-center py-24 gap-5 relative">
                    <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,1) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,1) 1px,transparent 1px)", backgroundSize: "40px 40px" }} />
                    <div className="absolute w-64 h-32 rounded-full blur-3xl" style={{ background: "rgba(245,158,11,.08)" }} />
                    <div className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl" style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)", boxShadow: "0 16px 48px rgba(245,158,11,.25)" }}>
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-black ml-1"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div className="relative text-center">
                      <p className="text-[15px] font-semibold text-white/50">Demo video coming soon</p>
                      <p className="text-[12px] text-white/20 mt-1">Add a Loom or YouTube URL to VIDEO_EMBED_URL</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        );
      })()}

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className="py-28 px-6 border-t border-white/[0.04]" id="pricing" style={{ background: "#06060e" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12 reveal">
            <h2 className="text-[clamp(30px,4vw,50px)] font-black tracking-tight mb-3">Free to start.</h2>
            <p className="text-[15px] text-white/40">Every feature unlocked from day one. No credit card required.</p>
          </div>
          <div className="mb-6 grid grid-cols-3 gap-3 text-center reveal">
            {[
              { name:"Enterprise tools",  price:"$600–$1,200/mo", note:"Per project pricing",          dim:true  },
              { name:"Mid-market apps",   price:"$200–$500/mo",   note:"Features locked behind tiers", dim:true  },
              { name:"Constra",           price:"Free",            note:"All features included",        dim:false },
            ].map((c) => (
              <div key={c.name} className={`rounded-2xl border p-5 transition-all ${c.dim ? "border-white/[0.05] opacity-50" : "border-amber-500/25"}`} style={c.dim ? { background: "rgba(255,255,255,.02)" } : { background: "rgba(245,158,11,.05)" }}>
                <p className={`text-[10px] font-bold uppercase tracking-wide mb-1.5 ${c.dim ? "text-white/25" : "text-amber-400"}`}>{c.name}</p>
                <p className={`text-[20px] font-black mb-1 ${c.dim ? "text-white/35" : "text-white"}`}>{c.price}</p>
                <p className={`text-[10px] ${c.dim ? "text-white/18" : "text-white/40"}`}>{c.note}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl p-8 relative border reveal" style={{ background: "#0c0c18", borderColor: "rgba(245,158,11,.22)" }}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wide" style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}>Early Access</div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <div className="text-5xl font-black text-white mb-1">$0</div>
                <p className="text-[13px] text-white/30">No credit card · All features included</p>
              </div>
              <Link href="/onboarding" className="inline-flex items-center justify-center gap-2 text-black font-black text-[14px] px-8 py-3.5 rounded-xl shadow-xl" style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)", boxShadow: "0 16px 40px rgba(245,158,11,.22)" }}>
                <Zap size={15} /> Get Started Free
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
              {["Unlimited crew members","Unlimited active projects","Time tracking & clock-in photos","GPS verification on every clock-in","Estimates & professional invoices","PDF export","Document vault & file storage","Safety incident logging","Equipment management","RFIs & punch lists","AI Daily Brief","Crew messaging","Weather-aware scheduling","Advanced reports & analytics","Custom roles & permissions","15-language support","Smart material tracker","Works offline — syncs on reconnect","Full admin tools & audit logs"].map((f) => (
                <div key={f} className="flex items-start gap-2 text-[12px] text-white/45">
                  <Check size={11} className="mt-0.5 flex-shrink-0" style={{ color: "#F59E0B" }} />{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-32 px-6 border-t border-white/[0.04] relative overflow-hidden" style={{ background: "#07070f" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 inset-x-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(245,158,11,.2), transparent)" }} />
          <div className="absolute bottom-0 inset-x-0 h-px" style={{ background: "linear-gradient(to right, transparent, rgba(245,158,11,.08), transparent)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] rounded-full blur-[120px]" style={{ background: "rgba(245,158,11,.04)" }} />
        </div>
        <div className="max-w-2xl mx-auto text-center relative reveal">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl" style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)", boxShadow: "0 20px 60px rgba(245,158,11,.25)" }}>
            <HardHat size={26} className="text-black" />
          </div>
          <h2 className="text-[clamp(28px,4vw,48px)] font-black tracking-tight mb-5 leading-tight">Your job site,<br />finally under control.</h2>
          <p className="text-[16px] text-white/40 mb-10 max-w-sm mx-auto leading-relaxed">The only construction app that covers everything — from first clock-in to final invoice.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/onboarding" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-black font-black text-[15px] px-8 py-4 rounded-xl shadow-2xl" style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)", boxShadow: "0 20px 60px rgba(245,158,11,.22)" }}>
              <Zap size={16} /> Create Your Account — It&apos;s Free
            </Link>
            <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 text-white/35 hover:text-white/60 font-semibold text-[14px] transition-colors">
              Already have an account? Sign In <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t py-10 px-6" style={{ borderColor: "rgba(255,255,255,.05)", background: "#06060e" }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg,#F59E0B,#F97316)" }}><HardHat size={12} className="text-black" /></div>
            <span className="text-[14px] font-bold">Constra</span>
            <span className="text-white/20 text-[12px]">· Field Workforce Management</span>
          </div>
          <div className="flex items-center gap-5 text-[12px] text-white/25">
            <Link href="/login"      className="hover:text-white/50 transition-colors">Sign In</Link>
            <Link href="/onboarding" className="hover:text-white/50 transition-colors">Get Started</Link>
            <Link href="/support"    className="hover:text-white/50 transition-colors">Support</Link>
            <Link href="/terms"      className="hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/privacy"    className="hover:text-white/50 transition-colors">Privacy</Link>
          </div>
          <p className="text-[11px] text-white/15">© {new Date().getFullYear()} Constra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
