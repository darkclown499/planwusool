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

/* ===================================================================== */
/* Arabic font stacks mapped to each theme's original Latin font.        */
/* Baloo Chettan 2 → Baloo Bhaijaan 2 · DM Serif Display → Amiri         */
/* Inter → IBM Plex Sans Arabic · Poppins/Jost/Questrial/Overpass →      */
/* Tajawal. All loaded via bunny.net in app.blade.php.                   */
/* ===================================================================== */
const FONT_TAJAWAL = "'Tajawal', 'Cairo', ui-sans-serif, system-ui, sans-serif";
const FONT_PLEX = "'IBM Plex Sans Arabic', 'Tajawal', ui-sans-serif, system-ui, sans-serif";
const FONT_BALOO = "'Baloo Bhaijaan 2', 'Tajawal', ui-sans-serif, system-ui, sans-serif";
const FONT_AMIRI_BODY = "'Cairo', 'Tajawal', ui-sans-serif, system-ui, sans-serif";
const FONT_AMIRI_HEADING = "'Amiri', 'Cairo', serif";

const tokens = (
  colors: Record<string, string>,
  radius = '1rem',
  bodyFont: string = FONT_TAJAWAL,
  headingFont?: string,
): BuilderDesignTokens => ({
  colors: {
    primary_foreground: '#ffffff',
    ...colors,
  },
  typography: {
    body_font: bodyFont,
    heading_font: headingFont || bodyFont,
    base_size: '16px',
  },
  radius,
});

/* ===================================================================== */
/* Template Catalog — 14 Arabic storefront templates rebuilt from the    */
/* real WordPress/WooCommerce themes in Downloads/Compressed/themes.     */
/* Every palette below is copied verbatim from --first-color /           */
/* --second-color of each theme's style.css, and every section chain     */
/* mirrors that theme's core/sections front-page order (owl slider       */
/* first). All are free for every plan.                                  */
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
/* fresh-bakers/style.css → --first:#F88C91 --second:#EA5D5C text:#001025
   core/sections: slider → testimonial → additional-content              */
const FRESH_BAKERS: BuilderTemplateConfig = {
  slug: 'fresh-bakers',
  name: 'المخبز الطازج',
  name_en: 'Fresh Bakers',
  description: 'قالب المخبز الوردي الشهير: سلايدر عريض ثم آراء العملاء مباشرة كما في التصميم الأصلي — مخبز وحلويات وكيك.',
  category: 'مخبوزات',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'classic', show_nav: false }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      title: 'خبز ومعجنات تصنع الفرق',
      subtitle: 'مكونات طبيعية 100% وأيدي خبّاز محترفة — اطلب الآن واستلم طلبك ساخناً.',
      image: STORE_MEDIA.bakery,
      button_text: 'اطلب طلبك الآن',
      button_link: '#template-categories',
      slides: [
        { title: 'حلويات ومناسبات بلمسة بيتية', subtitle: 'كيك وتورتات تُحضَّر عند الطلب', image: STORE_MEDIA.sweets, button_text: 'شاهد الحلويات', button_link: '#template-categories' },
        { title: 'قهوة ترافق لحظاتك', subtitle: 'محمصة يومياً بنكهة أصيلة', image: STORE_MEDIA.coffee, button_text: 'تصفح المشروبات', button_link: '#template-categories' },
      ],
    }),
    s('reviews', 3, {
      section_title: 'آراء زبائن المخبز',
      display_mode: 'grid',
      items: [
        { name: 'أم عبدالله', rating: 5, text: 'أفضل خبز عربي جرّبته! يصل ساخناً وطرياً كل يوم.' },
        { name: 'فهد العتيبي', rating: 5, text: 'الكنافة والمعجنات مستوى آخر. الطلب سهل جداً.' },
        { name: 'سارة م.', rating: 4, text: 'كيك المناسبة كان رائعاً والتغليف أنيق جداً.' },
      ],
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
    s('newsletter', 6, { section_title: 'اشترك لتصلك عروض اليوم الأول' }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#F88C91',
    secondary: '#EA5D5C',
    accent: '#EA5D5C',
    background: '#ffffff',
    surface: '#fdf1f2',
    text_primary: '#001025',
    text_secondary: '#5b6572',
    border: '#f8dcde',
  }, '1rem', FONT_PLEX),
  preview: 'linear-gradient(135deg,#fdf1f2,#F88C91)',
};

