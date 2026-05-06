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
  // Admin-controlled gate: profiles default to noindex; superadmin flips
  // enable_seo_index on the row when they want crawlers to pick it up.
  const allowIndexing = profile.enableSeoIndex === true;

  // ── Role-aware SEO copy ───────────────────────────────────────────────
  // Brand owners (Shopify storefront) and solo influencers get distinct
  // title + description templates so the public profile page reads with the
  // right voice for the audience the crawler is serving. accountType comes
  // from the backend (designer.service.getPublicProfile) — 'brand' for
  // brand-ambassador role, 'solo' for everyone else. Falls back to 'solo'
  // when the backend hasn't tagged the profile yet (older deploys / drafts).
  const isBrand = profile.accountType === "brand";

  // Titles per the role spec — short, keyword-loaded for the intended
  // audience. Both stay under Google's ~60-char display window.
  const title = isBrand
    ? `${seo.name} | AI-Powered Shopify Storefront & Smart Biolink`
    : `${seo.name} | Shoppable Hub & AI Digital Twin`;

  // Descriptions per the role spec. Aim for <=160 chars so search engines
  // don't truncate.
  const maxDescLen = 160;
  const truncate = (s: string, n: number) =>
    s.length > n ? `${s.slice(0, Math.max(0, n - 1)).trimEnd()}…` : s;

  const description = isBrand
    ? truncate(
        `Shop the latest collections from ${seo.name} on ${brand.name}. Experience one-tap Shopify checkouts, automated product bundles, and 24/7 AI-guided shopping.`,
        maxDescLen,
      )
    : truncate(
        `Explore ${seo.name}'s curated picks. Chat with my AI Digital Twin for personalized recommendations and shop my latest collaborations instantly.`,
        maxDescLen,
      );

  // Indexing off → emit the role-aware title + description but suppress
  // OG, Twitter cards, keywords, canonical, JSON-LD references, and the
  // article:modified_time hint so social scrapers (which often ignore
  // robots) and SEO crawlers can't latch onto profile-specific imagery
  // / share metadata for unindexed profiles. The title + description
  // copy is intentionally still profile-aware so the page reads correctly
  // when shared even though it's not indexed.
  if (!allowIndexing) {
    return {
      title,
      description,
      robots: {
        index: false,
        follow: false,
        nocache: true,
        googleBot: {
          index: false,
          follow: false,
          noimageindex: true,
          "max-snippet": 0,
          "max-image-preview": "none",
          "max-video-preview": 0,
        },
      },
    };
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
  // Belt-and-braces: when SEO indexing is off, skip the structured data so
  // crawlers that ignore the noindex header don't latch onto the schema.
  if (profile.enableSeoIndex !== true) return null;

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
  // Same reasoning as ProfileJsonLd above: omit the SR-only article when the
  // operator hasn't opted this profile into indexing.
  if (profile.enableSeoIndex !== true) return null;

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
