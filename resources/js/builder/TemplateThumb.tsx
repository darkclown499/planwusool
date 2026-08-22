import React from 'react';
import type { BuilderTemplateConfig } from './types';
import { TEMPLATES } from './templates';
import { getDemoCatalog } from './demo-catalogs';

interface TemplateThumbProps {
  tpl: BuilderTemplateConfig | null;
  /** Merchant store name shown in the mini header (defaults to template name). */
  storeName?: string;
  className?: string;
}

const hasSection = (tpl: BuilderTemplateConfig, type: string) =>
  tpl.sections.some((s) => s.type === type && s.enabled);

/** Font stack from the template's typography tokens (Arabic-first). */
const headingFont = (tpl: BuilderTemplateConfig): string => {
  const f = tpl.tokens?.typography?.heading_font;
  return `'${f || 'Tajawal'}', Tajawal, 'Segoe UI', sans-serif`;
};

/**
 * TemplateThumb — a realistic miniature storefront rendered from a
 * template's real design tokens (colors, typography, radius) and its own
 * niche demo-catalog imagery. Used as gallery/onboarding card artwork so a
 * merchant sees the actual look of the design before previewing it live,
 * instead of an abstract gradient.
 */
export const TemplateThumb: React.FC<TemplateThumbProps> = ({ tpl: tplInput, storeName, className = '' }) => {
  const tpl = tplInput || TEMPLATES[0];
  const c = tpl.tokens?.colors || {};
  const primary = c.primary || '#10b77f';
  const background = c.background || '#ffffff';
  const surface = c.surface || '#f8fafc';
  const textPrimary = c.text_primary || '#0f172a';
  const muted = c.text_secondary || '#94a3b8';
  const accent = c.accent || primary;

  const catalog = getDemoCatalog(tpl.slug);
  const heroImage =
    catalog?.categories?.[0]?.image ||
    catalog?.products?.[0]?.image ||
    '/images/store/banner-store.jpg';
  const products = (catalog?.products || []).slice(0, 3);
  while (products.length < 3) products.push(products[0] || { image: heroImage, name: '', price: 0, sale_price: null });

  const showCategories = hasSection(tpl, 'categories') || hasSection(tpl, 'products_by_category');
  const showReviews = hasSection(tpl, 'reviews');
  const hero = tpl.sections.find((s) => s.type === 'hero');
  const heroVariant = hero?.props?.hero_variant || hero?.props?.layout || 'split_banner';
  const fullBleedHero = ['slider_full', 'video_bg', 'full'].includes(String(heroVariant));

  const radius = String(tpl.tokens?.radius ?? '14px');
  const font = headingFont(tpl);

  return (
    <div
      dir="rtl"
      className={`pointer-events-none relative select-none overflow-hidden ${className}`}
      style={{ backgroundColor: background, fontFamily: font }}
      aria-hidden="true"
    >
      {/* Mini header */}
      <div
        className="flex items-center justify-between px-2.5 py-1.5"
        style={{ backgroundColor: background, borderBottom: `1px solid ${surface}` }}
      >
        <span className="flex items-center gap-1">
          <span className="block h-2 w-2 rounded-full" style={{ backgroundColor: primary }} />
          <span className="block h-1.5 w-10 rounded-full" style={{ backgroundColor: textPrimary, opacity: 0.75 }} />
        </span>
        <span className="flex items-center gap-1">
          <span className="block h-1.5 w-4 rounded-full" style={{ backgroundColor: muted, opacity: 0.5 }} />
          <span className="block h-1.5 w-4 rounded-full" style={{ backgroundColor: muted, opacity: 0.5 }} />
          <span
            className="block h-3 w-3 rounded-full"
            style={{ backgroundColor: primary }}
          />
        </span>
      </div>

      {/* Hero */}
      {fullBleedHero ? (
        <div className="relative h-[52%] min-h-[70px] w-full overflow-hidden">
          <img src={heroImage} alt="" className="h-full w-full object-cover" loading="lazy" />
          <div
            className="absolute inset-0"
            style={{ background: `linear-gradient(0deg, ${background}cc 0%, transparent 60%)` }}
          />
          <div className="absolute bottom-1.5 right-2 space-y-1">
            <div className="h-2 w-16 rounded-full" style={{ backgroundColor: textPrimary }} />
            <div className="flex items-center gap-1">
              <span
                className="inline-block rounded-full px-2 py-0.5 text-[7px] font-black leading-none"
                style={{ backgroundColor: primary, color: '#fff' }}
              >
                تسوّق الآن
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-stretch gap-1.5 px-2 pt-1.5">
          <div className="flex-1 space-y-1 py-1.5">
            <span
              className="inline-block rounded-full px-1.5 py-0.5 text-[6px] font-bold leading-none"
              style={{ backgroundColor: `${primary}22`, color: primary }}
            >
              جديد
            </span>
            <div className="h-2 w-full max-w-[80px] rounded-full" style={{ backgroundColor: textPrimary }} />
            <div className="h-1.5 w-full max-w-[64px] rounded-full" style={{ backgroundColor: muted, opacity: 0.55 }} />
            <span
              className="mt-0.5 inline-block rounded-md px-2 py-0.5 text-[7px] font-black leading-none"
              style={{ backgroundColor: primary, color: '#fff' }}
            >
              اكتشف
            </span>
          </div>
          <div
            className="h-[58px] w-[42%] overflow-hidden"
            style={{ borderRadius: radius, backgroundColor: `${primary}18` }}
          >
            <img src={heroImage} alt="" className="h-full w-full object-cover" loading="lazy" />
          </div>
        </div>
      )}

      {/* Categories strip */}
      {showCategories && (
        <div className="mt-1.5 flex justify-between gap-1 px-2">
          {(catalog?.categories || []).slice(0, 5).map((cat, i) => (
            <span key={i} className="flex flex-col items-center gap-0.5">
              <span
                className="block h-4 w-4 overflow-hidden"
                style={{
                  borderRadius: i % 2 ? radius : '9999px',
                  backgroundColor: i === 0 ? primary : `${primary}26`,
                }}
              >
                <img src={cat.image} alt="" className="h-full w-full object-cover" loading="lazy" />
              </span>
              <span
                className="block h-1 w-5 rounded-full"
                style={{ backgroundColor: muted, opacity: i === 0 ? 0.9 : 0.45 }}
              />
            </span>
          ))}
        </div>
      )}

      {/* Product cards */}
      <div className="mt-1.5 grid grid-cols-3 gap-1.5 px-2">
        {products.slice(0, 3).map((p, i) => (
          <div
            key={i}
            className="overflow-hidden border"
            style={{
              borderRadius: radius,
              borderColor: surface,
              backgroundColor: i === 1 ? surface : background,
            }}
          >
            <div className="h-8 overflow-hidden">
              <img src={p.image} alt="" className="h-full w-full object-cover" loading="lazy" />
            </div>
            <div className="space-y-0.5 p-1">
              <div className="h-1 w-full rounded-full" style={{ backgroundColor: muted, opacity: 0.4 }} />
              <div className="flex items-center justify-between">
                <span className="text-[7px] font-black leading-none" style={{ color: primary }}>
                  {p.price}
                </span>
                {p.sale_price != null && (
                  <span
                    className="rounded-sm px-0.5 text-[6px] font-bold leading-tight"
                    style={{ backgroundColor: accent, color: '#fff' }}
                  >
                    %
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Reviews hint */}
      {showReviews && (
        <div className="mt-1.5 flex items-center justify-center gap-1 px-2 pb-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="block h-1.5 rounded-full"
              style={{ width: i === 1 ? 22 : 14, backgroundColor: i === 1 ? primary : `${primary}40` }}
            />
          ))}
        </div>
      )}

      {/* Store name watermark */}
      {storeName && (
        <span className="absolute left-1.5 top-1 max-w-[45%] truncate text-[6px] font-medium" style={{ color: muted }}>
          {storeName}
        </span>
      )}
    </div>
  );
};
