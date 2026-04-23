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

export function getSettings(profile: ProfileData): ProfileSettings {
  return (profile.settingsJson || {}) as ProfileSettings;
}
