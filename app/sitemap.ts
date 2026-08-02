import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://constra.app";
  const now = new Date();

  return [
    { url: base,                priority: 1.0,  changeFrequency: "weekly",  lastModified: now },
    { url: `${base}/login`,     priority: 0.8,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/onboarding`,priority: 0.9,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/terms`,     priority: 0.4,  changeFrequency: "monthly", lastModified: now },
    { url: `${base}/privacy`,   priority: 0.4,  changeFrequency: "monthly", lastModified: now },
  ];
}
