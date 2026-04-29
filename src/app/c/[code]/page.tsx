import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchCheckoutLinkMeta, getSiteUrl } from "@/lib/api";
import brand from "@/config/brand";
import RedirectClient from "./RedirectClient";

interface Props {
  params: Promise<{ code: string }>;
}

// ─── Dynamic SEO Metadata ────────────────────────────────────────────────
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const link = await fetchCheckoutLinkMeta(code);
  if (!link) {
    return { title: "Checkout link not found" };
  }

  const title = link.ogTitle?.trim() || link.name || "Checkout";
  const productCount = link.products?.length ?? 0;
  const description =
    link.ogDescription?.trim() ||
    `Shop ${productCount} item${productCount === 1 ? "" : "s"} — fast, secure checkout.`;
  const image =
    link.ogImage?.trim() ||
    link.products?.find((p) => p?.imageUrl)?.imageUrl ||
    undefined;

  const siteUrl = getSiteUrl();
  const canonicalUrl = `${siteUrl}/c/${encodeURIComponent(code)}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      type: "website",
      title,
      description,
      url: canonicalUrl,
      siteName: brand.name,
      locale: brand.ogLocale,
      ...(image
        ? { images: [{ url: image, width: 1200, height: 630, alt: title }] }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      site: brand.twitterHandle,
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
    // Don't index commerce checkout entry points — they're transient by nature.
    robots: { index: false, follow: false },
  };
}

// ─── Page (server component) ─────────────────────────────────────────────
// SSR fetches meta so generateMetadata + this page share the same React
// cache call. The visible UI is a small "Redirecting…" frame; the real
// work happens client-side in <RedirectClient />, which calls the resolve
// endpoint and replaces window.location with the live Shopify checkout.
export default async function CheckoutLinkRedirectPage({ params }: Props) {
  const { code } = await params;
  const link = await fetchCheckoutLinkMeta(code);
  if (!link) notFound();

  const heroImage =
    link.ogImage?.trim() ||
    link.products?.find((p) => p?.imageUrl)?.imageUrl ||
    null;
  const title = link.ogTitle?.trim() || link.name || "Checkout";
  const description =
    link.ogDescription?.trim() ||
    `Shop ${link.products?.length ?? 0} item${(link.products?.length ?? 0) === 1 ? "" : "s"} — fast, secure checkout.`;

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fbfaf8",
        padding: 24,
        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
        color: "#1c1917",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          width: "100%",
          background: "#fff",
          border: "1px solid #e7e5e4",
          borderRadius: 16,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        }}
      >
        {heroImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroImage}
            alt={title}
            style={{ width: "100%", height: 220, objectFit: "cover", display: "block" }}
          />
        ) : (
          <div
            style={{
              height: 220,
              background:
                "linear-gradient(135deg, #fbcfe8 0%, #f9a8d4 40%, #fde68a 100%)",
            }}
          />
        )}
        <div style={{ padding: 24, textAlign: "center" }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>{title}</h1>
          <p style={{ margin: "8px 0 20px", color: "#78716c", fontSize: 14 }}>
            {description}
          </p>
          <RedirectClient code={code} />
        </div>
      </div>
    </main>
  );
}
