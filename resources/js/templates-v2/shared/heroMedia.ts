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
  };
}

export function getHeroImageUrl(url: string): string {
  try { return getImageUrl(String(url).trim().replace(/\/+$/, '')); } catch { return String(url); }
}
