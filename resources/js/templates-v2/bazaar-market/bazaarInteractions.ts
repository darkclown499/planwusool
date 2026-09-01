/**
 * Bazaar Market — premium micro-interaction / motion system
 * Scope: bazaar-market ONLY. No cross-template side effects.
 * Tokens: --bazaar-motion-fast / normal / section + --bazaar-ease
 * Patterns: CSS transitions + WAAPI + IntersectionObserver, transform/opacity only.
 */

let styleInjected = false;

// ------------------------------------------------------------------
// Reduced-motion helper (JS + CSS both respect it)
// ------------------------------------------------------------------
export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

// ------------------------------------------------------------------
// Central style injection — idempotent, Bazaar-scoped.
// Selectors are prefixed with [data-bazaar-motion] or .bazaar-*
 // so other templates are never touched.
// ------------------------------------------------------------------
export function ensureBazaarInteractionsStyle(): void {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const st = document.createElement('style');
  st.setAttribute('data-bazaar-interactions', 'true');
  st.textContent = `
    /* ── Bazaar motion tokens ── */
    :root {
      --bazaar-motion-fast: 150ms;
      --bazaar-motion-normal: 220ms;
      --bazaar-motion-section: 340ms;
      --bazaar-ease: cubic-bezier(0.22, 1, 0.36, 1);
      --bazaar-ease-out: cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* ── Reveal (IntersectionObserver → .is-visible) ── */
    [data-bazaar-reveal] {
      opacity: 0;
      transform: translateY(10px);
      transition:
        opacity var(--bazaar-motion-section) var(--bazaar-ease),
        transform var(--bazaar-motion-section) var(--bazaar-ease);
      will-change: opacity, transform;
    }
    [data-bazaar-reveal].is-visible {
      opacity: 1;
      transform: none;
    }
    /* stagger via inline --bazaar-idx */
    [data-bazaar-reveal][data-bazaar-stagger] {
      transition-delay: calc(min(var(--bazaar-idx, 0) * 32ms, 180ms));
    }
    /* section header accent */
    .bazaar-section-accent {
      transform: scaleX(0);
      transform-origin: right center;
      transition: transform var(--bazaar-motion-section) var(--bazaar-ease);
    }
    [data-bazaar-reveal].is-visible .bazaar-section-accent {
      transform: scaleX(1);
    }
    .bazaar-section-title {
      opacity: 0;
      transform: translateY(6px);
      transition:
        opacity var(--bazaar-motion-normal) var(--bazaar-ease) 80ms,
        transform var(--bazaar-motion-normal) var(--bazaar-ease) 80ms;
    }
    [data-bazaar-reveal].is-visible .bazaar-section-title {
      opacity: 1;
      transform: none;
    }

    /* ── Product card ── */
    .bazaar-card {
      transition:
        transform var(--bazaar-motion-normal) var(--bazaar-ease),
        box-shadow var(--bazaar-motion-normal) var(--bazaar-ease),
        border-color var(--bazaar-motion-normal) var(--bazaar-ease);
      will-change: transform;
    }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08), 0 4px 10px rgba(15, 23, 42, 0.06) !important;
        border-color: rgba(20, 184, 166, 0.18) !important;
      }
      .bazaar-card:hover .bazaar-card-img {
        transform: scale(1.03);
      }
      .bazaar-card:hover .bazaar-card-title {
        color: rgb(15 118 110) !important;
      }
    }
    .bazaar-card-img {
      transition: transform var(--bazaar-motion-normal) var(--bazaar-ease);
      will-change: transform;
    }
    /* mobile tap feedback — only active state, never interferes with scroll */
    .bazaar-card:active {
      transform: scale(0.985);
      transition-duration: 90ms;
    }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-card:active { transform: translateY(-1px) scale(0.99); }
    }

    /* ── Category pills/circles ── */
    .bazaar-cat {
      transition:
        transform var(--bazaar-motion-fast) var(--bazaar-ease),
        box-shadow var(--bazaar-motion-fast) var(--bazaar-ease);
    }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-cat:hover {
        transform: translateY(-2px);
      }
      .bazaar-cat:hover .bazaar-cat-ring {
        box-shadow: 0 8px 18px rgba(15, 23, 42, 0.08);
        border-color: rgba(20, 184, 166, 0.22) !important;
      }
      .bazaar-cat:hover img { transform: scale(1.04); }
    }
    .bazaar-cat:active { transform: scale(0.97); }
    .bazaar-cat img { transition: transform var(--bazaar-motion-normal) var(--bazaar-ease); }

    /* ── Buttons (primary) ── */
    .bazaar-btn {
      transition:
        transform var(--bazaar-motion-fast) var(--bazaar-ease),
        background-color var(--bazaar-motion-fast) var(--bazaar-ease),
        box-shadow var(--bazaar-motion-fast) var(--bazaar-ease),
        opacity var(--bazaar-motion-fast) var(--bazaar-ease);
      will-change: transform;
    }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-btn:hover { filter: brightness(1.06); box-shadow: 0 6px 16px rgba(13,148,136,0.22); }
    }
    .bazaar-btn:active { transform: scale(0.98); }
    .bazaar-btn:disabled { transform: none !important; filter: none !important; box-shadow: none !important; }

    /* ── Add-to-cart success ── */
    @keyframes bazaarCheckPop {
      0% { transform: scale(0.9); }
      45% { transform: scale(1.06); }
      100% { transform: scale(1); }
    }
    .bazaar-check-pop { animation: bazaarCheckPop 260ms cubic-bezier(0.34, 1.56, 0.64, 1); }
    .bazaar-add-success {
      background: rgb(16 185 129) !important;
      border-color: rgb(16 185 129) !important;
    }

    /* ── Cart badge pulse ── */
    @keyframes bazaarCartPulse {
      0% { transform: scale(1); }
      40% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    .bazaar-cart-pulse { animation: bazaarCartPulse 250ms cubic-bezier(0.34, 1.56, 0.64, 1); }

    /* ── Wishlist heart ── */
    @keyframes bazaarHeartAdd {
      0% { transform: scale(1); }
      30% { transform: scale(0.9); }
      60% { transform: scale(1.12); }
      100% { transform: scale(1); }
    }
    @keyframes bazaarHeartRemove {
      0% { transform: scale(1); }
      45% { transform: scale(0.88); }
      100% { transform: scale(1); }
    }
    .bazaar-heart-add { animation: bazaarHeartAdd 320ms cubic-bezier(0.34, 1.56, 0.64, 1); }
    .bazaar-heart-remove { animation: bazaarHeartRemove 220ms var(--bazaar-ease); }

    /* ── Hero ── */
    .bazaar-hero-slide {
      transition:
        opacity 380ms var(--bazaar-ease),
        transform 420ms var(--bazaar-ease);
      will-change: opacity, transform;
    }
    .bazaar-hero-dot {
      transition:
        width 200ms var(--bazaar-ease),
        background-color 200ms var(--bazaar-ease),
        opacity 200ms var(--bazaar-ease);
    }
    .bazaar-hero-dot.is-active {
      width: 22px !important;
      background: var(--store-primary, #0d9488) !important;
      opacity: 1 !important;
    }
    @media (prefers-color-scheme: light) {
      .bazaar-hero-dot.is-active { background: #ffffff !important; }
      .bazaar-hero-dot.is-active.bazaar-hero-dot--primary { background: var(--store-primary, #0d9488) !important; }
    }
    .bazaar-hero-arrow {
      transition:
        transform var(--bazaar-motion-fast) var(--bazaar-ease),
        background-color var(--bazaar-motion-fast) var(--bazaar-ease),
        opacity var(--bazaar-motion-fast) var(--bazaar-ease);
    }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-hero-arrow:hover { transform: scale(1.06); }
    }
    .bazaar-hero-arrow:active { transform: scale(0.94); }

    /* ── Drawer ── */
    @keyframes bazaarDrawerIn {
      from { transform: translateX(18px); opacity: 0; }
      to { transform: none; opacity: 1; }
    }
    @keyframes bazaarBackdropIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .bazaar-drawer-backdrop { animation: bazaarBackdropIn 220ms var(--bazaar-ease) both; }
    .bazaar-drawer-panel { animation: bazaarDrawerIn 260ms var(--bazaar-ease) both; }
    .bazaar-drawer-chevron { transition: transform 180ms var(--bazaar-ease); }
    .bazaar-drawer-children {
      animation: bazaarDrawerChildrenIn 180ms var(--bazaar-ease) both;
    }
    @keyframes bazaarDrawerChildrenIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: none; }
    }

    /* ── Floating WhatsApp ── */
    @keyframes bazaarWaIn {
      from { opacity: 0; transform: scale(0.9); }
      to { opacity: 1; transform: scale(1); }
    }
    .bazaar-wa-entrance { animation: bazaarWaIn 320ms var(--bazaar-ease) both; }
    .bazaar-wa-btn { transition: transform var(--bazaar-motion-fast) var(--bazaar-ease); }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-wa-btn:hover { transform: scale(1.04); }
    }
    .bazaar-wa-btn:active { transform: scale(0.96); }

    /* ── Search focus ── */
    .bazaar-search-ring {
      transition:
        border-color var(--bazaar-motion-fast) var(--bazaar-ease),
        box-shadow var(--bazaar-motion-fast) var(--bazaar-ease);
    }
    .bazaar-search-ring:focus-within {
      border-color: var(--store-primary, #0d9488) !important;
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--store-primary, #0d9488) 18%, transparent);
    }

    /* ── Header micro ── */
    .bazaar-header-action {
      transition:
        background-color var(--bazaar-motion-fast) var(--bazaar-ease),
        color var(--bazaar-motion-fast) var(--bazaar-ease),
        transform var(--bazaar-motion-fast) var(--bazaar-ease);
    }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-header-action:hover { background: rgb(240 253 250); color: rgb(15 118 110); }
    }
    .bazaar-header-action:active { transform: scale(0.96); }

    /* ── Quantity stepper ── */
    .bazaar-qty-btn { transition: transform 120ms var(--bazaar-ease); }
    .bazaar-qty-btn:active { transform: scale(0.92); }
    @keyframes bazaarQtyPop { 0%{transform:scale(1)} 40%{transform:scale(1.08)} 100%{transform:scale(1)} }
    .bazaar-qty-pop { animation: bazaarQtyPop 180ms var(--bazaar-ease); }

    /* ── Variant options ── */
    .bazaar-variant {
      transition:
        border-color var(--bazaar-motion-fast) var(--bazaar-ease),
        background-color var(--bazaar-motion-fast) var(--bazaar-ease),
        color var(--bazaar-motion-fast) var(--bazaar-ease),
        transform var(--bazaar-motion-fast) var(--bazaar-ease);
    }
    .bazaar-variant:active { transform: scale(0.97); }

    /* ── Footer social ── */
    .bazaar-social {
      transition:
        transform 160ms var(--bazaar-ease),
        background-color 160ms var(--bazaar-ease);
    }
    @media (hover: hover) and (pointer: fine) {
      .bazaar-social:hover { transform: translateY(-1px) scale(1.05); }
    }

    /* ── Image loading ── */
    .bazaar-img-fade {
      transition: opacity 220ms var(--bazaar-ease);
    }

    /* ── Reduced motion ── */
    @media (prefers-reduced-motion: reduce) {
      [data-bazaar-reveal] { opacity: 1 !important; transform: none !important; transition: none !important; }
      .bazaar-section-accent, .bazaar-section-title { transform: none !important; opacity: 1 !important; transition: none !important; }
      .bazaar-card, .bazaar-card-img, .bazaar-cat, .bazaar-btn, .bazaar-drawer-chevron,
      .bazaar-wa-btn, .bazaar-header-action, .bazaar-qty-btn, .bazaar-variant, .bazaar-social,
      .bazaar-hero-slide, .bazaar-hero-dot, .bazaar-hero-arrow, .bazaar-search-ring { transition: none !important; }
      .bazaar-card:hover, .bazaar-cat:hover { transform: none !important; }
      .bazaar-cart-pulse, .bazaar-heart-add, .bazaar-heart-remove, .bazaar-check-pop,
      .bazaar-drawer-backdrop, .bazaar-drawer-panel, .bazaar-drawer-children,
      .bazaar-wa-entrance, .bazaar-qty-pop { animation: none !important; }
    }
  `;
  document.head.appendChild(st);
}

