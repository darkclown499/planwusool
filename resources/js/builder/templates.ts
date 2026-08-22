import type {
  BuilderDesignTokens,
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
  cosmetics: '/images/store/cosmetics.jpg',
  perfume: '/images/store/perfume.jpg',
  kidsToys: '/images/store/kids-toys.jpg',
  kidsClothes: '/images/store/kids-clothes.jpg',
  restaurantDish: '/images/store/restaurant-dish.jpg',
  grills: '/images/store/grills.jpg',
  fastFood: '/images/store/fast-food.jpg',
  electronics: '/images/store/electronics.jpg',
  hypermarket: '/images/store/hypermarket.jpg',
};

const s = (type: BuilderSectionType, order: number, props: Record<string, any> = {}, enabled = true): BuilderSectionConfig => ({
  id: type,
  type,
  enabled,
  order,
  props: { ...sectionDefaults(type), ...(props || {}) },
});

/* Arabic font stacks — limited to families actually loaded via bunny.net */
const FONT_TAJAWAL = "'Tajawal', 'Cairo', ui-sans-serif, system-ui, sans-serif";
const FONT_CAIRO = "'Cairo', 'Tajawal', ui-sans-serif, system-ui, sans-serif";
const FONT_PLEX = "'IBM Plex Sans Arabic', 'Tajawal', ui-sans-serif, system-ui, sans-serif";

const tokens = (
  colors: Record<string, string>,
  radius = '1rem',
  font: string = FONT_TAJAWAL,
): BuilderDesignTokens => ({
  colors: {
    primary_foreground: '#ffffff',
    ...colors,
  },
  typography: {
    body_font: font,
    heading_font: font,
    base_size: '16px',
  },
  radius,
});

/* ===================================================================== */
/* Template Catalog — 14 batteries-included Arabic storefront templates.  */
/* Each template = identity tokens + its own section chain, rebuilt from  */
/* the visual DNA of a proven WordPress/WooCommerce theme and localized   */
/* for Arabic RTL + WhatsApp ordering. All are free for every plan.       */
/* ===================================================================== */

/* ---------------------------------------------------------------- 1 */
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
  tokens: tokens({
    primary: '#0f8a5f',
    secondary: '#b45309',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f6faf7',
    text_primary: '#14201a',
    text_secondary: '#52645a',
    border: '#e3ece6',
  }),
  is_default: true,
  preview: 'linear-gradient(135deg,#f6faf7,#e3efe7)',
};

/* ---------------------------------------------------------------- 2 */
const FRESH_BAKERS: BuilderTemplateConfig = {
  slug: 'fresh-bakers',
  name: 'المخبز الطازج',
  name_en: 'Fresh Bakers',
  description: 'قالب مخبز وحلويات بهوية دافئة كريمية: خبز ومعجنات تُعرض ببطاقات شهية، آراء عملاء وقسم اشتراك بنشرة.',
  category: 'مخبوزات',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'classic', show_nav: false }),
    s('hero', 2, {
      hero_variant: 'split_banner',
      badge: 'طازج من الفرن كل صباح',
      title: 'خبز ومعجنات تصنع الفرق',
      subtitle: 'مكونات طبيعية 100% وأيدي خبّاز محترفة — اطلب الآن عبر واتساب واستلم طلبك ساخناً.',
      image: STORE_MEDIA.bakery,
      button_text: 'اطلب طلبك الآن',
      button_link: '#template-categories',
    }),
    s('categories', 3, {
      category_variant: 'circle_pills',
      columns: 6,
      section_title: 'من مخبزنا',
      show_all: false,
    }),
    s('products_by_category', 4, { per_category: 4, columns: 4, show_view_all: true }),
    s('features', 5, {
      section_title: 'لماذا يثق بنا الآلاف؟',
      items: [
        { title: 'تخبيز يومي', text: 'نخبز على مدار اليوم ليصلك الطازج دائماً.', icon: 'clock' },
        { title: 'مكونات طبيعية', text: 'بدون مواد حافظة أو ألوان صناعية إطلاقاً.', icon: 'shield' },
        { title: 'توصيل سريع', text: 'نوصل طلبك ساخناً إلى باب منزلك.', icon: 'truck' },
        { title: 'طلبات المناسبات', text: 'كيك وتورتات مخصصة لمناسباتك الخاصة.', icon: 'gift' },
      ],
    }),
    s('reviews', 6, {
      section_title: 'آراء زبائن المخبز',
      display_mode: 'grid',
      items: [
        { name: 'أم عبدالله', rating: 5, text: 'أفضل خبز عربي جرّبته! يصل ساخناً وطرياً كل يوم.' },
        { name: 'فهد العتيبي', rating: 5, text: 'الكنافة والمعجنات مستوى آخر. الطلب عبر واتساب سهل جداً.' },
        { name: 'سارة م.', rating: 4, text: 'كيك المناسبة كان رائعاً والتغليف أنيق جداً.' },
      ],
    }),
    s('newsletter', 7, { section_title: 'اشترك لتصلك عروض اليوم الأول' }),
    s('footer', 8),
  ],
  tokens: tokens({
    primary: '#c2410c',
    secondary: '#92400e',
    accent: '#f59e0b',
    background: '#fffaf2',
    surface: '#fdf3e7',
    text_primary: '#402a16',
    text_secondary: '#8a6a4f',
    border: '#f0e0cb',
  }, '1.25rem', FONT_CAIRO),
  preview: 'linear-gradient(135deg,#fdf3e7,#f3d9b8)',
};

