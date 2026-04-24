import type { Metadata } from "next";
import brand from "@/config/brand";
import SignInForm from "./SignInForm";

export const metadata: Metadata = {
  title: `Sign In | ${brand.name}`,
  description: `Sign in to your ${brand.name} account.`,
  robots: { index: false, follow: false },
};

export default function SignInPage() {
  return <SignInForm />;
}
