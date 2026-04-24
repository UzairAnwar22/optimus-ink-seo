import type { Metadata } from "next";
import brand from "@/config/brand";
import SignUpForm from "./SignUpForm";

export const metadata: Metadata = {
  title: `Sign Up | ${brand.name}`,
  description: `Create your ${brand.name} account.`,
  robots: { index: false, follow: false },
};

export default function SignUpPage() {
  return <SignUpForm />;
}