/* ---------------------------------------------------------------- 3 */
/* grocery-shopping/style.css → --first:#ed1d3b --second:#EA5D5C
   core/sections: slider → deal-of-day → additional-content             */
const GROCERY_SHOPPING: BuilderTemplateConfig = {
  slug: 'grocery-shopping',
  name: 'بقالتك',
  name_en: 'Grocery Shopping',
  description: 'قالب البقالة الأحمر الجريء: سلايدر عريض ثم بانر «عرض اليوم» كما في الأصل — خضار وفواكه ومواد تموينية.',
  category: 'بقالة',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '🚚 توصيل مجاني للطلبات فوق 100 ريال داخل المدينة' }),
    s('header', 2, { show_nav: false }),
    s('hero', 3, {
      hero_variant: 'slider_full',
      title: 'بقالتك الكاملة تصل حتى بابك',
      subtitle: 'خضار وفواكه ومواد غذائية بأسعار الجملة — اطلب خلال دقيقة.',
      image: STORE_MEDIA.grocery,
      button_text: 'اطلب بقالتك',
      button_link: '#template-categories',
      slides: [
        { title: 'طازج كل صباح', subtitle: 'منتقاة يدوياً من أفضل الأسواق', image: STORE_MEDIA.vegetables, button_text: 'اطلب الخضار', button_link: '#template-categories' },
        { title: 'فواكه الموسم', subtitle: 'ألذ وأوفّر في وقتها', image: STORE_MEDIA.fruits, button_text: 'شاهد الفواكه', button_link: '#template-categories' },
      ],
    }),
    s('banners', 4, {
      variant: 'grid',
      section_title: 'عرض اليوم',
      slides: [
        { title: '🔥 عرض اليوم — سلة الخضار الأسبوعية', subtitle: 'وفّر 30% على سلة موسمية كاملة، اليوم فقط!', image: STORE_MEDIA.vegetables, button_text: 'اغتنم العرض', button_link: '#template-products' },
      ],
    }),
    s('categories', 5, {
      category_variant: 'icon_grid',
      columns: 6,
      section_title: 'أقسام البقالة',
      show_all: true,
    }),
    s('products_by_category', 6, { per_category: 4, columns: 4, show_view_all: true }),
    s('features', 7, {
      section_title: 'خدمة تستحق الثقة',
      items: [
        { title: 'توصيل في نفس اليوم', text: 'اطلب قبل الساعة 6 مساءً ويصلك طلبك اليوم.', icon: 'truck' },
        { title: 'انتقاء يدوي', text: 'نختار الخضار والفواكه طازجة بعناية.', icon: 'badge_check' },
        { title: 'أسعار الجملة', text: 'أوفر لك أفضل سعر يومياً على السلع الأساسية.', icon: 'wallet' },
        { title: 'دعم فوري', text: 'فريق خدمة العملاء يرد عليك فوراً.', icon: 'support' },
      ],
    }),
    s('footer', 8),
  ],
  tokens: tokens({
    primary: '#ed1d3b',
    secondary: '#b8122a',
    accent: '#EA5D5C',
    background: '#ffffff',
    surface: '#fdf1f2',
    text_primary: '#000000',
    text_secondary: '#555555',
    border: '#f8dbde',
  }),
  preview: 'linear-gradient(135deg,#fdf1f2,#ed1d3b)',
};

