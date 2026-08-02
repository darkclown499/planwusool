import { createMasalahConfig } from '../masalah-kit/createConfig';

export const sportsConfig = createMasalahConfig({
  id: 'sports',
  name: 'رياضة ولياقة',
  sectorLabel: 'نحو حياة نشيطة',
  colors: {
    primary: '#65a30d',
    primaryDark: '#4d7c0f',
    primarySoft: '#f7fee7',
    accent: '#22c55e',
    accentSoft: '#dcfce7',
    onPrimary: '#ffffff',
    gradientFrom: '#84cc16',
    gradientTo: '#4d7c0f'
  },
  layout: {
    heroVariant: 'classic',
    gridCols: 4,
    cardStyle: 'horizontal',
    sectionMode: 'categories',
    stickySidebar: true
  },
  copy: {
    tagline: 'قوتك تبدأ بخطوة',
    heroTitle: 'مستلزمات رياضية ولياقة بدنية',
    heroSubtitle: 'ملابس رياضية، أحذية، أجهزة تمارين ومكملات غذائية لتحقيق أهدافك الرياضية.',
    heroCta: 'ابدأ التمرين',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'علامات عالمية', desc: 'منتجات أصلية من أشهر الماركات.' },
      { title: 'جودة احترافية', desc: 'معدات بمستوى النوادي الرياضية.' },
      { title: 'نصائح مجانية', desc: 'إرشادات من خبراء اللياقة.' },
      { title: 'شحن سريع', desc: 'توصيل سريع لمعداتك الرياضية.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'الطائف', 'نجران'],
    footerAbout: 'متجر رياضة ولياقة يقدم أحدث الملابس والمعدات الرياضية الأصلية لمساعدتك على تحقيق أهدافك.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن المعدات الرياضية المتوفرة لديكم.'
  }
});
