import { Suspense } from "react";
import { redirect } from "next/navigation";
import { loadAskBootstrap } from "../_lib/loadAskBootstrap";
import AskPage from "../ask/AskPage";

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function ShopSlugPage({ params }: Props) {
  const { slug } = await params;
  const data = await loadAskBootstrap(slug);
  if (data.accountType !== "brand") redirect(`/${slug}/ask`);
  return (
    <Suspense>
      <AskPage {...data} initialView="shop" />
    </Suspense>
  );
}