/* ---------------------------------------------------------------- 3 */
const GROCERY_SHOPPING: BuilderTemplateConfig = {
  slug: 'grocery-shopping',
  name: 'بقالتك',
  name_en: 'Grocery Shopping',
  description: 'قالب بقالة وخضار وفواكه بأخضر طازج: شبكة أيقونات للأقسام ومنتجات مجمّعة مع شريط إعلانات للتوصيل المجاني.',
  category: 'بقالة',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '🚚 توصيل مجاني للطلبات فوق 100 ريال داخل المدينة' }),
    s('header', 2, { show_nav: false }),
    s('hero', 3, {
      hero_variant: 'split_banner',
      badge: 'طازج كل يوم',
      title: 'بقالتك الكاملة تصل حتى بابك',
      subtitle: 'خضار وفواكه ومواد غذائية بأسعار الجملة — اطلب عبر واتساب خلال دقيقة.',
      image: STORE_MEDIA.grocery,
      button_text: 'اطلب بقالتك',
      button_link: '#template-categories',
    }),
    s('categories', 4, {
      category_variant: 'icon_grid',
      columns: 6,
      section_title: 'أقسام البقالة',
      show_all: true,
    }),
    s('products_by_category', 5, { per_category: 4, columns: 4, show_view_all: true }),
    s('features', 6, {
      section_title: 'خدمة تستحق الثقة',
      items: [
        { title: 'توصيل في نفس اليوم', text: 'اطلب قبل الساعة 6 مساءً ويصلك طلبك اليوم.', icon: 'truck' },
        { title: 'انتقاء يدوي', text: 'نختار الخضار والفواكه طازجة بعناية.', icon: 'badge_check' },
        { title: 'أسعار الجملة', text: 'أوفر لك أفضل سعر يومياً على السلع الأساسية.', icon: 'wallet' },
        { title: 'دعم فوري', text: 'فريق خدمة العملاء يرد عليك عبر واتساب فوراً.', icon: 'support' },
      ],
    }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#15803d',
    secondary: '#065f46',
    accent: '#84cc16',
    background: '#ffffff',
    surface: '#f2faf3',
    text_primary: '#12271a',
    text_secondary: '#4d6a58',
    border: '#dcefe0',
  }),
  preview: 'linear-gradient(135deg,#f2faf3,#c8ecd0)',
};

