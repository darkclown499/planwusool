/**
 * Theme Engine Configuration Schema
 * =================================
 * Strongly-typed contract for the multi-theme architecture.
 *
 * Every niche storefront (Fashion, Supermarket, Fresh Produce, Tech, Beauty...)
 * is described by this one JSON shape. The ThemeEngine reads a `theme.config.json`
 * file (bundled per module, or overridden per store at runtime), normalizes it
 * against the defaults below, and renders the matching dynamic slots.
 *
 * Business logic (cart, checkout, WhatsApp orders, HotSMS OTP) is intentionally
 * NOT part of this schema - it is wired once in the core bridge and every theme
 * triggers the exact same hooks.
 */

/* ------------------------------------------------------------------ */
/* Enums / union types                                                */
/* ------------------------------------------------------------------ */

/** Light or dark color mode applied to the storefront chrome. */
export type ThemeColorMode = 'light' | 'dark';

/** Hero layout strategy. */
export type ThemeHeroType = 'search_focused' | 'full_video' | 'banner_slider' | 'compact_tabs';

/** Cart interaction pattern. */
export type ThemeCartType = 'side_drawer' | 'sticky_bottom_bar' | 'express_modal';

/** Product card presentation style. */
export type ThemeProductCardStyle = 'bulk_add' | 'minimal' | 'detailed_spec' | 'weight_calculator';

/** Font scale for the storefront. */
export type ThemeFontFamily = 'inter' | 'cairo' | 'tajawal' | 'almarai' | 'system';

/* ------------------------------------------------------------------ */
/* Sub-configs                                                         */
/* ------------------------------------------------------------------ */

export interface ThemeStylingConfig {
  primaryColor: string;
  /** Slightly darker shade used for hover/active states. */
  primaryDark: string;
  /** 8-digit or 6-digit hex (#rrggbb or #rrggbbaa). */
  primarySoft: string;
  onPrimary: string;
  borderRadius: string;
  fontFamily: ThemeFontFamily;
  colorMode: ThemeColorMode;
}

export interface ThemeLayoutConfig {
  heroType: ThemeHeroType;
  cartType: ThemeCartType;
  productCardStyle: ThemeProductCardStyle;
  /** Tailwind grid columns for the product grid (e.g. "2" | "3" | "4" | "5"). */
  gridColumns: number;
  /** Hide hero on desktop and show a compact strip (mobile-first markets). */
  compactHeroMobileOnly: boolean;
  /** Keep a sticky category bar under the header. */
  stickyCategoryBar: boolean;
  /** When true, the module renders its own cart UI (e.g. market-fast floating
   *  bar) and the engine skips the default DynamicCart overlay slot. */
  customCartSlot?: boolean;
  swatchStyle: 'round' | 'square';
}

export interface ThemeCommerceConfig {
  /** When true, cards render the WhatsApp "order" button next to add-to-cart. */
  enableWhatsAppOrdering: boolean;
  /** When true, checkout blocks submission until the phone is OTP-verified. */
  requireOtpVerification: boolean;
  /** Free-delivery threshold (0 = disabled). Currency = store currency. */
  freeDeliveryThreshold: number;
  /** Comma separated list of available delivery slots ("10:00-12:00") when slots are enabled. */
  deliverySlots: string[];
}

export interface ThemeFeatureConfig {
  enableWeightCalculator: boolean;
  enableDeliverySlots: boolean;
  enableUrgencyBadges: boolean;
  enableQuickVariantPicker: boolean;
  /** Promotional hero/banner slider. Pairs with `content.banners` slides. */
  enableBanner: boolean;
}

export interface ThemeContentConfig {
  heroTitle: string;
  heroSubtitle: string;
  heroCtaText: string;
  /** Optional hero background media (video URL or image URL) for full_video / banner variants. */
  heroMedia?: string;
  announcementText: string;
  bannerTitle?: string;
  bannerSubtitle?: string;
  bannerImage?: string;
  bannerCtaText?: string;
}

/* ------------------------------------------------------------------ */
/* Full config                                                         */
/* ------------------------------------------------------------------ */

