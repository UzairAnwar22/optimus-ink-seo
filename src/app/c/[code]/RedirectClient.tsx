"use client";

import { useEffect, useState } from "react";

interface Props {
  code: string;
}

const PRIMARY = "#1c1917";
const PRIMARY_HOVER = "#0c0a09";

/**
 * Calls POST /api/checkout-links/public/:code/resolve to build a fresh
 * Shopify checkout cart, then replaces window.location with the returned
 * checkoutUrl. Falls back to a visible error + manual retry button when
 * the resolve fails (no Shopify store, archived link, products not
 * published to storefront, etc).
 */
export default function RedirectClient({ code }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const apiBase =
      process.env.NEXT_PUBLIC_API_URL ||
      // Same-origin fallback: useful in production where the API and SEO
      // app share a domain via reverse proxy.
      (typeof window !== "undefined" ? window.location.origin : "");

    (async () => {
      try {
        const res = await fetch(
          `${apiBase}/api/checkout-links/public/${encodeURIComponent(code)}/resolve`,
          { method: "POST" },
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (!res.ok || !json?.success) {
          throw new Error(
            json?.error?.message || `Resolve failed (HTTP ${res.status})`,
          );
        }
        const target: string | undefined = json?.data?.checkoutUrl;
        if (!target) throw new Error("Resolver did not return a checkoutUrl");

        // Replace so the back button doesn't trap users on this page.
        window.location.replace(target);
      } catch (e) {
        if (cancelled) return;
        setRedirecting(false);
        setError(e instanceof Error ? e.message : String(e));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [code]);

  if (redirecting) {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 10,
          color: "#78716c",
          fontSize: 13.5,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 16,
            height: 16,
            border: `2px solid ${PRIMARY}33`,
            borderTopColor: PRIMARY,
            borderRadius: "50%",
            animation: "cl-redirect-spin 0.6s linear infinite",
          }}
        />
        Opening secure checkout…
        <style>{`@keyframes cl-redirect-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div>
      <p style={{ fontSize: 13.5, color: "#dc2626", margin: "0 0 12px" }}>
        {error || "Could not open checkout."}
      </p>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setRedirecting(true);
          // Re-run effect by hard-reload — simplest path that re-triggers
          // the resolver without complicating state.
          window.location.reload();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 18px",
          borderRadius: 10,
          border: "none",
          background: PRIMARY,
          color: "#fff",
          fontSize: 14,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = PRIMARY_HOVER;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = PRIMARY;
        }}
      >
        Try again
      </button>
    </div>
  );
}
