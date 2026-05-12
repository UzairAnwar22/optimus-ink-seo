/**
 * Loading UI for `/[slug]/shop`. Mirrors the Shop tab's actual layout —
 * open sidebar with 4 tab placeholders, sticky search header, the big
 * "Shop" heading + description placeholder, and a 6-column product
 * grid skeleton repeated for the two sections (Best Sellers + New
 * Arrivals). Skeleton style matches the dashboard's shimmer for
 * consistency across the brand surfaces.
 */

export default function ShopLoading() {
  return <ShopSurfaceSkeleton withHeader sectionCount={2} />;
}

export function ShopSurfaceSkeleton({
  withHeader,
  sectionCount = 1,
}: {
  withHeader: boolean;
  sectionCount?: number;
}) {
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
        /* Match the live shop's responsive grid so the skeleton doesn't
           reflow when the real content swaps in. */
        .ask-skel-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 12px;
        }
        @media (max-width: 1100px) {
          .ask-skel-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
        }
        @media (max-width: 720px) {
          .ask-skel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
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
        {/* Sidebar — 260px wide since the shop surfaces open with the
            sidebar visible by default. 4 tab placeholders mirror the
            real Ask / Shop / Best Sellers / New Arrival rows. */}
        <aside
          style={{
            width: 260,
            borderRight: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            flexDirection: "column",
            padding: "14px 8px",
            gap: 4,
            flexShrink: 0,
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="ask-skel" style={{ width: "100%", height: 38, borderRadius: 10 }} />
          ))}
        </aside>

        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          {/* Sticky search header */}
          <header
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "14px 28px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <div className="ask-skel" style={{ flex: 1, maxWidth: 640, margin: "0 auto", height: 42, borderRadius: 50 }} />
            <div className="ask-skel" style={{ width: 60, height: 24, borderRadius: 6, flexShrink: 0 }} />
          </header>

          <div style={{ padding: "28px 36px 36px", display: "flex", flexDirection: "column", gap: 36 }}>
            {/* Title row — only on the Shop tab variant. The Best
                Sellers / New Arrival tabs intentionally skip this so
                the page jumps straight to the section grid. */}
            {withHeader && (
              <div>
                <div className="ask-skel" style={{ width: 180, height: 36, marginBottom: 10 }} />
                <div className="ask-skel" style={{ width: 240, height: 13, borderRadius: 6 }} />
              </div>
            )}

            {/* Product-grid sections */}
            {Array.from({ length: sectionCount }).map((_, sIdx) => (
              <section key={sIdx}>
                <div className="ask-skel" style={{ width: 160, height: 18, marginBottom: 14 }} />
                <div className="ask-skel-grid">
                  {Array.from({ length: 6 }).map((__, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <div className="ask-skel" style={{ width: "100%", aspectRatio: "3/4", borderRadius: 14 }} />
                      <div className="ask-skel" style={{ width: "80%", height: 13 }} />
                      <div className="ask-skel" style={{ width: "55%", height: 11 }} />
                      <div className="ask-skel" style={{ width: "40%", height: 14 }} />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}
