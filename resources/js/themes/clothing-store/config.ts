import { createMasalahConfig } from '../masalah-kit/createConfig';

export const clothingConfig = createMasalahConfig({
  id: 'clothing',
  name: 'ملابس وأزياء',
  sectorLabel: 'أحدث صيحات الموضة',
  colors: {
    primary: '#7c3aed',
    primaryDark: '#6d28d9',
    primarySoft: '#f5f3ff',
    accent: '#a855f7',
    accentSoft: '#f3e8ff',
    onPrimary: '#ffffff',
    gradientFrom: '#8b5cf6',
    gradientTo: '#6d28d9'
  },
  layout: {
    heroVariant: 'banner',
    gridCols: 4,
    cardStyle: 'vertical',
    sectionMode: 'featured',
    stickySidebar: true
  },
  copy: {
    tagline: 'أناقة تليق بك',
    heroTitle: 'تشكيلات عصرية تناسب ذوقك',
    heroSubtitle: 'ملابس رجالية ونسائية وأطفال بأحدث الصيحات، خامات عالية الجودة ومقاسات متعددة.',
    heroCta: 'تصفح المجموعة',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'جودة عالية', desc: 'أقمشة مريحة ومتينة تدوم طويلاً.' },
      { title: 'مقاسات متعددة', desc: 'مقاسات تناسب جميع الأجسام والأعمار.' },
      { title: 'توصيل سريع', desc: 'نوصل طلبك أينما كنت خلال أيام قليلة.' },
      { title: 'إرجاع سهل', desc: 'إمكانية استبدال المنتج خلال 14 يوم.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'أبها', 'تبوك'],
    footerAbout: 'متجر ملابس وأزياء يقدم أحدث التشكيلات العصرية للرجال والنساء والأطفال بجودة عالية وأسعار مناسبة.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن مقاسات المنتجات المتوفرة لديكم.'
  }
});
