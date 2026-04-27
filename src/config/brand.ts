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
  logo: string;
  icon: string;
  favicon: string;
  appleTouchIcon: string;
  description: string;
  titleSuffix: string;
  ogLocale: string;
  twitterHandle: string;
  colors: BrandColors;
}

export interface ResolvedBrand extends BrandConfig {
  askLabel: string;
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
const baseBrand: BrandConfig = brands[brandKey] || brands.optimus;

// "Ask <brand>" label — avoids double "Ask" when the brand itself
// already starts with "Ask" (e.g. "AskMyBio" -> "Ask AskMyBio" is wrong,
// should just be "AskMyBio").
const askLabel = /^ask/i.test(baseBrand.name) ? baseBrand.name : `Ask ${baseBrand.name}`;

const brand: ResolvedBrand = { ...baseBrand, askLabel };

export default brand;
