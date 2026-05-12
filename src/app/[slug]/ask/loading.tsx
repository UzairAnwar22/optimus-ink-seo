/**
 * Loading UI for `/[slug]/ask`. Next.js auto-renders this while the server
 * resolves the page (fetchPublicProfile + fetchAskConfig + the storefront
 * lists for brand merchants), so the browser never sees a blank
 * mid-navigation state.
 *
 * Layout intentionally mirrors AskPage's two-column shell — collapsed
 * sidebar rail on the left, hero/chips on the right — so the swap to the
 * real content reads as content arriving in-place instead of the whole
 * page reflowing. Skeleton style matches the dashboard's shimmer
 * (linear-gradient + 1.5s animation) so the brand language is consistent
 * across surfaces.
 */

export default function AskLoading() {
  return (
    <>
      <style>{`
        @keyframes ask-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .ask-skel {
          background: linear-gradient(90deg, rgba(0,0,0,0.06) 25%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.06) 75%);
          background-size: 200% 100%;
          animation: ask-shimmer 1.5s ease-in-out infinite;
          border-radius: 8px;
        }
        @media (prefers-color-scheme: dark) {
          .ask-skel {
            background: linear-gradient(90deg, rgba(255,255,255,0.06) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 75%);
            background-size: 200% 100%;
          }
        }
      `}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          background: "#FBFAF8",
          color: "#0f0f0f",
        }}
      >
        {/* Sidebar rail — matches the collapsed default state in AskPage so
            the user doesn't see the full sidebar pop in/out on data
            arrival. */}
        <aside
          style={{
            width: 56,
            borderRight: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "14px 0",
            gap: 12,
            flexShrink: 0,
          }}
        >
          <div className="ask-skel" style={{ width: 28, height: 28, borderRadius: 8 }} />
          <div className="ask-skel" style={{ width: 28, height: 28, borderRadius: 8 }} />
          <div className="ask-skel" style={{ width: 28, height: 28, borderRadius: 8 }} />
        </aside>

        {/* Main column */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 24px",
            gap: 28,
          }}
        >
          {/* Avatar circle */}
          <div
            className="ask-skel"
            style={{ width: 96, height: 96, borderRadius: "50%" }}
          />

          {/* Tagline pill */}
          <div className="ask-skel" style={{ width: 140, height: 26, borderRadius: 999 }} />

          {/* Big italic line */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", width: "100%", maxWidth: 520 }}>
            <div className="ask-skel" style={{ width: "85%", height: 28 }} />
            <div className="ask-skel" style={{ width: "60%", height: 28 }} />
          </div>

          {/* Suggested chip row */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", marginTop: 8, maxWidth: 560 }}>
            <div className="ask-skel" style={{ width: 120, height: 36, borderRadius: 999 }} />
            <div className="ask-skel" style={{ width: 96, height: 36, borderRadius: 999 }} />
            <div className="ask-skel" style={{ width: 140, height: 36, borderRadius: 999 }} />
            <div className="ask-skel" style={{ width: 108, height: 36, borderRadius: 999 }} />
          </div>

          {/* Input bar */}
          <div
            className="ask-skel"
            style={{
              width: "100%",
              maxWidth: 640,
              height: 56,
              borderRadius: 16,
              marginTop: 20,
            }}
          />
        </main>
      </div>
    </>
  );
}
