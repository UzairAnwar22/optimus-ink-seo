import { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchPublicProfile, fetchAskConfig, getSettings, getSiteUrl, getApiBaseUrl } from "@/lib/api";
import brand from "@/config/brand";
import AskPage from "./AskPage";

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

  return (
    <AskPage
      slug={slug}
      name={name}
      avatar={avatar}
      bio={bio}
      backgroundColor={backgroundColor}
      kbHandle={kbHandle}
      apiBaseUrl={apiBaseUrl}
      kbBaseUrl={kbBaseUrl}
      kbApiKey={kbApiKey}
      askAi={askConfig?.askAi || null}
    />
  );
}
