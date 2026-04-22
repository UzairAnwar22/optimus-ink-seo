"use client";

import { useEffect, useState } from "react";

/**
 * Hybrid approach:
 * - SEO: server-rendered meta tags + hidden article (in page.tsx)
 * - Visual: full-page iframe loads the Vite SPA (pixel-perfect rendering)
 * - Google bot sees server HTML, users see iframe
 */
export default function ProfilePage({ slug }: { slug: string }) {
  const [spaUrl, setSpaUrl] = useState("");

  useEffect(() => {
    // In production, iframe loads from same origin (reverse proxy routes to SPA)
    // In dev, loads from NEXT_PUBLIC_SPA_URL env var
    const url = process.env.NEXT_PUBLIC_SPA_URL || window.location.origin;
    setSpaUrl(`${url}/${slug}`);
  }, [slug]);

  if (!spaUrl) return null;

  return (
    <iframe
      src={spaUrl}
      title="Profile"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        border: "none",
        zIndex: 1,
      }}
      allow="clipboard-write; autoplay"
      loading="eager"
    />
  );
}
