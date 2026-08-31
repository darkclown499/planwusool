/* الهيئة — Al-Hay'a light commerce demo catalog: general grocery/spice categories */

const IMG = {
  banner: '/images/store/spices.jpg',
};

const PHOTOS = [
  '/images/store/spices.jpg',
  '/images/store/sweets.jpg',
  '/images/store/coffee.jpg',
  '/images/demo/products/store3_p6.jpg',
  '/images/store/restaurant-dish.jpg',
  '/images/store/grills.jpg',
  '/images/demo/products/store5_p4.jpg',
  '/images/demo/products/store3_p7.jpg',
  '/images/demo/products/store3_p9.jpg',
  '/images/store/fast-food.jpg',
];

let seq = 0;
const P = (name: string, price: number, categoryId: string, opts: Record<string, any> = {}): any => {
  const photo = PHOTOS[seq % PHOTOS.length];
  seq++;
  return {
    id: `hy-${seq}`,
    name,
    price,
    originalPrice: opts.originalPrice ?? null,
    sku: `HY-${String(seq).padStart(3, '0')}`,
    stockQuantity: opts.stockQuantity ?? 30,
    categoryId,
    availability: 'in_stock' as const,
    image: photo,
    images: [photo],
    description: 'منتج مختار بعناية — جودة عالية وتغليف مناسب.',
    variants: opts.variants ?? undefined,
    variantCombinations: opts.variantCombinations ?? undefined,
    ...opts,
  };
};

export const RESTAURANT_DEMO = {
  categories: [
    { id: 'c1', name: 'بهارات وتوابل', slug: 'spices', image: PHOTOS[0] },
    { id: 'c2', name: 'مكسرات محمصة', slug: 'roasted-nuts', image: PHOTOS[1] },
    { id: 'c3', name: 'مواد غذائية', slug: 'groceries', image: PHOTOS[2] },
    { id: 'c4', name: 'بقوليات', slug: 'legumes', image: PHOTOS[3] },
    { id: 'c5', name: 'زيوت طبيعية', slug: 'oils', image: PHOTOS[4] },
    { id: 'c6', name: 'أعشاب', slug: 'herbs', image: PHOTOS[5] },
  ],
  products: [
    P('بهارات مشكلة للطبيخ', 18, 'c1', { variants: [{ name: 'الوزن', values: ['250غم', '500غم', '1كغ'] }], variantCombinations: [{ id: '250غم', values: ['250غم'], price: 18 }, { id: '500غم', values: ['500غم'], price: 32 }, { id: '1كغ', values: ['1كغ'], price: 58 }] }),
    P('زعفران أصلي', 20, 'c1'),
    P('بهارات كبسة سعودية', 22, 'c1', { originalPrice: 26 }),
    P('كمون بلدي', 14, 'c1', { variants: [{ name: 'الوزن', values: ['100غم', '250غم'] }] }),
    P('خلطة مكسرات سوبر', 42, 'c2', { originalPrice: 48, variants: [{ name: 'الوزن', values: ['250غم', '500غم', '1كغ'] }], variantCombinations: [{ id: '250غم', values: ['250غم'], price: 22 }, { id: '500غم', values: ['500غم'], price: 42 }, { id: '1كغ', values: ['1كغ'], price: 78 }] }),
    P('كاشو محمص', 32, 'c2'),
    P('لوز محمص', 28, 'c2'),
    P('رز بسمتي', 23, 'c3'),
    P('طحينية', 14, 'c3'),
    P('عدس أحمر مجروش', 8, 'c4', { variants: [{ name: 'الوزن', values: ['500غم', '1كغ'] }], variantCombinations: [{ id: '500غم', values: ['500غم'], price: 8 }, { id: '1كغ', values: ['1كغ'], price: 14 }] }),
    P('فريكة خشنة', 10, 'c4'),
    P('زيت حبة البركة', 20, 'c5'),
    P('زيت سمسم', 18, 'c5'),
    P('زهورات شامية', 12, 'c6'),
    P('شاي أعشاب', 9, 'c6'),
    P('تلبينة نبوية', 18, 'c6'),
    P('قسط هندي', 22, 'c1'),
    P('حب هال', 16, 'c1'),
    P('جوز بيكان محمص', 36, 'c2'),
    P('مفتول ناشف', 10, 'c3'),
  ],
  banners: [
    {
      title: 'عروض الهيئة',
      subtitle: 'بهارات • مكسرات • مواد غذائية بجودة عالية',
      image: IMG.banner,
      button_text: 'تسوق الآن',
      button_link: '#featured',
    },
  ],
};

export const HAYAH_DEMO = RESTAURANT_DEMO;

export function buildRestaurantPreviewStoreData(store: any, branding?: Record<string, any>): any {
  return {
    ...store,
    categories: RESTAURANT_DEMO.categories,
    products: RESTAURANT_DEMO.products.map((p) => ({ ...p })),
    config: {
      ...(branding?.config || {}),
      storeName: store?.name || 'متجر الهيئة',
      logo: branding?.config?.logo || store?.logo,
      socialMedia: branding?.config?.socialMedia || {},
    },
    content: { banners: RESTAURANT_DEMO.banners },
  };
}
export const buildHayahPreviewStoreData = buildRestaurantPreviewStoreData;
