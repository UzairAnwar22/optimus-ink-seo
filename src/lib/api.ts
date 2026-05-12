import { cache } from "react";
import brand from "@/config/brand";

// Resolution priority: env var > brand config.
// Allows per-deployment override (e.g. staging) while giving each brand
// a sensible production default when no env is set.
export function getApiBaseUrl(): string {
  return process.env.API_BASE_URL || brand.apiUrl;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl;
}

export function getSpaUrl(): string {
  return process.env.NEXT_PUBLIC_SPA_URL || brand.spaUrl;
}

export interface ProfileData {
  profileId: number;
  slug: string;
  username: string;
  versionNumber: number;
  settingsJson: Record<string, unknown> | null;
  contentHtml: string | null;
  publishedAt: string | null;
  kbHandle: string | null;
  isVerified?: boolean;
  enableSeoIndex?: boolean;
  /** Backend tag — 'brand' = brand-ambassador with a Shopify store,
   *  'solo' = everyone else. Drives the SEO meta-tag template choice. */
  accountType?: "brand" | "solo";
  /** Connected Shopify domain when the owner is a brand. Used in the
   *  brand-mode meta description / OG copy. */
  shopDomain?: string | null;
}

export interface ProfileSettings {
  displayName?: string;
  displayNameHtml?: string;
  pageName?: string;
  bio?: string;
  profileImage?: string;
  backgroundColor?: string;
  socials?: Record<string, string>;
  visibleSocials?: string;
  slug?: string;
  isVerified?: boolean;
  [key: string]: unknown;
}

// React cache() dedupes calls within a single server render.
// generateMetadata, ProfileJsonLd, SeoArticle, and SlugPage all call this —
// without cache() they each trigger a separate lookup (still ISR-cached, but
// 4 promise instances). With cache() it's one shared promise per request.
export const fetchPublicProfile = cache(async (slug: string): Promise<ProfileData | null> => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/p/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.profile || null;
  } catch {
    return null;
  }
});

export interface ProfileStatusInfo {
  exists: boolean;
  status: string | null; // "draft" | "pending_review" | "published" | "rejected" | null
  isPublic: boolean;
  name: string | null;
  profileImage: string | null;
  backgroundColor: string | null;
}

