"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Article {
  question: string;
  intro: string;
  tags: { label: string; color: string }[];
  tableTitle: string;
  products: { image: string; title: string; price: string; type: string; url: string }[];
  rating: number;
  whyEssentials: string[];
  /** "accordion" renders the guide as expandable +/− boxes (image 2).
   *  "paragraph" renders flat bold-heading + body blocks (images 4/5). */
  guideStyle?: "accordion" | "paragraph";
  shoppingGuide: { heading: string; body: string }[];
  sidebarChips: string[];
  exploreLinks: { label: string; url: string }[];
}

interface Props {
  slug: string;
  handle: string;
  brandName: string;
  brandAvatar: string;
  article: Article;
  /** Other featured questions for this brand — sidebar "Ask {brand} a
   *  Question" widget. The current article is filtered out upstream so
   *  users don't get a self-link. */
  relatedQuestions?: { handle: string; question: string }[];
}

const TYPING_TEXTS = ["'Glass Skin Essentials.'", "'Old Money Aesthetic.'", "'Linen Beach Staples.'"];

function useTypingEffect() {
  const [display, setDisplay] = useState("");
  const state = useRef({ textIdx: 0, charIdx: 0, erasing: false });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    function tick() {
      const { textIdx, charIdx, erasing } = state.current;
      const text = TYPING_TEXTS[textIdx];

      if (!erasing) {
        if (charIdx < text.length) {
          setDisplay(text.substring(0, charIdx + 1));
          state.current.charIdx++;
          timer = setTimeout(tick, 50);
        } else {
          state.current.erasing = true;
          timer = setTimeout(tick, 1500);
        }
      } else {
        if (charIdx > 0) {
          setDisplay(text.substring(0, charIdx - 1));
          state.current.charIdx--;
          timer = setTimeout(tick, 30);
        } else {
          state.current.textIdx = (textIdx + 1) % TYPING_TEXTS.length;
          state.current.erasing = false;
          timer = setTimeout(tick, 300);
        }
      }
    }

    timer = setTimeout(tick, 300);
    return () => clearTimeout(timer);
  }, []);

  return display;
}

function FaqItem({ heading, body }: { heading: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="faq-item"
      style={{ border: "1px solid #eee", borderRadius: 8, marginBottom: 10, background: "#fafafa", overflow: "hidden" }}
    >
      <div
        className="faq-question"
        onClick={() => setOpen((v) => !v)}
        style={{
          cursor: "pointer",
          padding: 14,
          fontWeight: 500,
          position: "relative",
          paddingRight: 40,
          fontSize: 14,
          color: "#222",
        }}
      >
        {heading}
        <span
          style={{
            position: "absolute",
            right: 15,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 18,
            lineHeight: 1,
            fontWeight: 400,
          }}
        >
          {open ? "−" : "+"}
        </span>
      </div>
      <div
        style={{
          maxHeight: open ? 200 : 0,
          overflow: "hidden",
          padding: open ? "10px 14px 14px" : "0 14px",
          fontSize: 14,
          color: "#555",
          transition: "max-height 0.4s ease, padding 0.3s ease",
        }}
      >
        {body}
      </div>
    </div>
  );
}

