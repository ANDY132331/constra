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
    <linearGradient id="dag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFA500"/><stop offset="100%" stop-color="#FF4500"/></linearGradient>
    <linearGradient id="dmg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#080d13"/><stop offset="100%" stop-color="#050a10"/></linearGradient>
    <filter id="dgf"><feGaussianBlur stdDeviation="5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <rect width="272" height="560" fill="#0a0a0a"/>
  <rect width="272" height="42" fill="#060606"/>
  <text x="18" y="28" font-size="13" fill="rgba(255,255,255,.85)" font-weight="600" font-family="system-ui">9:41</text>
  <rect x="232" y="20" width="26" height="11" rx="3.5" fill="none" stroke="rgba(255,255,255,.3)" stroke-width="1"/>
  <rect x="234" y="22" width="20" height="7" rx="2" fill="#FFA500"/>
  <rect x="96" y="9" width="80" height="22" rx="11" fill="#060606"/>
  <rect y="42" width="272" height="52" fill="#0e0e0e"/>
  <text x="18" y="74" font-size="13.5" fill="white" font-weight="900" letter-spacing="3.5" font-family="system-ui">CONSTRA</text>
  <rect x="185" y="57" width="72" height="22" rx="11" fill="rgba(0,230,118,.1)"/>
  <circle cx="197" cy="68" r="3.5" fill="#00E676"/>
  <text x="205" y="72" font-size="9.5" fill="#00E676" font-weight="700" font-family="system-ui">8 ACTIVE</text>
  <rect y="94" width="272" height="34" fill="#0a0a0a"/>
  <text x="18" y="116" font-size="12" fill="rgba(255,255,255,.38)" font-family="system-ui">Good morning, Mike 👷</text>
  <rect y="128" width="272" height="78" fill="#0a0a0a"/>
  <rect x="8" y="134" width="77" height="62" rx="12" fill="#111" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="46" y="162" text-anchor="middle" font-size="28" font-weight="900" fill="white" font-family="system-ui">12</text>
  <text x="46" y="186" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">WORKERS</text>
  <rect x="93" y="134" width="86" height="62" rx="12" fill="#111" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="136" y="162" text-anchor="middle" font-size="28" font-weight="900" fill="#FFA500" font-family="system-ui">3</text>
  <text x="136" y="186" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">PROJECTS</text>
  <rect x="187" y="134" width="77" height="62" rx="12" fill="#111" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="225" y="157" text-anchor="middle" font-size="20" font-weight="900" fill="white" font-family="system-ui">$42k</text>
  <text x="225" y="173" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">THIS</text>
  <text x="225" y="186" text-anchor="middle" font-size="7.5" fill="rgba(255,255,255,.3)" letter-spacing="1" font-family="system-ui">MONTH</text>
  <rect y="218" width="272" height="128" fill="url(#dmg)"/>
  <text x="18" y="232" font-size="7.5" fill="rgba(255,255,255,.22)" letter-spacing="2" font-family="system-ui">CREW LOCATIONS</text>
  <line x1="0" y1="240" x2="272" y2="240" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="268" x2="272" y2="268" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="296" x2="272" y2="296" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="324" x2="272" y2="324" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="45" y1="218" x2="45" y2="346" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="91" y1="218" x2="91" y2="346" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="137" y1="218" x2="137" y2="346" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="183" y1="218" x2="183" y2="346" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="229" y1="218" x2="229" y2="346" stroke="rgba(255,255,255,.04)" stroke-width="1"/>
  <line x1="0" y1="273" x2="272" y2="273" stroke="rgba(255,255,255,.09)" stroke-width="2.5"/>
  <line x1="118" y1="218" x2="118" y2="346" stroke="rgba(255,255,255,.09)" stroke-width="2.5"/>
  <line x1="0" y1="310" x2="272" y2="310" stroke="rgba(255,255,255,.05)" stroke-width="1.5"/>
  <circle cx="118" cy="273" r="24" fill="rgba(255,165,0,.15)" filter="url(#dgf)"/>
  <circle cx="118" cy="273" r="12" fill="rgba(255,165,0,.32)"/>
  <circle cx="118" cy="273" r="5.5" fill="#FFA500"/>
  <polygon points="118,257 123,269 118,282 113,269" fill="#FFA500"/>
  <circle cx="118" cy="273" r="22" fill="none" stroke="rgba(255,165,0,.28)" stroke-width="1.5">
    <animate attributeName="r" from="18" to="44" dur="2.4s" repeatCount="indefinite"/>
    <animate attributeName="opacity" from=".6" to="0" dur="2.4s" repeatCount="indefinite"/>
  </circle>
  <rect x="60" y="244" width="116" height="20" rx="6" fill="rgba(0,0,0,.78)"/>
  <text x="118" y="258" text-anchor="middle" font-size="8.5" fill="rgba(255,255,255,.75)" font-family="system-ui">📍 Downtown · 8 on-site</text>
  <circle cx="192" cy="305" r="9" fill="rgba(155,89,255,.3)"/><circle cx="192" cy="305" r="4.5" fill="#9B59FF"/>
  <circle cx="66" cy="317" r="9" fill="rgba(0,230,118,.3)"/><circle cx="66" cy="317" r="4.5" fill="#00E676"/>
  <rect y="346" width="272" height="28" fill="#0a0a0a"/>
  <text x="18" y="363" font-size="7.5" fill="rgba(255,255,255,.22)" letter-spacing="2" font-family="system-ui">RECENT CLOCK-INS</text>
  <rect y="374" width="272" height="46" fill="#0c0c0c"/>
  <rect x="10" y="381" width="28" height="28" rx="8" fill="rgba(255,165,0,.13)"/>
  <text x="24" y="399" text-anchor="middle" font-size="9.5" fill="#FFA500" font-weight="700" font-family="system-ui">MJ</text>
  <text x="50" y="395" font-size="12" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">M. Johnson</text>
  <text x="50" y="410" font-size="9" fill="rgba(255,255,255,.3)" font-family="system-ui">Foreman · 6:52 AM · GPS ✓</text>
  <rect x="208" y="383" width="52" height="18" rx="9" fill="rgba(0,230,118,.1)"/>
  <text x="234" y="396" text-anchor="middle" font-size="9" fill="#00E676" font-weight="700" font-family="system-ui">In</text>
  <rect y="420" width="272" height="46" fill="#0a0a0a"/>
  <rect x="10" y="427" width="28" height="28" rx="8" fill="rgba(155,89,255,.13)"/>
  <text x="24" y="445" text-anchor="middle" font-size="9.5" fill="#9B59FF" font-weight="700" font-family="system-ui">SP</text>
  <text x="50" y="441" font-size="12" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">S. Patel</text>
  <text x="50" y="456" font-size="9" fill="rgba(255,255,255,.3)" font-family="system-ui">Electrician · 7:08 AM · GPS ✓</text>
  <rect x="208" y="429" width="52" height="18" rx="9" fill="rgba(0,230,118,.1)"/>
  <text x="234" y="442" text-anchor="middle" font-size="9" fill="#00E676" font-weight="700" font-family="system-ui">In</text>
  <rect y="466" width="272" height="46" fill="#0c0c0c"/>
  <rect x="10" y="473" width="28" height="28" rx="8" fill="rgba(255,255,255,.05)"/>
  <text x="24" y="491" text-anchor="middle" font-size="9.5" fill="rgba(255,255,255,.25)" font-weight="700" font-family="system-ui">DT</text>
  <text x="50" y="487" font-size="12" fill="rgba(255,255,255,.4)" font-weight="600" font-family="system-ui">D. Torres</text>
  <text x="50" y="502" font-size="9" fill="rgba(255,255,255,.2)" font-family="system-ui">Pipe Layer · Off today</text>
  <rect x="208" y="475" width="52" height="18" rx="9" fill="rgba(255,255,255,.04)"/>
  <text x="234" y="488" text-anchor="middle" font-size="9" fill="rgba(255,255,255,.22)" font-weight="700" font-family="system-ui">Off</text>
  <rect y="518" width="272" height="42" fill="#060606"/>
  <line x1="0" y1="518" x2="272" y2="518" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="34" y="539" text-anchor="middle" font-size="17">🏠</text><text x="34" y="554" text-anchor="middle" font-size="7" fill="#FFA500" font-family="system-ui">HOME</text>
  <text x="82" y="539" text-anchor="middle" font-size="17">⏱</text><text x="82" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">TIME</text>
  <text x="136" y="539" text-anchor="middle" font-size="17">📋</text><text x="136" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">JOBS</text>
  <text x="190" y="539" text-anchor="middle" font-size="17">💬</text><text x="190" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">CHAT</text>
  <text x="240" y="539" text-anchor="middle" font-size="17">⚙️</text><text x="240" y="554" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.25)" font-family="system-ui">MORE</text>
  <rect x="97" y="556" width="78" height="4" rx="2" fill="rgba(255,255,255,.26)"/>