// ------------------------------------------------------------------
// Cart badge pulse (bazaar-scoped, never touches other templates)
// ------------------------------------------------------------------
function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  return true;
}

export function resolveBazaarCartTarget(): { el: HTMLElement; x: number; y: number } | null {
  if (typeof document === 'undefined') return null;
  const candidates: HTMLElement[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-bazaar-cart], button[aria-label="السلة"]')
  );
  const visible = candidates.filter(isVisible);
  if (!visible.length) return null;
  let best: HTMLElement | null = null;
  let bestArea = -1;
  for (const el of visible) {
    const r = el.getBoundingClientRect();
    const inViewport =
      r.top >= -20 && r.left >= -20 && r.top <= window.innerHeight + 20 && r.left <= window.innerWidth + 20;
    if (!inViewport) continue;
    const area = r.width * r.height;
    if (area > bestArea) {
      bestArea = area;
      best = el;
    }
  }
  const target = best || visible[0];
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  return { el: target, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function pulseBazaarCartBadge(): void {
  if (typeof document === 'undefined') return;
  ensureBazaarInteractionsStyle();
  if (prefersReducedMotion()) return;
  const resolved = resolveBazaarCartTarget();
  if (!resolved) return;
  const badge =
    resolved.el.querySelector<HTMLElement>('[data-bazaar-cart-badge]') ||
    resolved.el.querySelector<HTMLElement>('span[class*="rounded-full"][class*="bg-"]') ||
    resolved.el.querySelector<HTMLElement>('span');
  const el = badge as HTMLElement | null;
  if (!el) return;
  el.classList.remove('bazaar-cart-pulse');
  void el.offsetWidth;
  el.classList.add('bazaar-cart-pulse');
  window.setTimeout(() => el.classList.remove('bazaar-cart-pulse'), 400);
}

// ------------------------------------------------------------------
// Lightweight fly-to-cart (transform+opacity only, no heavy deps)
// ------------------------------------------------------------------
export function flyToCartBazaar(
  imageUrl: string | null | undefined,
  originEl?: HTMLElement | null
): void {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) {
    pulseBazaarCartBadge();
    return;
  }
  ensureBazaarInteractionsStyle();
  const target = resolveBazaarCartTarget();
  if (!target) return;

  const originRect = originEl && isVisible(originEl) ? originEl.getBoundingClientRect() : null;
  const sx = originRect ? originRect.left + originRect.width / 2 : window.innerWidth * 0.5;
  const sy = originRect ? originRect.top + originRect.height / 2 : window.innerHeight * 0.45;
  const dx = target.x - sx;
  const dy = target.y - sy;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    pulseBazaarCartBadge();
    return;
  }

  const hasImage = !!imageUrl && String(imageUrl).trim().length > 4;
  const size = originRect ? Math.max(32, Math.min(52, originRect.width * 0.9)) : 40;

  let node: HTMLElement;
  if (hasImage) {
    const img = document.createElement('img');
    img.src = String(imageUrl);
    img.alt = '';
    img.decoding = 'async' as any;
    img.loading = 'eager';
    node = img;
    (node as HTMLImageElement).style.objectFit = 'contain';
    node.style.background = '#ffffff';
    node.style.borderRadius = '10px';
    node.style.boxShadow = '0 8px 20px rgba(10,18,32,0.16), 0 2px 8px rgba(10,18,32,0.10)';
    node.style.border = '1px solid rgba(230,235,241,1)';
  } else {
    node = document.createElement('div');
    node.setAttribute('aria-hidden', 'true');
    node.style.background = '#0d9488';
    node.style.borderRadius = '9999px';
    node.style.display = 'flex';
    node.style.alignItems = 'center';
    node.style.justifyContent = 'center';
    node.style.color = '#ffffff';
    node.style.fontSize = '16px';
    node.textContent = '🛒';
    node.style.boxShadow = '0 8px 18px rgba(13,148,136,0.28)';
  }

  node.setAttribute('aria-hidden', 'true');
  node.style.cssText += [
    ';position:fixed',
    `;left:${sx}px`,
    `;top:${sy}px`,
    `;width:${size}px`,
    `;height:${size}px`,
    ';pointer-events:none',
    ';z-index:99999',
    ';will-change:transform,opacity',
    ';transform:translate(-50%,-50%)',
  ].join('');

  document.body.appendChild(node);

  const duration = 560;
  let anim: Animation | null = null;
  try {
    anim = node.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0 },
        {
          transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 48}px)) scale(0.86)`,
          opacity: 1,
          offset: 0.45,
        },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.16)`, opacity: 0.3, offset: 1 },
      ],
      { duration, easing: 'cubic-bezier(0.33,0,0.5,1)', fill: 'forwards' }
    );
  } catch {
    anim = null;
  }

  const cleanup = () => {
    try {
      node.remove();
    } catch {}
    pulseBazaarCartBadge();
  };

  if (anim) {
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
    window.setTimeout(cleanup, duration + 160);
  } else {
    window.setTimeout(cleanup, 120);
  }
}

