import type {
  BuilderSectionConfig,
  BuilderSectionType,
  BuilderTemplateConfig,
  BuilderTemplateSummary,
  PlanTier,
} from './types';
import { sectionDefaults } from './sections/helpers';

const s = (type: BuilderSectionType, order: number, props: Record<string, any> = {}): BuilderSectionConfig => ({
  id: type,
  type,
  enabled: true,
  order,
  props: { ...sectionDefaults(type), ...(props || {}) },
});

const tpl = (
  slug: string,
  name: string,
  name_en: string,
  description: string,
  category: string,
  plan_required: PlanTier,
  sections: BuilderSectionConfig[],
  palette: Record<string, string>,
  preview: string,
  extra: Partial<BuilderTemplateConfig> = {}
): BuilderTemplateConfig => ({
  slug,
  name,
  name_en,
  description,
  category,
  is_free: plan_required === 'starter',
  plan_required,
  sections,
  tokens: { colors: palette },
  preview,
  ...extra,
});

/* ===================================================================== */
/* Template Catalog — the fresh Wusool design language                    */
/* ===================================================================== */

export const TEMPLATES: BuilderTemplateConfig[] = [
  tpl(
    'zen',
    'أساسي',
    'Zen',
    'تصميم نظيف وهادئ يضع منتجاتك في المقدمة.',
    'عام',
    'starter',
    [
      s('header', 1),
      s('hero', 2, { layout: 'split' }),
      s('categories', 3, { style: 'cards', columns: 4 }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4 }),
      s('features', 5),
      s('reviews', 6),
      s('footer', 7),
    ],
    {
      primary: '#0f8a5f',
      primary_foreground: '#ffffff',
      secondary: '#0e7490',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#f6faf8',
      text_primary: '#0f172a',
      text_secondary: '#475569',
      border: '#e2e8f0',
    },
    'linear-gradient(135deg,#f6faf8,#e8f3ee)',
    { is_default: true }
  ),

  tpl(
    'bazaar',
    'سوق',
    'Bazaar',
    'أجواء السوق النابضة بالألوان والشبكات الكثيفة.',
    'سوق',
    'starter',
    [
      s('announcement', 1, { text: '🔥 تشكيلة جديدة وصلت — تخفيضات تصل 30%' }),
      s('header', 2),
      s('hero', 3, { layout: 'full', badge: 'تخفيضات الموسم' }),
      s('categories', 4, { style: 'chips', columns: 6 }),
      s('products', 5, { layout: 'grid', per_page: 24, columns: 5 }),
      s('offers', 6),
      s('footer', 7),
    ],
    {
      primary: '#e11d48',
      primary_foreground: '#ffffff',
      secondary: '#f97316',
      accent: '#f59e0b',
      background: '#ffffff',
      surface: '#fff7f8',
      text_primary: '#1e293b',
      text_secondary: '#64748b',
      border: '#fee2e2',
    },
    'linear-gradient(135deg,#fff7f8,#ffe4e6)',
    { is_default: true }
  ),

  tpl(
    'elegant',
    'أنيق',
    'Elegant',
    'تصميم راقٍ بتدرجات لونية هادئة وتفاصيل ناعمة.',
    'أناقة',
    'growth',
    [
      s('header', 1),
      s('hero', 2, { layout: 'split', badge: 'مجموعة مميزة' }),
      s('categories', 3, { style: 'cards', columns: 4 }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4 }),
      s('banners', 5),
      s('reviews', 6),
      s('newsletter', 7),
      s('footer', 8),
    ],
    {
      primary: '#7c3aed',
      primary_foreground: '#ffffff',
      secondary: '#0d9488',
      accent: '#d97706',
      background: '#ffffff',
      surface: '#faf7ff',
      text_primary: '#1e1b4b',
      text_secondary: '#4c4a6d',
      border: '#ede9fe',
    },
    'linear-gradient(135deg,#faf7ff,#ede9fe)'
  ),

  tpl(
    'ocean',
    'تقني',
    'Ocean Tech',
    'إطلالة عصرية بألوان المحيط تناسب الإلكترونيات.',
    'تقنية',
    'growth',
    [
      s('announcement', 1, { text: 'شحن سريع + ضمان سنوي على كل الأجهزة' }),
      s('header', 2),
      s('hero', 3, { layout: 'split', badge: 'أحدث الوصولات' }),
      s('categories', 4, { style: 'cards', columns: 5 }),
      s('products', 5, { layout: 'grid', per_page: 18, columns: 4 }),
      s('banners', 6),
      s('video', 7),
      s('footer', 8),
    ],
    {
      primary: '#0e7490',
      primary_foreground: '#ffffff',
      secondary: '#3b82f6',
      accent: '#22d3ee',
      background: '#ffffff',
      surface: '#f0f9ff',
      text_primary: '#0c4a6e',
      text_secondary: '#475569',
      border: '#bae6fd',
    },
    'linear-gradient(135deg,#f0f9ff,#cffafe)'
  ),

  tpl(
    'rose',
    'موضة',
    'Rose',
    'نعومة وجاذبية تناسب الأزياء ومستحضرات التجميل.',
    'موضة',
    'growth',
    [
      s('header', 1),
      s('hero', 2, { layout: 'split', badge: 'تشكيلة لهذا الموسم', title: 'أزياء تصنع الفرق' }),
      s('categories', 3, { style: 'cards', columns: 4 }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4 }),
      s('offers', 5),
      s('reviews', 6),
      s('footer', 7),
    ],
    {
      primary: '#db2777',
      primary_foreground: '#ffffff',
      secondary: '#9d174d',
      accent: '#f472b6',
      background: '#ffffff',
      surface: '#fdf2f8',
      text_primary: '#500724',
      text_secondary: '#831843',
      border: '#fbcfe8',
    },
    'linear-gradient(135deg,#fdf2f8,#fce7f3)'
  ),

  tpl(
    'fresh',
    'منتجات طازة',
    'Fresh',
    'ألوان طبيعية نابضة تناسب الطعام والمنتجات الطازجة.',
    'أغذية',
    'growth',
    [
      s('announcement', 1, { text: 'استلم طلبك طازجاً خلال 24 ساعة 🥬' }),
      s('header', 2),
      s('hero', 3, { layout: 'full', badge: 'طازج يومياً' }),
      s('categories', 4, { style: 'chips', columns: 6 }),
      s('products', 5, { layout: 'grid', per_page: 18, columns: 4 }),
      s('banners', 6),
      s('newsletter', 7),
      s('footer', 8),
    ],
    {
      primary: '#16a34a',
      primary_foreground: '#ffffff',
      secondary: '#65a30d',
      accent: '#eab308',
      background: '#ffffff',
      surface: '#f0fdf4',
      text_primary: '#14532d',
      text_secondary: '#4d7c0f',
      border: '#bbf7d0',
    },
    'linear-gradient(135deg,#f0fdf4,#dcfce7)'
  ),

  tpl(
    'night',
    'ليلي',
    'Night',
    'هوية داكنة جريئة بألوان متوهجة لافتة.',
    'جريء',
    'professional',
    [
      s('header', 1),
      s('hero', 2, { layout: 'full', badge: 'جديد وحصري', title: 'أضف لمسة جريئة' }),
      s('categories', 3, { style: 'cards', columns: 4 }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4 }),
      s('offers', 5),
      s('faq', 6),
      s('footer', 7),
    ],
    {
      primary: '#8b5cf6',
      primary_foreground: '#ffffff',
      secondary: '#0ea5e9',
      accent: '#f59e0b',
      background: '#0f172a',
      surface: '#1e293b',
      text_primary: '#f8fafc',
      text_secondary: '#94a3b8',
      border: '#334155',
    },
    'linear-gradient(135deg,#0f172a,#1e293b)'
  ),

  tpl(
    'luxe',
    'فاخر',
    'Luxe',
    'لون ذهبي وفخامة تناسب المجوهرات والهدايا الراقية.',
    'فخامة',
    'professional',
    [
      s('header', 1),
      s('hero', 2, { layout: 'split', badge: 'تشكيلة حصرية' }),
      s('categories', 3, { style: 'cards', columns: 3 }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 3 }),
      s('banners', 5),
      s('reviews', 6),
      s('contact', 7),
      s('footer', 8),
    ],
    {
      primary: '#b45309',
      primary_foreground: '#ffffff',
      secondary: '#92400e',
      accent: '#d97706',
      background: '#fffbeb',
      surface: '#fef3c7',
      text_primary: '#451a03',
      text_secondary: '#78350f',
      border: '#fde68a',
    },
    'linear-gradient(135deg,#fffbeb,#fef3c7)'
  ),
];

