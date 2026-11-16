import type { Metadata } from "next";
import Link from "next/link";
import { Shell } from "@/components/seo/landing-page";
import { SOLUTIONS } from "@/lib/seo-pages";

export const metadata: Metadata = {
  title: "Time Tracking and Paperwork Solutions for Contractors | Constra",
  description: "Timesheet app, construction time clock, GPS time tracking, daily reports, free timesheet templates and offline tracking for job sites. Free while Constra launches.",
  alternates: { canonical: "/solutions" },
};

export default function SolutionsIndex() {
  return (
    <Shell>
      <main className="mx-auto max-w-6xl px-5 py-16">
        <h1 className="font-[family-name:var(--font-barlow-condensed)] text-5xl font-extrabold uppercase leading-[0.95] sm:text-7xl">Less paperwork, more building</h1>
        <p className="mt-4 max-w-2xl text-lg text-[#151617]/80">The jobs Constra takes off your plate.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {SOLUTIONS.map((s) => (
            <Link key={s.slug} href={`/solutions/${s.slug}`} className="rounded-2xl border border-[#CBC8C1] bg-[#F5F4F1] p-6 transition-colors hover:border-[#151617]">
              <h2 className="font-[family-name:var(--font-barlow-condensed)] text-3xl font-extrabold uppercase">{s.title}</h2>
              <p className="mt-2 text-[15px] text-[#4B4D50]">{s.hook}</p>
            </Link>
          ))}
        </div>
      </main>
    </Shell>
  );
}