/* ---------------------------------------------------------------- 4 */
/* super-mart-store shares restaurant's palette (#d31b27/#e5a500);
   theme ships no frontpage.php → standard shop grid after the slider   */
const SUPER_MART_STORE: BuilderTemplateConfig = {
  slug: 'super-mart-store',
  name: 'سوبر مارت',
  name_en: 'Super Mart Store',
  description: 'قالب السوبرماركت بالأحمر والأصفر: سلايدر عروض عريض وشبكة متجر كاملة لكل احتياجات المنزل.',
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
    s('products_by_category', 4, { per_category: 4, columns: 4, show_view_all: true }),
    s('banners', 5, {
      variant: 'carousel',
      slides: [
        { title: 'خصومات نهاية الأسبوع', subtitle: 'حتى 40% على المواد الغذائية', image: STORE_MEDIA.fruits, button_text: 'اغتنم العرض', button_link: '#template-products' },
        { title: 'سلة الإفطار الكاملة', subtitle: 'كل ما تحتاجه بسلة واحدة موفرة', image: STORE_MEDIA.dairy, button_text: 'اطلب السلة', button_link: '#template-products' },
      ],
    }),
    s('features', 6),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#d31b27',
    secondary: '#a5121c',
    accent: '#e5a500',
    background: '#ffffff',
    surface: '#fdf2f2',
    text_primary: '#000000',
    text_secondary: '#555555',
    border: '#f6dcdc',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#fdf2f2,#d31b27)',
};

/* ---------------------------------------------------------------- 5 */
/* mega-store-woocommerce/style.css → --first:#0069df --second:#e5a500
   core/sections: slider → product-category → tab-products              */
const MEGA_STORE_WOOCOMMERCE: BuilderTemplateConfig = {
  slug: 'mega-store-woocommerce',
  name: 'هايبر مارت',
  name_en: 'Hyper Mart',
  description: 'قالب الهايبر بالأزرق والأصفر: سلايدر ثم شبكة تصنيفات ثم تبويبات منتجات — نفس ترتيب الأصل حرفياً.',
  category: 'متجر شامل',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { show_nav: true }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      badge: 'هايبر مارت',
      title: 'كل شيء تحت سقف واحد',
      subtitle: 'إلكترونيات وأزياء ومنزل وبقالة — عروض يومية لا تفوتك.',
      image: STORE_MEDIA.hypermarket,
      button_text: 'ابدأ التسوق',
      button_link: '#template-categories',
      slides: [
        { title: 'أحدث الأجهزة التقنية', subtitle: 'إلكترونيات أصلية بأفضل الأسعار', image: STORE_MEDIA.electronics, button_text: 'تسوق التقنية', button_link: '#template-categories' },
        { title: 'أزياء العائلة', subtitle: 'تشكيلات جديدة أسبوعياً', image: STORE_MEDIA.clothes, button_text: 'تسوق الأزياء', button_link: '#template-categories' },
      ],
    }),
    s('categories', 3, {
      category_variant: 'card_pills',
      columns: 5,
      section_title: 'تسوق حسب القسم',
      show_all: true,
    }),
    s('products', 4, {
      product_variant: 'tabbed_categories',
      section_title: 'الأكثر رواجاً في كل قسم',
      columns: 4,
    }),
    s('faq', 5, { section_title: 'أسئلة يتكرر طرحها' }),
    s('features', 6, {
      items: [
        { title: 'شحن لجميع المدن', text: 'شبكة توصيل تغطي كافة المناطق.', icon: 'truck' },
        { title: 'دفع آمن', text: 'خيارات دفع متعددة ومحمية بالكامل.', icon: 'card' },
        { title: 'إرجاع مجاني', text: 'استرجاع خلال 14 يوماً دون أسئلة.', icon: 'refresh' },
        { title: 'عروض يومية', text: 'صفقات جديدة كل يوم على تشكيلة واسعة.', icon: 'zap' },
      ],
    }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#0069df',
    secondary: '#0051ad',
    accent: '#e5a500',
    background: '#ffffff',
    surface: '#f2f7fd',
    text_primary: '#000000',
    text_secondary: '#4f5866',
    border: '#dbe8f7',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#f2f7fd,#0069df)',
};

