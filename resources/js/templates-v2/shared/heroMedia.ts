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
