import { createMasalahConfig } from '../masalah-kit/createConfig';

export const homeToolsConfig = createMasalahConfig({
  id: 'home-tools',
  name: 'أدوات منزلية',
  sectorLabel: 'كل ما يلزم بيتك',
  colors: {
    primary: '#0d9488',
    primaryDark: '#0f766e',
    primarySoft: '#f0fdfa',
    accent: '#14b8a6',
    accentSoft: '#ccfbf1',
    onPrimary: '#ffffff',
    gradientFrom: '#14b8a6',
    gradientTo: '#0d9488'
  },
  layout: {
    heroVariant: 'classic',
    gridCols: 4,
    cardStyle: 'vertical',
    sectionMode: 'categories',
    stickySidebar: true
  },
  copy: {
    tagline: 'بيتك يستحق الأفضل',
    heroTitle: 'أدوات منزلية ومستلزمات مطبخ عملية',
    heroSubtitle: 'أدوات مطبخ، تنظيف، تخزين وأجهزة منزلية بجودة عالية تجعل حياتك أسهل وأكثر تنظيماً.',
    heroCta: 'تسوق الآن',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'منتجات عملية', desc: 'أدوات تسهل حياتك اليومية.' },
      { title: 'جودة مضمونة', desc: 'خامات متينة وآمنة للاستخدام.' },
      { title: 'تنوع كبير', desc: 'مئات المنتجات لكل ركن في منزلك.' },
      { title: 'توصيل سريع', desc: 'نوصل طلبك حتى باب البيت.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'عنيزة', 'الخبر'],
    footerAbout: 'متجر أدوات منزلية شامل يقدم كل ما تحتاجه لبيتك من أدوات مطبخ وتنظيف وتخزين بجودة عالية.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن الأدوات المنزلية المتوفرة لديكم.'
  }
});
