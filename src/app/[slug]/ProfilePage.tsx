"use client";

import { useEffect, useState } from "react";
import { getSpaUrl } from "@/lib/api";

/**
 * Hybrid approach:
 * - SEO: server-rendered meta tags + hidden article (in page.tsx)
 * - Visual: full-page iframe loads the Vite SPA (pixel-perfect rendering)
 * - Google bot sees server HTML, users see iframe
 */
export default function ProfilePage({ slug }: { slug: string }) {
  const [spaUrl, setSpaUrl] = useState("");

  useEffect(() => {
    // Lock body scroll for iframe pages
    document.body.classList.add("iframe-lock");
    // Resolution: NEXT_PUBLIC_SPA_URL env > brand.spaUrl > same-origin /app (reverse proxy fallback).
    // Fallback must include /app — root would re-enter Next.js [slug] route → iframe recursion.
    const url = getSpaUrl() || `${window.location.origin}/app`;
    setSpaUrl(`${url}/${slug}`);
    return () => { document.body.classList.remove("iframe-lock"); };
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
