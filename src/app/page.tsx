import { redirect } from "next/navigation";

// Home page redirects to main site — this Next.js app is only for /:slug profile pages
export default function Home() {
  redirect(process.env.NEXT_PUBLIC_SITE_URL || "https://askmybio.ai");
}
