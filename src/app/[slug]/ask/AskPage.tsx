"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import brand from "@/config/brand";
import { deriveAutoTheme } from "@/lib/theme";
import type { StorefrontProduct, StorefrontProductDetail } from "@/lib/api";
import { fetchStorefrontProductDetail } from "@/lib/api";

// Static label for the small pill above the hero headline. The {name}
// placeholder is replaced with the creator's name at render time.
const STATIC_TAGLINE = "Hi, I'm {name} AI";

// Fallback phrases for the big italic typewriter line when no dynamic
// suggested chips are available from KB / askAi config.
const DEFAULT_CHIP_PHRASES = [
  "Product recommendations",
  "Best option for me",
  "Trending",
];

interface Props {
  slug: string;
  profileId: number;
  name: string;
  avatar: string;
  bio: string;
  backgroundColor: string;
  kbHandle: string | null;
  apiBaseUrl: string;
  kbBaseUrl: string;
  kbApiKey: string;
  askAi: { aiName: string; questionPlaceholder: string; suggestedQuestions: string; textColor: string } | null;
  /** 'brand' = Shopify-connected creator (storefront tabs render the
   *  merchant's live products); 'solo' = no store (tabs are hidden). */
  accountType?: "brand" | "solo";
  /** Best-sellers list fetched server-side per slug. Empty for solo. */
  storeBestSellers?: StorefrontProduct[];
  /** New-arrivals list fetched server-side per slug. Empty for solo. */
  storeNewArrivals?: StorefrontProduct[];
  /** Featured Q&A chips shown in the hero. Each chip deep-links to
   *  /[slug]/featured/[handle] for the curated article surface. */
  featuredQuestions?: { handle: string; question: string }[];
  /** Which tab the page mounts with. Drives a real URL per surface:
   *   chat        → /[slug]/ask
   *   shop        → /[slug]/shop
   *   bestsellers → /[slug]/best-sellers
   *   newarrival  → /[slug]/new-arrival
   * Default 'chat' so legacy callers still get the chat surface. */
  initialView?: "chat" | "shop" | "bestsellers" | "newarrival";
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

export default function AskPage({
  slug,
  profileId,
  name,
  avatar,
  bio,
  backgroundColor,
  kbHandle,
  apiBaseUrl,
  kbBaseUrl,
  kbApiKey,
  askAi,
  accountType = "solo",
  storeBestSellers = [],
  storeNewArrivals = [],
  featuredQuestions = [],
  initialView = "chat",
}: Props) {
  // Shop tabs are brand-only — solo creators have no connected Shopify
  // store, so the shop surfaces are hidden for them. The Ask tab itself
  // is still shown for everyone (it's the chat experience).
  const showShopTabs = accountType === "brand";
  // Placeholder is hardcoded per account type — we intentionally ignore
  // `askAi.questionPlaceholder` here because template-seeded values
  // (e.g. "Ask about sports, fitness" from a niche template) leak into
  // unrelated brand contexts and confuse visitors.
  const chatPlaceholder =
    accountType === "brand"
      ? `Ask ${name} about brands, outfit advice, or product reviews...`
      : `Ask ${name} anything...`;
  const router = useRouter();
  // Ask lives at /[slug]/ask; shop surfaces live at /[slug]/shop with
  // ?best-seller / ?new-arrival query params for sub-sections.
  const viewHrefs = {
    chat:        `/${slug}/ask`,
    shop:        `/${slug}/shop`,
    bestsellers: `/${slug}/shop?best-seller`,
    newarrival:  `/${slug}/shop?new-arrival`,
  } as const;
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
  // Sidebar defaults open on the shop surfaces (Shop / Best Sellers / New
  // Arrival) so the active tab is visible immediately — collapsed-by-default
  // hid the navigation right when the user needed it most. The chat surface
  // keeps the previous collapsed default so the hero/conversation area gets
  // full width.
  // Derive active tab from ?tab= query string. Falls back to initialView
  // (server-provided) when no query param is present so the first render
  // is correct even before useSearchParams hydrates.
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Match `/<slug>/shop` exactly — substring `includes("/shop")` would
  // also match slugs that start with "shop-" (e.g. "shop-trykept-co"),
  // flipping the Ask page into Shop view by mistake.
  const onShopSurface = /\/shop(?:\/|$)/.test(pathname);
  const currentView: "chat" | "shop" | "bestsellers" | "newarrival" = onShopSurface
    ? searchParams.has("best-seller") ? "bestsellers"
      : searchParams.has("new-arrival") ? "newarrival"
      : "shop"
    : "chat";

  const [sidebarOpen, setSidebarOpen] = useState(currentView !== "chat");
  // Cart drawer (right-side panel) on the Shop surface. Starts closed; the
  // top-right cart icon toggles it. Slide-in animation runs off the class
  // toggle in the inline <style> block.
  const [shopCartOpen, setShopCartOpen] = useState(false);
  const [shopSearch, setShopSearch] = useState("");

  type ShopCartItem = { variantId: string; productId: string; name: string; variant: string; price: number; qty: number; img: string };
  const [shopCart, setShopCart] = useState<ShopCartItem[]>([]);
  const [shopCheckoutLoading, setShopCheckoutLoading] = useState(false);

  // Product detail popup state — opens when a card on the Shop / Best
  // Sellers / New Arrival grids is clicked.
  //   - `productDetailHandle`: the handle (or id) we're fetching for,
  //     drives the open/close lifecycle. null = closed.
  //   - `productDetail`: the resolved detail payload from the backend.
  //   - `productDetailLoading`: in-flight indicator so the popup can show
  //     a spinner while the admin GraphQL round-trips.
  // Close is synchronous (instant unmount). Earlier we tried a 160ms
  // close-animation timer; each click during that window re-triggered
  // the timer and kept the backdrop mounted, intercepting the user's
  // next click on a card behind it — that was the real "needs 2–3
  // clicks to reopen" bug.
  const [productDetailHandle, setProductDetailHandle] = useState<string | null>(null);
  const [productDetail, setProductDetail] = useState<StorefrontProductDetail | null>(null);
  const [productDetailLoading, setProductDetailLoading] = useState(false);
  const [productDetailVariantIdx, setProductDetailVariantIdx] = useState(0);
  const [productDetailImageIdx, setProductDetailImageIdx] = useState(0);
  const [productDetailClosing, setProductDetailClosing] = useState(false);
  const productDetailCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Client-side cache of full product details, keyed by handle (or id
  // when the card has no handle). Populated by a background prefetch
  // that runs as soon as the page mounts, so by the time the user
  // clicks any card we almost always have the full detail in memory
  // and the popup opens with zero loading state.
  const productDetailCacheRef = useRef<Map<string, StorefrontProductDetail>>(new Map());
  const productDetailInflightRef = useRef<Map<string, Promise<StorefrontProductDetail | null>>>(new Map());

  // Fetch + cache a single product detail. De-dupes concurrent calls
  // for the same handle by storing the in-flight promise in
  // `productDetailInflightRef` — important for the prefetch loop where
  // a fast user click could otherwise trigger a second identical
  // request before the first one resolves.
  const ensureProductDetail = useCallback(
    async (key: string): Promise<StorefrontProductDetail | null> => {
      const cache = productDetailCacheRef.current;
      const cached = cache.get(key);
      if (cached) return cached;
      const inflight = productDetailInflightRef.current;
      const existing = inflight.get(key);
      if (existing) return existing;
      const promise = fetchStorefrontProductDetail(slug, key)
        .then((detail) => {
          if (detail) cache.set(key, detail);
          inflight.delete(key);
          return detail;
        })
        .catch(() => {
          inflight.delete(key);
          return null;
        });
      inflight.set(key, promise);
      return promise;
    },
    [slug],
  );

  // Background prefetch: as soon as the brand-side product lists land
  // (which is at page mount since they're SSR'd as props), kick off
  // detail fetches for every card with a max of 3 in flight at once.
  // The cap protects the merchant's Shopify admin API from a 24-call
  // burst while still draining the queue in a few seconds. Fire-and-
  // forget — failures are silently swallowed; the popup will fall
  // back to the live fetch path when an entry is missing from cache.
  useEffect(() => {
    const keys: string[] = [];
    for (const p of storeBestSellers || []) {
      const k = p.handle || String(p.id);
      if (k) keys.push(k);
    }
    for (const p of storeNewArrivals || []) {
      const k = p.handle || String(p.id);
      if (k && !keys.includes(k)) keys.push(k);
    }
    if (keys.length === 0) return;

    let cancelled = false;
    const MAX_CONCURRENT = 3;
    let cursor = 0;
    const next = async () => {
      while (!cancelled && cursor < keys.length) {
        const idx = cursor++;
        const key = keys[idx];
        try { await ensureProductDetail(key); } catch { /* swallow */ }
      }
    };
    const workers = Array.from({ length: Math.min(MAX_CONCURRENT, keys.length) }, () => next());
    Promise.all(workers).catch(() => {});
    return () => { cancelled = true; };
  }, [storeBestSellers, storeNewArrivals, ensureProductDetail]);

  const addToShopCart = useCallback((item: Omit<ShopCartItem, "qty">) => {
    setShopCart((prev) => {
      const existing = prev.find((i) => i.variantId === item.variantId);
      if (existing) return prev.map((i) => i.variantId === item.variantId ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const updateShopCartQty = useCallback((variantId: string, delta: number) => {
    setShopCart((prev) =>
      prev.map((i) => i.variantId === variantId ? { ...i, qty: i.qty + delta } : i).filter((i) => i.qty > 0)
    );
  }, []);

  const removeFromShopCart = useCallback((variantId: string) => {
    setShopCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const handleShopCheckout = useCallback(async () => {
    if (shopCart.length === 0) return;
    setShopCheckoutLoading(true);
    // Open the popup synchronously inside the click handler so the browser
    // treats it as part of the user gesture. After await we redirect the
    // already-open window to the real checkout URL (no popup blocker).
    const popup = window.open("", "shopify-checkout", "width=500,height=700,scrollbars=yes,resizable=yes");
    try {
      const checkoutSessionId = crypto.randomUUID?.() || `ck_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
      const res = await fetch(`${apiBaseUrl}/api/shopify/checkout/cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: shopCart.map((i) => ({ productId: i.productId, quantity: i.qty })),
          profileId,
          returnToUrl: window.location.href,
          checkoutSessionId,
        }),
      });
      const json = await res.json();
      if (json?.success === true && json?.data?.checkoutUrl) {
        if (popup && !popup.closed) popup.location.href = json.data.checkoutUrl;
      } else {
        popup?.close();
      }
    } catch {
      popup?.close();
    }
    setShopCheckoutLoading(false);
  }, [shopCart, apiBaseUrl, profileId]);

  // Open the popup. If the detail is already in the cache (the common
  // case once prefetch has drained), we set it synchronously inside
  // the same React batch as setProductDetailHandle — no loading flicker,
  // no seed-then-swap. Cache miss falls back to the live fetch with
  // the seeded card data as placeholder.
  const openProductDetail = useCallback(
    (cardName: string, cardImg: string, cardPrice: number, handle: string | undefined, idFallback: string) => {
      const key = handle || idFallback;
      setProductDetailHandle(key);
      setProductDetailVariantIdx(0);
      setProductDetailImageIdx(0);

      const cached = productDetailCacheRef.current.get(key);
      if (cached) {
        setProductDetail(cached);
        setProductDetailLoading(false);
        return;
      }

      // Cache miss: seed with the card values so the popup still has
      // something to render, then fetch the rest in the background.
      setProductDetail({
        id: idFallback,
        title: cardName,
        handle: handle || "",
        images: cardImg ? [{ id: "seed", url: cardImg, altText: cardName }] : [],
        variants: [],
        priceRange: cardPrice > 0
          ? { min: { amount: String(cardPrice), currencyCode: "USD" } }
          : undefined,
      });
      setProductDetailLoading(true);
      ensureProductDetail(key)
        .then((detail) => {
          // Race-guard: a fast click on another card could resolve out
          // of order — skip the stale payload.
          setProductDetailHandle((current) => {
            if (current === key && detail) {
              setProductDetail(detail);
              setProductDetailLoading(false);
            } else if (current !== key) {
              // Stale resolve for a different card — leave loading
              // alone so the in-flight fetch for the current card
              // still controls the spinner.
            } else {
              setProductDetailLoading(false);
            }
            return current;
          });
        })
        .catch(() => {
          setProductDetailHandle((current) => {
            if (current === key) setProductDetailLoading(false);
            return current;
          });
        });
    },
    [ensureProductDetail],
  );

  // Close with a short zoom-out animation (200ms), then unmount.
  // Backdrop gets pointer-events:none the moment closing starts so
  // clicks on cards behind it pass through immediately — avoids the
  // old "needs 2-3 clicks" bug where a lingering backdrop intercepted
  // the next card click.
  const closeProductDetail = useCallback(() => {
    if (productDetailCloseTimerRef.current) clearTimeout(productDetailCloseTimerRef.current);
    setProductDetailClosing(true);
    productDetailCloseTimerRef.current = setTimeout(() => {
      setProductDetailHandle(null);
      setProductDetail(null);
      setProductDetailLoading(false);
      setProductDetailClosing(false);
    }, 230);
  }, []);

  // Escape key + body-scroll lock while the popup is open. We also
  // compensate for the scrollbar gutter so locking doesn't shift the
  // page content by ~15px — that shift was causing the user's next
  // click after closing the modal to land in the gap between cards.
  useEffect(() => {
    if (!productDetailHandle) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeProductDetail();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) document.body.style.paddingRight = `${scrollbarWidth}px`;
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [productDetailHandle, closeProductDetail]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Theme tokens derived from profile bg (matches ProfilePage SPA palette) ──
  // askAi.textColor wins if explicitly set in admin, otherwise fall back to derived accent.
  // For dark themes (e.g. fitness/Kept on near-black bg) the auto-derived accent
  // turns into a loud neon — force white instead so dark themes stay strictly
  // black + white. Light themes keep their derived accent.
  const autoTheme = deriveAutoTheme(backgroundColor);
  const isDark = isHexDark(backgroundColor);
  const accent = isDark
    ? "#ffffff"
    : ((askAi?.textColor && /^#[0-9a-fA-F]{6}$/.test(askAi.textColor)) ? askAi.textColor : autoTheme.accentColor);
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
    // Only run typewriter when the chat hero is visible. On shop/bestsellers/
    // newarrival tabs the tagline isn't rendered but setTaglineDisplay still
    // re-renders AskPage every 75ms — which causes ProductCard (defined inside
    // the render) to get a new component identity and remount all cards,
    // making card clicks intermittently fail.
    if (currentView !== "chat") return;

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
  }, [chips, currentView]);

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
    // New Chat always returns the main column to the chat surface, even if
    // the user was browsing the Shop tab when they clicked it.
    router.push(`/${slug}/ask`);
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
          {/* Sidebar tabs — each tab is a real route so URL + browser
              history + deep-linking all work, and each surface mounts
              its own AskPage instance (clean state per view, no stale
              modal timers carrying across).
                Ask         → /[slug]/ask           (everyone)
                Shop        → /[slug]/shop          (brand only)
                Best Sellers→ /[slug]/best-sellers  (brand only)
                New Arrival → /[slug]/new-arrival   (brand only)
              Solo creators see just the Ask tab. */}
          {(() => {
            type TabKey = "chat" | "shop" | "bestsellers" | "newarrival";
            type Tab = { key: TabKey; label: string; href: string; icon: React.ReactNode };
            const allTabs: Tab[] = [
              {
                key: "chat",
                label: `Ask ${name}`,
                href: viewHrefs.chat,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                ),
              },
              {
                key: "shop",
                label: "Shop",
                href: viewHrefs.shop,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <path d="M16 10a4 4 0 0 1-8 0" />
                  </svg>
                ),
              },
              {
                key: "bestsellers",
                label: "Best Sellers",
                href: viewHrefs.bestsellers,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                ),
              },
              {
                key: "newarrival",
                label: "New Arrival",
                href: viewHrefs.newarrival,
                icon: (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v4" />
                    <path d="M12 18v4" />
                    <path d="M4.93 4.93l2.83 2.83" />
                    <path d="M16.24 16.24l2.83 2.83" />
                    <path d="M2 12h4" />
                    <path d="M18 12h4" />
                    <path d="M4.93 19.07l2.83-2.83" />
                    <path d="M16.24 7.76l2.83-2.83" />
                  </svg>
                ),
              },
            ];
            // Solo creators only see the Ask tab — the shop surfaces
            // require a connected Shopify store, which they don't have.
            // Temporary: also hide shop tabs for the `kept` slug while
            // the merchandising experience is being finalized. Remove
            // this slug check once the Kept storefront is ready to ship.
            const hideShopTabs = !showShopTabs || slug === "kept";
            const tabs = hideShopTabs ? allTabs.filter((t) => t.key === "chat") : allTabs;
            return (
              <div style={{ padding: "14px 8px 16px", display: "flex", flexDirection: "column", gap: 4 }}>
                {tabs.map((t) => {
                  const active = currentView === t.key;
                  return (
                    <Link
                      key={t.key}
                      href={t.href}
                      prefetch
                      style={{
                        width: "100%", padding: "10px 12px", borderRadius: 10,
                        background: active ? withAlpha(accent, isDark ? 0.22 : 0.14) : "transparent",
                        color: active ? textColor : mutedText,
                        fontFamily: "inherit",
                        display: "flex", alignItems: "center", gap: 10,
                        fontSize: 13, fontWeight: active ? 600 : 500,
                        textDecoration: "none",
                        transition: "background 0.12s, color 0.12s",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = chipHoverBg;
                          (e.currentTarget as HTMLElement).style.color = textColor;
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                          (e.currentTarget as HTMLElement).style.color = mutedText;
                        }
                      }}
                    >
                      {t.icon}
                      {t.label}
                    </Link>
                  );
                })}
              </div>
            );
          })()}
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
            // Sits above the sticky hero header (which is z-index: 5) so the
            // chevron isn't clipped by the header's backdrop-blur band when
            // the page first paints with the sidebar open.
            zIndex: 10,
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
        /* Hero pane scrolls when its content (long card list) overflows the
           viewport, but the scrollbar is hidden so the page reads as a clean
           single screen. Wheel / touch / keyboard scrolling all still work. */
        .ask-hero-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        .ask-hero-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }
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
      {!hasMessages && currentView === "chat" && (
        <div className="ask-hero-scroll" style={{ background: heroGradient, flex: 1, display: "flex", flexDirection: "column", overflowY: "auto" }}>
          {/* Header — sticky at the top of the scrolling pane so the nav
              (logo + breadcrumb links) stays visible while featured cards
              scroll past underneath. headerBg + blur lets the gradient
              read through subtly without hurting legibility. */}
          <header className="ask-hero-header" style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", justifyContent: "space-between", padding: sidebarOpen ? "20px 36px" : "20px 36px 20px 70px", margin: "0 auto", width: "100%",  backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
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
              <span>{STATIC_TAGLINE.replace("{name}", name)}</span>
            </div>
            <h1 style={{ fontSize: 52, fontWeight: 800, color: textColor, margin: "0 0 8px", lineHeight: 1.12, letterSpacing: "-0.8px" }}>
              Ask {name} for
            </h1>
            {/* Generous lineHeight + a sliver of paddingBottom give italic
                glyph descenders (like `?`) room without disturbing layout.
                Uses textColor (auto-derived from the page bg — dark on light
                themes, light on dark themes) so the typewriter line reads
                strong and on-theme without picking up the brand accent. */}
            <p style={{
              fontSize: 38, fontWeight: 700, margin: "0 0 48px",
              lineHeight: 1.25,
              paddingBottom: 6,
              color: textColor,
              padding: "0 4px",
              fontStyle: "italic", letterSpacing: "-0.3px",
              minHeight: "1.25em",
            }}>
              &lsquo;{taglineDisplay || "\u00A0"}&rsquo;.
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
                <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                    placeholder={chatPlaceholder}
                    rows={3}
                    disabled={isTyping}
                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 14, padding: 0, background: "transparent", color: textColor, fontFamily: "inherit", resize: "none", lineHeight: 1.6, minHeight: 72 }}
                  />
                  <button type="submit" disabled={isTyping || !chatInput.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: isTyping || !chatInput.trim() ? sendDisabledBg : accent, cursor: isTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={userBubbleText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
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

            {/* Featured questions — driven by the bootstrap's
                `featuredQuestions` list (server-side, see
                _lib/featuredArticles.ts). Each card deep-links to the
                internal /[slug]/featured/[handle] surface so the whole
                article experience stays on our domain. */}
            {featuredQuestions.length > 0 && (
              <div style={{ width: "100%", maxWidth: 540, marginTop: 43, display: "flex", flexDirection: "column", gap: 10 }}>
                {featuredQuestions.map((q) => (
                  <a
                    key={q.handle}
                    href={`/${slug}/${q.handle}`}
                    style={{
                      width: "100%",
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
                        Featured question
                      </span>
                      <span style={{ fontSize: 13, color: textColor, fontWeight: 500, lineHeight: 1.4 }}>
                        {q.question}
                      </span>
                    </span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={mutedText} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <line x1="7" y1="17" x2="17" y2="7" />
                      <polyline points="7 7 17 7 17 17" />
                    </svg>
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Footer — sits inline below the hero section, inside the
              scrolling pane, so it scrolls in after the content rather than
              floating fixed at the viewport bottom. flexShrink:0 + marginTop:auto
              would dock it; we explicitly DON'T do that — content-flow only. */}
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
        </div>
      )}

      {/* ══ CHAT MODE — fixed header, scrollable messages, fixed input ══ */}
      {hasMessages && currentView === "chat" && (
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
              <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(chatInput); } }}
                  placeholder={askAi?.questionPlaceholder || `Ask ${name} about brands, outfit advice, or product reviews...`}
                  rows={3}
                  disabled={isTyping}
                  style={{ flex: 1, minWidth: 0, border: "none", outline: "none", fontSize: 14, padding: 0, background: "transparent", color: textColor, fontFamily: "inherit", resize: "none", lineHeight: 1.6, minHeight: 72 }}
                />
                <button type="submit" disabled={isTyping || !chatInput.trim()} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: isTyping || !chatInput.trim() ? sendDisabledBg : accent, cursor: isTyping ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={userBubbleText} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 19V5" /><path d="M5 12l7-7 7 7" />
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

      {/* ══ SHOP VIEW — dummy e-commerce storefront ══
          Pure black/white theme — no gradients. Dark profile bg → black
          surface with white text; light bg → white surface with black text.
          Includes top toolbar (search + wishlist/account/cart), Trending
          Categories grid, Best Sellers, BOGO promo banner, AI Recommended,
          New Arrivals, and a slide-in cart drawer with checkout. */}
      {(currentView === "shop" || currentView === "bestsellers" || currentView === "newarrival") && (() => {
        const shopBg = isDark ? "#000000" : "#ffffff";
        const shopText = isDark ? "#ffffff" : "#111111";
        const shopMuted = isDark ? "rgba(255,255,255,0.62)" : "rgba(17,24,39,0.62)";
        const shopFaint = isDark ? "rgba(255,255,255,0.45)" : "rgba(17,24,39,0.45)";
        const shopCardBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)";
        const shopCardBorder = isDark ? "rgba(255,255,255,0.10)" : "rgba(0,0,0,0.08)";
        const shopChipBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
        const shopBtnBg = isDark ? "#ffffff" : "#111111";
        const shopBtnText = isDark ? "#111111" : "#ffffff";
        const shopHeaderBg = isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)";
        const trending = [
          { label: "Dresses", count: 128, img: "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=400&h=400&fit=crop&auto=format" },
          { label: "Tops", count: 96, img: "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=400&h=400&fit=crop&auto=format" },
          { label: "Beauty", count: 84, img: "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=400&h=400&fit=crop&auto=format" },
          { label: "Accessories", count: 102, img: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?w=400&h=400&fit=crop&auto=format" },
          { label: "Footwear", count: 67, img: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=400&h=400&fit=crop&auto=format" },
          { label: "Bags", count: 58, img: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop&auto=format" },
          { label: "Fragrance", count: 36, img: "https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop&auto=format" },
          { label: "Jewelry", count: 72, img: "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?w=400&h=400&fit=crop&auto=format" },
        ];

        type Product = { id: string; name: string; variant: string; rating: number; reviews: number; price: number; img: string; handle?: string };

        // Map a Shopify admin-API product (shape returned by the express
        // `/api/storefront/:slug/...` routes — same as the dashboard's
        // Products page) onto the local card model. Rating + reviews aren't
        // tracked by Shopify so they fall back to 0 and the card just
        // hides them. `handle` is preserved so the "click a card → open
        // product popup" flow can call the detail endpoint without
        // re-fetching the list.
        const mapStorefrontToProduct = (sp: StorefrontProduct): Product => {
          const img = sp.featuredImage?.url || "";
          const priceStr = sp.firstVariant?.price ?? sp.priceRange?.min?.amount ?? "0";
          const priceNum = parseFloat(String(priceStr));
          return {
            id: String(sp.id),
            name: sp.title || "Untitled",
            variant: sp.vendor || sp.productType || "",
            rating: 0,
            reviews: 0,
            price: Number.isFinite(priceNum) ? priceNum : 0,
            img,
            handle: sp.handle,
          };
        };

        // Live products from the merchant's Shopify store (server-fetched
        // per slug). For solo creators or stores with no products yet, the
        // arrays come in empty and we fall back to the curated mock list
        // so the page still has something visual during development.
        const liveBestSellers = (storeBestSellers || []).map(mapStorefrontToProduct).filter((p) => p.img);
        const liveNewArrivals = (storeNewArrivals || []).map(mapStorefrontToProduct).filter((p) => p.img);

        // Only show live products from the merchant's Shopify store.
        // No fallback to mock data — if the store isn't connected or has
        // no products the section shows an empty state instead.
        const bestSellers: Product[] = liveBestSellers;
        const newArrivals: Product[] = liveNewArrivals;

        const cartSubtotal = shopCart.reduce((s, i) => s + i.price * i.qty, 0);
        const cartCount = shopCart.reduce((s, i) => s + i.qty, 0);

        // Deduplicated pool of all products for search. bestSellers +
        // newArrivals may overlap, so we key by id.
        const allProductsMap = new Map<string, Product>();
        [...bestSellers, ...newArrivals].forEach((p) => allProductsMap.set(p.id, p));
        const allProducts = Array.from(allProductsMap.values());

        const q = shopSearch.trim().toLowerCase();
        const searchResults: Product[] = q
          ? allProducts.filter((p) =>
              p.name.toLowerCase().includes(q) || p.variant.toLowerCase().includes(q)
            )
          : [];

        // Click anywhere on the card (or the Buy Now button) opens the
        // product detail popup. We pass the card's already-known
        // name/image/price as a seed so the popup renders something
        // instantly; the richer detail (variants + descriptionHtml +
        // all images) streams in from the storefront detail endpoint.
        // Plain render-function (not a React component). Called directly in
        // .map() so React sees stable <div> elements instead of a new component
        // type on every re-render. Component syntax (<ProductCard />) would
        // cause React to unmount+remount all cards on each parent re-render
        // (because the function reference changes), making click events drop.
        const renderProductCard = (p: Product, keyPrefix = "") => (
          <div
            key={keyPrefix + p.id}
            role="button"
            tabIndex={0}
            onClick={() => openProductDetail(p.name, p.img, p.price, p.handle, p.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openProductDetail(p.name, p.img, p.price, p.handle, p.id);
              }
            }}
            style={{ borderRadius: 14, border: `1px solid ${shopCardBorder}`, background: shopCardBg, overflow: "hidden", display: "flex", flexDirection: "column", cursor: "pointer", transition: "transform 0.18s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.18s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = isDark ? "0 8px 20px rgba(0,0,0,0.35)" : "0 8px 20px rgba(0,0,0,0.08)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
          >
            <div style={{ position: "relative", aspectRatio: "3/4", overflow: "hidden", background: shopChipBg }}>
              <img src={p.img} alt={p.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {/* Wishlist heart commented out — feature not wired yet. */}
              {/*
              <button type="button" aria-label="Wishlist" onClick={(e) => e.stopPropagation()} style={{ position: "absolute", top: 10, right: 10, width: 30, height: 30, borderRadius: "50%", border: "none", background: shopBg, color: shopText, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
              </button>
              */}
            </div>
            <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: shopText, lineHeight: 1.3, flex: 1 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: shopMuted }}>{p.variant}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: shopMuted }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#f59e0b" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                {p.rating.toFixed(1)} ({p.reviews})
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: shopText, marginTop: 2 }}>${p.price.toFixed(2)}</div>
              <button type="button" onClick={(e) => { e.stopPropagation(); openProductDetail(p.name, p.img, p.price, p.handle, p.id); }} style={{ marginTop: "auto", paddingTop: 9, paddingBottom: 9, paddingLeft: 12, paddingRight: 12, width: "100%", borderRadius: 10, border: `1px solid ${shopCardBorder}`, background: shopChipBg, color: shopText, fontSize: 12, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 0 1-8 0" /></svg>
                Buy Now
              </button>
            </div>
          </div>
        );

        return (
          <div className="ask-hero-scroll" style={{ background: shopBg, flex: 1, display: "flex", flexDirection: "column", overflowY: "auto", position: "relative" }}>
            {/* Sticky top toolbar — search bar + wishlist/account/cart */}
            <header style={{ position: "sticky", top: 0, zIndex: 5, display: "flex", alignItems: "center", gap: 16, padding: sidebarOpen ? "14px 28px" : "14px 28px 14px 70px", background: shopHeaderBg, backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: `1px solid ${shopCardBorder}` }}>
              <div style={{ flex: 1, maxWidth: 640, margin: "0 auto", position: "relative" }}>
                <svg style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={shopMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  type="text"
                  value={shopSearch}
                  onChange={(e) => setShopSearch(e.target.value)}
                  placeholder="Search products"
                  style={{ width: "100%", height: 42, padding: "0 50px 0 44px", borderRadius: 50, border: `1px solid ${shopCardBorder}`, background: shopChipBg, color: shopText, fontSize: 13, outline: "none", fontFamily: "inherit" }}
                />
                {shopSearch ? (
                  <button type="button" aria-label="Clear search" onClick={() => setShopSearch("")} style={{ position: "absolute", right: 6, top: 6, width: 30, height: 30, borderRadius: "50%", border: "none", background: shopChipBg, color: shopMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                ) : (
                  <button type="button" aria-label="Search" style={{ position: "absolute", right: 6, top: 6, width: 30, height: 30, borderRadius: "50%", border: "none", background: shopChipBg, color: shopText, cursor: "default", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </button>
                )}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexShrink: 0 }}>
                {/* Wishlist + Account commented out per requirement —
                    not part of the current scope but kept here in case
                    they need to come back. */}
                {/*
                <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 0, border: "none", background: "transparent", color: shopText, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  Wishlist
                </button>
                <button type="button" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 0, border: "none", background: "transparent", color: shopText, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  Account
                </button>
                */}
                <button type="button" onClick={() => setShopCartOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: 0, border: "none", background: "transparent", color: shopText, fontSize: 13, fontWeight: 600, cursor: "pointer", position: "relative" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
                  Cart
                  {cartCount > 0 && (
                    <span style={{ position: "absolute", top: -8, right: -14, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 9, background: shopBtnBg, color: shopBtnText, fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{cartCount}</span>
                  )}
                </button>
              </div>
            </header>

            {/* Body */}
            <div className="shop-body" style={{ padding: "28px 36px 36px", display: "flex", flexDirection: "column", gap: 36 }}>
              {/* Title row — the big "Shop" heading + curated-style
                  description is the storefront landing's identity, so
                  it's intentionally only rendered on the Shop tab. The
                  Best Sellers / New Arrival tabs already self-identify
                  via their section headings below. */}
              {!q && currentView === "shop" && (
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h1 style={{ fontSize: 36, fontWeight: 800, color: shopText, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Shop</h1>
                  <div style={{ fontSize: 13, color: shopMuted }}>Curated style, chosen for you.</div>
                </div>
                {/* Sort-by filter commented out — not wired to anything
                    real yet and the requirement is to hide it for now. */}
                {/*
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 8, border: `1px solid ${shopCardBorder}`, background: shopChipBg, color: shopText, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                  <span>Sort by:</span>
                  <strong style={{ fontWeight: 700 }}>Featured</strong>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                </div>
                */}
              </div>
              )}

              {/* Trending Categories — commented out per boss requirement.
                  Kept in source for easy re-enable when product wants it back. */}
              {/*
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: shopText, margin: 0 }}>Trending Categories</h3>
                  <a href="#" style={{ fontSize: 12, color: shopMuted, textDecoration: "none" }}>View all</a>
                </div>
                <div className="shop-cat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(8, minmax(0, 1fr))", gap: 12 }}>
                  {trending.map((c) => (
                    <div key={c.label} style={{ borderRadius: 14, border: `1px solid ${shopCardBorder}`, background: shopCardBg, overflow: "hidden", cursor: "pointer" }}>
                      <div style={{ aspectRatio: "1/1", background: shopChipBg, position: "relative" }}>
                        <img src={c.img} alt={c.label} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent 55%)" }} />
                        <div style={{ position: "absolute", left: 10, bottom: 8, color: "#fff" }}>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{c.label}</div>
                          <div style={{ fontSize: 10, opacity: 0.75 }}>{c.count} items</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              */}

              {/* ── Search results — replaces all sections when active ── */}
              {q && (
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: shopText, margin: 0 }}>
                      {searchResults.length > 0
                        ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} for "${shopSearch.trim()}"`
                        : `No results for "${shopSearch.trim()}"`}
                    </h3>
                  </div>
                  {searchResults.length > 0 ? (
                    <div className="shop-prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
                      {searchResults.map((p) => renderProductCard(p, "sr-"))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "48px 0", color: shopMuted, fontSize: 14 }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, marginBottom: 12, display: "block", margin: "0 auto 12px" }}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      Try a different keyword
                    </div>
                  )}
                </section>
              )}

              {/* Best Sellers — shown on the "shop" and "bestsellers" tabs.
                  Hidden on "newarrival" so that tab is dedicated to its
                  own list. */}
              {!q && (currentView === "shop" || currentView === "bestsellers") && (
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: shopText, margin: 0, textDecoration: "none", textUnderlineOffset: 4 }}>Best Sellers</h3>
                    {/* "View all" link commented out — no destination wired
                        yet (the Best Sellers tab itself is the destination). */}
                    {/* <a href="#" style={{ fontSize: 12, color: shopMuted, textDecoration: "none" }}>View all</a> */}
                  </div>
                  {bestSellers.length > 0 ? (
                    <div className="shop-prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
                      {bestSellers.map((p) => renderProductCard(p))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "48px 0", color: shopMuted, fontSize: 14 }}>No products available yet</div>
                  )}
                </section>
              )}

              {/* BOGO Promo banner / Limited Time Offer — commented out per
                  boss requirement. */}
              {/*
              <div style={{ borderRadius: 16, background: shopChipBg, border: `1px solid ${shopCardBorder}`, padding: "22px 28px", display: "flex", alignItems: "center", gap: 24, position: "relative", overflow: "hidden" }}>
                <div style={{ flex: 1, minWidth: 0, position: "relative", zIndex: 1 }}>
                  <div style={{ display: "inline-flex", padding: "3px 12px", borderRadius: 99, background: shopBg, border: `1px solid ${shopCardBorder}`, color: shopText, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", marginBottom: 10 }}>LIMITED TIME OFFER</div>
                  <h3 style={{ fontSize: 24, fontWeight: 800, color: shopText, margin: "0 0 6px" }}>Buy 2, Get 1 Free 🎁</h3>
                  <p style={{ fontSize: 13, color: shopMuted, margin: "0 0 14px", lineHeight: 1.55, maxWidth: 460 }}>
                    Mix &amp; match across beauty &amp; skincare. Add 3 eligible items to your cart — the lowest-priced item is on us.
                  </p>
                  <button type="button" style={{ padding: "9px 18px", borderRadius: 8, border: `1px solid ${shopCardBorder}`, background: shopBg, color: shopText, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Shop the Offer</button>
                </div>
                <div style={{ position: "absolute", right: 28, top: "50%", transform: "translateY(-50%)", width: 88, height: 88, borderRadius: "50%", background: "#FFD27A", color: "#1a1a1a", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, lineHeight: 1.1, textAlign: "center" }}>
                  BOGO<br />FREE
                </div>
              </div>
              */}

              {/* AI Recommended — commented out per boss requirement. */}
              {/*
              <section>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: shopText, margin: 0, display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span>✨</span> AI Recommended For You
                  </h3>
                  <a href="#" style={{ fontSize: 12, color: shopMuted, textDecoration: "none" }}>View all</a>
                </div>
                <div className="shop-prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
                  {aiPicks.map((p) => renderProductCard(p, "ai-"))}
                </div>
              </section>
              */}

              {/* New Arrivals — shown on the "shop" and "newarrival" tabs.
                  Hidden on "bestsellers" so that tab is dedicated to its
                  own list. Hidden while search is active. */}
              {!q && (currentView === "shop" || currentView === "newarrival") && (
                <section>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: shopText, margin: 0 }}>New Arrivals</h3>
                    {/* "View all" link commented out — no destination wired
                        yet (the New Arrival tab itself is the destination). */}
                    {/* <a href="#" style={{ fontSize: 12, color: shopMuted, textDecoration: "none" }}>View all</a> */}
                  </div>
                  {newArrivals.length > 0 ? (
                    <div className="shop-prod-grid" style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 12 }}>
                      {newArrivals.map((p) => renderProductCard(p, "na-"))}
                    </div>
                  ) : (
                    <div style={{ textAlign: "center", padding: "48px 0", color: shopMuted, fontSize: 14 }}>No products available yet</div>
                  )}
                </section>
              )}
            </div>

            {/* ── Product detail popup ──
                Opens with a zoom-in / fade-up animation (intro.co's
                marketplace-filter feel: cubic-bezier(0.16, 1, 0.3, 1),
                ~250ms scale+translate+opacity). The card stays mounted
                for ~220ms after `closeProductDetail` is called so the
                reverse keyframes can play before unmount. Backdrop
                click + Escape + X button all close. */}
            {productDetailHandle && (
              <>
                <style>{`
                  @keyframes ask-pd-bg-in   { from { opacity: 0; }                          to { opacity: 1; } }
                  @keyframes ask-pd-bg-out  { from { opacity: 1; }                          to { opacity: 0; } }
                  @keyframes ask-pd-card-in { from { opacity: 0; transform: scale(0.05); }  to { opacity: 1; transform: scale(1); } }
                  @keyframes ask-pd-card-out{ from { opacity: 1; transform: scale(1); }     to { opacity: 0; transform: scale(0.05); } }
                  .ask-pd-overlay         { animation: ask-pd-bg-in  0.22s ease-out both; }
                  .ask-pd-overlay.closing { animation: ask-pd-bg-out 0.22s ease-in  both; pointer-events: none; }
                  .ask-pd-card            { transform-origin: center center; animation: ask-pd-card-in  0.3s  cubic-bezier(0.34, 1.15, 0.64, 1) both; }
                  .ask-pd-card.closing    { transform-origin: center center; animation: ask-pd-card-out 0.22s cubic-bezier(0.4, 0, 0.6, 0)      both; }
                  .ask-pd-thumb { transition: border-color 0.15s ease, transform 0.15s ease; }
                  .ask-pd-thumb:hover { transform: translateY(-1px); }
                  @media (max-width: 720px) {
                    .ask-pd-card { flex-direction: column !important; max-height: 92vh !important; }
                    .ask-pd-card .ask-pd-gallery { width: 100% !important; aspect-ratio: 1/1; }
                    .ask-pd-card .ask-pd-body { width: 100% !important; }
                  }
                `}</style>
                <div
                  className={`ask-pd-overlay${productDetailClosing ? " closing" : ""}`}
                  onClick={productDetailClosing ? undefined : closeProductDetail}
                  style={{
                    position: "fixed",
                    inset: 0,
                    background: "rgba(0,0,0,0.55)",
                    backdropFilter: "blur(6px)",
                    WebkitBackdropFilter: "blur(6px)",
                    zIndex: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 20,
                  }}
                >
                  <div
                    className={`ask-pd-card${productDetailClosing ? " closing" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label={productDetail?.title || "Product detail"}
                    style={{
                      width: "100%",
                      maxWidth: 880,
                      maxHeight: "88vh",
                      display: "flex",
                      flexDirection: "row",
                      background: shopBg,
                      color: shopText,
                      borderRadius: 20,
                      overflow: "hidden",
                      boxShadow: "0 30px 80px rgba(0,0,0,0.35), 0 8px 24px rgba(0,0,0,0.18)",
                      border: `1px solid ${shopCardBorder}`,
                      position: "relative",
                      willChange: "transform, opacity",
                    }}
                  >
                    {/* Close button */}
                    <button
                      type="button"
                      aria-label="Close product detail"
                      onClick={closeProductDetail}
                      style={{
                        position: "absolute",
                        top: 14,
                        right: 14,
                        width: 34,
                        height: 34,
                        borderRadius: "50%",
                        border: "none",
                        background: shopChipBg,
                        color: shopText,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        zIndex: 3,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    {/* Left — gallery */}
                    <div
                      className="ask-pd-gallery"
                      style={{
                        width: "52%",
                        flexShrink: 0,
                        background: shopChipBg,
                        position: "relative",
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      <div style={{ flex: 1, position: "relative", overflow: "hidden", aspectRatio: "1/1" }}>
                        {(() => {
                          const imgs = productDetail?.images || [];
                          const activeImg = imgs[productDetailImageIdx]?.url || imgs[0]?.url || "";
                          return activeImg ? (
                            <img
                              src={activeImg}
                              alt={productDetail?.title || ""}
                              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: shopFaint, fontSize: 13 }}>
                              No image
                            </div>
                          );
                        })()}
                      </div>
                      {(productDetail?.images?.length || 0) > 1 && (
                        <div style={{ padding: "10px 12px", display: "flex", gap: 8, overflowX: "auto", borderTop: `1px solid ${shopCardBorder}` }}>
                          {(productDetail?.images || []).slice(0, 8).map((img, idx) => (
                            <button
                              key={img.id || idx}
                              type="button"
                              className="ask-pd-thumb"
                              onClick={() => setProductDetailImageIdx(idx)}
                              style={{
                                width: 54,
                                height: 54,
                                borderRadius: 8,
                                overflow: "hidden",
                                border: idx === productDetailImageIdx ? `2px solid ${shopText}` : `1px solid ${shopCardBorder}`,
                                background: shopCardBg,
                                padding: 0,
                                cursor: "pointer",
                                flexShrink: 0,
                              }}
                            >
                              <img src={img.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right — body */}
                    <div
                      className="ask-pd-body"
                      style={{
                        width: "48%",
                        display: "flex",
                        flexDirection: "column",
                        padding: "26px 28px 22px",
                        overflowY: "auto",
                        gap: 14,
                      }}
                    >
                      {productDetail?.vendor && (
                        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: shopMuted }}>
                          {productDetail.vendor}
                        </div>
                      )}
                      <h2 style={{ fontSize: 22, fontWeight: 800, color: shopText, margin: 0, lineHeight: 1.25 }}>
                        {productDetail?.title || ""}
                      </h2>

                      {/* Price + compareAt */}
                      {(() => {
                        const variants = productDetail?.variants || [];
                        const v = variants[productDetailVariantIdx];
                        const price = v?.price
                          ? `$${parseFloat(v.price).toFixed(2)}`
                          : productDetail?.priceRange?.min?.amount
                            ? `$${parseFloat(productDetail.priceRange.min.amount).toFixed(2)}`
                            : "";
                        const compareAt = v?.compareAtPrice
                          ? `$${parseFloat(v.compareAtPrice).toFixed(2)}`
                          : "";
                        return price ? (
                          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                            <span style={{ fontSize: 24, fontWeight: 800, color: shopText }}>{price}</span>
                            {compareAt && compareAt !== price && (
                              <span style={{ fontSize: 14, color: shopMuted, textDecoration: "line-through" }}>{compareAt}</span>
                            )}
                          </div>
                        ) : null;
                      })()}

                      {/* Variants */}
                      {(productDetail?.variants?.length || 0) > 1 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: shopMuted }}>Options</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {(productDetail?.variants || []).map((v, idx) => {
                              const selected = idx === productDetailVariantIdx;
                              return (
                                <button
                                  key={v.id}
                                  type="button"
                                  onClick={() => setProductDetailVariantIdx(idx)}
                                  style={{
                                    padding: "8px 14px",
                                    borderRadius: 999,
                                    border: selected ? `1.5px solid ${shopText}` : `1px solid ${shopCardBorder}`,
                                    background: selected ? shopText : shopChipBg,
                                    color: selected ? shopBg : shopText,
                                    fontSize: 12,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    fontFamily: "inherit",
                                  }}
                                >
                                  {v.title}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      {productDetail?.descriptionHtml && (
                        <div
                          style={{
                            fontSize: 13,
                            lineHeight: 1.6,
                            color: shopMuted,
                            maxHeight: 220,
                            overflowY: "auto",
                          }}
                          dangerouslySetInnerHTML={{ __html: productDetail.descriptionHtml }}
                        />
                      )}

                      {productDetailLoading && (
                        <div style={{ fontSize: 12, color: shopMuted, display: "inline-flex", alignItems: "center", gap: 8 }}>
                          <span
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              border: `2px solid ${shopCardBorder}`,
                              borderTopColor: shopText,
                              animation: "spin 0.7s linear infinite",
                              display: "inline-block",
                            }}
                          />
                          Loading details…
                        </div>
                      )}

                      {/* CTA */}
                      <div style={{ marginTop: "auto", display: "flex", gap: 10, paddingTop: 10 }}>
                        <button
                          type="button"
                          style={{
                            flex: 1,
                            padding: "12px 18px",
                            borderRadius: 12,
                            border: "none",
                            background: shopBtnBg,
                            color: shopBtnText,
                            fontSize: 14,
                            fontWeight: 700,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            transition: "transform 0.12s ease, opacity 0.12s ease",
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                          onClick={() => {
                            if (!productDetail) return;
                            const variant = productDetail.variants?.[productDetailVariantIdx];
                            const variantId = variant?.id || productDetail.id;
                            const variantTitle = variant?.title && variant.title !== "Default Title" ? variant.title : "";
                            const price = parseFloat(variant?.price || String(productDetail.priceRange?.min?.amount || "0")) || 0;
                            const img = productDetail.images?.[0]?.url || "";
                            addToShopCart({ variantId, productId: productDetail.id, name: productDetail.title, variant: variantTitle, price, img });
                            setShopCartOpen(true);
                            closeProductDetail();
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Cart drawer (right slide-in) ── */}
            {shopCartOpen && (
              <>
                <div onClick={() => setShopCartOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 100, animation: "shopFadeIn 0.2s ease both" }} />
                <aside style={{ position: "fixed", top: 0, right: 0, width: 380, maxWidth: "100vw", height: "100vh", background: shopBg, borderLeft: `1px solid ${shopCardBorder}`, zIndex: 101, display: "flex", flexDirection: "column", animation: "shopSlideIn 0.28s cubic-bezier(0.22, 1, 0.36, 1) both" }}>
                  <div style={{ padding: "18px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${shopCardBorder}` }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: shopText, margin: 0 }}>Your Cart ({cartCount})</h3>
                    <button onClick={() => setShopCartOpen(false)} aria-label="Close cart" style={{ width: 28, height: 28, borderRadius: "50%", border: "none", background: shopChipBg, color: shopText, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                    {shopCart.length === 0 ? (
                      <div style={{ textAlign: "center", padding: "40px 0", color: shopMuted, fontSize: 13 }}>Your cart is empty</div>
                    ) : shopCart.map((it) => (
                      <div key={it.variantId} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                        {it.img && <img src={it.img} alt={it.name} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10, border: `1px solid ${shopCardBorder}` }} />}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: shopText, marginBottom: 2 }}>{it.name}</div>
                          {it.variant && <div style={{ fontSize: 11, color: shopMuted, marginBottom: 6 }}>{it.variant}</div>}
                          <div style={{ fontSize: 13, fontWeight: 800, color: shopText, marginBottom: 8 }}>${it.price.toFixed(2)}</div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ display: "inline-flex", alignItems: "center", borderRadius: 8, border: `1px solid ${shopCardBorder}` }}>
                              <button type="button" onClick={() => updateShopCartQty(it.variantId, -1)} style={{ width: 26, height: 26, border: "none", background: "transparent", color: shopText, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>−</button>
                              <span style={{ width: 26, textAlign: "center", fontSize: 12, fontWeight: 700, color: shopText }}>{it.qty}</span>
                              <button type="button" onClick={() => updateShopCartQty(it.variantId, 1)} style={{ width: 26, height: 26, border: "none", background: "transparent", color: shopText, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>+</button>
                            </div>
                            <button type="button" aria-label="Remove" onClick={() => removeFromShopCart(it.variantId)} style={{ width: 26, height: 26, borderRadius: 6, border: "none", background: shopChipBg, color: shopMuted, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: "16px 20px 20px", borderTop: `1px solid ${shopCardBorder}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16, fontSize: 16, fontWeight: 800, color: shopText }}>
                      <span>Total</span><span>${cartSubtotal.toFixed(2)}</span>
                    </div>
                    <button type="button" onClick={handleShopCheckout} disabled={shopCheckoutLoading || shopCart.length === 0} style={{ width: "100%", padding: "12px 18px", borderRadius: 50, border: "none", background: shopBtnBg, color: shopBtnText, fontSize: 13, fontWeight: 700, cursor: shopCart.length === 0 ? "default" : "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: shopCart.length === 0 ? 0.5 : 1 }}>
                      {shopCheckoutLoading ? (
                        <span style={{ width: 14, height: 14, borderRadius: "50%", border: `2px solid ${shopBtnText}40`, borderTopColor: shopBtnText, animation: "spin 0.7s linear infinite", display: "inline-block" }} />
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                      )}
                      {shopCheckoutLoading ? "Processing..." : "Checkout Now"}
                    </button>
                    <div style={{ marginTop: 10, fontSize: 11, color: shopMuted, display: "flex", justifyContent: "center", alignItems: "center", gap: 6 }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="#16a34a" stroke="none"><polygon points="9 11 12 14 22 4 23 5 12 16 8 12 9 11"/></svg>
                      Secure checkout powered by {brand.name}
                    </div>
                  </div>
                </aside>
              </>
            )}
          </div>
        );
      })()}

      {/* Pulse animation */}
      <style>{`
        @keyframes askPulse { 0%,80%,100% { opacity:.3; transform:scale(.8); } 40% { opacity:1; transform:scale(1.2); } }
        @keyframes askCursorBlink { 0%,50% { opacity:1; } 51%,100% { opacity:0; } }
        .ask-dot { animation: askPulse 1.2s ease-in-out infinite; }
        /* Cart drawer slide-in + backdrop fade */
        @keyframes shopFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shopSlideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        /* Shop grids — collapse columns at narrower viewports so the page
           stays readable without horizontal scrolling. */
        @media (max-width: 1280px) {
          .shop-cat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .shop-prod-grid { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 900px) {
          .shop-prod-grid { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; }
          .shop-body { padding: 24px 20px 32px !important; }
        }
        @media (max-width: 640px) {
          .shop-cat-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .shop-prod-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        /* Hide horizontal scrollbar on chip row but keep scroll behavior */
        .ask-chip-row { scrollbar-width: none; -ms-overflow-style: none; }
        .ask-chip-row::-webkit-scrollbar { display: none; }
      `}</style>

      </div>{/* end main column */}
    </div>
  );
}
