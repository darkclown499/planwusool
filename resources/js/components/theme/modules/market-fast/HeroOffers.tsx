import type { ThemeConfig } from '@/config/theme.schema';
import { getImageUrl } from '@/utils/image-helper';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface HeroSlide {
  badge: string;
  title: string;
  subtitle: string;
  image?: string;
  cta: string;
  accent: string;
}

/**
 * Compact promo slider for the market-fast (grocery) storefront.
 * Kept deliberately short (≤180px mobile / ≤260px desktop) so products stay
 * above the fold. Slides cycle automatically with arrow + dot controls.
 */
export const MarketFastHeroOffers: React.FC<{ config: ThemeConfig }> = ({ config }) => {
  const { styling, content } = config;
  const primary = styling.primaryColor;

  const slides: HeroSlide[] = [
    {
      badge: 'خصم حتى 40%',
      title: content.bannerTitle || 'عروض هذا الأسبوع',
      subtitle: content.bannerSubtitle || 'منتجات طازجة بأسعار منافسة',
      image: content.bannerImage || undefined,
      cta: content.bannerCtaText || content.heroCtaText || 'تسوّق الآن',
      accent: primary,
    },
    {
      badge: 'توصيل سريع',
      title: 'طلباتك تصلك اليوم',
      subtitle: content.announcementText || 'توصيل مجاني للطلبات فوق 50 شيكل',
      cta: 'اطلب الآن',
      accent: '#047857',
    },
  ];

  const [index, setIndex] = useState(0);
  const count = slides.length;

  useEffect(() => {
    if (count <= 1) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), 5000);
    return () => clearInterval(timer);
  }, [count]);

  const go = (dir: 'next' | 'prev') =>
    setIndex((i) => (dir === 'next' ? (i + 1) % count : (i - 1 + count) % count));

  return (
    <section className="mx-auto max-w-7xl px-3 pt-3 sm:px-4" aria-label="العروض">
      <div className="relative h-44 overflow-hidden rounded-2xl md:h-60">
        <div
          className="flex h-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((slide, i) => (
            <div key={i} className="relative h-full w-full shrink-0" style={{ minWidth: '100%' }}>
              <div
                className="relative flex h-full w-full items-center overflow-hidden"
                style={{ background: `linear-gradient(125deg, ${slide.accent} 0%, #064e3b 100%)` }}
              >
                {slide.image && (
                  <img
                    src={getImageUrl(slide.image)}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover opacity-30"
                  />
                )}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 opacity-10"
                  style={{
                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.9) 1px, transparent 1px)',
                    backgroundSize: '16px 16px',
                  }}
                />
                <div className="relative z-10 flex h-full w-full items-center justify-between gap-4 px-5 sm:px-8">
                  <div className="min-w-0">
                    <span className="mb-1.5 inline-block rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-emerald-800 shadow-sm">
                      {slide.badge}
                    </span>
                    <h2 className="truncate text-xl font-black leading-tight text-white sm:text-2xl">{slide.title}</h2>
                    {slide.subtitle && <p className="mt-1 truncate text-xs font-medium text-emerald-50/90 sm:text-sm">{slide.subtitle}</p>}
                  </div>
                  <span className="shrink-0 rounded-xl bg-white px-3.5 py-2 text-xs font-extrabold text-emerald-900 shadow-md">
                    {slide.cta}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* arrows (hidden on mobile to stay compact) */}
        {count > 1 && (
          <>
            <button
              type="button"
              aria-label="السابق"
              onClick={() => go('prev')}
              className="absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-slate-700 shadow hover:bg-white sm:block"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="التالي"
              onClick={() => go('next')}
              className="absolute left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white/80 p-1.5 text-slate-700 shadow hover:bg-white sm:block"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`شريحة ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${i === index ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default MarketFastHeroOffers;