import { getImageUrl } from '@/utils/image-helper';

// Base theme data without thumbnails
const baseThemeData = [
  {
    id: 'gadgets',
    name: 'Gadgets',
    description: 'Mobile-first WhatsApp optimized design with single-column layout and direct WhatsApp ordering',
    imagePath: '/storage/placeholder/themes/gadgets.png'
  },
  {
    id: 'fashion',
    name: 'Fashion',
    description: 'Elegant and trendy design perfect for fashion and apparel brands',
    imagePath: '/storage/placeholder/themes/fashion.png'
  },
  {
    id: 'home-decor',
    name: 'Home Decor & Furniture',
    description: 'Premium design for furniture stores and interior design services',
    imagePath: '/storage/placeholder/themes/home-decor.png'
  },
  {
    id: 'bakery',
    name: 'Bakery & Cakes',
    description: 'Warm, food-oriented design perfect for bakeries, cake shops, and pastry stores',
    imagePath: '/storage/placeholder/themes/bakery.png'
  },
  {
    id: 'supermarket',
    name: 'Supermarket & Grocery',
    description: 'Fresh and modern design perfect for supermarkets, grocery stores, and food retailers',
    imagePath: '/storage/placeholder/themes/supermarket.png'
  },
  {
    id: 'car-accessories',
    name: 'Car Accessories',
    description: 'Professional automotive design with dark theme perfect for car parts and accessories stores',
    imagePath: '/storage/placeholder/themes/car-accessories.png'
  },
  {
    id: 'toy',
    name: 'Toy',
    description: 'Fun and colorful design perfect for toy stores, kids products, and children-focused businesses',
    imagePath: '/storage/placeholder/themes/toy.png'
  }
];

// Function to get store themes with proper thumbnail URLs
export function getStoreThemes() {
  return baseThemeData.map(theme => ({
    ...theme,
    thumbnail: getImageUrl(theme.imagePath)
  }));
}

// Export static version for backward compatibility
export const storeThemes = getStoreThemes();