</svg>`;
}

function invoiceSVG() {
  return `<svg viewBox="0 0 272 560" xmlns="http://www.w3.org/2000/svg" width="272" height="560">
  <defs><linearGradient id="iag" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#FFA500"/><stop offset="100%" stop-color="#FF4500"/></linearGradient></defs>
  <rect width="272" height="560" fill="#0a0a0a"/>
  <rect width="272" height="42" fill="#060606"/>
  <text x="18" y="28" font-size="13" fill="rgba(255,255,255,.85)" font-weight="600" font-family="system-ui">9:41</text>
  <rect x="96" y="9" width="80" height="22" rx="11" fill="#060606"/>
  <rect y="42" width="272" height="52" fill="#0e0e0e"/>
  <text x="18" y="75" font-size="22" fill="rgba(255,255,255,.4)" font-family="system-ui">‹</text>
  <text x="136" y="74" text-anchor="middle" font-size="14" fill="white" font-weight="700" font-family="system-ui">Invoice</text>
  <text x="258" y="73" text-anchor="middle" font-size="22" fill="rgba(255,255,255,.38)" font-family="system-ui">⋯</text>
  <rect x="10" y="108" width="252" height="118" rx="16" fill="#111" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="26" y="133" font-size="9.5" fill="rgba(255,255,255,.28)" letter-spacing="1.5" font-family="system-ui">INVOICE</text>
  <text x="26" y="152" font-size="18" fill="white" font-weight="800" font-family="system-ui">#INV-2847</text>
  <rect x="168" y="120" width="80" height="22" rx="11" fill="rgba(255,165,0,.1)" stroke="rgba(255,165,0,.28)" stroke-width="1"/>
  <text x="208" y="135" text-anchor="middle" font-size="9" fill="#FFA500" font-weight="700" font-family="system-ui">PENDING</text>
  <text x="26" y="176" font-size="10.5" fill="rgba(255,255,255,.3)" font-family="system-ui">Riverside Development Inc.</text>
  <text x="26" y="192" font-size="10" fill="rgba(255,255,255,.2)" font-family="system-ui">Due Aug 15, 2026</text>
  <line x1="18" y1="204" x2="254" y2="204" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="218" font-size="9.5" fill="rgba(255,255,255,.28)" font-family="system-ui">TOTAL DUE</text>
  <text x="254" y="219" text-anchor="end" font-size="25" fill="#FFA500" font-weight="900" font-family="system-ui">$14,012</text>
  <text x="18" y="252" font-size="8" fill="rgba(255,255,255,.2)" letter-spacing="2" font-family="system-ui">LINE ITEMS</text>
  <rect x="10" y="260" width="252" height="48" rx="11" fill="#111" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="281" font-size="12.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Foundation Work</text>
  <text x="26" y="297" font-size="9.5" fill="rgba(255,255,255,.3)" font-family="system-ui">40 hrs × $120/hr</text>
  <text x="254" y="290" text-anchor="end" font-size="14" fill="white" font-weight="700" font-family="system-ui">$4,800</text>
  <rect x="10" y="314" width="252" height="48" rx="11" fill="#111" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="335" font-size="12.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Materials Supply</text>
  <text x="26" y="351" font-size="9.5" fill="rgba(255,255,255,.3)" font-family="system-ui">Concrete + structural rebar</text>
  <text x="254" y="344" text-anchor="end" font-size="14" fill="white" font-weight="700" font-family="system-ui">$5,200</text>
  <rect x="10" y="368" width="252" height="48" rx="11" fill="#111" stroke="rgba(255,255,255,.05)" stroke-width="1"/>
  <text x="26" y="389" font-size="12.5" fill="rgba(255,255,255,.82)" font-weight="600" font-family="system-ui">Equipment Rental</text>
  <text x="26" y="405" font-size="9.5" fill="rgba(255,255,255,.3)" font-family="system-ui">Excavator · 3 days + operator</text>
  <text x="254" y="398" text-anchor="end" font-size="14" fill="white" font-weight="700" font-family="system-ui">$2,400</text>
  <line x1="18" y1="428" x2="254" y2="428" stroke="rgba(255,255,255,.06)" stroke-width="1"/>
  <text x="26" y="448" font-size="11" fill="rgba(255,255,255,.28)" font-family="system-ui">HST (13%)</text>
  <text x="254" y="448" text-anchor="end" font-size="11" fill="rgba(255,255,255,.28)" font-family="system-ui">+$1,612</text>
  <text x="26" y="466" font-size="14" fill="white" font-weight="700" font-family="system-ui">Total</text>
  <text x="254" y="467" text-anchor="end" font-size="18" fill="#FFA500" font-weight="900" font-family="system-ui">$14,012</text>
  <rect x="10" y="482" width="252" height="52" rx="14" fill="url(#iag)"/>
  <text x="136" y="513" text-anchor="middle" font-size="14" fill="#000" font-weight="800" font-family="system-ui">Send to Client →</text>
  <rect x="10" y="542" width="120" height="38" rx="10" fill="#141414" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
  <text x="70" y="565" text-anchor="middle" font-size="10.5" fill="rgba(255,255,255,.42)" font-family="system-ui">⬇ Download PDF</text>
  <rect x="142" y="542" width="120" height="38" rx="10" fill="#141414" stroke="rgba(255,255,255,.07)" stroke-width="1"/>
  <text x="202" y="565" text-anchor="middle" font-size="10.5" fill="rgba(255,255,255,.42)" font-family="system-ui">📤 Share</text>
  <rect x="97" y="556" width="78" height="4" rx="2" fill="rgba(255,255,255,.24)"/>
