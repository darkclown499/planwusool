import type { BuilderDesignTokens } from '@/builder/types';

/** Section kinds replicating each misbahwp theme's core/sections/*.php */
export type WpSectionKind =
  | 'slider'
  | 'testimonial'
  | 'hot-products'
  | 'deal-of-day'
  | 'special-meal'
  | 'tab-products'
  | 'categories-box'
  | 'featured-carousel'
  | 'shop-grid'
  | 'services'
  | 'banner-strip'
  | 'contact-strip';

export interface WpSectionConfig {
  kind: WpSectionKind;
  title?: string;
  subtitle?: string;
  /** category slug filter for product-driven sections */
  categorySlug?: string;
}

export interface WpThemeConfig {
  slug: string;
  name: string;
  nameEn: string;
  tagline: string;
  tokens: BuilderDesignTokens;
  header: {
    topbarText?: string;
    phone?: string;
    email?: string;
    socials?: boolean;
    logoText: string;
    menu: string[];
  };
  footer: {
    about: string;
    copyright: string;
  };
  strings: {
    sliderButton: string;
    addToCart: string;
    readMore: string;
    viewAll: string;
  };
  /** Optional per-theme services strip copy (falls back to platform defaults). */
  services?: Array<{ title: string; text: string }>;
  sections: WpSectionConfig[];
  /** demo media used when the store has no real data yet */
  media: Record<string, string>;
}
