import { AutoTheme, isAutoColor, socialIcons } from "@/lib/theme";

interface BioBlock {
  id?: string;
  blockType: string;
  [key: string]: unknown;
}

interface Props {
  blocks: BioBlock[];
  autoTheme: AutoTheme;
  isDark: boolean;
}

// Social widget platform configs
const SW_CFG: Record<string, { name: string; gradient: string; color: string; cta: string; icon: string; url: (u: string) => string }> = {
  instagramWidget: { name: "Instagram", gradient: "linear-gradient(135deg, #833AB4 0%, #E4405F 50%, #FCAF45 100%)", color: "#E4405F", cta: "Follow", icon: socialIcons.instagram, url: (u) => `https://instagram.com/${u}` },
  xWidget: { name: "X", gradient: "linear-gradient(135deg, #15202B 0%, #000000 100%)", color: "#000", cta: "Follow", icon: socialIcons.twitter, url: (u) => `https://x.com/${u}` },
  tiktokWidget: { name: "TikTok", gradient: "linear-gradient(135deg, #000000 0%, #121212 100%)", color: "#000", cta: "Follow", icon: socialIcons.tiktok, url: (u) => `https://tiktok.com/@${u}` },
  youtubeWidget: { name: "YouTube", gradient: "linear-gradient(135deg, #FF0000 0%, #CC0000 100%)", color: "#FF0000", cta: "Subscribe", icon: socialIcons.youtube, url: (u) => `https://youtube.com/@${u}` },
  linkedinWidget: { name: "LinkedIn", gradient: "linear-gradient(135deg, #0A66C2 0%, #004182 100%)", color: "#0A66C2", cta: "Connect", icon: socialIcons.linkedin, url: (u) => `https://linkedin.com/in/${u}` },
  discordWidget: { name: "Discord", gradient: "linear-gradient(135deg, #5865F2 0%, #4752C4 100%)", color: "#5865F2", cta: "Join", icon: "M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z", url: (u) => u.startsWith("http") ? u : `https://discord.gg/${u}` },
  threadsWidget: { name: "Threads", gradient: "linear-gradient(135deg, #000 0%, #333 100%)", color: "#000", cta: "Follow", icon: socialIcons.threads, url: (u) => `https://threads.net/@${u}` },
  behanceWidget: { name: "Behance", gradient: "linear-gradient(135deg, #1769FF 0%, #0050D8 100%)", color: "#1769FF", cta: "View", icon: "M22 7h-7v-2h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14h-8.027c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h5.025c-.07-1.577-1.007-2.596-2.465-2.596-1.559 0-2.39.957-2.56 2.596zm-6.04 7h-8v-18h7.986c4.006.007 5.099 2.583 5.099 4.686 0 1.732-.87 2.97-2.343 3.556 1.887.558 2.911 2.166 2.911 3.981 0 2.685-2.069 5.777-5.653 5.777zm-4.977-16v4.916h4.401c.896 0 2.374-.457 2.374-2.456 0-2.261-1.777-2.46-2.675-2.46h-4.1zm0 7.583v5.417h4.688c1.276 0 2.813-.717 2.813-2.834 0-2.03-1.453-2.583-3.062-2.583h-4.439z", url: (u) => `https://behance.net/${u}` },
};

function resolveColor(val: unknown, autoColor: string, fallback: string): string {
  if (isAutoColor(val)) return autoColor;
  return (val as string) || fallback;
}

