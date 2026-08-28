import { getImageUrl } from '@/utils/image-helper';
import { useStorefrontCore } from './hooks';

/**
 * Shared hero_banner resolver — used by every template's Hero component
 * so video/youtube/image hero types saved via Designer appear correctly
 * regardless of which template the merchant uses.
 *
 * Mirrors the logic in fashion-atelier/AtelierHero so all templates stay
 * in lockstep. Supports:
 *  - hero_banner.type: image | video | youtube
 *  - hero_banner.images: string[]
 *  - hero_banner.video_url: mp4 url or /storage/...
 *  - hero_banner.youtube_url: any youtube url
 *  - hero_banner.heading/subtitle/cta_* text
 *  - overlay_opacity
 * Also reads flat fallbacks (hero_type, hero_images, hero_video_url, etc.)
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1).split('?')[0].split('&')[0];
    if (u.searchParams.get('v')) return u.searchParams.get('v')!.split('&')[0];
    const parts = u.pathname.split('/').filter(Boolean);
    const embedIdx = parts.indexOf('embed');
    if (embedIdx !== -1 && parts[embedIdx + 1]) return parts[embedIdx + 1].split('?')[0];
    if (parts.length > 0) return parts[parts.length - 1].split('?')[0].split('&')[0];
    return null;
  } catch {
    const m = url.match(/[a-zA-Z0-9_-]{11}/);
    return m ? m[0] : null;
  }
}

export interface ResolvedHero {
  type: string | null;
  images: string[];
  videoUrl: string;
  youtubeUrl: string;
  youtubeId: string | null;
  heading: string;
  subtitle: string;
  ctaLabel: string;
  ctaLink: string;
  overlayOpacity: number;
  hasDynamicHero: boolean;
  /** Reusable fit control: cover (crop, no bars) vs contain (letterbox). Defaults to cover. */
  fit: 'cover' | 'contain';
  /** Object-position / focal point: center | top | bottom | custom percentage string. */
  position: string;
  /** Mobile-specific overrides — when null, desktop value applies. */
  fitMobile: 'cover' | 'contain' | null;
  positionMobile: string | null;
  /** Optional desktop/mobile heights (px or clamp). When absent, template default applies. */
  heightDesktop: string | null;
  heightMobile: string | null;
  /** Optional mobile-specific media source — when set, mobile uses vertical alternative. */
  imagesMobile: string[];
  videoUrlMobile: string | null;
  youtubeUrlMobile: string | null;
  youtubeIdMobile: string | null;
}

