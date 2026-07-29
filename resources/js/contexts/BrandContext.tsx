import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { THEME_COLORS, type ThemeColor } from '@/hooks/use-appearance';
import { type LayoutPosition } from '@/contexts/LayoutContext';

export interface BrandSettings {
 logoDark: string;
 logoLight: string;
 favicon: string;
 titleText: string;
 footerText: string;
 themeColor: string;
 customColor: string;
 sidebarVariant: string;
 sidebarStyle: string;
 layoutDirection: string;
}

const DEFAULT_BRAND_SETTINGS: BrandSettings = {
 logoDark: '/images/logos/logo-dark.png',
 logoLight: '/images/logos/logo-light.png',
 favicon: '/images/logos/favicon.png',
 titleText: 'Wusool',
 footerText: '© 2024 Wusool. All rights reserved.',
 themeColor: 'green',
 customColor: '#10b77f',
 sidebarVariant: 'inset',
 sidebarStyle: 'plain',
 layoutDirection: 'rtl',
};

const getBrandSettings = (userSettings?: Record<string, string>): BrandSettings => {
 if (userSettings) {
 return {
 logoDark: userSettings.logoDark || DEFAULT_BRAND_SETTINGS.logoDark,
 logoLight: userSettings.logoLight || DEFAULT_BRAND_SETTINGS.logoLight,
 favicon: userSettings.favicon || DEFAULT_BRAND_SETTINGS.favicon,
 titleText: userSettings.titleText || DEFAULT_BRAND_SETTINGS.titleText,
 footerText: userSettings.footerText || DEFAULT_BRAND_SETTINGS.footerText,
 themeColor: userSettings.themeColor || DEFAULT_BRAND_SETTINGS.themeColor,
 customColor: userSettings.customColor || DEFAULT_BRAND_SETTINGS.customColor,
 sidebarVariant: userSettings.sidebarVariant || DEFAULT_BRAND_SETTINGS.sidebarVariant,
 sidebarStyle: userSettings.sidebarStyle || DEFAULT_BRAND_SETTINGS.sidebarStyle,
 layoutDirection: userSettings.layoutDirection || DEFAULT_BRAND_SETTINGS.layoutDirection,
   };
 }

 if (typeof localStorage === 'undefined') {
 return DEFAULT_BRAND_SETTINGS;
 }

 try {
 const savedSettings = localStorage.getItem('brandSettings');
 return savedSettings ? JSON.parse(savedSettings) : DEFAULT_BRAND_SETTINGS;
 } catch (error) {
 return DEFAULT_BRAND_SETTINGS;
 }
};

const applyThemeColor = (themeColor?: string, customColor?: string) => {
  if (typeof document === 'undefined' || !themeColor) return;

  const color = themeColor === 'custom' && customColor ? customColor : (THEME_COLORS[themeColor as keyof typeof THEME_COLORS] || THEME_COLORS.green);
  document.documentElement.style.setProperty('--theme-color', color);
  document.documentElement.style.setProperty('--primary', color);
  document.documentElement.style.setProperty('--primary-foreground', '#ffffff');
  document.documentElement.style.setProperty('--chart-1', color);
};

const applyDirectionToDOM = (direction?: string) => {
  if (typeof document === 'undefined' || !direction) return;
  if (direction !== 'rtl' && direction !== 'ltr') return;
  document.documentElement.dir = direction;
  document.documentElement.setAttribute('dir', direction);
};

interface BrandContextType extends BrandSettings {
  updateBrandSettings: (settings: Partial<BrandSettings>) => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export function BrandProvider({ children, globalSettings, user }: { children: ReactNode; globalSettings?: any; user?: any }) {
  const getEffectiveSettings = () => {
    const isPublicRoute = window.location.pathname.includes('/public/') || 
                         window.location.pathname === '/' || 
                         window.location.pathname.includes('/auth/');
    
    if (isPublicRoute) {
      return globalSettings;
    }
    
    const currentPageProps = (window as any)?.page?.props;
    if (currentPageProps?.systemSettings && user?.type !== 'superadmin') {
      return currentPageProps.systemSettings;
    }
    
    if (user?.role === 'company' && user?.globalSettings) {
      return user.globalSettings;
    }
    
    return globalSettings;
  };
  
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(() => {
    const effectiveSettings = getEffectiveSettings();
    return getBrandSettings(effectiveSettings);
  });

  useEffect(() => {
    const effectiveSettings = getEffectiveSettings();
    applyThemeColor(effectiveSettings?.themeColor, effectiveSettings?.customColor);
    applyDirectionToDOM(effectiveSettings?.layoutDirection);
  }, []);

  useEffect(() => {
    const effectiveSettings = getEffectiveSettings();
    const updatedSettings = getBrandSettings(effectiveSettings);
    setBrandSettings(updatedSettings);
    applyThemeColor(effectiveSettings?.themeColor, effectiveSettings?.customColor);
    applyDirectionToDOM(effectiveSettings?.layoutDirection);
  }, [globalSettings, user]);

  const updateBrandSettings = (newSettings: Partial<BrandSettings>) => {
    setBrandSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <BrandContext.Provider value={{ ...brandSettings, updateBrandSettings }}>
      {children}
    </BrandContext.Provider>
  );
}

export function useBrand() {
  const context = useContext(BrandContext);
  if (context === undefined) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
}