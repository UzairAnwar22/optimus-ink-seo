import type { Metadata } from "next";
import brand from "@/config/brand";
import SignUpForm from "../sign-up/SignUpForm";

export const metadata: Metadata = {
  title: `Get Started | ${brand.name}`,
  description: `Create your ${brand.name} brand account and start building your storefront.`,
  robots: { index: false, follow: false },
};

// Brand "Get Started" entry point — reuses the existing sign-up form but
// flags the redirect target so the SPA lands the user in the dedicated
// brand onboarding wizard (`/brand-onboarding`) instead of the standard
// creator wizard. The flag is consumed by SignUpForm's redirect logic.
export default function GetStartedPage() {
  return <SignUpForm postSignupNext="brand-onboarding" />;
}
