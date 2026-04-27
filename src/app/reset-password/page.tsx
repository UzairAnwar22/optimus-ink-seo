import type { Metadata } from "next";
import { Suspense } from "react";
import brand from "@/config/brand";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata: Metadata = {
  title: `Reset Password | ${brand.name}`,
  description: `Set a new password for your ${brand.name} account.`,
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  // useSearchParams in the form requires a Suspense boundary during prerender.
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
