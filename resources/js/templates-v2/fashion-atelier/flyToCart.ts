let styleInjected = false;

function injectStyle() {
  if (styleInjected || typeof document === 'undefined') return;
  styleInjected = true;
  const st = document.createElement('style');
  st.textContent = `
    @keyframes atelierCartBadgePulse {
      0% { transform: scale(1); }
      40% { transform: scale(1.4); }
      100% { transform: scale(1); }
    }
    .atelier-cart-pulse { animation: atelierCartBadgePulse 380ms cubic-bezier(0.34,1.56,0.64,1); }
  `;
  document.head.appendChild(st);
}

function cartTarget(): { el: HTMLElement; x: number; y: number } | null {
  const header = document.querySelector('[data-atelier-header]');
  if (!header) return null;
  const btns = Array.from(header.querySelectorAll<HTMLElement>('button[aria-label="سلة التسوق"]'));
  const visible = btns.find((b) => {
    const r = b.getBoundingClientRect();
    const s = getComputedStyle(b);
    return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
  });
  if (!visible) return null;
  const r = visible.getBoundingClientRect();
  return { el: visible, x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/**
 * Fly-to-cart: a tiny copy of the product image arcs from the tapped element
 * (or a fallback point) into the header cart button, then pulses the cart badge.
 * Pure DOM/WAAPI — no React state, safe to call from any mode (home/category).
 */
export function flyToCart(imageUrl: string, origin?: HTMLElement | null, duration = 720): void {
  if (typeof document === 'undefined' || !imageUrl) return;
  injectStyle();

  const target = cartTarget();
  if (!target) return;

  const startRect = origin && origin.getBoundingClientRect().width > 0 ? origin.getBoundingClientRect() : null;
  const size = startRect ? Math.max(28, Math.min(64, startRect.width)) : 56;
  const sx = startRect ? startRect.left + startRect.width / 2 : window.innerWidth * 0.82;
  const sy = startRect ? startRect.top + startRect.height / 2 : window.innerHeight * 0.35;

  const dx = target.x - sx;
  const dy = target.y - sy;
  if (Math.abs(dx) < 28 && Math.abs(dy) < 28) return;

  const img = document.createElement('img');
  img.src = imageUrl;
  img.alt = '';
  img.style.cssText = [
    'position:fixed',
    `left:${sx}px`,
    `top:${sy}px`,
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:12px',
    'object-fit:contain',
    'background:#fffdf9',
    'box-shadow:0 10px 24px rgba(40,30,20,0.28)',
    'transform:translate(-50%,-50%)',
    'z-index:99999',
    'pointer-events:none',
    'will-change:transform,opacity',
  ].join(';');

  document.body.appendChild(img);

  const anim = img.animate(
    [
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 1, offset: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.5 - 70}px)) scale(0.82)`, opacity: 1, offset: 0.5 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(0.15)`, opacity: 0.35, offset: 1 },
    ],
    { duration, easing: 'cubic-bezier(0.33,0,0.5,1)', fill: 'forwards' }
  );

  const finish = () => {
    img.remove();
    const badge = target.el.querySelector('span[class*="rounded-full"]');
    if (badge) {
      badge.classList.remove('atelier-cart-pulse');
      void (badge as HTMLElement).offsetWidth;
      badge.classList.add('atelier-cart-pulse');
    }
  };
  anim.onfinish = finish;
  anim.oncancel = finish;
  window.setTimeout(finish, duration + 120);
}