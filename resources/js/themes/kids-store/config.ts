import { createMasalahConfig } from '../masalah-kit/createConfig';

export const kidsConfig = createMasalahConfig({
  id: 'kids',
  name: 'أطفال ومواليد',
  sectorLabel: 'لأطفالنا أجمل الأشياء',
  colors: {
    primary: '#06b6d4',
    primaryDark: '#0891b2',
    primarySoft: '#ecfeff',
    accent: '#facc15',
    accentSoft: '#fef9c3',
    onPrimary: '#ffffff',
    gradientFrom: '#22d3ee',
    gradientTo: '#0891b2'
  },
  layout: {
    heroVariant: 'banner',
    gridCols: 5,
    cardStyle: 'vertical',
    sectionMode: 'featured',
    stickySidebar: true
  },
  copy: {
    tagline: 'أمان وسعادة لأطفالك',
    heroTitle: 'مستلزمات أطفال ومواليد بأعلى معايير الأمان',
    heroSubtitle: 'ألعاب تعليمية، ملابس مواليد، حفاضات وعناية ببشرة الطفل، منتجات آمنة ومعتمدة.',
    heroCta: 'تسوق للأطفال',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'آمن 100%', desc: 'منتجات معتمدة خالية من المواد الضارة.' },
      { title: 'خامات ناعمة', desc: 'أقمشة صديقة لبشرة الطفل.' },
      { title: 'أسعار مناسبة', desc: 'عروض دائمة على مستلزمات المواليد.' },
      { title: 'توصيل سريع', desc: 'نوصل أغراضك بأسرع وقت.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'الرياض - شرق', 'جدة - حي الروضة'],
    footerAbout: 'متجر مستلزمات أطفال ومواليد يوفر منتجات آمنة وعالية الجودة من ألعاب وملابس وعناية بأحدث الماركات.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن مستلزمات الأطفال المتوفرة لديكم.'
  }
});
