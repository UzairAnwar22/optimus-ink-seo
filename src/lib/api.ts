const API_BASE = process.env.API_BASE_URL || "http://localhost:4000";

export interface ProfileData {
  profileId: number;
  slug: string;
  username: string;
  versionNumber: number;
  settingsJson: Record<string, unknown> | null;
  editorState: unknown;
  contentHtml: string | null;
  publishedAt: string | null;
  kbHandle: string | null;
  isVerified?: boolean;
}

export interface ProfileSettings {
  displayName?: string;
  displayNameHtml?: string;
  pageName?: string;
  bio?: string;
  profileImage?: string;
  backgroundColor?: string;
  socials?: Record<string, string>;
  visibleSocials?: string;
  slug?: string;
  isVerified?: boolean;
  [key: string]: unknown;
}

export async function fetchPublicProfile(slug: string): Promise<ProfileData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/p/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 }, // ISR: revalidate every 60 seconds
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.profile || null;
  } catch {
    return null;
  }
}

export function getSettings(profile: ProfileData): ProfileSettings {
  return (profile.settingsJson || {}) as ProfileSettings;
}

export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://askmybio.ai";
}