</svg>`;
}

// ─── Page data ────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: Clock,         color: "#22c55e", title: "Time Tracking + Clock-In Photos",   body: "Workers clock in with a live selfie. GPS coordinates verified against the project site. Off-site and duplicate photo check-ins are flagged automatically." },
  { icon: ShieldCheck,   color: "#ef4444", title: "Safety Incident Logs",              body: "Log near-misses, injuries, and hazards on the spot. Track severity, add witnesses, and generate incident reports in one tap." },
  { icon: CalendarDays,  color: "#3b82f6", title: "Weather-Aware Scheduling",          body: "Live 7-day forecast overlaid on your project calendar. Severe weather days highlighted automatically so you can reschedule before it's a problem." },
  { icon: FileText,      color: "#f59e0b", title: "Estimates & Invoices",              body: "Build itemized estimates, convert to invoices with one click, and export professional PDFs with your company branding." },
  { icon: BarChart3,     color: "#8b5cf6", title: "Reports & Payroll Export",          body: "Full payroll summaries, project cost reports, and timesheet detail — exportable to PDF and CSV." },
  { icon: Sparkles,      color: "#f59e0b", title: "AI Daily Brief",                   body: "Every morning, an AI-generated site briefing lands on your dashboard — crew on site, overdue tasks, safety issues, and what to tackle first." },
  { icon: ClipboardList, color: "#06b6d4", title: "Punch Lists & RFIs",               body: "Create punch list items with photos and assign them to crew. Submit and track RFIs end-to-end without email chains." },
  { icon: Package,       color: "#10b981", title: "Material Tracker",                  body: "Log deliveries and usage by trade. Automatic low-stock alerts. Export materials summaries as PDFs per project." },
  { icon: MessageSquare, color: "#6366f1", title: "Crew Messaging",                    body: "Per-project group chats with file and photo sharing. Real-time, reliable delivery — no app install needed." },
  { icon: MapPin,        color: "#f97316", title: "GPS Site Map",                      body: "Every project plotted on an interactive map. Clock-in locations pinned per worker. Off-site check-ins flagged for review." },
  { icon: Truck,         color: "#84cc16", title: "Equipment Management",              body: "Track every piece of equipment — status, assignment, daily rate, and maintenance notes — across all your job sites." },
  { icon: Globe,         color: "#a78bfa", title: "15-Language Support",               body: "Full UI localization in English, French, Spanish, Portuguese, Arabic, Punjabi, Hindi, Tagalog, Polish, and more." },
  { icon: WifiOff,       color: "#22d3ee", title: "Works Offline",                     body: "Clock in, log tasks, and capture safety incidents even with no signal. Changes sync automatically when you're back online." },
];

const TRADES = [
  "General Contracting","Civil / Utilities","Electrical","Plumbing","HVAC",
  "Roofing","Concrete & Masonry","Steel / Structural","Framing","Drywall",
  "Flooring","Painting","Excavation","Landscaping","Insulation",
];

const STEPS = [
  { n:"01", title:"Create your company",   body:"Sign up, enter your company name and trade, and invite your first crew member with a generated invite code." },
  { n:"02", title:"Add projects & crew",   body:"Set up your job sites, assign workers, and configure roles in minutes. Most teams are up in under 10 minutes." },
  { n:"03", title:"Run your site",          body:"Crew clocks in from their phone. You see it live on your dashboard. Tasks, safety, invoices, and reports — all in one place." },
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
      const STARS = Array.from({ length: 160 }, () => ({
        x: (Math.random() - .5) * 2,
        y: (Math.random() - .5) * 2,
        z: Math.random() * .95 + .05,
        spd: Math.random() * .0007 + .00025,
        warm: Math.random() < .65,
      }));
      const resize = () => { W = cv.width = cv.offsetWidth; H = cv.height = cv.offsetHeight; };
      window.addEventListener("resize", resize);
      resize();

      const drawStars = () => {
        if (cancelled) return;
        ctx.fillStyle = "rgba(2,2,2,.11)";
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
          const sz = Math.max(.3, (1 - s.z) * 3.8);
          const al = Math.min(1, (1 - s.z) * 1.5 + .08);
          const col = s.warm ? `rgba(255,${Math.floor(140 + Math.random() * 115)},0,` : "rgba(255,255,255,";
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(sx, sy);
          ctx.strokeStyle = col + (al * .55) + ")"; ctx.lineWidth = sz * .75; ctx.stroke();
          ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2);
          ctx.fillStyle = col + al + ")"; ctx.fill();
          s.z -= s.spd;
          if (s.z <= .02) { s.x = (Math.random() - .5) * 2; s.y = (Math.random() - .5) * 2; s.z = 1; }
        }
        starRaf = requestAnimationFrame(drawStars);
      };
      drawStars();

      // cleanup resize inside the cv block
      const origResize = resize;
      window.removeEventListener("resize", origResize); // will re-add below
      window.addEventListener("resize", resize);
    }

    // ── Phone 3D spin ───────────────────────────────────────────────────────
    const phoneEl = document.getElementById("phoneWrap");
    if (phoneEl) {
      let angY = 0, angX = 8, hov = false, mox = 0, moy = 0, lastT = 0;
      const onMM = (e: MouseEvent) => { mox = e.clientX; moy = e.clientY; };
      const onME = () => { hov = true; };
      const onML = () => { hov = false; };
      document.addEventListener("mousemove", onMM);
      phoneEl.addEventListener("mouseenter", onME);
      phoneEl.addEventListener("mouseleave", onML);

      const spinLoop = (ts: number) => {
        if (cancelled) return;
        const dt = Math.min(ts - lastT, 50); lastT = ts;
        if (!hov) { angY += dt * .028; angX += (8 - angX) * .04; }
        else {
          const tX = -(moy / window.innerHeight - .5) * 30;
          const tY =  (mox / window.innerWidth  - .5) * 38;
          angX += (tX - angX) * .09;
          angY += (tY - angY) * .09;
        }
        phoneEl.style.transform = `rotateX(${angX}deg) rotateY(${angY}deg)`;
        phoneRaf = requestAnimationFrame(spinLoop);
      };
      phoneRaf = requestAnimationFrame(spinLoop);

      // store refs for cleanup
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

    return () => {
      cancelled = true;
      cancelAnimationFrame(starRaf);
      cancelAnimationFrame(phoneRaf);
      const phoneEl2 = document.getElementById("phoneWrap");
      if (phoneEl2 && (phoneEl2 as any)._clCleanup) (phoneEl2 as any)._clCleanup();
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020202]/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-gradient-to-br from-amber-500 to-orange-600 rounded-md flex items-center justify-center shadow-sm shadow-amber-500/30">
              <HardHat size={13} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="text-[16px] font-black tracking-tight">Constra</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-white/50 hover:text-white/80 transition-colors font-medium">Sign In</Link>
            <Link href="/onboarding" className="bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-opacity flex items-center gap-1.5">
              Get Started <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── CINEMATIC 3D HERO ────────────────────────────────────────────── */}
      <section id="cl-hero">
        <canvas id="starCanvas" />
        <div className="cl-glow" />
        <div className="cl-inner">

          {/* Left: floating text */}
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
                <Zap size={15} /> Start for Free →
              </a>
              <a className="cl-btn-ghost" href="#features">See Features</a>
            </div>
            <div className="cl-trust">
              <div className="cl-avs">
                <div className="cl-av" style={{ background: "rgba(255,165,0,.12)", color: "#FFA500" }}>MJ</div>
                <div className="cl-av" style={{ background: "rgba(155,89,255,.12)", color: "#9B59FF" }}>SP</div>
                <div className="cl-av" style={{ background: "rgba(0,230,118,.12)", color: "#00E676" }}>DT</div>
                <div className="cl-av" style={{ background: "rgba(239,68,68,.12)", color: "#ef4444" }}>KL</div>
              </div>
              <p className="cl-trust-txt"><strong>Contractors</strong> ditching spreadsheets every day</p>
            </div>
          </div>

          {/* Right: 3D spinning phone */}
          <div className="cl-vis">
            <div className="cl-scene">
              <div className="cl-wrap" id="phoneWrap">
                <div className="cl-face"      dangerouslySetInnerHTML={{ __html: dashSVG() }} />
                <div className="cl-face cl-face-back" dangerouslySetInnerHTML={{ __html: invoiceSVG() }} />
                {/* Floating notification badges */}
                <div className="cl-fb cl-fb1">
                  <div className="cl-fb-ico" style={{ background: "rgba(0,230,118,.1)", color: "#00E676" }}>📍</div>
                  <div><div className="cl-fb-t">GPS Verified</div><div className="cl-fb-s">M. Johnson · Downtown Site</div></div>
                </div>
                <div className="cl-fb cl-fb2">
                  <div className="cl-fb-ico" style={{ background: "rgba(255,165,0,.1)", color: "#FFA500" }}>💰</div>
                  <div><div className="cl-fb-t">Invoice Sent · $14,012</div><div className="cl-fb-s">Riverside Development</div></div>
                </div>
                <div className="cl-fb cl-fb3">
                  <div className="cl-fb-ico" style={{ background: "rgba(155,89,255,.1)", color: "#9B59FF" }}>🛡️</div>
                  <div><div className="cl-fb-t">Safety Log Filed</div><div className="cl-fb-s">Hwy 401 · Near-miss report</div></div>
                </div>
              </div>
              <div className="cl-shadow" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof strip ───────────────────────────────────────────── */}
      <section className="py-8 px-5 border-t border-white/[0.04] bg-[#080808]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6"].map((c,i)=>(
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#080808] flex items-center justify-center text-[9px] font-bold" style={{background:c+"33",color:c}}>
                  {["MJ","SP","DT","LC","RK"][i]}
                </div>
              ))}
            </div>
            <span className="text-[12px] text-white/40">Built for field crews</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <Zap size={13} className="text-amber-400" />
            <span className="text-[12px] text-white/40">Built for the field, not the office</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-green-400" />
            <span className="text-[12px] text-white/40">Save $500+/mo vs enterprise tools</span>
          </div>
        </div>
      </section>

      {/* ── Video demo ───────────────────────────────────────────────────── */}
      {(() => {
        const VIDEO_EMBED_URL = "";
        return (
          <section className="py-16 px-5 border-t border-white/[0.04]">
            <div className="max-w-4xl mx-auto">
              <div className="text-center mb-8">
                <p className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.15em] mb-2">See It In Action</p>
                <h2 className="text-[26px] sm:text-[32px] font-bold text-white/90 tracking-tight">From chaos to clarity in 2 minutes</h2>
                <p className="text-[14px] text-white/40 mt-2">Watch how a real crew uses Constra on a job site</p>
              </div>
              {VIDEO_EMBED_URL ? (
                <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl" style={{paddingBottom:"56.25%"}}>
                  <iframe src={VIDEO_EMBED_URL} className="absolute inset-0 w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
                </div>
              ) : (
                <div className="relative w-full rounded-2xl overflow-hidden border border-white/[0.08] bg-[#0d0d0d] shadow-2xl" style={{paddingBottom:"56.25%"}}>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:"linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",backgroundSize:"40px 40px"}} />
                    <div className="absolute w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
                    <div className="relative w-16 h-16 rounded-full bg-amber-500/90 flex items-center justify-center shadow-lg shadow-amber-500/20">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-black ml-1"><path d="M8 5v14l11-7z"/></svg>
                    </div>
                    <div className="relative text-center">
                      <p className="text-[15px] font-semibold text-white/60">Demo video coming soon</p>
                      <p className="text-[12px] text-white/25 mt-1">Add a Loom or YouTube URL to the VIDEO_EMBED_URL const</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

      {/* ── Photo strip ──────────────────────────────────────────────────── */}
      <section className="py-14 px-5 border-t border-white/[0.04] overflow-hidden">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[11px] font-bold text-white/20 uppercase tracking-widest mb-8">Built for the field</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { src: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=75", alt: "Workers on scaffolding" },
              { src: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=75", alt: "Construction worker with hardhat" },
              { src: "https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&q=75", alt: "Job site overview" },
              { src: "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&q=75", alt: "Building under construction" },
            ].map((photo, i) => (
              <div key={i} className="aspect-[4/3] rounded-xl overflow-hidden relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.src} alt={photo.alt} className="w-full h-full object-cover opacity-50 group-hover:opacity-65 transition-opacity duration-500 scale-105 group-hover:scale-100" style={{transition:"opacity .5s,transform .5s"}}/>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trades ───────────────────────────────────────────────────────── */}
      <section className="py-12 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[11px] font-bold text-white/25 uppercase tracking-widest mb-6">Built for every trade</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRADES.map((t) => (
              <span key={t} className="bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-[12px] text-white/45 font-medium">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pain points ──────────────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Sound familiar?</h2>
            <p className="text-white/40 text-[14px]">These are the problems Constra was built to eliminate.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { before:"Crew clocking in from the couch",          after:"GPS + selfie clock-in locks them to the site. Every check-in is time-stamped, location-verified, and photo-confirmed." },
              { before:"Chasing timesheets every Friday",          after:"Live crew status on your dashboard. Payroll summary exports to CSV or PDF the second the week ends — no chasing required." },
              { before:"Juggling WhatsApp, spreadsheets, & email", after:"Time tracking, invoicing, safety logs, scheduling, and crew chat — one app, one login, zero juggling." },
            ].map((p, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-6 flex flex-col gap-4 hover:border-white/[0.10] transition-all">
                <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/15 rounded-lg px-3 py-1.5 w-fit">
                  <span className="text-[11px] font-bold text-red-400">The problem</span>
                </div>
                <p className="text-[14px] font-bold text-white/80 leading-snug">{p.before}</p>
                <div className="h-px bg-white/[0.05]" />
                <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/15 rounded-lg px-3 py-1.5 w-fit">
                  <span className="text-[11px] font-bold text-green-400">The fix</span>
                </div>
                <p className="text-[13px] text-white/50 leading-relaxed">{p.after}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5 mb-4">
              <Layers size={12} className="text-white/40" />
              <span className="text-[12px] text-white/40 font-semibold">Every feature · one app · no add-ons</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Every tool your crew needs</h2>
            <p className="text-white/40 text-[15px] max-w-xl mx-auto">No add-ons. No integrations. No extra seats. Everything to run a job site, built in.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 hover:border-white/[0.10] transition-all hover:bg-[#0f0f0f] group relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{backgroundColor:f.color}} />
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110" style={{background:f.color+"18"}}>
                  <f.icon size={18} style={{color:f.color}} />
                </div>
                <h3 className="text-[14px] font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Up and running in minutes</h2>
            <p className="text-white/40 text-[15px]">No training. No onboarding calls. No IT department required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[13px] font-black text-amber-400">{s.n}</span>
                  </div>
                  <div className="h-px flex-1 bg-white/[0.05]" />
                </div>
                <h3 className="text-[16px] font-bold text-white mb-2">{s.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.04]" id="pricing">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Free to start.</h2>
            <p className="text-white/40 text-[15px]">Every feature unlocked from day one. No credit card required.</p>
          </div>
          <div className="mb-6 grid grid-cols-3 gap-3 text-center">
            {[
              { name:"Enterprise tools",  price:"$600–$1,200/mo", note:"Per project pricing",          dim:true  },
              { name:"Mid-market apps",   price:"$200–$500/mo",   note:"Features locked behind tiers", dim:true  },
              { name:"Constra",           price:"Free",            note:"All features included",        dim:false },
            ].map((c) => (
              <div key={c.name} className={`rounded-xl border p-4 transition-all ${c.dim?"border-white/[0.05] bg-white/[0.02] opacity-60":"border-amber-500/30 bg-amber-500/[0.06]"}`}>
                <p className={`text-[11px] font-bold uppercase tracking-wide mb-1 ${c.dim?"text-white/30":"text-amber-400"}`}>{c.name}</p>
                <p className={`text-[20px] font-black mb-0.5 ${c.dim?"text-white/40":"text-white"}`}>{c.price}</p>
                <p className={`text-[10px] ${c.dim?"text-white/20":"text-white/45"}`}>{c.note}</p>
              </div>
            ))}
          </div>
          <div className="bg-[#111] border border-amber-500/25 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wide">Early Access</div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <div className="text-5xl font-black text-white mb-1">$0</div>
                <p className="text-[13px] text-white/35">No credit card required · Start today</p>
              </div>
              <Link href="/onboarding" className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-black font-black text-[14px] px-8 py-3 rounded-xl transition-opacity shadow-lg shadow-amber-500/20">
                <Zap size={16} /> Get Started Free
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
              {["Unlimited crew members","Unlimited active projects","Time tracking & clock-in photos","GPS verification on every clock-in","Estimates & professional invoices","PDF export","Document vault & file storage","Safety incident logging","Equipment management","RFIs & punch lists","AI Daily Brief","Crew messaging","Weather-aware scheduling","Advanced reports & analytics","Custom roles & permissions","15-language support","Smart material tracker","Works offline — syncs on reconnect","Full admin tools & audit logs"].map((f) => (
                <div key={f} className="flex items-start gap-2 text-[12px] text-white/55">
                  <Check size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />{f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <section className="py-24 px-5 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-500/[0.04] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/25 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-500/[0.05] blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30">
            <HardHat size={26} className="text-black" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">Your job site, finally under control</h2>
          <p className="text-white/40 text-[16px] mb-8 max-w-md mx-auto">The only construction app that covers everything — from first clock-in to final invoice.</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/onboarding" className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-600 hover:opacity-90 text-black font-black text-[15px] px-8 py-3.5 rounded-xl transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20">
              <Zap size={16} /> Create Your Account — It&apos;s Free
            </Link>
            <Link href="/login" className="w-full sm:w-auto text-white/40 hover:text-white/70 font-semibold text-[14px] flex items-center justify-center gap-1.5 transition-colors">
              Already have an account? Sign In <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center"><HardHat size={12} className="text-black" /></div>
            <span className="text-[14px] font-bold">Constra</span>
            <span className="text-white/20 text-[12px]">· Field Workforce Management</span>
          </div>
          <div className="flex items-center gap-5 text-[12px] text-white/30">
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign In</Link>
            <Link href="/onboarding" className="hover:text-white/60 transition-colors">Get Started</Link>
            <Link href="/support" className="hover:text-white/60 transition-colors">Support</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
          </div>
          <p className="text-[11px] text-white/15">© {new Date().getFullYear()} Constra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
