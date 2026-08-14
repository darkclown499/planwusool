/**
 * Wefaq Supermarket — mock data provider.
 *
 * Used as the pixel-perfect preview fallback: when the theme is previewed
 * without real store data (empty categories/products), these defaults render
 * the exact Wefaq Supermarket design with hardcoded Arabic content and real
 * photorealistic internet images. When the theme is activated on a real
 * store, WefaqStore swaps this fallback for the store's live data.
 */

export const WEFAQ_BRAND = {
    name: 'وفاق',
    sub: 'Wefaq Supermarket 2026',
};

export const WEFAQ_HERO_IMAGE =
    'https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80';

export const WEFAQ_RECIPE_IMAGE =
    'https://images.unsplash.com/photo-1490474418585-ba9bad8fd0ea?auto=format&fit=crop&w=900&q=80';

export const WEFAQ_FALLBACK_IMAGE =
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=600&q=80';

export const WEFAQ_SEARCH_PLACEHOLDER = 'ابحث عن الخضروات الألبان الدواجن...';

export const WEFAQ_NAV_LINKS = [
    { label: 'بقالة', target: 'wefaq-deal' },
    { label: 'مخبوزات', target: 'wefaq-deal' },
    { label: 'ألبان', target: 'wefaq-deal' },
    { label: 'مشروبات', target: 'wefaq-deal' },
    { label: 'خضروات', target: 'wefaq-deal' },
    { label: 'لحوم', target: 'wefaq-deal' },
    { label: 'حلويات', target: 'wefaq-deal' },
];

export const WEFAQ_CATEGORIES = [
    { id: 'm-vegetables', name: 'خضروات' },
    { id: 'm-meat-fish', name: 'لحوم وأسماك' },
    { id: 'm-meat', name: 'لحم' },
    { id: 'm-dairy', name: 'ألبان وأجبان' },
    { id: 'm-grocery', name: 'بقالة' },
    { id: 'm-equipment', name: 'تجهيز' },
    { id: 'm-drinks', name: 'مشروبات' },
    { id: 'm-pantry', name: 'مونة البيت' },
    { id: 'm-sweets', name: 'حلويات' },
    { id: 'm-nuts', name: 'المكسرات' },
];

export const WEFAQ_SECTIONS = [
    { id: 'wefaq-deal', tag: 'deal', title: 'أفضل العروض اليومية' },
    { id: 'wefaq-new', tag: 'new', title: 'وصل حديثاً' },
    { id: 'wefaq-organic', tag: 'organic', title: 'المنتجات العضوية' },
    { id: 'wefaq-bestseller', tag: 'bestSeller', title: 'الأكثر مبيعاً' },
    { id: 'wefaq-budget', tag: 'budget', title: 'التسوق حسب الميزانية' },
];

interface MockProduct {
    id: string;
    name: string;
    price: number;
    originalPrice?: number;
    image: string;
    sku: string;
    stockQuantity: number;
    categoryId: string;
    availability: 'in_stock' | 'out_of_stock';
    description: string;
    tags: string[];
}

const img = (photoId: string) =>
    `https://images.unsplash.com/${photoId}?auto=format&fit=crop&w=600&q=80`;

