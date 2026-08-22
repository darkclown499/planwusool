import React, { useEffect, useMemo } from 'react';
import './kit/wp.css';
import { applyTokens, clearTokens, mergeTokens } from '@/builder/design-tokens';
import type { BuilderDesignTokens } from '@/builder/types';
import { getDemoCatalog } from '@/builder/demo-catalogs';
import { createWhatsAppUrl } from '@/utils/whatsapp-helper';
import { useStorefrontCore } from '@/templates/storefront';
import type { WpThemeConfig } from './types';
import { useReveal } from './kit/useReveal';
import { WpHeader } from './kit/WpHeader';
import { WpOwlSlider } from './kit/WpOwlSlider';
import {
  WpCategoriesBox,
  WpContactStrip,
  WpDealOfDay,
  WpFeaturedCarousel,
  WpHotProducts,
  WpServices,
  WpShopGrid,
  WpTabbedProducts,
  WpTestimonial,
} from './kit/sections';
import { WpFooter } from './kit/WpFooter';

interface WpStorefrontProps {
  theme: WpThemeConfig;
  storeData: any;
  /** Merchant designer tokens — merged over the theme defaults. */
  designTokens?: BuilderDesignTokens | Record<string, any> | null;
  /** Merchant section show/hide overrides from the visual designer. */
  templateOverrides?: { sections?: any[] } | null;
}

const EXTRA_SLIDE_LINES = [
  'تشكيلة جديدة تصل أسبوعياً بأسعار تنافسية',
  'اطلب مباشرة عبر واتساب واستلم طلبك أينما كنت',
];

/**
 * Designer "sections" list uses the builder catalog's type names while the
 * ported WP themes have their own kinds. This bridge lets merchants toggle
 * sections on/off in the designer and see the effect on these themes too.
 */
const KIND_TO_DESIGNER_TYPE: Record<string, string> = {
  slider: 'hero',
  testimonial: 'reviews',
  'hot-products': 'products',
  'shop-grid': 'products',
  'featured-carousel': 'products',
  'tab-products': 'products',
  'special-meal': 'products',
  'deal-of-day': 'banners',
  'categories-box': 'categories',
  services: 'features',
  'contact-strip': 'contact',
};

/**
 * Bespoke storefront renderer for the ported misbahwp WordPress themes.
 * Composes the theme's original section order with its own palette,
 * Arabic copy and demo media while products/categories/cart flow through
 * the normal Wusool storefront data. Merchant branding (logo, store name,
 * WhatsApp number) and designer edits (colors/fonts, hidden sections)
 * always win over the theme defaults.
 */
