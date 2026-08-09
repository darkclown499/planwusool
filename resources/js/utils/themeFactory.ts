import React from 'react';
import { ThemeComponent } from '../types/theme';

// Lazy theme registry. Themes are loaded on demand (via React.lazy) so that
// importing this module never pulls all 30 theme bundles into one chunk.
const themeLoaders: Record<string, React.LazyExoticComponent<ThemeComponent>> = {
  gadgets: React.lazy(() => import('../themes/gadgets-store/GadgetsStore').then(m => ({ default: m.GadgetsStore }))),
  'home-decor': React.lazy(() => import('../themes/home-decor-store/HomeDecorStore').then(m => ({ default: m.HomeDecorStore }))),
  bakery: React.lazy(() => import('../themes/bakery-store/BakeryStore').then(m => ({ default: m.BakeryStore }))),
  supermarket: React.lazy(() => import('../themes/supermarket-store/SupermarketStore').then(m => ({ default: m.SupermarketStore }))),
  'car-accessories': React.lazy(() => import('../themes/car-accessories-store/CarAccessoriesStore').then(m => ({ default: m.CarAccessoriesStore }))),
  toy: React.lazy(() => import('../themes/toy-store/ToyStore').then(m => ({ default: m.ToyStore }))),
  fashion: React.lazy(() => import('../themes/fashion-store/FashionStore').then(m => ({ default: m.FashionStore }))),
  perfumes: React.lazy(() => import('../themes/perfumes-store/PerfumesStore').then(m => ({ default: m.PerfumesStore }))),
  jewelry: React.lazy(() => import('../themes/jewelry-store/JewelryStore').then(m => ({ default: m.JewelryStore }))),
  beauty: React.lazy(() => import('../themes/beauty-store/BeautyStore').then(m => ({ default: m.BeautyStore }))),
  pharmacy: React.lazy(() => import('../themes/pharmacy-store/PharmacyStore').then(m => ({ default: m.PharmacyStore }))),
  books: React.lazy(() => import('../themes/books-store/BooksStore').then(m => ({ default: m.BooksStore }))),
  sport: React.lazy(() => import('../themes/sport-store/SportStore').then(m => ({ default: m.SportStore }))),
  pets: React.lazy(() => import('../themes/pets-store/PetsStore').then(m => ({ default: m.PetsStore }))),
  flowers: React.lazy(() => import('../themes/flowers-store/FlowersStore').then(m => ({ default: m.FlowersStore }))),
  coffee: React.lazy(() => import('../themes/coffee-store/CoffeeStore').then(m => ({ default: m.CoffeeStore }))),
  stationery: React.lazy(() => import('../themes/stationery-store/StationeryStore').then(m => ({ default: m.StationeryStore }))),
  spices: React.lazy(() => import('../themes/spices-store/SpicesStore').then(m => ({ default: m.SpicesStore }))),
  clothing: React.lazy(() => import('../themes/clothing-store/ClothingStore').then(m => ({ default: m.ClothingStore }))),
  electronics: React.lazy(() => import('../themes/electronics-store/ElectronicsStore').then(m => ({ default: m.ElectronicsStore }))),
  cosmetics: React.lazy(() => import('../themes/cosmetics-store/CosmeticsStore').then(m => ({ default: m.CosmeticsStore }))),
  food: React.lazy(() => import('../themes/food-store/FoodStore').then(m => ({ default: m.FoodStore }))),
  fragrances: React.lazy(() => import('../themes/fragrances-store/FragrancesStore').then(m => ({ default: m.FragrancesStore }))),
  'home-tools': React.lazy(() => import('../themes/home-tools-store/HomeToolsStore').then(m => ({ default: m.HomeToolsStore }))),
  'coffee-dates': React.lazy(() => import('../themes/coffee-dates-store/CoffeeDatesStore').then(m => ({ default: m.CoffeeDatesStore }))),
  'jewelry-gold': React.lazy(() => import('../themes/jewelry-gold-store/JewelryGoldStore').then(m => ({ default: m.JewelryGoldStore }))),
  kids: React.lazy(() => import('../themes/kids-store/KidsStore').then(m => ({ default: m.KidsStore }))),
  sports: React.lazy(() => import('../themes/sports-store/SportsStore').then(m => ({ default: m.SportsStore }))),
  'stationery-books': React.lazy(() => import('../themes/stationery-books-store/StationeryBooksStore').then(m => ({ default: m.StationeryBooksStore }))),
};

/**
 * Get theme component by theme name
 */
export const getThemeComponent = (themeName: string): ThemeComponent => {
  const theme = themeLoaders[themeName];

  if (!theme) {
    console.warn(`Theme "${themeName}" not found, falling back to gadgets theme`);
    return themeLoaders.gadgets;
  }

  return theme;
};

/**
 * Register a new theme
 */
export const registerTheme = (name: string, loader: () => Promise<{ default: ThemeComponent }>): void => {
  themeLoaders[name] = React.lazy(loader as () => Promise<{ default: ThemeComponent }>);
};

/**
 * Get all available theme names
 */
export const getAvailableThemes = (): string[] => {
  return Object.keys(themeLoaders);
};

/**
 * Check if theme exists
 */
export const themeExists = (themeName: string): boolean => {
  return themeName in themeLoaders;
};
