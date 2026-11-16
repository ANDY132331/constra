import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingPage } from "@/components/seo/landing-page";
import { SOLUTIONS } from "@/lib/seo-pages";

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const s = SOLUTIONS.find((x) => x.slug === slug);
  if (!s) return {};
  const title = `${s.title} | Constra`;
  const description = `${s.hook} Free while Constra launches, no credit card.`;
  return { title, description, alternates: { canonical: `/solutions/${s.slug}` }, openGraph: { title, description, url: `https://getconstra.com/solutions/${s.slug}`, type: "website" } };
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const s = SOLUTIONS.find((x) => x.slug === slug);
  if (!s) notFound();
  return (
    <LandingPage
      kicker={s.title}
      h1={s.h1}
      hook={s.hook}
      blockTitle="How it works"
      block={s.steps}
      numbered
      helps={s.helps}
      faq={s.faq}
      shot={s.shot}
      campaign={`solution-${s.slug}`}
      path={`/solutions/${s.slug}`}
      name={s.title}
    />
  );
}
