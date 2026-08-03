import React, { createContext, useContext, ReactNode } from 'react';
import { useStorefrontLocale } from '../../contexts/StorefrontLocaleContext';
import { MasalahThemeConfig } from './MasalahThemeConfig';

export const DEFAULT_MASALAH_CONFIG: MasalahThemeConfig = {
  id: 'spices',
  name: 'عطارة وبهارات',
  sectorLabel: 'أعشاب وتوابل طبيعية',
  colors: {
    primary: '#ea580c',
    primaryDark: '#c2410c',
    primarySoft: '#fff7ed',
    accent: '#f59e0b',
    accentSoft: '#fef3c7',
    onPrimary: '#ffffff',
    gradientFrom: '#f97316',
    gradientTo: '#c2410c'
  },
  layout: {
    heroVariant: 'classic',
    gridCols: 5,
    cardStyle: 'vertical',
    sectionMode: 'categories',
    stickySidebar: true
  },
  copy: {
    tagline: 'من قلب الطبيعة إلى مطبخك',
    heroTitle: 'توابل وأعشاب طبيعية مختارة بعناية',
    heroSubtitle: 'أجود أنواع البهارات والعطارة الطازجة بأوزان تناسب احتياجك، توصيل سريع لجميع المناطق.',
    heroCta: 'تسوق الآن',
    featuresTitle: 'لماذا تختارنا؟',
    features: [
      { title: 'منتجات طبيعية', desc: 'خامات طازجة وخالية من المواد الحافظة.' },
      { title: 'أوزان مرنة', desc: 'تعبئة من 50 جرام وحتى الكيلو حسب حاجتك.' },
      { title: 'توصيل سريع', desc: 'نوصل طلبك حتى باب منزلك في نفس اليوم.' },
      { title: 'دفع عند الاستلام', desc: 'ادفع كاش أو بالشبكة عند استلام طلبك.' }
    ],
    deliveryTitle: 'مناطق التوصيل',
    deliveryAreas: ['الرياض', 'جدة', 'الدمام', 'مكة المكرمة', 'المدينة المنورة'],
    footerAbout: 'متجر إلكتروني متخصص في بيع العطارة والبهارات والأعشاب الطبيعية بجودة عالية وأسعار منافسة.',
    whatsappMessage: 'مرحباً! أرغب في الاستفسار عن منتجات العطارة المتوفرة لديكم.'
  }
};

const MasalahThemeContext = createContext<MasalahThemeConfig>(DEFAULT_MASALAH_CONFIG);

interface MasalahThemeProviderProps {
  config: MasalahThemeConfig;
  children: ReactNode;
}

export const MasalahThemeProvider: React.FC<MasalahThemeProviderProps> = ({ config, children }) => {
  const { t } = useStorefrontLocale();

  return (
    <MasalahThemeContext.Provider value={config}>
      {children}
    </MasalahThemeContext.Provider>
  );
};

export const useMasalahTheme = () => useContext(MasalahThemeContext);
