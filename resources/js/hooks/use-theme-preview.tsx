import { useEffect, useState } from 'react';
import { useAppearance, type ThemeColor } from '@/hooks/use-appearance';
import { useLayout, type LayoutPosition } from '@/contexts/LayoutContext';
import { useSidebarSettings } from '@/contexts/SidebarContext';
import { SidebarVariant, SidebarCollapsible } from '@/components/sidebar-style-settings';

export function useThemePreview() {
  const { themeColor } = useAppearance();
  const { position } = useLayout();
  const { variant, collapsible, style } = useSidebarSettings();
  
  const [debouncedSettings, setDebouncedSettings] = useState({
    themeColor,
    position,
    variant,
    collapsible,
    style
  });
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSettings({
        themeColor,
        position,
        variant,
        collapsible,
        style
      });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [themeColor, position, variant, collapsible, style]);
  
  return debouncedSettings;
}