export interface ThemeConfig {
  /** Machine id, e.g. "market-fast" - must match the store `theme` slug. */
  id: string;
  name: string;
  sector: string;
  styling: ThemeStylingConfig;
  layout: ThemeLayoutConfig;
  commerce: ThemeCommerceConfig;
  features: ThemeFeatureConfig;
  content: ThemeContentConfig;
}

/** Input shape - every field is optional so a store can override a preset. */
export type ThemeConfigInput = DeepPartial<ThemeConfig>;

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/* ------------------------------------------------------------------ */
/* Defaults                                                            */
/* ------------------------------------------------------------------ */

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  id: 'market-fast',
  name: 'متجر سريع',
  sector: 'عام',
  styling: {
    primaryColor: '#10b981',
    primaryDark: '#059669',
    primarySoft: '#d1fae5',
    onPrimary: '#ffffff',
    borderRadius: '0.75rem',
    fontFamily: 'cairo',
    colorMode: 'light',
  },
  layout: {
    heroType: 'search_focused',
    cartType: 'side_drawer',
    productCardStyle: 'bulk_add',
    gridColumns: 4,
    compactHeroMobileOnly: false,
    stickyCategoryBar: true,
    customCartSlot: false,
    swatchStyle: 'round',
  },
  commerce: {
    enableWhatsAppOrdering: true,
    requireOtpVerification: false,
    freeDeliveryThreshold: 0,
    deliverySlots: [],
  },
  features: {
    enableWeightCalculator: false,
    enableDeliverySlots: false,
    enableUrgencyBadges: false,
    enableQuickVariantPicker: false,
    enableBanner: false,
  },
  content: {
    heroTitle: 'تسوّق كل ما تحتاجه',
    heroSubtitle: 'طلبات سريعة وتوصيل حتى باب المنزل',
    heroCtaText: 'تسوّق الآن',
    announcementText: '',
    bannerCtaText: 'تسوّق الآن',
  },
};

/* ------------------------------------------------------------------ */
/* Options catalogs (drives admin pickers + validation)                */
/* ------------------------------------------------------------------ */

export const HERO_TYPES: ThemeHeroType[] = [
  'search_focused',
  'full_video',
  'banner_slider',
  'compact_tabs',
];

export const CART_TYPES: ThemeCartType[] = [
  'side_drawer',
  'sticky_bottom_bar',
  'express_modal',
];

export const PRODUCT_CARD_STYLES: ThemeProductCardStyle[] = [
  'bulk_add',
  'minimal',
  'detailed_spec',
  'weight_calculator',
];

/* ------------------------------------------------------------------ */
/* Normalization + validation                                          */
/* ------------------------------------------------------------------ */

const isEnum = <T extends string>(value: unknown, options: readonly T[]): value is T =>
  typeof value === 'string' && (options as readonly string[]).includes(value);

/**
 * Deep-merge a partial input over the defaults and coerce every field to a
 * valid value. Unknown keys are dropped (typed `DeepPartial` already prevents
 * that at compile time, but a runtime JSON file can still contain bad data).
 */
export function normalizeThemeConfig(input?: ThemeConfigInput | null): ThemeConfig {
  const base: ThemeConfig = JSON.parse(JSON.stringify(DEFAULT_THEME_CONFIG));
  if (!input || typeof input !== 'object') return base;

  const merge = <T extends object>(target: T, patch: any): T =>
    patch && typeof patch === 'object'
      ? Object.entries(patch).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            (acc as any)[key] = value;
          }
          return acc;
        }, { ...target })
      : target;

  const cfg: ThemeConfig = {
    ...base,
    ...merge(base, input),
    styling: merge(base.styling, input.styling),
    layout: merge(base.layout, input.layout),
    commerce: merge(base.commerce, input.commerce),
    features: merge(base.features, input.features),
    content: merge(base.content, input.content),
  };

  // Coerce enums to safe values (never let a bad JSON file break the engine)
  if (!isEnum(cfg.styling.colorMode, ['light', 'dark'])) cfg.styling.colorMode = 'light';
  if (!isEnum(cfg.layout.heroType, HERO_TYPES)) cfg.layout.heroType = 'search_focused';
  if (!isEnum(cfg.layout.cartType, CART_TYPES)) cfg.layout.cartType = 'side_drawer';
  if (!isEnum(cfg.layout.productCardStyle, PRODUCT_CARD_STYLES)) {
    cfg.layout.productCardStyle = 'bulk_add';
  }
  if (!isEnum(cfg.styling.fontFamily, ['inter', 'cairo', 'tajawal', 'almarai', 'system'])) {
    cfg.styling.fontFamily = 'cairo';
  }
  if (!['round', 'square'].includes(cfg.layout.swatchStyle)) cfg.layout.swatchStyle = 'round';
  if (typeof cfg.layout.gridColumns !== 'number' || cfg.layout.gridColumns < 1 || cfg.layout.gridColumns > 6) {
    cfg.layout.gridColumns = 4;
  }

  return cfg;
}

