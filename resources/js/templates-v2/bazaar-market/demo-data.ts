/* Bazaar Market — general-marketplace demo catalog: a bit of everything
   a mixed store sells. */

const IMG = {
  clothes: '/images/store/clothes.jpg',
  vegetables: '/images/store/vegetables.jpg',
  bakery: '/images/store/bakery.jpg',
  electronics: '/images/store/electronics.jpg',
  sweets: '/images/store/sweets.jpg',
  spices: '/images/store/spices.jpg',
  banner: '/images/store/banner-store.jpg',
};

let seq = 0;
const P = (name: string, price: number, categoryId: string, opts: Record<string, any> = {}): any => ({
  id: `bz-${++seq}`,
  name,
  price,
  originalPrice: null,
  sku: `BZ-${String(seq).padStart(3, '0')}`,
  stockQuantity: opts.stockQuantity ?? 25,
  categoryId,
  availability: 'in_stock' as const,
  image: opts.image || IMG.clothes,
  images: [opts.image || IMG.clothes],
  description: 'منتج مختار بعناية بجودة عالية وسعر منافس مع توصيل سريع.',
  ...opts,
});

export const BAZAAR_DEMO = {
  categories: [
    { id: 'c1', name: 'أزياء وملابس', slug: 'fashion', image: IMG.clothes },
    { id: 'c2', name: 'إلكترونيات', slug: 'electronics', image: IMG.electronics },
    { id: 'c3', name: 'خضار وفواكه', slug: 'produce', image: IMG.vegetables },
    { id: 'c4', name: 'مخبز وحلويات', slug: 'bakery', image: IMG.bakery },
    { id: 'c5', name: 'عطارة وتوابل', slug: 'spices', image: IMG.spices },
    { id: 'c6', name: 'هدايا ومستلزمات', slug: 'gifts', image: IMG.sweets },
  ],
  products: [
    P('قميص كاجوال قطن رجالي', 89, 'c1', { originalPrice: 110 }),
    P('فستان صيفي مطبوع', 145, 'c1'),
    P('جاكيت شتوي مبطن — مقاسات متعددة', 240, 'c1', { variants: [{ name: 'المقاس', values: ['S', 'M', 'L', 'XL'] }] }),
    P('حذاء رياضي خفيف يومي', 199, 'c1', { originalPrice: 235 }),
    P('سماعات بلوتوث لاسلكية', 159, 'c2', { image: IMG.electronics }),
    P('شاحن سريع + كابل مضفر', 65, 'c2', { image: IMG.electronics }),
    P('مكبر صوت محمول للرحلات', 175, 'c2', { originalPrice: 199, image: IMG.electronics }),
    P('سلطة خضراء طازجة جاهزة', 12, 'c3', { image: IMG.vegetables }),
    P('فواكه موسمية مشكلة — كيلو', 18, 'c3', { image: IMG.vegetables }),
    P('عصائر طبيعية طازجة — ليتر', 9, 'c3', { image: IMG.vegetables }),
    P('خبز مختصة بالزعتر — علبة', 14, 'c4', { image: IMG.bakery }),
    P('كيك فانيلا بالكريمة — نصف كيلو', 35, 'c4', { originalPrice: 42, image: IMG.bakery }),
    P('معمول التمر الفاخر — علبة هدية', 38, 'c4', { image: IMG.sweets }),
    P('زعتر بلدي أخضر — ٥٠٠ غم', 16, 'c5', { image: IMG.spices }),
    P('بهارات مشكلة للشوي — عبوة', 11, 'c5', { image: IMG.spices }),
    P('قهوة عربية فاخرة بالهيل — ٢٥٠ غم', 28, 'c5', { originalPrice: 33, image: IMG.spices }),
    P('طقم أكواب قهوة مذهّب — ٦ حبات', 55, 'c6'),
    P('شمعة معطرة برائحة الورد — هدية', 24, 'c6', { originalPrice: 29 }),
    P('بوكس هدايا مناسبات متكامل', 120, 'c6', { variants: [{ name: 'المقاس', values: ['صغير', 'وسط', 'كبير'] }] }),
  ],
  banners: [
    {
      title: 'كل احتياجاتك في مكان واحد',
      subtitle: 'شحن سريع لجميع المدن',
      image: IMG.banner,
      button_text: 'ابدأ التسوق',
      button_link: '#newest',
    },
    {
      title: 'عروض نهاية الأسبوع',
      subtitle: 'خصومات حتى 40%',
      image: IMG.clothes,
      button_text: 'اكتشف العروض',
      button_link: '#popular',
    },
  ],
};

export function buildBazaarPreviewStoreData(store: any, branding?: Record<string, any>): any {
  return {
    ...store,
    categories: BAZAAR_DEMO.categories,
    products: BAZAAR_DEMO.products.map((p) => ({ ...p })),
    config: {
      ...(branding?.config || {}),
      storeName: store?.name || 'البازار',
      logo: branding?.config?.logo || store?.logo,
      socialMedia: branding?.config?.socialMedia || {},
    },
    content: { banners: BAZAAR_DEMO.banners },
  };
}
