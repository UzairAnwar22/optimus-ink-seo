"use client";

import { useState } from "react";
import Link from "next/link";
import brand from "@/config/brand";
import { forgotPassword } from "@/lib/auth";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    const result = await forgotPassword({ email });
    setIsLoading(false);
    if (result.ok) {
      setSent(true);
    } else {
      setError(result.error || "Something went wrong. Please try again.");
    }
  };

  return (
    <>
      <style>{`
        .fp-page-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 28px 16px; font-family: "Inter", -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5; }
        .fp-page-card { width: 100%; max-width: 420px; background: #ffffff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06); padding: 40px 36px 32px; position: relative; z-index: 1; }
        .fp-page-brand { display: flex; justify-content: center; margin-bottom: 20px; }
        .fp-page-brand img { height: 38px; width: auto; max-width: 220px; object-fit: contain; display: block; }
        .fp-page-title { margin: 0; text-align: center; font-size: 22px; font-weight: 700; color: #111827; }
        .fp-page-subtitle { margin: 8px 0 24px; text-align: center; font-size: 14px; color: #6b7280; font-weight: 400; }
        .fp-page-form { display: flex; flex-direction: column; gap: 14px; }
        .fp-page-input { width: 100%; height: 48px; border-radius: 10px; border: 1px solid #e5e7eb; background: #ffffff; padding: 0 16px; font-size: 14px; outline: none; color: #111827; box-sizing: border-box; font-family: inherit; transition: border-color 0.15s ease, box-shadow 0.15s ease; }
        .fp-page-input::placeholder { color: #9ca3af; }
        .fp-page-input:focus { border-color: #111827; box-shadow: 0 0 0 3px rgba(17, 24, 39, 0.06); }
        .fp-page-primary-btn { height: 48px; border-radius: 10px; border: none; cursor: pointer; font-size: 14px; font-weight: 600; color: #ffffff; background: #111827; transition: background 0.15s ease, transform 0.08s ease; font-family: inherit; }
        .fp-page-primary-btn:hover { background: #1f2937; }
        .fp-page-primary-btn:active { transform: translateY(1px); }
        .fp-page-primary-btn:disabled { opacity: 0.65; cursor: not-allowed; }
        .fp-page-error { display: flex; gap: 10px; align-items: center; background: rgba(220, 38, 38, 0.06); border: 1px solid rgba(220, 38, 38, 0.18); color: #b91c1c; padding: 10px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 4px; }
        .fp-page-back { text-align: center; margin-top: 20px; font-size: 14px; color: #6b7280; }
        .fp-page-back a { color: #ef4444; font-weight: 600; text-decoration: none; }
        .fp-page-back a:hover { text-decoration: underline; }
        .fp-page-success { text-align: center; padding: 8px 0; }
        .fp-page-success-icon { width: 48px; height: 48px; margin: 0 auto 16px; background: rgba(34, 197, 94, 0.10); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .fp-page-success p { margin: 0; font-size: 14px; line-height: 1.6; color: #6b7280; }
        .fp-page-success p strong { color: #111827; }
        @media (max-width: 420px) { .fp-page-card { padding: 28px 20px 24px; } }
      `}</style>

      <div className="fp-page-wrap">
        <div className="fp-page-card">
          <div className="fp-page-brand">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt={brand.name} />
            ) : (
              <span style={{ fontWeight: 700, fontSize: 22, color: brand.colors.primary }}>{brand.name}</span>
            )}
          </div>

          <h2 className="fp-page-title">Forgot Your Password?</h2>
          <div className="fp-page-subtitle">
            {sent
              ? "Check your inbox for a reset link."
              : "We do it all the time too — we'll send your email a reset link!"}
          </div>

          {error && (
            <div className="fp-page-error">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="fp-page-success">
              <div className="fp-page-success-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <p>
                We&apos;ve sent a password reset link to <strong>{email}</strong>.
                Please check your email (and spam folder).
              </p>
            </div>
          ) : (
            <form className="fp-page-form" onSubmit={handleSubmit}>
              <input
                className="fp-page-input"
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
              <button className="fp-page-primary-btn" type="submit" disabled={isLoading}>
                {isLoading ? "Sending..." : "Submit"}
              </button>
            </form>
          )}

          <div className="fp-page-back">
            Go back to <Link href="/sign-in">Login</Link>
          </div>
        </div>
      </div>
    </>
  );
}