/* ===================================================================== */
/* Lookups                                                               */
/* ===================================================================== */

export const getBuilderTemplate = (slug?: string | null): BuilderTemplateConfig | null => {
  const id = normalizeTemplateSlug(slug);
  return TEMPLATES.find((t) => t.slug === id) || null;
};

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

export const getFreeBuilderTemplates = (): BuilderTemplateConfig[] =>
  TEMPLATES.filter((t) => t.is_free);

export const getBuilderTemplatesByCategory = (category: string): BuilderTemplateConfig[] =>
  TEMPLATES.filter((t) => t.category === category);

/**
 * Map any legacy/engine slug to the new catalog so existing stores render
 * with the new design system after the rebuild.
 */
const LEGACY_TEMPLATE_MAP: Record<string, string> = {
  // old core templates
  'core-minimal': 'zen',
  'core-bold': 'bazaar',
  'core-sidebar': 'zen',
  'core-dark': 'night',
  'core-bazaar': 'bazaar',
  'core-elegant': 'elegant',
  'core-showcase': 'ocean',
  // growth
  'growth-electronics': 'ocean',
  'growth-fashion': 'rose',
  'growth-food': 'fresh',
  'growth-cosmetics': 'rose',
  'growth-supermarket': 'bazaar',
  'growth-home-decor': 'elegant',
  'growth-pharmacy': 'zen',
  // pro
  'pro-tech': 'ocean',
  'pro-beauty': 'rose',
  'pro-books': 'elegant',
  'pro-sport': 'ocean',
  'pro-pets': 'zen',
  'pro-flowers': 'fresh',
  'pro-coffee': 'fresh',
  'pro-stationery': 'zen',
  'pro-spices': 'fresh',
  'pro-clothing': 'rose',
  'pro-fragrances': 'rose',
  'pro-home-tools': 'bazaar',
  'pro-kids': 'bazaar',
  'pro-sports': 'ocean',
  'pro-boutique': 'luxe',
  // schema-driven engine themes
  'market-fast': 'ocean',
  'fashion-luxe': 'rose',
  'fresh-produce': 'fresh',
  // pre-canonic legacy sector slugs
  basic: 'zen',
  gadgets: 'bazaar',
  'arabic-gadgets': 'bazaar',
  'home-decor': 'elegant',
  bakery: 'bazaar',
  supermarket: 'bazaar',
  wefaq: 'zen',
};

export const normalizeTemplateSlug = (slug?: string | null): string => {
  const raw = String(slug || '').trim();
  if (!raw) return 'zen';
  if (TEMPLATES.some((t) => t.slug === raw)) return raw;
  return LEGACY_TEMPLATE_MAP[raw] || 'zen';
};