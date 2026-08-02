import { ThemeComponent, BaseThemeProps } from '../types/theme';
import { GadgetsStore } from '../themes/gadgets-store/GadgetsStore';
import { HomeDecorStore } from '../themes/home-decor-store/HomeDecorStore';
import { BakeryStore } from '../themes/bakery-store/BakeryStore';
import { SupermarketStore } from '../themes/supermarket-store/SupermarketStore';
import { CarAccessoriesStore } from '../themes/car-accessories-store/CarAccessoriesStore';
import { ToyStore } from '../themes/toy-store/ToyStore';
import { FashionStore } from '../themes/fashion-store/FashionStore';
import { PerfumesStore } from '../themes/perfumes-store/PerfumesStore';
import { JewelryStore } from '../themes/jewelry-store/JewelryStore';
import { BeautyStore } from '../themes/beauty-store/BeautyStore';
import { PharmacyStore } from '../themes/pharmacy-store/PharmacyStore';
import { BooksStore } from '../themes/books-store/BooksStore';
import { SportStore } from '../themes/sport-store/SportStore';
import { PetsStore } from '../themes/pets-store/PetsStore';
import { FlowersStore } from '../themes/flowers-store/FlowersStore';
import { CoffeeStore } from '../themes/coffee-store/CoffeeStore';
import { StationeryStore } from '../themes/stationery-store/StationeryStore';
import { SpicesStore } from '../themes/spices-store/SpicesStore';
import { ClothingStore } from '../themes/clothing-store/ClothingStore';
import { ElectronicsStore } from '../themes/electronics-store/ElectronicsStore';
import { CosmeticsStore } from '../themes/cosmetics-store/CosmeticsStore';
import { FoodStore } from '../themes/food-store/FoodStore';
import { FragrancesStore } from '../themes/fragrances-store/FragrancesStore';
import { HomeToolsStore } from '../themes/home-tools-store/HomeToolsStore';
import { CoffeeDatesStore } from '../themes/coffee-dates-store/CoffeeDatesStore';
import { JewelryGoldStore } from '../themes/jewelry-gold-store/JewelryGoldStore';
import { KidsStore } from '../themes/kids-store/KidsStore';
import { SportsStore } from '../themes/sports-store/SportsStore';
import { StationeryBooksStore } from '../themes/stationery-books-store/StationeryBooksStore';

// Theme registry
const themes: Record<string, ThemeComponent> = {
  gadgets: GadgetsStore,
  'home-decor': HomeDecorStore,
  bakery: BakeryStore,
  supermarket: SupermarketStore,
  'car-accessories': CarAccessoriesStore,
  'toy': ToyStore,
  fashion: FashionStore,
  perfumes: PerfumesStore,
  jewelry: JewelryStore,
  beauty: BeautyStore,
  pharmacy: PharmacyStore,
  books: BooksStore,
  sport: SportStore,
  pets: PetsStore,
  flowers: FlowersStore,
  coffee: CoffeeStore,
  stationery: StationeryStore,
  spices: SpicesStore,
  clothing: ClothingStore,
  electronics: ElectronicsStore,
  cosmetics: CosmeticsStore,
  food: FoodStore,
  fragrances: FragrancesStore,
  'home-tools': HomeToolsStore,
  'coffee-dates': CoffeeDatesStore,
  'jewelry-gold': JewelryGoldStore,
  kids: KidsStore,
  sports: SportsStore,
  'stationery-books': StationeryBooksStore,
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