// Lightweight status check: hits a separate endpoint that always returns
// 200 with `{ exists, status, ... }`. Called only when fetchPublicProfile
// returns null, so we can decide between Coming-Soon and 404.
export const fetchProfileStatus = cache(async (slug: string): Promise<ProfileStatusInfo | null> => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/p/${encodeURIComponent(slug)}/status`, {
      next: { revalidate: 30 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data as ProfileStatusInfo | undefined) || null;
  } catch {
    return null;
  }
});

export function getSettings(profile: ProfileData): ProfileSettings {
  return (profile.settingsJson || {}) as ProfileSettings;
}

export interface AskConfig {
  slug: string;
  displayName: string;
  profileImage: string;
  bio: string;
  backgroundColor: string;
  kbHandle: string | null;
  askAi: {
    aiName: string;
    questionPlaceholder: string;
    suggestedQuestions: string;
    textColor: string;
  } | null;
  contentBlocks: Array<{ type: string; text: string }>;
}

export const fetchAskConfig = cache(async (slug: string): Promise<AskConfig | null> => {
  try {
    const res = await fetch(`${getApiBaseUrl()}/api/p/${encodeURIComponent(slug)}/ask-config`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
});

// ─── Checkout link metadata (public, read-only) ──────────────────────────
export interface CheckoutLinkProductPreview {
  id: string;
  name: string;
  price: string;
  imageUrl?: string | null;
  handle?: string | null;
  quantity?: number;
}

export interface CheckoutLinkMeta {
  code: string;
  name: string;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  products: CheckoutLinkProductPreview[];
  designerProfileId: number | null;
  status: "active" | "draft" | "archived";
}

/**
 * Fetch public-safe metadata for a checkout link by code. Used by
 * generateMetadata() on /c/[code] so social crawlers see proper OG tags.
 * Cached for 60s server-side; safe to revalidate aggressively because the
 * meta rarely changes after a link is published.
 */
export const fetchCheckoutLinkMeta = cache(
  async (code: string): Promise<CheckoutLinkMeta | null> => {
    try {
      const res = await fetch(
        `${getApiBaseUrl()}/api/checkout-links/public/${encodeURIComponent(code)}`,
        { next: { revalidate: 60 } },
      );
      if (!res.ok) return null;
      const json = await res.json();
      return json?.data?.link || null;
    } catch {
      return null;
    }
  },
);

// ─── Storefront-by-slug (AskPage Shop tabs) ──────────────────────────────
// Slug-keyed wrappers around the backend's Shopify storefront helpers.
// The backend resolves slug → designer profile → user → shopify store on
// its side so the SEO never has to know the merchant's domain. Solo
// creators have no store: the backend returns 404 and we return null so
// the UI can keep the tabs hidden cleanly.

/**
 * Shape returned by `/api/storefront/:slug/best-sellers` and
 * `/api/storefront/:slug/new-arrivals`. This mirrors the admin GraphQL
 * `ShopifyProductListItem` shape from the express backend — the storefront
 * routes call the admin API with the merchant's stored access token
 * (same code path as the dashboard's Products page), so we get live
 * inventory + accurate pricing for the connected store.
 */
export interface StorefrontProduct {
  id: string;
  title: string;
  handle: string;
  status?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  featuredImage?: { url: string; altText: string | null } | null;
  priceRange?: {
    min?: { amount: string; currencyCode: string };
    max?: { amount: string; currencyCode: string };
  };
  totalInventory?: number | null;
  firstVariant?: { id: string; price?: string; availableForSale?: boolean } | null;
}

export interface StorefrontProductList {
  shop: string;
  products: StorefrontProduct[];
}

async function fetchStorefrontList(
  slug: string,
  kind: "best-sellers" | "new-arrivals",
  limit = 12,
): Promise<StorefrontProductList | null> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/storefront/${encodeURIComponent(slug)}/${kind}?limit=${limit}`,
      { next: { revalidate: 300 } }, // 5min ISR — storefronts don't change every page view
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json?.data;
    if (!data || !Array.isArray(data.products)) return null;
    return { shop: String(data.shop || ""), products: data.products };
  } catch {
    return null;
  }
}

export const fetchStorefrontBestSellers = cache(
  (slug: string, limit = 12): Promise<StorefrontProductList | null> =>
    fetchStorefrontList(slug, "best-sellers", limit),
);

export const fetchStorefrontNewArrivals = cache(
  (slug: string, limit = 12): Promise<StorefrontProductList | null> =>
    fetchStorefrontList(slug, "new-arrivals", limit),
);

/**
 * Detail shape returned by `/api/storefront/:slug/product/:id`. Matches
 * the admin GraphQL `ShopifyProductDetail` from the express backend —
 * richer than the list-item type (variants, images, descriptionHtml).
 */
export interface StorefrontProductDetail {
  id: string;
  title: string;
  handle: string;
  descriptionHtml?: string;
  status?: string;
  vendor?: string;
  productType?: string;
  tags?: string[];
  images?: Array<{ id: string; url: string; altText: string | null }>;
  variants?: Array<{
    id: string;
    title: string;
    price: string;
    compareAtPrice: string | null;
    sku: string | null;
    inventoryQuantity: number | null;
    selectedOptions: Array<{ name: string; value: string }>;
    image: { url: string; altText: string | null } | null;
  }>;
  priceRange?: {
    min?: { amount: string; currencyCode: string };
    max?: { amount: string; currencyCode: string };
  };
}

/**
 * Full product detail for the AskPage "click a card to open popup" flow.
 * Returns null when the slug has no connected store or the handle is
 * unknown. Called from the client (AskPage onClick) so cache() is a
 * no-op for the browser — the backend's own data-source is the
 * deduplication boundary.
 */
export async function fetchStorefrontProductDetail(
  slug: string,
  handle: string,
): Promise<StorefrontProductDetail | null> {
  try {
    const res = await fetch(
      `${getApiBaseUrl()}/api/storefront/${encodeURIComponent(slug)}/product/${encodeURIComponent(handle)}`,
    );
    if (!res.ok) return null;
    const json = await res.json();
    return (json?.data?.product as StorefrontProductDetail) || null;
  } catch {
    return null;
  }
}
