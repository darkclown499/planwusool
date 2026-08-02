import { createMasalahConfig } from '../masalah-kit/createConfig';

export const fragrancesConfig = createMasalahConfig({
  id: 'fragrances',
  name: 'عطور ومسك',
  sectorLabel: 'عبق يدوم طوال اليوم',
  colors: {
    primary: '#d97706',
    primaryDark: '#b45309',
    primarySoft: '#fffbeb',
    accent: '#f59e0b',
    accentSoft: '#fef3c7',
    onPrimary: '#ffffff',
    gradientFrom: '#f59e0b',
    gradientTo: '#b45309'
  },
  layout: {
    heroVariant: 'minimal',
    gridCols: 4,
    cardStyle: 'vertical',
    sectionMode: 'featured',
    stickySidebar: true
  },
  copy: {
    tagline: 'عطور شرقية أصيلة',
    heroTitle: 'عطور ومسك ودهن عود فاخرة',
    heroSubtitle: 'تشكيلة فاخرة من العطور الشرقية والعربية والمسك الأصيل بأحجام تناسب الجميع.',
    heroCta: 'استكشف العطور',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'عبق يدوم طويلاً', desc: 'ثبات عالي يفوق 12 ساعة.' },
      { title: 'مكونات أصلية', desc: 'عطور أصلية من أشهر الدور العالمية.' },
      { title: 'أحجام متعددة', desc: 'من 20 مل حتى الحجم الاقتصادي.' },
      { title: 'هدايا أنيقة', desc: 'تغليف هدايا فاخر مجاني.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'بريدة', 'الأحساء'],
    footerAbout: 'متجر عطور فاخر يقدم أفضل العطور الشرقية والعربية والمسك الأصيل بثبات عالي وأسعار مميزة.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن العطور المتوفرة لديكم.'
  }
});
