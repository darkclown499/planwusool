export interface MasalahBrandColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  onPrimary: string;
  gradientFrom: string;
  gradientTo: string;
}

export type MasalahHeroVariant = 'classic' | 'banner' | 'minimal';
export type MasalahCardStyle = 'vertical' | 'horizontal';

export interface MasalahLayoutConfig {
  heroVariant: MasalahHeroVariant;
  gridCols: number;
  cardStyle: MasalahCardStyle;
  sectionMode: 'categories' | 'featured';
  stickySidebar: boolean;
}

export interface MasalahFeature {
  title: string;
  desc: string;
}

export interface MasalahCopy {
  tagline: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  featuresTitle: string;
  features: MasalahFeature[];
  deliveryTitle: string;
  deliveryAreas: string[];
  footerAbout: string;
  whatsappMessage: string;
}

export interface MasalahThemeConfig {
  id: string;
  name: string;
  sectorLabel: string;
  colors: MasalahBrandColors;
  layout: MasalahLayoutConfig;
  copy: MasalahCopy;
}