/** Validate a fully or partially shaped plain object and return a typed config. */
export function validateThemeConfig(raw: unknown): ThemeConfig {
  if (!raw || typeof raw !== 'object') {
    throw new Error('[ThemeEngine] Invalid theme.config.json: expected an object.');
  }
  const parsed = normalizeThemeConfig(raw as ThemeConfigInput);
  if (!parsed.id || typeof parsed.id !== 'string') {
    throw new Error('[ThemeEngine] theme.config.json must contain a non-empty "id".');
  }
  return parsed;
}

/* ------------------------------------------------------------------ */
/* Theme -> CSS variables                                              */
/* ------------------------------------------------------------------ */

/** Convert a hex color to an "r, g, b" triplet (used for alpha utilities). */
export function hexToRgb(hex: string): string {
  const value = hex.replace('#', '');
  const isShort = value.length === 3 || value.length === 4;
  const full = isShort
    ? value.split('').map((c) => c + c).join('')
    : value;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  return Number.isFinite(r) && Number.isFinite(g) && Number.isFinite(b)
    ? `${r}, ${g}, ${b}`
    : '255, 255, 255';
}

/** Resolve a font-family value to a CSS stack. */
export function fontStack(fontFamily: ThemeFontFamily): string {
  switch (fontFamily) {
    case 'inter':
      return "'Inter', system-ui, sans-serif";
    case 'tajawal':
      return "'Tajawal', system-ui, sans-serif";
    case 'almarai':
      return "'Almarai', system-ui, sans-serif";
    case 'system':
      return "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
    case 'cairo':
    default:
      return "'Cairo', system-ui, sans-serif";
  }
}

/**
 * Map a theme config onto CSS root variables consumed by the markups.
 * The engine calls this on mount and whenever the config changes, so a store
 * can hot-swap themes without a full reload.
 */
export function themeToCssVars(config: ThemeConfig): Record<string, string> {
  const { styling } = config;
  return {
    '--primary-color': styling.primaryColor,
    '--primary-color-dark': styling.primaryDark,
    '--primary-color-soft': styling.primarySoft,
    '--primary-color-rgb': hexToRgb(styling.primaryColor),
    '--on-primary': styling.onPrimary,
    '--radius': styling.borderRadius,
    '--font-family': fontStack(styling.fontFamily),
    '--color-mode': styling.colorMode,
  };
}

/**
 * Apply the theme config to the document element (root CSS variables + dark
 * class used by Tailwind's `dark:` variants).
 */
export function applyThemeToDocument(config: ThemeConfig) {
  const root = document.documentElement;
  const vars = themeToCssVars(config);
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  root.classList.toggle('dark', config.styling.colorMode === 'dark');
  root.style.colorScheme = config.styling.colorMode;
}

/* ------------------------------------------------------------------ */
/* Presets for the three shipped niche modules                         */
/* ------------------------------------------------------------------ */

