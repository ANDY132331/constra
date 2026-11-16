import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/seo/landing-page";
import { TRADES } from "@/lib/seo-pages";

export function generateStaticParams() {
  return TRADES.map((t) => ({ trade: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ trade: string }> }): Promise<Metadata> {
  const { trade } = await params;
  const t = TRADES.find((x) => x.slug === trade);
  if (!t) return {};
  const title = `Time Tracking and Timesheets for ${t.name} | Constra`;
  const description = `${t.hook} GPS and photo clock-in, timesheets as PDF or Excel, daily reports and invoices for ${t.who}. Free while Constra launches.`;
  return { title, description, alternates: { canonical: `/for/${t.slug}` }, openGraph: { title, description, url: `https://getconstra.com/for/${t.slug}`, type: "website" } };
}

export default async function TradePage({ params }: { params: Promise<{ trade: string }> }) {
  const { trade } = await params;
  const t = TRADES.find((x) => x.slug === trade);
  if (!t) notFound();
  return (
    <LandingPage
      kicker={`For ${t.who}`}
      h1={`Time tracking built for ${t.name.toLowerCase()}`}
      hook={t.hook}
      blockTitle="Sound familiar?"
      block={t.pains}
      helps={t.helps}
      faq={t.faq}
      shot={t.shot}
      campaign={`trade-${t.slug}`}
      path={`/for/${t.slug}`}
      name={t.name}
    />
  );
}
