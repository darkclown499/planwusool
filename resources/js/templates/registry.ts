import type { DesignTokens, PlanTier, TemplateConfig, TemplateSectionConfig, TemplateSummary } from '@/templates/types';

/**
 * Template Registry — one core design system branching into 29 templates.
 *
 *   Free  (7):  core-minimal … core-showcase — distinct variations of the
 *               same section engine, switchable by every plan.
 *   Growth(14): + 7 "ready-made" premium layouts.
 *   Pro  (29):  all templates.
 *
 * Templates are data-driven configs (sections + layout + design tokens),
 * rendered by the generic TemplateRenderer. The storefront feature stack
 * (cart, checkout, login, orders) is shared, so every template is wired to
 * the merchant's live payment / SMS / cloud settings automatically.
 */

const baseSection = (id: string, type: TemplateConfig['sections'][number]['type'], order: number, props: Record<string, any> = {}): TemplateSectionConfig => ({
    id,
    type,
    enabled: true,
    order,
    props,
});

/** Build a template config with a standardised section layout. */
const tmpl = (
    slug: string,
    name: string,
    name_en: string,
    description: string,
    category: string,
    plan_required: PlanTier,
    sections: TemplateSectionConfig[],
    layout: TemplateConfig['layout'],
    colors: Record<string, string>,
    extra: Partial<TemplateConfig> = {},
): TemplateConfig => ({
    slug,
    name,
    name_en,
    description,
    category,
    is_free: plan_required === 'starter',
    plan_required,
    sections,
    layout,
    design_tokens: { colors },
    advanced_components: [],
    ...extra,
});

const CORE_LAYOUT: TemplateConfig['layout'] = { container: 'max-w-7xl', spacing: 'normal' };

/* =====================================================================
 * FREE TIER — the 7 core variations (plan_required: 'starter')
 * ===================================================================== */

const coreMinimal: TemplateConfig = tmpl(
    'core-minimal',
    'أساسي',
    'Core Minimal',
    'تصميم نظيف وبسيط يضع منتجاتك في المقدمة',
    'general',
    'starter',
    [
        baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true }),
        baseSection('categories', 'categories', 2, { style: 'tabs', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
        baseSection('footer', 'footer', 4, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#e6f7f1',
        'primary-100': '#c8efe1',
        'primary-500': '#10b77f',
        'primary-600': '#059669',
        'primary-700': '#047857',
        background: '#ffffff',
        surface: '#f9fafb',
        'text-primary': '#111827',
        'text-muted': '#6b7280',
    },
);

const coreBold: TemplateConfig = tmpl(
    'core-bold',
    'جريء',
    'Core Bold',
    'شبكة منتجات كثيفة مع بانر بعرض كامل',
    'general',
    'starter',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('products', 'products', 2, { layout: 'dense_grid', per_page: 24, columns: 6 }),
        baseSection('banner', 'banner', 3, {}),
        baseSection('footer', 'footer', 4, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#fff0f1',
        'primary-100': '#ffd7da',
        'primary-500': '#e11d48',
        'primary-600': '#be123c',
        'primary-700': '#9f1239',
        background: '#ffffff',
        surface: '#fff7f7',
        'text-primary': '#111827',
        'text-muted': '#6b7280',
    },
);

const coreSidebar: TemplateConfig = tmpl(
    'core-sidebar',
    'شريط جانبي',
    'Core Sidebar',
    'تخطيط جانبي يوضع التصفّح في طابور جانبي ثابت',
    'general',
    'starter',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: false }),
        baseSection('products', 'products', 2, { layout: 'grid', per_page: 20 }),
        baseSection('banner', 'banner', 3, {}),
        baseSection('sidebar', 'sidebar', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-[1400px]', spacing: 'normal', sidebar: true },
    {
        'primary-50': '#eff6ff',
        'primary-100': '#dbeafe',
        'primary-500': '#2563eb',
        'primary-600': '#1d4ed8',
        'primary-700': '#1e40af',
        background: '#f8fafc',
        surface: '#ffffff',
        'text-primary': '#1f2937',
        'text-muted': '#64748b',
    },
);

