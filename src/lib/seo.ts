import { ProfileData, getSettings } from "./api";

/**
 * Extract ALL indexable text content from a profile for SEO.
 * This covers bio blocks, editor state blocks, social widgets, etc.
 */

interface SeoBlock {
  type: string;
  text: string;
  url?: string;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

/** Extract bio blocks (Bio Editor format) */
function extractBioBlocks(settings: Record<string, unknown>): SeoBlock[] {
  const blocks: SeoBlock[] = [];
  const bioBlocks = settings.bioBlocks as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(bioBlocks)) return blocks;

  for (const b of bioBlocks) {
    const bt = String(b.blockType || "");

    if (bt === "title" || bt === "text") {
      const text = stripHtml(String(b.text || b.title || ""));
      if (text) blocks.push({ type: bt, text });
    }

    if (bt === "link" || bt === "button") {
      const label = stripHtml(String(b.label || b.buttonText || b.title || b.text || ""));
      const url = String(b.url || b.link || "");
      if (label) blocks.push({ type: "link", text: label, url: url || undefined });
    }

    if (bt === "productCard") {
      const name = stripHtml(String(b.productName || b.title || ""));
      const price = b.productPrice ? `$${b.productPrice}` : "";
      if (name) blocks.push({ type: "product", text: `${name}${price ? ` — ${price}` : ""}` });
    }

    if (bt === "askAI") {
      blocks.push({ type: "feature", text: "AI-powered assistant available" });
    }

    // Social widgets
    if (bt.endsWith("Widget") && b.username) {
      const platform = bt.replace("Widget", "");
      blocks.push({ type: "social", text: `${platform}: @${b.username}`, url: String(b.profileUrl || "") });
    }

    // Map
    if (bt === "map" && b.address) {
      blocks.push({ type: "location", text: String(b.address) });
    }

    // Email
    if (bt === "email" && b.email) {
      blocks.push({ type: "contact", text: `Contact: ${b.email}` });
    }

    // Shoppable post
    if (bt === "shoppablePost") {
      const items = b.items as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(items)) {
        for (const item of items) {
          const label = stripHtml(String(item.label || item.title || ""));
          if (label) blocks.push({ type: "product", text: label });
        }
      }
    }

    // Best sellers
    if (bt === "bestSellers") {
      blocks.push({ type: "feature", text: "Best selling products" });
    }

    // Testimonials
    if (bt === "testimonials") {
      const items = b.items as Array<Record<string, unknown>> | undefined;
      if (Array.isArray(items)) {
        for (const item of items) {
          const text = stripHtml(String(item.text || item.quote || ""));
          const author = stripHtml(String(item.author || item.name || ""));
          if (text) blocks.push({ type: "testimonial", text: `"${text}" — ${author || "Customer"}` });
        }
      }
    }
  }

  return blocks;
}

/** Extract header settings (promo widgets, labels) */
function extractHeaderContent(settings: Record<string, unknown>): SeoBlock[] {
  const blocks: SeoBlock[] = [];
  try {
    const headerStr = settings.headerSettings as string;
    if (!headerStr) return blocks;
    const header = JSON.parse(headerStr);
    if (header.headerLabels && Array.isArray(header.headerLabels)) {
      for (const label of header.headerLabels) {
        const text = stripHtml(String(label.text || ""));
        if (text) blocks.push({ type: "label", text });
      }
    }
    if (header.headerPromos && Array.isArray(header.headerPromos)) {
      for (const promo of header.headerPromos) {
        const code = String(promo.code || "");
        const label = stripHtml(String(promo.label || ""));
        if (code || label) blocks.push({ type: "promo", text: `${label || "Promo"}: ${code}` });
      }
    }
  } catch { /* ignore parse errors */ }
  return blocks;
}

export interface SeoContent {
  name: string;
  bio: string;
  avatar: string;
  socialLinks: Array<{ platform: string; url: string }>;
  blocks: SeoBlock[];
  isVerified: boolean;
}

export function extractSeoContent(profile: ProfileData): SeoContent {
  const settings = getSettings(profile) as Record<string, unknown>;
  const name = String(settings.displayName || settings.pageName || profile.slug || "");
  const bio = stripHtml(String(settings.bio || ""));
  const avatar = String(settings.profileImage || "");
  const isVerified = !!(settings.isVerified || profile.isVerified);

  // Social links
  const socials = (settings.socials || {}) as Record<string, string>;
  const visibleSocials = String(settings.visibleSocials || "").split(",").filter(Boolean);
  const socialLinks = visibleSocials
    .filter((p) => socials[p])
    .map((p) => ({ platform: p, url: socials[p] }));

  // Collect all content blocks
  const blocks: SeoBlock[] = [
    ...extractHeaderContent(settings),
    ...extractBioBlocks(settings),
  ];

  return { name, bio, avatar, socialLinks, blocks, isVerified };
}