/* ---------------------------------------------------------------- 4 */
const SUPER_MART_STORE: BuilderTemplateConfig = {
  slug: 'super-mart-store',
  name: 'سوبر مارت',
  name_en: 'Super Mart Store',
  description: 'قالب سوبرماركت بالأحمر والأبيض: هيرو سلايدر عريض للعروض، بطاقات أقسام كبيرة وشريط بانرات ترويجي.',
  category: 'سوبرماركت',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '🔥 عروض الأسبوع بأسعار الجملة — الكمية محدودة!' }),
    s('header', 2, { show_nav: false }),
    s('hero', 3, {
      hero_variant: 'slider_full',
      title: 'سوبر مارت — كل احتياجات منزلك',
      subtitle: 'تشكيلة واسعة من المواد الغذائية والمنزلية بأفضل الأسعار.',
      image: STORE_MEDIA.hypermarket,
      button_text: 'تسوّق العروض',
      button_link: '#template-categories',
      slides: [
        { title: 'خضار وفواكه طازجة يومياً', subtitle: 'من المزرعة إلى مطبخك مباشرة', image: STORE_MEDIA.vegetables, button_text: 'اطلب الآن', button_link: '#template-categories' },
        { title: 'جملة المواد الغذائية', subtitle: 'وفّر أكثر عند شراء كميات أكبر', image: STORE_MEDIA.grocery, button_text: 'تصفح الأقسام', button_link: '#template-categories' },
      ],
    }),
    s('categories', 4, {
      category_variant: 'grid_cards',
      columns: 5,
      section_title: 'الأقسام الرئيسية',
      show_all: false,
    }),
    s('products_by_category', 5, { per_category: 4, columns: 4, show_view_all: true }),
    s('banners', 6, {
      variant: 'carousel',
      slides: [
        { title: 'خصومات نهاية الأسبوع', subtitle: 'حتى 40% على المواد الغذائية', image: STORE_MEDIA.fruits, button_text: 'اغتنم العرض', button_link: '#template-products' },
        { title: 'سلة الإفطار الكاملة', subtitle: 'كل ما تحتاجه بسلة واحدة موفرة', image: STORE_MEDIA.dairy, button_text: 'اطلب السلة', button_link: '#template-products' },
      ],
    }),
    s('features', 7),
    s('footer', 8),
  ],
  tokens: tokens({
    primary: '#dc2626',
    secondary: '#991b1b',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#faf6f5',
    text_primary: '#231415',
    text_secondary: '#6b5254',
    border: '#f3dedd',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#faf6f5,#f5cfcb)',
};

/* ---------------------------------------------------------------- 5 */
const MEGA_STORE_WOOCOMMERCE: BuilderTemplateConfig = {
  slug: 'mega-store-woocommerce',
  name: 'هايبر مارت',
  name_en: 'Hyper Mart',
  description: 'قالب متجر شامل بالأصفر والأسود: هيرو bento متعدد الصور، تبويبات منتجات وأسئلة شائعة — مثالي للمتاجر الكبيرة.',
  category: 'متجر شامل',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { show_nav: true }),
    s('hero', 2, {
      hero_variant: 'bento_grid',
      badge: 'هايبر مارت',
      title: 'كل شيء تحت سقف واحد',
      subtitle: 'إلكترونيات وأزياء ومنزل وبقالة — عروض يومية لا تفوتك.',
      image: STORE_MEDIA.hypermarket,
      button_text: 'ابدأ التسوق',
      button_link: '#template-categories',
      side_title_1: 'أحدث الأجهزة',
      side_subtitle_1: 'إلكترونيات بأفضل الأسعار',
      side_image_1: STORE_MEDIA.electronics,
      side_title_2: 'أزياء العائلة',
      side_subtitle_2: 'تشكيلات جديدة أسبوعياً',
      side_image_2: STORE_MEDIA.clothes,
    }),
    s('categories', 3, {
      category_variant: 'card_pills',
      columns: 5,
      section_title: 'تسوق حسب القسم',
      show_all: true,
    }),
    s('products_by_category', 4, { per_category: 4, columns: 4, show_view_all: true }),
    s('features', 5, {
      items: [
        { title: 'شحن لجميع المدن', text: 'شبكة توصيل تغطي كافة المناطق.', icon: 'truck' },
        { title: 'دفع آمن', text: 'خيارات دفع متعددة ومحمية بالكامل.', icon: 'card' },
        { title: 'إرجاع مجاني', text: 'استرجاع خلال 14 يوماً دون أسئلة.', icon: 'refresh' },
        { title: 'عروض يومية', text: 'صفقات جديدة كل يوم على تشكيلة واسعة.', icon: 'zap' },
      ],
    }),
    s('faq', 6, { section_title: 'أسئلة يتكرر طرحها' }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#d97706',
    secondary: '#111827',
    accent: '#ffd146',
    background: '#ffffff',
    surface: '#fffaeb',
    text_primary: '#1f1a10',
    text_secondary: '#6b6046',
    border: '#f3e5bd',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#fffaeb,#ffe9a8)',
};

/* ---------------------------------------------------------------- 6 */
const ECOMMERCE_MEGA_STORE: BuilderTemplateConfig = {
  slug: 'ecommerce-mega-store',
  name: 'ميغا ستور',
  name_en: 'Mega Store',
  description: 'قالب عروض وتخفيضات بالبرتقالي الناري: شريط إعلانات صارخ، صف أفقي للأكثر مبيعاً وبانر عرض بارز.',
  category: 'عروض كبيرة',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '⚡ تخفيضات كبرى — خصومات تصل إلى 50% لفترة محدودة' }),
    s('header', 2, { show_nav: false }),
    s('hero', 3, {
      hero_variant: 'split_banner',
      badge: 'عروض لا تتكرر',
      title: 'ميغا ستور — وفّر أكثر',
      subtitle: 'أجهزة وأزياء ومنتجات مختارة بأقل الأسعار مع ضمان الاسترجاع.',
      image: STORE_MEDIA.electronics,
      button_text: 'تسوّق التخفيضات',
      button_link: '#template-products',
    }),
    s('products', 4, {
      product_variant: 'horizontal_scroll',
      section_title: 'الأكثر مبيعاً هذا الأسبوع',
      columns: 4,
      featured_only: false,
    }),
    s('categories', 5, {
      category_variant: 'image_tiles',
      columns: 4,
      section_title: 'أقسام المتجر',
      show_all: true,
    }),
    s('banners', 6, {
      variant: 'grid',
      slides: [
        { title: 'جمعة البرتقالي', subtitle: 'خصم إضافي 15% بكود MEGA15', image: STORE_MEDIA.hypermarket, button_text: 'تسوق الآن', button_link: '#template-products' },
      ],
    }),
    s('features', 7),
    s('footer', 8),
  ],
  tokens: tokens({
    primary: '#f1603e',
    secondary: '#c2410c',
    accent: '#fbbf24',
    background: '#ffffff',
    surface: '#fff4f0',
    text_primary: '#2b1710',
    text_secondary: '#7c5a4d',
    border: '#fadfd5',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#fff4f0,#ffcdb8)',
};

/* ---------------------------------------------------------------- 7 */
const ECOMMERCE_CLOTHING: BuilderTemplateConfig = {
  slug: 'ecommerce-clothing',
  name: 'أناقة',
  name_en: 'Elegance',
  description: 'قالب ملابس بالأبيض والأسود الحاد وزوايا حادة: ترويسة ممركزة، هيرو بصورة كاملة وأقسام بتغطية نصية فوق الصور.',
  category: 'ملابس',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'centered', sticky: true, show_nav: true }),
    s('hero', 2, {
      hero_variant: 'full',
      layout: 'full',
      title: 'تشكيلة الموسم الجديدة',
      subtitle: 'قطع مختارة بعناية تعكس ذوقك الرفيع — إصدار محدود.',
      image: STORE_MEDIA.clothes,
      button_text: 'استعرض التشكيلة',
      button_link: '#template-categories',
      overlay_opacity: 0.55,
    }),
    s('categories', 3, {
      category_variant: 'minimalist_overlay',
      columns: 4,
      section_title: 'الأقسام',
      show_all: false,
    }),
    s('products', 4, {
      product_variant: 'detailed_cards_with_badges',
      section_title: 'وصل حديثاً',
      columns: 4,
    }),
    s('reviews', 5, {
      section_title: 'ماذا قالت عميلاتنا؟',
      display_mode: 'slider',
      items: [
        { name: 'نورة القحطاني', rating: 5, text: 'جودة القماش ممتازة والمقاسات مضبوطة تماماً كما في الوصف.' },
        { name: 'ريم الدوسري', rating: 5, text: 'التغليف فخم والتوصيل كان أسرع من المتوقع. تجربة راقية.' },
      ],
    }),
    s('newsletter', 6, { section_title: 'كوني أول من يعرف عن التشكيلات الجديدة' }),
    s('footer', 7, { show_newsletter: false }),
  ],
  tokens: tokens({
    primary: '#111827',
    secondary: '#374151',
    accent: '#b91c1c',
    background: '#ffffff',
    surface: '#f7f7f8',
    text_primary: '#0b0b0d',
    text_secondary: '#55555e',
    border: '#e6e6ea',
  }, '0.25rem', FONT_PLEX),
  preview: 'linear-gradient(135deg,#ffffff,#111827)',
};

