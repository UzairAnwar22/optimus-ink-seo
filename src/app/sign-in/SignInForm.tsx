"use client";

import { useEffect, useState } from "react";
import brand from "@/config/brand";
import {
  loginApi,
  persistAuth,
  getProviderAuthUrl,
  verifyOAuthCode,
  getOAuthCallbackUrl,
  openOAuthPopup,
  OAUTH_MESSAGE_TYPE,
} from "@/lib/auth";

const POST_LOGIN_PATH = "/app/my-pages";
const POST_LOGIN_ADMIN_PATH = "/app/admin";

const GoogleG = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.673 32.659 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.022 6.053 29.258 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 19.02 12 24 12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.022 6.053 29.258 4 24 4 16.318 4 9.656 8.337 6.306 14.691Z" />
    <path fill="#4CAF50" d="M24 44c5.155 0 9.836-1.977 13.37-5.197l-6.184-5.233C29.153 35.091 26.715 36 24 36c-5.202 0-9.641-3.316-11.283-7.946l-6.52 5.023C9.505 39.556 16.227 44 24 44Z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a11.98 11.98 0 0 1-4.117 5.57l.003-.002 6.184 5.233C36.965 39.17 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z" />
  </svg>
);

function redirectAfterLogin(user: { role?: string } | null) {
  const path = user?.role === "superadmin" ? POST_LOGIN_ADMIN_PATH : POST_LOGIN_PATH;
  window.location.href = path;
}

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await loginApi({ email, password });
    setIsLoading(false);
    if (result.ok) {
      persistAuth(result.data.user, result.data.tokens);
      redirectAfterLogin(result.data.user as { role?: string });
    } else {
      setError(result.error || "Invalid email or password");
    }
  };

  const handleGoogle = async () => {
    setIsOAuthLoading(true);
    setError("");
    const callbackUrl = `${getOAuthCallbackUrl()}?provider=google`;
    const result = await getProviderAuthUrl("google", callbackUrl);
    if (!result.ok) {
      setError(result.error || "Could not start sign-in");
      setIsOAuthLoading(false);
      return;
    }
    const popup = openOAuthPopup(result.url, "google");
    if (!popup) {
      window.location.href = result.url;
      return;
    }
    const allowedOrigin = window.location.origin;
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
      if (event.origin !== allowedOrigin) return;
      const data = event.data as { type?: string; code?: string; provider?: string; errorMessage?: string };
      if (data?.type !== OAUTH_MESSAGE_TYPE) return;
      cleanup();
      if (data.errorMessage) {
        setError(data.errorMessage);
        setIsOAuthLoading(false);
        return;
      }
      if (data.code && data.provider) {
        const verify = await verifyOAuthCode({ code: data.code, provider: data.provider });
        if (verify.ok) {
          persistAuth(verify.data.user, verify.data.tokens);
          window.location.href = `/app/onboarding${window.location.search || ""}`;
        } else {
          setError(verify.error || "Sign-in failed. Please try again.");
          setIsOAuthLoading(false);
        }
      }
    }
    window.addEventListener("message", onMessage);
  };

  useEffect(() => {
    return () => {
      // cleanup if component unmounts mid-OAuth — popup listener removed via cleanup() inside onMessage
    };
  }, []);

  return (
    <>
      <style>{`
        .si-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 28px 16px; background: #f5f5f5; }
        .si-card { width: 100%; max-width: 420px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.06); padding: 40px 36px 32px; }
        .si-brand { text-align: center; margin-bottom: 20px; font-weight: 700; font-size: 22px; color: ${brand.colors.primary}; }
        .si-title { margin: 0; text-align: center; font-size: 22px; font-weight: 700; color: #111827; }
        .si-subtitle { margin: 8px 0 24px; text-align: center; font-size: 14px; color: #6b7280; }
        .si-form { display: flex; flex-direction: column; gap: 14px; }
        .si-input { width: 100%; height: 48px; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; padding: 0 16px; font-size: 14px; outline: none; color: #111827; box-sizing: border-box; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .si-input::placeholder { color: #9ca3af; }
        .si-input:focus { border-color: #111827; box-shadow: 0 0 0 3px rgba(17,24,39,0.06); }
        .si-primary { height: 48px; border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #fff; background: #111827; transition: background 0.15s ease; margin-top: 2px; }
        .si-primary:hover { background: #1f2937; }
        .si-primary:disabled { opacity: 0.65; cursor: not-allowed; }
        .si-forgot { text-align: center; margin-top: 12px; }
        .si-forgot a { font-size: 13px; color: #6b7280; text-decoration: none; font-weight: 500; }
        .si-forgot a:hover { text-decoration: underline; color: #111827; }
        .si-divider { margin: 18px 0; }
        .si-google { height: 48px; width: 100%; border-radius: 10px; border: 1px solid #e5e7eb; background: #fff; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px; font-size: 14px; font-weight: 600; color: #111827; transition: background 0.15s ease, border-color 0.15s ease; }
        .si-google:hover { background: #f9fafb; border-color: #d1d5db; }
        .si-google:disabled { opacity: 0.65; cursor: not-allowed; }
        .si-signup { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
        .si-signup a { color: #ef4444; font-weight: 600; text-decoration: none; }
        .si-signup a:hover { text-decoration: underline; }
        .si-error { display: flex; gap: 10px; align-items: center; background: rgba(220,38,38,0.06); border: 1px solid rgba(220,38,38,0.18); color: #b91c1c; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 4px; }
        @media (max-width: 420px) { .si-card { padding: 28px 20px 24px; } }
      `}</style>
      <div className="si-wrap">
        <div className="si-card">
          <div className="si-brand">{brand.name}</div>
          <h2 className="si-title">Sign In</h2>
          <div className="si-subtitle">Welcome back! Sign in to your account.</div>

          {error && (
            <div className="si-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form className="si-form" onSubmit={handleSubmit}>
            <input className="si-input" type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            <input className="si-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            <button className="si-primary" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="si-forgot">
            <a href="/app/forgot-password">Forgot password?</a>
          </div>

          <div className="si-divider"></div>

          <button className="si-google" type="button" disabled={isOAuthLoading} onClick={handleGoogle}>
            <GoogleG />
            {isOAuthLoading ? "Opening sign-in..." : "Sign in with Google"}
          </button>

          <div className="si-signup">
            Don&apos;t have an account? <a href="/sign-up">Sign Up</a>
          </div>
        </div>
      </div>
    </>
  );
}
