import Link from "next/link";
import { HardHat, Phone, Mail, Clock, ArrowRight, ChevronRight, ChevronLeft, ShieldCheck, Zap, Globe } from "lucide-react";

export const metadata = {
  title: "Support — Constra",
  description: "Need help with Constra? Call us directly — real support, no bots.",
};

const FAQS = [
  {
    q: "How do I invite crew members?",
    a: "Go to Crew → Add Worker, fill in their details and role, then share the generated invite code. They sign up using that code and are added to your workspace automatically.",
  },
  {
    q: "Can workers use Constra without a smartphone?",
    a: "Constra is built for smartphones. Workers need iOS or Android to clock in with GPS and photo verification. Admins and foremen can also use the full desktop browser version.",
  },
  {
    q: "What happens if there's no internet on site?",
    a: "Constra works fully offline. Clock-ins, safety logs, and tasks queue on the device and sync automatically the moment it reconnects to any network.",
  },
  {
    q: "How do I export payroll or timesheets?",
    a: "Go to Time Tracking → Export CSV for a raw data export, or open Reports for a full payroll summary by worker and project. Both export as PDF or CSV.",
  },
  {
    q: "Can I change a worker's role or permissions?",
    a: "Yes. Go to Crew → tap the worker → Edit. You can change their role (Worker, Foreman, Project Manager, Admin) or grant access to specific pages.",
  },
  {
    q: "How do I cancel or change my plan?",
    a: "Go to Settings → Billing → Manage Subscription. You can upgrade, downgrade, or cancel at any time with no penalties or hidden fees.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. All company data is isolated using row-level security — no other company can ever access your records. Everything is encrypted in transit and at rest.",
  },
  {
    q: "Can I have multiple job sites or projects?",
    a: "Unlimited projects and job sites are included on all plans. There are no per-project or per-seat fees.",
  },
];

