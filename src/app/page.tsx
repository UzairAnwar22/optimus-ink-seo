import { permanentRedirect } from "next/navigation";
import brand from "@/config/brand";

// Home page permanently redirects (308) to main site — this Next.js app is only
// for /:slug profile pages. Permanent redirect transfers SEO link equity.
export default function Home() {
  permanentRedirect(process.env.NEXT_PUBLIC_SITE_URL || brand.siteUrl);
}
