import { createMasalahConfig } from '../masalah-kit/createConfig';

export const jewelryGoldConfig = createMasalahConfig({
  id: 'jewelry-gold',
  name: 'مجوهرات وذهبيات',
  sectorLabel: 'تألق يليق بك',
  colors: {
    primary: '#b45309',
    primaryDark: '#92400e',
    primarySoft: '#fefce8',
    accent: '#eab308',
    accentSoft: '#fef9c3',
    onPrimary: '#ffffff',
    gradientFrom: '#eab308',
    gradientTo: '#92400e'
  },
  layout: {
    heroVariant: 'minimal',
    gridCols: 4,
    cardStyle: 'vertical',
    sectionMode: 'featured',
    stickySidebar: true
  },
  copy: {
    tagline: 'لمسة فاخرة تدوم',
    heroTitle: 'مجوهرات ذهبية فاخرة بلمسة فنية',
    heroSubtitle: 'تشكيلة راقية من الذهب والألماس والأحجار الكريمة، تصميمات حصرية تناسب كل المناسبات.',
    heroCta: 'اكتشف التشكيلة',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'ذهب أصلي', desc: 'قطع مضمونة بشهادة نقاء.' },
      { title: 'تصميمات حصرية', desc: 'تشكيلة فريدة من الموديلات.' },
      { title: 'تغليف فاخر', desc: 'علب مجوهرات راقية مع هدية.' },
      { title: 'ضمان حقيقي', desc: 'ضمان معتمد على جميع القطع.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'الرياض - العليا', 'الخبر'],
    footerAbout: 'متجر مجوهرات فاخر يقدم قطع الذهب والألماس الأصلية بتصميمات حصرية وأسعار تنافسية.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن القطع الذهبية المتوفرة لديكم.'
  }
});
