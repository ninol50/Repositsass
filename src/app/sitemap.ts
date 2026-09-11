import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://repositsaas.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/brief", "/pricing", "/faq", "/legal/terms", "/legal/privacy", "/legal/refund"];
  return routes.map((route) => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
