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

export function registerApi(body: { profileSlug: string; email: string; password: string }) {
  return postJson("/api/auth/register", body);
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

export function getOAuthCallbackUrl(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/app/auth/callback`;
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
