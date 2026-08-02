import { createMasalahConfig } from '../masalah-kit/createConfig';

export const cosmeticsConfig = createMasalahConfig({
  id: 'cosmetics',
  name: 'مستحضرات التجميل',
  sectorLabel: 'جمالك يبدأ من هنا',
  colors: {
    primary: '#db2777',
    primaryDark: '#be185d',
    primarySoft: '#fdf2f8',
    accent: '#d4a017',
    accentSoft: '#fef9c3',
    onPrimary: '#ffffff',
    gradientFrom: '#ec4899',
    gradientTo: '#be185d'
  },
  layout: {
    heroVariant: 'banner',
    gridCols: 4,
    cardStyle: 'vertical',
    sectionMode: 'featured',
    stickySidebar: true
  },
  copy: {
    tagline: 'لمسة جمال تخطف الأنظار',
    heroTitle: 'مستحضرات تجميل وعناية فاخرة',
    heroSubtitle: 'أفخم ماركات العناية بالبشرة والشعر والمكياج، منتجات أصلية 100% بنتائج مضمونة.',
    heroCta: 'اكتشفي الجمال',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'منتجات أصلية', desc: 'ماركات عالمية أصلية 100%.' },
      { title: 'لجميع أنواع البشرة', desc: 'منتجات تناسب جميع أنواع البشرة.' },
      { title: 'تغليف أنيق', desc: 'تغليف هدايا فاخر عند الطلب.' },
      { title: 'دفع عند الاستلام', desc: 'ادفعي عند وصول طلبك.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'الطائف', 'الخرج'],
    footerAbout: 'متجر متخصص في مستحضرات التجميل والعناية بالبشرة والشعر بأحدث الماركات العالمية والمنتجات الأصلية.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن منتجات العناية بالبشرة المتوفرة لديكم.'
  }
});