export default function SupportPage() {
  return (
    <div className="h-[100dvh] bg-[#080808] text-white flex flex-col lg:flex-row overflow-hidden">

      {/* ── Left panel (desktop only) ── */}
      <div className="hidden lg:flex flex-col w-[380px] xl:w-[420px] flex-shrink-0 relative overflow-hidden bg-[#0a0800]">
        {/* Blueprint grid */}
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "linear-gradient(rgba(245,158,11,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.6) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
        {/* Amber glow */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-amber-500/10 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-amber-600/5 blur-[80px] rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col h-full p-10">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
              <HardHat size={18} className="text-black" />
            </div>
            <span className="text-[17px] font-black text-white tracking-tight">Constra</span>
          </Link>

          <div className="flex-1 flex flex-col justify-center">
            {/* Silhouette */}
            <div className="flex items-end gap-2.5 mb-10 opacity-20">
              <div className="w-2 bg-amber-500 rounded-t" style={{height:36}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:64}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:48}} />
              <div className="w-1 bg-amber-400 rounded-t" style={{height:28}} />
              <div className="w-3 bg-amber-500 rounded-t" style={{height:88}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:56}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:44}} />
              <div className="w-1 bg-amber-400 rounded-t" style={{height:72}} />
              <div className="w-2 bg-amber-500 rounded-t" style={{height:52}} />
              <div className="w-3 bg-amber-500 rounded-t" style={{height:100}} />
            </div>

            <h2 className="text-[34px] font-black text-white leading-[1.05] tracking-tight mb-4">
              Need help?<br />
              <span className="text-amber-400">We pick up.</span>
            </h2>
            <p className="text-white/40 text-[14px] leading-relaxed mb-10">
              Real support from the people who built the app. Get instant answers from our AI assistant or talk to a human anytime.
            </p>

            <div className="space-y-4">
              {[
                { icon: Phone, text: "Call us directly — no hold music" },
                { icon: Clock, text: "Available Mon – Fri, 8am – 6pm PT" },
                { icon: ShieldCheck, text: "Your data stays private, always" },
                { icon: Zap, text: "Most issues resolved in one call" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={13} className="text-amber-400" />
                  </div>
                  <span className="text-[13px] text-white/50">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/[0.06]">
            <p className="text-[11px] text-white/20">© 2026 Constra. All rights reserved.</p>
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 overflow-y-auto">
        {/* Mobile background */}
        <div className="fixed inset-0 lg:hidden opacity-[0.03] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(245,158,11,1) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,1) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

        {/* Mobile nav */}
        <nav className="lg:hidden sticky top-0 z-50 bg-[#080808]/90 backdrop-blur-xl border-b border-white/[0.05]">
          <div className="px-4 h-14 flex items-center justify-between gap-3">
            {/* Back button */}
            <Link href="/" className="flex items-center gap-1.5 text-white/55 hover:text-white transition-colors">
              <ChevronLeft size={18} />
              <span className="text-[13px] font-semibold">Back</span>
            </Link>
            {/* Logo centered */}
            <Link href="/" className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
              <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
                <HardHat size={14} className="text-black" />
              </div>
              <span className="text-[15px] font-black">Constra</span>
            </Link>
            <Link href="/onboarding" className="bg-amber-500 text-black font-bold text-[12px] px-3 py-1.5 rounded-lg flex items-center gap-1 flex-shrink-0">
              Get Started <ArrowRight size={11} />
            </Link>
          </div>
        </nav>

        <div className="max-w-2xl mx-auto px-6 py-12 relative">

          {/* Header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-5">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-[11px] text-amber-300 font-semibold">Support</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2">How can we help?</h1>
            <p className="text-white/40 text-[14px]">Try the AI assistant in the app for instant help, or call us for anything complex.</p>
          </div>

          {/* Contact cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-10">
            <a
              href="tel:+16723389890"
              className="group flex items-center gap-4 bg-[#111] border border-amber-500/20 hover:border-amber-500/40 rounded-2xl p-5 transition-all hover:bg-[#141208]"
            >
              <div className="w-12 h-12 bg-amber-500/15 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/20 transition-colors">
                <Phone size={20} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-1">Call us</p>
                <p className="text-[20px] font-black text-white tracking-tight leading-none">672-338-9890</p>
                <p className="text-[11px] text-white/35 mt-1">Text us if the line is busy</p>
              </div>
              <ArrowRight size={16} className="text-amber-400/40 group-hover:text-amber-400 transition-colors flex-shrink-0" />
            </a>

            <a
              href="mailto:support@getconstra.com"
              className="group flex items-center gap-4 bg-[#111] border border-white/[0.06] hover:border-amber-500/20 rounded-2xl p-5 transition-all hover:bg-[#141208]"
            >
              <div className="w-12 h-12 bg-white/[0.04] rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-amber-500/10 transition-colors">
                <Mail size={20} className="text-white/40 group-hover:text-amber-400 transition-colors" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-1">Email us</p>
                <p className="text-[15px] font-black text-white tracking-tight leading-none truncate">support@getconstra.com</p>
                <p className="text-[11px] text-white/35 mt-1">Leave a message if the line is busy</p>
              </div>
              <ArrowRight size={16} className="text-white/20 group-hover:text-amber-400 transition-colors flex-shrink-0" />
            </a>
          </div>

          {/* FAQ */}
          <div>
            <h2 className="text-[18px] font-black text-white mb-1">Frequently asked questions</h2>
            <p className="text-[13px] text-white/35 mb-6">Quick answers to the most common questions.</p>

            <div className="space-y-2">
              {FAQS.map((faq) => (
                <details
                  key={faq.q}
                  className="group bg-[#0f0f0f] border border-white/[0.06] hover:border-white/10 rounded-xl overflow-hidden transition-colors"
                >
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none">
                    <span className="text-[13px] font-semibold text-white/75 pr-4">{faq.q}</span>
                    <ChevronRight size={14} className="text-white/25 flex-shrink-0 group-open:rotate-90 transition-transform duration-200" />
                  </summary>
                  <div className="px-5 pb-4 border-t border-white/[0.04]">
                    <p className="text-[13px] text-white/45 leading-relaxed pt-3">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>

            <div className="mt-8 p-5 bg-[#0f0f0f] border border-white/[0.06] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-[13px] font-bold text-white/70">Still have a question?</p>
                <p className="text-[12px] text-white/35">Reach us by phone or email — we&apos;ll sort it out.</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href="mailto:support@getconstra.com"
                  className="flex items-center gap-2 bg-white/[0.06] hover:bg-white/[0.1] text-white/60 hover:text-white font-bold text-[13px] px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Mail size={13} />
                  Email
                </a>
                <a
                  href="tel:+16723389890"
                  className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-4 py-2.5 rounded-xl transition-colors"
                >
                  <Phone size={13} />
                  Call
                </a>
              </div>
            </div>
          </div>

          {/* Footer links */}
          <div className="mt-12 pt-6 border-t border-white/[0.05] flex flex-wrap items-center gap-5 text-[11px] text-white/25">
            <Link href="/" className="hover:text-white/50 transition-colors flex items-center gap-1.5">
              <Globe size={10} /> Home
            </Link>
            <Link href="/terms" className="hover:text-white/50 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/50 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
