import type {
  TemplateConfig,
  TemplateSummary,
  PlanTier,
} from '@/templates/types';

/**
 * Template Registry
 * Static frontend definitions mirroring the backend templates table.
 * The backend is the source of truth; this registry provides
 * offline/fallback access and quick lookup for the UI.
 */

const baseSection = (
  id: string,
  type: TemplateConfig['sections'][number]['type'],
  order: number,
  props: Record<string, any> = {}
) => ({ id, type, enabled: true, order, props });

const templates: Record<string, TemplateConfig> = {
  // ===================== FREE TEMPLATES (7) =====================
  basic: {
    slug: 'basic',
    name: 'الأساس',
    name_en: 'Basic',
    description: 'تصميم بسيط (Minimalist) يناسب الاستخدام العام.',
    category: 'general',
    is_free: true,
    plan_required: 'starter',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'centered', show_search: true }),
      baseSection('categories', 'categories', 2, { style: 'tabs', show_all: true }),
      baseSection('products', 'products', 3, { layout: 'grid', per_page: 20 }),
      baseSection('footer', 'footer', 4, { show_newsletter: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'normal' },
    design_tokens: {
      colors: {
        'primary-500': '#10b77f',
        'primary-600': '#059669',
        'background': '#ffffff',
        'surface': '#f9fafb',
        'text-primary': '#111827',
        'text-muted': '#6b7280',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-12', container: 'px-4' },
    },
    advanced_components: [],
  },
  'single-product': {
    slug: 'single-product',
    name: 'المنتج الأوحد',
    name_en: 'Single Product',
    description: 'صفحة هبوط مصممة لبيع منتج واحد أو حزمة واحدة.',
    category: 'general',
    is_free: true,
    plan_required: 'starter',
    sections: [
      baseSection('product_hero', 'hero', 1, { layout: 'product_focus', show_cta: true, cta_text: 'اطلب الآن' }),
      baseSection('product_details', 'custom', 2, { component: 'ProductDetails' }),
      baseSection('reviews', 'reviews', 3),
      baseSection('footer', 'footer', 4, { show_newsletter: false }),
    ],
    layout: { container: 'max-w-5xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#2563eb',
        'primary-600': '#1d4ed8',
        'background': '#ffffff',
        'surface': '#f8fafc',
        'text-primary': '#0f172a',
        'text-muted': '#64748b',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '800' },
      spacing: { section: 'py-16', container: 'px-4' },
    },
    advanced_components: [],
  },
  fashion: {
    slug: 'fashion',
    name: 'الأزياء',
    name_en: 'Fashion',
    description: 'يركز على الصور الطولية وشبكة المنتجات الكثيفة لتصفح الملابس.',
    category: 'fashion',
    is_free: true,
    plan_required: 'starter',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'editorial', tall_images: true }),
      baseSection('categories', 'categories', 2, { style: 'cards', tall_images: true }),
      baseSection('products', 'products', 3, { layout: 'masonry', show_size_options: true, per_page: 30 }),
      baseSection('footer', 'footer', 4, { style: 'minimal' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#18181b',
        'primary-600': '#27272a',
        'background': '#ffffff',
        'surface': '#fafafa',
        'text-primary': '#18181b',
        'text-muted': '#71717a',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-14', container: 'px-4' },
    },
    advanced_components: [],
  },
  tech: {
    slug: 'tech',
    name: 'التقنية',
    name_en: 'Tech',
    description: 'يعرض المواصفات الفنية والمقارنات بوضوح للإلكترونيات.',
    category: 'electronics',
    is_free: true,
    plan_required: 'starter',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'spec_focused', show_search: true }),
      baseSection('specs', 'custom', 2, { component: 'SpecComparison' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_specs: true, per_page: 24 }),
      baseSection('footer', 'footer', 4, { show_newsletter: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#2563eb',
        'primary-600': '#1e40af',
        'background': '#f8fafc',
        'surface': '#ffffff',
        'text-primary': '#1e293b',
        'text-muted': '#64748b',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '800' },
      spacing: { section: 'py-12', container: 'px-4' },
    },
    advanced_components: [],
  },
  food: {
    slug: 'food',
    name: 'الوجبات',
    name_en: 'Food',
    description: 'يوفر أزرار طلب سريعة وتصنيفات علوية لتطبيقات المطاعم.',
    category: 'food',
    is_free: true,
    plan_required: 'starter',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'app_header', quick_order: true }),
      baseSection('categories', 'categories', 2, { style: 'horizontal_scroll' }),
      baseSection('products', 'products', 3, { layout: 'menu_list', quick_order: true, per_page: 50 }),
      baseSection('footer', 'footer', 4, { show_hours: true }),
    ],
    layout: { container: 'max-w-3xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#f97316',
        'primary-600': '#ea580c',
        'background': '#fff7ed',
        'surface': '#ffffff',
        'text-primary': '#431407',
        'text-muted': '#9a3412',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '900' },
      spacing: { section: 'py-10', container: 'px-4' },
    },
    advanced_components: [],
  },
  beauty: {
    slug: 'beauty',
    name: 'الجمال',
    name_en: 'Beauty',
    description: 'يعتمد مساحات بيضاء واسعة وألواناً هادئة لمستحضرات التجميل.',
    category: 'beauty',
    is_free: true,
    plan_required: 'starter',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'elegant', soft_palette: true }),
      baseSection('categories', 'categories', 2, { style: 'minimal_cards' }),
      baseSection('products', 'products', 3, { layout: 'grid', per_page: 24 }),
      baseSection('footer', 'footer', 4, { style: 'light' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#ec4899',
        'primary-600': '#db2777',
        'background': '#fffbf5',
        'surface': '#ffffff',
        'text-primary': '#4a044e',
        'text-muted': '#a21caf',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '500' },
      spacing: { section: 'py-16', container: 'px-6' },
    },
    advanced_components: [],
  },
  digital: {
    slug: 'digital',
    name: 'المنتجات الرقمية',
    name_en: 'Digital Products',
    description: 'يركز على وصف الخدمة، التقييمات، وآلية التحميل الفوري.',
    category: 'digital',
    is_free: true,
    plan_required: 'starter',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'product_focus', show_download: true }),
      baseSection('features', 'custom', 2, { component: 'FeatureList' }),
      baseSection('reviews', 'reviews', 3, { show_rating: true }),
      baseSection('delivery', 'custom', 4, { component: 'InstantDelivery' }),
      baseSection('footer', 'footer', 5, { show_newsletter: false }),
    ],
    layout: { container: 'max-w-5xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#8b5cf6',
        'primary-600': '#7c3aed',
        'background': '#ffffff',
        'surface': '#f5f3ff',
        'text-primary': '#1e1b4b',
        'text-muted': '#6d28d9',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-16', container: 'px-4' },
    },
    advanced_components: [],
  },

  // ===================== PAID TEMPLATES (22) =====================
  'luxury-jewelry': {
    slug: 'luxury-jewelry',
    name: 'مجوهرات فاخرة',
    name_en: 'Luxury Jewelry',
    description: 'تعتمد الوضع الليلي (Dark Mode) وخطوطاً كلاسيكية تبرز لمعان الصور.',
    category: 'luxury',
    is_free: false,
    plan_required: 'professional',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'fullscreen', parallax: true }),
      baseSection('collections', 'custom', 2, { component: 'LuxuryCollections' }),
      baseSection('products', 'products', 3, { layout: 'masonry', hover_effect: 'zoom', show_quick_view: true }),
      baseSection('craftsmanship', 'custom', 4, { component: 'CraftsmanshipStory' }),
      baseSection('footer', 'footer', 5, { style: 'dark_luxury' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable', dark_mode: true },
    design_tokens: {
      colors: {
        'primary-500': '#d4af37',
        'primary-600': '#b8962e',
        'background': '#0a0a0a',
        'surface': '#1a1a1a',
        'text-primary': '#f5f5f5',
        'text-muted': '#a0a0a0',
      },
      typography: { 'font-family': 'Playfair Display', 'font-family-body': 'Inter', 'heading-weight': '700' },
      spacing: { section: 'py-20', container: 'px-8' },
    },
    advanced_components: ['countdown_timer', 'interactive_popup', 'dynamic_shipping_bar'],
  },
  'luxury-watches': {
    slug: 'luxury-watches',
    name: 'ساعات فاخرة',
    name_en: 'Luxury Watches',
    description: 'وضع ليلي وخطوط كلاسيكية تركز على تفاصيل الساعات.',
    category: 'luxury',
    is_free: false,
    plan_required: 'professional',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'fullscreen', dark: true }),
      baseSection('brand_story', 'custom', 2, { component: 'BrandStory' }),
      baseSection('products', 'products', 3, { layout: 'elegant_list', show_zoom: true }),
      baseSection('footer', 'footer', 4, { style: 'dark_luxury' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable', dark_mode: true },
    design_tokens: {
      colors: {
        'primary-500': '#c0c0c0',
        'primary-600': '#a3a3a3',
        'background': '#0f0f0f',
        'surface': '#1c1c1c',
        'text-primary': '#ffffff',
        'text-muted': '#9ca3af',
      },
      typography: { 'font-family': 'Cormorant Garamond', 'font-family-body': 'Inter', 'heading-weight': '600' },
      spacing: { section: 'py-20', container: 'px-8' },
    },
    advanced_components: ['countdown_timer', 'interactive_popup'],
  },
  'b2b-wholesale': {
    slug: 'b2b-wholesale',
    name: 'جملة B2B',
    name_en: 'B2B Wholesale',
    description: 'تعرض المنتجات على شكل قوائم متوازية مع حقول لإدخال كميات الشراء المتعددة بنقرة واحدة.',
    category: 'b2b',
    is_free: false,
    plan_required: 'professional',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'b2b_banner', show_quote_cta: true }),
      baseSection('categories', 'categories', 2, { style: 'b2b_list' }),
      baseSection('products', 'products', 3, { layout: 'bulk_table', show_quantity_input: true, bulk_order: true }),
      baseSection('footer', 'footer', 4, { show_business_info: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#0f766e',
        'primary-600': '#115e59',
        'background': '#f0fdfa',
        'surface': '#ffffff',
        'text-primary': '#134e4a',
        'text-muted': '#64748b',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-10', container: 'px-4' },
    },
    advanced_components: ['bulk_order_form', 'dynamic_shipping_bar', 'quantity_picker'],
  },
  furniture: {
    slug: 'furniture',
    name: 'أثاث وديكور',
    name_en: 'Furniture & Decor',
    description: 'تدعم اللافتات البانورامية الكبيرة وتبرز خيارات الألوان والمقاسات بوضوح.',
    category: 'home',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'panorama', show_collection_link: true }),
      baseSection('rooms', 'custom', 2, { component: 'RoomCategories' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_color_options: true, show_size_options: true }),
      baseSection('footer', 'footer', 4, { style: 'warm' }),
    ],
    layout: { container: 'max-w-full', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#92400e',
        'primary-600': '#78350f',
        'background': '#fdf6f0',
        'surface': '#ffffff',
        'text-primary': '#3b2413',
        'text-muted': '#8b5e34',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-16', container: 'px-6' },
    },
    advanced_components: ['interactive_popup', 'dynamic_shipping_bar'],
  },
  'auto-parts': {
    slug: 'auto-parts',
    name: 'قطع غيار ومعدات',
    name_en: 'Auto Parts',
    description: 'توفر محرك بحث متقدم وفلاتر دقيقة (حسب الموديل، السنة، النوع) كعنصر أساسي في الترويسة.',
    category: 'automotive',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'search_first', show_advanced_search: true }),
      baseSection('filters', 'custom', 2, { component: 'VehicleFilter', filters: ['model', 'year', 'type'] }),
      baseSection('products', 'products', 3, { layout: 'list', show_compatibility: true }),
      baseSection('footer', 'footer', 4, { show_contact: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#1d4ed8',
        'primary-600': '#1e40af',
        'background': '#f8fafc',
        'surface': '#ffffff',
        'text-primary': '#1e293b',
        'text-muted': '#64748b',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-10', container: 'px-4' },
    },
    advanced_components: ['vehicle_search', 'interactive_popup'],
  },
  sports: {
    slug: 'sports',
    name: 'رياضة ومكملات',
    name_en: 'Sports & Supplements',
    description: 'تستخدم خطوطاً عريضة، حواف حادة، وألواناً حيوية تعكس الطاقة.',
    category: 'sports',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'energetic', bold: true }),
      baseSection('categories', 'categories', 2, { style: 'bold_cards' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_badge: true }),
      baseSection('footer', 'footer', 4, { style: 'bold' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#dc2626',
        'primary-600': '#b91c1c',
        'secondary-500': '#facc15',
        'background': '#ffffff',
        'surface': '#fef2f2',
        'text-primary': '#1a1a1a',
        'text-muted': '#6b7280',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '900' },
      spacing: { section: 'py-12', container: 'px-4' },
      borders: { radius: '0', sharp: true },
    },
    advanced_components: ['countdown_timer', 'dynamic_shipping_bar'],
  },
  kids: {
    slug: 'kids',
    name: 'أطفال وألعاب',
    name_en: 'Kids & Toys',
    description: 'توظف ألواناً مرحة، أطرافاً دائرية، وأيقونات كرتونية لتصنيف الأقسام.',
    category: 'kids',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'playful', bubbles: true }),
      baseSection('categories', 'categories', 2, { style: 'cartoon_icons' }),
      baseSection('products', 'products', 3, { layout: 'grid', rounded_cards: true }),
      baseSection('footer', 'footer', 4, { style: 'colorful' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#f59e0b',
        'primary-600': '#d97706',
        'secondary-500': '#3b82f6',
        'background': '#fffbeb',
        'surface': '#ffffff',
        'text-primary': '#451a03',
        'text-muted': '#b45309',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '800' },
      spacing: { section: 'py-14', container: 'px-4' },
      borders: { radius: '1.5rem', rounded: true },
    },
    advanced_components: ['interactive_popup'],
  },
  supermarket: {
    slug: 'supermarket',
    name: 'سوبرماركت',
    name_en: 'Supermarket',
    description: 'توفر قائمة تصنيفات جانبية ثابتة (Sidebar) لتسهيل التنقل بين آلاف المنتجات بسرعة.',
    category: 'grocery',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('sidebar', 'custom', 1, { component: 'FixedSidebar', sticky: true }),
      baseSection('hero', 'hero', 2, { layout: 'compact_banner' }),
      baseSection('products', 'products', 3, { layout: 'dense_grid', show_stock: true, per_page: 60 }),
      baseSection('footer', 'footer', 4, { show_stores: true }),
    ],
    layout: { container: 'max-w-[1600px]', spacing: 'compact', sidebar: true },
    design_tokens: {
      colors: {
        'primary-500': '#16a34a',
        'primary-600': '#15803d',
        'background': '#f0fdf4',
        'surface': '#ffffff',
        'text-primary': '#052e16',
        'text-muted': '#4d7c0f',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-8', container: 'px-3' },
    },
    advanced_components: ['dynamic_shipping_bar', 'countdown_timer'],
  },
  handcrafted: {
    slug: 'handcrafted',
    name: 'حرف يدوية',
    name_en: 'Handcrafted',
    description: 'تركز على مساحات نصية لسرد قصة الصانع وفيديو تعريفي في الصفحة الرئيسية.',
    category: 'handmade',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'story_focus', show_video: true }),
      baseSection('story', 'custom', 2, { component: 'MakerStory', video: true }),
      baseSection('products', 'products', 3, { layout: 'grid', show_maker_note: true }),
      baseSection('footer', 'footer', 4, { show_about: true }),
    ],
    layout: { container: 'max-w-6xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#78716c',
        'primary-600': '#57534e',
        'background': '#fafaf9',
        'surface': '#ffffff',
        'text-primary': '#1c1917',
        'text-muted': '#78716c',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '500' },
      spacing: { section: 'py-16', container: 'px-6' },
    },
    advanced_components: ['video_story'],
  },
  perfumes: {
    slug: 'perfumes',
    name: 'عطور',
    name_en: 'Perfumes',
    description: 'توظف حركات تمرير ناعمة (Smooth Scrolling) وتأثيرات بصرية تركز على زجاجة العطر.',
    category: 'perfume',
    is_free: false,
    plan_required: 'professional',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'fullscreen', smooth_scroll: true }),
      baseSection('collections', 'custom', 2, { component: 'FragranceCollections' }),
      baseSection('products', 'products', 3, { layout: 'bottle_focus', show_notes: true }),
      baseSection('footer', 'footer', 4, { style: 'elegant_dark' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable', dark_mode: true },
    design_tokens: {
      colors: {
        'primary-500': '#c2410c',
        'primary-600': '#9a3412',
        'background': '#1c0a02',
        'surface': '#2a1206',
        'text-primary': '#fef3c7',
        'text-muted': '#b45309',
      },
      typography: { 'font-family': 'Tajawal', 'font-family-heading': 'Cormorant Garamond', 'heading-weight': '500' },
      spacing: { section: 'py-20', container: 'px-8' },
    },
    advanced_components: ['countdown_timer', 'interactive_popup', 'smooth_scroll'],
  },
  'electronics-pro': {
    slug: 'electronics-pro',
    name: 'إلكترونيات احترافية',
    name_en: 'Pro Electronics',
    description: 'مقارنات تفصيلية وجداول مواصفات متقدمة للمنتجات الإلكترونية.',
    category: 'electronics',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'comparison_ready' }),
      baseSection('comparison', 'custom', 2, { component: 'AdvancedComparison' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_specs: true }),
      baseSection('footer', 'footer', 4, { show_support: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact', dark_mode: true },
    design_tokens: {
      colors: {
        'primary-500': '#06b6d4',
        'primary-600': '#0891b2',
        'background': '#0f172a',
        'surface': '#1e293b',
        'text-primary': '#f8fafc',
        'text-muted': '#94a3b8',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '800' },
      spacing: { section: 'py-12', container: 'px-4' },
    },
    advanced_components: ['comparison_table', 'countdown_timer'],
  },
  pharmacy: {
    slug: 'pharmacy',
    name: 'صيدلية',
    name_en: 'Pharmacy',
    description: 'تصميم صحي نظيف يعزز الثقة ويركز على المعلومات الدوائية.',
    category: 'health',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'trust_focused' }),
      baseSection('categories', 'categories', 2, { style: 'medical_cards' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_prescription_info: true }),
      baseSection('footer', 'footer', 4, { show_pharmacy_info: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#0d9488',
        'primary-600': '#0f766e',
        'background': '#f0fdfa',
        'surface': '#ffffff',
        'text-primary': '#134e4a',
        'text-muted': '#5eead4',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '600' },
      spacing: { section: 'py-12', container: 'px-4' },
    },
    advanced_components: [],
  },
  'pet-store': {
    slug: 'pet-store',
    name: 'مستلزمات حيوانات',
    name_en: 'Pet Store',
    description: 'تصميم ودود دافئ لمستلزمات الحيوانات الأليفة.',
    category: 'pets',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'friendly' }),
      baseSection('categories', 'categories', 2, { style: 'pet_cards' }),
      baseSection('products', 'products', 3, { layout: 'grid' }),
      baseSection('footer', 'footer', 4, { style: 'warm' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#d97706',
        'primary-600': '#b45309',
        'background': '#fffbeb',
        'surface': '#ffffff',
        'text-primary': '#451a03',
        'text-muted': '#a16207',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-14', container: 'px-4' },
    },
    advanced_components: [],
  },
  books: {
    slug: 'books',
    name: 'مكتبة وكتب',
    name_en: 'Bookstore',
    description: 'تصميم هادئ راقٍ لعرض الكتب والقراءات.',
    category: 'books',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'literary' }),
      baseSection('featured', 'custom', 2, { component: 'FeaturedBooks' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_author: true }),
      baseSection('footer', 'footer', 4, { style: 'elegant' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#7c2d12',
        'primary-600': '#5c1a03',
        'background': '#fdf6ec',
        'surface': '#ffffff',
        'text-primary': '#292524',
        'text-muted': '#8b5e34',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-16', container: 'px-6' },
    },
    advanced_components: [],
  },
  'flowers-gifts': {
    slug: 'flowers-gifts',
    name: 'زهور وهدايا',
    name_en: 'Flowers & Gifts',
    description: 'تصميم رومانسي ناعم لبيع الزهور والهدايا مع مواعيد التوصيل.',
    category: 'flowers',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'romantic' }),
      baseSection('occasions', 'custom', 2, { component: 'OccasionCategories' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_delivery_date: true }),
      baseSection('footer', 'footer', 4, { show_delivery_info: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#e11d48',
        'primary-600': '#be123c',
        'background': '#fff1f2',
        'surface': '#ffffff',
        'text-primary': '#4c0519',
        'text-muted': '#be185d',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '600' },
      spacing: { section: 'py-14', container: 'px-4' },
    },
    advanced_components: ['delivery_date_picker'],
  },
  'grocery-delivery': {
    slug: 'grocery-delivery',
    name: 'توصيل مواد غذائية',
    name_en: 'Grocery Delivery',
    description: 'مصمم لخدمات التوصيل السريع للمواد الغذائية مع مؤقت التوصيل.',
    category: 'grocery',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'delivery_focused', show_eta: true }),
      baseSection('categories', 'categories', 2, { style: 'quick_pick' }),
      baseSection('products', 'products', 3, { layout: 'dense_grid', show_eta: true }),
      baseSection('footer', 'footer', 4, { show_zones: true }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#22c55e',
        'primary-600': '#16a34a',
        'background': '#f0fdf4',
        'surface': '#ffffff',
        'text-primary': '#052e16',
        'text-muted': '#4d7c0f',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '800' },
      spacing: { section: 'py-8', container: 'px-3' },
    },
    advanced_components: ['countdown_timer', 'dynamic_shipping_bar', 'delivery_tracking'],
  },
  'coffee-shop': {
    slug: 'coffee-shop',
    name: 'مقهى',
    name_en: 'Coffee Shop',
    description: 'تصميم دافئ لمقاهي القهوة مع قائمة المشروبات المميزة.',
    category: 'food',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'warm_coffee' }),
      baseSection('menu', 'custom', 2, { component: 'CoffeeMenu' }),
      baseSection('products', 'products', 3, { layout: 'menu_list', quick_order: true }),
      baseSection('footer', 'footer', 4, { show_locations: true }),
    ],
    layout: { container: 'max-w-5xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#78350f',
        'primary-600': '#5c2a06',
        'background': '#fef6e4',
        'surface': '#ffffff',
        'text-primary': '#3b2413',
        'text-muted': '#8b5e34',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-14', container: 'px-4' },
    },
    advanced_components: [],
  },
  'home-tools': {
    slug: 'home-tools',
    name: 'أدوات منزلية',
    name_en: 'Home Tools',
    description: 'تصميم عملي واضح للأدوات المنزلية والعدد.',
    category: 'home',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'practical' }),
      baseSection('categories', 'categories', 2, { style: 'tool_cards' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_sku: true }),
      baseSection('footer', 'footer', 4, { style: 'plain' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'compact' },
    design_tokens: {
      colors: {
        'primary-500': '#4b5563',
        'primary-600': '#374151',
        'background': '#f9fafb',
        'surface': '#ffffff',
        'text-primary': '#111827',
        'text-muted': '#6b7280',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-10', container: 'px-4' },
    },
    advanced_components: [],
  },
  stationery: {
    slug: 'stationery',
    name: 'قرطاسية',
    name_en: 'Stationery',
    description: 'تصميم نظيف مشرق للقرطاسية واللوازم المدرسية.',
    category: 'general',
    is_free: false,
    plan_required: 'growth',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'bright' }),
      baseSection('categories', 'categories', 2, { style: 'colorful_cards' }),
      baseSection('products', 'products', 3, { layout: 'grid' }),
      baseSection('footer', 'footer', 4, { style: 'bright' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#6366f1',
        'primary-600': '#4f46e5',
        'background': '#f5f7ff',
        'surface': '#ffffff',
        'text-primary': '#1e1b4b',
        'text-muted': '#6366f1',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '800' },
      spacing: { section: 'py-12', container: 'px-4' },
    },
    advanced_components: [],
  },
  'fashion-premium': {
    slug: 'fashion-premium',
    name: 'أزياء فاخرة',
    name_en: 'Premium Fashion',
    description: 'نسخة فاخرة من قالب الأزياء مع حركات انتقال سينمائية.',
    category: 'fashion',
    is_free: false,
    plan_required: 'professional',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'cinematic', video_bg: true }),
      baseSection('runway', 'custom', 2, { component: 'RunwayShowcase' }),
      baseSection('products', 'products', 3, { layout: 'masonry', show_size_options: true }),
      baseSection('footer', 'footer', 4, { style: 'dark_elegant' }),
    ],
    layout: { container: 'max-w-[1600px]', spacing: 'comfortable', dark_mode: true },
    design_tokens: {
      colors: {
        'primary-500': '#e5e5e5',
        'primary-600': '#a3a3a3',
        'background': '#0a0a0a',
        'surface': '#171717',
        'text-primary': '#fafafa',
        'text-muted': '#737373',
      },
      typography: { 'font-family': 'Cormorant Garamond', 'font-family-body': 'Inter', 'heading-weight': '500' },
      spacing: { section: 'py-20', container: 'px-8' },
    },
    advanced_components: ['video_story', 'countdown_timer', 'interactive_popup'],
  },
  'beauty-premium': {
    slug: 'beauty-premium',
    name: 'تجميل فاخر',
    name_en: 'Premium Beauty',
    description: 'تجربة تجميل متكاملة مع فيديوهات موديلات ومعاينات تفاعلية.',
    category: 'beauty',
    is_free: false,
    plan_required: 'professional',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'editorial_full' }),
      baseSection('routines', 'custom', 2, { component: 'BeautyRoutines' }),
      baseSection('products', 'products', 3, { layout: 'grid', show_ingredients: true }),
      baseSection('footer', 'footer', 4, { style: 'soft_dark' }),
    ],
    layout: { container: 'max-w-7xl', spacing: 'comfortable' },
    design_tokens: {
      colors: {
        'primary-500': '#f472b6',
        'primary-600': '#db2777',
        'background': '#fdf2f8',
        'surface': '#ffffff',
        'text-primary': '#500724',
        'text-muted': '#be185d',
      },
      typography: { 'font-family': 'Tajawal', 'heading-weight': '500' },
      spacing: { section: 'py-16', container: 'px-6' },
    },
    advanced_components: ['interactive_popup', 'dynamic_shipping_bar'],
  },
  'food-premium': {
    slug: 'food-premium',
    name: 'مطعم فاخر',
    name_en: 'Premium Restaurant',
    description: 'تجربة مطاعم فاخرة مع حجوزات الطاولات والمنيو الرقمي.',
    category: 'food',
    is_free: false,
    plan_required: 'professional',
    sections: [
      baseSection('hero', 'hero', 1, { layout: 'restaurant_full', video_bg: true }),
      baseSection('reservations', 'custom', 2, { component: 'TableReservations' }),
      baseSection('products', 'products', 3, { layout: 'menu_list', show_chef_note: true }),
      baseSection('footer', 'footer', 4, { show_hours: true, show_locations: true }),
    ],
    layout: { container: 'max-w-6xl', spacing: 'comfortable', dark_mode: true },
    design_tokens: {
      colors: {
        'primary-500': '#c19a6b',
        'primary-600': '#a47c3f',
        'background': '#0c0a09',
        'surface': '#1c1917',
        'text-primary': '#fafaf9',
        'text-muted': '#a8a29e',
      },
      typography: { 'font-family': 'Playfair Display', 'font-family-body': 'Tajawal', 'heading-weight': '700' },
      spacing: { section: 'py-18', container: 'px-6' },
    },
    advanced_components: ['table_reservations', 'countdown_timer', 'interactive_popup'],
  },
};

