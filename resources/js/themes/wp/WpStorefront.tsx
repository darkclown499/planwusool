import React, { useMemo } from 'react';
import './kit/wp.css';
import { applyTokens } from '@/builder/design-tokens';
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
}

const EXTRA_SLIDE_LINES = [
  'تشكيلة جديدة تصل أسبوعياً بأسعار تنافسية',
  'اطلب مباشرة عبر واتساب واستلم طلبك أينما كنت',
];

/**
 * Bespoke storefront renderer for the ported misbahwp WordPress themes.
 * Composes the theme's original section order with its own palette,
 * Arabic copy and demo media while products/categories/cart flow through
 * the normal Wusool storefront data.
 */
export const WpStorefront: React.FC<WpStorefrontProps> = ({ theme, storeData }) => {
  const rootRef = useReveal([theme.slug]);
  const { cart, ui, config } = useStorefrontCore();

  // Keep merchant color/font overrides live for the scoped CSS variables.
  React.useEffect(() => {
    applyTokens(theme.tokens);
    return () => {
      document.documentElement.removeAttribute('style');
    };
  }, [theme]);

  const data = useMemo(() => {
    const hasReal = (storeData?.products?.length ?? 0) > 0 || (storeData?.categories?.length ?? 0) > 0;
    if (hasReal) {
      return { products: storeData.products || [], categories: storeData.categories || [] };
    }
    const demo = getDemoCatalog(theme.slug);
    return { products: demo.products, categories: demo.categories };
  }, [storeData, theme]);

  const slides = useMemo(() => {
    const m = theme.media;
    const out = [{ title: theme.tagline, text: '', image: m.sliderMain }];
    ['slideTwo', 'slideThree', 'slideSweets', 'slideCoffee', 'slidePerfume', 'slideGrills', 'slideToys', 'slideClothes', 'slideGifts'].forEach(
      (key, i) => {
        if (m[key]) {
          out.push({
            title: i % 2 === 0 ? theme.tagline : `${theme.name} — ${EXTRA_SLIDE_LINES[0]}`,
            text: EXTRA_SLIDE_LINES[(i + 1) % EXTRA_SLIDE_LINES.length],
            image: m[key],
          });
        }
      }
    );
    return out;
  }, [theme]);

  const whatsappPhone =
    config?.whatsapp_widget_phone || config?.socialMedia?.whatsapp || config?.phoneNumber || '';
  const whatsappHref = whatsappPhone ? createWhatsAppUrl(whatsappPhone, `مرحباً! أرغب بالاستفسار عن منتجات ${theme.name}`) : undefined;

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
    <div className="wpt-root" dir="rtl" ref={rootRef}>
      <WpHeader
        config={theme}
        cartCount={(cart.cartItems || []).length}
        onCartClick={() => ui.setShowCart(true)}
        whatsappHref={whatsappHref}
      />

      {theme.sections.map((section, i) => renderSection(section.kind, section.title, i))}

      <WpFooter config={theme} categories={data.categories} />
    </div>
  );
};