/* ---------------------------------------------------------------- 8 */
const FASHION_DESIGNER_MART: BuilderTemplateConfig = {
  slug: 'fashion-designer-mart',
  name: 'ديزاينر',
  name_en: 'Designer Mart',
  description: 'قالب أزياء راقية بهوية فاخرة هادئة: درجات البيج والذهبي، شبكة masonry للأقسام وصف تواصل مباشر.',
  category: 'أزياء راقية',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'minimal', show_search: false, show_nav: true }),
    s('hero', 2, {
      hero_variant: 'split_banner',
      badge: 'كوليكشن المصممين',
      title: 'الفخامة في أدق التفاصيل',
      subtitle: 'قطع حصرية بإنتاج محدود لمن تميز حضوره.',
      image: STORE_MEDIA.clothes,
      button_text: 'اكتشف الكوليكشن',
      button_link: '#template-categories',
    }),
    s('categories', 3, {
      category_variant: 'masonry_grid',
      columns: 3,
      section_title: 'عالم الديزاينر',
      show_all: false,
    }),
    s('products', 4, {
      product_variant: 'detailed_cards_with_badges',
      section_title: 'قطع مختارة',
      columns: 3,
    }),
    s('reviews', 5, {
      section_title: 'شهادات عملائنا',
      display_mode: 'grid',
      items: [
        { name: 'لطيفة المطيري', rating: 5, text: 'تفاصيل الخياطة تليق بعلامة عالمية. ستعود لتجربة ثانية.' },
        { name: 'عبدالعزيز الشمري', rating: 5, text: 'خدمة شخصية راقية — ساعدوني باختيار الهدية المثالية.' },
      ],
    }),
    s('contact', 6, { section_title: 'تواصلي مع مستشارة الأزياء' }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#9a7b4f',
    secondary: '#54452e',
    accent: '#c9a86a',
    background: '#faf7f1',
    surface: '#f3ede2',
    text_primary: '#29211a',
    text_secondary: '#7a6c58',
    border: '#e6dcc8',
  }, '0.375rem', FONT_PLEX),
  preview: 'linear-gradient(135deg,#faf7f1,#ddc9a3)',
};

