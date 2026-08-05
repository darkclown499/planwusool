import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SidebarSettings } from '@/components/sidebar-style-settings';

type SidebarContextType = {
  variant: SidebarSettings['variant'];
  collapsible: SidebarSettings['collapsible'];
  style: string;
  updateVariant: (variant: SidebarSettings['variant']) => void;
  updateCollapsible: (collapsible: SidebarSettings['collapsible']) => void;
  updateStyle: (style: string) => void;
};

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

// Extended sidebar settings with style
interface ExtendedSidebarSettings extends SidebarSettings {
  style: string;
}

// Default sidebar settings with style
const DEFAULT_EXTENDED_SETTINGS: ExtendedSidebarSettings = {
  variant: 'inset',
  collapsible: 'icon',
  style: 'plain'
};

// Get extended sidebar settings from localStorage
const getExtendedSidebarSettings = (): ExtendedSidebarSettings => {
  if (typeof localStorage === 'undefined') {
    return DEFAULT_EXTENDED_SETTINGS;
  }
  
  try {
    const savedSettings = localStorage.getItem('sidebarSettings');
    return savedSettings ? JSON.parse(savedSettings) : DEFAULT_EXTENDED_SETTINGS;
  } catch {
    return DEFAULT_EXTENDED_SETTINGS;
  }
};

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<ExtendedSidebarSettings>(getExtendedSidebarSettings());

  // Update variant
  const updateVariant = useCallback((variant: SidebarSettings['variant']) => {
    setSettings(prev => ({ ...prev, variant }));
  }, []);

  // Update collapsible
  const updateCollapsible = useCallback((collapsible: SidebarSettings['collapsible']) => {
    setSettings(prev => ({ ...prev, collapsible }));
  }, []);

  // Update style
  const updateStyle = useCallback((style: string) => {
    setSettings(prev => ({ ...prev, style }));
  }, []);

  // Persist settings after state settles. Skips the write when the serialized
  // value is unchanged so a storage round-trip from another tab never loops.
  useEffect(() => {
    try {
      const serialized = JSON.stringify(settings);
      if (localStorage.getItem('sidebarSettings') === serialized) return;
      localStorage.setItem('sidebarSettings', serialized);
    } catch (error) {
      console.error('Failed to save sidebar settings', error);
    }
  }, [settings]);

  useEffect(() => {
    // Listen for storage events to update settings when changed from another tab
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== 'sidebarSettings' || !event.newValue) return;
      try {
        const newSettings = JSON.parse(event.newValue) as ExtendedSidebarSettings;
        setSettings(prev => {
          if (
            prev.variant === newSettings.variant &&
            prev.collapsible === newSettings.collapsible &&
            prev.style === newSettings.style
          ) {
            return prev;
          }
          return newSettings;
        });
      } catch (error) {
        console.error('Failed to parse sidebar settings', error);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = useMemo(
    () => ({
      variant: settings.variant,
      collapsible: settings.collapsible,
      style: settings.style,
      updateVariant,
      updateCollapsible,
      updateStyle
    }),
    [settings.variant, settings.collapsible, settings.style, updateVariant, updateCollapsible, updateStyle]
  );

  return (
    <SidebarContext.Provider value={value}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarSettings = () => {
  const context = useContext(SidebarContext);
  if (!context) throw new Error('useSidebarSettings must be used within SidebarProvider');
  return context;
};
