"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { HardHat, MapPin, Camera, Check, AlertTriangle, ArrowRight, Plus, WifiOff } from "lucide-react";
import LiveSite from "@/components/landing/live-site";
import SavingsCalc from "@/components/landing/savings-calc";
import AppTour from "@/components/landing/app-tour";

const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--lp-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--lp-mono", display: "swap" });

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
  {
    time: "06:58",
    title: "Crew clocks in",
    body: "A selfie and GPS fix are checked against the site's geofence. Punches from the truck stop or the couch get flagged for review.",
    chip: { icon: "pin", text: "38 m from site · inside 500 m" },
  },
  {
    time: "09:40",
    title: "Hazard logged",
    body: "Open trench, no barricade. Photo, severity and location go into the safety log before anyone forgets.",
    chip: { icon: "alert", text: "Near miss · Medium" },
  },
  {
    time: "13:15",
    title: "Change order raised",
    body: "The client wants pot lights in the hallway. Price it, send it, and the project budget updates when they approve.",
    chip: { icon: "plus", text: "CO-07 · +$1,180" },
  },
  {
    time: "16:30",
    title: "Daily report done",
    body: "Hours, weather, completed tasks and site photos are already in the report. Review it and share it.",
    chip: { icon: "check", text: "6 crew · 47.5 h · 12 photos" },
  },
  {
    time: "17:05",
    title: "Invoice out the door",
    body: "Turn the estimate into an invoice and email a branded PDF to the client the same day the work was done.",
    chip: { icon: "check", text: "INV-0142 · $8,420.00 · Sent" },
  },
] as const;

const FEATURES: { group: string; items: [string, string][] }[] = [
  {
    group: "Crew",
    items: [
      ["GPS clock-in", "Selfie + location on every punch, per-site geofence"],
      ["Scheduling", "Assign crew by project and shift, with the 7-day forecast"],
      ["Roles", "Separate views for owners, project managers, foremen and crew"],
      ["Messages", "Project chat with photos and files, no group texts"],
    ],
  },
  {
    group: "Money",
    items: [
      ["Estimates", "Itemised quotes built on site, sent as PDFs"],
      ["Invoices", "Convert an estimate in one step, track paid and overdue"],
      ["Change orders", "Priced, approved and tracked against budget"],
      ["Payroll export", "Timesheets to CSV, QuickBooks (IIF) or Gusto"],
    ],
  },
  {
    group: "Site",
    items: [
      ["Daily reports", "Hours, weather, tasks and photos, compiled for you"],
      ["Safety log", "Near misses, injuries and hazards with photos"],
      ["Punch lists & RFIs", "Assigned, photographed, closed out"],
      ["Equipment & materials", "Service dates, cert expiry, deliveries, low stock"],
    ],
  },
  {
    group: "Plans & files",
    items: [
      ["Blueprints", "Upload drawings and open them on site"],
      ["Documents", "Contracts, permits and specs, versioned by project"],
      ["Photos", "Every site photo, sorted by project and day"],
      ["Morning brief", "A morning summary of crew, overdue tasks and weather risk"],
    ],
  },
];

const FAQ: [string, string][] = [
  ["Do my workers each need to sign up?", "They join your company with an invite code from Settings. It takes about a minute and they only see what their role allows."],
  ["What happens when there's no signal on site?", "Clock-ins and updates are saved on the phone and sync automatically when the connection comes back."],
  ["Can someone clock in from home?", "Every punch records GPS and a photo. If it's outside the geofence you set for that project, it's flagged so you can review it before payroll."],
  ["Does it work on iPhone?", "Android has an app on Google Play. On iPhone and computers, Constra runs in the browser and you can add it to your home screen like an app."],
  ["How do hours get into payroll?", "Export timesheets as CSV, a QuickBooks IIF file or a Gusto-ready CSV, with overtime already split out."],
  ["What does it cost?", "Constra is free during launch, with every feature included and no credit card required."],
  ["Can I take my data and leave?", "Yes. Invoices, reports and timesheets export to PDF or CSV, and you can delete your account from Settings at any time."],
];

function Chip({ icon, text }: { icon: string; text: string }) {
  const Icon = icon === "pin" ? MapPin : icon === "alert" ? AlertTriangle : icon === "plus" ? Plus : Check;
  return (
    <span className="lp-chip">
      <Icon size={12} strokeWidth={2.5} aria-hidden />
      {text}
    </span>
  );
}

