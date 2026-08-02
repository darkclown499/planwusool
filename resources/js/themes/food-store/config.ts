import { createMasalahConfig } from '../masalah-kit/createConfig';

export const foodConfig = createMasalahConfig({
  id: 'food',
  name: 'أغذية ومأكولات',
  sectorLabel: 'طعم أصيل من مصدر موثوق',
  colors: {
    primary: '#16a34a',
    primaryDark: '#15803d',
    primarySoft: '#f0fdf4',
    accent: '#84cc16',
    accentSoft: '#f7fee7',
    onPrimary: '#ffffff',
    gradientFrom: '#22c55e',
    gradientTo: '#15803d'
  },
  layout: {
    heroVariant: 'classic',
    gridCols: 5,
    cardStyle: 'horizontal',
    sectionMode: 'categories',
    stickySidebar: true
  },
  copy: {
    tagline: 'من مزرعتنا إلى مائدتك',
    heroTitle: 'أغذية طازجة ومنتجات طبيعية',
    heroSubtitle: 'فواكه، خضروات، منتجات ألبان ومخبوزات طازجة يومياً بجودة عالية وأسعار مناسبة.',
    heroCta: 'اطلب الآن',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'طازج يومياً', desc: 'منتجات طازجة تصل إليك في نفس اليوم.' },
      { title: 'مصادر موثوقة', desc: 'نختار مزارعنا بعناية لضمان الجودة.' },
      { title: 'أسعار مناسبة', desc: 'أسعار مخفضة على المنتجات الأساسية.' },
      { title: 'توصيل سريع', desc: 'توصيل خلال ساعتين داخل المدينة.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'المدينة المنورة', 'الرياض - شمال'],
    footerAbout: 'متجر أغذية طازجة يقدم منتجات غذائية طبيعية من مصادر موثوقة مع توصيل سريع بنفس اليوم.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن توفر المنتجات الغذائية الطازجة.'
  }
});