/* ---------------------------------------------------------------- 6 */
/* ecommerce-mega-store/style.css → --first:#22233f --second:#f15f3d
   core/sections: slider → tab-products                                 */
const ECOMMERCE_MEGA_STORE: BuilderTemplateConfig = {
  slug: 'ecommerce-mega-store',
  name: 'ميغا ستور',
  name_en: 'Mega Store',
  description: 'قالب العروض بالكحلي والبرتقالي: سلايدر صارخ ثم تبويبات منتجات — هوية «ميغا ستور» الأصلية.',
  category: 'عروض كبيرة',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '⚡ تخفيضات كبرى — خصومات تصل إلى 50% لفترة محدودة' }),
    s('header', 2, { show_nav: false }),
    s('hero', 3, {
      hero_variant: 'slider_full',
      badge: 'عروض لا تتكرر',
      title: 'ميغا ستور — وفّر أكثر',
      subtitle: 'أجهزة وأزياء ومنتجات مختارة بأقل الأسعار مع ضمان الاسترجاع.',
      image: STORE_MEDIA.electronics,
      button_text: 'تسوّق التخفيضات',
      button_link: '#template-products',
      slides: [
        { title: 'تقنية تغيّر يومك', subtitle: 'أجهزة ذكية بأسعار الجملة', image: STORE_MEDIA.hypermarket, button_text: 'تسوق الآن', button_link: '#template-products' },
      ],
    }),
    s('products', 4, {
      product_variant: 'tabbed_categories',
      section_title: 'تصفح حسب القسم',
      columns: 4,
    }),
    s('banners', 5, {
      variant: 'grid',
      slides: [
        { title: 'عرض الكود البرتقالي', subtitle: 'خصم إضافي 15% بكود MEGA15', image: STORE_MEDIA.hypermarket, button_text: 'تسوق الآن', button_link: '#template-products' },
      ],
    }),
    s('features', 6),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#22233f',
    secondary: '#171830',
    accent: '#f15f3d',
    background: '#ffffff',
    surface: '#f4f4f8',
    text_primary: '#22233f',
    text_secondary: '#5c5d70',
    border: '#e3e3ec',
  }, '0.75rem'),
  preview: 'linear-gradient(135deg,#f4f4f8,#22233f)',
};

/* ---------------------------------------------------------------- 7 */
/* ecommerce-clothing shares marketplace's palette (#11248f/#c4ec26);
   ships no frontpage.php → standard shop grid after the slider         */
const ECOMMERCE_CLOTHING: BuilderTemplateConfig = {
  slug: 'ecommerce-clothing',
  name: 'أناقة',
  name_en: 'Elegance',
  description: 'قالب الملابس بالأزرق الملكي والليموني: سلايدر أزياء عريض وشبكة متجر أنيقة لتشكيلات الموسم.',
  category: 'ملابس',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'centered', sticky: true, show_nav: true }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      title: 'تشكيلة الموسم الجديدة',
      subtitle: 'قطع مختارة بعناية تعكس ذوقك الرفيع — إصدار محدود.',
      image: STORE_MEDIA.clothes,
      button_text: 'استعرض التشكيلة',
      button_link: '#template-products',
      overlay_opacity: 0.55,
      slides: [
        { title: 'إطلالات المساء', subtitle: 'فساتين سهرة بتفاصيل استثنائية', image: STORE_MEDIA.clothes, button_text: 'اكتشفي السهرة', button_link: '#template-products' },
      ],
    }),
    s('products', 3, {
      product_variant: 'detailed_cards_with_badges',
      section_title: 'وصل حديثاً',
      columns: 4,
    }),
    s('categories', 4, {
      category_variant: 'minimalist_overlay',
      columns: 4,
      section_title: 'الأقسام',
      show_all: false,
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
    primary: '#11248f',
    secondary: '#0d1c6e',
    accent: '#c4ec26',
    background: '#ffffff',
    surface: '#f3f5fc',
    text_primary: '#000000',
    text_secondary: '#555566',
    border: '#e2e6f4',
  }, '0.5rem'),
  preview: 'linear-gradient(135deg,#f3f5fc,#11248f)',
};