/* ---------------------------------------------------------------- 9 */
const KIDS_FASHION: BuilderTemplateConfig = {
  slug: 'kids-fashion',
  name: 'عالم الأطفال',
  name_en: 'Kids World',
  description: 'قالب أطفال مرِح بالوردي والرمادي: هيرو bento ملوّن، أقسام دوائر منزلقة وبطاقات منتجات bento — ملابس وألعاب.',
  category: 'أطفال',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { show_nav: false }),
    s('hero', 2, {
      hero_variant: 'bento_grid',
      badge: '🎉 عالم من المرح',
      title: 'كل ما يبهج طفلك هنا',
      subtitle: 'ملابس مريحة وألعاب آمنة وممتعة — بأسعار تدلّل الأهل.',
      image: STORE_MEDIA.kidsToys,
      button_text: 'دخلوا العالم',
      button_link: '#template-categories',
      side_title_1: 'ملابس البنات والأولاد',
      side_subtitle_1: 'قطن مريح 100%',
      side_image_1: STORE_MEDIA.kidsClothes,
      side_title_2: 'ألعاب تعليمية',
      side_subtitle_2: 'تلعب وتتعلم',
      side_image_2: STORE_MEDIA.kidsToys,
    }),
    s('categories', 3, {
      category_variant: 'circle_slider',
      columns: 5,
      section_title: 'أقسام عالم الأطفال',
      show_all: true,
    }),
    s('products', 4, {
      product_variant: 'bento_products',
      section_title: 'الأكثر محبةً عند الصغار',
      columns: 4,
    }),
    s('features', 5, {
      section_title: 'لماذا الأمهات يحبنّا؟',
      items: [
        { title: 'أقمشة آمنة', text: 'قطن طبيعي لطيف على بشرة طفلك الحساسة.', icon: 'heart' },
        { title: 'ألعاب معتمدة', text: 'مطابقة لمعايير السلامة العالمية.', icon: 'badge_check' },
        { title: 'تغليف هدايا مجاني', text: 'نغلّف هدايا أعياد الميلاد بلمسة مميزة.', icon: 'gift' },
        { title: 'استبدال سهل', text: 'المقاس غير مناسب؟ نستبدله فوراً.', icon: 'refresh' },
      ],
    }),
    s('faq', 6, { section_title: 'أسئلة الأمهات الشائعة' }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#f98596',
    secondary: '#3d4651',
    accent: '#fbbf24',
    background: '#fffafa',
    surface: '#fdeef0',
    text_primary: '#33272b',
    text_secondary: '#8a7076',
    border: '#f8dbe0',
  }, '1.5rem', FONT_CAIRO),
  preview: 'linear-gradient(135deg,#fdeef0,#fbc4cd)',
};

/* --------------------------------------------------------------- 10 */
const COSMETIC_STORE: BuilderTemplateConfig = {
  slug: 'cosmetic-store',
  name: 'جماليات',
  name_en: 'Cosmetic Store',
  description: 'قالب تجميل وعناية بالبنفسجي الباهت الهادئ: ترويسة ممركزة، أقسام بلاطات صورية وصف منتجات أفقي أنيق.',
  category: 'تجميل وعناية',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'centered', show_nav: false }),
    s('hero', 2, {
      hero_variant: 'split_banner',
      badge: 'جمالك يستحق الأفضل',
      title: 'روتين عناية مصمم لكِ',
      subtitle: 'مكياج وعطور ومنتجات عناية أصلية 100% من علامات موثوقة.',
      image: STORE_MEDIA.cosmetics,
      button_text: 'اكتشفي منتجاتك',
      button_link: '#template-categories',
    }),
    s('categories', 3, {
      category_variant: 'image_tiles',
      columns: 4,
      section_title: 'أقسام الجمال',
      show_all: false,
    }),
    s('products', 4, {
      product_variant: 'horizontal_scroll',
      section_title: 'الأكثر طلباً هذا الشهر',
      columns: 4,
    }),
    s('products_by_category', 5, { per_category: 4, columns: 4, show_view_all: true }),
    s('reviews', 6, {
      section_title: 'تجارب عميلاتنا',
      display_mode: 'grid',
      items: [
        { name: 'هند العلي', rating: 5, text: 'منتجات أصلية ومختومة — صار متجري الأول للعناية.' },
        { name: 'جواهر سالم', rating: 5, text: 'العطر رائع وثباته طويل. التغليف أنيق جداً للهدايا.' },
      ],
    }),
    s('newsletter', 7, { section_title: 'انضمي لنادي الجمال — نصائح وعروض حصرية' }),
    s('footer', 8),
  ],
  tokens: tokens({
    primary: '#8d8ca4',
    secondary: '#6d6c88',
    accent: '#d98ca6',
    background: '#fcfbfe',
    surface: '#f4f2fa',
    text_primary: '#2d2a3e',
    text_secondary: '#6f6c85',
    border: '#e7e3f2',
  }, '1.25rem', FONT_PLEX),
  preview: 'linear-gradient(135deg,#f4f2fa,#d9d5ea)',
};

