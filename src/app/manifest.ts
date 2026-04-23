import { MetadataRoute } from "next";
import brand from "@/config/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: brand.name,
    short_name: brand.shortName,
    description: brand.description,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: brand.colors.primary,
    icons: [
      {
        src: brand.favicon,
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: brand.appleTouchIcon,
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
