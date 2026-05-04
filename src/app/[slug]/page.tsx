import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicProfile, fetchProfileStatus, getSiteUrl } from "@/lib/api";
import { extractSeoContent } from "@/lib/seo";
import brand from "@/config/brand";
import ProfilePage from "./ProfilePage";

interface Props {
  params: Promise<{ slug: string }>;
}

// ─── Dynamic SEO Metadata ────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);
  if (!profile) {
    // Profile may exist in draft (e.g. just-claimed merchant) — surface a
    // light-touch "Coming soon" title instead of a hard 404, but keep
    // unpublished pages out of search results.
    const status = await fetchProfileStatus(slug);
    if (status?.exists) {
      const comingSoonName = status.name || slug;
      return {
        title: `${comingSoonName} — Coming soon | ${brand.titleSuffix}`,
        description: `${comingSoonName}'s ${brand.titleSuffix.toLowerCase()} on ${brand.name} is being set up. Check back soon to discover their links, products, and content.`,
        robots: { index: false, follow: false },
      };
    }
    return { title: "Profile Not Found", robots: { index: false, follow: false } };
  }

  const seo = extractSeoContent(profile);
  const siteUrl = getSiteUrl();
  const profileUrl = `${siteUrl}/${slug}`;
  const ogImageUrl = `${siteUrl}/${slug}/opengraph-image`;

  // SEO-friendly title: prefer the user's own bio tagline (profile-specific,
  // ranks for their actual role), and only fall back to the generic suffix
  // when no bio exists. Format: {Name} – {bio tagline} | {Brand}
  const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const extractTagline = (bio: string, name: string, maxLen: number): string => {
    const escaped = escapeRegex(name);
    let t = bio
      // Strip self-introductions: "Hi, I'm Name, a/an", "I am Name,", "This is Name"
      .replace(new RegExp(`^(?:Hi[,!.]?\\s+)?(?:I['']?m|I am|This is)\\s+${escaped}[,\\s]+(?:a |an |the )?`, "i"), "")
      // Strip "Name is a/an", "Name —/–/-"
      .replace(new RegExp(`^${escaped}\\s+(?:is|—|–|-)\\s+(?:a |an |the )?`, "i"), "")
      // Strip leading "Name, " / "Name "
      .replace(new RegExp(`^${escaped}[,\\s]+`, "i"), "")
      // Strip remaining bare self-introductions: "Hi, I'm a/an", "I am a/an"
      .replace(/^(?:Hi[,!.]?\s+)?(?:I['']?m|I am)\s+(?:a |an |the )?/i, "")
      .trim();
    if (!t) return "";
    // Prefer cutting at the first sentence end if it falls inside the budget.
    const sentEnd = t.search(/[.!?](?:\s|$)/);
    if (sentEnd > 8 && sentEnd <= maxLen) {
      t = t.slice(0, sentEnd);
    } else if (t.length > maxLen) {
      const cut = t.slice(0, maxLen);
      const lastSpace = cut.lastIndexOf(" ");
      t = (lastSpace > maxLen * 0.5 ? cut.slice(0, lastSpace) : cut).trimEnd() + "…";
    }
    return t;
  };
  // Budget the bio tagline against a ~60-char total title (Google's display
  // window). Reserve room for the name, separators, and brand.
  const TITLE_BUDGET = 60;
  const taglineMax = Math.max(
    18,
    TITLE_BUDGET - seo.name.length - brand.name.length - " – ".length - " | ".length,
  );
  const tagline = seo.bio ? extractTagline(seo.bio, seo.name, taglineMax) : "";
  const title = tagline
    ? `${seo.name} – ${tagline} | ${brand.name}`
    : `${seo.name} – ${brand.titleSuffix} | ${brand.name}`;

  // Rich description from bio + content blocks. Aim for <=160 chars so search
  // engines don't truncate, and always end with brand context for recall.
  const contentSnippets = seo.blocks
    .filter((b) => b.type === "text" || b.type === "link" || b.type === "product")
    .map((b) => b.text)
    .slice(0, 5)
    .join(" · ");
  const brandTail = ` — ${brand.name}`;
  const maxDescLen = 160;
  const truncate = (s: string, n: number) =>
    s.length > n ? `${s.slice(0, Math.max(0, n - 1)).trimEnd()}…` : s;

  let description: string;
  if (seo.bio) {
    const room = maxDescLen - brandTail.length;
    const bioPart = truncate(seo.bio, Math.min(140, room));
    if (contentSnippets && bioPart.length + 3 < room) {
      const remaining = room - bioPart.length - 3;
      description = `${bioPart} — ${truncate(contentSnippets, remaining)}${brandTail}`;
    } else {
      description = `${bioPart}${brandTail}`;
    }
  } else if (contentSnippets) {
    const lead = `${seo.name}'s ${brand.titleSuffix.toLowerCase()}: `;
    const room = maxDescLen - brandTail.length - lead.length;
    description = `${lead}${truncate(contentSnippets, room)}${brandTail}`;
  } else {
    description = truncate(
      `Discover ${seo.name}'s ${brand.titleSuffix.toLowerCase()} on ${brand.name} — all their links, products, social profiles, and content in one place.`,
      maxDescLen,
    );
  }

  // Keyword hints — Google ignores these but Bing and other crawlers still
  // weight them lightly, and they add zero render cost.
  const keywords = [
    seo.name,
    brand.name,
    brand.titleSuffix,
    "bio link",
    "link in bio",
    ...seo.socialLinks.map((s) => s.platform),
    ...seo.blocks
      .filter((b) => b.type === "product")
      .map((b) => b.text)
      .slice(0, 3),
  ].filter(Boolean);

  const modifiedTime = profile.publishedAt || undefined;

  return {
    title,
    description,
    keywords,
    alternates: { canonical: profileUrl },
    openGraph: {
      type: "profile",
      title,
      description,
      url: profileUrl,
      siteName: brand.name,
      locale: brand.ogLocale,
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: seo.name }],
    },
    twitter: {
      card: "summary_large_image",
      site: brand.twitterHandle,
      creator: brand.twitterHandle,
      title,
      description,
      images: [ogImageUrl],
    },
    robots: { index: true, follow: true },
    ...(modifiedTime
      ? { other: { "article:modified_time": modifiedTime, "profile:username": slug } }
      : { other: { "profile:username": slug } }),
  };
}

