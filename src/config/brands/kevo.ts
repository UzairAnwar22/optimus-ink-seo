import type { BrandConfig } from "../brand";

const kevo: BrandConfig = {
  id: "kevo",
  name: "Kevo",
  shortName: "Kevo",
  tagline: "Powered by Kevo",
  bioDomain: "kevo.store",
  siteUrl: "https://kevo.store",
  spaUrl: "https://kevo.store/app",
  apiUrl: "https://api.kevo.store",
  logo: "/kevo-logo.png",
  icon: "/kevo-icon.png",
  favicon: "/kevo-fav.png",
  appleTouchIcon: "/kevo-fav.png",
  description: "Create your Kevo bio link page. Share your profile, products, and content in one place.",
  titleSuffix: "Bio Link",
  ogLocale: "en_US",
  twitterHandle: "@kevostore",
  colors: {
    primary: "#E84C4C",
    primaryHover: "#D43D3D",
    accent: "#E84C4C",
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

export default kevo;