const coreDark: TemplateConfig = tmpl(
    'core-dark',
    'داكن',
    'Core Dark',
    'ثيم داكن بأسلوب تقني حديث',
    'general',
    'starter',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, dark: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
        baseSection('footer', 'footer', 4, { show_newsletter: true, dark: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal', dark_mode: true },
    {
        'primary-50': '#2b2f36',
        'primary-100': '#3a3f48',
        'primary-500': '#6366f1',
        'primary-600': '#4f46e5',
        'primary-700': '#4338ca',
        background: '#0f172a',
        surface: '#1e293b',
        'text-primary': '#e2e8f0',
        'text-muted': '#94a3b8',
    },
);

const coreBazaar: TemplateConfig = tmpl(
    'core-bazaar',
    'بازار',
    'Core Bazaar',
    'ثيم ملون مليء بالحركة، مثالي للمتاجر الغذائية والسوبرماركت',
    'grocery',
    'starter',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('categories', 'categories', 2, { style: 'horizontal_scroll', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('banner', 'banner', 4, {}),
        baseSection('offers', 'offers', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#E8F5E9',
        'primary-100': '#C8E6C9',
        'primary-500': '#4CAF50',
        'primary-600': '#43A047',
        'primary-700': '#2E7D32',
        'secondary-500': '#ff9800',
        background: '#F5F6F8',
        surface: '#ffffff',
        'text-primary': '#1F2937',
        'text-muted': '#6B7280',
    },
);

const coreElegant: TemplateConfig = tmpl(
    'core-elegant',
    'راقي',
    'Core Elegant',
    'ثيم أنيق هادئ بألوان صامتة لعلامة تجارية راقية',
    'fashion',
    'starter',
    [
        baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true, show_badge: true }),
        baseSection('products', 'products', 2, { layout: 'elegant_list', per_page: 12 }),
        baseSection('banner', 'banner', 3, {}),
        baseSection('featured', 'featured', 4, {}),
        baseSection('reviews', 'reviews', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#faf7f4',
        'primary-100': '#f0e8e0',
        'primary-500': '#a67c52',
        'primary-600': '#8b5e3c',
        'primary-700': '#734a30',
        background: '#ffffff',
        surface: '#faf7f4',
        'text-primary': '#2b2118',
        'text-muted': '#847767',
    },
);

const coreShowcase: TemplateConfig = tmpl(
    'core-showcase',
    'عرض',
    'Core Showcase',
    'هيرو بفيديو أو صورة كبيرة مع كاروسيل منتجات مميزة',
    'general',
    'starter',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('products', 'products', 2, { layout: 'grid', per_page: 16 }),
        baseSection('banner', 'banner', 3, {}),
        baseSection('featured', 'featured', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#eef2ff',
        'primary-100': '#dbe4ff',
        'primary-500': '#7c3aed',
        'primary-600': '#6d28d9',
        'primary-700': '#5b21b6',
        background: '#ffffff',
        surface: '#f5f3ff',
        'text-primary': '#1e1b4b',
        'text-muted': '#6b7280',
    },
);

/* =====================================================================
 * GROWTH TIER — 7 "ready-made" premium layouts (plan_required: 'growth')
 * ===================================================================== */

const growthElectronics: TemplateConfig = tmpl(
    'growth-electronics',
    'إلكترونيات',
    'Electronics',
    'جاهز لمتاجر الإلكترونيات: هيرو تقني، أقسام بطاقات، ومنتجات كثيفة',
    'electronics',
    'growth',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('banner', 'banner', 4, {}),
        baseSection('offers', 'offers', 5, {}),
        baseSection('reviews', 'reviews', 6, {}),
        baseSection('footer', 'footer', 7, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#eaf4ff',
        'primary-100': '#d0e8ff',
        'primary-500': '#0088ff',
        'primary-600': '#006fd1',
        'primary-700': '#005bb5',
        'secondary-500': '#022554',
        background: '#ffffff',
        surface: '#eff5fc',
        'text-primary': '#022554',
        'text-muted': '#64748b',
    },
);

const growthFashion: TemplateConfig = tmpl(
    'growth-fashion',
    'أزياء',
    'Fashion',
    'جاهز لمتاجر الأزياء: قائمة أنيقة وواجهات راقية',
    'fashion',
    'growth',
    [
        baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true, show_badge: true }),
        baseSection('categories', 'categories', 2, { style: 'horizontal_scroll', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'elegant_list', per_page: 12 }),
        baseSection('banner', 'banner', 4, {}),
        baseSection('featured', 'featured', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#fdf2f8',
        'primary-100': '#fce7f3',
        'primary-500': '#ec4899',
        'primary-600': '#db2777',
        'primary-700': '#be185d',
        background: '#ffffff',
        surface: '#fdf2f8',
        'text-primary': '#1f2937',
        'text-muted': '#6b7280',
    },
);

const growthFood: TemplateConfig = tmpl(
    'growth-food',
    'مطعم',
    'Food',
    'جاهز لمتاجر الطعام والمطاعم: قائمة طعام وبانرات شهية',
    'food',
    'growth',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('categories', 'categories', 2, { style: 'horizontal_scroll', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'menu_list', per_page: 24 }),
        baseSection('offers', 'offers', 4, {}),
        baseSection('banner', 'banner', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#fef2f2',
        'primary-100': '#fee2e2',
        'primary-500': '#f59e0b',
        'primary-600': '#d97706',
        'primary-700': '#b45309',
        background: '#fffbeb',
        surface: '#ffffff',
        'text-primary': '#292524',
        'text-muted': '#78716c',
    },
);

const growthCosmetics: TemplateConfig = tmpl(
    'growth-cosmetics',
    'تجميل',
    'Cosmetics',
    'جاهز لمتاجر التجميل والعناية: ألوان ناعمة وتصميم يومي',
    'beauty',
    'growth',
    [
        baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true, video: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
        baseSection('featured', 'featured', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#fdf4ff',
        'primary-100': '#fae8ff',
        'primary-500': '#d946ef',
        'primary-600': '#c026d3',
        'primary-700': '#a21caf',
        background: '#ffffff',
        surface: '#fdf4ff',
        'text-primary': '#3f3f46',
        'text-muted': '#71717a',
    },
);

const growthSupermarket: TemplateConfig = tmpl(
    'growth-supermarket',
    'سوبر ماركت',
    'Supermarket',
    'جاهز للسوبرماركت: منتجات كثيفة، بانر عرض، وأقسام جانبية',
    'grocery',
    'growth',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: false }),
        baseSection('products', 'products', 2, { layout: 'grid', per_page: 24 }),
        baseSection('banner', 'banner', 3, {}),
        baseSection('offers', 'offers', 4, {}),
        baseSection('sidebar', 'sidebar', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    { container: 'max-w-[1400px]', spacing: 'normal', sidebar: true },
    {
        'primary-50': '#E8F5E9',
        'primary-100': '#C8E6C9',
        'primary-500': '#4CAF50',
        'primary-600': '#43A047',
        'primary-700': '#2E7D32',
        'secondary-500': '#007BFF',
        background: '#F5F6F8',
        surface: '#ffffff',
        'text-primary': '#1F2937',
        'text-muted': '#6B7280',
    },
);

const growthHomeDecor: TemplateConfig = tmpl(
    'growth-home-decor',
    'ديكور منزلي',
    'Home Decor',
    'جاهز لمتاجر الديكور والأثاث المنزلي: عروض وبانرات دافئة',
    'home',
    'growth',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('products', 'products', 2, { layout: 'grid', per_page: 20 }),
        baseSection('banner', 'banner', 3, {}),
        baseSection('featured', 'featured', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#f5f3ee',
        'primary-100': '#e6e0d4',
        'primary-500': '#a16207',
        'primary-600': '#854d0e',
        'primary-700': '#713f12',
        background: '#fdfbf7',
        surface: '#f5f3ee',
        'text-primary': '#292524',
        'text-muted': '#78716c',
    },
);

const growthPharmacy: TemplateConfig = tmpl(
    'growth-pharmacy',
    'صيدلية',
    'Pharmacy',
    'جاهز للصيدليات: هيرو طبي نظيف وأقسام منتجات واضحة',
    'health',
    'growth',
    [
        baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
        baseSection('offers', 'offers', 4, {}),
        baseSection('reviews', 'reviews', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    CORE_LAYOUT,
    {
        'primary-50': '#e8f6f3',
        'primary-100': '#c9ebe4',
        'primary-500': '#14b8a6',
        'primary-600': '#0d9488',
        'primary-700': '#0f766e',
        background: '#f0fdfa',
        surface: '#ffffff',
        'text-primary': '#134e4a',
        'text-muted': '#64748b',
    },
);

/* =====================================================================
 * PROFESSIONAL TIER — the remaining 15 templates (plan_required: 'professional')
 * ===================================================================== */

const proTech: TemplateConfig = tmpl(
    'pro-tech',
    'تقني',
    'Pro Tech',
    'قالب احترافي لمتاجر التقنية والملحقات الرقمية',
    'electronics',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('offers', 'offers', 4, {}),
        baseSection('banner', 'banner', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'comfortable' },
    {
        'primary-50': '#eef2ff',
        'primary-100': '#dbe4ff',
        'primary-500': '#4f46e5',
        'primary-600': '#4338ca',
        'primary-700': '#3730a3',
        background: '#f8fafc',
        surface: '#ffffff',
        'text-primary': '#111827',
        'text-muted': '#6b7280',
    },
);

const proBeauty: TemplateConfig = tmpl(
    'pro-beauty',
    'جمال احترافي',
    'Pro Beauty',
    'قالب احترافي لمتاجر التجميل والسبا',
    'beauty',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('products', 'products', 2, { layout: 'elegant_list', per_page: 12 }),
        baseSection('featured', 'featured', 3, {}),
        baseSection('banner', 'banner', 4, {}),
        baseSection('reviews', 'reviews', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    { container: 'max-w-6xl', spacing: 'comfortable' },
    {
        'primary-50': '#faf5ff',
        'primary-100': '#f3e8ff',
        'primary-500': '#a855f7',
        'primary-600': '#9333ea',
        'primary-700': '#7e22ce',
        background: '#ffffff',
        surface: '#faf5ff',
        'text-primary': '#3b0764',
        'text-muted': '#71717a',
    },
);

const proBooks: TemplateConfig = tmpl(
    'pro-books',
    'كتب',
    'Pro Books',
    'قالب احترافي لمتاجر الكتب والمكتبات',
    'books',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true }),
        baseSection('categories', 'categories', 2, { style: 'tabs', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
        baseSection('featured', 'featured', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-5xl', spacing: 'comfortable' },
    {
        'primary-50': '#fffbeb',
        'primary-100': '#fef3c7',
        'primary-500': '#f59e0b',
        'primary-600': '#d97706',
        'primary-700': '#b45309',
        background: '#fefcf7',
        surface: '#ffffff',
        'text-primary': '#1c1917',
        'text-muted': '#78716c',
    },
);

const proSport: TemplateConfig = tmpl(
    'pro-sport',
    'رياضة',
    'Pro Sport',
    'قالب احترافي لمتاجر الرياضة والمعدات الرياضية',
    'sport',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('categories', 'categories', 2, { style: 'horizontal_scroll', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('offers', 'offers', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal' },
    {
        'primary-50': '#f0fdf4',
        'primary-100': '#dcfce7',
        'primary-500': '#22c55e',
        'primary-600': '#16a34a',
        'primary-700': '#15803d',
        background: '#ffffff',
        surface: '#f0fdf4',
        'text-primary': '#14532d',
        'text-muted': '#6b7280',
    },
);

const proPets: TemplateConfig = tmpl(
    'pro-pets',
    'حيوانات أليفة',
    'Pro Pets',
    'قالب احترافي لمتاجر الحيوانات الأليفة ومستلزماتها',
    'pets',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
        baseSection('banner', 'banner', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal' },
    {
        'primary-50': '#fff7ed',
        'primary-100': '#ffedd5',
        'primary-500': '#f97316',
        'primary-600': '#ea580c',
        'primary-700': '#c2410c',
        background: '#fffbeb',
        surface: '#fff7ed',
        'text-primary': '#431407',
        'text-muted': '#78716c',
    },
);

const proFlowers: TemplateConfig = tmpl(
    'pro-flowers',
    'زهور',
    'Pro Flowers',
    'قالب احترافي لمتاجر الزهور والهدايا',
    'flowers',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('products', 'products', 2, { layout: 'grid', per_page: 16 }),
        baseSection('offers', 'offers', 3, {}),
        baseSection('banner', 'banner', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-6xl', spacing: 'comfortable' },
    {
        'primary-50': '#fdf2f8',
        'primary-100': '#fce7f3',
        'primary-500': '#f472b6',
        'primary-600': '#db2777',
        'primary-700': '#be185d',
        background: '#fffbfd',
        surface: '#fdf2f8',
        'text-primary': '#500724',
        'text-muted': '#78716c',
    },
);

const proCoffee: TemplateConfig = tmpl(
    'pro-coffee',
    'قهوة',
    'Pro Coffee',
    'قالب احترافي لمتاجر القهوة والمشروبات',
    'food',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('products', 'products', 2, { layout: 'menu_list', per_page: 20 }),
        baseSection('offers', 'offers', 3, {}),
        baseSection('reviews', 'reviews', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-5xl', spacing: 'comfortable' },
    {
        'primary-50': '#f5f3ee',
        'primary-100': '#e7e0d8',
        'primary-500': '#78350f',
        'primary-600': '#654321',
        'primary-700': '#4b2e17',
        background: '#fcfaf7',
        surface: '#f5f3ee',
        'text-primary': '#292524',
        'text-muted': '#78716c',
    },
);

const proStationery: TemplateConfig = tmpl(
    'pro-stationery',
    'قرطاسية',
    'Pro Stationery',
    'قالب احترافي لمتاجر القرطاسية والمكتبات',
    'stationery',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true }),
        baseSection('categories', 'categories', 2, { style: 'tabs', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('featured', 'featured', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal' },
    {
        'primary-50': '#e0f2fe',
        'primary-100': '#bae6fd',
        'primary-500': '#0ea5e9',
        'primary-600': '#0284c7',
        'primary-700': '#0369a1',
        background: '#f8fafc',
        surface: '#ffffff',
        'text-primary': '#0c4a6e',
        'text-muted': '#64748b',
    },
);

const proSpices: TemplateConfig = tmpl(
    'pro-spices',
    'توابل',
    'Pro Spices',
    'قالب احترافي لمتاجر التوابل والأطعمة الجافة',
    'grocery',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('products', 'products', 2, { layout: 'grid', per_page: 24 }),
        baseSection('offers', 'offers', 3, {}),
        baseSection('banner', 'banner', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal' },
    {
        'primary-50': '#fef9c3',
        'primary-100': '#fef08a',
        'primary-500': '#ca8a04',
        'primary-600': '#a16207',
        'primary-700': '#854d0e',
        background: '#fffbeb',
        surface: '#fefce8',
        'text-primary': '#422006',
        'text-muted': '#78716c',
    },
);

const proClothing: TemplateConfig = tmpl(
    'pro-clothing',
    'ملابس',
    'Pro Clothing',
    'قالب احترافي لمتاجر الملابس والأزياء الراقية',
    'fashion',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('categories', 'categories', 2, { style: 'horizontal_scroll', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'elegant_list', per_page: 12 }),
        baseSection('featured', 'featured', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'comfortable' },
    {
        'primary-50': '#f5f3f0',
        'primary-100': '#e3ddd6',
        'primary-500': '#57534e',
        'primary-600': '#44403c',
        'primary-700': '#292524',
        background: '#ffffff',
        surface: '#f5f3f0',
        'text-primary': '#1c1917',
        'text-muted': '#78716c',
    },
);

const proFragrances: TemplateConfig = tmpl(
    'pro-fragrances',
    'عطور',
    'Pro Fragrances',
    'قالب احترافي لمتاجر العطور والبرفانات',
    'beauty',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('products', 'products', 2, { layout: 'grid', per_page: 16 }),
        baseSection('featured', 'featured', 3, {}),
        baseSection('reviews', 'reviews', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-6xl', spacing: 'comfortable' },
    {
        'primary-50': '#fdf3e3',
        'primary-100': '#fbe3c0',
        'primary-500': '#c8923c',
        'primary-600': '#a87828',
        'primary-700': '#8a621e',
        background: '#fffbf2',
        surface: '#fdf3e3',
        'text-primary': '#3f2d10',
        'text-muted': '#8a7955',
    },
);

const proHomeTools: TemplateConfig = tmpl(
    'pro-home-tools',
    'أدوات منزلية',
    'Pro Home Tools',
    'قالب احترافي لمتاجر الأدوات والعدد المنزلية',
    'home',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: false }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('offers', 'offers', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal' },
    {
        'primary-50': '#f5f5f4',
        'primary-100': '#e7e5e4',
        'primary-500': '#78716c',
        'primary-600': '#57534e',
        'primary-700': '#44403c',
        background: '#fafaf9',
        surface: '#f5f5f4',
        'text-primary': '#1c1917',
        'text-muted': '#78716c',
    },
);

const proKids: TemplateConfig = tmpl(
    'pro-kids',
    'أطفال',
    'Pro Kids',
    'قالب احترافي ملون لمتاجر الأطفال والألعاب',
    'kids',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'full', show_search: true, show_badge: true }),
        baseSection('categories', 'categories', 2, { style: 'cards', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('offers', 'offers', 4, {}),
        baseSection('banner', 'banner', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal' },
    {
        'primary-50': '#f0f9ff',
        'primary-100': '#e0f2fe',
        'primary-500': '#38bdf8',
        'primary-600': '#0ea5e9',
        'primary-700': '#0284c7',
        'secondary-500': '#f472b6',
        background: '#f8fafc',
        surface: '#ffffff',
        'text-primary': '#0f172a',
        'text-muted': '#64748b',
    },
);

const proSports: TemplateConfig = tmpl(
    'pro-sports',
    'رياضات',
    'Pro Sports',
    'قالب احترافي لمتاجر الأخبار والمنتجات الرياضية',
    'sport',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('categories', 'categories', 2, { style: 'horizontal_scroll', show_all: true }),
        baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
        baseSection('offers', 'offers', 4, {}),
        baseSection('footer', 'footer', 5, { show_newsletter: true }),
    ],
    { container: 'max-w-7xl', spacing: 'normal' },
    {
        'primary-50': '#eef2ff',
        'primary-100': '#e0e7ff',
        'primary-500': '#6366f1',
        'primary-600': '#4f46e5',
        'primary-700': '#4338ca',
        background: '#ffffff',
        surface: '#eef2ff',
        'text-primary': '#1e1b4b',
        'text-muted': '#6b7280',
    },
);

const proBoutique: TemplateConfig = tmpl(
    'pro-boutique',
    'بوتيك',
    'Pro Boutique',
    'قالب احترافي فاخر لمتاجر البوتيك والمجوهرات',
    'fashion',
    'professional',
    [
        baseSection('hero', 'hero', 1, { layout: 'fullscreen', show_search: true, video: true }),
        baseSection('products', 'products', 2, { layout: 'elegant_list', per_page: 12 }),
        baseSection('featured', 'featured', 3, {}),
        baseSection('banner', 'banner', 4, {}),
        baseSection('reviews', 'reviews', 5, {}),
        baseSection('footer', 'footer', 6, { show_newsletter: true }),
    ],
    { container: 'max-w-6xl', spacing: 'comfortable' },
    {
        'primary-50': '#f7f3e8',
        'primary-100': '#e9dfc2',
        'primary-500': '#b08d3f',
        'primary-600': '#97712c',
        'primary-700': '#7a5a20',
        background: '#fffdf6',
        surface: '#f7f3e8',
        'text-primary': '#3f2d10',
        'text-muted': '#8a7955',
    },
);

/* =====================================================================
 * Registry + enrichment (header, classes, vivid palette, columns)
 * ===================================================================== */

const VIVID_DEFAULT_COLORS: Record<string, string> = {
    'primary-50': '#ecfeff',
    'primary-100': '#cffafe',
    'primary-500': '#06b6d4',
    'primary-600': '#0891b2',
    'primary-700': '#0e7490',
    'secondary-500': '#f97316',
    background: '#ffffff',
    surface: '#f1f5f9',
    'text-primary': '#0f172a',
    'text-muted': '#475569',
};

const SECTION_CLASSES = {
    header: {
        header: 'sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm',
        headerDark: 'sticky top-0 z-40 w-full border-b border-white/10 bg-neutral-900/95 backdrop-blur-md shadow-sm',
    },
    hero: {
        section: 'relative w-full overflow-hidden',
        container: 'mx-auto px-4 py-12 sm:py-16',
        heading: 'text-3xl font-bold sm:text-5xl',
        subheading: 'text-lg sm:text-xl',
    },
    categories: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    products: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    offers: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    banner: {
        section: 'w-full py-8',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    banners: {
        section: 'w-full py-8',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    video: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
    footer: {
        section: 'w-full border-t border-gray-200',
        container: 'mx-auto px-4 py-12 sm:py-16',
    },
    default: {
        section: 'w-full py-10 sm:py-12',
        container: 'mx-auto px-4',
        heading: 'text-2xl font-bold sm:text-3xl',
    },
} as const;

const COLUMNS_BY_LAYOUT: Record<string, number> = {
    grid: 4,
    dense_grid: 6,
    masonry: 4,
    list: 1,
    elegant_list: 2,
    menu_list: 1,
    bulk_table: 1,
};

function withTemplateDefaults(template: TemplateConfig): TemplateConfig {
    const slug = template.slug;
    const dark = Boolean(template.layout?.dark_mode);
    const container = template.layout?.container || 'max-w-7xl';

    const colors = {
        ...VIVID_DEFAULT_COLORS,
        ...(template.design_tokens?.colors ?? {}),
    };

    const sections: TemplateSectionConfig[] = template.sections.map((s) => ({
        ...s,
        props: { ...s.props },
        classes: s.classes ? { ...s.classes } : undefined,
    }));

    const hasHeader = sections.some((s) => s.type === 'header');
    if (!hasHeader) {
        sections.unshift({
            id: 'header',
            type: 'header',
            enabled: true,
            order: 1,
            props: {
                sticky: true,
                show_search: true,
                show_cart: true,
                show_auth: true,
                show_whatsapp: true,
            },
            classes: {
                header: dark ? SECTION_CLASSES.header.headerDark : SECTION_CLASSES.header.header,
                container: `mx-auto flex h-16 items-center justify-between gap-3 px-4 ${container}`,
            },
        });
    }

    sections.forEach((s, i) => {
        s.order = i + 1;
        const base = (SECTION_CLASSES[s.type as keyof typeof SECTION_CLASSES] || SECTION_CLASSES.default) as Record<string, string>;
        if (!s.classes) {
            s.classes = {
                section: base.section,
                container: `${base.container} ${container}`,
                heading: base.heading,
            };
        } else {
            if (!s.classes.container) s.classes.container = `${base.container} ${container}`;
            if (!s.classes.section) s.classes.section = base.section;
        }
        if (s.type === 'products' && typeof s.props.columns !== 'number') {
            s.props.columns = COLUMNS_BY_LAYOUT[s.props.layout] || 4;
        }
    });

    return {
        ...template,
        sections,
        layout: {
            ...template.layout,
            container,
            columns: template.layout?.columns ?? (container === 'max-w-3xl' || container === 'max-w-5xl' || container === 'max-w-6xl' ? 2 : 4),
            spacing: template.layout?.spacing ?? 'normal',
        },
        design_tokens: {
            ...(template.design_tokens ?? {}),
            colors,
        },
    };
}

/* ---------------------------------------------------------------------
 * ENGINE THEMES - schema-driven niche layouts (theme.config.json).
 * These are rendered by the ThemeEngine (components/theme) instead of the
 * section renderer, but they are still registered so the slug resolves in
 * `getTemplateConfig` and appears in the template picker.
 * --------------------------------------------------------------------- */

const engineTmpl = (
    slug: string,
    name: string,
    name_en: string,
    description: string,
    primary: string,
): TemplateConfig =>
    tmpl(
        slug,
        name,
        name_en,
        description,
        'niche',
        'growth',
        [
            baseSection('hero', 'hero', 1, { layout: 'split', show_search: true }),
            baseSection('categories', 'categories', 2, { style: 'chips' }),
            baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
            baseSection('footer', 'footer', 4, {}),
        ],
        CORE_LAYOUT,
        {
            'primary-50': `${primary}14`,
            'primary-100': `${primary}2e`,
            'primary-500': primary,
            'primary-600': primary,
            'primary-700': primary,
            background: '#ffffff',
            surface: '#f9fafb',
            'text-primary': '#111827',
            'text-secondary': '#6b7280',
        },
        { advanced_components: ['theme-engine'] },
    );

const marketFastEngine: TemplateConfig = engineTmpl(
    'market-fast',
    'سوق سريع',
    'Market Fast',
    'سوبر ماركت وبقالة بسلّة سريعة وتوصيل فوري',
    '#16a34a',
);

const fashionLuxeEngine: TemplateConfig = engineTmpl(
    'fashion-luxe',
    'أزياء فاخرة',
    'Fashion Luxe',
    'أزياء وموضة بهيرو كامل وعربة جانبية أنيقة',
    '#e11d48',
);

const freshProduceEngine: TemplateConfig = engineTmpl(
    'fresh-produce',
    'خضار وفواكه طازجة',
    'Fresh Produce',
    'منتجات طازجة بآلة حساب الأوزان وحجز توقيت التوصيل',
    '#65a30d',
);

const rawTemplates: Record<string, TemplateConfig> = {
    'core-minimal': coreMinimal,
    'core-bold': coreBold,
    'core-sidebar': coreSidebar,
    'core-dark': coreDark,
    'core-bazaar': coreBazaar,
    'core-elegant': coreElegant,
    'core-showcase': coreShowcase,
    'growth-electronics': growthElectronics,
    'growth-fashion': growthFashion,
    'growth-food': growthFood,
    'growth-cosmetics': growthCosmetics,
    'growth-supermarket': growthSupermarket,
    'growth-home-decor': growthHomeDecor,
    'growth-pharmacy': growthPharmacy,
    'pro-tech': proTech,
    'pro-beauty': proBeauty,
    'pro-books': proBooks,
    'pro-sport': proSport,
    'pro-pets': proPets,
    'pro-flowers': proFlowers,
    'pro-coffee': proCoffee,
    'pro-stationery': proStationery,
    'pro-spices': proSpices,
    'pro-clothing': proClothing,
    'pro-fragrances': proFragrances,
    'pro-home-tools': proHomeTools,
    'pro-kids': proKids,
    'pro-sports': proSports,
    'pro-boutique': proBoutique,
    'market-fast': marketFastEngine,
    'fashion-luxe': fashionLuxeEngine,
    'fresh-produce': freshProduceEngine,
};

const templates: Record<string, TemplateConfig> = Object.fromEntries(
    Object.entries(rawTemplates).map(([slug, t]) => [slug, withTemplateDefaults(t)]),
);

export function getTemplateConfig(slug: string): TemplateConfig | null {
    return templates[slug] || null;
}

export function getAllTemplates(): TemplateConfig[] {
    return Object.values(templates);
}

export function getFreeTemplates(): TemplateConfig[] {
    return Object.values(templates).filter((t) => t.is_free);
}

export function getPaidTemplates(): TemplateConfig[] {
    return Object.values(templates).filter((t) => !t.is_free);
}

export function getTemplatesByCategory(): Record<string, TemplateConfig[]> {
    return Object.values(templates).reduce(
        (acc, template) => {
            if (!acc[template.category]) acc[template.category] = [];
            acc[template.category].push(template);
            return acc;
        },
        {} as Record<string, TemplateConfig[]>,
    );
}

export function getAccessibleTemplates(planTier: PlanTier = 'starter'): TemplateConfig[] {
    return Object.values(templates)
        .filter((t) => t.is_free || planTier === 'growth' || planTier === 'professional')
        .sort((a, b) => (a.is_free === b.is_free ? 0 : a.is_free ? -1 : 1));
}

export function getTemplateSummaries(planTier: PlanTier = 'starter'): TemplateSummary[] {
    return Object.values(templates)
        .sort((a, b) => (a.is_free === b.is_free ? a.slug.localeCompare(b.slug) : a.is_free ? -1 : 1))
        .map((t) => ({
            slug: t.slug,
            name: t.name,
            name_en: t.name_en,
            description: t.description,
            category: t.category,
            is_free: t.is_free,
            plan_required: t.plan_required,
            is_accessible: t.is_free || planTier === 'growth' || planTier === 'professional',
        }));
}