// ─── JSON-LD Structured Data ─────────────────────────────────────────────
async function ProfileJsonLd({ slug }: { slug: string }) {
  const profile = await fetchPublicProfile(slug);
  if (!profile) return null;

  const seo = extractSeoContent(profile);
  const siteUrl = getSiteUrl();
  const profileUrl = `${siteUrl}/${slug}`;

  const person: Record<string, unknown> = {
    "@type": "Person",
    name: seo.name,
    url: profileUrl,
    ...(seo.bio ? { description: seo.bio } : {}),
    ...(seo.avatar ? { image: seo.avatar } : {}),
    ...(seo.socialLinks.length > 0 ? { sameAs: seo.socialLinks.map((s) => s.url) } : {}),
  };

  const products = seo.blocks.filter((b) => b.type === "product");
  if (products.length > 0) {
    person.makesOffer = products.map((p) => ({
      "@type": "Offer",
      name: p.text,
      url: p.url || profileUrl,
    }));
  }

  // ProfilePage wraps Person — Google's 2024 recommended shape for profile pages.
  // https://developers.google.com/search/docs/appearance/structured-data/profile-page
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: profileUrl,
    ...(profile.publishedAt ? { dateCreated: profile.publishedAt, dateModified: profile.publishedAt } : {}),
    mainEntity: person,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

// ─── Hidden SEO article (Google reads this, users see iframe) ────────────
async function SeoArticle({ slug }: { slug: string }) {
  const profile = await fetchPublicProfile(slug);
  if (!profile) return null;

  const seo = extractSeoContent(profile);

  return (
    <article
      className="sr-only"
      aria-hidden="false"
      itemScope
      itemType="https://schema.org/Person"
    >
      <h1 itemProp="name">{seo.name}</h1>
      {seo.isVerified && <span>Verified Profile</span>}
      {seo.bio && <p itemProp="description">{seo.bio}</p>}
      {seo.avatar && <img itemProp="image" src={seo.avatar} alt={seo.name} />}

      {seo.socialLinks.length > 0 && (
        <nav aria-label="Social links">
          <h2>Social Links</h2>
          <ul>
            {seo.socialLinks.map((s) => (
              <li key={s.platform}>
                <a itemProp="sameAs" href={s.url}>{s.platform}</a>
              </li>
            ))}
          </ul>
        </nav>
      )}

      {seo.blocks.length > 0 && (
        <section aria-label="Profile content">
          {seo.blocks.map((block, i) => {
            switch (block.type) {
              case "title":
                return <h2 key={i}>{block.text}</h2>;
              case "text":
                return <p key={i}>{block.text}</p>;
              case "link":
                return <a key={i} href={block.url || "#"} rel="noopener">{block.text}</a>;
              case "product":
                return (
                  <div key={i} itemScope itemType="https://schema.org/Product">
                    <span itemProp="name">{block.text}</span>
                    {block.url && <a itemProp="url" href={block.url}>{block.text}</a>}
                  </div>
                );
              case "social":
                return <p key={i}>{block.text}</p>;
              case "location":
                return (
                  <address key={i} itemProp="address" itemScope itemType="https://schema.org/PostalAddress">
                    <span itemProp="streetAddress">{block.text}</span>
                  </address>
                );
              case "contact":
                return <p key={i}>{block.text}</p>;
              case "testimonial":
                return (
                  <blockquote key={i} itemScope itemType="https://schema.org/Review">
                    <p itemProp="reviewBody">{block.text}</p>
                  </blockquote>
                );
              default:
                return block.text ? <p key={i}>{block.text}</p> : null;
            }
          })}
        </section>
      )}
    </article>
  );
}

// ─── Page Component ──────────────────────────────────────────────────────
export default async function SlugPage({ params }: Props) {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);

  if (!profile) {
    // Public profile lookup failed — check whether a profile exists at all
    // for this slug. If it does (e.g. seeded via the claim flow but not yet
    // published), hand off to the SPA iframe which renders the actual
    // page content under a glassy "Coming soon" overlay. Only true unknowns
    // fall through to the regular 404. Skip the SEO article + JSON-LD on
    // unpublished pages so search engines don't index draft content.
    const status = await fetchProfileStatus(slug);
    if (status?.exists) {
      return <ProfilePage slug={slug} />;
    }
    notFound();
  }

  return (
    <>
      <ProfileJsonLd slug={slug} />
      <SeoArticle slug={slug} />
      <ProfilePage slug={profile.slug} />
    </>
  );
}