export default function FeaturedArticlePage({ slug, brandName, brandAvatar, article, relatedQuestions = [] }: Props) {
  const [askInput, setAskInput] = useState("");
  const typingText = useTypingEffect();

  const handleSend = () => {
    const val = askInput.trim();
    if (!val) return;
    window.location.href = `/${slug}/ask?q=${encodeURIComponent(val)}`;
  };

  return (
    <div style={{ fontFamily: "'Roboto', sans-serif", background: "#fff", minHeight: "100vh", color: "#222" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap');
        @font-face {
          font-family: 'Cotta Free';
          src: url('https://kevo.store/css/fonts/Cotta-Free.woff2') format('woff2'),
               url('https://kevo.store/css/fonts/Cotta-Free.woff') format('woff');
          font-weight: normal;
          font-style: normal;
          font-display: swap;
        }
        .kv-h1, .kv-h2 { font-family: 'Cotta Free', Georgia, serif !important; }
        .kv-h1 { font-size: 2.2rem; line-height: 1.2; margin: 0 0 20px; }
        .kv-h2 { font-size: 22px; margin-bottom: 15px; }

        /* Header */
        .kv-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 134px; border-bottom: 1px solid #eee; flex-wrap: wrap; background: #fff; }
        .kv-logo img { height: 36px; display: block; }
        .kv-logo-text { font-family: 'Cotta Free', serif; font-size: 22px; font-weight: 600; color: #222; }
        .kv-breadcrumb { font-size: 14px; color: #777; }
        .kv-breadcrumb a { text-decoration: none; color: #555; margin: 0 5px; }
        .kv-breadcrumb a:hover { text-decoration: underline; }

        /* Layout */
        .kv-container { max-width: 83rem; margin: 40px auto; display: flex; gap: 30px; padding: 16px 134px; }
        .kv-left { flex: 3; }
        .kv-right { flex: 1.2; position: sticky; top: 20px; height: fit-content; }

        /* Card */
        .kv-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 0 4px rgba(10,0,0,.1); }
        .kv-section { margin-top: 30px; }

        /* Highlight */
        .kv-highlight { background: #f5ead6; padding: 18px; border-radius: 10px; font-size: 16px; line-height: 1.6; white-space: pre-line; }

        /* Tags */
        .kv-tags { margin-top: 12px; }
        .kv-tag { display: inline-block; background: #eee; padding: 6px 12px; border-radius: 20px; margin-right: 6px; margin-bottom: 6px; font-size: 12px; color: #222; }

        /* Table */
        .kv-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .kv-table th { background: #fafafa; text-align: left; font-weight: 600; padding: 14px; font-size: 14px; border-bottom: 1px solid #eee; }
        .kv-table td { padding: 14px; font-size: 14px; border-bottom: 1px solid #eee; vertical-align: middle; }
        .kv-table tr:last-child td { border-bottom: none; }
        .kv-product-td { display: flex; align-items: center; gap: 12px; }
        .kv-product-td img { width: 55px; border-radius: 6px; display: block; }
        .kv-badge-buy { background: #f4f4f4; padding: 4px 8px; border-radius: 6px; font-size: 12px; }
        .kv-badge-buy a { color: #222; text-decoration: none; }
        .kv-badge-buy a:hover { text-decoration: underline; }

        /* Rating row */
        .kv-rating { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; flex-wrap: wrap; gap: 10px; }
        .kv-view-btn { background: #111; color: #fff; padding: 10px 22px; border-radius: 6px; font-size: 14px; text-decoration: none; display: inline-block; }
        .kv-view-btn:hover { background: #333; }

        /* Feature / Why Essentials */
        .kv-feature { display: flex; gap: 12px; margin-bottom: 18px; }
        .kv-feature-icon { width: 26px; height: 26px; border-radius: 50%; background: #ffe7a3; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
        .kv-feature b { display: block; margin-bottom: 4px; }
        .kv-feature-text { font-size: 14px; line-height: 1.6; color: #333; }

        /* Sidebar */
        .kv-sidebar-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 0 4px rgba(10,0,0,.1); margin-bottom: 20px; }
        .kv-ask-box { border-radius: 16px; box-shadow: rgba(0,0,0,.06) 0 0 10px; width: 100%; margin-bottom: 20px; overflow: hidden; }
        .kv-ask-inner { background: #fff; border-radius: 16px; padding: 16px 12px; }
        .kv-ask-label { display: flex; flex-wrap: wrap; align-items: center; gap: 2px 4px; font-size: 16px; font-weight: 500; color: #1a1a1a; margin-bottom: 16px; line-height: 1.4; }
        .kv-cursor { display: inline-block; width: 2px; height: 22px; background: #000; margin-left: 1px; animation: kv-blink 1s step-end infinite; vertical-align: middle; }
        @keyframes kv-blink { 50% { opacity: 0; } }
        .kv-input-row { display: flex; align-items: center; gap: 4px; background: #fff; border-radius: 50px; padding: 4px 4px 4px 16px; border: 1px solid #e5e7eb; box-shadow: rgba(0,0,0,.04) 0 1px 4px; overflow: hidden; }
        .kv-input { flex: 1; min-width: 0; padding: 10px 0; border: none; outline: none; font-size: 14px; background: transparent; color: #1a1a1a; font-family: 'Roboto', sans-serif; }
        .kv-mic-btn { width: 34px; height: 34px; border-radius: 50%; border: none; background: transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .kv-send-btn { width: 34px; height: 34px; border-radius: 50%; border: none; display: flex; align-items: center; justify-content: center; flex-shrink: 0; cursor: pointer; transition: all .2s; }
        .kv-send-btn:disabled { background: rgba(114,94,93,.25); cursor: not-allowed; }
        .kv-send-btn:not(:disabled) { background: #000; }
        .kv-send-btn:not(:disabled):hover { transform: scale(1.05); }
        .kv-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
        .kv-chip { padding: 6px 14px; border-radius: 50px; border: 1px solid #e5e7eb; background: #fff; font-size: 12px; color: #4b5563; cursor: pointer; font-family: 'Roboto', sans-serif; transition: background .15s; }
        .kv-chip:hover { background: #f3f4f6; }

        /* Sidebar brand/profile */
        .kv-profile { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
        .kv-profile img { width: 55px; border-radius: 0; display: block; }
        .kv-profile-init { width: 55px; height: 55px; border-radius: 50%; background: #111; color: #fff; font-size: 18px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .kv-profile-name { font-weight: 600; font-size: 15px; }
        .kv-profile-sub { font-size: 13px; color: #777; margin-top: 2px; }

        /* Sidebar list */
        .kv-sb-h3 { font-family: 'Cotta Free', serif; font-size: 16px; margin-bottom: 10px; }
        .kv-sb-h5 { font-size: 14px; font-weight: 400; margin-bottom: 8px; color: #555; }
        .kv-sb-ul { list-style: none; padding-left: 0; margin: 0 0 10px; }
        .kv-sb-ul li { position: relative; padding-left: 22px; margin-bottom: 10px; font-size: 14px; line-height: 1.5; }
        .kv-sb-ul li::before { content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%); width: 8px; height: 8px; border-radius: 50%; background: #ff385c; }
        .kv-sb-ul li a { color: #333; text-decoration: none; }
        .kv-sb-ul li a:hover { text-decoration: underline; }

        /* Footer */
        .kv-footer { padding: 24px 16px; display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 30px; border-top: 1px solid #eee; }
        .kv-footer-join { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; background: #fff; color: #111827; border-radius: 50px; text-decoration: none; font-size: 14px; font-weight: 600; border: 1px solid #DDD; transition: background .15s, color .15s; }
        .kv-footer-join:hover { background: #f3f4f6; }
        .kv-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 4px 8px; }
        .kv-footer-links a, .kv-footer-links span { font-size: 12px; color: #111827; text-decoration: none; }
        .kv-footer-links .sep { color: rgba(17,24,39,.35); }
        .kv-social-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 12px; }
        .kv-social-row a { transition: transform .2s; display: inline-block; }
        .kv-social-row a:hover { transform: translateY(-3px) scale(1.05); }

        /* Responsive */
        @media (max-width: 992px) { .kv-container { padding: 0 15px; } .kv-left { flex: 2; } .kv-right { flex: 1; } }
        @media (max-width: 768px) {
          .kv-header { padding: 14px 20px; }
          .kv-container { flex-direction: column; padding: 12px 16px; margin: 16px auto; }
          .kv-right { position: static; width: 100%; }
          .kv-h1 { font-size: 1.5rem !important; }
          .kv-h2 { font-size: 18px; }
          .kv-card { padding: 16px; }
          .kv-highlight { font-size: 14px; }
        }
      `}</style>

      {/* ── Header ── */}
      <header className="kv-header">
        <div className="kv-logo">
          <img src="/ans-kevo-logo.png" alt="Answer by Kevo" style={{ height: 52, display: "block" }} />
        </div>
        <nav className="kv-breadcrumb">
          <Link href="/">Home</Link> /
          <Link href={`/${slug}`}>{brandName}</Link> /
          <Link href={`/${slug}/ask`}>Ask</Link>
        </nav>
      </header>

      {/* ── Two-column layout ── */}
      <div className="kv-container">

        {/* ── LEFT ── */}
        <div className="kv-left">
          <h1 className="kv-h1">{article.question}</h1>

          {/* Main card: intro + tags + table + rating */}
          <div className="kv-card">
            <div className="kv-highlight">{article.intro}</div>

            <div className="kv-tags">
              {article.tags.map((t) => (
                <span key={t.label} className="kv-tag">{t.label}</span>
              ))}
            </div>

            <h2 className="kv-h2" style={{ marginTop: 30 }}>{article.tableTitle}</h2>
            <table className="kv-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Title</th>
                  <th>Price</th>
                  <th>Type</th>
                  <th>Buy Link</th>
                </tr>
              </thead>
              <tbody>
                {article.products.map((p) => (
                  <tr key={p.title}>
                    <td>
                      <div className="kv-product-td">
                        <img src={p.image} alt={p.title} />
                      </div>
                    </td>
                    <td><p>{p.title}</p></td>
                    <td><p><span style={{ fontSize: 16, fontWeight: 600 }}>{p.price}</span></p></td>
                    <td><p><span style={{ color: "#888" }}>{p.type}</span></p></td>
                    <td style={{ textAlign: "center" }}>
                      <span className="kv-badge-buy">
                        <a href={p.url} target="_blank" rel="nofollow noopener noreferrer">Buy Now</a>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="kv-rating">
              <div>⭐⭐⭐⭐⭐ {article.rating}</div>
              <a href={`/${slug}/ask`} className="kv-view-btn">View on {brandName}</a>
            </div>
          </div>

          {/* Why Essentials */}
          <div className="kv-card kv-section">
            <h2 className="kv-h2">Why These Are &ldquo;{brandName}&rdquo; Essentials</h2>
            {article.whyEssentials.map((item) => {
              const dashIdx = item.indexOf(" — ");
              const bold = dashIdx !== -1 ? item.slice(0, dashIdx) : item;
              const rest = dashIdx !== -1 ? item.slice(dashIdx + 3) : "";
              return (
                <div key={item} className="kv-feature">
                  <div className="kv-feature-icon">✓</div>
                  <div className="kv-feature-text">
                    <b>{bold}</b>
                    {rest}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Smart Shopping Guide — accordion (image 2) or paragraph (images 4/5)
              based on guideStyle. Accordion uses +/− toggles; paragraph
              renders flat bold-heading + body blocks. */}
          <div className="kv-card kv-section">
            <h2 className="kv-h2">Smart Shopping Guide</h2>
            {article.guideStyle === "paragraph" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {article.shoppingGuide.map((g) => (
                  <div key={g.heading}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#222", marginBottom: 6 }}>
                      {g.heading}
                    </div>
                    <div style={{ fontSize: 14, color: "#444", lineHeight: 1.65 }}>{g.body}</div>
                  </div>
                ))}
              </div>
            ) : (
              article.shoppingGuide.map((g) => (
                <FaqItem key={g.heading} heading={g.heading} body={g.body} />
              ))
            )}
          </div>
        </div>

        {/* ── RIGHT (Sidebar) ── */}
        <div className="kv-right">

          {/* Ask box */}
          <div className="kv-ask-box">
            <div className="kv-ask-inner">
              <div className="kv-ask-label">
                <span>Ask {brandName} for</span>
                <span style={{ color: "#1a1a1a" }}>{typingText}</span>
                <span className="kv-cursor" />
              </div>
              <div className="kv-input-row">
                <input
                  type="text"
                  className="kv-input"
                  id="kv-user-input"
                  placeholder={`Hi, I'm ${brandName}'s AI assistant. How can I help you today?`}
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                />
                {/* Mic */}
                <button className="kv-mic-btn" type="button" title="Voice input">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a1a1a" strokeWidth="1.8">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </button>
                {/* Send */}
                <button
                  className="kv-send-btn"
                  type="button"
                  disabled={!askInput.trim()}
                  onClick={handleSend}
                  title="Send"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round">
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>
              <div className="kv-chips">
                {article.sidebarChips.map((c) => (
                  <button key={c} type="button" className="kv-chip" onClick={() => setAskInput(c)}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Brand profile card */}
          <div className="kv-sidebar-card">
            <div className="kv-profile">
              {brandAvatar
                ? <img src={brandAvatar} alt={brandName} />
                : <div className="kv-profile-init">{brandName.slice(0, 2).toUpperCase()}</div>
              }
              <div>
                <div className="kv-profile-name">{brandName}</div>
                <div className="kv-profile-sub">Fashion &amp; Lifestyle</div>
              </div>
            </div>
            <h3 className="kv-sb-h3">Why trust this review?</h3>
            <ul className="kv-sb-ul">
              <li>We vet emerging &amp; iconic brands</li>
              <li>Editor-tested for style &amp; quality</li>
              <li>Current Season Trends</li>
            </ul>
            <h5 className="kv-sb-h5">⭐ May earn commission from links?</h5>
          </div>

          {/* Ask questions card */}
          <div className="kv-sidebar-card">
            <h3 className="kv-sb-h3">Ask {brandName} a Question</h3>
            <ul className="kv-sb-ul">
              {relatedQuestions.map((q) => (
                <li key={q.handle}>
                  <a href={`/${slug}/${q.handle}`}>{q.question}</a>
                </li>
              ))}
              <li>How do I shop the automated bundles featured in {brandName} articles?</li>
            </ul>
          </div>

          {/* Explore card */}
          <div className="kv-sidebar-card">
            <h3 className="kv-sb-h3">Explore {brandName}</h3>
            <ul className="kv-sb-ul">
              {article.exploreLinks.map((l) => (
                <li key={l.label}><a href={l.url}>{l.label}</a></li>
              ))}
            </ul>
          </div>

        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="kv-footer">
        <a href={`/${slug}/ask`} className="kv-footer-join">Join {brandName}</a>
        <div className="kv-footer-links">
          <span style={{ cursor: "pointer" }}>Cookie Preferences</span>
          <span className="sep">·</span>
          <a href="#">Report</a>
          <span className="sep">·</span>
          <a href="#">Privacy</a>
        </div>
        <div className="kv-social-row">
          {/* X */}
          <a href="#" title="X / Twitter">
            <svg width="30" height="31" viewBox="0 0 30 31" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01611 3.21881H9.69628L16.7953 12.7678L25.6317 3L27.7313 3.03647L17.842 14.1415L27.9839 27.7812H20.3067L13.6064 18.8826L5.42107 28H3.35497L12.59 17.5818L2.01611 3.21881ZM8.97209 4.62898H4.91596L21.1435 26.3345H25.1266L8.97209 4.62898Z" fill="#222222" />
            </svg>
          </a>
          {/* Instagram */}
          <a href="#" title="Instagram">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 7H24M9 1H21C25.4183 1 29 4.58172 29 9V21C29 25.4183 25.4183 29 21 29H9C4.58172 29 1 25.4183 1 21V9C1 4.58172 4.58172 1 9 1ZM15 21C11.6863 21 9 18.3137 9 15C9 11.6863 11.6863 9 15 9C18.3137 9 21 11.6863 21 15C21 18.3137 18.3137 21 15 21Z" stroke="#0D0C22" strokeWidth="1.5" />
            </svg>
          </a>
          {/* LinkedIn */}
          <a href="#" title="LinkedIn">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="28" height="28" rx="8" stroke="#0D0C22" strokeWidth="1.5" />
              <path d="M10 13V20" stroke="#0D0C22" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M10 10.5C10 10.2239 10.2239 10 10.5 10C10.7761 10 11 10.2239 11 10.5C11 10.7761 10.7761 11 10.5 11C10.2239 11 10 10.7761 10 10.5Z" fill="#0D0C22" stroke="#0D0C22" strokeWidth="1" />
              <path d="M14 20V13" stroke="#0D0C22" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M14 15.5C14 14.1193 15.1193 13 16.5 13C17.8807 13 19 14.1193 19 15.5V20" stroke="#0D0C22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
          {/* Facebook */}
          <a href="#" title="Facebook">
            <svg width="30" height="30" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="1" y="1" width="28" height="28" rx="8" stroke="#0D0C22" strokeWidth="1.5" />
              <path d="M17 10H15.5C14.6716 10 14 10.6716 14 11.5V13H17L16.5 15H14V20H12V15H10V13H12V11.5C12 9.567 13.567 8 15.5 8H17V10Z" stroke="#0D0C22" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </footer>
    </div>
  );
}
