import type { BuilderDesignTokens } from '@/builder/types';
import type { WpThemeConfig, WpSectionConfig } from './types';

/* =====================================================================
 * Per-theme configurations ported from Downloads/Compressed/themes.
 *
 * Every `sections` array mirrors that theme's core/sections/*.php order,
 * every color is copied verbatim from --first-color/--second-color in
 * style.css, and every font maps the original Latin family to its Arabic
 * counterpart loaded via bunny.net. Slider/banner images are the themes'
 * own assets copied to /themes/<slug>/.
 * ===================================================================== */

const tok = (
  primary: string,
  secondary: string,
  accent: string,
  surface: string,
  textPrimary: string,
  border: string,
  radius: string,
  bodyFont: string,
  headingFont?: string,
): BuilderDesignTokens => ({
  colors: {
    primary,
    secondary,
    accent,
    background: '#ffffff',
    surface,
    text_primary: textPrimary,
    text_secondary: '#5b6572',
    border,
    primary_foreground: '#ffffff',
  },
  typography: {
    body_font: bodyFont,
    heading_font: headingFont || bodyFont,
    base_size: '16px',
  },
  radius,
});

const FONT_TAJAWAL = "'Tajawal', 'Cairo', sans-serif";
const FONT_PLEX = "'IBM Plex Sans Arabic', 'Tajawal', sans-serif";
const FONT_BALOO = "'Baloo Bhaijaan 2', 'Tajawal', sans-serif";
const FONT_CAIRO = "'Cairo', 'Tajawal', sans-serif";
const FONT_AMIRI = "'Amiri', 'Cairo', serif";
const FONT_ZAIN = "'Zain', 'IBM Plex Sans Arabic', 'Tajawal', sans-serif";

const MENU = ['الرئيسية', 'المتجر', 'الأقسام', 'تواصل معنا'];
const sec = (kind: WpSectionConfig['kind'], title?: string): WpSectionConfig => ({ kind, title });

