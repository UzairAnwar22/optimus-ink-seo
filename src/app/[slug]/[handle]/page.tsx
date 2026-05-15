import { notFound } from "next/navigation";
import FeaturedArticlePage from "./FeaturedArticlePage";
import { loadAskBootstrap } from "../_lib/loadAskBootstrap";
import { fetchFeaturedArticle } from "../_lib/featuredArticles";

interface Props {
  params: Promise<{ slug: string; handle: string }>;
}

export default async function FeaturedHandlePage({ params }: Props) {
  const { slug, handle } = await params;

  // Bootstrap gives us brand name/avatar and the full featuredQuestions
  // list (used for the sidebar's "Ask {brand} a Question" widget so it
  // stays in sync with whatever the chip list shows on AskPage).
  const [bootstrap, article] = await Promise.all([
    loadAskBootstrap(slug).catch(() => null),
    fetchFeaturedArticle(slug, handle),
  ]);
  if (!article) notFound();

  const brandName = bootstrap?.name || slug;
  const brandAvatar = bootstrap?.avatar || "";
  // Filter out the article the user is currently reading.
  const relatedQuestions =
    bootstrap?.featuredQuestions.filter((q) => q.handle !== handle) ?? [];

  return (
    <FeaturedArticlePage
      slug={slug}
      handle={handle}
      brandName={brandName}
      brandAvatar={brandAvatar}
      article={article}
      relatedQuestions={relatedQuestions}
    />
  );
}