export const THEME_PRESETS: Record<string, ThemeConfig> = {
  'market-fast': normalizeThemeConfig({
    id: 'market-fast',
    name: 'سوق سريع',
    sector: 'سوبر ماركت وبقالة',
    styling: {
      primaryColor: '#059669',
      primaryDark: '#047857',
      primarySoft: '#d1fae5',
      onPrimary: '#ffffff',
      borderRadius: '0.75rem',
      fontFamily: 'cairo',
      colorMode: 'light',
    },
    layout: {
      heroType: 'compact_tabs',
      cartType: 'sticky_bottom_bar',
      productCardStyle: 'bulk_add',
      gridColumns: 4,
      compactHeroMobileOnly: true,
      stickyCategoryBar: true,
      customCartSlot: true,
      swatchStyle: 'round',
    },
    commerce: {
      enableWhatsAppOrdering: true,
      requireOtpVerification: false,
      freeDeliveryThreshold: 0,
      deliverySlots: ['09:00-12:00', '12:00-15:00', '15:00-18:00', '18:00-21:00'],
    },
    features: {
      enableWeightCalculator: false,
      enableDeliverySlots: true,
      enableUrgencyBadges: true,
      enableQuickVariantPicker: true,
      enableBanner: true,
    },
    content: {
      heroTitle: 'كل احتياجاتك اليومية',
      heroSubtitle: 'منتجات طازجة بأسعار منافسة، تصلك في نفس اليوم',
      heroCtaText: 'تسوّق الآن',
      announcementText: 'توصيل مجاني للطلبات فوق 50 شيكل',
    },
  }),

  'fashion-luxe': normalizeThemeConfig({
    id: 'fashion-luxe',
    name: 'أزياء فاخرة',
    sector: 'أزياء وموضة',
    styling: {
      primaryColor: '#e11d48',
      primaryDark: '#be123c',
      primarySoft: '#ffe4e6',
      onPrimary: '#ffffff',
      borderRadius: '0.25rem',
      fontFamily: 'almarai',
      colorMode: 'light',
    },
    layout: {
      heroType: 'full_video',
      cartType: 'side_drawer',
      productCardStyle: 'detailed_spec',
      gridColumns: 4,
      compactHeroMobileOnly: false,
      stickyCategoryBar: false,
      swatchStyle: 'square',
    },
    commerce: {
      enableWhatsAppOrdering: true,
      requireOtpVerification: true,
      freeDeliveryThreshold: 150,
      deliverySlots: [],
    },
    features: {
      enableWeightCalculator: false,
      enableDeliverySlots: false,
      enableUrgencyBadges: false,
      enableQuickVariantPicker: true,
      enableBanner: false,
    },
    content: {
      heroTitle: 'أناقة تليق بك',
      heroSubtitle: 'تشكيلة مختارة من أحدث صيحات الموضة',
      heroCtaText: 'اكتشفي المجموعة',
      announcementText: 'شحن مجاني للطلبات فوق 150 شيكل',
    },
  }),

  'fresh-produce': normalizeThemeConfig({
    id: 'fresh-produce',
    name: 'خضار وفواكه طازجة',
    sector: 'منتجات طازجة',
    styling: {
      primaryColor: '#65a30d',
      primaryDark: '#4d7c0f',
      primarySoft: '#ecfccb',
      onPrimary: '#ffffff',
      borderRadius: '1rem',
      fontFamily: 'tajawal',
      colorMode: 'light',
    },
    layout: {
      heroType: 'banner_slider',
      cartType: 'express_modal',
      productCardStyle: 'weight_calculator',
      gridColumns: 3,
      compactHeroMobileOnly: false,
      stickyCategoryBar: true,
      swatchStyle: 'round',
    },
    commerce: {
      enableWhatsAppOrdering: true,
      requireOtpVerification: true,
      freeDeliveryThreshold: 30,
      deliverySlots: ['06:00-09:00', '09:00-12:00', '12:00-15:00', '15:00-18:00'],
    },
    features: {
      enableWeightCalculator: true,
      enableDeliverySlots: true,
      enableUrgencyBadges: true,
      enableQuickVariantPicker: false,
      enableBanner: true,
    },
    content: {
      heroTitle: 'من الأرض إلى مائدتك',
      heroSubtitle: 'خضار وفواكه طازجة يومياً مع خدمة توصيل سريعة',
      heroCtaText: 'اطلب طازجاً الآن',
      announcementText: 'وصلت إمدادات اليوم - الكمية محدودة',
    },
  }),
};

/** Lookup a bundled preset config by theme id. */
export function getThemePreset(id: string): ThemeConfig | null {
  return THEME_PRESETS[id] ?? null;
}