function PhoneMock() {
  return (
    <div className="lp-phone" aria-label="Example of the Constra clock-in screen" role="img">
      <div className="lp-phone-bar">
        <span>7:02</span>
        <span className="lp-phone-notch" />
        <span>5G</span>
      </div>
      <div className="lp-phone-body">
        <p className="lp-mono lp-dim">Tue, Sep 29 · Dundas St. Reno</p>
        <p className="lp-phone-hello">Morning, Marco</p>

        <div className="lp-clock">
          <div className="lp-clock-top">
            <span className="lp-live"><span className="lp-dot" />On site</span>
            <span className="lp-mono">06:58 in</span>
          </div>
          <p className="lp-clock-time">4:12<span>:08</span></p>
          <div className="lp-clock-rows">
            <div><MapPin size={13} aria-hidden /><span>38 m from site</span><b>Verified</b></div>
            <div><Camera size={13} aria-hidden /><span>Photo on punch</span><b>Verified</b></div>
          </div>
          <div className="lp-clock-btn">Clock out</div>
        </div>

        <p className="lp-mono lp-dim lp-phone-label">Today&apos;s crew · 6 on site</p>
        <div className="lp-crew">
          {[
            ["MR", "Marco R.", "Framing", "#1F6F8B"],
            ["AK", "Aisha K.", "Electrical", "#8B5A1F"],
            ["DL", "Dev L.", "Labour", "#3D6B2E"],
          ].map(([i, n, t, c]) => (
            <div key={n} className="lp-crew-row">
              <span className="lp-avatar" style={{ background: c }}>{i}</span>
              <span>{n}</span>
              <span className="lp-dim">{t}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InvoiceSlip() {
  return (
    <div className="lp-slip" aria-hidden>
      <div className="lp-slip-head">
        <span className="lp-mono">INV-0142</span>
        <span className="lp-paid">Sent</span>
      </div>
      <p className="lp-slip-total">$8,420.00</p>
      <div className="lp-slip-lines">
        <div><span>Drywall, 2nd floor</span><span>$5,600.00</span></div>
        <div><span>CO-07 Pot lights</span><span>$1,180.00</span></div>
        <div><span>HST 13%</span><span>$968.66</span></div>
      </div>
    </div>
  );
}

function PayrollCard() {
  const bars = [0, 27, 35, 31.5, 27, 27, 5];
  return (
    <div className="lp-float" aria-hidden>
      <div className="lp-float-top">
        <span className="lp-mono">Payroll · this week</span>
        <span className="lp-ready">Ready</span>
      </div>
      <p className="lp-float-total">$5,506.88</p>
      <div className="lp-float-bars">
        {bars.map((h, i) => <span key={i} style={{ height: `${(h / 35) * 100}%` }} />)}
      </div>
      <p className="lp-mono lp-float-meta">152.5 h · 20 h overtime</p>
    </div>
  );
}

export default function LandingPage() {
  const alreadyIn = useSyncExternalStore(noopSubscribe, readOnboarded, () => false);
  const rootRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  // Hero mockups lean toward the pointer
  useEffect(() => {
    const tilt = tiltRef.current;
    const hero = tilt?.closest(".lp-hero") as HTMLElement | null;
    if (!tilt || !hero || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = hero.getBoundingClientRect();
        tilt.style.setProperty("--tx", (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
        tilt.style.setProperty("--ty", (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
      });
    };
    const onLeave = () => { tilt.style.setProperty("--tx", "0"); tilt.style.setProperty("--ty", "0"); };
    hero.addEventListener("pointermove", onMove);
    hero.addEventListener("pointerleave", onLeave);
    return () => { cancelAnimationFrame(raf); hero.removeEventListener("pointermove", onMove); hero.removeEventListener("pointerleave", onLeave); };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    // The page scrolls inside this fixed container, so in-page anchors need manual scrolling.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest('a[href^="#"]') as HTMLAnchorElement | null;
      const id = a?.getAttribute("href")?.slice(1);
      const target = id ? document.getElementById(id) : null;
      if (!target) return;
      e.preventDefault();
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      root.scrollTo({ top: target.getBoundingClientRect().top + root.scrollTop - 64, behavior: reduce ? "auto" : "smooth" });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, []);

  const startHref = alreadyIn ? "/dashboard" : "/onboarding";
  const startLabel = alreadyIn ? "Open dashboard" : "Start free";

  return (
    <div ref={rootRef} className={`lp ${plexSans.variable} ${plexMono.variable}`}>
      <style>{CSS}</style>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON_LD }} />

      <a href="#main" className="lp-skip">Skip to content</a>

      <header className="lp-nav">
        <div className="lp-wrap lp-nav-inner">
          <Link href="/" className="lp-brand" aria-label="Constra home">
            <span className="lp-brand-mark"><HardHat size={16} strokeWidth={2.5} aria-hidden /></span>
            Constra
          </Link>
          <nav className="lp-nav-links" aria-label="Main">
            <a href="#day">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-cta">
            {!alreadyIn && <Link href="/login" className="lp-link">Sign in</Link>}
            <Link href={startHref} className="lp-btn lp-btn-sm">{startLabel}</Link>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="lp-hero">
          <div className="lp-wrap lp-hero-grid">
            <div className="lp-hero-copy">
              <p className="lp-kicker">For contractors and trade crews</p>
              <h1 className="lp-h1">Run the job.<br />Not the paperwork.</h1>
              <p className="lp-lede">
                Constra puts GPS-verified timesheets, daily reports, safety logs, change orders and invoices in one app, on the phones your crew already carries.
              </p>
              <div className="lp-hero-ctas">
                <Link href={startHref} className="lp-btn">{startLabel} <ArrowRight size={16} aria-hidden /></Link>
                <a href="#day" className="lp-btn lp-btn-ghost">See a day on site</a>
              </div>
              <ul className="lp-facts" aria-label="Quick facts">
                <li>No credit card</li>
                <li>Android, iPhone &amp; web</li>
                <li>15 languages</li>
              </ul>
            </div>
            <div className="lp-hero-visual">
              <div className="lp-tilt" ref={tiltRef}>
                <PhoneMock />
                <InvoiceSlip />
                <PayrollCard />
              </div>
              <div className="lp-hero-shadow" aria-hidden />
            </div>
          </div>
        </section>

        {/* Replaces */}
        <section className="lp-tape-band" aria-label="What Constra replaces">
          <div className="lp-tape" aria-hidden />
          <div className="lp-wrap lp-replaces">
            <p className="lp-replaces-label">Replaces</p>
            <ul>
              <li>Paper timesheets</li>
              <li>The crew group chat</li>
              <li>A shoebox of receipts</li>
              <li>The invoice spreadsheet</li>
              <li>Three other apps</li>
            </ul>
          </div>
          <div className="lp-tape" aria-hidden />
        </section>

        {/* A day on site */}
        <section id="day" className="lp-day">
          <div className="lp-wrap">
            <div className="lp-section-head">
              <p className="lp-kicker lp-kicker-inv">How it works</p>
              <h2 className="lp-h2">One day on site,<br />start to invoice.</h2>
            </div>
            <div className="lp-day-shots">
              {[
                ["morning", "6:58 AM", "Crew clocks in inside the fence"],
                ["midday", "12:00 PM", "Level 4 steel going up"],
                ["afternoon", "4:00 PM", "Deck poured, report sent"],
              ].map(([slug, time, caption]) => (
                <figure key={slug}>
                  <img src={`/site/site-${slug}.webp`} width={1400} height={864} decoding="async" alt={`The same job site at ${time}: ${caption.toLowerCase()}`} />
                  <figcaption>
                    <span className="lp-mono">{time}</span>
                    {caption}
                  </figcaption>
                </figure>
              ))}
            </div>

            <ol className="lp-timeline">
              {DAY.map((s) => (
                <li key={s.time}>
                  <time className="lp-time">{s.time}</time>
                  <h3>{s.title}</h3>
                  <p>{s.body}</p>
                  <Chip icon={s.chip.icon} text={s.chip.text} />
                </li>
              ))}
            </ol>
          </div>
        </section>

        <AppTour />

        {/* Features */}
        <section id="features" className="lp-features">
          <div className="lp-wrap">
            <div className="lp-section-head lp-section-head-row">
              <h2 className="lp-h2">Everything the site needs.<br />Nothing extra to buy.</h2>
              <p className="lp-section-note">All sixteen tools are included on every account. No add-ons and no per-project fees.</p>
            </div>
            <div className="lp-spec">
              {FEATURES.map((g) => (
                <div key={g.group} className="lp-spec-col">
                  <h3 className="lp-spec-group">{g.group}</h3>
                  <dl>
                    {g.items.map(([k, v]) => (
                      <div key={k} className="lp-spec-row">
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          </div>
        </section>

        <LiveSite />

        {/* Field-ready */}
        <section className="lp-field">
          <div className="lp-wrap lp-field-grid">
            <div>
              <p className="lp-kicker">Built for the field</p>
              <h2 className="lp-h2">Made for gloves, glare<br />and one bar of signal.</h2>
              <p className="lp-section-note">
                Big tap targets, a high-contrast interface and no training day. If your crew can send a text, they can clock in.
              </p>
            </div>
            <dl className="lp-field-list">
              <div><dt><WifiOff size={18} aria-hidden /> Offline</dt><dd>Clock-ins and updates queue on the phone and sync when signal returns.</dd></div>
              <div><dt><MapPin size={18} aria-hidden /> Geofence</dt><dd>Set each site&apos;s radius on a map. 500 m by default, adjustable per project.</dd></div>
              <div><dt><span className="lp-field-num">15</span> Languages</dt><dd>Each person picks their own, from Spanish and Polish to Hindi, Arabic and Chinese.</dd></div>
              <div><dt><span className="lp-field-num">OT</span> Overtime</dt><dd>Daily and weekly overtime calculated from the punches, ready for payroll.</dd></div>
            </dl>
          </div>
        </section>

        <SavingsCalc />

        {/* Pricing */}
        <section id="pricing" className="lp-pricing">
          <div className="lp-wrap lp-pricing-grid">
            <div>
              <p className="lp-kicker">Pricing</p>
              <h2 className="lp-h2">Free during launch.</h2>
              <p className="lp-section-note">Every feature, unlimited crew, no credit card. Sign up, invite your crew and run your next job on it.</p>
            </div>
            <div className="lp-price-card">
              <div className="lp-price-top">
                <span className="lp-mono">Constra · Launch</span>
                <span className="lp-price">$0</span>
              </div>
              <ul>
                {["Unlimited crew and projects", "GPS + photo clock-in", "Estimates, invoices and change orders", "Daily reports and safety logs", "Payroll export (CSV, QuickBooks, Gusto)", "Morning brief and AI assistant"].map((f) => (
                  <li key={f}><Check size={15} strokeWidth={2.5} aria-hidden />{f}</li>
                ))}
              </ul>
              <Link href={startHref} className="lp-btn lp-btn-block">{startLabel} <ArrowRight size={16} aria-hidden /></Link>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="lp-faq">
          <div className="lp-wrap lp-faq-grid">
            <h2 className="lp-h2">Questions<br />from the site.</h2>
            <div className="lp-faq-list">
              {FAQ.map(([q, a]) => (
                <details key={q}>
                  <summary>{q}<Plus size={18} aria-hidden /></summary>
                  <p>{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="lp-final">
          <div className="lp-wrap lp-final-inner">
            <h2 className="lp-h2">Get your crew on it<br />before Monday.</h2>
            <div className="lp-final-ctas">
              <Link href={startHref} className="lp-btn lp-btn-ink">{startLabel} <ArrowRight size={16} aria-hidden /></Link>
              <a href="https://play.google.com/store/apps/details?id=com.getconstra.app" target="_blank" rel="noopener noreferrer" className="lp-link lp-link-ink">Get the Android app</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap lp-footer-inner">
          <div>
            <span className="lp-brand"><span className="lp-brand-mark"><HardHat size={14} strokeWidth={2.5} aria-hidden /></span>Constra</span>
            <p className="lp-dim">Field workforce management for construction and trades.</p>
          </div>
          <nav aria-label="Footer" className="lp-footer-links">
            <Link href="/login">Sign in</Link>
            <Link href="/onboarding">Create account</Link>
            <Link href="/support">Support</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
          </nav>
          <p className="lp-dim lp-mono lp-copy">© {new Date().getFullYear()} Constra · getconstra.com</p>
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

const CSS = `
.lp{
  --ground:#E7E5E0; --paper:#F5F4F1; --ink:#151617; --ink2:#4B4D50; --ink3:#77797C;
  --rule:#CBC8C1; --hv:#F5C400; --hv-ink:#1A1600; --go:#1E7A45; --stop:#B9382C;
  --night:#151617; --night2:#202224; --night-rule:#34373A; --night-ink:#ECEAE5; --night-dim:#9A9C9F;
  --display:var(--font-barlow-condensed),'Arial Narrow',sans-serif;
  --sans:var(--lp-sans),system-ui,sans-serif; --mono:var(--lp-mono),ui-monospace,monospace;
  position:fixed; inset:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch;
  background:var(--ground); color:var(--ink); font-family:var(--sans); font-size:16px; line-height:1.55;
  -webkit-font-smoothing:antialiased;
}
.lp *{box-sizing:border-box}
:where(.lp) a{color:inherit}
.lp :focus-visible{outline:3px solid var(--ink); outline-offset:3px}
.lp-day :focus-visible,.lp-footer :focus-visible{outline-color:var(--hv)}
.lp-wrap{max-width:1200px; margin:0 auto; padding-inline:24px}
.lp-mono{font-family:var(--mono); font-size:12px; letter-spacing:.02em}
.lp-dim{color:var(--ink3)}
.lp-skip{position:absolute; left:-9999px; top:8px; z-index:100; background:var(--ink); color:var(--paper); padding:8px 12px}
.lp-skip:focus{left:8px}

/* Nav */
.lp-nav{position:sticky; top:0; z-index:40; background:color-mix(in srgb,var(--ground) 92%,transparent); backdrop-filter:saturate(1.2) blur(10px); border-bottom:1px solid var(--rule); padding-top:env(safe-area-inset-top,0px)}
.lp-nav-inner{height:60px; display:flex; align-items:center; gap:32px}
.lp-brand{display:inline-flex; align-items:center; gap:10px; font-family:var(--display); font-weight:800; font-size:22px; letter-spacing:.02em; text-transform:uppercase; text-decoration:none}
.lp-brand-mark{width:30px; height:30px; background:var(--hv); color:var(--hv-ink); display:grid; place-items:center; border-radius:3px}
.lp-nav-links{display:flex; gap:28px; margin-right:auto}
.lp-nav-links a{text-decoration:none; font-size:14px; font-weight:500; color:var(--ink2)}
.lp-nav-links a:hover{color:var(--ink)}
.lp-nav-cta{display:flex; align-items:center; gap:18px}
.lp-link{font-size:14px; font-weight:500; text-decoration:underline; text-underline-offset:4px; text-decoration-color:var(--rule)}
.lp-link:hover{text-decoration-color:currentColor}

/* Buttons */
.lp-btn{display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:48px; padding:0 22px; background:var(--hv); color:var(--hv-ink); font-weight:600; font-size:15px; text-decoration:none; border:1.5px solid var(--hv-ink); border-radius:3px; box-shadow:0 3px 0 var(--hv-ink); transition:transform .12s, box-shadow .12s}
.lp-btn:hover{transform:translateY(-1px); box-shadow:0 4px 0 var(--hv-ink)}
.lp-btn:active{transform:translateY(3px); box-shadow:0 0 0 var(--hv-ink)}
.lp-btn-sm{min-height:38px; padding:0 14px; font-size:14px; box-shadow:0 2px 0 var(--hv-ink)}
.lp-btn-ghost{background:transparent; color:var(--ink); border-color:var(--ink); box-shadow:none}
.lp-btn-ghost:hover{background:var(--paper); box-shadow:none}
.lp-btn-ink{background:var(--ink); color:var(--hv); border-color:var(--ink); box-shadow:0 3px 0 #000}
.lp-btn-block{width:100%}

/* Type */
.lp-kicker{font-family:var(--mono); font-size:12px; text-transform:uppercase; letter-spacing:.12em; color:var(--ink2); margin:0 0 16px; display:flex; align-items:center; gap:10px}
.lp-kicker::before{content:""; width:18px; height:8px; background:repeating-linear-gradient(135deg,var(--ink) 0 4px,var(--hv) 4px 8px)}
.lp-kicker-inv{color:var(--night-dim)}
.lp-kicker-inv::before{background:repeating-linear-gradient(135deg,var(--hv) 0 4px,var(--night) 4px 8px)}
.lp-h1,.lp-h2{font-family:var(--display); font-weight:800; text-transform:uppercase; line-height:.92; letter-spacing:-.005em; margin:0; text-wrap:balance}
.lp-h1{font-size:clamp(52px,8.4vw,112px)}
.lp-h2{font-size:clamp(38px,5.2vw,68px)}
.lp-lede{font-size:clamp(17px,1.5vw,19px); color:var(--ink2); max-width:52ch; margin:24px 0 32px}
.lp-section-head{margin-bottom:48px}
.lp-section-head-row{display:flex; justify-content:space-between; align-items:flex-end; gap:32px; flex-wrap:wrap}
.lp-section-note{color:var(--ink2); max-width:44ch; margin:20px 0 0}
.lp-section-head-row .lp-section-note{margin:0}

/* Hero */
.lp-hero{padding-block:72px 88px}
.lp-hero-grid{display:grid; grid-template-columns:1.15fr .85fr; gap:48px; align-items:center}
.lp-hero-ctas{display:flex; gap:12px; flex-wrap:wrap}
.lp-facts{list-style:none; padding:0; margin:28px 0 0; display:flex; flex-wrap:wrap; gap:8px 22px; font-family:var(--mono); font-size:12.5px; color:var(--ink2)}
.lp-facts li{display:flex; align-items:center; gap:8px}
.lp-facts li::before{content:""; width:6px; height:6px; background:var(--go); border-radius:50%}
.lp-hero-visual{position:relative; display:flex; justify-content:center; padding-bottom:40px}

.lp-phone{width:300px; max-width:100%; background:var(--night); border-radius:34px; padding:10px; border:1px solid #000; box-shadow:0 30px 60px -20px rgba(20,22,23,.45), 0 0 0 6px #2A2C2E inset}
.lp-phone-bar{display:flex; justify-content:space-between; align-items:center; color:var(--night-ink); font-family:var(--mono); font-size:11px; padding:6px 16px 8px}
.lp-phone-notch{width:72px; height:18px; background:#000; border-radius:10px}
.lp-phone-body{background:#101112; border-radius:24px; padding:18px 16px 20px; color:var(--night-ink)}
.lp-phone-body .lp-dim{color:var(--night-dim)}
.lp-phone-hello{font-family:var(--display); font-weight:800; font-size:26px; text-transform:uppercase; margin:4px 0 14px; line-height:1}
.lp-clock{background:var(--night2); border:1px solid var(--night-rule); border-radius:14px; padding:14px}
.lp-clock-top{display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--night-dim)}
.lp-live{display:inline-flex; align-items:center; gap:6px; color:#5BD08A; font-weight:600}
.lp-dot{width:7px; height:7px; border-radius:50%; background:#5BD08A}
.lp-clock-time{font-family:var(--display); font-weight:800; font-size:54px; line-height:1; margin:8px 0 12px; font-variant-numeric:tabular-nums}
.lp-clock-time span{color:var(--night-dim); font-size:30px}
.lp-clock-rows{display:grid; gap:6px; font-size:12px}
.lp-clock-rows div{display:grid; grid-template-columns:16px 1fr auto; gap:8px; align-items:center; color:var(--night-dim)}
.lp-clock-rows b{color:#5BD08A; font-weight:600; font-size:11px}
.lp-clock-btn{margin-top:14px; background:var(--hv); color:var(--hv-ink); text-align:center; font-weight:600; font-size:14px; border-radius:10px; padding:11px}
.lp-phone-label{margin:16px 0 8px}
.lp-crew{display:grid; gap:8px}
.lp-crew-row{display:grid; grid-template-columns:28px 1fr auto; gap:10px; align-items:center; font-size:13px}
.lp-avatar{width:28px; height:28px; border-radius:50%; display:grid; place-items:center; font-size:10px; font-weight:600; color:#fff}

.lp-slip{position:absolute; left:-8px; bottom:-12px; width:228px; background:var(--paper); border:1px solid var(--rule); border-top:4px solid var(--ink); padding:14px 16px; box-shadow:0 18px 40px -18px rgba(20,22,23,.4); transform:rotate(-2.5deg)}
.lp-slip-head{display:flex; justify-content:space-between; align-items:center}
.lp-paid{font-size:11px; font-weight:600; color:var(--go); border:1px solid currentColor; padding:1px 6px; border-radius:2px}
.lp-slip-total{font-family:var(--display); font-weight:800; font-size:34px; margin:6px 0 8px; font-variant-numeric:tabular-nums}
.lp-slip-lines{display:grid; gap:4px; font-size:12px; color:var(--ink2); border-top:1px dashed var(--rule); padding-top:8px}
.lp-slip-lines div{display:flex; justify-content:space-between; gap:12px; font-variant-numeric:tabular-nums}

/* Tape band */
.lp-tape{height:14px; background:repeating-linear-gradient(135deg,var(--ink) 0 14px,var(--hv) 14px 28px)}
.lp-tape-band{background:var(--hv)}
.lp-replaces{display:flex; align-items:center; gap:24px; padding-block:20px; flex-wrap:wrap}
.lp-replaces-label{font-family:var(--mono); font-size:12px; text-transform:uppercase; letter-spacing:.12em; margin:0; color:var(--hv-ink)}
.lp-replaces ul{list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:6px 0}
.lp-replaces li{font-family:var(--display); font-weight:700; font-size:22px; text-transform:uppercase; color:var(--hv-ink); text-decoration:line-through; text-decoration-thickness:2px}
.lp-replaces li+li::before{content:"/"; text-decoration:none; display:inline-block; margin:0 14px; opacity:.4}

/* Day */
.lp-day{background:var(--night); color:var(--night-ink); padding-block:96px}
.lp-timeline{list-style:none; margin:0; padding:0; display:grid; grid-template-columns:repeat(5,1fr); border-top:1px solid var(--night-rule)}
.lp-timeline li{padding:24px 20px 8px 0; position:relative; display:flex; flex-direction:column; gap:10px}
.lp-timeline li::before{content:""; position:absolute; top:-5px; left:0; width:9px; height:9px; background:var(--hv)}
.lp-time{font-family:var(--mono); font-size:13px; color:var(--hv)}
.lp-timeline h3{font-family:var(--display); font-weight:700; font-size:26px; text-transform:uppercase; line-height:1; margin:0}
.lp-timeline p{margin:0; color:var(--night-dim); font-size:14.5px}
.lp-chip{margin-top:auto; align-self:flex-start; display:inline-flex; align-items:center; gap:6px; font-family:var(--mono); font-size:11.5px; color:var(--night-ink); background:var(--night2); border:1px solid var(--night-rule); padding:5px 8px; border-radius:2px}

/* Features */
.lp-features{padding-block:96px}
.lp-spec{display:grid; grid-template-columns:repeat(4,1fr); border-top:2px solid var(--ink)}
.lp-spec-col{padding:20px 20px 0 0}
.lp-spec-col+.lp-spec-col{padding-left:20px; border-left:1px solid var(--rule)}
.lp-spec-group{font-family:var(--mono); font-weight:500; font-size:12px; text-transform:uppercase; letter-spacing:.12em; margin:0 0 8px; color:var(--ink2)}
.lp-spec dl{margin:0}
.lp-spec-row{padding:14px 0; border-bottom:1px solid var(--rule)}
.lp-spec-row dt{font-weight:600; font-size:16px}
.lp-spec-row dd{margin:4px 0 0; font-size:14px; color:var(--ink2)}

/* Field */
.lp-field{padding-block:96px; background:var(--paper); border-block:1px solid var(--rule)}
.lp-field-grid{display:grid; grid-template-columns:1fr 1fr; gap:64px; align-items:start}
.lp-field-list{margin:0; display:grid; gap:0}
.lp-field-list div{display:grid; grid-template-columns:150px 1fr; gap:20px; padding:20px 0; border-bottom:1px solid var(--rule)}
.lp-field-list div:first-child{border-top:1px solid var(--rule)}
.lp-field-list dt{font-weight:600; display:flex; align-items:center; gap:10px}
.lp-field-list dd{margin:0; color:var(--ink2); font-size:15px}
.lp-field-num{font-family:var(--display); font-weight:800; font-size:22px; line-height:1; background:var(--hv); color:var(--hv-ink); padding:2px 5px; border-radius:2px}

/* Pricing */
.lp-pricing{padding-block:96px}
.lp-pricing-grid{display:grid; grid-template-columns:1fr minmax(0,440px); gap:64px; align-items:center}
.lp-price-card{background:var(--paper); border:1.5px solid var(--ink); border-radius:4px; padding:28px; box-shadow:6px 6px 0 var(--ink)}
.lp-price-top{display:flex; justify-content:space-between; align-items:baseline; border-bottom:1px solid var(--rule); padding-bottom:16px; margin-bottom:16px}
.lp-price{font-family:var(--display); font-weight:800; font-size:64px; line-height:1}
.lp-price-card ul{list-style:none; padding:0; margin:0 0 24px; display:grid; gap:10px; font-size:15px}
.lp-price-card li{display:flex; gap:10px; align-items:flex-start}
.lp-price-card li svg{color:var(--go); flex-shrink:0; margin-top:3px}

/* FAQ */
.lp-faq{padding-block:96px; border-top:1px solid var(--rule)}
.lp-faq-grid{display:grid; grid-template-columns:1fr 1.6fr; gap:64px; align-items:start}
.lp-faq-list{border-top:2px solid var(--ink)}
.lp-faq details{border-bottom:1px solid var(--rule)}
.lp-faq summary{list-style:none; cursor:pointer; display:flex; justify-content:space-between; align-items:center; gap:16px; padding:20px 0; font-weight:600; font-size:17px}
.lp-faq summary::-webkit-details-marker{display:none}
.lp-faq summary svg{flex-shrink:0; transition:transform .2s}
.lp-faq details[open] summary svg{transform:rotate(45deg)}
.lp-faq details p{margin:-6px 0 20px; color:var(--ink2); max-width:62ch}

/* Final */
.lp-final{background:var(--hv); color:var(--hv-ink); border-top:14px solid transparent; border-image:repeating-linear-gradient(135deg,var(--ink) 0 14px,var(--hv) 14px 28px) 14}
.lp-final-inner{padding-block:80px; display:flex; justify-content:space-between; align-items:flex-end; gap:32px; flex-wrap:wrap}
.lp-final-ctas{display:flex; align-items:center; gap:24px; flex-wrap:wrap}
.lp-link-ink{color:var(--hv-ink); text-decoration-color:rgba(26,22,0,.4)}

/* Hero 3D */
.lp-hero-visual{perspective:1600px; perspective-origin:50% 40%}
.lp-tilt{position:relative; transform-style:preserve-3d; transform:rotateY(calc(-14deg + var(--tx,0) * 8deg)) rotateX(calc(6deg - var(--ty,0) * 6deg)); transition:transform .6s cubic-bezier(.2,.7,.2,1)}
.lp-tilt .lp-phone{position:relative; transform:translateZ(0)}
.lp-tilt .lp-slip{left:-84px; bottom:-14px; transform:translateZ(70px) rotate(-2.5deg)}
.lp-float{position:absolute; right:-78px; top:-30px; width:200px; background:var(--ink); color:var(--night-ink); border:1px solid #000; border-top:4px solid var(--hv); padding:12px 14px 12px; transform:translateZ(120px) rotate(1.5deg); box-shadow:0 26px 44px -18px rgba(0,0,0,.55); animation:lp-bob 7s ease-in-out infinite}
@keyframes lp-bob{50%{translate:0 -9px}}
.lp-float-top{display:flex; justify-content:space-between; align-items:center; color:var(--night-dim)}
.lp-float-top .lp-mono{font-size:10.5px}
.lp-ready{font-size:10.5px; font-weight:600; color:#7BD69E; border:1px solid #2F5E40; padding:1px 6px; border-radius:2px}
.lp-float-total{font-family:var(--display); font-weight:800; font-size:30px; line-height:1; margin:10px 0 10px; letter-spacing:.01em}
.lp-float-bars{display:flex; align-items:flex-end; gap:4px; height:34px; border-bottom:1px solid var(--night-rule)}
.lp-float-bars span{flex:1; background:var(--hv); min-height:2px}
.lp-float-meta{margin:8px 0 0; color:var(--night-dim); font-size:10.5px !important}
.lp-hero-shadow{position:absolute; left:18%; right:18%; bottom:4px; height:28px; background:radial-gradient(closest-side,rgba(20,22,23,.3),transparent); pointer-events:none}

/* Live site (3D) */
.lp-sitecam{background:var(--night); color:var(--night-ink); padding-block:96px 104px}
.lp-sitecam .lp-section-note{color:var(--night-dim)}
.lp-live-head{display:flex; justify-content:space-between; align-items:flex-end; gap:32px; flex-wrap:wrap; margin-bottom:40px}
.lp-stage3d{position:relative; height:clamp(440px,52vw,620px); border:1px solid var(--night-rule); background:#1B1A22; overflow:hidden; isolation:isolate}
.lp-stage3d::before{content:""; position:absolute; inset:0 0 auto; height:6px; z-index:2; background:repeating-linear-gradient(135deg,var(--hv) 0 10px,var(--night) 10px 20px)}
.lp-stage3d-flat{height:auto; min-height:0; padding:64px 20px 20px; background:var(--night2)}
.lp-scene{position:absolute; inset:0}
.lp-scene canvas{display:block; width:100% !important; height:100% !important; cursor:grab}
.lp-hud{position:absolute; z-index:3; display:flex; align-items:center; gap:10px; background:rgba(21,22,23,.82); backdrop-filter:blur(8px); border:1px solid var(--night-rule); padding:8px 12px}
.lp-hud-clock{top:22px; left:20px}
.lp-hud-clock .lp-mono{color:var(--night-dim)}
.lp-hud-clock b{font-family:var(--display); font-weight:800; font-size:22px; letter-spacing:.02em; min-width:86px; font-variant-numeric:tabular-nums}
.lp-live-dot{width:8px; height:8px; border-radius:50%; background:var(--night-rule)}
.lp-live-dot[data-on="true"]{background:#2EAA62; box-shadow:0 0 0 4px rgba(46,170,98,.2)}
.lp-hud-ctrl{left:20px; right:20px; bottom:20px; max-width:440px; display:grid; grid-template-columns:auto 1fr; grid-template-rows:auto auto; gap:4px 12px}
.lp-play{grid-row:1/3; width:38px; height:38px; display:grid; place-items:center; background:var(--hv); color:var(--hv-ink); border:0; border-radius:2px; cursor:pointer}
.lp-play:focus-visible{outline:3px solid var(--night-ink); outline-offset:2px}
.lp-scrub{grid-column:2; align-self:end; height:4px; background:var(--night-rule); overflow:hidden}
.lp-scrub span{display:block; height:100%; background:var(--hv); transform-origin:left}
.lp-scrub-l,.lp-scrub-r{grid-row:2; font-size:10.5px !important; color:var(--night-dim)}
.lp-scrub-l{grid-column:2; justify-self:start}
.lp-scrub-r{grid-column:2; justify-self:end}
.lp-feed{position:absolute; z-index:3; top:22px; right:20px; width:min(340px,40%); list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:6px}
.lp-feed-item{display:grid; grid-template-columns:28px 1fr auto; gap:10px; align-items:center; background:rgba(21,22,23,.86); backdrop-filter:blur(8px); border:1px solid var(--night-rule); padding:8px 10px; opacity:0; transform:translateX(16px); transition:opacity .35s, transform .35s, border-color .35s}
.lp-feed-item.is-on{opacity:1; transform:none}
.lp-feed-item.is-new{border-color:var(--hv)}
.lp-feed-icon{width:28px; height:28px; display:grid; place-items:center; background:var(--night2); color:var(--hv); border-radius:2px}
.lp-feed-item[data-tone="go"] .lp-feed-icon{color:#7BD69E}
.lp-feed-item[data-tone="warn"] .lp-feed-icon{color:#FF8A70}
.lp-feed-text{display:flex; flex-direction:column; min-width:0}
.lp-feed-text b{font-size:13px; font-weight:600; line-height:1.3}
.lp-feed-text span{font-size:12px; color:var(--night-dim); line-height:1.35}
.lp-feed-item time{font-size:10.5px !important; color:var(--night-dim); align-self:start; padding-top:2px}
.lp-stage3d-flat .lp-feed{position:static; width:auto}
.lp-stage3d-flat .lp-hud-clock{top:20px}

/* A day on site: real renders of the same job site */
.lp-day-shots{display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:48px}
.lp-day-shots figure{margin:0; border:1px solid var(--night-rule); background:#1B1A22; overflow:hidden}
.lp-day-shots img{display:block; width:100%; height:auto; aspect-ratio:1400/864; object-fit:cover}
.lp-day-shots figcaption{display:flex; flex-direction:column; gap:3px; padding:12px 14px 14px; font-size:13px; color:var(--night-ink); border-top:1px solid var(--night-rule)}
.lp-day-shots figcaption .lp-mono{color:var(--hv); font-size:11px; letter-spacing:.08em}
.lp-scene-video{position:absolute; inset:0; width:100%; height:100%; object-fit:cover; background:#1B1A22; display:block}
.lp-stage3d-flat .lp-scene-video{position:relative; inset:auto; height:auto; aspect-ratio:1200/740}

/* The actual app: screen recording + real screens */
.lp-tour{padding-block:96px; background:var(--paper); border-block:1px solid var(--rule)}
.lp-tour-grid{display:grid; grid-template-columns:1fr 1fr; gap:56px; align-items:center}
.lp-tour-tabs{display:flex; flex-wrap:wrap; gap:8px; margin-top:28px}
.lp-tour-tabs button{font:inherit; font-size:13px; font-weight:600; padding:9px 15px; min-height:40px; background:transparent; color:var(--ink2); border:1.5px solid var(--rule); border-radius:999px; cursor:pointer; transition:background .15s, border-color .15s, color .15s}
.lp-tour-tabs button:hover{border-color:var(--ink3); color:var(--ink)}
.lp-tour-tabs button.is-on{background:var(--ink); border-color:var(--ink); color:var(--hv)}
.lp-tour-caption{margin:16px 0 0; color:var(--ink2); font-size:14px; min-height:2.6em; max-width:40ch}
.lp-tour-devices{display:grid; grid-template-columns:1fr 1fr; gap:22px; align-items:start}
.lp-device{margin:0; display:flex; flex-direction:column; gap:10px}
.lp-device-screen{background:var(--night); border:1px solid #000; border-radius:26px; padding:7px; box-shadow:0 26px 54px -24px rgba(20,22,23,.5), 0 0 0 5px #2A2C2E inset; overflow:hidden}
.lp-device-screen video,.lp-device-screen img{display:block; width:100%; height:auto; aspect-ratio:390/844; object-fit:cover; border-radius:20px; background:#0a0a0a}
.lp-device figcaption{font-size:11px; color:var(--ink3); text-align:center; letter-spacing:.04em}
.lp-device-video{transform:translateY(-10px)}
.lp-device-shot{transform:translateY(16px)}

/* Savings calculator */
.lp-calc{padding-block:96px; border-top:1px solid var(--rule)}
.lp-calc-grid{display:grid; grid-template-columns:.9fr 1.1fr; gap:56px; align-items:center}
.lp-calc-card{background:var(--ink); color:var(--night-ink); border:1px solid #000; padding:28px 28px 22px; box-shadow:8px 8px 0 var(--hv); display:grid; gap:22px}
.lp-calc-label{display:flex; justify-content:space-between; align-items:baseline; gap:16px; margin-bottom:10px; font-size:14px}
.lp-calc-label label{color:var(--night-dim)}
.lp-calc-label output{font-family:var(--display); font-weight:800; font-size:22px; letter-spacing:.02em; font-variant-numeric:tabular-nums}
.lp-calc input[type=range]{-webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:0; cursor:pointer; background:linear-gradient(90deg,var(--hv) var(--pct),var(--night-rule) var(--pct)); margin:0}
.lp-calc input[type=range]::-webkit-slider-thumb{-webkit-appearance:none; width:24px; height:24px; background:var(--paper); border:3px solid var(--hv); border-radius:2px; box-shadow:0 2px 0 #000}
.lp-calc input[type=range]::-moz-range-thumb{width:20px; height:20px; background:var(--paper); border:3px solid var(--hv); border-radius:2px}
.lp-calc input[type=range]:focus-visible{outline:3px solid var(--hv); outline-offset:6px}
.lp-calc-out{display:grid; grid-template-columns:1fr 1.4fr; gap:1px; background:var(--night-rule); border:1px solid var(--night-rule); margin-top:4px}
.lp-calc-out div{background:var(--night2); padding:14px 16px; display:flex; flex-direction:column; gap:4px}
.lp-calc-out .lp-mono{color:var(--night-dim); font-size:11px; text-transform:uppercase; letter-spacing:.08em}
.lp-calc-out b{font-family:var(--display); font-weight:800; font-size:clamp(28px,3.4vw,40px); line-height:1; font-variant-numeric:tabular-nums}
.lp-calc-big b{color:var(--hv)}
.lp-calc-foot{margin:0; color:var(--night-dim); font-size:11.5px !important; line-height:1.5}

/* Footer */
.lp-footer{background:var(--night); color:var(--night-ink); padding-block:48px calc(48px + env(safe-area-inset-bottom,0px))}
.lp-footer .lp-dim{color:var(--night-dim); font-size:14px; margin:10px 0 0}
.lp-footer-inner{display:grid; grid-template-columns:1fr auto; gap:32px 48px}
.lp-footer-links{display:flex; flex-wrap:wrap; gap:12px 28px; align-items:flex-start}
.lp-footer-links a{text-decoration:none; font-size:14px; color:var(--night-ink)}
.lp-footer-links a:hover{color:var(--hv)}
.lp-copy{grid-column:1/-1; border-top:1px solid var(--night-rule); padding-top:20px; margin:0 !important; font-size:12px !important}

@media (max-width:1000px){
  .lp-timeline{grid-template-columns:1fr; border-top:0; border-left:1px solid var(--night-rule); margin-left:4px}
  .lp-timeline li{padding:0 0 32px 24px}
  .lp-timeline li::before{top:4px; left:-5px}
  .lp-spec{grid-template-columns:1fr 1fr}
  .lp-spec-col:nth-child(3){padding-left:0; border-left:0}
  .lp-spec-col:nth-child(n+3){padding-top:32px}
}
@media (max-width:860px){
  .lp-nav-links{display:none}
  .lp-nav-cta{margin-left:auto}
  .lp-hero{padding-block:40px 56px}
  .lp-hero-grid,.lp-field-grid,.lp-pricing-grid,.lp-faq-grid,.lp-calc-grid,.lp-tour-grid{grid-template-columns:1fr; gap:40px}
  .lp-tour{padding-block:64px}
  .lp-device-video,.lp-device-shot{transform:none}
  .lp-calc{padding-block:64px}
  .lp-hero-visual{padding-bottom:56px}
  .lp-slip{left:auto; right:50%; margin-right:40px; width:210px}
  .lp-day,.lp-features,.lp-field,.lp-pricing,.lp-faq{padding-block:64px}
  .lp-day-shots{grid-template-columns:1fr; gap:12px; margin-bottom:36px}
  .lp-day-shots figure:nth-child(n+3){display:none}
  .lp-footer-inner{grid-template-columns:1fr}
}
@media (max-width:600px){
  .lp-wrap{padding-inline:16px}
  .lp-nav-cta{gap:14px}
  .lp-brand{font-size:20px}
  .lp-spec{grid-template-columns:1fr}
  .lp-spec-col,.lp-spec-col+.lp-spec-col{padding:24px 0 0; border-left:0}
  .lp-field-list div{grid-template-columns:1fr; gap:6px}
  .lp-slip{right:auto; left:0; margin:0; width:200px; transform:rotate(-2deg)}
  .lp-hero-visual{justify-content:flex-end}
  .lp-phone{width:260px}
  .lp-replaces li{font-size:18px}
  .lp-price-card{box-shadow:4px 4px 0 var(--ink)}
  .lp-tour-devices{gap:12px}
  .lp-device-screen{border-radius:20px; padding:5px}
  .lp-device-screen video,.lp-device-screen img{border-radius:16px}
  .lp-calc-card{padding:22px 18px 18px; box-shadow:5px 5px 0 var(--hv)}
  .lp-calc-out{grid-template-columns:1fr}
}
@media (max-width:860px){
  .lp-tilt .lp-slip{left:-70px; right:auto; margin:0}
  .lp-float{right:-40px}
  .lp-sitecam{padding-block:64px 72px}
  .lp-stage3d{height:auto; display:flex; flex-direction:column}
  .lp-scene{position:relative; inset:auto; height:min(440px,100vw)}
  .lp-scene-video{position:relative; inset:auto; height:min(440px,100vw); order:0}
  .lp-feed{position:relative; top:auto; right:auto; width:auto; padding:12px; gap:6px; flex-direction:column-reverse}
  .lp-feed-item:not(.is-on){display:none}
  .lp-feed-item.is-on:not(.is-new){opacity:.62}
  .lp-hud-ctrl{position:relative; order:2; inset:auto; max-width:none; margin:0 12px; border-width:1px 0 0; background:transparent; backdrop-filter:none; padding:12px 0 4px}
  .lp-feed{order:3; min-height:236px; justify-content:flex-end}
  .lp-feed-item.is-old{display:none}
  .lp-hud-clock{top:18px; left:12px; padding:6px 10px}
  .lp-hud-clock b{font-size:18px; min-width:72px}
}
@media (max-width:600px){
  .lp-tilt{transform:rotateY(-8deg) rotateX(4deg)}
  .lp-tilt .lp-slip{left:-78px; width:190px}
  .lp-hero-visual{margin-top:12px}
  .lp-float{right:-4px; top:-6px; width:142px; padding:9px 10px; transform:translateZ(110px) rotate(1.5deg)}
  .lp-float-top .lp-mono{font-size:9.5px}
  .lp-ready{display:none}
  .lp-float-meta{display:none}
  .lp-float-total{font-size:24px; margin:6px 0 8px}
  .lp-float-bars{height:24px}
}
@media (prefers-reduced-motion:reduce){
  .lp *{transition:none !important}
  .lp-float{animation:none}
}
`;
