import { MetadataRoute } from "next";
import { getApiBaseUrl, getSiteUrl } from "@/lib/api";
import brand from "@/config/brand";

/**
 * Dynamic sitemap. URL list is built from three sources:
 *
 *   1. Marketing + curated pages → `brand.staticPages`     (per-brand config)
 *   2. Shopify template landings → `brand.shopifyTemplateIds` (per-brand config)
 *   3. Published profiles        → `/api/health/sitemap-slugs` (DB-backed)
 *
 * Ask pages (/:slug/ask, /:slug/ask/:topic) are intentionally NOT generated
 * dynamically right now — curated ones live in `staticPages`. We'll switch
 * back to DB-driven generation once the topic route is implemented.
 *
 * Submit in Google Search Console as `{SITE_URL}/sitemap.xml`.
 */

interface SitemapSlugRow {
  slug: string;
  updatedAt?: string;
}

// Always render fresh — admin toggles (enable_seo_index, is_public) must show up
// in the sitemap immediately, not after a 1-hour ISR window.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const apiBase = getApiBaseUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
  ];

  // ─── 1. Static marketing pages ────────────────────────────────────────
  for (const page of brand.staticPages || []) {
    if (!page.path) continue;
    entries.push({
      url: `${siteUrl}${page.path.startsWith("/") ? page.path : `/${page.path}`}`,
      lastModified: now,
      changeFrequency: page.changeFrequency ?? "weekly",
      priority: page.priority ?? 0.8,
    });
  }

  // ─── 2. Shopify template landings (served by the SPA at /app) ────────
  for (const templateId of brand.shopifyTemplateIds || []) {
    if (!templateId) continue;
    entries.push({
      url: `${siteUrl}/app/template/shopify/${templateId}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.64,
    });
  }

  // ─── 3. Published profiles + their Ask pages + Ask topics ────────────
  try {
    const res = await fetch(`${apiBase}/api/health/sitemap-slugs`, {
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const rows: SitemapSlugRow[] = json?.data || [];

      for (const row of rows) {
        if (!row.slug) continue;
        const lastModified = row.updatedAt ? new Date(row.updatedAt) : now;

        entries.push({
          url: `${siteUrl}/${row.slug}`,
          lastModified,
          changeFrequency: "weekly",
          priority: 0.8,
        });
      }
    }
  } catch {
    // Keep static entries even if the API is down — the sitemap still validates.
  }

  return entries;
}
