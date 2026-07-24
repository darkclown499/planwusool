import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getBrandSettings, type BrandSettings } from '@/pages/settings/components/brand-settings';

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
    if (effectiveSettings?.themeMode && typeof window !== 'undefined') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = effectiveSettings.themeMode === 'dark' || 
        (effectiveSettings.themeMode === 'system' && systemDark);
      
      document.documentElement.classList.toggle('dark', isDark);
      document.body.classList.toggle('dark', isDark);
    }
  }, []);

  useEffect(() => {
    const effectiveSettings = getEffectiveSettings();
    const updatedSettings = getBrandSettings(effectiveSettings);
    setBrandSettings(updatedSettings);
    if (effectiveSettings?.themeMode && typeof window !== 'undefined') {
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = effectiveSettings.themeMode === 'dark' || 
        (effectiveSettings.themeMode === 'system' && systemDark);
      
      if (isDark) {
        document.documentElement.classList.add('dark');
        document.body.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
        document.body.classList.remove('dark');
      }
    }
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