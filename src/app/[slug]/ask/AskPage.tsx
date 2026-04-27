"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import brand from "@/config/brand";

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

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  products?: Array<{ id?: string; title?: string; image_url?: string; price?: string; url?: string; brand?: string }>;
  feedback?: "up" | "down" | null;
}

const NAV_LINKS = ["Categories", "Top Picks", "Guides"];

const SOCIALS = [
  { label: "X", path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
  { label: "IG", path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98C.014 8.332 0 8.74 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.332 23.986 8.74 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
  { label: "YT", path: "M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" },
  { label: "FB", path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
];

// ── Gradient from profile background ──
function buildHeroGradient(bg: string): string {
  if (!bg || bg === "#FBFAF8" || bg === "#ffffff" || bg === "#fff") {
    return "linear-gradient(180deg, #f9c4c4 0%, #fdd5d5 15%, #fde8e8 35%, #fdf2f2 55%, #fefafa 75%, #ffffff 100%)";
  }
  // Extract hex
  const m = bg.match(/#([0-9a-fA-F]{6})/);
  if (!m) return `linear-gradient(180deg, ${bg} 0%, #ffffff 100%)`;
  const hex = `#${m[1]}`;
  // Lighten for gradient stops
  return `linear-gradient(180deg, ${hex}40 0%, ${hex}25 25%, ${hex}10 50%, #ffffff 100%)`;
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const heroGradient = buildHeroGradient(backgroundColor);

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

  // Resolve chips: KB API hint_chips > askAi.suggestedQuestions > defaults
  const chips: string[] = (() => {
    if (hintChips.length > 0) return hintChips;
    if (askAi?.suggestedQuestions) {
      try {
        const parsed = JSON.parse(askAi.suggestedQuestions);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.slice(0, 4);
      } catch { /* ignore */ }
    }
    return ["Trending", "Best for me"];
  })();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, isTyping, scrollToBottom]);

  // ── Send message (streaming) ──
  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const creator = kbHandle || slug;
    const visitorId = getVisitorId();

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setChatInput("");
    setIsTyping(true);

    // Build history
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

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
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
        setIsTyping(false);
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

        // Add empty assistant message
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                  return updated;
                });
              } else if (data.type === "done") {
                fullContent = data.content || fullContent;
                if (data.products) products = data.products;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent, products: products?.length ? products : updated[updated.length - 1].products };
                  return updated;
                });
              } else if (data.type === "products" && data.products) {
                products = data.products;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], products };
                  return updated;
                });
              }
            } catch { /* skip malformed */ }
          }
        }

        // Final products update
        if (products && products.length > 0) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...updated[updated.length - 1], products };
            return updated;
          });
        }
      } else {
        // Regular JSON response (non-streaming)
        const data = await res.json();
        const responseText = data.response || data.message || data.content || "Sorry, I could not process that.";
        const products = data.products || [];
        setMessages((prev) => [...prev, { role: "assistant", content: responseText, products: products.length ? products : undefined }]);
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setMessages((prev) => [...prev, { role: "assistant", content: "Sorry, something went wrong. Please try again." }]);
      }
    } finally {
      setIsTyping(false);
    }
  }, [isTyping, messages, kbHandle, slug, sessionId, kbBaseUrl, kbApiKey]);

  const hasMessages = messages.length > 0;

  return (
    <div style={{
      // Lock the page to viewport height — only the chat messages area scrolls.
      // This stops footer / header from jumping when content grows.
      height: "100vh",
      display: "flex", flexDirection: "column",
      // Profile theme gradient applies to BOTH states (hero + chat mode).
      background: heroGradient,
      fontFamily: "var(--font-body), system-ui, -apple-system, sans-serif",
      overflow: "hidden",
    }}>

      {/* ══ BANNER (header + hero, only when no messages) ══ */}
      {!hasMessages && (
        <div style={{ background: heroGradient, flex: 1, display: "flex", flexDirection: "column", overflow: "auto" }}>
          {/* Header */}
          <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 36px", maxWidth: 1200, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>K</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{name} AI</span>
            </div>
            <nav style={{ display: "flex", gap: 28 }}>
              {NAV_LINKS.map((l) => (
                <a key={l} href="#" style={{ fontSize: 13, color: "#4b5563", textDecoration: "none", fontWeight: 500 }}>{l}</a>
              ))}
            </nav>
          </header>

          {/* Hero */}
          <section style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px 60px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 16px", borderRadius: 50, border: "1px solid rgba(239,68,68,0.15)", background: "rgba(255,255,255,0.55)", fontSize: 11, fontWeight: 500, color: "#6b7280", marginBottom: 32, backdropFilter: "blur(6px)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444" }} />
              Your Personal Style Editor
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 800, color: "#111827", margin: "0 0 8px", lineHeight: 1.12, letterSpacing: "-0.8px" }}>
              Hi, I&apos;m {name} AI
            </h1>
            <p style={{ fontSize: 38, fontWeight: 600, margin: "0 0 48px", background: "linear-gradient(90deg, #ef4444, #f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", fontStyle: "italic", letterSpacing: "-0.3px" }}>
              How can I help you today?
            </p>

            {/* Initial chat widget — card with input only */}
            <div style={{
              width: "100%", maxWidth: 540,
              background: "rgba(255,255,255,0.85)", borderRadius: 20,
              border: "1px solid rgba(0,0,0,0.06)",
              boxShadow: "0 12px 48px rgba(0,0,0,0.06)",
              backdropFilter: "blur(12px)",
              padding: "20px 22px 16px",
            }}>
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput); }}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                  placeholder={askAi?.questionPlaceholder || `Ask ${name} about brands, outfit advice, or product reviews...`}
                  rows={2}
                  disabled={isTyping}
                  style={{ width: "100%", border: "none", outline: "none", fontSize: 14, padding: 0, background: "transparent", color: "#111827", fontFamily: "inherit", resize: "none", lineHeight: 1.6 }}
                />
                {/* Chip row — wraps to multiple lines, contained within card */}
                {chips.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                    {chips.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => !isTyping && sendMessage(c)}
                        title={c}
                        style={{
                          padding: "7px 14px", borderRadius: 50,
                          border: "1px solid #e5e7eb", background: "#fff",
                          fontSize: 12, color: "#374151", fontWeight: 500,
                          cursor: "pointer", fontFamily: "inherit",
                          whiteSpace: "nowrap",
                          transition: "background 0.15s, border-color 0.15s",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                {/* Action row — attach + send */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 8 }}>
                  <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                    </svg>
                  </div>
                  <button type="submit" disabled={isTyping || !chatInput.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: isTyping || !chatInput.trim() ? "#fca5a5" : "#ef4444", cursor: isTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* ══ CHAT MODE — fixed header, scrollable messages, fixed input ══ */}
      {hasMessages && (
        <>
          {/* Fixed top header */}
          <header style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 36px", borderBottom: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: 6, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 800 }}>K</span>
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: "#1f2937" }}>{name} AI</span>
            </div>
            <nav style={{ display: "flex", gap: 28 }}>
              {NAV_LINKS.map((l) => (
                <a key={l} href="#" style={{ fontSize: 13, color: "#4b5563", textDecoration: "none", fontWeight: 500 }}>{l}</a>
              ))}
            </nav>
          </header>

          {/* Scrollable messages area — only this scrolls */}
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 760, padding: "24px 24px 8px", display: "flex", flexDirection: "column" }}>
                {messages.map((msg, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    {/* User bubble (right) */}
                    {msg.role === "user" && (
                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <div style={{
                          maxWidth: "78%", padding: "10px 14px", borderRadius: 12,
                          fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                          background: "#111827", color: "#fff",
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
                            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff" }}>{name.charAt(0)}</div>
                          )}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                          {/* Bubble — only renders when there's content. Dots show separately before content arrives. */}
                          {msg.content && (
                            <div style={{
                              padding: "10px 14px", borderRadius: 12,
                              fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word",
                              background: "#F3F4F6", color: "#111827",
                              alignSelf: "flex-start", maxWidth: "100%",
                            }}>
                              {msg.content}
                            </div>
                          )}
                          {/* Loading dots — only when no content yet AND streaming (last assistant msg) */}
                          {!msg.content && isTyping && i === messages.length - 1 && (
                            <div style={{
                              padding: "12px 14px", borderRadius: 12,
                              background: "#F3F4F6",
                              alignSelf: "flex-start",
                              display: "inline-flex", alignItems: "center", gap: 5,
                            }}>
                              {[0, 1, 2].map((d) => (
                                <span key={d} className="ask-dot" style={{ width: 7, height: 7, borderRadius: "50%", background: "#9ca3af", display: "inline-block", animationDelay: `${d * 0.18}s` }} />
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
                                  <div key={pi} style={{ border: "1px solid #E5E7EB", borderRadius: 10, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column" }}>
                                    <div style={{ background: "#F8FAFC", display: "grid", placeItems: "center", aspectRatio: "1/1" }}>
                                      {imgSrc ? <img src={imgSrc} alt={p?.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontSize: 12, color: "#9CA3AF" }}>No image</div>}
                                    </div>
                                    <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
                                      <div style={{ fontSize: 10, color: "#6B7280" }}>{p?.brand || (() => { try { return new URL(p?.url || "").hostname; } catch { return ""; } })()}</div>
                                      <div style={{ fontSize: 13, fontWeight: 700, color: "#111827", lineHeight: 1.3 }}>{p?.title || "Product"}</div>
                                      <div style={{ fontSize: 18, fontWeight: 800, color: "#111827" }}>{p?.price || ""}</div>
                                      {p?.url && (
                                        <a href={p.url} target="_blank" rel="noreferrer" style={{ marginTop: "auto", textDecoration: "none", display: "block", textAlign: "center", background: "#111827", color: "#fff", fontWeight: 700, borderRadius: 8, padding: "8px 10px", fontSize: 13 }}>
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
                                <svg width="13" height="13" viewBox="0 0 24 24" fill={msg.feedback === "up" ? "#111827" : "none"} stroke="#111827" strokeWidth="2"><path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" /></svg>
                              </button>
                              <button type="button" onClick={() => setMessages((prev) => prev.map((m, mi) => mi === i ? { ...m, feedback: m.feedback === "down" ? null : "down" } : m))} style={{ padding: 3, border: "none", background: "none", cursor: "pointer", opacity: msg.feedback === "down" ? 1 : 0.35, display: "flex" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill={msg.feedback === "down" ? "#111827" : "none"} stroke="#111827" strokeWidth="2"><path d="M10 15v4a3 3 0 003 3l4-9V2H5.72a2 2 0 00-2 1.7l-1.38 9a2 2 0 002 2.3H10zM17 2h2.67A2.31 2.31 0 0122 4v7a2.31 2.31 0 01-2.33 2H17" /></svg>
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
          <div style={{ flexShrink: 0, borderTop: "1px solid rgba(0,0,0,0.06)", background: "rgba(255,255,255,0.7)", backdropFilter: "blur(12px)", padding: "12px 24px 16px" }}>
            <form
              onSubmit={(e) => { e.preventDefault(); sendMessage(chatInput); }}
              style={{
                width: "100%", maxWidth: 760, margin: "0 auto",
                background: "#fff", borderRadius: 16,
                border: "1px solid #e5e7eb",
                boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                padding: "12px 16px",
              }}
            >
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                placeholder={askAi?.questionPlaceholder || `Ask ${name} about brands, outfit advice, or product reviews...`}
                rows={1}
                disabled={isTyping}
                style={{ width: "100%", border: "none", outline: "none", fontSize: 14, padding: 0, background: "transparent", color: "#111827", fontFamily: "inherit", resize: "none", lineHeight: 1.6 }}
              />
              {/* Chips row — wraps to multiple lines, contained within card */}
              {chips.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {chips.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => !isTyping && sendMessage(c)}
                      title={c}
                      style={{
                        padding: "7px 14px", borderRadius: 50,
                        border: "1px solid #e5e7eb", background: "#fff",
                        fontSize: 12, color: "#374151", fontWeight: 500,
                        cursor: "pointer", fontFamily: "inherit",
                        whiteSpace: "nowrap",
                        transition: "background 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#f9fafb"; e.currentTarget.style.borderColor = "#d1d5db"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; e.currentTarget.style.borderColor = "#e5e7eb"; }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {/* Action row — attach + send (right-aligned) */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 8 }}>
                <div style={{ width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                  </svg>
                </div>
                <button type="submit" disabled={isTyping || !chatInput.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: isTyping || !chatInput.trim() ? "#fca5a5" : "#ef4444", cursor: isTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
            </form>
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
        <footer style={{ flexShrink: 0, background: "#f8f8f8", borderTop: "1px solid #e5e7eb", padding: "32px 24px 20px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 24 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ef4444", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>K</span>
                  </div>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#111827", letterSpacing: "-0.5px" }}>kevo.</span>
                </div>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>From Berlin. With <span style={{ color: "#ef4444" }}>&#10084;</span></div>
                <div style={{ display: "flex", gap: 8 }}>
                  {SOCIALS.map((s) => (
                    <a key={s.label} href="#" style={{ width: 32, height: 32, borderRadius: "50%", border: "1.5px solid #d1d5db", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#374151"><path d={s.path} /></svg>
                    </a>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#111827", marginBottom: 10, letterSpacing: 0.3 }}>COMPANY</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <a href="#" style={{ fontSize: 13, color: "#374151", textDecoration: "none" }}>Contact</a>
                  <a href="#" style={{ fontSize: 13, color: "#374151", textDecoration: "none" }}>Blog</a>
                </div>
              </div>
            </div>
            <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: 14, marginTop: 16, display: "flex", gap: 16 }}>
              <a href="https://kevo.store/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#9ca3af", textDecoration: "none" }}>Terms &amp; Conditions</a>
              <a href="https://kevo.store/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#9ca3af", textDecoration: "none" }}>Privacy Policy</a>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
