// ── Auto-theme system (ported from bioEditorConstants.js) ──────────────────

function hexToRgb(hex: string) {
  const h = (hex || "").replace("#", "");
  if (h.length < 6) return null;
  return { r: parseInt(h.substring(0, 2), 16), g: parseInt(h.substring(2, 4), 16), b: parseInt(h.substring(4, 6), 16) };
}

function luminance(r: number, g: number, b: number) { return r * 0.299 + g * 0.587 + b * 0.114; }
function rgbToHex(r: number, g: number, b: number) { return "#" + [r, g, b].map(c => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join(""); }
function darken(hex: string, amount: number) { const c = hexToRgb(hex); if (!c) return hex; return rgbToHex(c.r * (1 - amount), c.g * (1 - amount), c.b * (1 - amount)); }
function lighten(hex: string, amount: number) { const c = hexToRgb(hex); if (!c) return hex; return rgbToHex(c.r + (255 - c.r) * amount, c.g + (255 - c.g) * amount, c.b + (255 - c.b) * amount); }

const BG_ACCENT_MAP: Record<string, string> = {
  "": "#1a1a1a", "#ffffff": "#1a1a1a", "#f5f5f5": "#1a1a1a",
  "#f8e8e8": "#c2636a", "#f5f0e8": "#b8860b", "#e8f5f0": "#0d9373",
  "#d6e9f8": "#1a1a1a", "#4a9c8c": "#ffffff", "#1a1a2e": "#a78bfa",
  "#2d3436": "#48dbfb", "#f4efe7": "#1a1a1a", "#000000": "#DEFB01",
  "#ff0545": "#d90038", "#ff6a8d": "#e0325a", "#ff8c1f": "#e06b00",
  "#8b5cf6": "#6d3bd4", "#14b8a6": "#0d8f7f", "#e8eef8": "#0087DF",
  "#f6f8fb": "#0087DF", "#f1dbf1": "#D36DFF",
};

const BG_CARD_MAP: Record<string, string> = {
  "#d6e9f8": "#EFF6FC", "#f8e8e8": "#FDF4F4",
  "#f5f0e8": "#FAF7F2", "#e8f5f0": "#F2FAF7",
};

const BG_FORCE_BUTTON_TEXT: Record<string, string> = {
  "#f1dbf1": "#ffffff", "#000000": "#000000",
};

export interface AutoTheme {
  textColor: string;
  accentColor: string;
  cardBg: string;
  cardBorder: string;
  buttonBg: string;
  buttonText: string;
  cardButtonBg: string;
  cardButtonText: string;
}

export function deriveAutoTheme(pageBg: string): AutoTheme {
  const bg = (pageBg || "").trim();
  const hexMatch = bg.match(/#([0-9a-fA-F]{6})/);
  const primaryHex = hexMatch ? `#${hexMatch[1]}` : "";
  const rgb = hexToRgb(primaryHex);
  const lum = rgb ? luminance(rgb.r, rgb.g, rgb.b) : 200;
  const isDark = lum < 100;

  let accentColor = BG_ACCENT_MAP[bg] || BG_ACCENT_MAP[bg.toLowerCase()] || BG_ACCENT_MAP[primaryHex] || BG_ACCENT_MAP[primaryHex.toLowerCase()];
  if (!accentColor) {
    accentColor = isDark ? lighten(primaryHex, 0.7) : darken(primaryHex, 0.55);
  }

  const forceButtonText = BG_FORCE_BUTTON_TEXT[primaryHex] || BG_FORCE_BUTTON_TEXT[primaryHex.toLowerCase()] || null;
  const accentRgb = hexToRgb(accentColor);
  const accentLum = accentRgb ? luminance(accentRgb.r, accentRgb.g, accentRgb.b) : 200;
  const cardButtonBg = (accentLum > 200 && !isDark) ? (primaryHex || "#1a1a1a") : accentColor;
  const cbRgb = hexToRgb(cardButtonBg) || { r: 26, g: 26, b: 26 };
  const cardButtonText = forceButtonText || (luminance(cbRgb.r, cbRgb.g, cbRgb.b) > 180 ? "#1a1a1a" : "#ffffff");

  if (isDark) {
    return {
      textColor: "#ffffff",
      accentColor,
      cardBg: "rgba(255,255,255,0.06)",
      cardBorder: "rgba(255,255,255,0.1)",
      buttonBg: accentColor,
      buttonText: forceButtonText || (accentLum > 180 ? "#1a1a1a" : "#ffffff"),
      cardButtonBg,
      cardButtonText,
    };
  }

  const tintedCardBg = BG_CARD_MAP[primaryHex.toLowerCase()] || BG_CARD_MAP[bg.toLowerCase()] || "#ffffff";

  return {
    textColor: "#1a1a1a",
    accentColor,
    cardBg: tintedCardBg,
    cardBorder: tintedCardBg === "#ffffff" ? "#f0f0f0" : darken(tintedCardBg, 0.06),
    buttonBg: accentColor,
    buttonText: forceButtonText || (accentLum > 150 ? "#1a1a1a" : "#ffffff"),
    cardButtonBg,
    cardButtonText,
  };
}

export function isAutoColor(val: unknown): boolean {
  return val === "auto";
}

export const socialIcons: Record<string, string> = {
  instagram: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z",
  tiktok: "M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z",
  youtube: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z",
  twitter: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  facebook: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  linkedin: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  threads: "M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.59 12c.025 3.086.718 5.496 2.057 7.164 1.432 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.19.408-2.285 1.331-3.085.88-.764 2.10-1.207 3.43-1.248 1.07-.033 2.04.093 2.916.358-.034-1.107-.39-1.95-1.064-2.507-.739-.61-1.82-.918-3.212-.918h-.088c-1.151.01-2.095.313-2.806.9l-1.374-1.535C8.357 4.461 9.658 4.024 11.22 4h.115c1.94 0 3.453.52 4.496 1.543.982.964 1.5 2.324 1.54 4.041.56.165 1.074.378 1.535.645 1.15.665 2.03 1.598 2.543 2.77.836 1.91.772 4.652-1.265 6.646-1.775 1.737-4.001 2.488-7.198 2.513h-.008z",
  substack: "M22 3.16V5.3H2V3.16h20zM2 8.47h20v2.13H2V8.47zm0 5.31h20V24l-10-5.63L2 24V13.78z",
};

export const socialColors: Record<string, string> = {
  instagram: "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
  tiktok: "#000000", youtube: "#FF0000", twitter: "#000000",
  facebook: "#1877F2", linkedin: "#0A66C2", threads: "#000000", substack: "#FF6719",
};
