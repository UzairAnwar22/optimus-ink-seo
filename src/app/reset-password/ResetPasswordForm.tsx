"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import brand from "@/config/brand";
import { resetPassword } from "@/lib/auth";

const LockIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M7.5 11V8.6A4.5 4.5 0 0 1 12 4.1a4.5 4.5 0 0 1 4.5 4.5V11" stroke="#9AA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M6.8 11h10.4A2.3 2.3 0 0 1 19.5 13.3v5.9A2.3 2.3 0 0 1 17.2 21.5H6.8A2.3 2.3 0 0 1 4.5 19.2v-5.9A2.3 2.3 0 0 1 6.8 11Z" stroke="#9AA3AF" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z" stroke="#9AA3AF" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" stroke="#9AA3AF" strokeWidth="1.6" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" stroke="#9AA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="1" y1="1" x2="23" y2="23" stroke="#9AA3AF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );

export default function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const userId = parseInt(searchParams.get("id") || "0", 10);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !token || !userId;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    const result = await resetPassword({ token, userId, newPassword });
    setIsLoading(false);

    if (result.ok) {
      setDone(true);
    } else {
      setError(result.error || "Invalid or expired reset link.");
    }
  };

  return (
    <>
      <style>{`
        :root {
          --bg-cream: #FFFCF9;
          --card: #FFFFFF;
          --text: #0B1220;
          --muted: #6B7280;
          --fieldBorder: rgba(17, 24, 39, 0.12);
          --shadow: 0 18px 45px rgba(15, 23, 42, 0.12);
          --shadow2: 0 6px 16px rgba(15, 23, 42, 0.10);
          --primary1: #0B1633;
          --primary2: #0E2A5F;
          --primaryHover1: #0A142C;
          --primaryHover2: #0B224E;
        }
        body { background: var(--bg-cream) !important; }
        .rp-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 28px 16px; font-family: "Inter", sans-serif; position: relative; overflow: hidden; background: var(--bg-cream); }
        .rp-wrap::before, .rp-wrap::after {
          content: ""; position: absolute; inset: -100px; pointer-events: none;
          background:
            radial-gradient(600px 320px at 18% 20%, rgba(255, 206, 180, 0.65), transparent 60%),
            radial-gradient(520px 320px at 78% 22%, rgba(255, 199, 214, 0.60), transparent 60%),
            radial-gradient(520px 340px at 22% 78%, rgba(255, 228, 200, 0.70), transparent 60%),
            radial-gradient(560px 360px at 82% 78%, rgba(255, 214, 236, 0.55), transparent 60%);
          opacity: 1;
        }
        .rp-card { width: 100%; max-width: 420px; background: var(--card); border-radius: 10px; box-shadow: var(--shadow), var(--shadow2); padding: 26px 26px 22px; position: relative; z-index: 1; border: 1px solid rgba(15, 23, 42, 0.06); }
        .rp-brand { display: flex; justify-content: center; margin-bottom: 12px; }
        .rp-brand img { height: 34px; width: auto; max-width: 220px; object-fit: contain; display: block; }
        .rp-title { margin: 0; text-align: center; font-size: 26px; font-weight: 700; letter-spacing: -0.02em; color: var(--text); }
        .rp-subtitle { margin: 8px 0 18px; text-align: center; font-size: 13.5px; color: var(--muted); font-weight: 500; }
        .rp-form { display: grid; gap: 12px; }
        .rp-field { position: relative; }
        .rp-field .rp-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; }
        .rp-field .rp-eye { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); display: inline-flex; align-items: center; justify-content: center; cursor: pointer; background: none; border: none; padding: 0; }
        .rp-input { width: 100%; height: 40px; border-radius: 999px; border: 1px solid var(--fieldBorder); background: #F5F6F8; padding: 0 42px 0 40px; font-size: 13.5px; outline: none; color: var(--text); box-sizing: border-box; transition: box-shadow 0.15s ease, border-color 0.15s ease, background 0.15s ease; }
        .rp-input::placeholder { color: rgba(107, 114, 128, 0.85); }
        .rp-input:focus { background: #FFFFFF; border-color: rgba(15, 23, 42, 0.18); box-shadow: 0 0 0 3px rgba(14, 42, 95, 0.10); }
        .rp-error { display: flex; gap: 10px; align-items: center; background: rgba(220, 38, 38, 0.06); border: 1px solid rgba(220, 38, 38, 0.18); color: #B91C1C; padding: 10px 12px; border-radius: 10px; font-size: 13px; margin-bottom: 12px; }
        .rp-primaryBtn { height: 40px; border-radius: 999px; border: none; cursor: pointer; font-size: 13.5px; font-weight: 700; color: white; background: linear-gradient(180deg, var(--primary2), var(--primary1)); box-shadow: 0 10px 18px rgba(11, 22, 51, 0.22); transition: transform 0.08s ease, filter 0.15s ease, background 0.15s ease; }
        .rp-primaryBtn:hover { filter: brightness(1.02); background: linear-gradient(180deg, var(--primaryHover2), var(--primaryHover1)); }
        .rp-primaryBtn:active { transform: translateY(1px); }
        .rp-primaryBtn:disabled { opacity: 0.70; cursor: not-allowed; }
        .rp-back { margin-top: 14px; text-align: center; font-size: 13px; color: var(--muted); }
        .rp-back a { color: var(--text); font-weight: 600; text-decoration: none; }
        .rp-back a:hover { text-decoration: underline; }
        .rp-success { text-align: center; padding: 8px 0; }
        .rp-success-icon { width: 48px; height: 48px; margin: 0 auto 16px; background: rgba(34, 197, 94, 0.10); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
        .rp-success p { margin: 0; font-size: 14px; line-height: 1.6; color: var(--muted); }
        @media (max-width: 420px) { .rp-card { padding: 22px 18px 18px; } }
      `}</style>

      <div className="rp-wrap">
        <div className="rp-card">
          <div className="rp-brand">
            {brand.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={brand.logo} alt={brand.name} />
            ) : (
              <span style={{ fontWeight: 700, fontSize: 20, color: brand.colors.primary }}>{brand.name}</span>
            )}
          </div>

          {invalidLink ? (
            <>
              <h2 className="rp-title">Invalid link</h2>
              <div className="rp-subtitle">
                This password reset link is invalid or has expired. Please request a new one.
              </div>
              <div className="rp-back">
                <Link href="/forgot-password">Request new reset link</Link>
              </div>
            </>
          ) : done ? (
            <>
              <h2 className="rp-title">Password reset!</h2>
              <div className="rp-subtitle">Your password has been updated successfully.</div>
              <div className="rp-success">
                <div className="rp-success-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4L19 7" stroke="#22c55e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p>You can now sign in with your new password.</p>
              </div>
              <div className="rp-back">
                <Link href="/sign-in">Go to Sign In</Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="rp-title">Reset password</h2>
              <div className="rp-subtitle">Enter your new password below.</div>

              {error && (
                <div className="rp-error">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
                    <path d="M9 9l6 6M15 9l-6 6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <form className="rp-form" onSubmit={handleSubmit}>
                <div className="rp-field">
                  <span className="rp-icon"><LockIcon /></span>
                  <input
                    className="rp-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button type="button" className="rp-eye" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}>
                    <EyeIcon open={showPassword} />
                  </button>
                </div>

                <div className="rp-field">
                  <span className="rp-icon"><LockIcon /></span>
                  <input
                    className="rp-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <button className="rp-primaryBtn" type="submit" disabled={isLoading}>
                  {isLoading ? "Resetting…" : "Reset password"}
                </button>
              </form>
            </>
          )}

          {!done && !invalidLink && (
            <div className="rp-back">
              <Link href="/sign-in">&larr; Back to Sign In</Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