/* --------------------------------------------------------------- 11 */
const RESTAURANT_FOOD_DELIVERY: BuilderTemplateConfig = {
  slug: 'restaurant-food-delivery',
  name: 'المطعم',
  name_en: 'Restaurant & Delivery',
  description: 'قالب مطعم وتوصيل بهوية دافئة شهية: سلايدر أطباق عريض، قائمة طعام بتبويبات وبيانات تواصل للحجز والطلبات.',
  category: 'مطعم وتوصيل',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '🛵 توصيل مجاني داخل المدينة للطلبات فوق 50 ريال' }),
    s('header', 2, { show_cart: false, show_auth: false, show_nav: false }),
    s('hero', 3, {
      hero_variant: 'slider_full',
      title: 'وجبات تُطبخ بحُب تصل إليك ساخنة',
      subtitle: 'اختر من قائمتنا المتنوعة واطلب مباشرة عبر واتساب.',
      image: STORE_MEDIA.restaurantDish,
      button_text: 'اطلب وجبتك',
      button_link: '#template-categories',
      slides: [
        { title: 'مشاوي على الفحم', subtitle: 'نكهة أصيلة لا تُقاوم', image: STORE_MEDIA.grills, button_text: 'اطلب المشاوي', button_link: '#template-categories' },
        { title: 'وجبات سريعة للعائلة', subtitle: 'وجبات عائلية موفرة ولذيذة', image: STORE_MEDIA.fastFood, button_text: 'شاهد الوجبات', button_link: '#template-categories' },
      ],
    }),
    s('categories', 4, {
      category_variant: 'circle_pills',
      columns: 5,
      section_title: 'قائمتنا',
      show_all: false,
    }),
    s('products', 5, {
      product_variant: 'tabbed_categories',
      section_title: 'تصفح القائمة',
      columns: 4,
    }),
    s('features', 6, {
      section_title: 'لماذا مطعمنا؟',
      items: [
        { title: 'توصيل سريع', text: 'وجبتك تصل ساخنة خلال 30 دقيقة.', icon: 'truck' },
        { title: 'مكونات طازجة', text: 'نشتري طازجاً كل صباح من السوق.', icon: 'sparkles' },
        { title: 'حجز طاولات', text: 'احجز طاولتك هاتفياً أو عبر واتساب.', icon: 'clock' },
        { title: 'عروض الغداء', text: 'وجبات عمل بسعر خاص يومياً.', icon: 'award' },
      ],
    }),
    s('contact', 7, { section_title: 'زورونا أو اتصلوا بنا' }),
    s('footer', 8, { show_newsletter: false }),
  ],
  tokens: tokens({
    primary: '#ea580c',
    secondary: '#7c2d12',
    accent: '#facc15',
    background: '#fffdf6',
    surface: '#fbf3e4',
    text_primary: '#2f1c0e',
    text_secondary: '#7d6549',
    border: '#f1e2c8',
  }, '1rem', FONT_CAIRO),
  preview: 'linear-gradient(135deg,#fbf3e4,#ffd9ae)',
};

