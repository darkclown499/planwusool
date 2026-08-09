import { getImageUrl } from '@/utils/image-helper';
import { getAllTemplates } from '@/templates/registry';

/**
 * Store Themes Data
 * Derived from the new template registry (29 templates: 7 free + 22 paid).
 * Maintains the legacy API shape so existing pages keep working:
 *   - storeThemeCategories (grouped category labels)
 *   - getStoreThemes()    -> [{ id, name, description, category, thumbnail, ... }]
 *   - storeThemes         (static snapshot)
 */

// Ordered categories used to group templates in the template picker
export const storeThemeCategories = [
  'عام',
  'أزياء وموضة',
  'إلكترونيات',
  'طعام ومطاعم',
  'تجميل',
  'منتجات رقمية',
  'فخامة',
  'جملة B2B',
  'منزل وديكور',
  'سيارات',
  'رياضة',
  'أطفال',
  'مواد غذائية',
  'حرف يدوية',
  'عطور',
  'صحة',
  'حيوانات أليفة',
  'كتب',
  'زهور',
];

// Maps every template slug to an Arabic category label
const templateCategoryMap: Record<string, string> = {
  basic: 'عام',
  'single-product': 'عام',
  stationery: 'عام',
  fashion: 'أزياء وموضة',
  'fashion-premium': 'أزياء وموضة',
  tech: 'إلكترونيات',
  'electronics-pro': 'إلكترونيات',
  food: 'طعام ومطاعم',
  'coffee-shop': 'طعام ومطاعم',
  'food-premium': 'طعام ومطاعم',
  beauty: 'تجميل',
  'beauty-premium': 'تجميل',
  digital: 'منتجات رقمية',
  'luxury-jewelry': 'فخامة',
  'luxury-watches': 'فخامة',
  'b2b-wholesale': 'جملة B2B',
  furniture: 'منزل وديكور',
  'home-tools': 'منزل وديكور',
  'auto-parts': 'سيارات',
  sports: 'رياضة',
  kids: 'أطفال',
  supermarket: 'مواد غذائية',
  'grocery-delivery': 'مواد غذائية',
  handcrafted: 'حرف يدوية',
  perfumes: 'عطور',
  pharmacy: 'صحة',
  'pet-store': 'حيوانات أليفة',
  books: 'كتب',
  'flowers-gifts': 'زهور',
};

// Fallback theme preview images for templates
const templatePreviewPaths: Record<string, string> = {
  basic: '/storage/placeholder/themes/gadgets.png',
  'single-product': '/storage/placeholder/themes/coffee.png',
  fashion: '/storage/placeholder/themes/fashion.png',
  tech: '/storage/placeholder/themes/electronics.png',
  food: '/storage/placeholder/themes/food.png',
  beauty: '/storage/placeholder/themes/beauty.png',
  digital: '/storage/placeholder/themes/books.png',
  'luxury-jewelry': '/storage/placeholder/themes/jewelry.png',
  'luxury-watches': '/storage/placeholder/themes/jewelry.png',
  'b2b-wholesale': '/storage/placeholder/themes/gadgets.png',
  furniture: '/storage/placeholder/themes/home-decor.png',
  'auto-parts': '/storage/placeholder/themes/car-accessories.png',
  sports: '/storage/placeholder/themes/sport.png',
  kids: '/storage/placeholder/themes/toy.png',
  supermarket: '/storage/placeholder/themes/supermarket.png',
  handcrafted: '/storage/placeholder/themes/flower.png',
  perfumes: '/storage/placeholder/themes/perfumes.png',
  'electronics-pro': '/storage/placeholder/themes/electronics.png',
  pharmacy: '/storage/placeholder/themes/pharmacy.png',
  'pet-store': '/storage/placeholder/themes/pets.png',
  books: '/storage/placeholder/themes/books.png',
  'flowers-gifts': '/storage/placeholder/themes/flowers.png',
  'grocery-delivery': '/storage/placeholder/themes/supermarket.png',
  'coffee-shop': '/storage/placeholder/themes/coffee.png',
  'home-tools': '/storage/placeholder/themes/home-tools.png',
  'fashion-premium': '/storage/placeholder/themes/fashion.png',
  'beauty-premium': '/storage/placeholder/themes/beauty.png',
  'food-premium': '/storage/placeholder/themes/food.png',
};

// Function to get store templates with proper thumbnail URLs
export function getStoreThemes() {
  return getAllTemplates().map((template) => ({
    id: template.slug,
    name: template.name,
    description: template.description || '',
    isFree: template.is_free,
    planRequired: template.plan_required,
    category: templateCategoryMap[template.slug] ?? 'عام',
    imagePath: templatePreviewPaths[template.slug] || '/storage/placeholder/themes/gadgets.png',
    thumbnail: getImageUrl(templatePreviewPaths[template.slug] || '/storage/placeholder/themes/gadgets.png'),
    primaryColor: template.design_tokens?.colors?.['primary-500'] || '#10b77f',
    designTokens: template.design_tokens,
  }));
}

// Export static version for backward compatibility
export const storeThemes = getStoreThemes();