import type { BrandConfig } from "../brand";

const mykiosk: BrandConfig = {
  id: "mykiosk",
  name: "My Kiosk",
  shortName: "My Kiosk",
  tagline: "Powered by My Kiosk",
  bioDomain: "mykiosk.ai",
  siteUrl: "https://mykiosk.ai",
  spaUrl: "https://mykiosk.ai/app",
  apiUrl: "https://api.mykiosk.ai",
  logo: "/mykiosk-logo.png",
  icon: "/mykiosk-logo.png",
  favicon: "/mykiosk-fav.png",
  appleTouchIcon: "/mykiosk-fav.png",
  description: "Create your My Kiosk bio link page. Share your profile, products, and content in one place.",
  titleSuffix: "Bio Link",
  ogLocale: "en_US",
  twitterHandle: "@mykiosk",
  colors: {
    primary: "#d32f2f",
    primaryHover: "#b71c1c",
    accent: "#d32f2f",
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

export default mykiosk;
