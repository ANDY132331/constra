import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/seo/landing-page";
import { TRADES } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Time Tracking Software for Every Trade | Constra",
  description: "GPS time clocks, timesheets, daily reports and invoices for framers, electricians, plumbers, HVAC, roofers, concrete, landscapers and more. Free while Constra launches.",
  alternates: { canonical: "/for" },
};

export default function ForIndex() {
  return (
    <Shell>
      <main className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">Built for every trade</h1>
        <p className="mt-4 max-w-2xl text-lg text-[#151617]/80">Pick your trade to see how crews like yours use Constra for time tracking, timesheets, daily reports and invoices.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TRADES.map((t) => (
            <Link key={t.slug} href={`/for/${t.slug}`} className="rounded-2xl border border-[#CBC8C1] bg-[#F5F4F1] p-6 transition-colors hover:border-[#151617]">
              <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-extrabold uppercase">{t.name}</h2>
              <p className="mt-2 text-[15px] text-[#4B4D50]">{t.hook}</p>
            </Link>
          ))}
        </div>
      </main>
    </Shell>
  );
}
