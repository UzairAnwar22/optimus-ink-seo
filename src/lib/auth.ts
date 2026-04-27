import brand from "@/config/brand";

const AUTH_USER_KEY = "koenig-auth-user";
const AUTH_TOKENS_KEY = "koenig-auth-tokens";

export const OAUTH_MESSAGE_TYPE = "OAUTH_AUTH_RESULT";

export function getClientApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || brand.apiUrl;
}

const baseHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "ngrok-skip-browser-warning": "true",
};

interface AuthSuccess {
  ok: true;
  data: { user: Record<string, unknown>; tokens: { accessToken: string; expiresIn?: number } };
}
interface AuthFailure {
  ok: false;
  error: string;
}
type AuthResult = AuthSuccess | AuthFailure;

async function postJson(path: string, body: unknown): Promise<AuthResult> {
  try {
    const res = await fetch(`${getClientApiBaseUrl()}${path}`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success === true && json.data) {
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json?.error?.message || `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Unable to connect to server. Please try again." };
  }
}

export function loginApi(body: { email: string; password: string }) {
  return postJson("/api/auth/login", body);
}

interface HandoffSuccess {
  ok: true;
  handoffToken: string;
  expiresIn: number;
}
type HandoffResult = HandoffSuccess | AuthFailure;

/**
 * Login on this (SEO) origin and get a short-lived single-use handoff token.
 * We do NOT persist anything locally; the app origin exchanges the token for real auth.
 */
export async function loginHandoffApi(body: { email: string; password: string }): Promise<HandoffResult> {
  try {
    const res = await fetch(`${getClientApiBaseUrl()}/api/auth/handoff/login`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success === true && json.data?.handoffToken) {
      return { ok: true, handoffToken: json.data.handoffToken, expiresIn: json.data.expiresIn };
    }
    return { ok: false, error: json?.error?.message || `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Unable to connect to server. Please try again." };
  }
}

/**
 * Base URL of the React app (mounted at /app/* — see optimus.Ink/vite.config.js `base`).
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_APP_URL if set — use as-is (dev or prod override).
 *   2. localhost dev → http://localhost:5173 (the Vite dev server). The SEO site
 *      runs on :3009, so window.location.origin here would be the SEO origin,
 *      which is wrong for the app callback URL.
 *   3. Otherwise → window.location.origin. Correct for prod where SEO and app
 *      share a domain behind a reverse proxy routing /app/* to the SPA.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  if (typeof window !== "undefined") {
    const { hostname, protocol } = window.location;
    const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
    if (isLocalhost) return `${protocol}//${hostname}:5173`;
    return window.location.origin;
  }
  return "";
}

export function buildAppResolveUrl(handoffToken: string, next?: string): string {
  const params = new URLSearchParams({ token: handoffToken });
  if (next) params.set("next", next);
  return `${getAppBaseUrl()}/app/auth/resolve?${params.toString()}`;
}

export function registerApi(body: { profileSlug: string; email: string; password: string }) {
  return postJson("/api/auth/register", body);
}

// POST /api/auth/forgot-password — request a password reset email (public).
export async function forgotPassword(body: { email: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getClientApiBaseUrl()}/api/auth/forgot-password`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success === true) return { ok: true };
    return { ok: false, error: json?.error?.message || `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Unable to connect to server. Please try again." };
  }
}

// POST /api/auth/reset-password — reset password using token from email (public).
export async function resetPassword(body: { token: string; userId: number; newPassword: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${getClientApiBaseUrl()}/api/auth/reset-password`, {
      method: "POST",
      headers: baseHeaders,
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success === true) return { ok: true };
    return { ok: false, error: json?.error?.message || `Request failed (${res.status})` };
  } catch {
    return { ok: false, error: "Unable to connect to server. Please try again." };
  }
}

export async function getProviderAuthUrl(providerId: string, redirectUrl: string) {
  try {
    const res = await fetch(
      `${getClientApiBaseUrl()}/api/auth/${encodeURIComponent(providerId)}/url?redirectUrl=${encodeURIComponent(redirectUrl)}`,
      { headers: baseHeaders }
    );
    const json = await res.json().catch(() => ({}));
    if (res.ok && json?.success === true && json.data?.url) {
      return { ok: true as const, url: json.data.url as string };
    }
    return { ok: false as const, error: json?.error?.message || `Request failed (${res.status})` };
  } catch {
    return { ok: false as const, error: "Unable to connect to server." };
  }
}

export function verifyOAuthCode(body: { code: string; provider: string }) {
  return postJson("/api/auth/verify-code", body);
}

export function persistAuth(user: unknown, tokens: unknown) {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKENS_KEY, JSON.stringify(tokens));
  try {
    localStorage.removeItem("kbCreatorUsername");
  } catch {}
}

/**
 * OAuth popup landing URL. Must live on the APP origin (not this SEO origin)
 * so the popup can exchange the code and persist tokens on the app's
 * localStorage — then signal this opener to redirect the top window to the app.
 */
export function getOAuthCallbackUrl(): string {
  return `${getAppBaseUrl()}/app/auth/callback`;
}

export function openOAuthPopup(url: string, providerId: string): Window | null {
  const width = 500;
  const height = 620;
  const screenW = window.screen.availWidth || window.screen.width || 1024;
  const screenH = window.screen.availHeight || window.screen.height || 768;
  const left = Math.max(0, Math.round((screenW - width) / 2));
  const top = Math.max(0, Math.round((screenH - height) / 2));
  return window.open(
    url,
    `oauth_${providerId}`,
    `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes`
  );
}
