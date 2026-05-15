import { notFound } from "next/navigation";
import FeaturedArticlePage from "./FeaturedArticlePage";
import { loadAskBootstrap } from "../../_lib/loadAskBootstrap";
import { fetchFeaturedArticle } from "../../_lib/featuredArticles";

interface Props {
  params: Promise<{ slug: string; handle: string }>;
}

export default async function FeaturedHandlePage({ params }: Props) {
  const { slug, handle } = await params;

  const [bootstrap, article] = await Promise.all([
    loadAskBootstrap(slug).catch(() => null),
    fetchFeaturedArticle(slug, handle),
  ]);
  if (!article) notFound();

  const brandName = bootstrap?.name || slug;
  const brandAvatar = bootstrap?.avatar || "";

  return (
    <FeaturedArticlePage
      slug={slug}
      handle={handle}
      brandName={brandName}
      brandAvatar={brandAvatar}
      article={article}
    />
  );
}
