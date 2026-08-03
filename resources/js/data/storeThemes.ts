import { getImageUrl } from '@/utils/image-helper';

// Base theme data without thumbnails
const baseThemeData = [
  {
    id: 'gadgets',
    name: 'إلكترونيات',
    description: 'تصميم متجر إلكترونيات متكامل مناسب للجوال مع الطلب المباشر عبر واتساب',
    imagePath: '/storage/placeholder/themes/gadgets.png'
  },
  {
    id: 'fashion',
    name: 'أزياء وموضة',
    description: 'تصميم أنيق وعصري مثالي لمتاجر الأزياء والملابس',
    imagePath: '/storage/placeholder/themes/fashion.png'
  },
  {
    id: 'home-decor',
    name: 'ديكور المنزل',
    description: 'تصميم فاخر لمتاجر الأثاث والديكور الداخلي',
    imagePath: '/storage/placeholder/themes/home-decor.png'
  },
  {
    id: 'bakery',
    name: 'مخبوزات وحلويات',
    description: 'تصميم دافئ مثالي للمخابز ومحلات الكيك والحلويات',
    imagePath: '/storage/placeholder/themes/bakery.png'
  },
  {
    id: 'supermarket',
    name: 'سوبر ماركت',
    description: 'تصميم حديث ومنعش مثالي لمتاجر السوبر ماركت والمواد الغذائية',
    imagePath: '/storage/placeholder/themes/supermarket.png'
  },
  {
    id: 'car-accessories',
    name: 'إكسسوارات السيارات',
    description: 'تصميم احترافي داكن مثالي لمتاجر قطع غيار السيارات وإكسسواراتها',
    imagePath: '/storage/placeholder/themes/car-accessories.png'
  },
  {
    id: 'toy',
    name: 'ألعاب أطفال',
    description: 'تصميم ممتع وملون مثالي لمتاجر الألعاب ومنتجات الأطفال',
    imagePath: '/storage/placeholder/themes/toy.png'
  },
  {
    id: 'perfumes',
    name: 'عطور',
    description: 'تصميم فاخر أسود وذهبي مثالي لمتاجر العطور',
    imagePath: '/storage/placeholder/themes/perfumes.png'
  },
  {
    id: 'jewelry',
    name: 'مجوهرات',
    description: 'تصميم أنيق ذهبي مثالي لمتاجر المجوهرات والإكسسوارات',
    imagePath: '/storage/placeholder/themes/jewelry.png'
  },
  {
    id: 'beauty',
    name: 'تجميل',
    description: 'تصميم نابض مثالي لمتاجر مستحضرات التجميل وصالونات التجميل',
    imagePath: '/storage/placeholder/themes/beauty.png'
  },
  {
    id: 'pharmacy',
    name: 'صيدلية',
    description: 'تصميم أخضر نظيف مثالي للصيدليات ومنتجات الصحة',
    imagePath: '/storage/placeholder/themes/pharmacy.png'
  },
  {
    id: 'books',
    name: 'كتب',
    description: 'تصميم دافئ مثالي للمكتبات ودور النشر',
    imagePath: '/storage/placeholder/themes/books.png'
  },
  {
    id: 'sport',
    name: 'رياضة',
    description: 'تصميم نشيط برتقالي مثالي لمتاجر الملابس الرياضية ومعدات الجيم',
    imagePath: '/storage/placeholder/themes/sport.png'
  },
  {
    id: 'pets',
    name: 'حيوانات أليفة',
    description: 'تصميم دافئ مثالي لمتاجر الحيوانات الأليفة وخدمات العناية بها',
    imagePath: '/storage/placeholder/themes/pets.png'
  },
  {
    id: 'flowers',
    name: 'ورود وهدايا',
    description: 'تصميم رومانسي مثالي لمحلات الورود والهدايا',
    imagePath: '/storage/placeholder/themes/flowers.png'
  },
  {
    id: 'coffee',
    name: 'قهوة',
    description: 'تصميم بني كريمي مثالي لمقاهي القهوة',
    imagePath: '/storage/placeholder/themes/coffee.png'
  },
  {
    id: 'stationery',
    name: 'قرطاسية',
    description: 'تصميم أزرق سماوي مثالي لمتاجر القرطاسية والمستلزمات المكتبية',
    imagePath: '/storage/placeholder/themes/stationery.png'
  },
  {
    id: 'spices',
    name: 'عطارة وبهارات',
    description: 'تصميم برتقالي دافئ مع شريط جانبي مثالي لمتاجر العطارة والبهارات',
    imagePath: '/storage/placeholder/themes/spices.png'
  },
  {
    id: 'clothing',
    name: 'ملابس وأزياء',
    description: 'تصميم بنفسجي أنيق مع شريط جانبي مثالي لمتاجر الملابس',
    imagePath: '/storage/placeholder/themes/clothing.png'
  },
  {
    id: 'electronics',
    name: 'إلكترونيات',
    description: 'تصميم أزرق عصري مع شريط جانبي مثالي لمتاجر الإلكترونيات والأجهزة الذكية',
    imagePath: '/storage/placeholder/themes/electronics.png'
  },
  {
    id: 'cosmetics',
    name: 'مستحضرات تجميل',
    description: 'تصميم وردي ذهبي نابض مع شريط جانبي مثالي لمتاجر مستحضرات التجميل',
    imagePath: '/storage/placeholder/themes/cosmetics.png'
  },
  {
    id: 'food',
    name: 'مواد غذائية',
    description: 'تصميم أخضر منعش مع شريط جانبي مثالي لمتاجر المواد الغذائية والمنتجات الطازجة',
    imagePath: '/storage/placeholder/themes/food.png'
  },
  {
    id: 'fragrances',
    name: 'عطور ومسك',
    description: 'تصميم كهرماني فاخر مع شريط جانبي مثالي لمتاجر العطور والعود والمسك',
    imagePath: '/storage/placeholder/themes/fragrances.png'
  },
  {
    id: 'home-tools',
    name: 'أدوات منزلية',
    description: 'تصميم تركوازي مع شريط جانبي مثالي لمتاجر الأدوات المنزلية وأدوات المطبخ',
    imagePath: '/storage/placeholder/themes/home-tools.png'
  },
  {
    id: 'coffee-dates',
    name: 'قهوة وتمور',
    description: 'تصميم بني دافئ مع شريط جانبي مثالي لمتاجر القهوة المختصة والتمور الفاخرة',
    imagePath: '/storage/placeholder/themes/coffee-dates.png'
  },
  {
    id: 'jewelry-gold',
    name: 'ذهب ومجوهرات',
    description: 'تصميم ذهبي فاخر مع شريط جانبي مثالي لمتاجر الذهب والمجوهرات',
    imagePath: '/storage/placeholder/themes/jewelry-gold.png'
  },
  {
    id: 'kids',
    name: 'أطفال ومواليد',
    description: 'تصميم سماوي وأصفر مرح مع شريط جانبي مثالي لمتاجر منتجات الأطفال',
    imagePath: '/storage/placeholder/themes/kids.png'
  },
  {
    id: 'sports',
    name: 'رياضة ولياقة',
    description: 'تصميم أخضر عشبي مع شريط جانبي مثالي لمتاجر الرياضة واللياقة',
    imagePath: '/storage/placeholder/themes/sports.png'
  },
  {
    id: 'stationery-books',
    name: 'قرطاسية وكتب',
    description: 'تصميم كحلي مع شريط جانبي مثالي لمتاجر القرطاسية والمكتبات',
    imagePath: '/storage/placeholder/themes/stationery-books.png'
  }
];

