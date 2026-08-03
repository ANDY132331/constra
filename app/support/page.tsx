import Link from "next/link";
import { HardHat, Phone, Mail, MessageSquare, Clock, ArrowRight, ChevronRight } from "lucide-react";

const FAQS = [
  {
    q: "How do I invite crew members?",
    a: "Go to Crew → Add Worker, fill in their details and role, then share the generated invite code with them. They sign up at constra.app/join using that code.",
  },
  {
    q: "Can workers use Constra without a smartphone?",
    a: "Constra is designed for smartphones. Workers need iOS or Android to clock in with GPS and photo verification. Foremen and admins can also use the desktop browser version.",
  },
  {
    q: "What happens if there's no internet on site?",
    a: "Constra works offline. Clock-ins, safety logs, and tasks queue locally and sync automatically the moment the device reconnects to any network.",
  },
  {
    q: "How do I export payroll or timesheets?",
    a: "Go to Time Tracking → Export CSV, or open Reports for a full payroll summary by worker and project. Both can be exported as PDF or CSV.",
  },
  {
    q: "Can I change a worker's role or permissions?",
    a: "Yes. Go to Crew → tap the worker → Edit. You can change their role (Worker, Foreman, Project Manager, Admin) or grant access to specific pages.",
  },
  {
    q: "How do I cancel or change my plan?",
    a: "Go to Settings → Billing → Manage Subscription. You can upgrade, downgrade, or cancel at any time — no penalties.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. Constra uses Supabase with row-level security, meaning each company's data is completely isolated. All data is encrypted in transit and at rest.",
  },
  {
    q: "Can I have multiple job sites or projects?",
    a: "Unlimited projects and job sites are included on all plans. There are no per-project fees.",
  },
];

export const metadata = {
  title: "Support — Constra",
  description: "Get help with Constra. Contact our support team by phone or email.",
};

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080808]/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-5xl mx-auto px-5 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
              <HardHat size={16} className="text-black" />
            </div>
            <span className="text-[17px] font-black tracking-tight">Constra</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-white/50 hover:text-white/80 transition-colors font-medium">
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

      {/* Hero */}
      <section className="pt-28 pb-14 px-5">
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-6">
            <MessageSquare size={12} className="text-amber-400" />
            <span className="text-[12px] text-amber-300 font-semibold">We're here to help</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Support</h1>
          <p className="text-white/40 text-[16px] max-w-lg mx-auto">
            Reach us by phone or email. We respond to all messages within a few hours during business hours.
          </p>
        </div>
      </section>

      {/* Contact cards */}
      <section className="pb-16 px-5">
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Phone */}
          <a
            href="tel:+16723389890"
            className="group bg-[#0f0f0f] border border-white/[0.07] hover:border-amber-500/30 rounded-2xl p-6 transition-all hover:bg-[#121212]"
          >
            <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/15 transition-colors">
              <Phone size={20} className="text-amber-400" />
            </div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-1">Call us</p>
            <p className="text-[22px] font-black text-white tracking-tight">672-338-9890</p>
            <p className="text-[12px] text-white/35 mt-1 flex items-center gap-1">
              <Clock size={10} />
              Mon – Fri, 8am – 6pm PT
            </p>
          </a>

          {/* Email */}
          <a
            href="mailto:support@constra.app"
            className="group bg-[#0f0f0f] border border-white/[0.07] hover:border-amber-500/30 rounded-2xl p-6 transition-all hover:bg-[#121212]"
          >
            <div className="w-11 h-11 bg-amber-500/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-amber-500/15 transition-colors">
              <Mail size={20} className="text-amber-400" />
            </div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-widest mb-1">Email us</p>
            <p className="text-[18px] font-black text-white tracking-tight">support@constra.app</p>
            <p className="text-[12px] text-white/35 mt-1 flex items-center gap-1">
              <Clock size={10} />
              Response within a few hours
            </p>
          </a>

        </div>
      </section>

      {/* FAQ */}
      <section className="pb-24 px-5 border-t border-white/[0.04]">
        <div className="max-w-3xl mx-auto pt-14">
          <h2 className="text-2xl md:text-3xl font-black tracking-tight mb-2">Frequently asked questions</h2>
          <p className="text-white/35 text-[14px] mb-10">Quick answers to the most common questions.</p>

          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group bg-[#0f0f0f] border border-white/[0.06] rounded-xl overflow-hidden"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer list-none select-none hover:bg-white/[0.02] transition-colors">
                  <span className="text-[14px] font-semibold text-white/80 pr-4">{faq.q}</span>
                  <ChevronRight size={15} className="text-white/25 flex-shrink-0 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-[13px] text-white/45 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>

          <div className="mt-10 text-center">
            <p className="text-[13px] text-white/30 mb-3">Still have a question?</p>
            <a
              href="mailto:support@constra.app"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-bold text-[13px] px-6 py-2.5 rounded-xl transition-colors"
            >
              <Mail size={14} />
              Email Support
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] py-8 px-5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-6 h-6 bg-amber-500 rounded-md flex items-center justify-center">
              <HardHat size={12} className="text-black" />
            </div>
            <span className="text-[14px] font-black">Constra</span>
          </Link>
          <div className="flex items-center gap-5 text-[12px] text-white/30">
            <Link href="/" className="hover:text-white/60 transition-colors">Home</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy</Link>
            <a href="mailto:support@constra.app" className="hover:text-white/60 transition-colors">support@constra.app</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