/* --------------------------------------------------------------- 12 */
const E_STOREFRONT: BuilderTemplateConfig = {
  slug: 'e-storefront',
  name: 'واجهة',
  name_en: 'E-Storefront',
  description: 'قالب إلكترونيات داكن فاخر بأزرق تقني: هوية ليلية مميزة تناسب متاجر الأجهزة والتقنية مع شبكة أيقونات للأقسام.',
  category: 'إلكترونيات',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { show_nav: false }),
    s('hero', 2, {
      hero_variant: 'split_banner',
      badge: 'تقنية 2026',
      title: 'أحدث الأجهزة بين يديك',
      subtitle: 'هواتف وسماعات وإكسسوارات أصلية بضمان معتمد وتوصيل سريع.',
      image: STORE_MEDIA.electronics,
      button_text: 'استعرض المنتجات',
      button_link: '#template-categories',
    }),
    s('categories', 3, {
      category_variant: 'icon_grid',
      columns: 5,
      section_title: 'أقسام التقنية',
      show_all: true,
    }),
    s('products_by_category', 4, { per_category: 4, columns: 4, show_view_all: true }),
    s('features', 5, {
      section_title: 'ضمانات المتجر',
      items: [
        { title: 'ضمان سنتين', text: 'وكيل معتمد لضمان جميع الأجهزة.', icon: 'award' },
        { title: 'أصلي 100%', text: 'لا نبيع نسخاً أو تقليداً أبداً.', icon: 'badge_check' },
        { title: 'شحن سريع', text: 'خلال 24-48 ساعة لجميع المدن.', icon: 'zap' },
        { title: 'دفع آمن', text: 'مدى، فيزا، Apple Pay والدفع عند الاستلام.', icon: 'card' },
      ],
    }),
    s('footer', 6),
  ],
  tokens: tokens({
    primary: '#3b82f6',
    secondary: '#0ea5e9',
    accent: '#22d3ee',
    background: '#001025',
    surface: '#07203c',
    text_primary: '#e6edf5',
    text_secondary: '#93a5bc',
    border: '#123354',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#001025,#123354)',
};

/* --------------------------------------------------------------- 13 */
const ECOMMECE_MARKETPLACE: BuilderTemplateConfig = {
  slug: 'ecommece-marketplace',
  name: 'السوق',
  name_en: 'Marketplace',
  description: 'قالب سوق عام محايد متعدد البائعين: أخضر تركوازي هادئ، بطاقات أقسام واسعة وأسئلة شائعة لبناء الثقة.',
  category: 'سوق عام',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '🛍️ تسوّق من مئات البائعين الموثوقين في مكان واحد' }),
    s('header', 2, { show_nav: true }),
    s('hero', 3, {
      hero_variant: 'split_banner',
      badge: 'سوق كل شيء',
      title: 'كل ما تحتاجه… من بائعين تثق بهم',
      subtitle: 'منتجات متنوعة بأسعار منافسة ومراجعات حقيقية من مشترين فعليين.',
      image: STORE_MEDIA.bannerStore,
      button_text: 'ابدأ الاستكشاف',
      button_link: '#template-categories',
    }),
    s('categories', 4, {
      category_variant: 'card_pills',
      columns: 6,
      section_title: 'تصفح السوق',
      show_all: true,
    }),
    s('products_by_category', 5, { per_category: 4, columns: 4, show_view_all: true }),
    s('faq', 6, { section_title: 'كل ما تريد معرفته عن الشراء' }),
    s('features', 7, {
      items: [
        { title: 'بائعون موثوقون', text: 'نتحقق من كل بائع قبل إدراجه.', icon: 'shield' },
        { title: 'حماية المشتري', text: 'أموالك محمية حتى تستلم طلبك.', icon: 'wallet' },
        { title: 'إرجاع مرن', text: 'سياسة إرجاع واضحة خلال 7 أيام.', icon: 'refresh' },
        { title: 'دعم متواصل', text: 'فريق الدعم متاح طوال أيام الأسبوع.', icon: 'support' },
      ],
    }),
    s('footer', 8),
  ],
  tokens: tokens({
    primary: '#0d9488',
    secondary: '#115e59',
    accent: '#f59e0b',
    background: '#ffffff',
    surface: '#f4f9f8',
    text_primary: '#10201d',
    text_secondary: '#4f6660',
    border: '#ddecea',
  }),
  preview: 'linear-gradient(135deg,#f4f9f8,#bfe3dc)',
};

/* --------------------------------------------------------------- 14 */
const MARKETPLACE_SHOP: BuilderTemplateConfig = {
  slug: 'marketplace-shop',
  name: 'بازار',
  name_en: 'Bazaar Shop',
  description: 'قالب متنوع أنيق بالرمادي الرصين: ترويسة بسيطة، شريط أقسام منزلق وقائمة منتجات بتبويبات — يناسب كل التجارات.',
  category: 'متنوع',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'minimal', show_nav: true }),
    s('hero', 2, {
      hero_variant: 'split_banner',
      badge: 'بازار العائلة',
      title: 'منتجات مختارة بعناية',
      subtitle: 'تشكيلة متنوعة من الأفضل — منزل وأزياء وهدايا وإلكترونيات.',
      image: STORE_MEDIA.bannerStore,
      button_text: 'تصفح البازار',
      button_link: '#template-categories',
    }),
    s('categories', 3, {
      category_variant: 'horizontal_scroll',
      columns: 6,
      section_title: 'أقسام البازار',
      show_all: true,
    }),
    s('products', 4, {
      product_variant: 'tabbed_categories',
      section_title: 'تسوق حسب التصنيف',
      columns: 4,
    }),
    s('features', 5, {
      items: [
        { title: 'اختيار مميز', text: 'نختار كل منتج بمعايير جودة صارمة.', icon: 'star' },
        { title: 'أسعار عادلة', text: 'قيمة حقيقية مقابل كل ريال تنفقه.', icon: 'wallet' },
        { title: 'تغليف أنيق', text: 'مناسب للإهداء مباشرة.', icon: 'gift' },
        { title: 'تواصل مباشر', text: 'اطلب واستفسر عبر واتساب بسهولة.', icon: 'support' },
      ],
    }),
    s('reviews', 6, {
      section_title: 'آراء المتسوقين',
      display_mode: 'grid',
      items: [
        { name: 'محمد الحربي', rating: 5, text: 'متجر متنوع فعلاً — طلبت هدية وملحقات جوال وكل شيء ممتاز.' },
        { name: 'عبير ناصر', rating: 4, text: 'أسعارهم منطقية والتوصيل كان أسرع من المتوقع.' },
      ],
    }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#334155',
    secondary: '#1e293b',
    accent: '#64748b',
    background: '#ffffff',
    surface: '#f4f6f9',
    text_primary: '#131720',
    text_secondary: '#5c6675',
    border: '#e3e8ef',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#f4f6f9,#c3ccd9)',
};

