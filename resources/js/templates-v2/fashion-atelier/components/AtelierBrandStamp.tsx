import React from 'react';
import { getImageUrl } from '@/utils/image-helper';
import { useStorefrontCore } from '../../shared/hooks';

let stampStyleInjected = false;

function injectStampStyle() {
  if (stampStyleInjected || typeof document === 'undefined') return;
  stampStyleInjected = true;
  const st = document.createElement('style');
  st.textContent = `
    @keyframes atelierStampIn { from { opacity: 0; transform: translateY(12px) scale(0.94); } to { opacity: 1; transform: translateY(0) scale(1); } }
    .atelier-brand-stamp { animation: atelierStampIn 800ms cubic-bezier(0.22,0.9,0.3,1) 260ms both; }
    @media (prefers-reduced-motion: reduce) { .atelier-brand-stamp { animation-duration: 120ms; animation-delay: 0ms; } }
  `;
  document.head.appendChild(st);
}

/**
 * Centered brand stamp floating over the hero media (the logo "in the middle
 * of the page"). Decorative only — pointer-events-none so it never blocks the
 * cover-flow swipe. Soft reveal on load, respects reduced motion.
 */
export const AtelierBrandStamp: React.FC = () => {
  const { config, store } = useStorefrontCore() as any;
  const name = (config?.storeName as string) || (store?.name as string) || '';
  const logo = (config?.logo as string) || (store?.logo as string) || '';
  if (!name && !logo) return null;
  injectStampStyle();
  return (
    <div dir="rtl" aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center">
      <div className="atelier-brand-stamp flex flex-col items-center px-8 text-center">
        {logo ? (
          <img
            src={getImageUrl(logo)}
            alt=""
            className="max-h-[56px] w-auto object-contain sm:max-h-[76px]"
            style={{ filter: 'drop-shadow(0 3px 16px rgba(0,0,0,0.35))' } as any}
          />
        ) : null}
        {name ? (
          <span
            className="mt-3 font-serif text-2xl font-bold leading-none text-white sm:text-4xl"
            style={{ textShadow: '0 2px 18px rgba(0,0,0,0.5), 0 1px 4px rgba(0,0,0,0.35)' } as any}
          >
            {name}
          </span>
        ) : null}
      </div>
    </div>
  );
};