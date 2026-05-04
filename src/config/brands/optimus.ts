import type { BrandConfig } from "../brand";

const optimus: BrandConfig = {
  id: "optimus",
  name: "AskMyBio",
  shortName: "Optimus",
  tagline: "Powered by Optimus",
  bioDomain: "askmybio.ai",
  siteUrl: "https://askmybio.ai",
  spaUrl: "https://askmybio.ai/app",
  apiUrl: "https://api.askmybio.ai",
  logo: "/optimus-logo.svg",
  icon: "/optimus-icon.png",
  favicon: "/fav.png",
  appleTouchIcon: "/fav.png",
  description: "Create your AI-powered bio link page. Share your profile, products, and content in one place.",
  titleSuffix: "AI-Powered Bio Link",
  ogLocale: "en_US",
  twitterHandle: "@askmybio",
  colors: {
    primary: "#000000",
    primaryHover: "#1a1a1a",
    accent: "#3b82f6",
  },
  staticPages: [
    { path: "/ai-features",    priority: 0.8, changeFrequency: "monthly" },
    { path: "/templates",      priority: 0.8, changeFrequency: "weekly"  },
    { path: "/blog",           priority: 0.8, changeFrequency: "weekly"  },
    { path: "/contact-us",     priority: 0.8, changeFrequency: "yearly"  },
    { path: "/privacy-policy", priority: 0.8, changeFrequency: "yearly"  },
    // Curated Ask entries — hard-coded for now, will move to dynamic
    // generation once /:slug/ask/:topic route exists.
    { path: "/kept/ask",                                  priority: 1.0, changeFrequency: "weekly"  },
    { path: "/kept/ask/best-red-lipstick-for-olive-skin", priority: 1.0, changeFrequency: "monthly" },
  ],
  shopifyTemplateIds: ["wellness", "jewelry", "haircare", "beauty", "herbal", "foodshop"],
};

export default optimus;
