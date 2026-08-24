import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getImageUrl } from '@/utils/image-helper';
import { useStorefrontCore } from '../../shared/hooks';

interface HeroSlide {
  title?: string;
  subtitle?: string;
  image?: string;
  button_text?: string;
  button_link?: string;
}

interface AtelierHeroProps {
  slides: HeroSlide[];
}

const FALLBACK_SLIDES: HeroSlide[] = [
  {
    title: 'أناقة تُروى كقصة',
    subtitle: 'تشكيلة الموسم الجديدة — قطع مختارة بعناية لكل لحظة',
    button_text: 'اكتشفي التشكيلة',
    button_link: '#atelier-new',
  },
];

function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0].split('&')[0];
    if (u.searchParams.get('v')) return u.searchParams.get('v')!.split('&')[0];
    const parts = u.pathname.split('/').filter(Boolean);
    const embedIdx = parts.indexOf('embed');
    if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1].split('?')[0];
    // youtu.be short with params already handled, fallback to last part
    if (parts.length > 0) return parts[parts.length - 1].split('?')[0].split('&')[0];
    return null;
  } catch {
    // Fallback regex for bare IDs or malformed URLs
    const m = url.match(/[a-zA-Z0-9_-]{11}/);
    return m ? m[0] : null;
  }
}

/**
 * Editorial full-bleed hero. Slow ken-burns zoom on the active photograph,
 * serif display type over a warm gradient veil, and a quiet progress rail.
 * Pure CSS transitions — no slider library.
 */