// Ordered categories used to group themes in the theme picker
export const storeThemeCategories = [
  'إلكترونيات وأجهزة ذكية',
  'أزياء وملابس',
  'تجميل وعطور',
  'مجوهرات',
  'منزل وديكور',
  'أطعمة ومشروبات',
  'أطفال وألعاب',
  'رياضة ولياقة',
  'قرطاسية وكتب',
  'صحة وعناية',
  'حيوانات أليفة',
  'ورود وهدايا',
  'سيارات وإكسسوارات'
];

// Maps every theme id to a single category so pickers never repeat a category
const themeCategoryMap: Record<string, string> = {
  gadgets: 'إلكترونيات وأجهزة ذكية',
  electronics: 'إلكترونيات وأجهزة ذكية',
  fashion: 'أزياء وملابس',
  clothing: 'أزياء وملابس',
  beauty: 'تجميل وعطور',
  cosmetics: 'تجميل وعطور',
  perfumes: 'تجميل وعطور',
  fragrances: 'تجميل وعطور',
  jewelry: 'مجوهرات',
  'jewelry-gold': 'مجوهرات',
  'home-decor': 'منزل وديكور',
  'home-tools': 'منزل وديكور',
  supermarket: 'أطعمة ومشروبات',
  food: 'أطعمة ومشروبات',
  bakery: 'أطعمة ومشروبات',
  spices: 'أطعمة ومشروبات',
  coffee: 'أطعمة ومشروبات',
  'coffee-dates': 'أطعمة ومشروبات',
  toy: 'أطفال وألعاب',
  kids: 'أطفال وألعاب',
  sport: 'رياضة ولياقة',
  sports: 'رياضة ولياقة',
  stationery: 'قرطاسية وكتب',
  'stationery-books': 'قرطاسية وكتب',
  books: 'قرطاسية وكتب',
  pharmacy: 'صحة وعناية',
  pets: 'حيوانات أليفة',
  flowers: 'ورود وهدايا',
  'car-accessories': 'سيارات وإكسسوارات'
};

// Function to get store themes with proper thumbnail URLs
export function getStoreThemes() {
  return baseThemeData.map(theme => ({
    ...theme,
    category: themeCategoryMap[theme.id] ?? 'أخرى',
    thumbnail: getImageUrl(theme.imagePath)
  }));
}

// Export static version for backward compatibility
export const storeThemes = getStoreThemes();