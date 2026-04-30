"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import brand from "@/config/brand";
import { deriveAutoTheme } from "@/lib/theme";

// Static label for the small pill above the hero headline.
const STATIC_TAGLINE = "Your Personal Style Editor";

// Fallback phrases for the big italic typewriter line when no dynamic
// suggested chips are available from KB / askAi config.
const DEFAULT_CHIP_PHRASES = [
  "Product recommendations",
  "Best option for me",
  "Trending",
];

interface Props {
  slug: string;
  name: string;
  avatar: string;
  bio: string;
  backgroundColor: string;
  kbHandle: string | null;
  apiBaseUrl: string;
  kbBaseUrl: string;
  kbApiKey: string;
  askAi: { aiName: string; questionPlaceholder: string; suggestedQuestions: string; textColor: string } | null;
}

// Mix two hex colors: returns rgba string with alpha applied to color a over b.
function withAlpha(hex: string, alpha: number): string {
  const m = (hex || "").match(/#?([0-9a-fA-F]{6})/);
  if (!m) return hex;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function isHexDark(hex: string): boolean {
  const m = (hex || "").match(/#?([0-9a-fA-F]{6})/);
  if (!m) return false;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) < 128;
}

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: Array<{ id?: string; title?: string; image_url?: string; price?: string; url?: string; brand?: string }>;
  feedback?: "up" | "down" | null;
}

// One row in the sidebar's "Recents" list. Lives in component state only —
// no cookies / localStorage / sessionStorage — so a hard refresh wipes the
// list, which matches the requested behaviour.
interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
}

// Pull a sensible label out of the first user message. Falls back to a
// generic placeholder when the chat hasn't received a real prompt yet.
function deriveSessionTitle(messages: ChatMessage[]): string {
  const firstUser = messages.find((m) => m.role === "user");
  const raw = (firstUser?.content || "").trim().replace(/\s+/g, " ");
  if (!raw) return "New chat";
  return raw.length > 38 ? raw.slice(0, 38) + "…" : raw;
}

// Footer link config — minimal "Join {brand}" pill + dot-separated legal links.
const FOOTER_LINKS: Array<{ label: string; href: string }> = [
  { label: "Report",  href: "https://kevo.store/report" },
  { label: "Privacy", href: "https://kevo.store/privacy-policy" },
];

// ── Theme gradient using profile bg + accent (no fade-to-white) ──
function buildHeroGradient(bg: string, accent: string, dark: boolean): string {
  const baseBg = bg || "#FBFAF8";
  // Subtle accent wash at top fading into the page bg, so the theme reads through.
  const accentTop = withAlpha(accent, dark ? 0.22 : 0.32);
  const accentMid = withAlpha(accent, dark ? 0.10 : 0.14);
  return `linear-gradient(180deg, ${accentTop} 0%, ${accentMid} 35%, ${baseBg} 100%)`;
}

