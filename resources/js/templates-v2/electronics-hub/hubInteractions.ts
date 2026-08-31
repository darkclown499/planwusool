let styleInjected = false;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

function injectStyle() {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const st = document.createElement('style');
  st.setAttribute('data-hub-interactions', 'true');
  st.textContent = `
    @keyframes hubCartBadgePulse {
      0% { transform: scale(1); }
      40% { transform: scale(1.10); }
      100% { transform: scale(1); }
    }
    .hub-cart-pulse { animation: hubCartBadgePulse 280ms cubic-bezier(0.34,1.56,0.64,1); }
    @keyframes hubAddSuccessPop {
      0% { transform: scale(0.85); }
      45% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    @keyframes hubHeartPop {
      0% { transform: scale(1); }
      30% { transform: scale(0.85); }
      60% { transform: scale(1.12); }
      100% { transform: scale(1); }
    }
    @keyframes hubHeartRing {
      0% { transform: scale(0.6); opacity: 0.45; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .hub-heart-pop { animation: hubHeartPop 320ms cubic-bezier(0.34,1.56,0.64,1); }
    .hub-heart-ring::after {
      content: '';
      position: absolute;
      inset: -2px;
      border-radius: 9999px;
      border: 1.5px solid rgba(37,99,235,0.35);
      animation: hubHeartRing 420ms ease-out forwards;
    }
    @media (prefers-reduced-motion: reduce) {
      .hub-cart-pulse, .hub-heart-pop { animation: none !important; }
      .hub-heart-ring::after { display: none; }
    }
  `;
  document.head.appendChild(st);
}

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  // also check if parent is hidden via viewport
  return true;
}

export function resolveHubCartTarget(): { el: HTMLElement; x: number; y: number } | null {
  if (typeof document === 'undefined') return null;
  // Prefer explicit data attribute; fallback to aria-label selector
  const candidates: HTMLElement[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-hub-cart], [data-hub-cart-target], button[aria-label="السلة"]')
  );
  // Filter visible only
  const visible = candidates.filter(isVisible);
  if (!visible.length) return null;
  // Prefer the one that is actually in viewport and largest / most prominent
  // Mobile header and desktop header both qualify; pick the one whose rect is inside viewport and larger
  let best: HTMLElement | null = null;
  let bestArea = -1;
  for (const el of visible) {
    const r = el.getBoundingClientRect();
    const inViewport = r.top >= -20 && r.left >= -20 && r.top <= window.innerHeight + 20 && r.left <= window.innerWidth + 20;
    if (!inViewport) continue;
    const area = r.width * r.height;
    if (area > bestArea) { bestArea = area; best = el; }
  }
  const target = best || visible[0];
  if (!target) return null;
  const r = target.getBoundingClientRect();
  return { el: target, x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

export function pulseHubCartBadge(): void {
  if (typeof document === 'undefined') return;
  injectStyle();
  if (prefersReducedMotion()) return;
  const resolved = resolveHubCartTarget();
  if (!resolved) return;
  const badge = resolved.el.querySelector<HTMLElement>('[data-hub-cart-badge], span[class*="rounded-full"][class*="bg-"]');
  // fallback: any span containing numeric badge
  const fallback = badge || resolved.el.querySelector<HTMLElement>('span');
  const el = fallback as HTMLElement | null;
  if (!el) return;
  el.classList.remove('hub-cart-pulse');
  void el.offsetWidth;
  el.classList.add('hub-cart-pulse');
  // auto-remove class after animation
  window.setTimeout(() => el.classList.remove('hub-cart-pulse'), 400);
}

/**
 * Lightweight fly-to-cart cue.
 * Measures once, animates via transform/opacity only, cleans up immediately.
 * No network request: reuses already-resolved imageUrl.
 */
export function flyToCartHub(imageUrl: string | null | undefined, originEl?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) {
    // reduced-motion: only badge pulse, no trajectory
    pulseHubCartBadge();
    return;
  }
  injectStyle();
  const target = resolveHubCartTarget();
  if (!target) return;

  const originRect = originEl && isVisible(originEl) ? originEl.getBoundingClientRect() : null;
  const sx = originRect ? originRect.left + originRect.width / 2 : window.innerWidth * 0.5;
  const sy = originRect ? originRect.top + originRect.height / 2 : window.innerHeight * 0.45;
  const dx = target.x - sx;
  const dy = target.y - sy;
  if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
    pulseHubCartBadge();
    return;
  }

  const hasImage = !!imageUrl && String(imageUrl).trim().length > 4;
  const size = originRect ? Math.max(32, Math.min(56, originRect.width * 0.9)) : 42;

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
    node.style.boxShadow = '0 8px 20px rgba(10,18,32,0.18), 0 2px 8px rgba(10,18,32,0.10)';
    node.style.border = '1px solid rgba(230,235,241,1)';
  } else {
    node = document.createElement('div');
    node.setAttribute('aria-hidden', 'true');
    node.style.background = '#2563eb';
    node.style.borderRadius = '9999px';
    node.style.display = 'flex';
    node.style.alignItems = 'center';
    node.style.justifyContent = 'center';
    node.style.color = '#ffffff';
    node.style.fontSize = '16px';
    node.textContent = '🛒';
    node.style.boxShadow = '0 8px 18px rgba(37,99,235,0.28)';
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

  // Prevent overflow: ensure node not causing scrollbars — fixed already avoids layout
  document.body.appendChild(node);

  const duration = 620;
  let anim: Animation | null = null;
  try {
    anim = node.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0 },
        { transform: `translate(calc(-50% + ${dx * 0.52}px), calc(-50% + ${dy * 0.52 - 56}px)) scale(0.88)`, opacity: 1, offset: 0.45 },
        { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.18)`, opacity: 0.32, offset: 1 },
      ],
      { duration, easing: 'cubic-bezier(0.33,0,0.5,1)', fill: 'forwards' }
    );
  } catch {
    // Fallback if WAAPI unavailable — just pulse and remove
    anim = null;
  }

  const cleanup = () => {
    try { node.remove(); } catch {}
    pulseHubCartBadge();
  };

  if (anim) {
    anim.onfinish = cleanup;
    anim.oncancel = cleanup;
    window.setTimeout(cleanup, duration + 160);
  } else {
    window.setTimeout(cleanup, 120);
  }
}
