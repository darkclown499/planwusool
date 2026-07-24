import { ThemeComponent, BaseThemeProps } from '../types/theme';
import { GadgetsStore } from '../themes/gadgets-store/GadgetsStore';
import { HomeDecorStore } from '../themes/home-decor-store/HomeDecorStore';
import { BakeryStore } from '../themes/bakery-store/BakeryStore';
import { SupermarketStore } from '../themes/supermarket-store/SupermarketStore';
import { CarAccessoriesStore } from '../themes/car-accessories-store/CarAccessoriesStore';
import { ToyStore } from '../themes/toy-store/ToyStore';
import { FashionStore } from '../themes/fashion-store/FashionStore';

// Theme registry
const themes: Record<string, ThemeComponent> = {
  gadgets: GadgetsStore,
  'home-decor': HomeDecorStore,
  bakery: BakeryStore,
  supermarket: SupermarketStore,
  'car-accessories': CarAccessoriesStore,
  'toy': ToyStore,
  fashion: FashionStore,
};

/**
 * Get theme component by theme name
 */
export const getThemeComponent = (themeName: string): ThemeComponent => {
  const theme = themes[themeName];
  
  if (!theme) {
    console.warn(`Theme "${themeName}" not found, falling back to gadgets theme`);
    return themes.gadgets;
  }
  
  return theme;
};

/**
 * Register a new theme
 */
export const registerTheme = (name: string, component: ThemeComponent): void => {
  themes[name] = component;
};

/**
 * Get all available theme names
 */
export const getAvailableThemes = (): string[] => {
  return Object.keys(themes);
};

/**
 * Check if theme exists
 */
export const themeExists = (themeName: string): boolean => {
  return themeName in themes;
};