/* ---------------------------------------------------------------- 8 */
/* fashion-designer-mart/style.css → --first:#f1657d --second:#1a1c22
   Fonts: DM Serif Display → mapped to Amiri headings.
   core/sections: slider → hot-products                                 */
const FASHION_DESIGNER_MART: BuilderTemplateConfig = {
  slug: 'fashion-designer-mart',
  name: 'ديزاينر',
  name_en: 'Designer Mart',
  description: 'قالب المصممين بالوردي والأسود مع خط أميري الفاخر للعناوين — سلايدر ثم المنتجات الساخنة كما في الأصل.',
  category: 'أزياء راقية',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'minimal', show_search: false, show_nav: true }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      badge: 'كوليكشن المصممين',
      title: 'الفخامة في أدق التفاصيل',
      subtitle: 'قطع حصرية بإنتاج محدود لمن تميز حضوره.',
      image: STORE_MEDIA.clothes,
      button_text: 'اكتشف الكوليكشن',
      button_link: '#template-products',
      slides: [
        { title: 'عبايات وقفاطين المناسبات', subtitle: 'أقمشة فاخرة وخياطة يدوية', image: STORE_MEDIA.clothes, button_text: 'شاهد التشكيلة', button_link: '#template-products' },
      ],
    }),
    s('products', 3, {
      product_variant: 'horizontal_scroll',
      section_title: 'القطع الأكثر طلباً',
      columns: 4,
    }),
    s('categories', 4, {
      category_variant: 'masonry_grid',
      columns: 3,
      section_title: 'عالم الديزاينر',
      show_all: false,
    }),
    s('reviews', 5, {
      section_title: 'شهادات عملائنا',
      display_mode: 'grid',
      items: [
        { name: 'لطيفة المطيري', rating: 5, text: 'تفاصيل الخياطة تليق بعلامة عالمية. سأعود لتجربة ثانية.' },
        { name: 'عبدالعزيز الشمري', rating: 5, text: 'خدمة شخصية راقية — ساعدوني باختيار الهدية المثالية.' },
      ],
    }),
    s('contact', 6, { section_title: 'تواصل مع مستشار الأزياء' }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#f1657d',
    secondary: '#1a1c22',
    accent: '#f9a8b8',
    background: '#ffffff',
    surface: '#fdf2f4',
    text_primary: '#1a1c22',
    text_secondary: '#6d7078',
    border: '#f6dde2',
  }, '0.375rem', FONT_AMIRI_BODY, FONT_AMIRI_HEADING),
  preview: 'linear-gradient(135deg,#fdf2f4,#f1657d)',
};

/* ---------------------------------------------------------------- 9 */
/* kids-fashion/style.css → --first:#f98496 --second:#9085f9
   Fonts: Baloo Chettan 2 → Baloo Bhaijaan 2.
   core/sections: slider → hot-products                                 */
