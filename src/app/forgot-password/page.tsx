import type { Metadata } from "next";
import brand from "@/config/brand";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata: Metadata = {
  title: `Forgot Password | ${brand.name}`,
  description: `Reset your ${brand.name} account password.`,
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