/**
 * Get a template config by slug.
 */
export function getTemplateConfig(slug: string): TemplateConfig | null {
  return templates[slug] || null;
}

/**
 * Get all template configs.
 */
export function getAllTemplates(): TemplateConfig[] {
  return Object.values(templates);
}

/**
 * Get free template configs.
 */
export function getFreeTemplates(): TemplateConfig[] {
  return Object.values(templates).filter((t) => t.is_free);
}

/**
 * Get paid template configs.
 */
export function getPaidTemplates(): TemplateConfig[] {
  return Object.values(templates).filter((t) => !t.is_free);
}

/**
 * Get templates grouped by category.
 */
export function getTemplatesByCategory(): Record<string, TemplateConfig[]> {
  return Object.values(templates).reduce((acc, template) => {
    if (!acc[template.category]) {
      acc[template.category] = [];
    }
    acc[template.category].push(template);
    return acc;
  }, {} as Record<string, TemplateConfig[]>);
}

/**
 * Get templates accessible for a given plan tier.
 */
export function getAccessibleTemplates(planTier: PlanTier = 'starter'): TemplateConfig[] {
  return Object.values(templates)
    .filter((t) => t.is_free || (planTier === 'growth' || planTier === 'professional'))
    .sort((a, b) => Number(a.is_free) - Number(b.is_free));
}

/**
 * Get template summaries for listing UI.
 */
export function getTemplateSummaries(
  planTier: PlanTier = 'starter'
): TemplateSummary[] {
  return Object.values(templates)
    .sort((a, b) => a.category.localeCompare(b.category) || Number(a.is_free) - Number(b.is_free))
    .map((t) => ({
      slug: t.slug,
      name: t.name,
      name_en: t.name_en,
      description: t.description,
      category: t.category,
      is_free: t.is_free,
      plan_required: t.plan_required,
      is_accessible: t.is_free || (planTier === 'growth' || planTier === 'professional'),
    }));
}