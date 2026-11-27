import type { MetadataRoute } from "next";
import { ALL_PATHS } from "@/lib/seo-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://getconstra.com";
  const now = new Date();

  return [
    { url: base,                priority: 1.0,  changeFrequency: "weekly",  lastModified: now },
    { url: `${base}/login`,     priority: 0.8,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/install`,   priority: 0.6,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/onboarding`,priority: 0.9,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/terms`,     priority: 0.4,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/privacy`,   priority: 0.4,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/for`, priority: 0.7, changeFrequency: "monthly", lastModified: now },
    { url: `${base}/solutions`, priority: 0.7, changeFrequency: "monthly", lastModified: now },
    ...ALL_PATHS.map((path) => ({ url: `${base}${path}`, priority: 0.7, changeFrequency: "monthly" as const, lastModified: now })),
  ];
}
