import { Metadata } from "next";
import { Suspense } from "react";
import { fetchPublicProfile, getSettings, getSiteUrl } from "@/lib/api";
import brand from "@/config/brand";
import AskPage from "./AskPage";
import { loadAskBootstrap } from "../_lib/loadAskBootstrap";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);
  if (!profile) return { title: "Not Found" };

  const settings = getSettings(profile);
  const name = String(settings.displayName || settings.pageName || slug);
  const siteUrl = getSiteUrl();

  return {
    title: `${name}'s AI | Ask Anything`,
    description: `Ask ${name}'s AI assistant about products, recommendations, and more.`,
    alternates: { canonical: `${siteUrl}/${slug}/ask` },
    openGraph: {
      title: `${name}'s AI`,
      description: `Ask ${name}'s AI assistant about products, recommendations, and more.`,
      url: `${siteUrl}/${slug}/ask`,
      siteName: brand.name,
    },
    twitter: {
      card: "summary_large_image",
      title: `${name}'s AI`,
      description: `Ask ${name}'s AI assistant about products, recommendations, and more.`,
    },
  };
}

export default async function AskSlugPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadAskBootstrap(slug);
  return (
    <Suspense>
      <AskPage {...data} initialView="chat" />
    </Suspense>
  );
}
