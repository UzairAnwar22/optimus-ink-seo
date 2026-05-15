/**
 * Shared bootstrap for the AskPage-style routes:
 *   /[slug]/ask           (chat surface)
 *   /[slug]/shop          (full storefront grid)
 *   /[slug]/best-sellers  (only Best Sellers)
 *   /[slug]/new-arrival   (only New Arrivals)
 *
 * All four pages need the same server-side data (profile + ask config +
 * brand storefront lists) — factoring the loader here keeps each
 * page.tsx tiny and avoids drift between the surfaces.
 */

import { notFound } from "next/navigation";
import {
  fetchPublicProfile,
  fetchAskConfig,
  getSettings,
  getApiBaseUrl,
  fetchStorefrontBestSellers,
  fetchStorefrontNewArrivals,
} from "@/lib/api";
import type { StorefrontProduct } from "@/lib/api";
import { fetchFeaturedQuestions } from "./featuredArticles";

export interface AskBootstrap {
  slug: string;
  profileId: number;
  name: string;
  avatar: string;
  bio: string;
  backgroundColor: string;
  kbHandle: string | null;
  apiBaseUrl: string;
  kbBaseUrl: string;
  kbApiKey: string;
  askAi: { aiName: string; questionPlaceholder: string; suggestedQuestions: string; textColor: string } | null;
  accountType: "brand" | "solo";
  storeBestSellers: StorefrontProduct[];
  storeNewArrivals: StorefrontProduct[];
  featuredQuestions: { handle: string; question: string }[];
}

export async function loadAskBootstrap(slug: string): Promise<AskBootstrap> {
  const [profile, askConfig] = await Promise.all([
    fetchPublicProfile(slug),
    fetchAskConfig(slug),
  ]);
  if (!profile) notFound();

  const settings = getSettings(profile);
  const name = String(settings.displayName || settings.pageName || slug);
  const avatar = String(settings.profileImage || "");
  const bio = String(settings.bio || "").replace(/<[^>]*>/g, "");
  const backgroundColor = String(settings.backgroundColor || "#FBFAF8");
  const kbHandle = profile.kbHandle || askConfig?.kbHandle || null;
  const apiBaseUrl = getApiBaseUrl();

  const kbBaseUrl = process.env.NEXT_PUBLIC_KB_URL || "https://api-v1.kevo.store";
  const kbApiKey = process.env.KB_API_KEY || "11";

  // Brand-mode (Shopify-connected) tabs are wired to the live storefront.
  // Solo creators have no store — fetches are skipped and the bootstrap
  // returns empty arrays so AskPage hides the tabs entirely.
  const isBrand = profile.accountType === "brand";
  const [bestSellersList, newArrivalsList, featuredQuestions] = await Promise.all([
    isBrand ? fetchStorefrontBestSellers(slug, 12) : Promise.resolve(null),
    isBrand ? fetchStorefrontNewArrivals(slug, 12) : Promise.resolve(null),
    fetchFeaturedQuestions(slug),
  ]);

  return {
    slug,
    profileId: profile.profileId,
    name,
    avatar,
    bio,
    backgroundColor,
    kbHandle,
    apiBaseUrl,
    kbBaseUrl,
    kbApiKey,
    askAi: askConfig?.askAi || null,
    accountType: isBrand ? "brand" : "solo",
    storeBestSellers: bestSellersList?.products || [],
    storeNewArrivals: newArrivalsList?.products || [],
    featuredQuestions: featuredQuestions.map((q) => ({ handle: q.handle, question: q.question })),
  };
}
