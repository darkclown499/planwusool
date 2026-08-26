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
  // Dynamic hero_banner from designer — supports both nested hero_banner.* and flat hero_* keys plus store.settings for DB sync robustness.
  let storeHero: any = null;
  let rawContent: any = null;
  let storeSettings: any = null;
  try {
    const core = useStorefrontCore();
    rawContent = (core as any)?.content ?? {};
    storeSettings = (core as any)?.store?.settings ?? (core as any)?.config ?? {};
    // Prefer nested hero_banner, then flat hero_* , then store.settings
    storeHero = rawContent.hero_banner ?? rawContent.hero ?? null;
    const flatFromContent = {
      type: rawContent.hero_type ?? rawContent.heroType ?? null,
      images: rawContent.hero_images ?? rawContent.heroImages ?? null,
      video_url: rawContent.hero_video_url ?? rawContent.heroVideoUrl ?? null,
      youtube_url: rawContent.hero_youtube_url ?? rawContent.heroYoutubeUrl ?? null,
      overlay_opacity: rawContent.overlay_opacity ?? rawContent.overlayOpacity ?? null,
      heading: rawContent.hero_heading ?? rawContent.heroHeading ?? null,
      subtitle: rawContent.hero_subtitle ?? rawContent.heroSubtitle ?? null,
      cta_label: rawContent.hero_cta_label ?? rawContent.heroCtaLabel ?? null,
      cta_link: rawContent.hero_cta_link ?? rawContent.heroCtaLink ?? null,
      fit: rawContent.hero_fit ?? rawContent.heroFit ?? null,
      position: rawContent.hero_position ?? rawContent.heroPosition ?? null,
      height_desktop: rawContent.hero_height_desktop ?? null,
      height_mobile: rawContent.hero_height_mobile ?? null,
    };
    const flatFromSettings = {
      type: storeSettings?.hero_type ?? null,
      images: storeSettings?.hero_images ?? null,
      video_url: storeSettings?.hero_video_url ?? null,
      youtube_url: storeSettings?.hero_youtube_url ?? null,
      overlay_opacity: storeSettings?.overlay_opacity ?? null,
      heading: storeSettings?.hero_heading ?? null,
      subtitle: storeSettings?.hero_subtitle ?? null,
      cta_label: storeSettings?.hero_cta_label ?? null,
      cta_link: storeSettings?.hero_cta_link ?? null,
      fit: storeSettings?.hero_fit ?? null,
      position: storeSettings?.hero_position ?? null,
      height_desktop: storeSettings?.hero_height_desktop ?? null,
      height_mobile: storeSettings?.hero_height_mobile ?? null,
    };
    const hasFlatContent = Object.values(flatFromContent).some((v) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && v.length === 0));
    const hasFlatSettings = Object.values(flatFromSettings).some((v) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && v.length === 0));
    if (!storeHero || hasFlatContent || hasFlatSettings) {
      const mergedFlat = { ...flatFromContent, ...Object.fromEntries(Object.entries(flatFromSettings).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')) };
      const hasAnyFlat = Object.values(mergedFlat).some((v) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && v.length === 0));
      if (hasAnyFlat) {
        storeHero = { ...(storeHero || {}), ...Object.fromEntries(Object.entries(mergedFlat).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && v.length === 0))) };
      }
    }
  } catch {
    storeHero = null;
    rawContent = {};
    storeSettings = {};
  }

  const heroType: string | null = storeHero?.type ? String(storeHero.type).toLowerCase() : null;
  const overlayOpacityRaw = storeHero?.overlay_opacity ?? storeHero?.overlayOpacity ?? storeHero?.overlay ?? rawContent?.overlay_opacity ?? 35;
  const normalizedOverlay = Number(overlayOpacityRaw) > 1 ? Number(overlayOpacityRaw) / 100 : Number(overlayOpacityRaw);

  const heroHeading = storeHero?.heading ?? storeHero?.title ?? rawContent?.hero_heading ?? null;
  const heroSubtitle = storeHero?.subtitle ?? rawContent?.hero_subtitle ?? null;
  const heroCtaLabel = storeHero?.cta_label ?? storeHero?.button_text ?? rawContent?.hero_cta_label ?? null;
  const heroCtaLink = storeHero?.cta_link ?? storeHero?.button_link ?? rawContent?.hero_cta_link ?? null;

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

  const textOnlyHero = !!(heroHeading || heroSubtitle || heroCtaLabel);
  const hasDynamicHero = (
    (heroType === 'video' && !!storeHero?.video_url) ||
    (heroType === 'youtube' && !!storeHero?.youtube_url) ||
    ((heroType === 'image' || heroType === 'slider' || heroType === 'image_slider') && heroImages.length > 0) ||
    (heroType && textOnlyHero) ||
    (!heroType && textOnlyHero)
  );

  const rawFit = String(storeHero?.fit ?? storeHero?.object_fit ?? storeHero?.media_fit ?? rawContent?.hero_fit ?? 'cover').toLowerCase().trim();
  const heroFit: 'cover' | 'contain' = rawFit === 'contain' ? 'contain' : 'cover';
  const rawPos = String(storeHero?.position ?? storeHero?.object_position ?? storeHero?.focal_point ?? rawContent?.hero_position ?? 'center').trim() || 'center';
  const heroPosition = rawPos === 'centre' ? 'center' : rawPos;

  const youtubeId = heroType === 'youtube' && storeHero?.youtube_url ? extractYouTubeId(String(storeHero.youtube_url)) : null;
  const videoUrl = heroType === 'video' ? String(storeHero?.video_url || '').trim() : '';
  // Task-specified dynamic rendering hook: use store.settings.hero_images[0] as background with full URL fallback
  const heroBg = (storeSettings as any)?.hero_images?.[0] ?? heroImages[0] ?? null;
  const heroBgUrl = heroBg ? (() => { try { return getImageUrl(String(heroBg).trim().replace(/\/+$/, '')); } catch { return String(heroBg); } })() : null;

  // Slider/image: use merchant images when available; otherwise fall back to legacy
  // banners. Never show hardcoded FALLBACK_SLIDES on a merchant empty store.
  const isSliderType = heroType === 'image' || heroType === 'slider' || heroType === 'image_slider' || !heroType;
  const syntheticTextSlide = textOnlyHero && heroImages.length === 0 && !heroType
    ? [{ title: heroHeading || '', subtitle: heroSubtitle || '', image: '', button_text: heroCtaLabel || '', button_link: heroCtaLink || '#atelier-new' } as HeroSlide]
    : null;
  const list = hasDynamicHero && isSliderType && heroImages.length > 0
    ? heroImages.map((img) => ({
        title: heroHeading || '',
        subtitle: heroSubtitle || '',
        image: img,
        button_text: heroCtaLabel || '',
        button_link: heroCtaLink || '#atelier-new',
      }))
    : syntheticTextSlide
      ? syntheticTextSlide
      : (slides && slides.length > 0 ? slides : []).filter((s) => s.image || s.title);

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

  // Helper to render single hero content — hide fallback when dynamic hero has empty fields
  const singleHeroTitle = hasDynamicHero ? (heroHeading || '') : (heroHeading || list[0]?.title || FALLBACK_SLIDES[0].title);
  const singleHeroSubtitle = hasDynamicHero ? (heroSubtitle || '') : (heroSubtitle || list[0]?.subtitle || FALLBACK_SLIDES[0].subtitle);
  const singleHeroCtaLabel = hasDynamicHero ? (heroCtaLabel || '') : (heroCtaLabel || list[0]?.button_text || FALLBACK_SLIDES[0].button_text);
  const singleHeroCtaLink = hasDynamicHero ? (heroCtaLink || '#atelier-new') : (heroCtaLink || list[0]?.button_link || FALLBACK_SLIDES[0].button_link);

  // Conditional overlay text: hide entirely when dynamic hero has no text
  const shouldShowOverlayText = isSingleMedia
    ? !!(singleHeroTitle || singleHeroSubtitle || singleHeroCtaLabel)
    : list.some((s) => (s.title && String(s.title).trim()) || (s.subtitle && String(s.subtitle).trim()) || (s.button_text && String(s.button_text).trim()));

  // Responsive height + reusable fit/position controls — cover (no black bars) is default; contain keeps full video visible with letterbox
  const heroDesktopRaw = storeHero?.height_desktop ?? storeHero?.heightDesktop ?? rawContent?.hero_height_desktop ?? null;
  const heroMobileRaw = storeHero?.height_mobile ?? storeHero?.heightMobile ?? rawContent?.hero_height_mobile ?? null;
  const heroDesktopHeight = heroDesktopRaw ? String(heroDesktopRaw).trim() : 'clamp(360px, 42vw, 520px)';
  // Mobile-first: default to compact editorial height so first viewport shows commerce content quickly
  const heroMobileHeight = heroMobileRaw ? String(heroMobileRaw).trim() : 'min(54vh, 380px)';
  const heroHeightStyle: React.CSSProperties = { height: heroDesktopHeight, minHeight: '360px', maxHeight: '520px' };
  const mediaFitClass = heroFit === 'contain' ? 'object-contain' : 'object-cover';
  const mediaPositionStyle: React.CSSProperties = heroPosition && heroPosition !== 'center' ? { objectPosition: heroPosition } : {};
  return (
    <section className="atelier-hero relative w-full overflow-hidden bg-stone-900" style={heroHeightStyle} dir="rtl">
      <style>{`@media (max-width: 767px) { .atelier-hero { height: ${heroMobileHeight} !important; min-height: 0 !important; max-height: none !important; } }`}</style>
      {/* Background media — fit/position merchant-controlled: cover (crop, no bars) vs contain (letterbox). */}
      {hasDynamicHero && heroType === 'video' && videoUrl ? (
        <>
          <video
            autoPlay
            loop
            muted
            playsInline
            className={`absolute inset-0 h-full w-full ${mediaFitClass}`}
            style={mediaPositionStyle}
            src={videoUrl}
            poster={list[0]?.image ? getImageUrl(list[0].image) : undefined}
          />
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />
        </>
      ) : hasDynamicHero && heroType === 'youtube' && youtubeId ? (
        <>
          {/* YouTube cover technique: wrapper with overflow hidden + centered scaled iframe to avoid letterbox for portrait videos. contain => centered contain with black bars. */}
          {heroFit === 'contain' ? (
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1`}
              title="YouTube video player"
              frameBorder="0"
              allow="autoplay; fullscreen"
              allowFullScreen
              style={{ width: '100%', height: '100%', backgroundColor: 'black' } as any}
            />
          ) : (
            <div className="absolute inset-0 overflow-hidden bg-black">
              <iframe
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${youtubeId}&modestbranding=1&rel=0&enablejsapi=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="autoplay; fullscreen"
                allowFullScreen
                style={{
                  width: '177.77777778vh',
                  height: '56.25vw',
                  minWidth: '100%',
                  minHeight: '100%',
                  maxWidth: 'none',
                  maxHeight: 'none',
                } as any}
              />
            </div>
          )}
          <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />
        </>
      ) : (
        <>
          {list.map((slide, i) => (
            <div
              key={i}
              className="absolute inset-0 bg-stone-900 transition-opacity duration-[1200ms] ease-out"
              style={{ opacity: i === index ? 1 : 0 }}
              aria-hidden={i !== index}
            >
              <img
                src={getImageUrl(slide.image || '')}
                alt=""
                className={`h-full w-full ${mediaFitClass}`}
                sizes="(max-width:768px) 100vw, 100vw"
                loading={i === 0 ? 'eager' : 'lazy'}
                decoding="async"
                style={{
                  objectPosition: heroPosition !== 'center' ? heroPosition : undefined,
                  transform: i === index ? 'scale(1.02)' : 'scale(1.01)',
                  transition: 'transform 7s ease-out',
                }}
              />
              {/* Warm editorial veil + configurable overlay */}
              <div className="absolute inset-0 bg-gradient-to-l from-black/40 via-black/15 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              {hasDynamicHero && <div className="absolute inset-0 bg-black" style={{ opacity: overlayStyleOpacity }} />}
            </div>
          ))}
        </>
      )}

      {/* Copy — z-10 ensures legibility over media; hidden entirely when all text fields are empty */}
      {shouldShowOverlayText && (
        <div className="absolute inset-0 z-10 flex items-center">
          <div className="mx-auto w-full max-w-7xl px-6 sm:px-10 lg:px-16">
            <div className="max-w-xl">
              <span className="mb-4 block h-px w-14 bg-[#d8b48a]" />
              {isSingleMedia ? (
                <div className="transition-all duration-700">
                  {singleHeroSubtitle && (
                    <p className="mb-3 text-sm font-medium tracking-[0.2em] text-[#e8cfa8]">{singleHeroSubtitle}</p>
                  )}
                  {singleHeroTitle && (
                    <h1 className="font-serif text-2xl font-bold leading-[1.25] text-white sm:text-4xl md:text-6xl">
                      {singleHeroTitle}
                    </h1>
                  )}
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
                    {slide.title && (
                      <h1 className="font-serif text-2xl font-bold leading-[1.25] text-white sm:text-4xl md:text-6xl">
                        {slide.title}
                      </h1>
                    )}
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
      )}

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