// ── Visitor ID ──
function getVisitorId(): string {
  const key = "visitor_id";
  let id = "";
  try { id = localStorage.getItem(key) || ""; } catch { /* */ }
  if (!id) {
    id = `v_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    try { localStorage.setItem(key, id); } catch { /* */ }
  }
  return id;
}

export default function AskPage({ slug, name, avatar, bio, backgroundColor, kbHandle, apiBaseUrl, kbBaseUrl, kbApiKey, askAi }: Props) {
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId] = useState(() => `ask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
  // Sidebar chat history. In-memory only — refreshing the page resets the list,
  // matching the requested behaviour. Each chat session = one entry in the
  // sidebar's "Recents" list.
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  // Sidebar open/closed. Default open on desktop; the floating restore button
  // is what brings it back after a collapse.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Theme tokens derived from profile bg (matches ProfilePage SPA palette) ──
  // askAi.textColor wins if explicitly set in admin, otherwise fall back to derived accent.
  const autoTheme = deriveAutoTheme(backgroundColor);
  const accent = (askAi?.textColor && /^#[0-9a-fA-F]{6}$/.test(askAi.textColor)) ? askAi.textColor : autoTheme.accentColor;
  const isDark = isHexDark(backgroundColor);
  const textColor = autoTheme.textColor;
  const mutedText = isDark ? "rgba(255,255,255,0.7)" : "rgba(17,24,39,0.7)";
  const subtleText = isDark ? "rgba(255,255,255,0.55)" : "rgba(17,24,39,0.55)";
  const cardBg = isDark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)";
  const cardBorder = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)";
  // Dark-theme chip styling tuned a notch brighter than the older 0.08/0.18
  // pair — the previous values were nearly invisible against a near-black
  // gradient (e.g. the fitness/Kept theme), making the chip row fade out.
  const chipBg = isDark ? "rgba(255,255,255,0.12)" : "#fff";
  const chipBorder = isDark ? "rgba(255,255,255,0.25)" : "#e5e7eb";
  const chipHoverBg = isDark ? "rgba(255,255,255,0.18)" : "#f9fafb";
  const userBubbleBg = accent;
  const userBubbleText = isHexDark(accent) ? "#ffffff" : "#111827";
  const assistantBubbleBg = isDark ? "rgba(255,255,255,0.10)" : "#F3F4F6";
  const sendDisabledBg = withAlpha(accent, 0.4);
  const headerBg = isDark ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.7)";

  // On dark themes the accent-tinted gradient (green→black for Kept etc.)
  // washed out the heading & chips. Use a solid theme bg for dark profiles
  // so the content sits on a flat surface; light profiles keep the subtle
  // accent wash that gives them their character.
  const heroGradient = isDark
    ? (backgroundColor || "#000000")
    : buildHeroGradient(backgroundColor, accent, isDark);

  // Rotating typewriter state — phrase source is wired below (see effect).
  const [taglineDisplay, setTaglineDisplay] = useState("");

  // Header nav: Home → brand site, profile name → public profile page, ask →
  // current page (so the user can always re-open a fresh chat). External links
  // open in a new tab; in-app links replace the current view.
  const navLinks = [
    { label: "Home", href: brand.siteUrl, external: true },
    { label: name, href: `/${slug}`, external: false },
    { label: "Ask", href: `/${slug}/ask`, external: false },
  ];

  // Hint chips — fetched from Knowledge Base /api/creator/{handle} (hint_chips field)
  // No localStorage — every browser/visitor gets fresh chips for this creator.
  const [hintChips, setHintChips] = useState<string[]>([]);

  useEffect(() => {
    const creator = kbHandle || slug;
    if (!creator) return;
    let cancelled = false;
    fetch(`${kbBaseUrl}/api/creator/${encodeURIComponent(creator)}`, {
      headers: { "X-API-Key": kbApiKey, "ngrok-skip-browser-warning": "true" },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        const raw = data?.hint_chips;
        if (Array.isArray(raw) && raw.length > 0) {
          setHintChips(raw.map((c: unknown) => typeof c === "string" ? c : ((c as { text?: string })?.text || "")).filter(Boolean).slice(0, 4));
        }
      })
      .catch(() => { /* ignore — fall back to suggestedQuestions */ });
    return () => { cancelled = true; };
  }, [kbHandle, slug, kbBaseUrl, kbApiKey]);

  // Resolve chips: KB API hint_chips > askAi.suggestedQuestions > defaults.
  // useMemo keeps the array reference stable across renders so the typewriter
  // useEffect (which depends on `chips`) doesn't restart every render.
  const chips: string[] = useMemo(() => {
    if (hintChips.length > 0) return hintChips;
    if (askAi?.suggestedQuestions) {
      try {
        const parsed = JSON.parse(askAi.suggestedQuestions);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4);
      } catch { /* ignore */ }
    }
    return DEFAULT_CHIP_PHRASES;
  }, [hintChips, askAi?.suggestedQuestions]);

  // Typewriter cycles through whatever `chips` currently resolves to —
  // dynamic suggested questions when KB / askAi has them, defaults otherwise.
  // Re-runs when chips change (e.g. when KB fetch resolves) so the rotation
  // immediately picks up the live suggestions.
  useEffect(() => {
    const phrases = chips.length > 0 ? chips : DEFAULT_CHIP_PHRASES;
    let charIndex = 0;
    let phraseIndex = 0;
    let isDeleting = false;
    let timeout: ReturnType<typeof setTimeout>;

    const tick = () => {
      const phrase = phrases[phraseIndex] || "";
      if (!isDeleting) {
        charIndex++;
        setTaglineDisplay(phrase.slice(0, charIndex));
        if (charIndex >= phrase.length) {
          timeout = setTimeout(() => { isDeleting = true; tick(); }, 1900);
          return;
        }
        timeout = setTimeout(tick, 75);
      } else {
        charIndex--;
        setTaglineDisplay(phrase.slice(0, charIndex));
        if (charIndex <= 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timeout = setTimeout(tick, 350);
          return;
        }
        timeout = setTimeout(tick, 45);
      }
    };

    timeout = setTimeout(tick, 500);
    return () => clearTimeout(timeout);
  }, [chips]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  // ── Sidebar history sync ────────────────────────────────────────────────
  // Whenever the active conversation's messages change, mirror them into the
  // matching session in `sessions`. If no session is active yet, this is the
  // first message of a brand-new chat — create a session and pin it as
  // current. Title is re-derived each tick so the sidebar entry updates as
  // soon as the user types their first prompt.
  useEffect(() => {
    if (messages.length === 0) return;
    if (!currentSessionId) {
      const id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      setSessions((prev) => [
        { id, title: deriveSessionTitle(messages), messages: [...messages], createdAt: Date.now() },
        ...prev,
      ]);
      setCurrentSessionId(id);
    } else {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === currentSessionId
            ? { ...s, messages: [...messages], title: deriveSessionTitle(messages) }
            : s,
        ),
      );
    }
    // currentSessionId is intentionally read directly (not a dep) — the effect
    // is keyed on `messages` because that's the source of truth for "did this
    // chat just change". Including currentSessionId would re-fire on every
    // session switch and clobber loaded history with current messages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const startNewChat = useCallback(() => {
    // Cancel any in-flight stream before resetting — otherwise the response
    // for the previous chat would land in the new (empty) one.
    if (abortRef.current) abortRef.current.abort();
    setIsTyping(false);
    setMessages([]);
    setCurrentSessionId(null);
    setChatInput("");
  }, []);

  const loadSession = useCallback((id: string) => {
    if (id === currentSessionId) return;
    if (abortRef.current) abortRef.current.abort();
    setIsTyping(false);
    const target = sessions.find((s) => s.id === id);
    if (!target) return;
    setMessages([...target.messages]);
    setCurrentSessionId(id);
    setChatInput("");
  }, [sessions, currentSessionId]);

  // ── Send message (streaming) ──
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const creator = kbHandle || slug;
    // Touch visitor id so it persists for the session (used by analytics on the KB side).
    getVisitorId();

    // Push user message AND empty assistant placeholder synchronously, so the
    // 3-dot loader (which keys off the trailing empty assistant message) shows
    // immediately during the network wait — not only once tokens start streaming.
    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "" },
    ]);
    setChatInput("");
    setIsTyping(true);

    // Helper: replace the trailing empty assistant placeholder.
    const updateAssistant = (patch: Partial<ChatMessage>) => {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = { ...last, ...patch };
        }
        return updated;
      });
    };

    try {
      abortRef.current = new AbortController();
      const res = await fetch(`${kbBaseUrl}/api/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": kbApiKey,
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          message: trimmed,
          creator,
          session_id: sessionId,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        updateAssistant({ content: "Sorry, something went wrong. Please try again." });
        return;
      }

      // Check content type — streaming or regular JSON
      const contentType = res.headers.get("content-type") || "";
      const isStreaming = contentType.includes("text/event-stream") || contentType.includes("text/plain");

      if (isStreaming && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let products: ChatMessage["products"] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (!jsonStr) continue;
            try {
              const data = JSON.parse(jsonStr);
              if (data.type === "token") {
                fullContent += data.content || "";
                updateAssistant({ content: fullContent });
              } else if (data.type === "done") {
                fullContent = data.content || fullContent;
                if (data.products) products = data.products;
                updateAssistant({ content: fullContent, products: products?.length ? products : undefined });
              } else if (data.type === "products" && data.products) {
                products = data.products;
                updateAssistant({ products });
              }
            } catch { /* skip malformed */ }
          }
        }

        // Final products update
        if (products && products.length > 0) {
          updateAssistant({ products });
        }
      } else {
        // Regular JSON response (non-streaming)
        const data = await res.json();
        const responseText = data.response || data.message || data.content || "Sorry, I could not process that.";
        const products = data.products || [];
        updateAssistant({ content: responseText, products: products.length ? products : undefined });
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        updateAssistant({ content: "Sorry, something went wrong. Please try again." });
      }
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, kbHandle, slug, sessionId, kbBaseUrl, kbApiKey]);

  const hasMessages = messages.length > 0;

  return (
    <div style={{
      // Outer shell: sidebar (history) + main content split horizontally.
      // `position: relative` anchors the floating collapse button (which sits
      // on the sidebar↔main border) against this container.
      height: "100vh", display: "flex", flexDirection: "row",
      fontFamily: "var(--font-body), system-ui, -apple-system, sans-serif",
      overflow: "hidden",
      background: heroGradient,
      position: "relative",
    }}>
      {/* ══ SIDEBAR (chat history) ══
          Outer <aside> handles width animation; inner content always renders
          at 260px so labels don't reflow during the slide. `overflow: hidden`
          on the outer clips that fixed-width content while collapsed. */}
      <aside
        className="ask-sidebar"
        style={{
          width: sidebarOpen ? 260 : 0,
          flexShrink: 0,
          overflow: "hidden",
          transition: "width 0.28s cubic-bezier(0.4, 0, 0.2, 1)",
          background: isDark ? "rgba(0,0,0,0.32)" : "rgba(255,255,255,0.55)",
          borderRight: sidebarOpen ? `1px solid ${cardBorder}` : "none",
          backdropFilter: "blur(10px)",
        }}
      >
        <div style={{ width: 260, height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "14px 12px 8px" }}>
            <button
              type="button"
              onClick={startNewChat}
              style={{
                width: "90%", padding: "10px 14px", borderRadius: 10,
                border: `1px solid ${cardBorder}`, background: chipBg,
                cursor: "pointer", fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 10,
                color: textColor, fontSize: 13, fontWeight: 600,
                transition: "background 0.15s, border-color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = chipHoverBg; e.currentTarget.style.borderColor = withAlpha(accent, 0.4); }}
              onMouseLeave={(e) => { e.currentTarget.style.background = chipBg; e.currentTarget.style.borderColor = cardBorder; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              New chat
            </button>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "8px 8px 16px" }}>
            {sessions.length > 0 ? (
              <>
                <div style={{
                  fontSize: 10, fontWeight: 700, color: subtleText,
                  textTransform: "uppercase", letterSpacing: "0.6px",
                  padding: "8px 10px 6px",
                }}>
                  Recents
                </div>
                {sessions.map((s) => {
                  const active = s.id === currentSessionId;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => loadSession(s.id)}
                      title={s.title}
                      style={{
                        width: "100%", padding: "8px 10px", borderRadius: 8,
                        border: "none",
                        background: active ? withAlpha(accent, isDark ? 0.22 : 0.14) : "transparent",
                        cursor: "pointer", textAlign: "left",
                        color: active ? textColor : mutedText,
                        fontSize: 13, fontWeight: active ? 600 : 500,
                        fontFamily: "inherit",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                        display: "block",
                        marginBottom: 2,
                        transition: "background 0.12s",
                      }}
                      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = chipHoverBg; }}
                      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
                    >
                      {s.title}
                    </button>
                  );
                })}
              </>
            ) : (
              <div style={{ padding: "8px 10px", fontSize: 12, color: subtleText, lineHeight: 1.5 }}>
                Your chats will appear here.
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* "Border-tab" collapse button — small round chevron that sits centred
          on the sidebar↔main divider line. Lives outside <aside> so it isn't
          clipped by the sidebar's overflow:hidden during the width animation. */}
      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          aria-label="Collapse sidebar"
          title="Collapse sidebar"
          className="ask-sidebar-edge-toggle"
          style={{
            position: "absolute",
            // Anchor on the right edge of the sidebar (260px) and pull half
            // the button width back so it straddles the border line.
            // Sits up near the top — roughly aligned with the New Chat button
            // for a cleaner header strip.
            left: 260 - 14, top: 22,
            width: 28, height: 28, borderRadius: "50%",
            border: `1px solid ${cardBorder}`, background: cardBg,
            cursor: "pointer", color: mutedText,
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 5,
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            transition: "background 0.15s, color 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = chipHoverBg; e.currentTarget.style.color = textColor; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = cardBg; e.currentTarget.style.color = mutedText; }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}

      {/* Floating restore button — only visible while the sidebar is closed.
          Positioned absolute over the main column's top-left so it doesn't
          shove the brand logo / header content around. The headers reserve
          extra left padding when sidebarOpen=false (see headers below) so the
          brand logo doesn't sit underneath this button. */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
          title="Open sidebar"
          style={{
            position: "fixed", top: 14, left: 14, zIndex: 50,
            width: 36, height: 36, borderRadius: 10,
            border: `1px solid ${cardBorder}`, background: cardBg,
            backdropFilter: "blur(10px)",
            cursor: "pointer", color: textColor,
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            transition: "background 0.15s",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = chipHoverBg; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = cardBg; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
      )}

      {/* Responsive overrides — sidebar is hidden on mobile (chat takes the
          full screen) and the header / footer drop their generous desktop
          padding so content isn't pushed off-screen at small widths.
          Tablet (≤900px) gets a milder reduction; phone (≤640px) gets the
          tightest. !important is needed because the same properties are also
          set inline on the elements. */}
      <style>{`
        @media (max-width: 900px) {
          .ask-hero-header { padding: 16px 22px !important; }
          .ask-chat-header { padding: 14px 22px !important; }
          .ask-footer { padding: 24px 18px 16px !important; }
          .ask-footer-inner { padding: 0 !important; }
        }
        @media (max-width: 640px) {
          .ask-sidebar { display: none !important; }
          .ask-sidebar-edge-toggle { display: none !important; }
          .ask-hero-header { padding: 14px 16px !important; }
          .ask-chat-header { padding: 12px 16px !important; }
          .ask-footer { padding: 20px 16px 14px !important; }
          .ask-footer-inner { padding: 0 !important; }
        }
      `}</style>

      {/* ══ MAIN COLUMN ══ */}
      <div style={{
        flex: 1, minWidth: 0, height: "100vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
      }}>

      {/* ══ BANNER (header + hero, only when no messages) ══ */}
      {!hasMessages && (
        <div style={{ background: heroGradient, flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          {/* Header */}
          <header className="ask-hero-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: sidebarOpen ? "20px 36px" : "20px 36px 20px 70px", margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: userBubbleText, fontSize: 13, fontWeight: 800 }}>{name.charAt(0).toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{name} AI</span>
            </div>
            <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {navLinks.map((l, i) => (
                <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <a
                    href={l.href}
                    target={l.external ? "_blank" : undefined}
                    rel={l.external ? "noopener noreferrer" : undefined}
                    style={{ fontSize: 13, color: mutedText, textDecoration: "none", fontWeight: 500 }}
                  >
                    {l.label}
                  </a>
                  {i < navLinks.length - 1 && (
                    <span style={{ fontSize: 13, color: subtleText, fontWeight: 400 }}>/</span>
                  )}
                </span>
              ))}
            </nav>
          </header>

          {/* Hero */}
          <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 60px", textAlign: "center" }}>
            {/* Static tagline pill — single fixed label, no rotation. */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 20px", borderRadius: 50, border: `1px solid ${withAlpha(accent, 0.25)}`, background: cardBg, fontSize: 13, fontWeight: 500, color: mutedText, marginBottom: 36, backdropFilter: "blur(6px)", minHeight: 28 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: accent, flexShrink: 0 }} />
              <span>{STATIC_TAGLINE}</span>
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 800, color: textColor, margin: "0 0 8px", lineHeight: 1.12, letterSpacing: "-0.8px" }}>
              Hi, I&apos;m {name} AI
            </h1>
            {/* Italic + background-clip:text was clipping the `?` descender
                because the default <p> line-height is too tight. Generous
                lineHeight + a sliver of paddingBottom give the glyph room
                without disturbing layout. */}
            <p style={{
              fontSize: 38, fontWeight: 700, margin: "0 0 48px",
              lineHeight: 1.25,
              paddingBottom: 6,
              background: `linear-gradient(90deg, ${accent}, ${textColor})`,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              padding: "0 4px",
              fontStyle: "italic", letterSpacing: "-0.3px",
              minHeight: "1.25em",
            }}>
              Ask {name} for &lsquo;{taglineDisplay || "\u00A0"}&rsquo;.
            </p>

            {/* Initial chat widget — card with input only */}
            <div style={{
              width: "100%", maxWidth: 540,
              background: cardBg, borderRadius: 20,
              border: `1px solid ${cardBorder}`,
              boxShadow: isDark ? "0 12px 48px rgba(0,0,0,0.4)" : "0 12px 48px rgba(0,0,0,0.06)",
              backdropFilter: "blur(12px)",
              padding: "20px 22px 16px",
            }}>
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput); }}>
                {/* Input row: textarea fills width, send button sits inline on the right.
                    `alignItems: center` keeps the placeholder/text vertically aligned with
                    the round button. Textarea is 1 row by default — it grows downward as
                    the user types, but the button stays centered with the visible line. */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                    placeholder={askAi?.questionPlaceholder || `Ask ${name} about brands, outfit advice, or product reviews...`}
                    rows={1}
                    disabled={isTyping}
                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 14, padding: 0, background: "transparent", color: textColor, fontFamily: "inherit", resize: "none", lineHeight: 1.6 }}
                  />
                  <button type="submit" disabled={isTyping || !chatInput.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: isTyping || !chatInput.trim() ? sendDisabledBg : accent, cursor: isTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={userBubbleText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
            {/* Chip row — sits OUTSIDE the input card, on the gradient bg.
                Same flex/wrap behavior, just unanchored from the card so the
                card itself stays minimal. */}
            {chips.length > 0 && (
              <div style={{
                width: "100%", maxWidth: 540,
                display: "flex", flexWrap: "wrap", gap: 8,
                justifyContent: "center",
                marginTop: 14,
              }}>
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => !isTyping && sendMessage(c)}
                    title={c}
                    style={{
                      padding: "7px 14px", borderRadius: 50,
                      border: `1px solid ${chipBorder}`, background: chipBg,
                      fontSize: 12, color: mutedText, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = chipHoverBg; e.currentTarget.style.borderColor = withAlpha(accent, 0.4); }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = chipBg; e.currentTarget.style.borderColor = chipBorder; }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Featured question card — currently scoped to the "kept" profile.
                Sits below the suggested-question chips with a subtle label,
                the question itself, and an arrow that hints at navigation.
                Whole card is the link target so the click area is generous. */}
            {slug === "kept" && (
              <a
                href="https://kevo.store/kept/ask/best-red-lipstick-for-olive-skin"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: "100%", maxWidth: 540,
                  marginTop: 43,
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 16px",
                  borderRadius: 14,
                  border: `1px solid ${chipBorder}`, background: cardBg,
                  textDecoration: "none",
                  backdropFilter: "blur(6px)",
                  transition: "background 0.15s, border-color 0.15s, transform 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = chipHoverBg;
                  e.currentTarget.style.borderColor = withAlpha(accent, 0.4);
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = cardBg;
                  e.currentTarget.style.borderColor = chipBorder;
                }}
              >
                <span style={{
                  flexShrink: 0,
                  width: 32, height: 32, borderRadius: 10,
                  background: withAlpha(accent, isDark ? 0.22 : 0.16),
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: accent,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                </span>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: subtleText,
                    textTransform: "uppercase", letterSpacing: "0.6px",
                  }}>
                    Try asking
                  </span>
                  <span style={{ fontSize: 13, color: textColor, fontWeight: 500, lineHeight: 1.4 }}>
                    What shade of red lipstick is best for my warm olive skin?
                  </span>
                </span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mutedText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <line x1="7" y1="17" x2="17" y2="7" />
                  <polyline points="7 7 17 7 17 17" />
                </svg>
              </a>
            )}
          </section>
        </div>
      )}

      {/* ══ CHAT MODE — fixed header, scrollable messages, fixed input ══ */}
      {hasMessages && (
        <>
          {/* Fixed top header */}
          <header className="ask-chat-header" style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: sidebarOpen ? "16px 36px" : "16px 36px 16px 70px", borderBottom: `1px solid ${cardBorder}`, background: headerBg, backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: userBubbleText, fontSize: 13, fontWeight: 800 }}>{name.charAt(0).toUpperCase()}</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: textColor }}>{name} AI</span>
            </div>
            <nav style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {navLinks.map((l, i) => (
                <span key={l.label} style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
                  <a
                    href={l.href}
                    target={l.external ? "_blank" : undefined}
                    rel={l.external ? "noopener noreferrer" : undefined}
                    style={{ fontSize: 13, color: mutedText, textDecoration: "none", fontWeight: 500 }}
                  >
                    {l.label}
                  </a>
                  {i < navLinks.length - 1 && (
                    <span style={{ fontSize: 13, color: subtleText, fontWeight: 400 }}>/</span>
                  )}
                </span>
              ))}
            </nav>
          </header>

          {/* Scrollable messages area — only this scrolls */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 760, padding: "24px 24px 32px", display: "flex", flexDirection: "column" }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    {/* User bubble (right) */}
                    {msg.role === "user" && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                          maxWidth: "78%", padding: "10px 14px", borderRadius: 12,
                          fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                          background: userBubbleBg, color: userBubbleText,
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    )}
                    {/* Assistant — avatar + bubble */}
                    {msg.role === "assistant" && (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        {/* Avatar */}
                        <div style={{ width: 28, height: 28, borderRadius: "50%", overflow: "hidden", flexShrink: 0, marginTop: 2 }}>
                          {avatar ? (
                            <img src={avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: userBubbleText }}>{name.charAt(0)}</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Bubble — only renders when there's content. Dots show separately before content arrives. */}
                          {msg.content && (
                            <div style={{
                              padding: "10px 14px", borderRadius: 12,
                              fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                              background: assistantBubbleBg, color: textColor,
                              alignSelf: "flex-start", maxWidth: "100%",
                            }}>
                              {msg.content}
                            </div>
                          )}
                          {/* Loading dots — only when no content yet AND streaming (last assistant msg) */}
                          {!msg.content && isTyping && i === messages.length - 1 && (
                            <div style={{
                              padding: "12px 14px", borderRadius: 12,
                              background: assistantBubbleBg,
                              alignSelf: "flex-start",
                              display: "inline-flex", alignItems: "center", gap: 5,
                            }}>
                              {[0, 1, 2].map((d) => (
                                <span key={d} className="ask-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: subtleText, display: "inline-block", animationDelay: `${d * 0.18}s` }} />
                              ))}
                            </div>
                          )}

                          {/* Products grid */}
                          {Array.isArray(msg.products) && msg.products.length > 0 && (
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
                              {msg.products.map((p, pi) => {
                                const rawImg = p?.image_url || "";
                                const imgSrc = rawImg && /^https?:\/\//i.test(rawImg) ? rawImg : rawImg ? `https://api-v1.kevo.store${rawImg.startsWith("/") ? "" : "/"}${rawImg}` : "";
                                return (
                                  <div key={pi} style={{ border: `1px solid ${chipBorder}`, borderRadius: 10, overflow: "hidden", background: chipBg, display: "flex", flexDirection: "column" }}>
                                    <div style={{ background: assistantBubbleBg, display: "grid", placeItems: "center", aspectRatio: "1/1" }}>
                                      {imgSrc ? <img src={imgSrc} alt={p?.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: 12, color: subtleText }}>No image</div>}
                                    </div>
                                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                                      <div style={{ fontSize: 10, color: subtleText }}>{p?.brand || (() => { try { return new URL(p?.url || "").hostname; } catch { return ""; } })()}</div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: textColor, lineHeight: 1.3 }}>{p?.title || "Product"}</div>
                                      <div style={{ fontSize: 18, fontWeight: 800, color: accent }}>{p?.price || ""}</div>
                                      {p?.url && (
                                        <a href={p.url} target="_blank" rel="noreferrer" style={{ marginTop: "auto", textDecoration: "none", display: "block", textAlign: "center", background: accent, color: userBubbleText, fontWeight: 700, borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
                                          Shop Now
                                        </a>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Feedback */}
                          {msg.content && !(isTyping && i === messages.length - 1) && (
                            <div style={{ display: "flex", gap: 2 }}>
                              <button type="button" onClick={() => setMessages((prev) => prev.map((m, mi) => mi === i ? { ...m, feedback: m.feedback === "up" ? null : "up" } : m))} style={{ padding: 3, border: "none", background: "none", cursor: "pointer", opacity: msg.feedback === "up" ? 1 : 0.35, display: "flex" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill={msg.feedback === "up" ? textColor : "none"} stroke={textColor} strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
                              </button>
                              <button type="button" onClick={() => setMessages((prev) => prev.map((m, mi) => mi === i ? { ...m, feedback: m.feedback === "down" ? null : "down" } : m))} style={{ padding: 3, border: "none", background: "none", cursor: "pointer", opacity: msg.feedback === "down" ? 1 : 0.35, display: "flex" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill={msg.feedback === "down" ? textColor : "none"} stroke={textColor} strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" /></svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Fixed input bar at bottom of viewport */}
          <div style={{ flexShrink: 0, backdropFilter: "blur(12px)", padding: "20px 24px 24px" }}>
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput); }}
              style={{
                width: "100%", maxWidth: 760, margin: "0 auto",
                background: cardBg, borderRadius: 16,
                border: `1px solid ${cardBorder}`,
                boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.04)",
                padding: "12px 16px",
              }}
            >
              {/* Same shape as the hero card — textarea + send sit in one row,
                  chips wrap underneath. No more bottom action bar. */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                  placeholder={askAi?.questionPlaceholder || `Ask ${name} about brands, outfit advice, or product reviews...`}
                  rows={1}
                  disabled={isTyping}
                  style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 14, padding: 0, background: "transparent", color: textColor, fontFamily: "inherit", resize: "none", lineHeight: 1.6 }}
                />
                <button type="submit" disabled={isTyping || !chatInput.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: isTyping || !chatInput.trim() ? sendDisabledBg : accent, cursor: isTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={userBubbleText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </form>
            {/* Chip row — sits OUTSIDE the input card, on the bottom bar bg.
                Mirrors the hero card placement so both states behave the same. */}
            {chips.length > 0 && (
              <div style={{
                width: "100%", maxWidth: 760, margin: "0 auto",
                display: "flex", flexWrap: "wrap", gap: 8,
                justifyContent: "center",
                marginTop: 12,
              }}>
                {chips.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => !isTyping && sendMessage(c)}
                    title={c}
                    style={{
                      padding: "7px 14px", borderRadius: 50,
                      border: `1px solid ${chipBorder}`, background: chipBg,
                      fontSize: 12, color: mutedText, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit",
                      whiteSpace: "nowrap",
                      transition: "background 0.15s, border-color 0.15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = chipHoverBg; e.currentTarget.style.borderColor = withAlpha(accent, 0.4); }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = chipBg; e.currentTarget.style.borderColor = chipBorder; }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Pulse animation */}
      <style>{`
        @keyframes askPulse { 0%,80%,100% { opacity:.3; transform:scale(.8); } 40% { opacity:1; transform:scale(1.2); } }
        @keyframes askCursorBlink { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }
        .ask-dot { animation: askPulse 1.2s ease-in-out infinite; }
        /* Hide horizontal scrollbar on chip row but keep scroll behavior */
        .ask-chip-row { scrollbar-width: none; -ms-overflow-style: none; }
        .ask-chip-row::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ══ FOOTER (only shown on hero state, hidden in chat mode) ══ */}
      {!hasMessages && (
        <footer
          className="ask-footer"
          style={{
            flexShrink: 0,
            padding: "20px 16px 32px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <a
            href={brand.siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "12px 28px",
              backgroundColor: "#ffffff",
              color: "#111827",
              borderRadius: 50,
              textDecoration: "none",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.01em",
              boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
            }}
          >
            Join {brand.name}
          </a>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "4px 8px" }}>
            {FOOTER_LINKS.map((link, i) => (
              <span key={link.label} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: mutedText, textDecoration: "none" }}
                >
                  {link.label}
                </a>
                {i < FOOTER_LINKS.length - 1 && (
                  <span style={{ fontSize: 12, color: subtleText }}>·</span>
                )}
              </span>
            ))}
          </div>
        </footer>
      )}
      </div>{/* end main column */}
    </div>
  );
}
