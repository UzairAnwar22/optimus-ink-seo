/**
 * Server-side fetchers for the featured Q&A surface.
 *
 *   fetchFeaturedQuestions(slug)             → chips list for AskPage
 *   fetchFeaturedArticle(slug, handle)       → full article body for
 *                                              /[slug]/featured/[handle]
 *
 * Both call the public Express endpoints under /api/featured/* (no auth).
 * Rows are seeded into the shared DB; the KB ingestion pipeline will
 * populate them per-brand once that integration ships.
 */

import { getApiBaseUrl } from "@/lib/api";

export interface FeaturedTag {
  label: string;
  color: string;
}

export interface FeaturedProduct {
  image: string;
  title: string;
  price: string;
  type: string;
  url: string;
}

export interface FeaturedGuideItem {
  heading: string;
  body: string;
}

export interface FeaturedExploreLink {
  label: string;
  url: string;
}

export type FeaturedGuideStyle = "accordion" | "paragraph";

export interface FeaturedQuestionItem {
  handle: string;
  question: string;
  displayOrder: number;
}

export interface FeaturedArticle {
  slug: string;
  handle: string;
  question: string;
  intro: string;
  tags: FeaturedTag[];
  tableTitle: string;
  products: FeaturedProduct[];
  rating: number;
  whyEssentials: string[];
  guideStyle: FeaturedGuideStyle;
  shoppingGuide: FeaturedGuideItem[];
  sidebarChips: string[];
  exploreLinks: FeaturedExploreLink[];
}

/** Featured chips rendered on the AskPage hero. Empty list if the brand
 *  has no curated featured Q&As yet. Never throws. */
export async function fetchFeaturedQuestions(slug: string): Promise<FeaturedQuestionItem[]> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/featured/${encodeURIComponent(slug)}/questions`,
      { next: { revalidate: 300 } }, // 5min ISR — admin-curated, doesn't change per request
    );
    if (!res.ok) return [];
    const json = await res.json();
    const items = json?.data?.items;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

/** Full article body for the /featured/[handle] page. Returns null if the
 *  row is missing so the caller can render notFound(). Never throws. */
export async function fetchFeaturedArticle(
  slug: string,
  handle: string,
): Promise<FeaturedArticle | null> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/featured/${encodeURIComponent(slug)}/${encodeURIComponent(handle)}`,
      { next: { revalidate: 300 } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const article = json?.data?.article;
    if (!article) return null;
    return article as FeaturedArticle;
  } catch {
    return null;
  }
}
