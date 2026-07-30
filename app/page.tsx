"use client";

import Link from "next/link";
import {
  HardHat, Clock, ShieldCheck, FileText, BarChart3, Users, MapPin,
  Camera, Zap, Globe, ArrowRight, Check, Sparkles, CalendarDays,
  ClipboardList, Package, MessageSquare, Truck, Receipt,
  ChevronRight, Star, TrendingUp, Layers,
} from "lucide-react";

const FEATURES = [
  {
    icon: Clock,
    color: "#22c55e",
    title: "Time Tracking + Clock-In Photos",
    body: "Workers clock in with a live selfie. GPS coordinates verified against site location. Impossible-travel detection flags suspicious entries automatically.",
  },
  {
    icon: ShieldCheck,
    color: "#ef4444",
    title: "Safety Incident Logs",
    body: "Log near-misses, injuries, and hazards on the spot. Track severity, add witnesses, and generate incident reports in one tap.",
  },
  {
    icon: CalendarDays,
    color: "#3b82f6",
    title: "Weather-Aware Scheduling",
    body: "Live 7-day forecast overlaid on your project calendar. Severe weather days highlighted automatically so you can reschedule before it's a problem.",
  },
  {
    icon: FileText,
    color: "#f59e0b",
    title: "Estimates & Invoices",
    body: "Build itemized estimates, convert to invoices with one click, and export professional PDFs with your company branding.",
  },
  {
    icon: BarChart3,
    color: "#8b5cf6",
    title: "Reports & Payroll Export",
    body: "Full payroll summaries, project cost reports, and timesheet detail — exportable to PDF, CSV, QuickBooks, or Gusto.",
  },
  {
    icon: Sparkles,
    color: "#f59e0b",
    title: "AI Daily Brief",
    body: "Every morning, an AI-generated site briefing lands on your dashboard — crew on site, overdue tasks, safety issues, and what to tackle first.",
  },
  {
    icon: ClipboardList,
    color: "#06b6d4",
    title: "Punch Lists & RFIs",
    body: "Create punch list items with photos and assign them to crew. Submit and track Requests for Information end-to-end without email chains.",
  },
  {
    icon: Package,
    color: "#10b981",
    title: "Material Tracker",
    body: "Log deliveries and usage by trade. Automatic low-stock alerts. Export materials summaries as PDFs per project.",
  },
  {
    icon: MessageSquare,
    color: "#6366f1",
    title: "Crew Messaging",
    body: "Per-project group chats with file and photo sharing. Real-time delivery powered by Supabase — no app install required for crew.",
  },
  {
    icon: MapPin,
    color: "#f97316",
    title: "GPS Site Map",
    body: "Every project plotted on an interactive map. Clock-in locations pinned per worker. Off-site check-ins flagged for review.",
  },
  {
    icon: Truck,
    color: "#84cc16",
    title: "Equipment Management",
    body: "Track every piece of equipment — status, assignment, daily rate, and maintenance notes — across all your job sites.",
  },
  {
    icon: Globe,
    color: "#a78bfa",
    title: "15-Language Support",
    body: "Full UI localization in English, French, Spanish, Portuguese, Arabic, Punjabi, Hindi, Tagalog, Polish, and more.",
  },
];

const TRADES = [
  "General Contracting", "Civil / Utilities", "Electrical", "Plumbing", "HVAC",
  "Roofing", "Concrete & Masonry", "Steel / Structural", "Framing", "Drywall",
  "Flooring", "Painting", "Excavation", "Landscaping", "Insulation",
];

const STEPS = [
  {
    n: "01",
    title: "Create your company",
    body: "Sign up, enter your company name and trade, and invite your first crew member with a generated invite code.",
  },
  {
    n: "02",
    title: "Add projects & crew",
    body: "Set up your job sites, assign workers, and configure roles in minutes. Import nothing — start from scratch in under 10 minutes.",
  },
  {
    n: "03",
    title: "Run your site",
    body: "Crew clocks in from their phone. You see it live on your dashboard. Tasks, safety, materials, and billing all in one place.",
  },
];

