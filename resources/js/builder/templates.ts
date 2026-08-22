import type {
  BuilderSectionConfig,
  BuilderSectionType,
  BuilderTemplateConfig,
  BuilderTemplateSummary,
  PlanTier,
} from './types';
import { sectionDefaults } from './sections/helpers';

/* ===================================================================== */
/* Demo media presets — real photos served locally from                  */
/* public/images/store so new stores never depend on external hosts.     */
/* ===================================================================== */

export const STORE_MEDIA = {
  bannerStore: '/images/store/banner-store.jpg',
  grocery: '/images/store/grocery.jpg',
  fruits: '/images/store/fruits.jpg',
  vegetables: '/images/store/vegetables.jpg',
  spices: '/images/store/spices.jpg',
  sweets: '/images/store/sweets.jpg',
  clothes: '/images/store/clothes.jpg',
  coffee: '/images/store/coffee.jpg',
  bakery: '/images/store/bakery.jpg',
  dairy: '/images/store/dairy.jpg',
};

const s = (type: BuilderSectionType, order: number, props: Record<string, any> = {}, enabled = true): BuilderSectionConfig => ({
  id: type,
  type,
  enabled,
  order,
  props: { ...sectionDefaults(type), ...(props || {}) },
});

/* ===================================================================== */
/* Template Catalog — one batteries-included Arabic storefront template   */
/* (classic). Every legacy slug below maps onto it, so existing stores    */
/* migrate automatically with zero database changes.                      */
/* ===================================================================== */

const CLASSIC: BuilderTemplateConfig = {
  slug: 'classic',
  name: 'كلاسيك',
  name_en: 'Classic',
  description: 'متجر عربي متكامل: ترويسة واحدة، تصنيفات دائرية بالصور، منتجات مجمّعة حسب التصنيف وطلب مباشر عبر واتساب.',
  category: 'عام',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { show_nav: false }),
    s('hero', 2, {
      layout: 'split',
      hero_variant: 'split_banner',
      badge: '',
      title: 'كل ما تحتاجه في مكان واحد',
      subtitle: 'تصفّح الأقسام، اطلب مباشرة عبر واتساب واستلم طلبك أينما كنت.',
      image: STORE_MEDIA.bannerStore,
      button_text: 'ابدأ التسوق',
      button_link: '#template-categories',
      slides: [],
    }, false),
    s('categories', 3, {
      category_variant: 'circle_pills',
      columns: 6,
      section_title: 'الأقسام',
      show_all: false,
    }),
    s('products_by_category', 4, {
      per_category: 4,
      columns: 4,
      sort_default: 'newest',
      show_view_all: true,
    }),
    s('features', 5),
    s('footer', 6),
  ],
  tokens: {
    colors: {
      primary: '#0f8a5f',
      primary_foreground: '#ffffff',
      secondary: '#b45309',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f6faf7',
      text_primary: '#14201a',
      text_secondary: '#52645a',
      border: '#e3ece6',
    },
  },
  is_default: true,
  preview: 'linear-gradient(135deg,#f6faf7,#e3efe7)',
};

export const TEMPLATES: BuilderTemplateConfig[] = [CLASSIC];

/* ===================================================================== */
/* Lookups                                                               */
/* ===================================================================== */

export const getBuilderTemplate = (slug?: string | null): BuilderTemplateConfig | null =>
  TEMPLATES.find((t) => t.slug === normalizeTemplateSlug(slug)) || CLASSIC;

export const getBuilderTemplateSummaries = (): BuilderTemplateSummary[] =>
  TEMPLATES.map((t) => ({
    slug: t.slug,
    name: t.name,
    name_en: t.name_en,
    description: t.description,
    category: t.category,
    is_free: t.is_free,
    plan_required: t.plan_required,
    preview: t.preview,
  }));

export const getFreeBuilderTemplates = (): BuilderTemplateConfig[] => TEMPLATES.filter((t) => t.is_free);

export const getBuilderTemplatesByCategory = (category: string): BuilderTemplateConfig[] =>
  TEMPLATES.filter((t) => t.category === category);

/**
 * Map any legacy/engine slug to the current catalog so every existing store
 * renders with the classic design automatically — no DB migration needed.
 */
export const LEGACY_TEMPLATE_MAP: Record<string, string> = {
  // new-catalog slugs that existed before the consolidation
  zen: 'classic',
  bazaar: 'classic',
  elegant: 'classic',
  ocean: 'classic',
  rose: 'classic',
  fresh: 'classic',
  night: 'classic',
  luxe: 'classic',
  // old core templates
  'core-minimal': 'classic',
  'core-bold': 'classic',
  'core-sidebar': 'classic',
  'core-dark': 'classic',
  'core-bazaar': 'classic',
  'core-elegant': 'classic',
  'core-showcase': 'classic',
  // growth
  'growth-electronics': 'classic',
  'growth-fashion': 'classic',
  'growth-food': 'classic',
  'growth-cosmetics': 'classic',
  'growth-supermarket': 'classic',
  'growth-home-decor': 'classic',
  'growth-pharmacy': 'classic',
  // pro
  'pro-tech': 'classic',
  'pro-beauty': 'classic',
  'pro-books': 'classic',
  'pro-sport': 'classic',
  'pro-pets': 'classic',
  'pro-flowers': 'classic',
  'pro-coffee': 'classic',
  'pro-stationery': 'classic',
  'pro-spices': 'classic',
  'pro-clothing': 'classic',
  'pro-fragrances': 'classic',
  'pro-home-tools': 'classic',
  'pro-kids': 'classic',
  'pro-sports': 'classic',
  'pro-boutique': 'classic',
  // schema-driven engine themes
  'market-fast': 'classic',
  'fashion-luxe': 'classic',
  'fresh-produce': 'classic',
  // pre-canonic legacy sector slugs
  basic: 'classic',
  gadgets: 'classic',
  'arabic-gadgets': 'classic',
  'home-decor': 'classic',
  bakery: 'classic',
  supermarket: 'classic',
  wefaq: 'classic',
};

export const normalizeTemplateSlug = (slug?: string | null): string => {
  const raw = String(slug || '').trim();
  if (!raw) return 'classic';
  if (TEMPLATES.some((t) => t.slug === raw)) return raw;
  return LEGACY_TEMPLATE_MAP[raw] || 'classic';
};