function renderBlock(block: BioBlock, index: number, autoTheme: AutoTheme, isDark: boolean) {
  const key = block.id || `b-${index}`;
  const bt = block.blockType;
  const cardBg = resolveColor(block.bgColor, autoTheme.cardBg, "#ffffff");
  const cardTxt = resolveColor(block.textColor, autoTheme.textColor, "#1a1a1a");
  const btnBg = resolveColor(block.buttonColor, autoTheme.cardButtonBg, "#1a1a1a");
  const btnTxt = resolveColor(block.buttonTextColor, autoTheme.cardButtonText, "#ffffff");
  const borderColor = autoTheme.cardBorder || "rgba(0,0,0,0.08)";

  const cardStyle: React.CSSProperties = {
    background: cardBg,
    borderRadius: 16,
    border: `1.5px solid ${borderColor}`,
    padding: "16px",
    width: "100%",
    boxSizing: "border-box",
  };

  // ── Title ──
  if (bt === "title") {
    return (
      <div key={key} style={{ ...cardStyle, background: "transparent", border: "none", padding: "8px 0" }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: autoTheme.textColor, margin: 0, textAlign: "center" }}
          dangerouslySetInnerHTML={{ __html: String(block.text || block.title || "") }} />
      </div>
    );
  }

  // ── Text ──
  if (bt === "text") {
    return (
      <div key={key} style={{ ...cardStyle, background: "transparent", border: "none", padding: "4px 0" }}>
        <p style={{ fontSize: 14, color: autoTheme.textColor, margin: 0, lineHeight: 1.6, opacity: 0.8, textAlign: "center" }}
          dangerouslySetInnerHTML={{ __html: String(block.text || "") }} />
      </div>
    );
  }

  // ── Link / Button ──
  if (bt === "link" || bt === "button") {
    const label = String(block.label || block.buttonText || block.title || block.text || block.url || "Link");
    const url = String(block.url || block.link || "#");
    return (
      <a key={key} href={url} target="_blank" rel="noopener noreferrer"
        style={{
          ...cardStyle, display: "flex", alignItems: "center", justifyContent: "center",
          textDecoration: "none", color: cardTxt, fontWeight: 600, fontSize: 14,
          minHeight: 52, cursor: "pointer",
        }}>
        {label}
      </a>
    );
  }

  // ── Image ──
  if (bt === "image") {
    const imgUrl = String(block.imageUrl || block.url || "");
    if (!imgUrl) return null;
    return (
      <div key={key} style={{ borderRadius: 16, overflow: "hidden" }}>
        <img src={imgUrl} alt={String(block.title || "")} style={{ width: "100%", display: "block", objectFit: "cover" }} />
      </div>
    );
  }

  // ── Social Widgets ──
  const swConfig = SW_CFG[bt];
  if (swConfig && block.username) {
    const username = String(block.username);
    return (
      <a key={key} href={swConfig.url(username)} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>
        <div style={{
          background: swConfig.gradient, borderRadius: 16, padding: "32px 24px",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          gap: 10, minHeight: 160,
        }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#fff"><path d={swConfig.icon} /></svg>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>@{username}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{swConfig.name}</div>
          <div style={{ padding: "8px 24px", borderRadius: 20, background: "rgba(255,255,255,0.95)", color: swConfig.color, fontSize: 12, fontWeight: 700 }}>
            {swConfig.cta}
          </div>
        </div>
      </a>
    );
  }

  // ── Product Card ──
  if (bt === "productCard") {
    const productName = String(block.productName || block.title || "Product");
    const price = block.productPrice ? `$${block.productPrice}` : "";
    const shopUrl = String(block.shopUrl || block.url || "#");
    const productImage = String(block.productImage || block.imageUrl || "");
    return (
      <div key={key} style={cardStyle}>
        {productImage && (
          <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 12 }}>
            <img src={productImage} alt={productName} style={{ width: "100%", height: 200, objectFit: "cover", display: "block" }} />
          </div>
        )}
        <div style={{ fontSize: 15, fontWeight: 700, color: cardTxt, marginBottom: 4 }}>{productName}</div>
        {price && <div style={{ fontSize: 14, fontWeight: 600, color: autoTheme.accentColor }}>{price}</div>}
        <a href={shopUrl} target="_blank" rel="noopener noreferrer"
          style={{
            display: "block", textAlign: "center", marginTop: 12,
            padding: "10px 20px", borderRadius: 12, background: btnBg, color: btnTxt,
            fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
          {String(block.buttonText || "Shop Now")}
        </a>
      </div>
    );
  }

  // ── Map ──
  if (bt === "map") {
    const lat = Number(block.lat) || 37.7749;
    const lng = Number(block.lng) || -122.4194;
    const zoom = Number(block.zoom) || 14;
    const address = String(block.address || "");
    return (
      <div key={key} style={{ borderRadius: 16, overflow: "hidden", position: "relative", height: 200 }}>
        <div style={{ position: "absolute", inset: 0, background: "#e5e7eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <a href={`https://www.google.com/maps?q=${lat},${lng}&z=${zoom}`} target="_blank" rel="noopener noreferrer"
            style={{ color: "#2563eb", fontSize: 14, textDecoration: "none" }}>
            📍 {address || "View on Google Maps"}
          </a>
        </div>
      </div>
    );
  }

  // ── Email ──
  if (bt === "email") {
    const email = String(block.email || "");
    const title = String(block.title || "Get in touch");
    return (
      <div key={key} style={cardStyle}>
        <div style={{ fontSize: 15, fontWeight: 700, color: cardTxt, marginBottom: 8 }}>{title}</div>
        {email && (
          <a href={`mailto:${email}`} style={{
            display: "block", textAlign: "center", padding: "10px 20px",
            borderRadius: 12, background: btnBg, color: btnTxt,
            fontSize: 13, fontWeight: 600, textDecoration: "none",
          }}>
            {String(block.buttonText || "Contact")}
          </a>
        )}
      </div>
    );
  }

  // ── Label ──
  if (bt === "label") {
    return (
      <div key={key} style={{ textAlign: "center", padding: "4px 0" }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: autoTheme.textColor, opacity: 0.6 }}>
          {String(block.text || block.label || "")}
        </span>
      </div>
    );
  }

  // ── Promo Code ──
  if (bt === "promoCode") {
    const code = String(block.code || "");
    return (
      <div key={key} style={{ ...cardStyle, textAlign: "center" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: autoTheme.accentColor, marginBottom: 6 }}>PROMO CODE</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: cardTxt, letterSpacing: 2 }}>{code}</div>
      </div>
    );
  }

  // ── Embed (YouTube, etc.) ──
  if (bt === "embed") {
    const embedUrl = String(block.url || block.embedUrl || "");
    if (!embedUrl) return null;
    const isYt = embedUrl.includes("youtube") || embedUrl.includes("youtu.be");
    if (isYt) {
      const vidId = embedUrl.match(/(?:v=|youtu\.be\/)([^&?#]+)/)?.[1];
      if (vidId) {
        return (
          <div key={key} style={{ borderRadius: 16, overflow: "hidden", position: "relative", paddingBottom: "56.25%" }}>
            <iframe
              src={`https://www.youtube.com/embed/${vidId}`}
              style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
              allow="autoplay; encrypted-media"
              allowFullScreen
              title="Embedded video"
            />
          </div>
        );
      }
    }
    return null;
  }

  // ── Fallback: skip unknown blocks ──
  return null;
}

export default function BioBlocks({ blocks, autoTheme, isDark }: Props) {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 12,
      padding: "0 12px",
      width: "100%",
      boxSizing: "border-box",
    }}>
      {blocks.map((block, i) => {
        const bt = block.blockType;
        // Full-width blocks
        const isFullWidth = ["title", "text", "askAI", "embed", "testimonials", "bestSellers", "shoppablePost", "shopByCategory"].includes(bt)
          || (bt === "image" && (Number(block.imageWidthPct || block.widthPct || 50) >= 100))
          || (bt === "link" && (Number(block.widthPct || 50) >= 100))
          || (bt === "button" && (Number(block.widthPct || 50) >= 100));

        const el = renderBlock(block, i, autoTheme, isDark);
        if (!el) return null;

        return (
          <div key={block.id || `b-${i}`} style={{ gridColumn: isFullWidth ? "1 / -1" : "auto" }}>
            {el}
          </div>
        );
      })}
    </div>
  );
}