const KIDS_FASHION: BuilderTemplateConfig = {
  slug: 'kids-fashion',
  name: 'عالم الأطفال',
  name_en: 'Kids World',
  description: 'قالب الأطفال بالوردي والبنفسجي وخط «بالو» المرِح: سلايدر ملوّن ثم المنتجات الساخنة — ملابس وألعاب.',
  category: 'أطفال',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { show_nav: false }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      badge: '🎉 عالم من المرح',
      title: 'كل ما يبهج طفلك هنا',
      subtitle: 'ملابس مريحة وألعاب آمنة وممتعة — بأسعار تدلّل الأهل.',
      image: STORE_MEDIA.kidsToys,
      button_text: 'دخلوا العالم',
      button_link: '#template-categories',
      slides: [
        { title: 'ملابس البنات والأولاد', subtitle: 'قطن مريح 100% لكل الحركات', image: STORE_MEDIA.kidsClothes, button_text: 'شاهد الملابس', button_link: '#template-categories' },
        { title: 'ألعاب تلعب وتتعلم', subtitle: 'مجموعة تعليمية آمنة ومعتمدة', image: STORE_MEDIA.kidsToys, button_text: 'شاهد الألعاب', button_link: '#template-products' },
      ],
    }),
    s('products', 3, {
      product_variant: 'horizontal_scroll',
      section_title: 'الأكثر محبةً عند الصغار',
      columns: 4,
    }),
    s('categories', 4, {
      category_variant: 'circle_slider',
      columns: 5,
      section_title: 'أقسام عالم الأطفال',
      show_all: true,
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
    primary: '#f98496',
    secondary: '#9085f9',
    accent: '#b9b0ff',
    background: '#fffbfb',
    surface: '#fdf0f3',
    text_primary: '#3d4651',
    text_secondary: '#79808c',
    border: '#f7dbe2',
  }, '1.5rem', FONT_BALOO),
  preview: 'linear-gradient(135deg,#fdf0f3,#f98496)',
};

/* --------------------------------------------------------------- 10 */
/* cosmetic-store/style.css → --first:#5fcb91 (no second color)
   Fonts: Poppins → Tajawal.
   core/sections: slider → hot-products                                 */
const COSMETIC_STORE: BuilderTemplateConfig = {
  slug: 'cosmetic-store',
  name: 'جماليات',
  name_en: 'Cosmetic Store',
  description: 'قالب التجميل الأخضر المنعش: سلايدر أنيق ثم صف المنتجات الساخنة — مكياج وعطور وعناية أصلية.',
  category: 'تجميل وعناية',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'centered', show_nav: false }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      badge: 'جمالك يستحق الأفضل',
      title: 'روتين عناية مصمم لكِ',
      subtitle: 'مكياج وعطور ومنتجات عناية أصلية 100% من علامات موثوقة.',
      image: STORE_MEDIA.cosmetics,
      button_text: 'اكتشفي منتجاتك',
      button_link: '#template-products',
      slides: [
        { title: 'عطور تبقى في الذاكرة', subtitle: 'شرقي وفرنسي بثبات استثنائي', image: STORE_MEDIA.perfume, button_text: 'شاهدي العطور', button_link: '#template-products' },
      ],
    }),
    s('products', 3, {
      product_variant: 'horizontal_scroll',
      section_title: 'الأكثر طلباً هذا الشهر',
      columns: 4,
    }),
    s('categories', 4, {
      category_variant: 'image_tiles',
      columns: 4,
      section_title: 'أقسام الجمال',
      show_all: false,
    }),
    s('reviews', 5, {
      section_title: 'تجارب عميلاتنا',
      display_mode: 'grid',
      items: [
        { name: 'هند العلي', rating: 5, text: 'منتجات أصلية ومختومة — صار متجري الأول للعناية.' },
        { name: 'جواهر سالم', rating: 5, text: 'العطر رائع وثباته طويل. التغليف أنيق جداً للهدايا.' },
      ],
    }),
    s('newsletter', 6, { section_title: 'انضمي لنادي الجمال — نصائح وعروض حصرية' }),
    s('footer', 7),
  ],
  tokens: tokens({
    primary: '#5fcb91',
    secondary: '#3fa06a',
    accent: '#a5e3c3',
    background: '#ffffff',
    surface: '#f2faf5',
    text_primary: '#000000',
    text_secondary: '#595959',
    border: '#e3f2e8',
  }, '1.25rem'),
  preview: 'linear-gradient(135deg,#f2faf5,#5fcb91)',
};