export function useResolvedHero(): ResolvedHero {
  let rawContent: any = {};
  let storeSettings: any = {};
  let storeHero: any = null;
  try {
    const core = useStorefrontCore() as any;
    rawContent = core?.content ?? {};
    storeSettings = core?.store?.settings ?? core?.config ?? {};
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
    };
    const hasFlatContent = Object.values(flatFromContent).some((v) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && (v as any).length === 0));
    const hasFlatSettings = Object.values(flatFromSettings).some((v) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && (v as any).length === 0));
    if (!storeHero || hasFlatContent || hasFlatSettings) {
      const mergedFlat = { ...flatFromContent, ...Object.fromEntries(Object.entries(flatFromSettings).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '')) };
      const hasAnyFlat = Object.values(mergedFlat).some((v) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && (v as any).length === 0));
      if (hasAnyFlat) {
        storeHero = { ...(storeHero || {}), ...Object.fromEntries(Object.entries(mergedFlat).filter(([, v]) => v !== null && v !== undefined && String(v).trim() !== '' && !(Array.isArray(v) && (v as any).length === 0))) };
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

  const heroHeading = storeHero?.heading ?? storeHero?.title ?? rawContent?.hero_heading ?? '';
  const heroSubtitle = storeHero?.subtitle ?? rawContent?.hero_subtitle ?? '';
  const heroCtaLabel = storeHero?.cta_label ?? storeHero?.button_text ?? rawContent?.hero_cta_label ?? '';
  const heroCtaLink = storeHero?.cta_link ?? storeHero?.button_link ?? rawContent?.hero_cta_link ?? '';

  // Reusable fit/position controls — merchant can control crop vs letterbox and focal point
  const rawFit = String(storeHero?.fit ?? storeHero?.object_fit ?? storeHero?.media_fit ?? rawContent?.hero_fit ?? 'cover').toLowerCase().trim();
  const fit: 'cover' | 'contain' = rawFit === 'contain' ? 'contain' : 'cover';
  const rawPos = String(storeHero?.position ?? storeHero?.object_position ?? storeHero?.focal_point ?? rawContent?.hero_position ?? 'center').trim() || 'center';
  // Normalize common aliases
  const position = rawPos === 'centre' ? 'center' : rawPos;
  // Mobile-specific overrides — independent so merchant can fix cropped video on phone without breaking desktop
  const rawFitMobile = storeHero?.fit_mobile ?? storeHero?.fitMobile ?? storeHero?.mobile_fit ?? rawContent?.hero_fit_mobile ?? rawContent?.heroFitMobile ?? null;
  const fitMobile: 'cover' | 'contain' | null = rawFitMobile ? (String(rawFitMobile).toLowerCase().trim() === 'contain' ? 'contain' : 'cover') : null;
  const rawPosMobile = storeHero?.position_mobile ?? storeHero?.positionMobile ?? storeHero?.mobile_position ?? rawContent?.hero_position_mobile ?? rawContent?.heroPositionMobile ?? null;
  const positionMobile = rawPosMobile ? String(rawPosMobile).trim() : null;
  const heightDesktop = storeHero?.height_desktop ?? storeHero?.heightDesktop ?? rawContent?.hero_height_desktop ?? null;
  const heightMobile = storeHero?.height_mobile ?? storeHero?.heightMobile ?? rawContent?.hero_height_mobile ?? null;
  // Optional mobile-specific media source (vertical promo for phone)
  const rawImagesMobile = storeHero?.images_mobile ?? storeHero?.imagesMobile ?? storeHero?.mobile_images ?? rawContent?.hero_images_mobile ?? null;
  const imagesMobile: string[] = Array.isArray(rawImagesMobile) ? rawImagesMobile.filter(Boolean).map((v:any)=>String(v)) : (typeof rawImagesMobile === 'string' && rawImagesMobile.trim() ? [rawImagesMobile.trim()] : []);
  const rawVideoMobile = storeHero?.video_url_mobile ?? storeHero?.videoUrlMobile ?? storeHero?.mobile_video_url ?? rawContent?.hero_video_url_mobile ?? null;
  const videoUrlMobile = rawVideoMobile ? String(rawVideoMobile).trim() : null;
  const rawYoutubeMobile = storeHero?.youtube_url_mobile ?? storeHero?.youtubeUrlMobile ?? storeHero?.mobile_youtube_url ?? rawContent?.hero_youtube_url_mobile ?? null;
  const youtubeUrlMobile = rawYoutubeMobile ? String(rawYoutubeMobile).trim() : null;
  const youtubeIdMobile = youtubeUrlMobile ? extractYouTubeId(youtubeUrlMobile) : null;

  const heroImages: string[] = (() => {
    if (!heroType || heroType === 'image' || heroType === 'slider' || heroType === 'image_slider') {
      const raw = storeHero?.images ?? storeHero?.image_slider ?? storeHero?.slider_images ?? storeHero?.slides ?? null;
      if (Array.isArray(raw) && raw.length > 0) return raw.filter(Boolean).map((v: any) => String(v));
      if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
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

  const youtubeId = heroType === 'youtube' && storeHero?.youtube_url ? extractYouTubeId(String(storeHero.youtube_url)) : null;
  const videoUrl = heroType === 'video' ? String(storeHero?.video_url || '').trim() : '';
  const youtubeUrl = heroType === 'youtube' ? String(storeHero?.youtube_url || '').trim() : '';

  return {
    type: heroType,
    images: heroImages,
    videoUrl,
    youtubeUrl,
    youtubeId,
    heading: String(heroHeading || ''),
    subtitle: String(heroSubtitle || ''),
    ctaLabel: String(heroCtaLabel || ''),
    ctaLink: String(heroCtaLink || ''),
    overlayOpacity: hasDynamicHero ? normalizedOverlay : 0.35,
    hasDynamicHero,
    fit,
    position,
    fitMobile,
    positionMobile,
    heightDesktop: heightDesktop ? String(heightDesktop) : null,
    heightMobile: heightMobile ? String(heightMobile) : null,
    imagesMobile,
    videoUrlMobile,
    youtubeUrlMobile,
    youtubeIdMobile,
  };
}

export function getHeroImageUrl(url: string): string {
  try { return getImageUrl(String(url).trim().replace(/\/+$/, '')); } catch { return String(url); }
}

/* ============================================================= */
/* Centralized hero/banner media contract                         */
/* ============================================================= */

/**
 * Single breakpoint where mobile hero takes over.
 * Tailwind `md` = 768px. CSS media query uses max-width:767px for mobile.
 */
export const HERO_BREAKPOINT = 768;
export const HERO_BREAKPOINT_CSS = '(max-width: 767px)';

/**
 * Hero width mode per template — intentional page layout.
 *  - contained: inside page max-width with side margins
 *  - full-bleed: edge-to-edge (only when template identity demands it)
 *  - split: asymmetric editorial (e.g. electronics text+image)
 */
export type HeroWidthMode = 'contained' | 'full-bleed' | 'split';
export const HERO_WIDTH_MODE: Record<string, HeroWidthMode> = {
  'fashion-atelier': 'contained',   // editorial — balanced margins, NOT edge-to-edge
  'bazaar-market': 'contained',     // centered marketplace card
  'grocery-souq': 'contained',      // dense supermarket, contained
  'bakery-house': 'contained',      // artisan, centered
  'electronics-hub': 'split',       // asymmetric text+image split, background full-bleed but content split
  'restaurant-menu': 'full-bleed',  // menu board — full width feels intentional
};

/**
 * Honest desktop visible-slot aspect per template — derived from
 * the REAL storefront Hero slot (not the old misleading source dream).
 * Used to advise merchants what composition will be crop-free.
 *
 * Fashion was 16:9 (1600x900) which made a ~900px giant at 1600vw.
 * Corrected to ~1600x520-550 wide slot so cover has negligible crop.
 */
export const HERO_DESKTOP_ASPECTS: Record<string, string> = {
  'fashion-atelier': '32/11',  // 1600×550 ≈ 2.91 — wide editorial slot
  'bazaar-market': '8/3',      // 1600×600 ≈ 2.67
  'grocery-souq': '8/3',       // 1600×600
  'bakery-house': '12/5',      // 1200×500
  'electronics-hub': '7/3',    // 1400×600 (split card, image part)
  'restaurant-menu': '8/3',    // 1600×600
};

/** Mobile slot — 4:5 vertical when mobile asset exists, otherwise same as desktop. */
export const HERO_MOBILE_ASPECT = '4/5';

/**
 * Professional responsive height contract — NOT blindly aspectRatio:source.
 * Each template gets a clamped height so common viewports stay ecommerce-scale:
 *  1920/1600/1366/1280/1024 remain ~380-520, never 700-900.
 *  Mobile capped so 375-430 (4:5) does not consume the whole first viewport.
 */
export const HERO_HEIGHTS: Record<string, { desktop: string; mobile: string }> = {
  'fashion-atelier': { desktop: 'clamp(380px, 32vw, 520px)', mobile: 'clamp(380px, 112vw, 480px)' },
  'bazaar-market':   { desktop: 'clamp(360px, 28vw, 460px)', mobile: 'clamp(360px, 108vw, 460px)' },
  'grocery-souq':    { desktop: 'clamp(340px, 26vw, 440px)', mobile: 'clamp(360px, 108vw, 460px)' },
  'bakery-house':    { desktop: 'clamp(340px, 30vw, 440px)', mobile: 'clamp(360px, 108vw, 440px)' },
  'electronics-hub': { desktop: 'clamp(400px, 32vw, 500px)', mobile: 'clamp(380px, 112vw, 480px)' },
  'restaurant-menu': { desktop: 'clamp(360px, 26vw, 460px)', mobile: 'clamp(360px, 108vw, 460px)' },
};
export const HERO_HEIGHT_FALLBACK = { desktop: 'clamp(360px, 28vw, 460px)', mobile: 'clamp(360px, 108vw, 460px)' };

export function heroHeightFor(templateSlug?: string | null, isMobile?: boolean): string {
  const s = String(templateSlug || '').trim().toLowerCase();
  const h = (HERO_HEIGHTS as any)[s] ?? HERO_HEIGHT_FALLBACK;
  return isMobile ? h.mobile : h.desktop;
}

/**
 * Return the advertised desktop aspect for a template slug, or 16/9 fallback.
 */
export function heroDesktopAspect(templateSlug?: string | null): string {
  const s = String(templateSlug || '').trim().toLowerCase();
  return HERO_DESKTOP_ASPECTS[s] ?? '16/9';
}

/**
 * Tailwind safelist hint — ensure these arbitrary aspect classes are generated
 * even though they are constructed dynamically. This comment is intentionally
 * kept so Tailwind's content scanner sees the literal class names.
 *
 * aspect-[16/9] aspect-[32/11] aspect-[16/7] aspect-[8/3] aspect-[12/5] aspect-[7/3] aspect-[4/5]
 * md:aspect-[16/9] md:aspect-[32/11] md:aspect-[16/7] md:aspect-[8/3] md:aspect-[12/5] md:aspect-[7/3]
 */
export const _TAILWIND_ASPECT_SAFELIST = 'aspect-[16/9] aspect-[32/11] aspect-[16/7] aspect-[8/3] aspect-[12/5] aspect-[7/3] aspect-[4/5] md:aspect-[16/9] md:aspect-[32/11] md:aspect-[16/7] md:aspect-[8/3] md:aspect-[12/5] md:aspect-[7/3]';

/**
 * CSS helper: returns responsive aspect-ratio style for a hero container.
 * Legacy aspect helper — kept for backward compat but new code should use
 * heroHeightStyle (clamped height) so giant 16:9 regressions do not return.
 */
export function heroAspectStyle(templateSlug?: string | null, hasMobileAsset?: boolean): React.CSSProperties & Record<string, any> {
  const desktop = heroDesktopAspect(templateSlug);
  return { aspectRatio: hasMobileAsset ? `var(--hero-ar, ${desktop})` : desktop } as any;
}

export function heroResponsiveAspectCss(templateSlug?: string | null): string {
  const desktop = heroDesktopAspect(templateSlug);
  return `@media ${HERO_BREAKPOINT_CSS} { .hero-responsive { aspect-ratio: ${HERO_MOBILE_ASPECT} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .hero-responsive { aspect-ratio: ${desktop} !important; } }`;
}

/**
 * Preferred height helper — clamped so 16:9 source never creates 900px giants.
 * Designer preview and storefront share identical clamp values.
 */
export function heroHeightStyle(templateSlug?: string | null, hasCustomHeight?: boolean, customDesktop?: string | null, customMobile?: string | null): React.CSSProperties {
  if (hasCustomHeight) {
    return customDesktop ? { height: customDesktop } as any : {};
  }
  return { height: heroHeightFor(templateSlug, false) } as any;
}
export function heroHeightCss(templateSlug?: string | null, className = 'hero-clamped'): string {
  const h = HERO_HEIGHTS[String(templateSlug||'').toLowerCase()] ?? HERO_HEIGHT_FALLBACK;
  return `@media ${HERO_BREAKPOINT_CSS} { .${className} { height: ${h.mobile} !important; } } @media (min-width: ${HERO_BREAKPOINT}px) { .${className} { height: ${h.desktop} !important; } }`;
}

/**
 * Effective object-fit / position for current viewport.
 * Mobile overrides are independent so merchant can fix cropped video on phone.
 */
export function heroFitFor(hero: ResolvedHero, isMobile: boolean): 'cover' | 'contain' {
  if (isMobile && hero.fitMobile) return hero.fitMobile;
  return hero.fit;
}
export function heroPositionFor(hero: ResolvedHero, isMobile: boolean): string {
  if (isMobile && hero.positionMobile) return hero.positionMobile;
  return hero.position;
}

/**
 * Pick the correct media source for given viewport.
 * Fallback chain: mobile-specific -> desktop -> empty.
 * Never stretches/distorts — cover vs contain is handled by CSS.
 */
export function heroImagesFor(hero: ResolvedHero, isMobile: boolean): string[] {
  if (isMobile && hero.imagesMobile.length > 0) return hero.imagesMobile;
  return hero.images;
}
export function heroVideoFor(hero: ResolvedHero, isMobile: boolean): string {
  if (isMobile && hero.videoUrlMobile) return hero.videoUrlMobile;
  return hero.videoUrl;
}
export function heroYoutubeIdFor(hero: ResolvedHero, isMobile: boolean): string | null {
  if (isMobile && hero.youtubeIdMobile) return hero.youtubeIdMobile;
  return hero.youtubeId;
}
