import React from 'react';
import type { BuilderSectionMeta, BuilderSectionType, PlanTier } from './types';
import { AnnouncementSection } from './sections/Announcement';
import { HeaderSection } from './sections/Header';
import { HeroSection } from './sections/Hero';
import { CategoriesSection } from './sections/Categories';
import { ProductsSection } from './sections/Products';
import { OffersSection } from './sections/Offers';
import { BannersSection } from './sections/Banners';
import { FeaturesSection } from './sections/Features';
import { ReviewsSection } from './sections/Reviews';
import { FaqSection } from './sections/Faq';
import { VideoSection } from './sections/Video';
import { NewsletterSection } from './sections/Newsletter';
import { FooterSection } from './sections/Footer';
import { ContactSection } from './sections/Contact';
import { CustomSection } from './sections/Custom';
import { sectionDefaults } from './sections/helpers';

export type BuilderSectionComponent = React.ComponentType<any>;

const metas: Record<BuilderSectionType, BuilderSectionMeta> = {
  announcement: {
    type: 'announcement',
    name: 'شريط تنبيه',
    name_en: 'Announcement',
    group: 'أساسيات',
    group_en: 'Core',
    icon: 'megaphone',
    description: 'شريط يعلن عن عروض أو عروض ترويجية في أعلى الصفحة.',
    props: [
      { key: 'text', label: 'النص', label_en: 'Text', type: 'text', default: '', group: 'content' },
      { key: 'link', label: 'الرابط', label_en: 'Link', type: 'link', default: '', group: 'content' },
    ],
  },
  header: {
    type: 'header',
    name: 'الترويسة',
    name_en: 'Header',
    group: 'أساسيات',
    group_en: 'Core',
    icon: 'layout',
    description: 'شريط التنقل العلوي مع الشعار والبحث والسلة.',
    props: [
      { key: 'logo', label: 'شعار المتجر (صورة)', label_en: 'Logo image', type: 'image', default: '', group: 'content', hint: 'المقاس الموصى به: 250x100 بكسل' },
      { key: 'sticky', label: 'تثبيت أعلى الصفحة', label_en: 'Sticky', type: 'boolean', default: true, group: 'behavior' },
      { key: 'variant', label: 'نمط الترويسة', label_en: 'Header style', type: 'select', default: 'classic', group: 'layout', options: [
          { value: 'classic', label: 'قياسي (كلاسيكي)' },
          { value: 'floating', label: 'عائم (بطاقة مستديرة)' },
          { value: 'centered', label: 'شعار إلى المنتصف' },
          { value: 'minimal', label: 'بسيط' },
        ] },
      { key: 'show_search', label: 'إظهار البحث', label_en: 'Show search', type: 'boolean', default: true, group: 'behavior' },
      { key: 'show_cart', label: 'إظهار السلة', label_en: 'Show cart', type: 'boolean', default: true, group: 'behavior' },
      { key: 'show_auth', label: 'إظهار الدخول', label_en: 'Show login', type: 'boolean', default: true, group: 'behavior' },
      { key: 'show_whatsapp', label: 'إظهار زر واتساب', label_en: 'Show WhatsApp', type: 'boolean', default: true, group: 'behavior' },
    ],
  },
  hero: {
    type: 'hero',
    name: 'الواجهة (Hero)',
    name_en: 'Hero',
    group: 'أساسيات',
    group_en: 'Core',
    icon: 'sparkles',
    description: 'بانر الترحيب الرئيسي في أعلى المتجر مع زر إجراء.',
    props: [
      { key: 'layout', label: 'التخطيط', label_en: 'Layout', type: 'select', default: 'split', group: 'layout', options: [
          { value: 'split', label: 'نص وصورة' },
          { value: 'full', label: 'تدرج بعرض كامل' },
        ] },
      { key: 'hero_variant', label: 'نمط الواجهة', label_en: 'Hero style', type: 'select', default: 'split_banner', group: 'layout', options: [
          { value: 'split_banner', label: 'بانر منقسم (نص وصورة)' },
          { value: 'bento_grid', label: 'شبكة Bento (رئيسي + جانبي)' },
          { value: 'slider_full', label: 'سلايدر بعرض كامل' },
          { value: 'full_slider', label: 'سلايدر بانرات عالية الدقة' },
          { value: 'video_bg', label: 'خلفية فيديو متكررة' },
          { value: 'full', label: 'تدرج بعرض كامل' },
        ] },
      { key: 'title', label: 'العنوان', label_en: 'Title', type: 'text', default: '', group: 'content' },
      { key: 'subtitle', label: 'النص الفرعي', label_en: 'Subtitle', type: 'textarea', default: '', group: 'content' },
      { key: 'badge', label: 'شارة علوية', label_en: 'Badge', type: 'text', default: '', group: 'content' },
      { key: 'image', label: 'الصورة', label_en: 'Image', type: 'image', default: '', group: 'content' },
      { key: 'button_text', label: 'نص الزر', label_en: 'Button text', type: 'text', default: 'تسوّق الآن', group: 'content' },
      { key: 'button_link', label: 'رابط الزر', label_en: 'Button link', type: 'link', default: '#template-products', group: 'content' },
      { key: 'video', label: 'فيديو الخلفية / رابط الفيديو', label_en: 'Video URL', type: 'video', default: '', group: 'content', hint: 'يدعم يوتيوب، فيميو، أو رفع MP4' },
      { key: 'slides', label: 'شرائح إضافية (للسلايدر والبانرات)', label_en: 'Slides', type: 'slides', default: [], group: 'content' },
      { key: 'autoplay', label: 'تشغيل تلقائي للسلايدر', label_en: 'Autoplay', type: 'boolean', default: true, group: 'behavior' },
      { key: 'autoplay_delay', label: 'مدة كل شريحة (مللي ثانية)', label_en: 'Slide interval (ms)', type: 'number', default: 5000, group: 'behavior', hint: '3000 - 10000' },
      { key: 'effect', label: 'انتقال الشرائح', label_en: 'Transition', type: 'select', default: 'slide', group: 'layout', options: [
          { value: 'slide', label: 'انزلاق' },
          { value: 'fade', label: 'تلاشي' },
        ] },
      { key: 'show_dots', label: 'إظهار نقاط التنقل', label_en: 'Show pagination dots', type: 'boolean', default: true, group: 'behavior' },
    ],
  },
  categories: {
    type: 'categories',
    name: 'التصنيفات',
    name_en: 'Categories',
    group: 'منتجات',
    group_en: 'Products',
    icon: 'grid',
    description: 'شبكة أو أزرار للتصنيفات لتنقية المنتجات.',
    props: [
      { key: 'style', label: 'النمط', label_en: 'Style', type: 'select', default: 'cards', group: 'layout', options: [
          { value: 'cards', label: 'بطاقات ملونة' },
          { value: 'chips', label: 'أزرار' },
        ] },
      { key: 'category_variant', label: 'نمط التصنيفات', label_en: 'Categories style', type: 'select', default: 'card_pills', group: 'layout', options: [
          { value: 'icon_grid', label: 'شبكة أيقونات' },
          { value: 'card_pills', label: 'حبوب / بطاقات صغيرة' },
          { value: 'circle_pills', label: 'أيقونات دائرية' },
          { value: 'circle_slider', label: 'سلايدر دائري أفقي' },
          { value: 'grid_cards', label: 'بطاقات شبكية كبيرة' },
          { value: 'image_tiles', label: 'بلاطات صور' },
          { value: 'masonry_grid', label: 'شبكة Masonry متدرجة' },
          { value: 'minimalist_overlay', label: 'بسطية مع تظليل عند التحويم' },
          { value: 'horizontal_scroll', label: 'تمرير أفقي' },
        ] },
      { key: 'selected_categories', label: 'التصنيفات المعروضة', label_en: 'Shown categories', type: 'category_multiselect', default: [], group: 'content', hint: 'اتركه فارغاً لعرض جميع التصنيفات' },
      { key: 'show_all', label: 'زر الكل', label_en: 'Show all', type: 'boolean', default: true, group: 'behavior' },
      { key: 'columns', label: 'عدد الأعمدة', label_en: 'Columns', type: 'number', default: 4, group: 'layout' },
      { key: 'section_title', label: 'عنوان القسم', label_en: 'Title', type: 'text', default: 'تصنيفاتنا', group: 'content' },
    ],
  },
  products: {
    type: 'products',
    name: 'المنتجات',
    name_en: 'Products',
    group: 'منتجات',
    group_en: 'Products',
    icon: 'package',
    description: 'شبكة المنتجات مع خيارات عرض ومزيد من الأزرار.',
    props: [
      { key: 'layout', label: 'التخطيط', label_en: 'Layout', type: 'select', default: 'grid', group: 'layout', options: [
          { value: 'grid', label: 'شبكة' },
          { value: 'list', label: 'قائمة' },
        ] },
      { key: 'product_variant', label: 'نمط المنتجات', label_en: 'Products style', type: 'select', default: 'detailed_cards_with_badges', group: 'layout', options: [
          { value: 'compact_cards', label: 'بطاقات مضغوطة' },
          { value: 'compact_grid', label: 'شبكة مدمجة كثيفة' },
          { value: 'detailed_cards_with_badges', label: 'بطاقات مفصّلة + شارات' },
          { value: 'horizontal_scroll', label: 'تمرير أفقي' },
          { value: 'bento_products', label: 'منتجات Bento (مميز + شبكة)' },
          { value: 'tabbed_categories', label: 'تبويبات حسب التصنيف' },
          { value: 'list', label: 'قائمة أفقية' },
        ] },
      { key: 'columns', label: 'عدد الأعمدة', label_en: 'Columns', type: 'number', default: 4, group: 'layout' },
      { key: 'per_page', label: 'منتج لكل تحميل', label_en: 'Per page', type: 'number', default: 12, group: 'layout' },
      { key: 'featured_only', label: 'المميزة فقط', label_en: 'Featured only', type: 'boolean', default: false, group: 'content' },
      { key: 'section_title', label: 'عنوان القسم', label_en: 'Title', type: 'text', default: 'منتجاتنا', group: 'content' },
    ],
  },
  offers: {
    type: 'offers',
    name: 'العروض',
    name_en: 'Offers',
    group: 'تسويق',
    group_en: 'Marketing',
    icon: 'badge',
    description: 'بطاقات العروض الترويجية من لوحة التحكم.',
    props: [
      { key: 'section_title', label: 'عنوان القسم', label_en: 'Title', type: 'text', default: 'عروض خاصة', group: 'content' },
    ],
  },
  banners: {
    type: 'banners',
    name: 'بانرات',
    name_en: 'Banners',
    group: 'تسويق',
    group_en: 'Marketing',
    icon: 'image',
    description: 'بانر بعرض كامل مع نص وصورة وزر.',
    props: [
      { key: 'variant', label: 'نمط البانرات', label_en: 'Banners style', type: 'select', default: 'carousel', group: 'layout', options: [
          { value: 'carousel', label: 'سلايدر' },
          { value: 'grid', label: 'شبكة عمودين' },
          { value: 'stacked', label: 'عمود واحد' },
        ] },
      { key: 'title', label: 'العنوان', label_en: 'Title', type: 'text', default: '', group: 'content' },
      { key: 'subtitle', label: 'النص الفرعي', label_en: 'Subtitle', type: 'textarea', default: '', group: 'content' },
      { key: 'image', label: 'الصورة', label_en: 'Image', type: 'image', default: '', group: 'content' },
      { key: 'button_text', label: 'نص الزر', label_en: 'Button text', type: 'text', default: 'اكتشف المزيد', group: 'content' },
      { key: 'button_link', label: 'رابط الزر', label_en: 'Button link', type: 'link', default: '#template-products', group: 'content' },
    ],
  },
  features: {
    type: 'features',
    name: 'المزايا',
    name_en: 'Features',
    group: 'تسويق',
    group_en: 'Marketing',
    icon: 'shield',
    description: 'شبكة من الامتيازات مثل الشحن السريع والدفع الآمن.',
    props: [
      { key: 'section_title', label: 'عنوان القسم', label_en: 'Title', type: 'text', default: 'لماذا تختارنا؟', group: 'content' },
      { key: 'items', label: 'قائمة المزايا', label_en: 'Feature items', type: 'list', list: 'features', default: [], group: 'content', hint: 'اتركها فارغة لاستخدام مزايا المتجر الافتراضية' },
    ],
  },
  reviews: {
    type: 'reviews',
    name: 'التقييمات',
    name_en: 'Reviews',
    group: 'تواصل اجتماعي',
    group_en: 'Social',
    icon: 'star',
    description: 'آراء وتقييمات العملاء.',
    props: [
      { key: 'section_title', label: 'عنوان القسم', label_en: 'Title', type: 'text', default: 'آراء عملائنا', group: 'content' },
      { key: 'items', label: 'قائمة التقييمات', label_en: 'Review items', type: 'list', list: 'reviews', default: [], group: 'content', hint: 'اتركها فارغة لاستخدام تقييمات المتجر الافتراضية' },
      { key: 'display_mode', label: 'طريقة العرض', label_en: 'Display mode', type: 'select', default: 'grid', group: 'layout', options: [
          { value: 'grid', label: 'شبكة' },
          { value: 'slider', label: 'سلايدر أفقي' },
        ] },
    ],
  },
  faq: {
    type: 'faq',
    name: 'الأسئلة الشائعة',
    name_en: 'FAQ',
    group: 'تواصل اجتماعي',
    group_en: 'Social',
    icon: 'help',
    description: 'أسئلة وأجوبة قابلة للطي حول متجرك.',
    props: [{ key: 'section_title', label: 'عنوان القسم', label_en: 'Title', type: 'text', default: 'الأسئلة الشائعة', group: 'content' }],
  },
  video: {
    type: 'video',
    name: 'فيديو',
    name_en: 'Video',
    group: 'تسويق',
    group_en: 'Marketing',
    icon: 'video',
    description: 'مقطع فيديو تعريفي من يوتيوب أو فيميو.',
    props: [
      { key: 'section_title', label: 'العنوان', label_en: 'Title', type: 'text', default: 'فيديو تعريفي', group: 'content' },
      { key: 'video_url', label: 'رابط الفيديو', label_en: 'Video URL', type: 'text', default: '', group: 'content' },
      { key: 'poster', label: 'صورة الغلاف', label_en: 'Poster', type: 'image', default: '', group: 'content' },
    ],
  },
  newsletter: {
    type: 'newsletter',
    name: 'النشرة البريدية',
    name_en: 'Newsletter',
    group: 'تسويق',
    group_en: 'Marketing',
    icon: 'mail',
    description: 'نموذج اشتراك لجمع البريد الإلكتروني.',
    props: [
      { key: 'section_title', label: 'العنوان', label_en: 'Title', type: 'text', default: 'اشترك في نشرتنا البريدية', group: 'content' },
      { key: 'subtitle', label: 'النص الفرعي', label_en: 'Subtitle', type: 'textarea', default: '', group: 'content' },
    ],
  },
  contact: {
    type: 'contact',
    name: 'تواصل معنا',
    name_en: 'Contact',
    group: 'تواصل اجتماعي',
    group_en: 'Social',
    icon: 'phone',
    description: 'بطاقات تواصل: واتساب، بريد، عنوان.',
    props: [
      { key: 'section_title', label: 'عنوان القسم', label_en: 'Title', type: 'text', default: 'تواصل معنا', group: 'content' },
      { key: 'hours', label: 'ساعات العمل', label_en: 'Hours', type: 'text', default: 'طوال أيام الأسبوع 9ص - 11م', group: 'content' },
    ],
  },
  footer: {
    type: 'footer',
    name: 'التذييل',
    name_en: 'Footer',
    group: 'أساسيات',
    group_en: 'Core',
    icon: 'panel-bottom',
    description: 'تذييل المتجر مع الروابط ووسائل التواصل.',
    props: [
      { key: 'show_social', label: 'إظهار وسائل التواصل', label_en: 'Show social', type: 'boolean', default: true, group: 'behavior' },
      { key: 'show_contact', label: 'إظهار معلومات الاتصال', label_en: 'Show contact', type: 'boolean', default: true, group: 'behavior' },
    ],
  },
  custom: {
    type: 'custom',
    name: 'قسم مخصص',
    name_en: 'Custom',
    group: 'أساسيات',
    group_en: 'Core',
    icon: 'code',
    description: 'كتلة HTML/كود مدمج حر.',
    props: [
      { key: 'html', label: 'HTML / كود مدمج', label_en: 'HTML', type: 'textarea', default: '', group: 'content' },
    ],
  },
};

