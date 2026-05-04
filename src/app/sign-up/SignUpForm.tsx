"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import brand from "@/config/brand";
import {
  getProviderAuthUrl,
  getOAuthCallbackUrl,
  openOAuthPopup,
  getAppBaseUrl,
  OAUTH_MESSAGE_TYPE,
  registerApi,
  loginHandoffApi,
  buildAppResolveUrl,
} from "@/lib/auth";

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.673 32.659 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.022 6.053 29.258 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.02 12 24 12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.022 6.053 29.258 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
    <path fill="#4CAF50" d="M24 44c5.155 0 9.836-1.977 13.37-5.197l-6.184-5.233C29.153 35.091 26.715 36 24 36c-5.202 0-9.641-3.316-11.283-7.946l-6.52 5.023C9.505 39.556 16.227 44 24 44Z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a11.98 11.98 0 0 1-4.117 5.57l.003-.002 6.184 5.233C36.965 39.17 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
  </svg>
);

// Whitelisted post-signup destinations on the SPA side. Anything not in this
// set falls back to the default `/onboarding` route so a stray query param
// can't redirect users to an arbitrary path.
const NEXT_ROUTES: Record<string, string> = {
  "brand-onboarding": "/app/brand-onboarding",
};

// SPA-side path for AuthResolve's `next` param (it requires a leading slash —
// see optimus.Ink/src/components/Auth/AuthResolve.jsx sanitizeNext).
const NEXT_RESOLVE_PATHS: Record<string, string> = {
  "brand-onboarding": "/brand-onboarding",
};

interface SignUpFormProps {
  // Optional override for the post-signup landing route. Used by the
  // /get-started entry point to send brand users into the brand wizard.
  postSignupNext?: keyof typeof NEXT_ROUTES;
}

export default function SignUpForm({ postSignupNext }: SignUpFormProps = {}) {
  const [error, setError] = useState("");
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  // Email + password sign-up. Backend expects a `profileSlug` too; we derive
  // one from the email's local part with a short random suffix to avoid
  // collisions on common usernames (the user can rename their bio URL later
  // inside the app). After register we hit the handoff/login endpoint with
  // the same credentials so the SPA origin can persist real auth — same
  // cross-origin pattern SignInForm uses.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setIsSubmitting(true);

    // Stash the user-typed name in localStorage on the SPA origin path so
    // BrandOnboardingWizard can pick it up — the backend register endpoint
    // doesn't accept a `name` field on its return shape so this is the
    // only way to carry the canonical display name through the handoff
    // without changing the DB schema.
    try { localStorage.setItem("brandOnbDisplayName", trimmedName); } catch {}

    // Don't invent a slug client-side — the backend now derives a clean
    // slug from `name` (or email) and disambiguates collisions with `-2`,
    // `-3` etc. via getNextUniqueSlugGlobal. So `john smith` → `john-smith`
    // (or `john-smith-2` if taken), never `john-smith-s85p`.
    const reg = await registerApi({ email, password, name: trimmedName });
    if (!reg.ok) {
      setError(reg.error || "Sign-up failed. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const handoff = await loginHandoffApi({ email, password });
    if (!handoff.ok) {
      setError(handoff.error || "Account created — please sign in to continue.");
      setIsSubmitting(false);
      return;
    }

    const nextPath = postSignupNext ? NEXT_RESOLVE_PATHS[postSignupNext] : undefined;
    window.location.href = buildAppResolveUrl(handoff.handoffToken, nextPath);
  };

  const handleGoogle = async () => {
    setIsOAuthLoading(true);
    setError("");
    // Forward the post-signup intent through the OAuth callback URL so the SPA
    // can route to the right destination if the popup is blocked and we fall
    // back to a full-page redirect (the opener-message path uses postSignupNext
    // directly and ignores this param).
    const nextSuffix = postSignupNext ? `&next=${encodeURIComponent(postSignupNext)}` : "";
    const callbackUrl = `${getOAuthCallbackUrl()}?provider=google${nextSuffix}`;
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
      // Brand "Get Started" flow opts into the dedicated wizard via the
      // postSignupNext prop; everything else falls through to standard
      // onboarding. URL-based override is intentionally not supported here —
      // the prop comes from the trusted page wrapper.
      const query = window.location.search || "";
      const target = (postSignupNext && NEXT_ROUTES[postSignupNext]) || "/app/onboarding";
      window.location.href = `${getAppBaseUrl()}${target}${query}`;
    }
    window.addEventListener("message", onMessage);
  };

  return (
    <>
      <style>{`
        /* Solid white page + flat card so the layout reads as a regular
           page rather than a modal with backdrop dim. */
        html, body { background: #ffffff; }
        .su-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 28px 16px; background: #ffffff; }
        .su-card { width: 100%; max-width: 420px; background: #ffffff; border-radius: 16px; padding: 40px 36px 32px; }
        .su-brand { display: flex; justify-content: center; align-items: center; margin-bottom: 20px; }
        .su-brand img { height: 36px; width: auto; max-width: 200px; object-fit: contain; }
        .su-brand-text { font-weight: 700; font-size: 22px; color: ${brand.colors.primary}; }
        .su-title { margin: 0; text-align: center; font-size: 22px; font-weight: 700; color: #111827; }
        .su-subtitle { margin: 8px 0 24px; text-align: center; font-size: 14px; color: #6b7280; }
        .su-form { display: flex; flex-direction: column; gap: 12px; }
        .su-input { width: 100%; height: 48px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; padding: 0 16px; font-size: 14px; outline: none; color: #111827; box-sizing: border-box; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .su-input::placeholder { color: #9ca3af; }
        .su-input:focus { border-color: #111827; box-shadow: 0 0 0 3px rgba(17,24,39,0.06); }
        .su-primary { height: 48px; border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #fff; background: #111827; transition: background 0.15s ease; margin-top: 2px; }
        .su-primary:hover { background: #1f2937; }
        .su-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .su-divider { display: flex; align-items: center; gap: 12px; margin: 18px 0; color: #9ca3af; font-size: 12px; font-weight: 500; }
        .su-divider::before, .su-divider::after { content: ""; flex: 1; height: 1px; background: #e5e7eb; }
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
          <div className="su-brand">
            {brand.logo ? (
              <img src={brand.logo} alt={brand.name} />
            ) : (
              <span className="su-brand-text">{brand.name}</span>
            )}
          </div>
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

          <form className="su-form" onSubmit={handleSubmit}>
            <input
              className="su-input"
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              disabled={isSubmitting || isOAuthLoading}
              required
            />
            <input
              className="su-input"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={isSubmitting || isOAuthLoading}
              required
            />
            <input
              className="su-input"
              type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              disabled={isSubmitting || isOAuthLoading}
              required
              minLength={8}
            />
            <button className="su-primary" type="submit" disabled={isSubmitting || isOAuthLoading}>
              {isSubmitting ? "Creating account..." : "Sign Up"}
            </button>
          </form>

          <div className="su-divider">OR</div>

          <button className="su-google" type="button" disabled={isOAuthLoading || isSubmitting} onClick={handleGoogle}>
            <GoogleG />
            {isOAuthLoading ? "Opening sign-up..." : "Sign up with Google"}
          </button>

          <div className="su-signin">
            Already have an account? <Link href="/sign-in">Sign In</Link>
          </div>
        </div>
      </div>
    </>
  );
}
