import { createMasalahConfig } from '../masalah-kit/createConfig';

export const electronicsConfig = createMasalahConfig({
  id: 'electronics',
  name: 'إلكترونيات',
  sectorLabel: 'أحدث الأجهزة الذكية',
  colors: {
    primary: '#2563eb',
    primaryDark: '#1d4ed8',
    primarySoft: '#eff6ff',
    accent: '#0ea5e9',
    accentSoft: '#e0f2fe',
    onPrimary: '#ffffff',
    gradientFrom: '#3b82f6',
    gradientTo: '#1d4ed8'
  },
  layout: {
    heroVariant: 'classic',
    gridCols: 4,
    cardStyle: 'vertical',
    sectionMode: 'featured',
    stickySidebar: true
  },
  copy: {
    tagline: 'تقنية تسبق عصرها',
    heroTitle: 'أحدث الأجهزة الإلكترونية بأسعار تنافسية',
    heroSubtitle: 'هواتف، إكسسوارات، أجهزة ذكية وأدوات منزلية كهربائية مع ضمان حقيقي ودعم فني.',
    heroCta: 'اكتشف المنتجات',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'ضمان حقيقي', desc: 'ضمان معتمد على جميع الأجهزة.' },
      { title: 'أسعار منافسة', desc: 'أفضل سعر مع خيارات تقسيط مرنة.' },
      { title: 'شحن سريع', desc: 'توصيل سريع وآمن لجميع المدن.' },
      { title: 'دعم فني', desc: 'فريق دعم متواجد لحل أي مشكلة.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الخبر', 'مكة المكرمة', 'حائل'],
    footerAbout: 'متجر إلكترونيات يوفر أحدث الأجهزة الذكية والإلكترونيات الأصلية مع ضمان معتمد وخدمة عملاء مميزة.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن توفر جهاز إلكتروني لديكم.'
  }
});
