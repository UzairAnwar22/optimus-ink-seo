import brand from "@/config/brand";
import type { ProfileStatusInfo } from "@/lib/api";

interface Props {
  slug: string;
  info: ProfileStatusInfo;
}

// Heuristic: dark backgrounds get light text, light backgrounds get dark.
// Avoids unreadable name/headline when the merchant has picked a near-black
// or near-white theme color in their settingsJson.
function pickTextColor(bg: string | null): string {
  if (!bg) return "#0f172a";
  const hex = bg.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return "#0f172a";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  // Standard luminance — under 140 ≈ dark, give it light text.
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma < 140 ? "#f8fafc" : "#0f172a";
}

export default function ComingSoonPage({ slug, info }: Props) {
  const bg = info.backgroundColor || "#FBFAF8";
  const fg = pickTextColor(bg);
  const fgMuted = fg === "#f8fafc" ? "rgba(248,250,252,0.72)" : "rgba(15,23,42,0.6)";
  const cardBorder = fg === "#f8fafc" ? "rgba(248,250,252,0.14)" : "rgba(15,23,42,0.08)";
  const dotColor = fg === "#f8fafc" ? "#a78bfa" : "#7c3aed";
  const initial = (info.name || slug).trim().charAt(0).toUpperCase() || "?";

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{ backgroundColor: bg, color: fg }}
    >
      <div
        className="w-full max-w-md text-center rounded-3xl p-10"
        style={{ border: `1px solid ${cardBorder}` }}
      >
        {info.profileImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={info.profileImage}
            alt={info.name || slug}
            width={96}
            height={96}
            className="mx-auto rounded-full object-cover"
            style={{ width: 96, height: 96, border: `2px solid ${cardBorder}` }}
          />
        ) : (
          <div
            className="mx-auto rounded-full flex items-center justify-center text-3xl font-bold"
            style={{
              width: 96,
              height: 96,
              backgroundColor: cardBorder,
              color: fg,
            }}
          >
            {initial}
          </div>
        )}

        <div
          className="mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: cardBorder,
            color: fgMuted,
          }}
        >
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: dotColor, animation: "csPulse 1.6s ease-in-out infinite" }}
          />
          Coming soon
        </div>

        <h1 className="mt-5 text-3xl font-bold tracking-tight" style={{ color: fg }}>
          {info.name || slug}
        </h1>

        <p className="mt-3 text-sm leading-relaxed" style={{ color: fgMuted }}>
          This bio link is being set up. Check back soon — the page will appear here as
          soon as it goes live.
        </p>

        <a
          href={brand.siteUrl}
          className="mt-8 inline-block rounded-full px-5 py-2.5 text-sm font-semibold transition"
          style={{
            backgroundColor: fg === "#f8fafc" ? "rgba(248,250,252,0.12)" : "rgba(15,23,42,0.06)",
            color: fg,
            border: `1px solid ${cardBorder}`,
          }}
        >
          Powered by {brand.name}
        </a>
      </div>

      <style>{`@keyframes csPulse { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }`}</style>
    </main>
  );
}