/* --------------------------------------------------------------- 11 */
/* restaurant-food-delivery/style.css → --first:#d31b27 --second:#e5a500
   Fonts: Poppins → Tajawal.
   core/sections: slider → special-meal                                 */
const RESTAURANT_FOOD_DELIVERY: BuilderTemplateConfig = {
  slug: 'restaurant-food-delivery',
  name: 'المطعم',
  name_en: 'Restaurant & Delivery',
  description: 'قالب المطعم بالأحمر والأصفر الشهيان: سلايدر أطباق عريض ثم بانر «الوجبة المميزة» وقائمة بتبويبات.',
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
    s('banners', 4, {
      variant: 'grid',
      section_title: 'وجبة اليوم المميزة',
      slides: [
        { title: '⭐ وجبة اليوم — مشاوي مشكل عائلي', subtitle: 'تكفي 4-5 أشخاص بسعر خاص اليوم فقط!', image: STORE_MEDIA.grills, button_text: 'اطلبها الآن', button_link: '#template-products' },
      ],
    }),
    s('categories', 5, {
      category_variant: 'circle_pills',
      columns: 5,
      section_title: 'قائمتنا',
      show_all: false,
    }),
    s('products', 6, {
      product_variant: 'tabbed_categories',
      section_title: 'تصفح القائمة',
      columns: 4,
    }),
    s('contact', 7, { section_title: 'زورونا أو اتصلوا بنا' }),
    s('footer', 8, { show_newsletter: false }),
  ],
  tokens: tokens({
    primary: '#d31b27',
    secondary: '#a5121c',
    accent: '#e5a500',
    background: '#ffffff',
    surface: '#fdf2f2',
    text_primary: '#000000',
    text_secondary: '#555555',
    border: '#f6dcdc',
  }, '1rem'),
  preview: 'linear-gradient(135deg,#fdf2f2,#d31b27)',
};

/* --------------------------------------------------------------- 12 */
/* e-storefront/style.css → --first:#1ABA1A (no second), text:#001025
   Fonts: Inter → IBM Plex Sans Arabic.
   core/sections: slider → categories                                   */
const E_STOREFRONT: BuilderTemplateConfig = {
  slug: 'e-storefront',
  name: 'واجهة',
  name_en: 'E-Storefront',
  description: 'قالب الإلكترونيات الأخضر النابض بخط Inter العربي: سلايدر تقني ثم شبكة التصنيفات مباشرة كالأصل.',
  category: 'إلكترونيات',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { show_nav: false }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      badge: 'تقنية 2026',
      title: 'أحدث الأجهزة بين يديك',
      subtitle: 'هواتف وسماعات وإكسسوارات أصلية بضمان معتمد وتوصيل سريع.',
      image: STORE_MEDIA.electronics,
      button_text: 'استعرض المنتجات',
      button_link: '#template-categories',
      slides: [
        { title: 'صوت يحيط بك من كل جانب', subtitle: 'سماعات ومكبرات بأحدث التقنيات', image: STORE_MEDIA.electronics, button_text: 'تسوق الصوتيات', button_link: '#template-products' },
      ],
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
    primary: '#1ABA1A',
    secondary: '#128a12',
    accent: '#7ee87e',
    background: '#ffffff',
    surface: '#f1fbf1',
    text_primary: '#001025',
    text_secondary: '#4d5a66',
    border: '#dff3df',
  }, '0.75rem', FONT_PLEX),
  preview: 'linear-gradient(135deg,#f1fbf1,#1ABA1A)',
};

/* --------------------------------------------------------------- 13 */
/* ecommece-marketplace/style.css → --first:#11248f --second:#c4ec26
   Fonts: Questrial → Tajawal.
   core/sections: slider → featured-product                             */