const STATS = [
  { value: "18+", label: "Tools in one app" },
  { value: "15", label: "Languages supported" },
  { value: "$0", label: "No subscription fee" },
  { value: "100%", label: "Features included" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white overflow-x-hidden">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-6xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <HardHat size={16} className="text-black" />
            </div>
            <span className="text-[17px] font-black tracking-tight">Constra</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] text-white/50 hover:text-white/80 transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/onboarding"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2 rounded-lg transition-colors flex items-center gap-1.5"
            >
              Get Started <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="pt-28 pb-10 px-5 relative overflow-hidden">
        {/* Background glows */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-amber-500/[0.04] blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-[300px] h-[300px] bg-blue-500/[0.04] blur-[100px] rounded-full pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />

        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

            {/* ── Left: Text ── */}
            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
                <Sparkles size={12} className="text-amber-400" />
                <span className="text-[12px] text-amber-300 font-semibold">Early access · No credit card required</span>
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-[56px] font-black tracking-tight leading-[1.05] mb-5">
                The first app that runs{" "}
                <span className="text-amber-400">your entire</span>
                <br />job site
              </h1>

              <p className="text-[16px] md:text-[18px] text-white/45 leading-relaxed max-w-xl lg:max-w-none mb-4">
                Time tracking, crew management, safety logs, invoicing, scheduling, materials, equipment, punch lists, and an AI daily brief —{" "}
                <span className="text-white/65 font-semibold">18 tools in one place</span>, built for construction.
              </p>
              <p className="text-[14px] text-white/30 leading-relaxed max-w-lg lg:max-w-none mb-8">
                No more juggling WhatsApp, spreadsheets, and paper timesheets. Constra is the only platform built from the ground up to handle every part of your job site — from first clock-in to final invoice.
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 mb-6">
                <Link
                  href="/onboarding"
                  className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-black text-[15px] px-7 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
                >
                  <Zap size={16} />
                  Get Started Free
                </Link>
                <Link
                  href="/login"
                  className="w-full sm:w-auto bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.10] text-white font-bold text-[15px] px-7 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowRight size={15} className="text-amber-400" />
                  Sign In
                </Link>
              </div>

              <p className="text-[12px] text-white/20 text-center lg:text-left">No credit card required · All 18 features included · No limits</p>

              {/* Stats row */}
              <div className="flex flex-wrap justify-center lg:justify-start gap-6 mt-8 pt-8 border-t border-white/[0.05]">
                {STATS.map((s) => (
                  <div key={s.label}>
                    <div className="text-[22px] font-black text-amber-400">{s.value}</div>
                    <div className="text-[11px] text-white/35 font-medium">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: Phone + Dashboard mockup ── */}
            <div className="flex-1 relative w-full max-w-lg lg:max-w-none flex items-center justify-center gap-4">

              {/* Phone mockup */}
              <div className="relative flex-shrink-0">
                {/* Phone frame */}
                <div className="w-[200px] bg-[#0f0f0f] border border-white/[0.10] rounded-[32px] shadow-2xl shadow-black/80 overflow-hidden" style={{ boxShadow: "0 0 0 1px rgba(255,255,255,0.06), 0 30px 80px rgba(0,0,0,0.8)" }}>
                  {/* Notch */}
                  <div className="flex justify-center pt-3 pb-1">
                    <div className="w-16 h-4 bg-[#1a1a1a] rounded-full" />
                  </div>
                  {/* Screen content */}
                  <div className="px-3 pb-4 space-y-2.5">
                    {/* Top bar */}
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-black text-white/70">Constra</span>
                      <div className="w-4 h-4 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      </div>
                    </div>
                    {/* AI Brief card */}
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5">
                      <div className="flex items-center gap-1 mb-1.5">
                        <Sparkles size={8} className="text-amber-400" />
                        <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wide">AI Brief</span>
                      </div>
                      <p className="text-[8px] text-white/60 leading-snug"><span className="text-white/80 font-semibold">12 on site</span> · 3 tasks overdue · Rain Thu</p>
                      <p className="text-[8px] text-amber-400 font-semibold mt-1">→ Clear safety item first</p>
                    </div>
                    {/* Stat tiles */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "On Site", value: "12", color: "#22c55e" },
                        { label: "Projects", value: "4", color: "#3b82f6" },
                        { label: "Due Today", value: "7", color: "#f59e0b" },
                        { label: "Punch Items", value: "3", color: "#ef4444" },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#1a1a1a] rounded-lg p-2">
                          <div className="text-[14px] font-black" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-[7px] text-white/30">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    {/* Crew list */}
                    <div className="bg-[#1a1a1a] rounded-xl p-2">
                      <div className="text-[7px] font-bold text-white/25 uppercase tracking-wide mb-1.5">Crew Status</div>
                      {[
                        { init: "MJ", color: "#3b82f6", name: "M. Johnson", status: "On Site" },
                        { init: "SP", color: "#22c55e", name: "S. Patel", status: "On Site" },
                        { init: "DT", color: "#f59e0b", name: "D. Torres", status: "Transit" },
                      ].map((w) => (
                        <div key={w.init} className="flex items-center gap-1.5 py-1 border-b border-white/[0.04] last:border-0">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[6px] font-bold text-white flex-shrink-0" style={{ background: w.color + "33" }}>{w.init}</div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[8px] font-semibold text-white/70 truncate">{w.name}</div>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: w.status === "On Site" ? "#22c55e" : "#f59e0b" }} />
                        </div>
                      ))}
                    </div>
                    {/* Clock in button */}
                    <button className="w-full bg-amber-500 text-black text-[9px] font-black py-2 rounded-xl">
                      CLOCK IN
                    </button>
                  </div>
                  {/* Home bar */}
                  <div className="flex justify-center pb-2 pt-1">
                    <div className="w-12 h-1 bg-white/10 rounded-full" />
                  </div>
                </div>
                {/* Floating badge */}
                <div className="absolute -right-3 top-12 bg-[#161616] border border-white/[0.08] rounded-xl px-3 py-2 shadow-xl">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 bg-green-500/20 rounded-lg flex items-center justify-center">
                      <Check size={10} className="text-green-400" />
                    </div>
                    <div>
                      <div className="text-[9px] font-bold text-white/80">Clocked In</div>
                      <div className="text-[8px] text-white/30">GPS verified</div>
                    </div>
                  </div>
                </div>
                <div className="absolute -left-4 bottom-20 bg-[#161616] border border-amber-500/20 rounded-xl px-3 py-2 shadow-xl">
                  <div className="text-[8px] font-bold text-amber-400 mb-0.5">Invoice Sent</div>
                  <div className="text-[11px] font-black text-white">$12,400</div>
                </div>
              </div>

              {/* Dashboard preview card */}
              <div className="hidden sm:block flex-1 min-w-0">
                <div className="bg-[#0d0d0d] border border-white/[0.07] rounded-2xl overflow-hidden shadow-2xl shadow-black/60">
                  {/* Browser chrome */}
                  <div className="bg-[#111] border-b border-white/[0.05] px-3 py-2 flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                      <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                    </div>
                    <div className="flex-1 bg-white/[0.04] rounded h-5 mx-2 flex items-center px-2">
                      <span className="text-[9px] text-white/20">constra.app/dashboard</span>
                    </div>
                  </div>
                  {/* Dashboard content */}
                  <div className="p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { label: "Crew on Site", value: "12", color: "#22c55e" },
                        { label: "Active Projects", value: "4", color: "#3b82f6" },
                      ].map((s) => (
                        <div key={s.label} className="bg-[#161616] border border-white/[0.05] rounded-xl p-3">
                          <div className="text-[18px] font-black" style={{ color: s.color }}>{s.value}</div>
                          <div className="text-[9px] text-white/30 mt-0.5">{s.label}</div>
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#161616] border border-white/[0.05] rounded-xl p-3">
                      <div className="text-[9px] font-bold text-white/25 uppercase tracking-wide mb-2">Live Crew</div>
                      {[
                        { name: "M. Johnson", role: "Foreman", color: "#3b82f6", project: "Downtown Renovation" },
                        { name: "S. Patel", role: "Electrician", color: "#22c55e", project: "Riverside Apts" },
                        { name: "D. Torres", role: "Pipe Layer", color: "#f59e0b", project: "Hwy 401" },
                      ].map((w) => (
                        <div key={w.name} className="flex items-center gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0" style={{ background: w.color + "33" }}>
                            {w.name.split(" ").map((n) => n[0]).join("")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-semibold text-white/75 truncate">{w.name}</div>
                            <div className="text-[8px] text-white/30 truncate">{w.role} · {w.project}</div>
                          </div>
                          <div className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                    <div className="bg-[#161616] border border-amber-500/20 rounded-xl p-3">
                      <div className="flex items-center gap-1 mb-1.5">
                        <Sparkles size={9} className="text-amber-400" />
                        <span className="text-[8px] font-bold text-amber-400 uppercase tracking-wide">AI Brief</span>
                      </div>
                      <p className="text-[9px] text-white/50 leading-relaxed">
                        <span className="text-white/70 font-semibold">12 on site</span> · <span className="text-red-400">3 overdue</span> · Rain Thu — reschedule pour · <span className="text-amber-400 font-semibold">Clear safety punch item first</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof strip ──────────────────────────────────────────────── */}
      <section className="py-8 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {["#3b82f6","#22c55e","#f59e0b","#ef4444","#8b5cf6"].map((c,i)=>(
                <div key={i} className="w-7 h-7 rounded-full border-2 border-[#080808] flex items-center justify-center text-[9px] font-bold text-white" style={{background:c+"33",borderColor:"#0d0d0d"}}>
                  {["MJ","SP","DT","LC","RK"][i]}
                </div>
              ))}
            </div>
            <span className="text-[12px] text-white/40">Built for crews like yours</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            {[1,2,3,4,5].map(i=><Star key={i} size={13} className="text-amber-400 fill-amber-400"/>)}
            <span className="text-[12px] text-white/40 ml-1">Loved by contractors</span>
          </div>
          <div className="hidden sm:block w-px h-6 bg-white/[0.06]" />
          <div className="flex items-center gap-1.5">
            <TrendingUp size={13} className="text-green-400" />
            <span className="text-[12px] text-white/40">18 tools, zero monthly fee</span>
          </div>
        </div>
      </section>

      {/* ── Trades ──────────────────────────────────────────────────────────── */}
      <section className="py-12 px-5 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-[11px] font-bold text-white/25 uppercase tracking-widest mb-6">
            Built for every trade
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {TRADES.map((t) => (
              <span
                key={t}
                className="bg-white/[0.04] border border-white/[0.06] rounded-full px-3 py-1 text-[12px] text-white/45 font-medium"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <div className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] rounded-full px-4 py-1.5 mb-4">
              <Layers size={12} className="text-white/40" />
              <span className="text-[12px] text-white/40 font-semibold">18 features · one subscription · $0</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
              Every tool your crew needs
            </h2>
            <p className="text-white/40 text-[15px] max-w-xl mx-auto">
              No add-ons. No integrations. No extra seats. Everything you need to run a job site, built in.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="bg-[#0d0d0d] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 transition-all hover:bg-[#0f0f0f] group"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                  style={{ background: f.color + "18" }}
                >
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="text-[14px] font-bold text-white mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.04]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Up and running in minutes</h2>
            <p className="text-white/40 text-[15px]">No training. No onboarding calls. No IT department required.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative">
                {i < STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-white/[0.06] to-transparent z-0" style={{width:"calc(100% - 2rem)"}} />
                )}
                <div className="text-[48px] font-black text-white/[0.04] leading-none mb-3">{s.n}</div>
                <h3 className="text-[16px] font-bold text-white mb-2">{s.title}</h3>
                <p className="text-[13px] text-white/40 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-5 border-t border-white/[0.04]" id="pricing">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-3">Everything included. No cost.</h2>
            <p className="text-white/40 text-[15px]">Every feature unlocked from day one. No credit card, no limits.</p>
          </div>

          <div className="bg-[#111] border border-amber-500/25 rounded-2xl p-8 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[10px] font-black px-4 py-1 rounded-full uppercase tracking-wide">
              100% Free
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-8">
              <div>
                <div className="text-5xl font-black text-white mb-1">$0</div>
                <p className="text-[13px] text-white/35">No credit card · No catch · No limits</p>
              </div>
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-[14px] px-8 py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
              >
                <Zap size={16} />
                Get Started Free
              </Link>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-3">
              {[
                "Unlimited crew members",
                "Unlimited active projects",
                "Time tracking & clock-in photos",
                "GPS verification on every clock-in",
                "Estimates & professional invoices",
                "PDF export",
                "Document vault & file storage",
                "Safety incident logging",
                "Equipment management",
                "RFIs & punch lists",
                "AI Daily Brief",
                "Crew messaging",
                "Weather-aware scheduling",
                "Advanced reports & analytics",
                "Custom roles & permissions",
                "15-language support",
                "Smart material tracker",
                "Full admin tools & audit logs",
              ].map((f) => (
                <div key={f} className="flex items-start gap-2 text-[12px] text-white/55">
                  <Check size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────────────────── */}
      <section className="py-24 px-5 border-t border-white/[0.04] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-amber-500/[0.03] pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/[0.04] blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-2xl mx-auto text-center relative">
          <div className="w-14 h-14 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-amber-500/30">
            <HardHat size={26} className="text-black" />
          </div>
          <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
            Your job site, finally under control
          </h2>
          <p className="text-white/40 text-[16px] mb-2 max-w-md mx-auto">
            The only construction app that covers everything — from first clock-in to final invoice.
          </p>
          <p className="text-white/25 text-[13px] mb-8 max-w-sm mx-auto">
            Join construction companies already managing their crew, projects, and finances with Constra.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/onboarding"
              className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-black text-[15px] px-8 py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20"
            >
              <Zap size={16} />
              Create Your Account — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto text-white/40 hover:text-white/70 font-semibold text-[14px] flex items-center justify-center gap-1.5 transition-colors"
            >
              Already have an account? Sign In <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.05] py-8 px-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center">
              <HardHat size={12} className="text-black" />
            </div>
            <span className="text-[14px] font-bold">Constra</span>
            <span className="text-white/20 text-[12px]">· Workforce OS</span>
          </div>
          <div className="flex items-center gap-5 text-[12px] text-white/30">
            <Link href="/login" className="hover:text-white/60 transition-colors">Sign In</Link>
            <Link href="/onboarding" className="hover:text-white/60 transition-colors">Get Started</Link>
            <a href="mailto:prableensandhu19@gmail.com" className="hover:text-white/60 transition-colors">Contact</a>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
          </div>
          <p className="text-[11px] text-white/15">© {new Date().getFullYear()} Constra. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
