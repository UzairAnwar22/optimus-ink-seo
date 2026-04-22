import { ImageResponse } from "next/og";
import { fetchPublicProfile, getSettings } from "@/lib/api";

export const runtime = "nodejs";
export const alt = "Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TwitterImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);

  if (!profile) {
    return new ImageResponse(
      (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#111827", color: "#fff", fontSize: 48, fontWeight: 700 }}>
          Profile Not Found
        </div>
      ),
      { ...size }
    );
  }

  const settings = getSettings(profile);
  const name = String(settings.displayName || settings.pageName || slug);
  const bio = String(settings.bio || "").replace(/<[^>]*>/g, "").slice(0, 100);
  const avatar = String(settings.profileImage || "");
  const isVerified = !!(settings.isVerified || profile.isVerified);
  const bgColor = String(settings.backgroundColor || "#FBFAF8");
  const isDark = (() => { const h = bgColor.replace("#", ""); if (h.length !== 6) return false; const r = parseInt(h.substring(0, 2), 16); const g = parseInt(h.substring(2, 4), 16); const b = parseInt(h.substring(4, 6), 16); return (r * 299 + g * 587 + b * 114) / 1000 < 128; })();
  const textColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.6)" : "#6b7280";

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: bgColor, padding: "60px", gap: "20px" }}>
        {avatar ? (
          <img src={avatar} width={100} height={100} style={{ borderRadius: "50%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: 100, height: 100, borderRadius: "50%", background: isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, fontWeight: 700, color: textColor }}>
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: 44, fontWeight: 800, color: textColor }}>{name}</span>
          {isVerified && (
            <svg viewBox="0 0 22 22" width="32" height="32">
              <path fill="#1DA1F2" d="M20.396 11c.035-.5-.172-.975-.516-1.316a1.97 1.97 0 0 0-.144-2.14 2 2 0 0 0-1.258-.92 2 2 0 0 0-.462-2.002 2 2 0 0 0-2.002-.462 2 2 0 0 0-.92-1.258 1.97 1.97 0 0 0-2.14-.144 1.97 1.97 0 0 0-1.316-.516c-.5-.035-.975.172-1.316.516a1.97 1.97 0 0 0-2.14.144 2 2 0 0 0-.92 1.258 2 2 0 0 0-2.002.462 2 2 0 0 0-.462 2.002 2 2 0 0 0-1.258.92 1.97 1.97 0 0 0-.144 2.14 1.97 1.97 0 0 0-.516 1.316c-.035.5.172.976.516 1.317a1.97 1.97 0 0 0 .144 2.14c.2.3.47.53.778.687a2 2 0 0 0 .462 2.002 2 2 0 0 0 2.002.462c.157.308.388.579.688.779a1.97 1.97 0 0 0 2.14.144c.341.344.816.55 1.316.516.5.035.976-.172 1.317-.516a1.97 1.97 0 0 0 2.14-.144c.3-.2.53-.47.687-.779a2 2 0 0 0 2.002-.462 2 2 0 0 0 .462-2.002c.308-.157.579-.388.779-.688a1.97 1.97 0 0 0 .144-2.14c.344-.34.55-.815.516-1.316Z" />
              <path fill="#fff" d="M9.585 14.929 6.293 11.64l1.413-1.414 1.879 1.879 4.296-4.296L15.294 9.2l-5.71 5.73Z" />
            </svg>
          )}
        </div>
        {bio && <span style={{ fontSize: 22, color: subColor, textAlign: "center", maxWidth: "700px" }}>{bio}</span>}
        <span style={{ position: "absolute", bottom: 28, right: 36, fontSize: 16, fontWeight: 600, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)" }}>askmybio.ai</span>
      </div>
    ),
    { ...size }
  );
}