export const WP_THEMES: Record<string, WpThemeConfig> = {
  /* -------------------------------------------------- fresh-bakers */
  'fresh-bakers': {
    slug: 'fresh-bakers',
    name: 'المخبز الطازج',
    nameEn: 'Fresh Bakers',
    tagline: 'مخبز وحلويات بلمسة بيتية أصيلة',
    tokens: tok('#F88C91', '#EA5D5C', '#EA5D5C', '#fdf1f2', '#001025', '#f8dcde', '8px', FONT_PLEX),
    header: {
      topbarText: 'تخبيز يومي طازج — اطلب قبل الساعة 4 مساءً ليصلك اليوم',
      phone: '+966 55 000 0000',
      email: 'hello@freshbakers.sa',
      socials: true,
      logoText: 'المخبز الطازج',
      menu: MENU,
    },
    footer: {
      about: 'مخبز منزلي يقدّم الخبز والمعجنات والحلويات بمكونات طبيعية 100% وتوصيل سريع.',
      copyright: 'المخبز الطازج',
    },
    strings: { sliderButton: 'اطلب الآن', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('testimonial', 'آراء زبائن المخبز'),
      sec('hot-products', 'منتجاتنا الطازجة'),
    ],
    media: {
      sliderMain: '/themes/fresh-bakers/slider.png',
      slideSweets: '/images/store/sweets.jpg',
      slideCoffee: '/images/store/coffee.jpg',
    },
  },

  /* ----------------------------------------------- cosmetic-store */
  'cosmetic-store': {
    slug: 'cosmetic-store',
    name: 'جماليات',
    nameEn: 'Cosmetic Store',
    tagline: 'عناية ومكياج وعطور أصلية',
    tokens: tok('#5fcb91', '#3fa06a', '#a5e3c3', '#f2faf5', '#000000', '#e3f2e8', '14px', FONT_TAJAWAL),
    header: {
      topbarText: 'شحن مجاني للطلبات فوق 200 ريال — منتجات أصلية 100%',
      phone: '+966 55 111 2222',
      email: 'care@gamalyat.sa',
      socials: true,
      logoText: 'جماليات',
      menu: MENU,
    },
    footer: {
      about: 'وجهتك الأولى للعناية بالبشرة والمكياج والعطور الأصلية من علامات موثوقة عالمياً.',
      copyright: 'جماليات',
    },
    strings: { sliderButton: 'اكتشف المنتجات', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('hot-products', 'الأكثر طلباً هذا الشهر'),
      sec('categories-box', 'أقسام الجمال'),
    ],
    media: {
      sliderMain: '/themes/cosmetic-store/slider1.png',
      slidePerfume: '/themes/cosmetic-store/slider2.png',
    },
  },

  /* ------------------------------------------------- e-storefront */
  'e-storefront': {
    slug: 'e-storefront',
    name: 'واجهة',
    nameEn: 'E-Storefront',
    tagline: 'أحدث الأجهزة الإلكترونية بضمان معتمد',
    tokens: tok('#1ABA1A', '#128a12', '#7ee87e', '#f1fbf1', '#001025', '#dff3df', '10px', FONT_PLEX),
    header: {
      topbarText: 'ضمان سنتين على جميع الأجهزة — توصيل خلال 24 ساعة',
      phone: '+966 55 333 4444',
      email: 'support@estorefront.sa',
      socials: true,
      logoText: 'واجهة',
      menu: MENU,
    },
    footer: {
      about: 'متجر إلكترونيات متكامل يقدم الهواتف والسماعات والإكسسوارات الأصلية بأفضل الأسعار.',
      copyright: 'واجهة',
    },
    strings: { sliderButton: 'استعرض المنتجات', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    services: [
      { title: 'ضمان أصلي', text: 'كل جهاز مضمون ومطابق للمواصفات', icon: 'shield' },
      { title: 'توصيل سريع', text: 'يصلك أينما كنت خلال 24 ساعة', icon: 'truck' },
      { title: 'دعم فني', text: 'فريقنا يرد عليك عبر واتساب في أي وقت', icon: 'headset' },
      { title: 'دفع آمن', text: 'طرق دفع متعددة وموثوقة', icon: 'wallet' },
    ],
    sections: [
      sec('slider'),
      sec('categories-box', 'أقسام التقنية'),
      sec('hot-products', 'الأكثر مبيعاً'),
      sec('shop-grid', 'أحدث المنتجات'),
      sec('services'),
      sec('testimonial', 'آراء عملائنا'),
      sec('contact-strip', 'تواصل معنا'),
    ],
    media: {
      sliderMain: '/themes/e-storefront/slider.png',
      banner: '/themes/e-storefront/banner.png',
    },
  },

  /* ------------------------------------------ ecommece-marketplace */
  'ecommece-marketplace': {
    slug: 'ecommece-marketplace',
    name: 'السوق',
    nameEn: 'Marketplace',
    tagline: 'كل ما تحتاجه من بائعين تثق بهم',
    tokens: tok('#11248f', '#0d1c6e', '#c4ec26', '#f3f5fc', '#000000', '#e2e6f4', '6px', FONT_TAJAWAL),
    header: {
      topbarText: 'تسوق من مئات البائعين الموثوقين — حماية كاملة للمشتري',
      phone: '+966 55 555 6666',
      email: 'info@souq-wusool.sa',
      socials: true,
      logoText: 'السوق',
      menu: MENU,
    },
    footer: {
      about: 'سوق إلكتروني يجمع أفضل البائعين في مكان واحد مع حماية المشتري وإرجاع مرن.',
      copyright: 'السوق',
    },
    strings: { sliderButton: 'ابدأ الاستكشاف', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('featured-carousel', 'منتجات مميزة'),
      sec('tab-products', 'تصفح حسب القسم'),
    ],
    media: {
      sliderMain: '/themes/ecommece-marketplace/slider1.png',
      slideTwo: '/themes/ecommece-marketplace/slider2.png',
      slideThree: '/themes/ecommece-marketplace/slider3.png',
    },
  },

  /* -------------------------------------------- ecommerce-clothing
   * «أناقة» — Minimog-style women's boutique modeled on ilaboutique.com:
   * blush #F6D7D5 buttons with black text, pure-black typography on white,
   * hairline #ededed borders, square-ish cards and Zain/Jost type. */
  'ecommerce-clothing': {
    slug: 'ecommerce-clothing',
    name: 'أناقة',
    nameEn: 'Elegance',
    tagline: 'تشكيلات جديدة كل أسبوع',
    tokens: tok('#f6d7d5', '#e9bcb8', '#c94f4f', '#f8f8f8', '#000000', '#ededed', '4px', FONT_ZAIN, FONT_ZAIN),
    header: {
      topbarText: 'إصدارات محدودة — تشكيلات جديدة كل أسبوع ✦ شحن سريع لجميع المدن',
      phone: '+972559886886',
      email: 'hello@anaqa.store',
      socials: true,
      logoText: 'أناقة',
      menu: MENU,
    },
    footer: {
      about: 'بوتيك أزياء نسائية يقدّم قطعاً مختارة بعناية من أفخم الأقمشة وأرقى القصّات — إطلالة تليق بك في كل مناسبة.',
      copyright: 'أناقة',
    },
    strings: { sliderButton: 'اكتشفي التشكيلة', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    services: [
      { title: 'أسعار تنافسية', text: 'أفضل قيمة مقابل جودة لا تقبل المساومة', icon: 'tag' },
      { title: 'خدمة عملاء', text: 'فريقنا معك خطوة بخطوة عبر واتساب', icon: 'headset' },
      { title: 'جودة ممتازة', text: 'أقمشة مختارة وخياطة متينة', icon: 'shield' },
      { title: 'طرق دفع متعددة', text: 'ادفعي بالطريقة الأنسب لك بكل أمان', icon: 'wallet' },
    ],
    sections: [
      sec('slider'),
      sec('categories-box', 'جميع التصنيفات'),
      sec('hot-products', 'الأكثر مبيعاً'),
      sec('tab-products', 'أحدث المنتجات'),
      sec('featured-carousel', 'منتجات مميزة'),
      sec('services'),
    ],
    media: {
      sliderMain: '/themes/ecommerce-clothing/slider-1.jpg',
      slideTwo: '/themes/ecommerce-clothing/slider-2.jpg',
      slideThree: '/themes/ecommerce-clothing/slider-3.jpg',
      bannerOne: '/themes/ecommerce-clothing/banner-1.jpg',
      bannerTwo: '/themes/ecommerce-clothing/banner-2.jpg',
      catDresses: '/themes/ecommerce-clothing/cat-dresses.jpg',
      catRack: '/themes/ecommerce-clothing/cat-rack.jpg',
      catStyle: '/themes/ecommerce-clothing/cat-style.jpg',
      catFlatlay: '/themes/ecommerce-clothing/cat-flatlay.jpg',
    },
  },

  /* -------------------------------------------------- toys-school-store
   * «لعبتي» — playful toy & school-supplies storefront modeled loosely on
   * tthkar.ps: sunny yellow/coral/teal on white, rounded Baloo type,
   * circle category pills and real photography of toys/blocks/stationery. */
  'toys-school-store': {
    slug: 'toys-school-store',
    name: 'لعبتي',
    nameEn: 'Toyland',
    tagline: 'كل ما يفرح صغارك في مكان واحد',
    tokens: tok('#ffd23f', '#ff6b6b', '#4ecdc4', '#fff9ec', '#2b2540', '#ffe9b8', '20px', FONT_BALOO),
    header: {
      topbarText: '🎈 عروض العودة للمدارس — خصومات حتى 30% على القرطاسية',
      phone: '+970599112233',
      email: 'hello@toyland.store',
      socials: true,
      logoText: 'لعبتي',
      menu: MENU,
    },
    footer: {
      about: 'متجر ألعاب ومستلزمات مدرسية يقدّم منتجات آمنة وممتعة لصغارك بأسعار تنافسية وتوصيل سريع.',
      copyright: 'لعبتي',
    },
    strings: { sliderButton: 'تسوق الآن', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    services: [
      { title: 'ألعاب آمنة', text: 'مطابقة لمعايير السلامة العالمية', icon: 'shield' },
      { title: 'أسعار مناسبة', text: 'عروض دائمة على مستلزمات المدرسة', icon: 'tag' },
      { title: 'خدمة عملاء', text: 'فريقنا معك عبر واتساب في أي وقت', icon: 'headset' },
      { title: 'دفع متعدد', text: 'اختر طريقة الدفع الأنسب لك', icon: 'wallet' },
    ],
    sections: [
      sec('slider'),
      sec('categories-box', 'تسوق حسب القسم'),
      sec('hot-products', 'الأكثر مبيعاً'),
      sec('tab-products', 'تصفح مجموعتنا الكاملة'),
      sec('featured-carousel', 'عروض المناسبات'),
      sec('services'),
    ],
    media: {
      sliderMain: '/themes/toys-school-store/slider-1.jpg',
      slideTwo: '/themes/toys-school-store/cat-stationery.jpg',
      slideThree: '/themes/toys-school-store/cat-blocks.jpg',
      bannerOne: '/themes/toys-school-store/banner-balloons.jpg',
      catBlocks: '/themes/toys-school-store/cat-blocks.jpg',
      catStationery: '/themes/toys-school-store/cat-stationery.jpg',
      catDolls: '/themes/toys-school-store/slider-2.jpg',
      catGames: '/themes/toys-school-store/slider-3.jpg',
    },
  },

  /* ------------------------------------------ ecommerce-mega-store */
  'ecommerce-mega-store': {
    slug: 'ecommerce-mega-store',
    name: 'ميغا ستور',
    nameEn: 'Mega Store',
    tagline: 'عروض كبرى على كل ما تحتاجه',
    tokens: tok('#22233f', '#171830', '#f15f3d', '#f4f4f8', '#22233f', '#e3e3ec', '6px', FONT_TAJAWAL),
    header: {
      topbarText: '⚡ تخفيضات كبرى — خصومات حتى 50% لفترة محدودة',
      phone: '+966 55 999 0000',
      email: 'deals@megastore.sa',
      socials: true,
      logoText: 'ميغا ستور',
      menu: MENU,
    },
    footer: {
      about: 'ميغا ستور — كل شيء تحت سقف واحد: أجهزة وأزياء ومنزل وبقالة بأقل الأسعار.',
      copyright: 'ميغا ستور',
    },
    strings: { sliderButton: 'تسوّق التخفيضات', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('tab-products', 'تصفح حسب القسم'),
      sec('services'),
    ],
    media: {
      sliderMain: '/themes/ecommerce-mega-store/header-banner.png',
      slideElectronics: '/images/store/electronics.jpg',
      banner: '/themes/ecommerce-mega-store/banner.png',
    },
  },

  /* --------------------------------------- fashion-designer-mart */
  'fashion-designer-mart': {
    slug: 'fashion-designer-mart',
    name: 'ديزاينر',
    nameEn: 'Designer Mart',
    tagline: 'قطع حصرية لمن تميز حضوره',
    tokens: tok('#f1657d', '#1a1c22', '#f9a8b8', '#fdf2f4', '#1a1c22', '#f6dde2', '4px', FONT_CAIRO, FONT_AMIRI),
    header: {
      topbarText: 'إصدارات محدودة — الفخامة في أدق التفاصيل',
      phone: '+966 56 121 3435',
      email: 'atelier@designermart.sa',
      socials: true,
      logoText: 'ديزاينر',
      menu: MENU,
    },
    footer: {
      about: 'دار تصميم تقدّم كوتور وعبايات وقطعاً فاخرة بإنتاج محدود وخياطة يدوية راقية.',
      copyright: 'ديزاينر مارت',
    },
    strings: { sliderButton: 'اكتشف الكوليكشن', addToCart: 'أضف إلى الحقيبة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('hot-products', 'القطع الأكثر طلباً'),
      sec('contact-strip', 'احجز جلسة تنسيق خاصة'),
    ],
    media: {
      sliderMain: '/themes/fashion-designer-mart/slider1.png',
      slideTwo: '/themes/fashion-designer-mart/slider2.png',
      slideThree: '/themes/fashion-designer-mart/slider3.png',
    },
  },

  /* ------------------------------------------------- kids-fashion */
  'kids-fashion': {
    slug: 'kids-fashion',
    name: 'عالم الأطفال',
    nameEn: 'Kids World',
    tagline: 'ملابس وألعاب تُبهج الصغار',
    tokens: tok('#f98496', '#9085f9', '#b9b0ff', '#fdf0f3', '#3d4651', '#f7dbe2', '18px', FONT_BALOO),
    header: {
      topbarText: '🎉 تغليف هدايا مجاني لطلبات أطفالكم!',
      phone: '+966 55 246 8101',
      email: 'fun@kidsworld.sa',
      socials: true,
      logoText: 'عالم الأطفال',
      menu: MENU,
    },
    footer: {
      about: 'كل ما يبهج طفلك: ملابس قطنية مريحة وألعاب تعليمية آمنة ومعتمدة عالمياً.',
      copyright: 'عالم الأطفال',
    },
    strings: { sliderButton: 'دخلوا العالم', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('hot-products', 'الأكثر محبةً عند الصغار'),
      sec('categories-box', 'أقسام عالم الأطفال'),
    ],
    media: {
      sliderMain: '/themes/kids-fashion/header-banner.png',
      slideToys: '/images/store/kids-toys.jpg',
      slideClothes: '/images/store/kids-clothes.jpg',
    },
  },

  /* --------------------------------------------- marketplace-shop */
  'marketplace-shop': {
    slug: 'marketplace-shop',
    name: 'بازار',
    nameEn: 'Bazaar Shop',
    tagline: 'تشكيلة متنوعة مختارة بعناية',
    tokens: tok('#f98496', '#9085f9', '#b9b0ff', '#fdf2f4', '#3d4651', '#f7dbe2', '12px', FONT_TAJAWAL),
    header: {
      topbarText: 'منتجات مميزة بأسعار عادلة — تغليف أنيق للإهداء',
      phone: '+966 55 135 7924',
      email: 'hello@bazaar.sa',
      socials: true,
      logoText: 'بازار',
      menu: MENU,
    },
    footer: {
      about: 'بازار العائلة — منزل وأزياء وهدايا وإلكترونيات، نختار لك الأفضل فقط.',
      copyright: 'بازار',
    },
    strings: { sliderButton: 'تصفح البازار', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('shop-grid', 'تسوق البازار'),
      sec('categories-box', 'أقسام البازار'),
    ],
    media: {
      sliderMain: '/themes/marketplace-shop/banner.png',
      slideGifts: '/themes/marketplace-shop/banner1.png',
    },
  },

  /* ---------------------------------------- mega-store-woocommerce */
  'mega-store-woocommerce': {
    slug: 'mega-store-woocommerce',
    name: 'هايبر مارت',
    nameEn: 'Hyper Mart',
    tagline: 'كل شيء تحت سقف واحد',
    tokens: tok('#0069df', '#0051ad', '#e5a500', '#f2f7fd', '#000000', '#dbe8f7', '6px', FONT_TAJAWAL),
    header: {
      topbarText: '🚚 توصيل مجاني داخل المدينة للطلبات فوق 150 ريال',
      phone: '+966 55 864 2097',
      email: 'care@hypermart.sa',
      socials: true,
      logoText: 'هايبر مارت',
      menu: MENU,
    },
    footer: {
      about: 'هايبر مارت — تشكيلة واسعة من البقالة والإلكترونيات والأزياء والمنزل بأسعار الجملة.',
      copyright: 'هايبر مارت',
    },
    strings: { sliderButton: 'ابدأ التسوق', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('categories-box', 'تسوق حسب القسم'),
      sec('tab-products', 'الأكثر رواجاً في كل قسم'),
    ],
    media: {
      sliderMain: '/themes/mega-store-woocommerce/slider1.png',
      slideTwo: '/themes/mega-store-woocommerce/slider2.png',
      slideThree: '/themes/mega-store-woocommerce/slider3.png',
    },
  },

  /* ------------------------------------ restaurant-food-delivery */
  'restaurant-food-delivery': {
    slug: 'restaurant-food-delivery',
    name: 'المطعم',
    nameEn: 'Restaurant & Delivery',
    tagline: 'وجبات بحُب تصل إليك ساخنة',
    tokens: tok('#d31b27', '#a5121c', '#e5a500', '#fdf2f2', '#000000', '#f6dcdc', '12px', FONT_TAJAWAL),
    header: {
      topbarText: '🛵 توصيل مجاني داخل المدينة للطلبات فوق 50 ريال',
      phone: '+966 55 975 3108',
      email: 'order@matam.sa',
      socials: false,
      logoText: 'المطعم',
      menu: ['الرئيسية', 'قائمة الطعام', 'العروض', 'تواصل معنا'],
    },
    footer: {
      about: 'مطعمك المفضل — مشاوي على الفحم ووجبات شعبية أصيلة وتوصيل سريع ساخن.',
      copyright: 'المطعم',
    },
    strings: { sliderButton: 'اطلب وجبتك', addToCart: 'أضف للطلب', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('special-meal', 'قائمتنا'),
      sec('contact-strip', 'جاهز تطلب؟'),
    ],
    media: {
      sliderMain: '/themes/restaurant-food-delivery/slider1.png',
      slideGrills: '/themes/restaurant-food-delivery/slider2.png',
    },
  },

  /* -------------------------------------------- grocery-shopping */
  'grocery-shopping': {
    slug: 'grocery-shopping',
    name: 'بقالتك',
    nameEn: 'Grocery Shopping',
    tagline: 'طازج كل يوم حتى باب منزلك',
    tokens: tok('#ed1d3b', '#b8122a', '#EA5D5C', '#fdf1f2', '#000000', '#f8dbde', '10px', FONT_TAJAWAL),
    header: {
      topbarText: '🥬 خضار وفواكه طازجة يومياً — اطلب قبل 6 مساءً للتوصيل نفس اليوم',
      phone: '+966 55 501 4738',
      email: 'fresh@baqaltak.sa',
      socials: true,
      logoText: 'بقالتك',
      menu: MENU,
    },
    footer: {
      about: 'بقالتك الكاملة تصل لبابك — خضار وفواكه ومواد تموينية منتقاة يدوياً بأسعار الجملة.',
      copyright: 'بقالتك',
    },
    strings: { sliderButton: 'اطلب بقالتك', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('deal-of-day', 'عرض اليوم'),
      sec('shop-grid', 'منتجات طازجة'),
    ],
    media: {
      sliderMain: '/themes/grocery-shopping/slider1.png',
      slideTwo: '/themes/grocery-shopping/slider2.png',
      slideThree: '/themes/grocery-shopping/slider3.png',
    },
  },

  /* -------------------------------------------- super-mart-store */
  'super-mart-store': {
    slug: 'super-mart-store',
    name: 'سوبر مارت',
    nameEn: 'Super Mart Store',
    tagline: 'كل احتياجات المنزل بأفضل سعر',
    tokens: tok('#d31b27', '#a5121c', '#e5a500', '#fdf2f2', '#000000', '#f6dcdc', '8px', FONT_TAJAWAL),
    header: {
      topbarText: '🔥 عروض الأسبوع بأسعار الجملة — الكمية محدودة!',
      phone: '+966 55 682 9051',
      email: 'info@supermart.sa',
      socials: true,
      logoText: 'سوبر مارت',
      menu: MENU,
    },
    footer: {
      about: 'سوبر مارت — مواد غذائية ومنظفات ومستلزمات المنزل بتشكيلة واسعة وأسعار موفرة.',
      copyright: 'سوبر مارت',
    },
    strings: { sliderButton: 'تسوّق العروض', addToCart: 'أضف إلى السلة', readMore: 'اقرأ المزيد', viewAll: 'عرض الكل' },
    sections: [
      sec('slider'),
      sec('shop-grid', 'عروض هذا الأسبوع'),
      sec('services'),
    ],
    media: {
      sliderMain: '/themes/super-mart-store/banner-img1.png',
      slideTwo: '/themes/super-mart-store/banner-img2.png',
      slideThree: '/themes/super-mart-store/banner-img3.png',
    },
  },
};

/** Lookup a bespoke WP theme by catalog slug (null when not a WP port). */
export const getWpTheme = (slug?: string | null): WpThemeConfig | null => {
  const key = String(slug || '').trim();
  return WP_THEMES[key] || null;
};
