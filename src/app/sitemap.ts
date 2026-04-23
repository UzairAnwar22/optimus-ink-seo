import { MetadataRoute } from "next";
import { getApiBaseUrl, getSiteUrl } from "@/lib/api";

/**
 * Dynamic sitemap — fetches all published profile slugs from backend.
 * Google Search Console mein submit karo: {SITE_URL}/sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const apiBase = getApiBaseUrl();

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // Fetch published profiles from backend
  try {
    const res = await fetch(`${apiBase}/api/health/sitemap-slugs`, {
      next: { revalidate: 3600 }, // Refresh sitemap hourly
    });
    if (res.ok) {
      const json = await res.json();
      const slugs: Array<{ slug: string; updatedAt?: string }> = json?.data || [];
      for (const item of slugs) {
        if (item.slug) {
          entries.push({
            url: `${siteUrl}/${item.slug}`,
            lastModified: item.updatedAt ? new Date(item.updatedAt) : new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
          });
        }
      }
    }
  } catch {
    // Sitemap still works with just the home page if API fails
  }

  return entries;
}
