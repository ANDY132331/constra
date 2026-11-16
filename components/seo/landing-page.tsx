import Link from "next/link";
import Image from "next/image";
import { HardHat, ArrowRight, Check } from "lucide-react";
import { TRADES, SOLUTIONS, type Faq } from "@/lib/seo-pages";

const SITE = "https://getconstra.com";
const PRIMARY = "font-[family-name:var(--font-barlow-condensed)] font-extrabold uppercase tracking-tight";
const MONO = "font-[family-name:var(--font-plex-mono)] uppercase tracking-[0.12em]";

type Props = {
  kicker: string;
  h1: string;
  hook: string;
  /** "Sound familiar?" cards (trades) or "How it works" steps (solutions) */
  blockTitle: string;
  block: [string, string][];
  numbered?: boolean;
  helps: [string, string][];
  faq: Faq[];
  shot: string;
  campaign: string;
  path: string;
  name: string;
};

function cta(campaign: string) {
  return `/onboarding?utm_source=seo&utm_medium=landing&utm_campaign=${encodeURIComponent(campaign)}`;
}

const TAPE = "h-3.5 bg-[repeating-linear-gradient(135deg,#111214_0_14px,#F5C400_14px_28px)]";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden [color-scheme:light] bg-[#E7E5E0] text-[#151617] font-[family-name:var(--font-plex-sans)] antialiased">
      <header className="sticky top-0 z-30 border-b border-[#151617]/15 bg-[#E7E5E0]/92 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3">
          <Link href="/" className="flex items-center gap-2.5" aria-label="Constra home">
            <span className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-[#F5C400] text-[#1A1600]"><HardHat size={20} /></span>
            <span className={`${PRIMARY} text-2xl leading-none`}>Constra</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-3">
            <Link href="/for" className="rounded-full px-3 py-2 text-[#4B4D50] hover:text-[#151617]">Trades</Link>
            <Link href="/solutions" className="hidden rounded-full px-3 py-2 text-[#4B4D50] hover:text-[#151617] sm:block">Solutions</Link>
            <Link href="/login" className="hidden rounded-full px-3 py-2 text-[#4B4D50] hover:text-[#151617] sm:block">Log in</Link>
            <Link href="/onboarding?utm_source=seo&utm_medium=header" className="rounded-full bg-[#F5C400] px-4 py-2 font-semibold text-[#1A1600] hover:bg-[#ffd21f]">Start free</Link>
          </nav>
        </div>
        <div className={TAPE} />
      </header>
      {children}
      <footer className="border-t border-[#151617]/15 bg-[#151617] text-[#ECEAE5]">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 sm:grid-cols-3">
          <div>
            <p className={`${PRIMARY} text-2xl`}>Constra</p>
            <p className="mt-2 max-w-xs text-sm text-[#9A9C9F]">Time tracking, timesheets, daily reports and invoices for construction crews. Free while we launch.</p>
          </div>
          <nav aria-label="Trades">
            <p className={`${MONO} mb-3 text-[11px] text-[#9A9C9F]`}>By trade</p>
            <ul className="space-y-1.5 text-sm">
              {TRADES.map((t) => <li key={t.slug}><Link className="text-[#ECEAE5]/80 hover:text-[#F5C400]" href={`/for/${t.slug}`}>{t.name}</Link></li>)}
            </ul>
          </nav>
          <nav aria-label="Solutions">
            <p className={`${MONO} mb-3 text-[11px] text-[#9A9C9F]`}>Solutions</p>
            <ul className="space-y-1.5 text-sm">
              {SOLUTIONS.map((s) => <li key={s.slug}><Link className="text-[#ECEAE5]/80 hover:text-[#F5C400]" href={`/solutions/${s.slug}`}>{s.title}</Link></li>)}
              <li className="pt-3"><Link className="text-[#9A9C9F] hover:text-white" href="/terms">Terms</Link> · <Link className="text-[#9A9C9F] hover:text-white" href="/privacy">Privacy</Link> · <Link className="text-[#9A9C9F] hover:text-white" href="/support">Support</Link></li>
            </ul>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export function LandingPage(p: Props) {
  const ld = [
    {
      "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Constra", applicationCategory: "BusinessApplication", operatingSystem: "Web, Android, iOS",
      description: "Time tracking, timesheets, daily reports and invoicing for construction crews.", url: SITE,
    },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: p.faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Constra", item: SITE }, { "@type": "ListItem", position: 2, name: p.name, item: `${SITE}${p.path}` }] },
  ];
  return (
    <Shell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-14 pt-12 md:grid-cols-[1.15fr_0.85fr] md:pt-16">
          <div>
            <p className={`${MONO} mb-4 flex items-center gap-2 text-xs text-[#7A5C00]`}><span className="h-2 w-5 bg-[repeating-linear-gradient(135deg,#151617_0_4px,#F5C400_4px_8px)]" />{p.kicker}</p>
            <h1 className={`${PRIMARY} text-5xl leading-[0.95] sm:text-6xl md:text-7xl`}>{p.h1}</h1>
            <p className="mt-5 max-w-xl text-lg text-[#151617]/80">{p.hook}</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link href={cta(p.campaign)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-[#F5C400] px-6 py-3 text-base font-bold text-[#1A1600] hover:bg-[#ffd21f]">Start free <ArrowRight size={18} /></Link>
              <Link href="/demo" className="inline-flex min-h-12 items-center rounded-full border border-[#151617]/30 px-6 py-3 text-base font-semibold hover:border-[#151617]">Try the demo</Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#4B4D50]">
              <li className="flex items-center gap-1.5"><Check size={15} className="text-[#1E7A45]" />Free while we launch</li>
              <li className="flex items-center gap-1.5"><Check size={15} className="text-[#1E7A45]" />No credit card</li>
              <li className="flex items-center gap-1.5"><Check size={15} className="text-[#1E7A45]" />Works on any phone</li>
            </ul>
          </div>
          <div className="mx-auto w-full max-w-[300px]">
            <div className="rounded-[2.2rem] border border-[#151617]/30 bg-[#151617] p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
              <Image src={`/site/${p.shot}.webp`} alt={`The Constra app: ${p.name}`} width={780} height={1688} priority className="h-auto w-full rounded-[1.8rem]" />
            </div>
          </div>
        </section>
        <div className={TAPE} />

        <section className="mx-auto max-w-6xl px-5 py-16">
          <h2 className={`${PRIMARY} text-4xl sm:text-5xl`}>{p.blockTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {p.block.map(([t, b], i) => (
              <div key={t} className="rounded-2xl border border-[#CBC8C1] bg-[#F5F4F1] p-6">
                {p.numbered ? <span className={`${PRIMARY} text-4xl text-[#7A5C00]`}>{i + 1}</span> : <span className="block h-1.5 w-8 bg-[#ef4444]" />}
                <h3 className="mt-3 text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4B4D50]">{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-[#CBC8C1] bg-[#F5F4F1]">
          <div className="mx-auto max-w-6xl px-5 py-16">
            <h2 className={`${PRIMARY} text-4xl sm:text-5xl`}>What you get</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {p.helps.map(([t, b]) => {
                const Icon = Check;
                return (
                  <div key={t} className="flex gap-4 rounded-2xl border border-[#CBC8C1] bg-white p-6">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F5C400]/35 text-[#7A5C00]"><Icon size={20} /></span>
                    <div>
                      <h3 className="text-lg font-semibold">{t}</h3>
                      <p className="mt-1.5 text-[15px] leading-relaxed text-[#4B4D50]">{b}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-16">
          <h2 className={`${PRIMARY} text-4xl sm:text-5xl`}>Questions</h2>
          <div className="mt-6 divide-y divide-[#CBC8C1] rounded-2xl border border-[#CBC8C1] bg-[#F5F4F1]">
            {p.faq.map((f) => (
              <details key={f.q} className="group p-5 open:bg-white">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold">{f.q}<span className="text-[#7A5C00] transition-transform group-open:rotate-45" aria-hidden>+</span></summary>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4B4D50]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="bg-[#F5C400] text-[#1A1600]">
          <div className={TAPE} />
          <div className="mx-auto max-w-4xl px-5 py-16 text-center">
            <h2 className={`${PRIMARY} text-5xl sm:text-6xl`}>Run the job, not the paperwork.</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg">Set up your company in about two minutes. Free while we launch.</p>
            <Link href={cta(p.campaign + "-footer")} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#1A1600] px-8 py-3.5 text-base font-bold text-[#F5C400] hover:bg-black">Start free <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>
    </Shell>
  );
}
