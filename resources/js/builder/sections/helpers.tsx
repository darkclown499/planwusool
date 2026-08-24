import React from 'react';
import {
  Check,
  MessageCircle,
  Heart,
  ShoppingCart,
  PackageX,
  Star,
  StarHalf,
} from 'lucide-react';
import { toast } from '@/components/custom-toast';
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

export const SectionHeading: React.FC<SectionHeadingProps> = ({ title, subtitle, align = 'center', action, titleColor }) => {
  if (!title && !subtitle && !action) return null;
  return (
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
};

/* ------------------------------------------------------------------ */
/* ProductCard — the single unified card used across every section.     */
/* Features: wishlist ❤, quick-add 🛒 with "in cart" state, variant      */
/* chips (weights/sizes), discount % badge + out-of-stock overlay.      */
/* ------------------------------------------------------------------ */

/** Normalize product.variants (JSON column) into [{name, values}] pairs. */
export const variantsOf = (product: any): Array<{ name: string; values: string[] }> => {
  const raw = product?.variants;
  if (!raw) return [];
  let parsed = raw;
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((v: any) => ({
      name: String(v?.name || ''),
      values: (Array.isArray(v?.values) ? v.values : Array.isArray(v?.options) ? v.options : []).map(String).filter(Boolean),
    }))
    .filter((v) => v.values.length > 0);
};

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
  const inWishlist = wishlist.isInWishlist?.(product.id) ?? false;
  const inCart = (cart.cartItems || []).some((i: any) => String(i.id) === String(product.id));
  const variantChips = compact ? [] : variantsOf(product);

  const handleWishlist = async () => {
    const added = await wishlist.toggle(product.id);
    if (added !== null && added !== undefined) {
      toast.success(added ? 'أُضيف إلى المفضلة ❤️' : 'أُزيل من المفضلة');
    }
  };

  const handleQuickAdd = () => {
    if (!inStock) return;
    cart.addToCart(product);
  };

  return (
    <article
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
      style={{
        borderColor: css('--twc-border', '#f3f4f6'),
        borderRadius: css('--twx-radius', '1rem'),
      }}
    >
      {/* Product image — full-bleed square, no clipping or circular wrappers */}
      <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-50">
        {image ? (
          <img
            src={image}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <PackageX className="h-10 w-10" />
          </div>
        )}
        {hasSale && (
          <span
            className="absolute top-3 right-3 z-10 rounded-full px-2.5 py-1 text-xs font-bold text-white"
            style={{ background: css('--twc-danger', '#dc2626') }}
          >
            -{saleOff}%
          </span>
        )}
        {!inStock && (
          <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 text-sm font-bold text-white">
            نفد المخزون
          </span>
        )}
        {/* Click layer for product details */}
        <button
          type="button"
          onClick={() => productCtx.handleProductClick(product)}
          className="absolute inset-0 z-[1] cursor-pointer"
          aria-label={product.name}
        />
        {/* Wishlist heart — filled when saved */}
        <button
          type="button"
          onClick={handleWishlist}
          aria-label={inWishlist ? 'إزالة من المفضلة' : 'أضف إلى المفضلة'}
          className={`absolute top-3 left-3 z-10 flex h-9 w-9 items-center justify-center rounded-full shadow transition active:scale-90 ${
            inWishlist ? 'bg-red-50 text-red-500' : 'bg-white/90 text-slate-400 hover:text-red-500'
          }`}
        >
          <Heart className={`h-4 w-4 ${inWishlist ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-grow flex-col justify-between gap-2 p-4">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug" style={{ color: css('--twc-text-primary', '#111827') }}>
          <button type="button" onClick={() => productCtx.handleProductClick(product)} className="text-start">
            {product.name}
          </button>
        </h3>
        {!compact && (
          <div className="flex items-center gap-1 text-amber-400">
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <Star className="h-3.5 w-3.5 fill-current" />
            <StarHalf className="h-3.5 w-3.5 fill-current" />
            <span className="text-xs text-slate-400">(4.5)</span>
          </div>
        )}
        {/* Weight/size slices from product variants */}
        {!compact && variantChips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {variantChips[0].values.slice(0, 4).map((v) => (
              <span
                key={v}
                className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: `${css('--twc-primary', '#0f8a5f')}12`, color: css('--twc-text-secondary', '#475569') }}
              >
                {v}
              </span>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 flex-col">
            {hasSale && <span className="text-xs text-slate-400 line-through">{priceOf(product)}</span>}
            <span className="text-base font-bold" style={{ color: css('--twc-primary', '#0f8a5f') }}>
              {salePriceOf(product)}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
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
              onClick={handleQuickAdd}
              disabled={!inStock}
              title={inCart ? 'في سلتك ✓' : 'أضف للسلة'}
              aria-label={inCart ? 'في سلتك' : 'أضف للسلة'}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-white transition hover:opacity-90 active:scale-95 ${
                !inStock ? 'cursor-not-allowed opacity-40' : ''
              }`}
              style={{ background: inCart ? css('--twc-secondary', '#16a34a') : css('--twc-primary', '#0f8a5f') }}
            >
              {inCart ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {inCart && (
          <p className="text-[11px] font-bold" style={{ color: css('--twc-secondary', '#16a34a') }}>
            في سلتك ✓
          </p>
        )}
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
    header: { sticky: true, show_search: true, show_cart: true, show_auth: true, show_whatsapp: true, variant: 'classic', show_nav: true },
    hero: { title: '', subtitle: '', badge: '', image: '', video: '', button_text: 'تسوّق الآن', button_link: '#template-products', layout: 'split', hero_variant: 'split_banner', slides: [], autoplay: true, autoplay_delay: 5000, effect: 'slide', show_dots: true },
    categories: { style: 'cards', show_all: true, columns: 4, category_variant: 'card_pills', selected_categories: [] },
    products: { layout: 'grid', per_page: 12, columns: 4, featured_only: false, section_title: '', product_variant: 'detailed_cards_with_badges' },
    products_by_category: { section_title: 'تسوّق حسب القسم', per_category: 4, columns: 4, sort_default: 'newest', show_view_all: true },
    offers: { section_title: '', columns: 3 },
    banners: { type: 'single', variant: 'carousel', slides: [] },
    features: { section_title: '', items: [] },
    reviews: { section_title: '', items: [], display_mode: 'grid' },
    faq: { section_title: 'الأسئلة الشائعة' },
    video: { section_title: '', video_url: '', poster: '' },
    newsletter: { section_title: 'اشترك في النشرة البريدية' },
    footer: { show_newsletter: false, show_social: true, show_contact: true },
    contact: { section_title: 'تواصل معنا' },
    custom: { html: '', title: '' },
  };
  return map[type] || {};
};