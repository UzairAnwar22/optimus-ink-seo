export interface BrandColors {
  primary: string;
  primaryHover: string;
  accent: string;
}

export interface BrandConfig {
  id: "optimus" | "mykiosk" | "kevo";
  name: string;
  shortName: string;
  tagline: string;
  bioDomain: string;
  siteUrl: string;
  spaUrl: string;
  apiUrl: string;
  favicon: string;
  appleTouchIcon: string;
  description: string;
  titleSuffix: string;
  ogLocale: string;
  twitterHandle: string;
  colors: BrandColors;
}

import optimus from "./brands/optimus";
import mykiosk from "./brands/mykiosk";
import kevo from "./brands/kevo";

const brands: Record<string, BrandConfig> = {
  optimus,
  mykiosk,
  kevo,
};

const brandKey = (process.env.NEXT_PUBLIC_BRAND || "optimus").toLowerCase();
const brand: BrandConfig = brands[brandKey] || brands.optimus;

export default brand;
