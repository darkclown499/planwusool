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
    P('قميص كاجوال قطن رجالي', 89, 'c1', { originalPrice: 110, image: '/images/demo/products/store1_p7.jpg' }),
    P('فستان صيفي مطبوع', 145, 'c1', { image: '/images/demo/products/store1_p4.jpg' }),
    P('جاكيت شتوي مبطن — مقاسات متعددة', 240, 'c1', { variants: [{ name: 'المقاس', values: ['S', 'M', 'L', 'XL'] }], image: '/images/demo/products/store1_p10.jpg' }),
    P('حذاء رياضي خفيف يومي', 199, 'c1', { originalPrice: 235, image: '/images/demo/products/store1_p5.jpg' }),
    P('سماعات بلوتوث لاسلكية', 159, 'c2', { image: '/images/demo/products/store2_p3.jpg' }),
    P('شاحن سريع + كابل مضفر', 65, 'c2', { image: '/images/demo/products/store2_p8.jpg' }),
    P('مكبر صوت محمول للرحلات', 175, 'c2', { originalPrice: 199, image: '/images/demo/products/store2_p12.jpg' }),
    P('سلطة خضراء طازجة جاهزة', 12, 'c3', { image: '/images/demo/products/store3_p1.jpg' }),
    P('فواكه موسمية مشكلة — كيلو', 18, 'c3', { image: '/images/demo/products/store3_p5.jpg' }),
    P('عصائر طبيعية طازجة — ليتر', 9, 'c3', { image: '/images/demo/products/store3_p12.jpg' }),
    P('خبز مختصة بالزعتر — علبة', 14, 'c4', { image: '/images/demo/products/store3_p3.jpg' }),
    P('كيك فانيلا بالكريمة — نصف كيلو', 35, 'c4', { originalPrice: 42, image: '/images/store/sweets.jpg' }),
    P('معمول التمر الفاخر — علبة هدية', 38, 'c4', { image: '/images/demo/products/store3_p10.jpg' }),
    P('زعتر بلدي أخضر — ٥٠٠ غم', 16, 'c5', { image: IMG.spices }),
    P('بهارات مشكلة للشوي — عبوة', 11, 'c5', { image: '/images/store/hypermarket.jpg' }),
    P('قهوة عربية فاخرة بالهيل — ٢٥٠ غم', 28, 'c5', { originalPrice: 33, image: '/images/store/coffee.jpg' }),
    P('طقم أكواب قهوة مذهّب — ٦ حبات', 55, 'c6', { image: '/images/demo/products/store5_p9.jpg' }),
    P('شمعة معطرة برائحة الورد — هدية', 24, 'c6', { originalPrice: 29, image: '/images/demo/products/store4_p11.jpg' }),
    P('بوكس هدايا مناسبات متكامل', 120, 'c6', { variants: [{ name: 'المقاس', values: ['صغير', 'وسط', 'كبير'] }], image: '/images/demo/products/store5_p10.jpg' }),
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
