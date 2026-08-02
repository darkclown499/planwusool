import { createMasalahConfig } from '../masalah-kit/createConfig';

export const stationeryBooksConfig = createMasalahConfig({
  id: 'stationery-books',
  name: 'قرطاسية وكتب',
  sectorLabel: 'شركاء الإبداع والمعرفة',
  colors: {
    primary: '#334155',
    primaryDark: '#1e293b',
    primarySoft: '#f8fafc',
    accent: '#6366f1',
    accentSoft: '#e0e7ff',
    onPrimary: '#ffffff',
    gradientFrom: '#475569',
    gradientTo: '#1e293b'
  },
  layout: {
    heroVariant: 'minimal',
    gridCols: 5,
    cardStyle: 'vertical',
    sectionMode: 'featured',
    stickySidebar: true
  },
  copy: {
    tagline: 'لمكتبك ودراستك كل ما تحتاج',
    heroTitle: 'قرطاسية ومستلزمات مكتبية وكمية من الكتب',
    heroSubtitle: 'أدوات كتابة، مكاتب، لوازم طلابية وكتب عربية وعالمية بأسعار تنافسية وجودة عالية.',
    heroCta: 'تصفح المنتجات',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'تشكيلة شاملة', desc: 'كل مستلزمات المكتب والدراسة في مكان واحد.' },
      { title: 'كتب متنوعة', desc: 'أحدث الإصدارات العربية والعالمية.' },
      { title: 'أسعار خاصة', desc: 'خصومات دائمة للطلاب والمكاتب.' },
      { title: 'توصيل للمكاتب', desc: 'خدمة توصيل خاصة للشركات والمدارس.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'الدمام - جامعة', 'الرياض - جامعة'],
    footerAbout: 'متجر قرطاسية وكتب يقدم كل مستلزمات المكاتب والدراسة إضافة إلى أحدث الإصدارات من الكتب.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن القرطاسية والكتب المتوفرة لديكم.'
  }
});
