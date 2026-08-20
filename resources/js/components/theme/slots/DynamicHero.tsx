import { getImageUrl } from '@/utils/image-helper';
import { ChevronLeft, ChevronRight, Play, Search } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { ThemeHeroType, ThemeConfig } from '@/config/theme.schema';

interface DynamicHeroProps {
  type: ThemeHeroType;
  config: ThemeConfig;
  storeName?: string;
  welcomeMessage?: string;
  description?: string;
  categories?: Array<{ id: string; name: string; description?: string }>;
  activeCategory?: string;
  onCategoryClick?: (id: string) => void;
  onSearch?: (query: string) => void;
  banners?: Array<{ image?: string; title?: string; subtitle?: string; cta?: string; link?: string }>;
}

/** Styling helpers shared by every hero variant so colours come from the theme variables. */
const heroShell = (primaryColor: string, dark: boolean) => ({
  background: `linear-gradient(135deg, ${primaryColor} 0%, var(--primary-color-dark, ${primaryColor}) 100%)`,
  color: dark ? '#0f172a' : '#ffffff',
});

export const DynamicHero: React.FC<DynamicHeroProps> = ({
  type,
  config,
  storeName,
  welcomeMessage,
  description,
  categories = [],
  activeCategory,
  onCategoryClick,
  onSearch,
  banners = [],
}) => {
  const { styling } = config;
  const c = heroShell(styling.primaryColor, styling.colorMode === 'dark');

  switch (type) {
    case 'search_focused':
      return (
        <section className="relative overflow-hidden px-4 py-10 md:py-16" style={c}>
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.2'%3E%3Ccircle cx='40' cy='40' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
            }}
          />
          <div className="relative mx-auto max-w-2xl text-center">
            <span className="mb-4 inline-block rounded-full bg-white/15 px-4 py-1 text-xs font-semibold tracking-wide text-white">
              مرحباً بك في {storeName || 'متجرنا'}
            </span>
            <h1 className="mb-3 text-3xl font-extrabold leading-tight text-white md:text-5xl">
              {config.content.heroTitle || welcomeMessage}
            </h1>
            <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-white/90 md:text-base">
              {config.content.heroSubtitle || description}
            </p>

            {onSearch && (
              <div className="mx-auto flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 shadow-lg">
                <Search className="mr-2 h-5 w-5 shrink-0 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث عن المنتجات..."
                  onChange={(e) => onSearch(e.target.value)}
                  className="w-full bg-transparent px-2 py-2 text-sm text-gray-700 outline-none placeholder:text-gray-400"
                />
              </div>
            )}

            {categories.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {categories.slice(0, 6).map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onCategoryClick?.(category.id)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                      activeCategory === category.id
                        ? 'bg-white text-gray-900'
                        : 'bg-white/15 text-white hover:bg-white/25'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>
      );

    case 'full_video': {
      // Looping background video with a dark overlay keeps the fashion mood
      // while the CTA stays fully clickable above it.
      const poster = getImageUrl(config.content.heroMedia || banners[0]?.image || '');
      const videoSrc = config.content.heroMedia;
      const hasVideo = Boolean(videoSrc && (videoSrc.endsWith('.mp4') || videoSrc.endsWith('.webm') || videoSrc.endsWith('.mov')));
      return (
        <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-neutral-950 text-white">
          {hasVideo ? (
            <video
              autoPlay
              muted
              loop
              playsInline
              poster={poster || undefined}
              className="absolute inset-0 h-full w-full object-cover"
              src={videoSrc}
            />
          ) : (
            poster && (
              <img
                src={poster}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            )
          )}
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative z-10 mx-auto max-w-3xl px-6 text-center">
            <span className="mb-4 inline-block rounded-sm border border-white/30 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-white/80">
              {config.content.announcementText || config.sector}
            </span>
            <h1 className="mb-4 text-4xl font-extrabold leading-tight md:text-6xl">
              {config.content.heroTitle || welcomeMessage}
            </h1>
            <p className="mx-auto mb-8 max-w-xl text-base leading-relaxed text-white/85">
              {config.content.heroSubtitle || description}
            </p>
            <button
              type="button"
              onClick={() => document.getElementById('theme-products')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 rounded-sm px-8 py-3.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: styling.primaryColor }}
            >
              <Play className="h-4 w-4" />
              {config.content.heroCtaText}
            </button>
          </div>
        </section>
      );
    }

    case 'banner_slider': {
      // Lightweight accessibility-friendly slider (scroll-snap) with arrow
      // controls; fallback content when the store has no banners configured.
      const slides =
        banners.length > 0
          ? banners
          : [
              {
                image: getImageUrl(config.content.bannerImage || ''),
                title: config.content.bannerTitle || config.content.heroTitle,
                subtitle: config.content.bannerSubtitle || config.content.heroSubtitle,
                cta: config.content.bannerCtaText || config.content.heroCtaText,
              },
            ];
      const [index, setIndex] = useState(0);
      const count = slides.length;

      useEffect(() => {
        if (count <= 1) return;
        const timer = setInterval(() => setIndex((i) => (i + 1) % count), 6000);
        return () => clearInterval(timer);
      }, [count]);

      return (
        <section className="relative overflow-hidden" aria-label="العروض">
          <div className="flex transition-transform duration-500" style={{ transform: `translateX(-${index * 100}%)` }}>
            {slides.map((slide, i) => (
              <div key={i} className="w-full shrink-0 px-0" style={{ minWidth: '100%' }}>
                <div className="relative flex h-64 items-center overflow-hidden bg-emerald-800 md:h-80" style={i === 0 ? heroShell(styling.primaryColor, styling.colorMode === 'dark') : undefined}>
                  {slide.image && (
                    <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
                  )}
                  <div className="relative z-10 mx-auto max-w-2xl px-6 text-center text-white">
                    <h2 className="text-3xl font-extrabold md:text-5xl">{slide.title}</h2>
                    {slide.subtitle && <p className="mt-2 text-sm text-white/90 md:text-base">{slide.subtitle}</p>}
                    {slide.cta && (
                      <span className="mt-5 inline-block rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-gray-900">
                        {slide.cta}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {count > 1 && (
            <div className="absolute inset-0 flex items-center justify-between px-3">
              <button
                type="button"
                aria-label="السابق"
                onClick={() => setIndex((i) => (i - 1 + count) % count)}
                className="rounded-full bg-white/80 p-2 text-gray-700 shadow hover:bg-white"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="التالي"
                onClick={() => setIndex((i) => (i + 1) % count)}
                className="rounded-full bg-white/80 p-2 text-gray-700 shadow hover:bg-white"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          )}
        </section>
      );
    }

    case 'compact_tabs':
      return (
        <section className="border-b border-gray-100 bg-white px-4 py-4" style={styling.colorMode === 'dark' ? { background: '#0f172a', borderColor: '#1e293b' } : undefined}>
          <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
                style={{ backgroundColor: styling.primarySoft, color: styling.primaryColor }}
              >
                🛒
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-base font-extrabold text-gray-900" style={styling.colorMode === 'dark' ? { color: '#f1f5f9' } : undefined}>
                  {config.content.heroTitle || welcomeMessage}
                </h2>
                <p className="truncate text-xs text-gray-500" style={styling.colorMode === 'dark' ? { color: '#94a3b8' } : undefined}>
                  {config.content.heroSubtitle || description}
                </p>
              </div>
            </div>
            {onSearch && (
              <div className="relative w-full md:w-72">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="ابحث هنا..."
                  onChange={(e) => onSearch(e.target.value)}
                  className="w-full rounded-full border border-gray-200 bg-gray-50 py-2 pl-3 pr-9 text-sm text-gray-700 outline-none focus:border-primary"
                />
              </div>
            )}
          </div>

          {categories.length > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]" role="tablist">
              <button
                type="button"
                role="tab"
                onClick={() => onCategoryClick?.('')}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                  !activeCategory ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={!activeCategory ? { backgroundColor: styling.primaryColor } : undefined}
              >
                الكل
              </button>
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  role="tab"
                  onClick={() => onCategoryClick?.(category.id)}
                  className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-semibold transition-colors ${
                    activeCategory === category.id ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  style={activeCategory === category.id ? { backgroundColor: styling.primaryColor } : undefined}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}
        </section>
      );

    default:
      return null;
  }
};