export const WEFAQ_PRODUCTS: MockProduct[] = [
    {
        id: 'm-p1',
        name: 'تفاح أحمر طازج - كيلو',
        price: 7.9,
        originalPrice: 9.5,
        image: img('photo-1570913149827-d2ac84ab3f9a'),
        sku: 'WEF-1001',
        stockQuantity: 120,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'تفاح أحمر فاخر، طازج ومقرمش، مثالي لسلطات الفواكه والتحلية.',
        tags: ['deal', 'bestSeller', 'organic'],
    },
    {
        id: 'm-p2',
        name: 'موز طازج - كيلو',
        price: 6.5,
        image: img('photo-1571771894821-ce9b6c11b08e'),
        sku: 'WEF-1002',
        stockQuantity: 90,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'موز ناضج وحلو، مصدر ممتاز للطاقة والبوتاسيوم.',
        tags: ['bestSeller', 'budget'],
    },
    {
        id: 'm-p3',
        name: 'بطاطس بلدي - كيلو',
        price: 3.25,
        image: img('photo-1518977676601-b53f82aba655'),
        sku: 'WEF-1003',
        stockQuantity: 200,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'بطاطس بلدي طازجة، مثالية للقلي والطبخ.',
        tags: ['budget', 'organic'],
    },
    {
        id: 'm-p4',
        name: 'طماطم بلدية - كيلو',
        price: 5.75,
        originalPrice: 6.5,
        image: img('photo-1546094096-0df4bcaaa337'),
        sku: 'WEF-1004',
        stockQuantity: 140,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'طماطم بلدية حمراء ومليئة بالنكهة.',
        tags: ['deal', 'new'],
    },
    {
        id: 'm-p5',
        name: 'فراولة موسمية - 500 غرام',
        price: 8.9,
        originalPrice: 10.0,
        image: img('photo-1464965911861-746a04b4bca6'),
        sku: 'WEF-1005',
        stockQuantity: 60,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'فراولة طازجة وموسمية، حلوة وعصيرية.',
        tags: ['deal', 'new'],
    },
    {
        id: 'm-p6',
        name: 'برتقال بلدي - كيلو',
        price: 6.2,
        image: img('photo-1547514701-42782101795e'),
        sku: 'WEF-1006',
        stockQuantity: 110,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'برتقال بلدي غني بفيتامين C.',
        tags: ['new', 'budget'],
    },
    {
        id: 'm-p7',
        name: 'خيار طازج - كيلو',
        price: 4.5,
        image: img('photo-1604977042946-1eecc30f269e'),
        sku: 'WEF-1007',
        stockQuantity: 130,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'خيار طازج مقرمش، مثالي للسلطات.',
        tags: ['organic'],
    },
    {
        id: 'm-p8',
        name: 'ليمون طازج - كيلو',
        price: 4.0,
        image: img('photo-1590502593747-42a996133562'),
        sku: 'WEF-1008',
        stockQuantity: 95,
        categoryId: 'm-vegetables',
        availability: 'in_stock',
        description: 'ليمون طازج وحامض، مثالي للعصائر والطبخ.',
        tags: ['budget', 'organic'],
    },
    {
        id: 'm-p9',
        name: 'بيض بلدي طازج - 30 حبة',
        price: 15.9,
        originalPrice: 18.0,
        image: img('photo-1518569656558-1f25e69d93d7'),
        sku: 'WEF-1009',
        stockQuantity: 70,
        categoryId: 'm-grocery',
        availability: 'in_stock',
        description: 'بيض بلدي طازج يومي، غني بالبروتين.',
        tags: ['deal', 'new'],
    },
    {
        id: 'm-p10',
        name: 'حليب طازج كامل الدسم - لتر',
        price: 5.5,
        originalPrice: 6.0,
        image: img('photo-1550583724-b2692b85b150'),
        sku: 'WEF-1010',
        stockQuantity: 160,
        categoryId: 'm-dairy',
        availability: 'in_stock',
        description: 'حليب طازج كامل الدسم من مزارع محلية.',
        tags: ['bestSeller', 'deal'],
    },
    {
        id: 'm-p11',
        name: 'جبنة بيضاء فيتا - 500 غرام',
        price: 12.9,
        originalPrice: 15.0,
        image: img('photo-1486297678162-eb2a19b0a32d'),
        sku: 'WEF-1011',
        stockQuantity: 50,
        categoryId: 'm-dairy',
        availability: 'in_stock',
        description: 'جبنة فيتا بيضاء مالحة، مثالية للسلطات والفطور.',
        tags: ['deal'],
    },
    {
        id: 'm-p12',
        name: 'زبادي طبيعي - 1 كيلو',
        price: 7.25,
        image: img('photo-1488477181946-6428a0291777'),
        sku: 'WEF-1012',
        stockQuantity: 85,
        categoryId: 'm-dairy',
        availability: 'in_stock',
        description: 'زبادي طبيعي بدون إضافات، قوام كريمي.',
        tags: ['organic', 'bestSeller'],
    },
    {
        id: 'm-p13',
        name: 'خبز عربي طازج - 6 حبات',
        price: 2.5,
        image: img('photo-1509440159596-0249088772ff'),
        sku: 'WEF-1013',
        stockQuantity: 240,
        categoryId: 'm-grocery',
        availability: 'in_stock',
        description: 'خبز عربي طازج مخبوز يومياً.',
        tags: ['bestSeller', 'budget'],
    },
    {
        id: 'm-p14',
        name: 'لحم بقري طازج - كيلو',
        price: 59.0,
        originalPrice: 65.0,
        image: img('photo-1603048297172-c92544798d5a'),
        sku: 'WEF-1014',
        stockQuantity: 40,
        categoryId: 'm-meat',
        availability: 'in_stock',
        description: 'لحم بقري طازج عالي الجودة، مفروم أو شرائح.',
        tags: ['deal'],
    },
    {
        id: 'm-p15',
        name: 'دجاج بلدي طازج - كيلو',
        price: 18.5,
        originalPrice: 21.0,
        image: img('photo-1587593810167-a84920ea0781'),
        sku: 'WEF-1015',
        stockQuantity: 55,
        categoryId: 'm-meat',
        availability: 'in_stock',
        description: 'دجاج بلدي طازج، نظيف وجاهز للطهي.',
        tags: ['deal', 'new'],
    },
    {
        id: 'm-p16',
        name: 'سمك بلطي طازج - كيلو',
        price: 22.0,
        originalPrice: 25.0,
        image: img('photo-1519708227418-c8fd9a32b7a2'),
        sku: 'WEF-1016',
        stockQuantity: 30,
        categoryId: 'm-meat-fish',
        availability: 'in_stock',
        description: 'سمك بلطي طازج يومياً.',
        tags: ['new'],
    },
    {
        id: 'm-p17',
        name: 'زيت زيتون بكر ممتاز - لتر',
        price: 24.0,
        originalPrice: 28.0,
        image: img('photo-1474979266404-7eaacbcd87c5'),
        sku: 'WEF-1017',
        stockQuantity: 65,
        categoryId: 'm-pantry',
        availability: 'in_stock',
        description: 'زيت زيتون بكر ممتاز، معصور على البارد.',
        tags: ['organic', 'deal'],
    },
    {
        id: 'm-p18',
        name: 'أرز بسمتي فاخر - 5 كيلو',
        price: 29.9,
        originalPrice: 34.0,
        image: img('photo-1586201375761-83865001e31c'),
        sku: 'WEF-1018',
        stockQuantity: 75,
        categoryId: 'm-pantry',
        availability: 'in_stock',
        description: 'أرز بسمتي فاخر حبات طويلة.',
        tags: ['bestSeller', 'deal'],
    },
    {
        id: 'm-p19',
        name: 'عصير برتقال طبيعي - لتر',
        price: 7.5,
        originalPrice: 9.0,
        image: img('photo-1600271886742-f049cd451bba'),
        sku: 'WEF-1019',
        stockQuantity: 45,
        categoryId: 'm-drinks',
        availability: 'in_stock',
        description: 'عصير برتقال طبيعي 100% بدون سكر مضاف.',
        tags: ['new', 'budget'],
    },
    {
        id: 'm-p20',
        name: 'عسل جبلي طبيعي - 500 غرام',
        price: 32.0,
        originalPrice: 38.0,
        image: img('photo-1587049352846-4a222e784d38'),
        sku: 'WEF-1020',
        stockQuantity: 35,
        categoryId: 'm-sweets',
        availability: 'in_stock',
        description: 'عسل جبلي طبيعي 100% من نحل بري.',
        tags: ['organic', 'bestSeller'],
    },
];

export const WEFAQ_RECIPE_ITEMS = ['m-p5', 'm-p2', 'm-p1'];

export function mockFallbackImage(): string {
    return WEFAQ_FALLBACK_IMAGE;
}
