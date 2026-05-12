import { Metadata } from "next";
import { redirect } from "next/navigation";
import { fetchPublicProfile, getSettings, getSiteUrl } from "@/lib/api";
import brand from "@/config/brand";
import AskPage from "../ask/AskPage";
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
    title: `${name}'s Best Sellers`,
    description: `${name}'s top-selling products on ${brand.name}.`,
    alternates: { canonical: `${siteUrl}/${slug}/best-sellers` },
    openGraph: {
      title: `${name}'s Best Sellers`,
      description: `${name}'s top-selling products on ${brand.name}.`,
      url: `${siteUrl}/${slug}/best-sellers`,
      siteName: brand.name,
    },
  };
}

export default async function BestSellersSlugPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadAskBootstrap(slug);
  if (data.accountType !== "brand") redirect(`/${slug}/ask`);
  return <AskPage {...data} initialView="bestsellers" />;
}
