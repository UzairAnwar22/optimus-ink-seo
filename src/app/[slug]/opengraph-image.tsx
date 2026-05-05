import { ImageResponse } from "next/og";
import { fetchPublicProfile, getSettings } from "@/lib/api";
import brand from "@/config/brand";

export const runtime = "nodejs";
export const alt = "Profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await fetchPublicProfile(slug);

  // Either no profile, or the operator has disabled SEO indexing for this
  // profile — render a generic brand card instead of the profile-specific
  // image so direct scraping of /opengraph-image yields no personal data.
  if (!profile || profile.enableSeoIndex !== true) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#111827",
            color: "#fff",
            fontSize: 48,
            fontWeight: 700,
          }}
        >
          {brand.name}
        </div>
      ),
      { ...size }
    );
  }

  const settings = getSettings(profile);
  const name = String(settings.displayName || settings.pageName || slug);
  const bio = String(settings.bio || "").replace(/<[^>]*>/g, "").slice(0, 120);
  const avatar = String(settings.profileImage || "");
  const isVerified = !!(settings.isVerified || profile.isVerified);
  const bgColor = String(settings.backgroundColor || "#FBFAF8");

  // Determine if dark background
  const isDark = (() => {
    const hex = bgColor.replace("#", "");
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 128;
  })();

  const textColor = isDark ? "#ffffff" : "#111827";
  const subColor = isDark ? "rgba(255,255,255,0.6)" : "#6b7280";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: bgColor.includes("gradient") ? bgColor : bgColor,
          padding: "60px",
          gap: "24px",
        }}
      >
        {/* Avatar */}
        {avatar ? (
          <img
            src={avatar}
            width={120}
            height={120}
            style={{
              borderRadius: "50%",
              objectFit: "cover",
              border: `4px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.08)"}`,
            }}
          />
        ) : (
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: "50%",
              background: isDark ? "rgba(255,255,255,0.15)" : "#e5e7eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 48,
              fontWeight: 700,
              color: textColor,
            }}
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Name + Verified */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <span
            style={{
              fontSize: 52,
              fontWeight: 800,
              color: textColor,
              letterSpacing: "-1px",
            }}
          >
            {name}
          </span>
          {isVerified && (
            <svg viewBox="0 0 22 22" width="40" height="40">
              <path
                fill="#1DA1F2"
                d="M20.396 11c.035-.5-.172-.975-.516-1.316a1.97 1.97 0 0 0-.144-2.14 2 2 0 0 0-1.258-.92 2 2 0 0 0-.462-2.002 2 2 0 0 0-2.002-.462 2 2 0 0 0-.92-1.258 1.97 1.97 0 0 0-2.14-.144 1.97 1.97 0 0 0-1.316-.516c-.5-.035-.975.172-1.316.516a1.97 1.97 0 0 0-2.14.144 2 2 0 0 0-.92 1.258 2 2 0 0 0-2.002.462 2 2 0 0 0-.462 2.002 2 2 0 0 0-1.258.92 1.97 1.97 0 0 0-.144 2.14 1.97 1.97 0 0 0-.516 1.316c-.035.5.172.976.516 1.317a1.97 1.97 0 0 0 .144 2.14c.2.3.47.53.778.687a2 2 0 0 0 .462 2.002 2 2 0 0 0 2.002.462c.157.308.388.579.688.779a1.97 1.97 0 0 0 2.14.144c.341.344.816.55 1.316.516.5.035.976-.172 1.317-.516a1.97 1.97 0 0 0 2.14-.144c.3-.2.53-.47.687-.779a2 2 0 0 0 2.002-.462 2 2 0 0 0 .462-2.002c.308-.157.579-.388.779-.688a1.97 1.97 0 0 0 .144-2.14c.344-.34.55-.815.516-1.316Z"
              />
              <path
                fill="#fff"
                d="M9.585 14.929 6.293 11.64l1.413-1.414 1.879 1.879 4.296-4.296L15.294 9.2l-5.71 5.73Z"
              />
            </svg>
          )}
        </div>

        {/* Bio */}
        {bio && (
          <span
            style={{
              fontSize: 24,
              color: subColor,
              textAlign: "center",
              maxWidth: "800px",
              lineHeight: 1.5,
            }}
          >
            {bio}
          </span>
        )}

        {/* Brand watermark */}
        <span
          style={{
            position: "absolute",
            bottom: 30,
            right: 40,
            fontSize: 18,
            fontWeight: 600,
            color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)",
          }}
        >
          {brand.bioDomain}
        </span>
      </div>
    ),
    { ...size }
  );
}