const ECOMMECE_MARKETPLACE: BuilderTemplateConfig = {
  slug: 'ecommece-marketplace',
  name: 'السوق',
  name_en: 'Marketplace',
  description: 'قالب السوق بالأزرق الملكي والليموني الحاد: سلايدر ثم شبكة «منتجات مميزة» كما في التصميم الأصلي.',
  category: 'سوق عام',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('announcement', 1, { text: '🛍️ تسوّق من مئات البائعين الموثوقين في مكان واحد' }),
    s('header', 2, { show_nav: true }),
    s('hero', 3, {
      hero_variant: 'slider_full',
      badge: 'سوق كل شيء',
      title: 'كل ما تحتاجه… من بائعين تثق بهم',
      subtitle: 'منتجات متنوعة بأسعار منافسة ومراجعات حقيقية من مشترين فعليين.',
      image: STORE_MEDIA.bannerStore,
      button_text: 'ابدأ الاستكشاف',
      button_link: '#template-categories',
      slides: [
        { title: 'صفقات هذا الأسبوع', subtitle: 'أسعار لن تجدها في مكان آخر', image: STORE_MEDIA.hypermarket, button_text: 'شاهد الصفقات', button_link: '#template-products' },
      ],
    }),
    s('products', 4, {
      product_variant: 'detailed_cards_with_badges',
      section_title: 'منتجات مميزة',
      columns: 4,
      featured_only: true,
    }),
    s('categories', 5, {
      category_variant: 'card_pills',
      columns: 6,
      section_title: 'تصفح السوق',
      show_all: true,
    }),
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
    primary: '#11248f',
    secondary: '#0d1c6e',
    accent: '#c4ec26',
    background: '#ffffff',
    surface: '#f3f5fc',
    text_primary: '#000000',
    text_secondary: '#555566',
    border: '#e2e6f4',
  }),
  preview: 'linear-gradient(135deg,#f3f5fc,#11248f)',
};

/* --------------------------------------------------------------- 14 */
/* marketplace-shop clones kids-fashion's palette (#f98496/#9085f9);
   ships no frontpage.php → standard shop grid after the slider         */
const MARKETPLACE_SHOP: BuilderTemplateConfig = {
  slug: 'marketplace-shop',
  name: 'بازار',
  name_en: 'Bazaar Shop',
  description: 'قالب البازار الوردي الدافئ: سلايدر ترحيبي وشبكة متجر متنوعة — منزل وهدايا وإكسسوارات.',
  category: 'متنوع',
  is_free: true,
  plan_required: 'starter',
  sections: [
    s('header', 1, { variant: 'minimal', show_nav: true }),
    s('hero', 2, {
      hero_variant: 'slider_full',
      badge: 'بازار العائلة',
      title: 'منتجات مختارة بعناية',
      subtitle: 'تشكيلة متنوعة من الأفضل — منزل وأزياء وهدايا وإلكترونيات.',
      image: STORE_MEDIA.bannerStore,
      button_text: 'تصفح البازار',
      button_link: '#template-categories',
      slides: [
        { title: 'هدايا تُسعد من تحب', subtitle: 'بوكسات جاهزة لكل المناسبات', image: STORE_MEDIA.sweets, button_text: 'شاهد الهدايا', button_link: '#template-products' },
      ],
    }),
    s('products', 3, {
      product_variant: 'detailed_cards_with_badges',
      section_title: 'تسوق البازار',
      columns: 4,
    }),
    s('categories', 4, {
      category_variant: 'horizontal_scroll',
      columns: 6,
      section_title: 'أقسام البازار',
      show_all: true,
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
    primary: '#f98496',
    secondary: '#9085f9',
    accent: '#b9b0ff',
    background: '#ffffff',
    surface: '#fdf2f4',
    text_primary: '#3d4651',
    text_secondary: '#79808c',
    border: '#f7dbe2',
  }),
  preview: 'linear-gradient(135deg,#fdf2f4,#9085f9)',
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
