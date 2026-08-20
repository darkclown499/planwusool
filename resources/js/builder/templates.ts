import type {
  BuilderSectionConfig,
  BuilderSectionType,
  BuilderTemplateConfig,
  BuilderTemplateSummary,
  PlanTier,
} from './types';
import { sectionDefaults } from './sections/helpers';

/* ===================================================================== */
/* Task 1 — batteries-included demo media presets (per sector)           */
/* High-res banners, sample video loops + links merchants can replace.   */
/* ===================================================================== */

const MEDIA = {
  bannerStore: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1600&q=80',
  bannerGrocery: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80',
  bannerFruits: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?auto=format&fit=crop&w=1600&q=80',
  bannerFashion: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80',
  bannerTech: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1600&q=80',
  bannerCoffee: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1600&q=80',
  bannerLuxe: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1600&q=80',
  videoLoop: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
  videoYouTube: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
};

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
      s('hero', 2, {
        layout: 'split',
        hero_variant: 'split_banner',
        badge: 'تسوّق أذكى',
        title: 'كل ما تحتاجه في مكان واحد',
        subtitle: 'تصفّح، اطلب مباشرة عبر واتساب واستلم طلبك أينما كنت.',
        image: MEDIA.bannerStore,
        button_text: 'ابدأ التسوق',
        button_link: '#template-products',
        slides: [
          {
            title: 'عروض حصرية هذا الأسبوع',
            subtitle: 'خصومات تصل إلى 30% على تشكيلة واسعة تناسب الجميع.',
            image: MEDIA.bannerGrocery,
            button_text: 'اكتشف العروض',
            button_link: '#template-products',
          },
        ],
      }),
      s('categories', 3, { style: 'cards', columns: 4, category_variant: 'grid_cards' }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4, product_variant: 'compact_cards' }),
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
      s('hero', 3, {
        layout: 'full',
        badge: 'سوقك اليومي',
        title: 'منتجات طازجة كل يوم',
        subtitle: 'خضار، فواكه، ألبان وأفضل الأسعار مع توصيل سريع حتى باب البيت.',
        image: MEDIA.bannerGrocery,
        button_text: 'تسوّق الآن',
        button_link: '#template-products',
        video: MEDIA.videoLoop,
        hero_variant: 'slider_full',
        slides: [
          {
            title: 'تخفيضات الموسم',
            subtitle: 'خصومات كبيرة على البقالة والمنتجات الطازجة هذا الأسبوع.',
            image: MEDIA.bannerGrocery,
            button_text: 'استفد الآن',
            button_link: '#template-products',
            video: MEDIA.videoLoop,
          },
          {
            title: 'فواكه وخضار فاخرة',
            subtitle: 'مختارة يومياً من المزارع مباشرة إلى سلة طلبك.',
            image: MEDIA.bannerFruits,
            button_text: 'اكتشف الطازج',
            button_link: '#template-products',
          },
        ],
      }),
      s('categories', 4, { style: 'chips', columns: 6, category_variant: 'circle_pills' }),
      s('products', 5, { layout: 'grid', per_page: 24, columns: 5, product_variant: 'compact_cards' }),
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
      s('header', 1, { variant: 'centered' }),
      s('hero', 2, {
        layout: 'split',
        badge: 'مجموعة مميزة',
        title: 'اختلافٌ يُلاحظ بكل تفصيلة',
        subtitle: 'تشكيلة راقية مختارة بعناية لتناسب ذوقك الرفيع.',
        image: MEDIA.bannerFashion,
        button_text: 'تصفح المجموعة',
        button_link: '#template-products',
        hero_variant: 'bento_grid',
        slides: [
          {
            title: 'وصل حديثاً',
            subtitle: 'قطعت محدودة الكمية من أحدث مجموعاتنا.',
            image: MEDIA.bannerFashion,
            button_text: 'شاهد الجديد',
            button_link: '#template-products',
          },
          {
            title: 'إطلالة المساء',
            subtitle: '',
            image: MEDIA.bannerLuxe,
            button_text: 'اكتشف',
            button_link: '#template-products',
          },
        ],
      }),
      s('categories', 3, { style: 'cards', columns: 4, category_variant: 'circle_pills' }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4, product_variant: 'bento_products' }),
      s('banners', 5, {
        variant: 'carousel',
        slides: [
          {
            title: 'تشكيلة عصرية بلمسة ناعمة',
            subtitle: 'أزياء وإكسسوارات لكل المناسبات.',
            image: MEDIA.bannerFashion,
            button_text: 'تسوّق الآن',
            button_link: '#template-products',
          },
          {
            title: 'هدايا فاخرة',
            subtitle: 'أفكار هدايا تناسب الأذواق الراقية.',
            image: MEDIA.bannerLuxe,
            button_text: 'اكتشف الهدايا',
            button_link: '#template-products',
          },
        ],
      }),
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
      s('hero', 3, {
        layout: 'split',
        badge: 'أحدث الوصولات',
        title: 'الابتكار بين يديك',
        subtitle: 'أحدث هواتف، لابتوبات وملحقات أصلية مع ضمان سنوي وشحن سريع.',
        image: MEDIA.bannerTech,
        button_text: 'تسوّق الأجهزة',
        button_link: '#template-products',
        hero_variant: 'split_banner',
        video: MEDIA.videoYouTube,
        slides: [
          {
            title: 'صفقات الأسبوع التقنية',
            subtitle: 'خصومات على الشاشات، السماعات والساعات الذكية.',
            image: MEDIA.bannerTech,
            button_text: 'اطلع على العروض',
            button_link: '#template-products',
            video: MEDIA.videoYouTube,
          },
        ],
      }),
      s('categories', 4, { style: 'cards', columns: 5, category_variant: 'grid_cards' }),
      s('products', 5, { layout: 'grid', per_page: 18, columns: 4, product_variant: 'tabbed_categories' }),
      s('banners', 6, {
        variant: 'grid',
        slides: [
          {
            title: 'عروض الشاشات الذكية',
            subtitle: 'حتى 30% خصم على أحدث الطرازات.',
            image: MEDIA.bannerTech,
            button_text: 'اكتشف الشاشات',
            button_link: '#template-products',
          },
          {
            title: 'ملحقات للألعاب',
            subtitle: 'سماعات، فأرة ولوحات مفاتيح احترافية.',
            image: MEDIA.bannerLuxe,
            button_text: 'تسوّق الألعاب',
            button_link: '#template-products',
          },
        ],
      }),
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
      s('hero', 2, {
        layout: 'split',
        badge: 'موضة هذا الموسم',
        title: 'أزياء تصنع الفرق',
        subtitle: 'إطلالات عصرية، أقمشة راقية وأسعار تلائم كل الأذواق.',
        image: MEDIA.bannerFashion,
        button_text: 'اكتشف التشكيلة',
        button_link: '#template-products',
        hero_variant: 'slider_full',
        video: MEDIA.videoYouTube,
        slides: [
          {
            title: 'مجموعة الصيف',
            subtitle: 'قطع خفيفة بألوان هادئة لإطلالة مريحة.',
            image: MEDIA.bannerFashion,
            button_text: 'تسوّق الصيف',
            button_link: '#template-products',
          },
          {
            title: 'إطلالة السهرة',
            subtitle: 'فستان وقصّات تناسب مناسباتك المميزة.',
            image: MEDIA.bannerLuxe,
            button_text: 'تسوّق الآن',
            button_link: '#template-products',
          },
        ],
      }),
      s('categories', 3, { style: 'cards', columns: 4, category_variant: 'circle_pills' }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4, product_variant: 'detailed_cards_with_badges' }),
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
      s('hero', 3, {
        layout: 'full',
        badge: 'من المزرعة إلى بيتك',
        title: 'طازجٌ كل يوم',
        subtitle: 'قهوة مختصة، فواكه وخضار موسمية تُختار بعناية وتُوصّل خلال ساعات.',
        image: MEDIA.bannerGrocery,
        button_text: 'اطلب الآن',
        button_link: '#template-products',
        video: MEDIA.videoLoop,
        hero_variant: 'video_bg',
        slides: [
          {
            title: 'قهوة مختصة',
            subtitle: 'حمصوات طازجة من أجود الحبوب حول العالم.',
            image: MEDIA.bannerCoffee,
            button_text: 'تسوّق القهوة',
            button_link: '#template-products',
          },
        ],
      }),
      s('categories', 4, { style: 'chips', columns: 6, category_variant: 'circle_pills' }),
      s('products', 5, { layout: 'grid', per_page: 18, columns: 4, product_variant: 'bento_products' }),
      s('banners', 6, {
        variant: 'carousel',
        slides: [
          {
            title: 'منتجات مزرعتنا',
            subtitle: 'خضار وفواكه موسمية نستوردها من مزارع محلية.',
            image: MEDIA.bannerFruits,
            button_text: 'اكتشف الطازج',
            button_link: '#template-products',
          },
          {
            title: 'نكهات مميزة',
            subtitle: 'قهوة، بهارات وحلويات مصنوعة بحب.',
            image: MEDIA.bannerCoffee,
            button_text: 'تسوّق النكهات',
            button_link: '#template-products',
          },
        ],
      }),
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
      s('hero', 2, {
        layout: 'full',
        badge: 'جديد وحصري',
        title: 'أضف لمسة جريئة',
        subtitle: 'هوية قوية، منتجات استثنائية وتجربة تسوق لا تُنسى.',
        image: MEDIA.bannerTech,
        button_text: 'استكشف الآن',
        button_link: '#template-products',
        hero_variant: 'bento_grid',
        video: MEDIA.videoLoop,
        slides: [
          {
            title: 'إصدارات محدودة',
            subtitle: 'عدد محدود من القطع الأكثر طلباً.',
            image: MEDIA.bannerTech,
            button_text: 'اطلب مبكراً',
            button_link: '#template-products',
          },
          {
            title: 'عرض خاص',
            subtitle: '',
            image: MEDIA.bannerLuxe,
            button_text: 'شاهد العرض',
            button_link: '#template-products',
          },
        ],
      }),
      s('categories', 3, { style: 'cards', columns: 4, category_variant: 'grid_cards' }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 4, product_variant: 'horizontal_scroll' }),
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
      s('hero', 2, {
        layout: 'split',
        badge: 'تشكيلة حصرية',
        title: 'فخامة تُختار بعناية',
        subtitle: 'مجوهرات، هدايا وتفاصيل راقية تصنع فرق اللحظة.',
        image: MEDIA.bannerLuxe,
        button_text: 'اكتشف المجموعة',
        button_link: '#template-products',
        hero_variant: 'split_banner',
        video: MEDIA.videoYouTube,
        slides: [
          {
            title: 'قطع محدودة الإنتاج',
            subtitle: 'تشكيلة حصرية متاحة لفترة محدودة.',
            image: MEDIA.bannerLuxe,
            button_text: 'احجز قطعتك',
            button_link: '#template-products',
          },
        ],
      }),
      s('categories', 3, { style: 'cards', columns: 3, category_variant: 'image_tiles' }),
      s('products', 4, { layout: 'grid', per_page: 12, columns: 3, product_variant: 'detailed_cards_with_badges' }),
      s('banners', 5, {
        variant: 'carousel',
        slides: [
          {
            title: 'مجموعة الذهب',
            subtitle: 'تصاميم فاخرة تناسب أفخم المناسبات.',
            image: MEDIA.bannerLuxe,
            button_text: 'اكتشف الذهب',
            button_link: '#template-products',
          },
          {
            title: 'هدايا استثنائية',
            subtitle: 'فخامة معبأة بعناية لأعز الناس.',
            image: MEDIA.bannerFashion,
            button_text: 'اختر هدية',
            button_link: '#template-products',
          },
        ],
      }),
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