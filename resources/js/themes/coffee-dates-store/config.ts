import { createMasalahConfig } from '../masalah-kit/createConfig';

export const coffeeDatesConfig = createMasalahConfig({
  id: 'coffee-dates',
  name: 'قهوة وتمور',
  sectorLabel: 'نكهة أصيلة وكرم الضيافة',
  colors: {
    primary: '#92400e',
    primaryDark: '#78350f',
    primarySoft: '#fef3c7',
    accent: '#b45309',
    accentSoft: '#fffbeb',
    onPrimary: '#ffffff',
    gradientFrom: '#b45309',
    gradientTo: '#78350f'
  },
  layout: {
    heroVariant: 'classic',
    gridCols: 5,
    cardStyle: 'vertical',
    sectionMode: 'categories',
    stickySidebar: true
  },
  copy: {
    tagline: 'قهوة مختصة وتمور فاخرة',
    heroTitle: 'قهوة عربية وتمور بجودة عالية',
    heroSubtitle: 'أجود أنواع البن المختص والتمور الفاخرة، محمصة وطازجة، من نخبة المزارع السعودية.',
    heroCta: 'اطلب من هنا',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'تحميص طازج', desc: 'نقوم بتحميص القهوة عند الطلب.' },
      { title: 'تمور فاخرة', desc: 'أصناف مختارة من أجود المزارع.' },
      { title: 'تغليف هدايا', desc: 'علب هدايا راقية للمناسبات.' },
      { title: 'توصيل سريع', desc: 'توصيل لجميع مناطق المملكة.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'القصيم', 'المدينة المنورة'],
    footerAbout: 'متجر قهوة مختصة وتمور فاخرة يقدم أجود البن المحمص طازجاً وأفضل أصناف التمور السعودية.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن أنواع القهوة والتمور المتوفرة لديكم.'
  }
});