// ------------------------------------------------------------------
// Wishlist heart pop — call after real toggle result
// ------------------------------------------------------------------
export function triggerBazaarWishlistPop(el: HTMLElement | null, added: boolean): void {
  if (!el || typeof document === 'undefined') return;
  ensureBazaarInteractionsStyle();
  if (prefersReducedMotion()) return;
  const cls = added ? 'bazaar-heart-add' : 'bazaar-heart-remove';
  el.classList.remove('bazaar-heart-add', 'bazaar-heart-remove');
  void el.offsetWidth;
  el.classList.add(cls);
  window.setTimeout(() => el.classList.remove(cls), 480);
}

// ------------------------------------------------------------------
// IntersectionObserver reveal helper — one observer, cheap.
// Usage: add data-bazaar-reveal to sections/cards; observer toggles .is-visible once.
// ------------------------------------------------------------------
let revealObserver: IntersectionObserver | null = null;
let revealObserved = new WeakSet<Element>();

export function initBazaarReveals(root: ParentNode = document): void {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return;
  if (prefersReducedMotion()) {
    // show immediately without animation
    root.querySelectorAll<HTMLElement>('[data-bazaar-reveal]').forEach((el) => el.classList.add('is-visible'));
    return;
  }
  if (!revealObserver) {
    revealObserver = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).classList.add('is-visible');
            revealObserver?.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );
  }
  root.querySelectorAll<HTMLElement>('[data-bazaar-reveal]').forEach((el) => {
    if (!revealObserved.has(el)) {
      revealObserved.add(el);
      revealObserver!.observe(el);
    }
  });
}

// ------------------------------------------------------------------
// Mount helper — call once at Bazaar root mount. Re-observes on SPA navigations.
// ------------------------------------------------------------------
export function mountBazaarMotion(): void {
  ensureBazaarInteractionsStyle();
  // defer so initial paint is not blocked
  const run = () => initBazaarReveals(document);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run, { once: true });
  } else {
    // rAF to allow DOM to settle
    requestAnimationFrame(() => requestAnimationFrame(run));
  }
}