export const WpStorefront: React.FC<WpStorefrontProps> = ({ theme, storeData, designTokens, templateOverrides }) => {
  const { cart, ui, config } = useStorefrontCore();

  // Merchant tokens win over theme defaults so designer changes are live.
  const merged = useMemo(() => mergeTokens(theme.tokens, designTokens as BuilderDesignTokens | null), [theme, designTokens]);
  useEffect(() => {
    applyTokens(merged);
    return () => clearTokens();
  }, [merged]);

  // Resolve real store identity: uploaded/config logo beats the text logo.
  const brand = useMemo(() => {
    const cfg = config || {};
    const logo = cfg.logo || cfg.store_logo || storeData?.logo || storeData?.store?.logo || null;
    const name = cfg.storeName || storeData?.name || storeData?.store?.name || theme.name;
    const phone = cfg.phoneNumber || cfg.whatsapp_widget_phone || storeData?.config?.phoneNumber || header_phone(theme);
    return { logo, name, phone };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, storeData, theme]);

  const data = useMemo(() => {
    const hasReal = (storeData?.products?.length ?? 0) > 0 || (storeData?.categories?.length ?? 0) > 0;
    if (hasReal) {
      return { products: storeData.products || [], categories: storeData.categories || [] };
    }
    const demo = getDemoCatalog(theme.slug);
    return { products: demo.products, categories: demo.categories };
  }, [storeData, theme]);

  // Section visibility: merchant can hide sections from the designer.
  const visibleSections = useMemo(() => {
    const overrides = templateOverrides?.sections;
    if (!overrides?.length) return theme.sections;
    const hidden = new Set(overrides.filter((s: any) => s && s.enabled === false).map((s: any) => String(s.type)));
    if (!hidden.size) return theme.sections;
    return theme.sections.filter((s) => !hidden.has(KIND_TO_DESIGNER_TYPE[s.kind] || s.kind));
  }, [theme, templateOverrides]);

  const slides = useMemo(() => {
    const m = theme.media;
    const out = [{ title: brand.name, text: theme.tagline, image: m.sliderMain }];
    ['slideTwo', 'slideThree', 'slideSweets', 'slideCoffee', 'slidePerfume', 'slideGrills', 'slideToys', 'slideClothes', 'slideGifts'].forEach(
      (key, i) => {
        if (m[key]) {
          out.push({
            title: i % 2 === 0 ? theme.tagline : EXTRA_SLIDE_LINES[0],
            text: EXTRA_SLIDE_LINES[(i + 1) % EXTRA_SLIDE_LINES.length],
            image: m[key],
          });
        }
      }
    );
    return out;
  }, [theme, brand]);

  const whatsappPhone =
    config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
  const whatsappHref = whatsappPhone ? createWhatsAppUrl(whatsappPhone, `مرحباً! أرغب بالاستفسار عن منتجات ${brand.name}`) : undefined;

  const renderSection = (kind: string, title?: string, key?: number) => {
    switch (kind) {
      case 'slider':
        return <WpOwlSlider key={key} slides={slides} buttonLabel={theme.strings.sliderButton} />;
      case 'testimonial':
        return <WpTestimonial key={key} title={title || 'آراء عملائنا'} />;
      case 'hot-products':
        return <WpHotProducts key={key} products={data.products} categories={data.categories} title={title || 'منتجاتنا'} />;
      case 'shop-grid':
        return <WpShopGrid key={key} products={data.products} categories={data.categories} title={title || 'كل المنتجات'} />;
      case 'tab-products':
        return <WpTabbedProducts key={key} products={data.products} categories={data.categories} title={title || 'تصفح حسب القسم'} />;
      case 'special-meal':
        return <WpTabbedProducts key={key} products={data.products} categories={data.categories} title={title || 'قائمتنا'} />;
      case 'deal-of-day':
        return <WpDealOfDay key={key} products={data.products} categories={data.categories} title={title || 'عرض اليوم'} />;
      case 'featured-carousel':
        return <WpFeaturedCarousel key={key} products={data.products} categories={data.categories} title={title || 'منتجات مميزة'} />;
      case 'categories-box':
        return (
          <WpCategoriesBox
            key={key}
            products={data.products}
            categories={data.categories}
            title={title || 'أقسامنا'}
            circle={theme.slug === 'kids-fashion'}
          />
        );
      case 'services':
        return <WpServices key={key} />;
      case 'contact-strip':
        return (
          <WpContactStrip key={key} title={title || 'تواصل معنا'} whatsappHref={whatsappHref} />
        );
      default:
        return null;
    }
  };

  return (
    <div className="wpt-root" dir="rtl">
      <WpHeader
        config={theme}
        displayName={brand.name}
        logoSrc={brand.logo}
        cartCount={(cart.cartItems || []).length}
        onCartClick={() => ui.setShowCart(true)}
        whatsappHref={whatsappHref}
      />

      {visibleSections.map((section, i) => renderSection(section.kind, section.title, i))}

      <WpFooter config={theme} storeName={brand.name} categories={data.categories} />
    </div>
  );
};

/** Theme placeholder phone used only until the merchant sets a real one. */
function header_phone(theme: WpThemeConfig): string {
  return theme.header.phone || '';
}
