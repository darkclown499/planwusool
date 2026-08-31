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
  st.setAttribute('data-souq-interactions', 'true');
  st.textContent = `
    @keyframes souqAddSuccessPop {
      0% { transform: scale(0.9); }
      45% { transform: scale(1.06); }
      100% { transform: scale(1); }
    }
    .souq-add-success-pop { animation: souqAddSuccessPop 260ms cubic-bezier(0.34,1.56,0.64,1); }
    @keyframes souqCartBadgePulse {
      0% { transform: scale(1); }
      40% { transform: scale(1.08); }
      100% { transform: scale(1); }
    }
    .souq-cart-pulse { animation: souqCartBadgePulse 280ms cubic-bezier(0.34,1.56,0.64,1); }
    @media (prefers-reduced-motion: reduce) {
      .souq-cart-pulse, .souq-add-success-pop { animation: none !important; }
    }
  `;
  document.head.appendChild(st);
}

function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  if (r.width < 4 || r.height < 4) return false;
  const s = getComputedStyle(el);
  if (s.display === 'none' || s.visibility === 'hidden' || s.opacity === '0') return false;
  return true;
}

export function ensureSouqInteractionsStyle(): void {
  injectStyle();
}

export function resolveSouqCartTarget(): { el: HTMLElement; x: number; y: number } | null {
  if (typeof document === 'undefined') return null;
  const candidates: HTMLElement[] = Array.from(
    document.querySelectorAll<HTMLElement>('[data-souq-cart], button[aria-label="السلة"]')
  );
  const visible = candidates.filter(isVisible);
  if (!visible.length) return null;
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

export function pulseSouqCartBadge(): void {
  if (typeof document === 'undefined') return;
  injectStyle();
  if (prefersReducedMotion()) return;
  const resolved = resolveSouqCartTarget();
  if (!resolved) return;
  const badge = resolved.el.querySelector<HTMLElement>('[data-souq-cart-badge]');
  const fallback = badge || resolved.el.querySelector<HTMLElement>('span');
  const el = fallback as HTMLElement | null;
  if (!el) return;
  el.classList.remove('souq-cart-pulse');
  void el.offsetWidth;
  el.classList.add('souq-cart-pulse');
  window.setTimeout(() => el.classList.remove('souq-cart-pulse'), 400);
}
