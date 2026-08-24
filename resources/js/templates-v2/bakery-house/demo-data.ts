/* Bakery House — sector demo catalog: breads, pastries, cakes, Arabic
   sweets with weight-based variants. */

const IMG = {
  bakery: '/images/store/bakery.jpg',
  sweets: '/images/store/sweets.jpg',
  coffee: '/images/store/coffee.jpg',
  banner: '/images/store/banner-store.jpg',
};

/* A distinct photo per product (cycled by catalog order) so bread, cake and
   coffee items each show their own picture instead of one shared loaf shot. */
const PHOTOS = [
  '/images/demo/products/store3_p3.jpg',
  '/images/store/bakery.jpg',
  '/images/demo/products/store3_p7.jpg',
  '/images/store/sweets.jpg',
  '/images/demo/products/store3_p11.jpg',
  '/images/demo/products/store3_p2.jpg',
  '/images/demo/products/store3_p4.jpg',
  '/images/demo/products/store3_p10.jpg',
  '/images/store/coffee.jpg',
  '/images/demo/products/store3_p9.jpg',
  '/images/demo/products/store5_p7.jpg',
];

let seq = 0;
const P = (name: string, price: number, categoryId: string, opts: Record<string, any> = {}): any => {
  const photo = PHOTOS[seq % PHOTOS.length];
  seq++;
  return {
    id: `bk-${seq}`,
    name,
    price,
    originalPrice: null,
    sku: `BK-${String(seq).padStart(3, '0')}`,
    stockQuantity: opts.stockQuantity ?? 20,
    categoryId,
    availability: 'in_stock' as const,
    image: photo,
    images: [photo],
    description: 'مخبوزات طازجة من فرننا الحجري — دقيق مختار وخميرة طبيعية وبلا مواد حافظة.',
    ...opts,
  };
};

const WEIGHTS = ['نصف كيلو', 'كيلو'];
const SIZES = ['صغير', 'وسط', 'كبير'];

export const BAKERY_DEMO = {
  categories: [
    { id: 'c1', name: 'خبز ومخبوزات', slug: 'bread', image: IMG.bakery },
    { id: 'c2', name: 'معجنات فطور', slug: 'pastries', image: IMG.bakery },
    { id: 'c3', name: 'كيك ومناسبات', slug: 'cakes', image: IMG.sweets },
    { id: 'c4', name: 'حلويات شرقية', slug: 'sweets', image: IMG.sweets },
    { id: 'c5', name: 'كوكيز وبسكويت', slug: 'cookies', image: IMG.sweets },
    { id: 'c6', name: 'قهوة ومشروبات', slug: 'drinks', image: IMG.coffee },
  ],
  products: [
    P('خبز عربي على الحجر — كيس ١٠ أقراص', 8, 'c1', { variants: [{ name: 'الحجم', values: ['٦ أقراص', '١٠ أقراص'] }] }),
    P('خبز الصاج الرفيع — كيلو', 12, 'c1'),
    P('توست بلدي شرائح سميكة', 9.5, 'c1', { originalPrice: 11 }),
    P('خبز البرجر بالسمسم — عبوة ٦', 10, 'c1'),
    P('بيتزا مارغريتا جاهزة للفرن', 22, 'c2', { variants: [{ name: 'الحجم', values: SIZES }] }),
    P('مناقيش زعتر أخضر — ٥ حبات', 15, 'c2', { originalPrice: 18 }),
    P('كعك بالجبن والحبة السوداء — ٤ حبات', 16, 'c2'),
    P('لفائف النقانق الفرنسية — علبة', 19, 'c2'),
    P('كيك الشوكولاتة الفاخر', 65, 'c3', { variants: [{ name: 'الوزن', values: WEIGHTS }], stockQuantity: 8 }),
    P('تشيز كيك التوت الأزرق — قطعة', 14, 'c3'),
    P('رد فيلفيت بكريمة الجبن — كيلو', 58, 'c3', { variants: [{ name: 'الوزن', values: WEIGHTS }] }),
    P('كنافة نابلسية بالجبن — نصف صينية', 45, 'c4', { originalPrice: 52 }),
    P('بقلاوة بالفستق الحلبي — كيلو', 85, 'c4', { variants: [{ name: 'الوزن', values: WEIGHTS }] }),
    P('معمول بالتمر — علبة هدية', 38, 'c4'),
    P('هريسة بالقشطة — صينية وسط', 32, 'c4'),
    P('كوكيز رقائق الشوكولاتة — ١٢ حبة', 24, 'c5', { originalPrice: 28 }),
    P('بسكويت الزبدة بالمربى — علبة', 18, 'c5'),
    P('قهوة تركية مطحونة — ٢٥٠ غم', 21, 'c6'),
    P('شاي أعشاب الزعتر والبابونج', 12, 'c6'),
  ],
  banners: [
    {
      title: 'من فرننا الدافئ… إلى مائدتك',
      subtitle: 'مخبوزات طازجة كل يوم',
      image: IMG.banner,
      button_text: 'اكتشف تشكيلة اليوم',
      button_link: '#bakery-best',
    },
  ],
};

export function buildBakeryPreviewStoreData(store: any, branding?: Record<string, any>): any {
  return {
    ...store,
    categories: BAKERY_DEMO.categories,
    products: BAKERY_DEMO.products.map((p) => ({ ...p })),
    config: {
      ...(branding?.config || {}),
      storeName: store?.name || 'بيت المخبز',
      logo: branding?.config?.logo || store?.logo,
      socialMedia: branding?.config?.socialMedia || {},
    },
    content: { banners: BAKERY_DEMO.banners },
  };
}
