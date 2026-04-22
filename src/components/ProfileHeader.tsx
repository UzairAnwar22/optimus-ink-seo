import Image from "next/image";
import { AutoTheme, socialIcons, socialColors } from "@/lib/theme";

interface Props {
  name: string;
  nameHtml?: string;
  bio?: string;
  avatar?: string;
  isVerified: boolean;
  socials: Record<string, string>;
  visibleSocials: string[];
  headerTextColor: string;
  headerSubTextColor: string;
  autoTheme: AutoTheme;
  layout?: string;
}

export default function ProfileHeader({
  name, nameHtml, bio, avatar, isVerified, socials, visibleSocials,
  headerTextColor, headerSubTextColor, autoTheme, layout = "center",
}: Props) {
  const isCentered = layout === "center";
  const alignItems = isCentered ? "center" : "flex-start";
  const textAlign = isCentered ? "center" as const : "left" as const;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems, gap: 8, padding: "0 16px", width: "100%", boxSizing: "border-box" }}>
      {/* Avatar */}
      {avatar ? (
        <Image
          src={avatar}
          alt={name}
          width={100}
          height={100}
          style={{ borderRadius: "50%", objectFit: "cover", border: "3px solid rgba(255,255,255,0.5)", boxShadow: "0 2px 12px rgba(0,0,0,0.15)" }}
          priority
        />
      ) : (
        <div style={{
          width: 100, height: 100, borderRadius: "50%",
          background: headerTextColor === "#ffffff" ? "rgba(255,255,255,0.15)" : "#e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, fontWeight: 600, color: headerTextColor === "#ffffff" ? "rgba(255,255,255,0.7)" : "#999",
        }}>
          {name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name + Verified */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, justifyContent: isCentered ? "center" : "flex-start" }}>
        <h1
          style={{ fontSize: 22, fontWeight: 700, margin: 0, color: headerTextColor, lineHeight: 1.25 }}
          dangerouslySetInnerHTML={{ __html: nameHtml || name }}
        />
        {isVerified && (
          <svg viewBox="0 0 22 22" width="22" height="22" style={{ flexShrink: 0 }}>
            <path fill="#1DA1F2" d="M20.396 11c.035-.5-.172-.975-.516-1.316a1.97 1.97 0 0 0-.144-2.14 2 2 0 0 0-1.258-.92 2 2 0 0 0-.462-2.002 2 2 0 0 0-2.002-.462 2 2 0 0 0-.92-1.258 1.97 1.97 0 0 0-2.14-.144 1.97 1.97 0 0 0-1.316-.516c-.5-.035-.975.172-1.316.516a1.97 1.97 0 0 0-2.14.144 2 2 0 0 0-.92 1.258 2 2 0 0 0-2.002.462 2 2 0 0 0-.462 2.002 2 2 0 0 0-1.258.92 1.97 1.97 0 0 0-.144 2.14 1.97 1.97 0 0 0-.516 1.316c-.035.5.172.976.516 1.317a1.97 1.97 0 0 0 .144 2.14c.2.3.47.53.778.687a2 2 0 0 0 .462 2.002 2 2 0 0 0 2.002.462c.157.308.388.579.688.779a1.97 1.97 0 0 0 2.14.144c.341.344.816.55 1.316.516.5.035.976-.172 1.317-.516a1.97 1.97 0 0 0 2.14-.144c.3-.2.53-.47.687-.779a2 2 0 0 0 2.002-.462 2 2 0 0 0 .462-2.002c.308-.157.579-.388.779-.688a1.97 1.97 0 0 0 .144-2.14c.344-.34.55-.815.516-1.316Z" />
            <path fill="#fff" d="M9.585 14.929 6.293 11.64l1.413-1.414 1.879 1.879 4.296-4.296L15.294 9.2l-5.71 5.73Z" />
          </svg>
        )}
      </div>

      {/* Bio */}
      {bio && (
        <p
          style={{ fontSize: 14, color: headerSubTextColor, margin: 0, lineHeight: 1.5, textAlign, wordBreak: "break-word", maxWidth: 480 }}
          dangerouslySetInnerHTML={{ __html: bio }}
        />
      )}

      {/* Social Links */}
      {visibleSocials.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: isCentered ? "center" : "flex-start", marginTop: 4 }}>
          {visibleSocials.map((platform) => {
            const url = socials[platform];
            const icon = socialIcons[platform];
            if (!url || !icon) return null;
            const color = socialColors[platform] || "#333";
            const isGradient = color.includes("gradient");
            return (
              <a
                key={platform}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: isGradient ? color : color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  textDecoration: "none",
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#fff"><path d={icon} /></svg>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