export const TEMPLATES: BuilderTemplateConfig[] = [
  CLASSIC,
  FRESH_BAKERS,
  GROCERY_SHOPPING,
  SUPER_MART_STORE,
  MEGA_STORE_WOOCOMMERCE,
  ECOMMERCE_MEGA_STORE,
  ECOMMERCE_CLOTHING,
  FASHION_DESIGNER_MART,
  KIDS_FASHION,
  COSMETIC_STORE,
  RESTAURANT_FOOD_DELIVERY,
  E_STOREFRONT,
  ECOMMECE_MARKETPLACE,
  MARKETPLACE_SHOP,
];

export const TEMPLATE_SLUGS = TEMPLATES.map((t) => t.slug);

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

/** Distinct specialty categories in catalog order — drives gallery filters. */
export const getTemplateCategories = (): string[] =>
  Array.from(new Set(TEMPLATES.map((t) => t.category)));

/**
 * Map any legacy/engine slug to the closest new-catalog template by visual
 * personality, so existing stores migrate automatically to the design that
 * feels like their old one — zero database changes needed.
 */
export const LEGACY_TEMPLATE_MAP: Record<string, string> = {
  // new-catalog slugs that existed before the consolidation
  zen: 'fashion-designer-mart',
  bazaar: 'ecommece-marketplace',
  elegant: 'ecommerce-clothing',
  ocean: 'e-storefront',
  rose: 'cosmetic-store',
  fresh: 'grocery-shopping',
  night: 'e-storefront',
  luxe: 'fashion-designer-mart',
  // old core templates
  'core-minimal': 'marketplace-shop',
  'core-bold': 'super-mart-store',
  'core-sidebar': 'ecommece-marketplace',
  'core-dark': 'e-storefront',
  'core-bazaar': 'ecommece-marketplace',
  'core-elegant': 'ecommerce-clothing',
  'core-showcase': 'ecommerce-mega-store',
  // growth
  'growth-electronics': 'e-storefront',
  'growth-fashion': 'ecommerce-clothing',
  'growth-food': 'restaurant-food-delivery',
  'growth-cosmetics': 'cosmetic-store',
  'growth-supermarket': 'super-mart-store',
  'growth-home-decor': 'marketplace-shop',
  'growth-pharmacy': 'cosmetic-store',
  // pro
  'pro-tech': 'e-storefront',
  'pro-beauty': 'cosmetic-store',
  'pro-books': 'marketplace-shop',
  'pro-sport': 'ecommerce-mega-store',
  'pro-pets': 'kids-fashion',
  'pro-flowers': 'cosmetic-store',
  'pro-coffee': 'fresh-bakers',
  'pro-stationery': 'marketplace-shop',
  'pro-spices': 'grocery-shopping',
  'pro-clothing': 'ecommerce-clothing',
  'pro-fragrances': 'cosmetic-store',
  'pro-home-tools': 'mega-store-woocommerce',
  'pro-kids': 'kids-fashion',
  'pro-sports': 'ecommerce-mega-store',
  'pro-boutique': 'fashion-designer-mart',
  // schema-driven engine themes
  'market-fast': 'super-mart-store',
  'fashion-luxe': 'fashion-designer-mart',
  'fresh-produce': 'grocery-shopping',
  // pre-canonic legacy sector slugs
  basic: 'classic',
  gadgets: 'e-storefront',
  'arabic-gadgets': 'e-storefront',
  'home-decor': 'marketplace-shop',
  bakery: 'fresh-bakers',
  supermarket: 'super-mart-store',
  wefaq: 'ecommece-marketplace',
};

export const normalizeTemplateSlug = (slug?: string | null): string => {
  const raw = String(slug || '').trim();
  if (!raw) return 'classic';
  if (TEMPLATES.some((t) => t.slug === raw)) return raw;
  return LEGACY_TEMPLATE_MAP[raw] || 'classic';
};
