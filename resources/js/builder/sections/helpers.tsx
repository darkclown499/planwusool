import React from 'react';
import {
  MessageCircle,
  Heart,
  ShoppingCart,
  PackageX,
  Star,
  StarHalf,
} from 'lucide-react';
import { useStorefrontCore } from '@/templates/storefront';
import type { BuilderSectionConfig } from '@/builder/types';
import { formatCurrency } from '@/utils/currency-formatter';
import { getImageUrl } from '@/utils/image-helper';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';

export interface BuilderSectionProps {
  section: BuilderSectionConfig;
  storeData?: any;
  mode?: 'home' | 'page' | 'edit';
  page?: any;
}

/** Read a token CSS variable with a safe fallback. */
export function css(name: string, fallback: string): string {
  if (typeof window !== 'undefined') {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name);
    return value?.trim() || fallback;
  }
  return fallback;
}

export const shopSettings = (): { storeSettings: any; currencies: any[] } => {
  const page: any = (typeof window !== 'undefined' && (window as any).page?.props) || {};
  return { storeSettings: page.storeSettings || {}, currencies: page.currencies || [] };
};

export function priceOf(product: any): string {
  const { storeSettings, currencies } = shopSettings();
  return formatCurrency(Number(product.price) || 0, storeSettings, currencies);
}

export function salePriceOf(product: any): string {
  const { storeSettings, currencies } = shopSettings();
  return formatCurrency(Number(product.sale_price || product.price) || 0, storeSettings, currencies);
}

export function productWhatsAppUrl(config: any, product: any, quantity = 1): string {
  const phone = config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
  if (!phone) return '';
  return createWhatsAppUrl(phone, `مرحباً! أرغب بطلب: ${product.name} - الكمية: ${quantity}`);
}

/* ------------------------------------------------------------------ */
/* SectionHeading                                                      */
/* ------------------------------------------------------------------ */

interface SectionHeadingProps {
  title?: string;
  subtitle?: string;
  align?: 'start' | 'center';
  action?: React.ReactNode;
  titleColor?: string;
}

export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, align = 'center', action, titleColor }) => (
  <div className={`mb-8 flex flex-col gap-3 ${align === 'center' ? 'items-center text-center' : 'items-start text-start'}`}>
    {title ? (
      <h2
        className="text-2xl font-extrabold tracking-tight sm:text-3xl"
        style={{ color: titleColor || css('--twc-text-primary', '#0f172a'), fontFamily: css('--twf-heading-font', 'inherit') }}
      >
        {title}
      </h2>
    ) : null}
    {subtitle ? (
      <p className="max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: css('--twc-text-secondary', '#475569') }}>
        {subtitle}
      </p>
    ) : null}
    {action}
  </div>
);

/* ------------------------------------------------------------------ */
/* ProductCard                                                         */
/* ------------------------------------------------------------------ */

interface ProductCardProps {
  product: any;
  compact?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, compact = false }) => {
  const { cart, product: productCtx, wishlist, config } = useStorefrontCore();
  const image = getImageUrl(product.image);
  const hasSale =
    Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price);
  const saleOff = hasSale
    ? Math.round(((Number(product.price) - Number(product.sale_price)) / Number(product.price)) * 100)
    : 0;
  const inStock = product.stock === null || product.stock === undefined || Number(product.stock) > 0;
  const whatsapp = productWhatsAppUrl(config, product);

  return (
    <article
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
      style={{
        borderColor: css('--twc-border', '#e2e8f0'),
        boxShadow: css('--twx-shadow-card', '0 4px 16px -6px rgba(2,6,23,0.1)'),
        borderRadius: css('--twx-radius', '1rem'),
      }}
    >
      <button
        type="button"
        onClick={() => productCtx.handleProductClick(product)}
        className="relative block aspect-square w-full overflow-hidden bg-slate-100 text-start"
        aria-label={product.name}
      >
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-300">
            <PackageX className="h-10 w-10" />
          </div>
        )}
        {hasSale && (
          <span
            className="absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ background: css('--twc-danger', '#dc2626') }}
          >
            -{saleOff}%
          </span>
        )}
        {!inStock && (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
            نفد المخزون
          </span>
        )}
      </button>

      <button
        type="button"
        onClick={() => wishlist.toggle(product)}
        aria-label="المفضلة"
        className="absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-400 shadow transition hover:text-red-500"
      >
        <Heart className="h-4 w-4" />
      </button>

      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3
          className="line-clamp-2 min-h-[2.6em] text-sm font-bold leading-snug sm:text-base"
          style={{ color: css('--twc-text-primary', '#0f172a') }}
        >
          <button type="button" onClick={() => productCtx.handleProductClick(product)} className="text-start">
            {product.name}
          </button>
        </h3>
        {!compact && (
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <StarHalf className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs text-slate-400">(4.5)</span>
          </div>
        )}
        <div className="mt-auto flex items-end justify-between gap-2 pt-2">
          <div className="flex flex-col">
            {hasSale && <span className="text-xs text-slate-400 line-through">{priceOf(product)}</span>}
            <span className="text-base font-extrabold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
              {salePriceOf(product)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {whatsapp && (
              <a
                href={whatsapp}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="اطلب عبر واتساب"
                className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90"
                style={{ background: '#25D366' }}
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            )}
            <button
              type="button"
              onClick={() => cart.addToCart(product)}
              aria-label="أضف للسلة"
              className="flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90 active:scale-95"
              style={{ background: css('--twc-primary', '#0f8a5f') }}
            >
              <ShoppingCart className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

/* ------------------------------------------------------------------ */
/* EmptySection                                                        */
/* ------------------------------------------------------------------ */

export const EmptySection: React.FC<{ title?: string; hint?: string }> = ({ title = 'لا يوجد محتوى بعد', hint }) => (
  <div className="mx-auto max-w-md px-4 py-16 text-center">
    <PackageX className="mx-auto h-12 w-12 text-slate-300" />
    <p className="mt-4 font-semibold" style={{ color: css('--twc-text-primary', '#0f172a') }}>
      {title}
    </p>
    {hint && (
      <p className="mt-1 text-sm" style={{ color: css('--twc-text-secondary', '#475569') }}>
        {hint}
      </p>
    )}
  </div>
);

/** Factory for per-section default props (used by scripts / future editor). */
export const sectionDefaults = (type: string): Record<string, any> => {
  const map: Record<string, Record<string, any>> = {
    announcement: { enabled: true, text: '🎉 شحن سريع لجميع مناطق المملكة', link: '' },
    header: { sticky: true, show_search: true, show_cart: true, show_auth: true, show_whatsapp: true },
    hero: { title: '', subtitle: '', badge: '', image: '', video: '', button_text: 'تسوّق الآن', button_link: '#template-products', layout: 'split' },
    categories: { style: 'cards', show_all: true, columns: 4 },
    products: { layout: 'grid', per_page: 12, columns: 4, featured_only: false, section_title: '' },
    offers: { section_title: '', columns: 3 },
    banners: { type: 'single' },
    features: { section_title: '' },
    reviews: { section_title: '' },
    faq: { section_title: 'الأسئلة الشائعة' },
    video: { section_title: '', video_url: '', poster: '' },
    newsletter: { section_title: 'اشترك في النشرة البريدية' },
    footer: { show_newsletter: false, show_social: true, show_contact: true },
    contact: { section_title: 'تواصل معنا' },
    custom: { html: '', title: '' },
  };
  return map[type] || {};
};