export const AtelierHero: React.FC<AtelierHeroProps> = ({ slides }) => {
  // Dynamic hero_banner from designer (store_content.hero_banner) — overrides static slides when present.
  let storeHero: any = null;
  try {
    const core = useStorefrontCore();
    storeHero = (core as any)?.content?.hero_banner ?? (core as any)?.content?.hero ?? null;
  } catch {
    storeHero = null;
  }

  const heroType: string | null = storeHero?.type ? String(storeHero.type).toLowerCase() : null;
  const overlayOpacityRaw = storeHero?.overlay_opacity ?? storeHero?.overlayOpacity ?? storeHero?.overlay ?? 35;
  const overlayOpacity = Math.min(1, Math.max(0, Number(overlayOpacityRaw) / (Number(overlayOpacityRaw) > 1 ? 100 : 1)));
  // When overlay is 0-100 integer, divide by 100. If already 0-1, keep as is.
  const normalizedOverlay = Number(overlayOpacityRaw) > 1 ? Number(overlayOpacityRaw) / 100 : Number(overlayOpacityRaw);

  const heroHeading = storeHero?.heading ?? storeHero?.title ?? null;
  const heroSubtitle = storeHero?.subtitle ?? null;
  const heroCtaLabel = storeHero?.cta_label ?? storeHero?.button_text ?? null;
  const heroCtaLink = storeHero?.cta_link ?? storeHero?.button_link ?? null;

  // Build dynamic image list for slider mode
  const heroImages: string[] = (() => {
    if (!heroType || heroType === 'image' || heroType === 'slider' || heroType === 'image_slider') {
      const raw = storeHero?.images ?? storeHero?.image_slider ?? storeHero?.slider_images ?? storeHero?.slides ?? null;
      if (Array.isArray(raw) && raw.length > 0) return raw.filter(Boolean).map((v: any) => String(v));
      if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
      // Single image fallback
      const single = storeHero?.image ?? null;
      if (typeof single === 'string' && single.trim()) return [single.trim()];
    }
    return [];
  })();

  const hasDynamicHero = !!heroType && (
    (heroType === 'video' && !!storeHero?.video_url) ||
    (heroType === 'youtube' && !!storeHero?.youtube_url) ||
    ((heroType === 'image' || heroType === 'slider' || heroType === 'image_slider') && heroImages.length > 0) ||
    (heroHeading || heroSubtitle || heroCtaLabel)
  );

  const youtubeId = heroType === 'youtube' && storeHero?.youtube_url ? extractYouTubeId(String(storeHero.youtube_url)) : null;
  const videoUrl = heroType === 'video' ? String(storeHero?.video_url || '').trim() : '';

  // Fallback to static slides when no dynamic hero is configured
  const list = hasDynamicHero && heroType === 'image' && heroImages.length > 0
    ? heroImages.map((img) => ({
        title: heroHeading || FALLBACK_SLIDES[0].title,
        subtitle: heroSubtitle || FALLBACK_SLIDES[0].subtitle,
        image: img,
        button_text: heroCtaLabel || FALLBACK_SLIDES[0].button_text,
        button_link: heroCtaLink || FALLBACK_SLIDES[0].button_link,
      }))
    : (slides && slides.length > 0 ? slides : FALLBACK_SLIDES).filter((s) => s.image || s.title);

  const [index, setIndex] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (list.length <= 1) return;
    timer.current = setInterval(() => setIndex((i) => (i + 1) % list.length), 6000);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [list.length]);

  // Single-media heroes (video/youtube) don't need carousel timer
  const isSingleMedia = hasDynamicHero && (heroType === 'video' || heroType === 'youtube');

  if (list.length === 0 && !isSingleMedia) return null;

  const go = (dir: number) => setIndex((i) => (i + dir + list.length) % list.length);

  // Resolve overlay opacity for dynamic hero (0-1)
  const overlayStyleOpacity = hasDynamicHero ? normalizedOverlay : 0.35;

  // Helper to render single hero content for video/youtube (uses heroHeading etc.)
  const singleHeroTitle = heroHeading || list[0]?.title || FALLBACK_SLIDES[0].title;
  const singleHeroSubtitle = heroSubtitle || list[0]?.subtitle || FALLBACK_SLIDES[0].subtitle;
  const singleHeroCtaLabel = heroCtaLabel || list[0]?.button_text || FALLBACK_SLIDES[0].button_text;
  const singleHeroCtaLink = heroCtaLink || list[0]?.button_link || FALLBACK_SLIDES[0].button_link;

  return (
    <section className="relative min-h-[500px] h-[75vh] w-full overflow-hidden bg-stone-900 md:h-[85vh]" dir="rtl">
      {/* Background media */}
      {hasDynamicHero && heroType === 'video' && videoUrl ? (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
            src={videoUrl}
            poster={list[0]?.image ? getImageUrl(list[0].image) : undefined}
          />
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />
        </>
      ) : hasDynamicHero && heroType === 'youtube' && youtubeId ? (
        <>
          <iframe
            className="absolute inset-0 h-full w-full object-cover"
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1`}
            title="YouTube video player"
            frameBorder="0"
            allow="autoplay; fullscreen"
            allowFullScreen
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />
        </>
      ) : (
        <>
          {list.map((slide, i) => (
            <div
              key={i}
              className="absolute inset-0 transition-opacity duration-[1200ms] ease-out"
              style={{ opacity: i === index ? 1 : 0 }}
              aria-hidden={i !== index}
            >
              <img
                src={getImageUrl(slide.image || '')}
                alt=""
                className="h-full w-full object-cover"
                style={{
                  transform: i === index ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 7s ease-out',
                }}
              />
              {/* Warm editorial veil + configurable overlay */}
              <div className="absolute inset-0 bg-gradient-to-l from-black/60 via-black/25 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              {hasDynamicHero && <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />}
            </div>
          ))}
        </>
      )}

      {/* Copy — z-10 ensures legibility over media */}
      <div className="absolute inset-0 z-10 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
          <div className="max-w-xl">
            <span className="mb-4 block h-px w-14 bg-[#d8b48a]" />
            {isSingleMedia ? (
              <div className="transition-all duration-700">
                {singleHeroSubtitle && (
                  <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#e8cfa8]">{singleHeroSubtitle}</p>
                )}
                <h1 className="font-serif text-2xl font-bold leading-[1.25] text-white sm:text-4xl md:text-6xl">
                  {singleHeroTitle}
                </h1>
                {singleHeroCtaLabel && (
                  <a
                    href={singleHeroCtaLink || '#atelier-new'}
                    className="group mt-8 inline-flex items-center gap-3 border border-white/70 px-8 py-3 text-sm font-semibold tracking-wide text-white transition-all hover:border-[#d8b48a] hover:bg-[#d8b48a] hover:text-stone-900"
                  >
                    {singleHeroCtaLabel}
                    <span className="transition-transform group-hover:-translate-x-1">←</span>
                  </a>
                )}
              </div>
            ) : (
              list.map((slide, i) => (
                <div
                  key={i}
                  className="transition-all duration-700"
                  style={{
                    opacity: i === index ? 1 : 0,
                    transform: i === index ? 'translateY(0)' : 'translateY(18px)',
                    position: i === index ? 'relative' : 'absolute',
                    inset: i === index ? undefined : 0,
                    pointerEvents: i === index ? 'auto' : 'none',
                  }}
                >
                  {slide.subtitle && (
                    <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#e8cfa8]">{slide.subtitle}</p>
                  )}
                  <h1 className="font-serif text-2xl font-bold leading-[1.25] text-white sm:text-4xl md:text-6xl">
                    {slide.title}
                  </h1>
                  {slide.button_text && (
                    <a
                      href={slide.button_link || '#atelier-new'}
                      className="group mt-8 inline-flex items-center gap-3 border border-white/70 px-8 py-3 text-sm font-semibold tracking-wide text-white transition-all hover:border-[#d8b48a] hover:bg-[#d8b48a] hover:text-stone-900"
                    >
                      {slide.button_text}
                      <span className="transition-transform group-hover:-translate-x-1">←</span>
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Controls — hidden for single-media video/youtube */}
      {!isSingleMedia && list.length > 1 && (
        <>
          <button type="button" onClick={() => go(-1)} aria-label="السابق"
            className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25 sm:right-8">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => go(1)} aria-label="التالي"
            className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white backdrop-blur transition hover:bg-white/25 sm:left-8">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="absolute bottom-6 right-1/2 z-10 flex translate-x-1/2 gap-2">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`شريحة ${i + 1}`}
                className="h-[3px] rounded-full transition-all duration-500"
                style={{ width: i === index ? 32 : 14, background: i === index ? '#e8cfa8' : 'rgba(255,255,255,0.4)' }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
};
