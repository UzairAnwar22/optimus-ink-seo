"use client";

import { useEffect, useState } from "react";
import brand from "@/config/brand";
import {
  getProviderAuthUrl,
  getOAuthCallbackUrl,
  openOAuthPopup,
  getAppBaseUrl,
  OAUTH_MESSAGE_TYPE,
} from "@/lib/auth";

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.673 32.659 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.022 6.053 29.258 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.02 12 24 12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.022 6.053 29.258 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
    <path fill="#4CAF50" d="M24 44c5.155 0 9.836-1.977 13.37-5.197l-6.184-5.233C29.153 35.091 26.715 36 24 36c-5.202 0-9.641-3.316-11.283-7.946l-6.52 5.023C9.505 39.556 16.227 44 24 44Z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a11.98 11.98 0 0 1-4.117 5.57l.003-.002 6.184 5.233C36.965 39.17 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
  </svg>
);

export default function SignUpForm() {
  const [error, setError] = useState("");
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  // Persist Shopify-template hand-off params so they survive OAuth round-trip
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tpl = params.get("shopifyTemplate");
    const shop = params.get("shop");
    const leadId = params.get("leadId");
    try {
      if (tpl) localStorage.setItem("preSelectedShopifyTemplate", tpl);
      if (shop) localStorage.setItem("connectedShopDomain", shop);
      if (leadId) localStorage.setItem("shopifyTemplateLeadId", leadId);
    } catch {}
  }, []);

  const handleGoogle = async () => {
    setIsOAuthLoading(true);
    setError("");
    const callbackUrl = `${getOAuthCallbackUrl()}?provider=google`;
    const result = await getProviderAuthUrl("google", callbackUrl);
    if (!result.ok) {
      setError(result.error || "Could not start sign-up");
      setIsOAuthLoading(false);
      return;
    }
    const popup = openOAuthPopup(result.url, "google");
    if (!popup) {
      window.location.href = result.url;
      return;
    }
    const appOrigin = new URL(getAppBaseUrl()).origin;
    const allowedOrigins = [window.location.origin, appOrigin];
    const closeCheck = window.setInterval(() => {
      if (popup.closed) {
        cleanup();
        setIsOAuthLoading(false);
      }
    }, 300);
    const timeout = window.setTimeout(() => cleanup(), 5 * 60 * 1000);
    function cleanup() {
      window.removeEventListener("message", onMessage);
      window.clearInterval(closeCheck);
      window.clearTimeout(timeout);
    }
    async function onMessage(event: MessageEvent) {
      if (!allowedOrigins.includes(event.origin)) return;
      const data = event.data as { type?: string; success?: boolean; errorMessage?: string };
      if (data?.type !== OAUTH_MESSAGE_TYPE) return;
      cleanup();
      if (!data.success) {
        setError(data.errorMessage || "Sign-up failed. Please try again.");
        setIsOAuthLoading(false);
        return;
      }
      // Popup already verified the code and persisted tokens on the app origin.
      const query = window.location.search || "";
      window.location.href = `${getAppBaseUrl()}/app/onboarding${query}`;
    }
    window.addEventListener("message", onMessage);
  };

  return (
    <>
      <style>{`
        .su-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 28px 16px; background: #f5f5f5; }
        .su-card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 40px 36px 32px; }
        .su-brand { text-align: center; margin-bottom: 20px; font-weight: 700; font-size: 22px; color: ${brand.colors.primary}; }
        .su-title { margin: 0; text-align: center; font-size: 22px; font-weight: 700; color: #111827; }
        .su-subtitle { margin: 8px 0 24px; text-align: center; font-size: 14px; color: #6b7280; }
        .su-google { height: 48px; width: 100%; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 600; color: #111827; transition: background 0.15s ease, border-color 0.15s ease; }
        .su-google:hover { background: #f9fafb; border-color: #d1d5db; }
        .su-google:disabled { opacity: 0.65; cursor: not-allowed; }
        .su-signin { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
        .su-signin a { color: #ef4444; font-weight: 600; text-decoration: none; }
        .su-signin a:hover { text-decoration: underline; }
        .su-error { display: flex; gap: 10px; align-items: center; background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.18); color: #b91c1c; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 14px; }
        @media (max-width: 420px) { .su-card { padding: 28px 20px 24px; } }
      `}</style>
      <div className="su-wrap">
        <div className="su-card">
          <div className="su-brand">{brand.name}</div>
          <h2 className="su-title">Welcome</h2>
          <div className="su-subtitle">Sign up to manage your page and update your content</div>

          {error && (
            <div className="su-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <button className="su-google" type="button" disabled={isOAuthLoading} onClick={handleGoogle}>
            <GoogleG />
            {isOAuthLoading ? "Opening sign-up..." : "Sign up with Google"}
          </button>

          <div className="su-signin">
            Already have an account? <a href="/sign-in">Sign In</a>
          </div>
        </div>
      </div>
    </>
  );
}