const components: Record<BuilderSectionType, BuilderSectionComponent> = {
  announcement: AnnouncementSection,
  header: HeaderSection,
  hero: HeroSection,
  categories: CategoriesSection,
  products: ProductsSection,
  offers: OffersSection,
  banners: BannersSection,
  features: FeaturesSection,
  reviews: ReviewsSection,
  faq: FaqSection,
  video: VideoSection,
  newsletter: NewsletterSection,
  footer: FooterSection,
  contact: ContactSection,
  custom: CustomSection,
};

export const SECTION_TYPES = Object.keys(metas) as BuilderSectionType[];

export const getSectionMeta = (type: BuilderSectionType | string): BuilderSectionMeta | null =>
  metas[type as BuilderSectionType] || null;

export const getSectionComponent = (type: BuilderSectionType | string): BuilderSectionComponent | null =>
  components[type as BuilderSectionType] || null;

export const getAllSectionMetas = (): BuilderSectionMeta[] => SECTION_TYPES.map((t) => metas[t]);

export const defaultSectionProps = (type: BuilderSectionType): Record<string, any> => sectionDefaults(type);

/** Plan tier gating per section type (right panel visibility later). */
export const SECTION_TIER: Partial<Record<BuilderSectionType, Exclude<PlanTier, 'starter'>>> = {
  video: 'growth',
  reviews: 'growth',
  newsletter: 'growth',
};