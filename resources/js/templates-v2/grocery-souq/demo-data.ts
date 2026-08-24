/* Souq grocery — sector-authentic demo catalog: fresh produce, pantry
   staples, dairy and butchery with unit pricing and daily deals. */

const IMG = {
  vegetables: '/images/store/vegetables.jpg',
  fruits: '/images/store/fruits.jpg',
  spices: '/images/store/spices.jpg',
  bakery: '/images/store/bakery.jpg',
  coffee: '/images/store/coffee.jpg',
  banner: '/images/store/banner-store.jpg',
};

/* A distinct photo per product (cycled by catalog order) so 29 items never
   collapse into one repeated vegetables photo. */
const PHOTOS = [
  '/images/demo/products/store3_p1.jpg',
  '/images/demo/products/store3_p5.jpg',
  '/images/store/vegetables.jpg',
  '/images/store/fruits.jpg',
  '/images/demo/products/store3_p2.jpg',
  '/images/demo/products/store3_p4.jpg',
  '/images/store/dairy.jpg',
  '/images/demo/products/store3_p3.jpg',
  '/images/store/bakery.jpg',
  '/images/demo/products/store3_p9.jpg',
  '/images/store/coffee.jpg',
  '/images/demo/products/store3_p12.jpg',
  '/images/store/spices.jpg',
  '/images/demo/products/store3_p10.jpg',
  '/images/demo/products/store3_p11.jpg',
  '/images/store/hypermarket.jpg',
  '/images/store/grocery.jpg',
  '/images/demo/products/store5_p6.jpg',
];

let seq = 0;
const P = (name: string, price: number, categoryId: string, opts: Record<string, any> = {}): any => {
  const photo = PHOTOS[seq % PHOTOS.length];
  seq++;
  return {
    id: `gq-${seq}`,
    name,
    price,
    originalPrice: null,
    sku: `GR-${String(seq).padStart(3, '0')}`,
    stockQuantity: opts.stockQuantity ?? 50,
    categoryId,
    availability: 'in_stock' as const,
    image: photo,
    images: [photo],
    description: 'منتج طازج يُختار يومياً بأفضل جودة وأسعار منافسة.',
    ...opts,
  };
};

export const GROCERY_DEMO = {
  categories: [
    { id: 'c1', name: 'خضار وفواكه', slug: 'produce', image: IMG.vegetables },
    { id: 'c2', name: 'مواد غذائية', slug: 'pantry', image: IMG.spices },
    { id: 'c3', name: 'ألبان وأجبان', slug: 'dairy', image: IMG.bakery },
    { id: 'c4', name: 'مخبز ومعجنات', slug: 'bakery', image: IMG.bakery },
    { id: 'c5', name: 'مشروبات وقهوة', slug: 'drinks', image: IMG.coffee },
    { id: 'c6', name: 'توابل وعطارة', slug: 'spices', image: IMG.spices },
    { id: 'c7', name: 'معلبات ومصنعات', slug: 'canned', image: IMG.spices },
    { id: 'c8', name: 'تنظيف ومنظفات', slug: 'cleaning', image: null },
  ],
  products: [
    P('طماطم بلدي درجة أولى — كيلو', 6, 'c1', { originalPrice: 8, description: 'طماطم حمراء ناضجة تُقطف صباح كل يوم.' }),
    P('خيار هولندي — كيلو', 5.5, 'c1'),
    P('بطاطس زراعة محلية — كيلو', 4, 'c1', { originalPrice: 5 }),
    P('موز فاخر — كيلو', 9, 'c1', {}),
    P('تفاح أحمر مستورد — كيلو', 12, 'c1', { originalPrice: 15 }),
    P('برتقال أبو سرة — كيلو', 7, 'c1'),
    P('ليمون بلدي — ربع كيلو', 3.5, 'c1'),
    P('بقدونس وكزبرة طازجة — حزمة', 2, 'c1'),
    P('أرز بسمتي هندي فاخر ٥ كغم', 62, 'c2', { originalPrice: 75 }),
    P('زيت زيتون بكر ممتاز ١ ليتر', 38, 'c2'),
    P('سكر أبيض ناعم ٢ كغم', 9.5, 'c2'),
    P('طحين فاخر ١٠ كغم', 32, 'c2'),
    P('عدس أحمر مجروش — كيلو', 8.75, 'c2'),
    P('حمص أمريكي كبير — كيلو', 11, 'c2'),
    P('حليب طويل الأجل ١ ليتر', 6.5, 'c3'),
    P('جبنة عكاوي مملحة — نصف كيلو', 22, 'c3', { originalPrice: 26 }),
    P('لبن رايب منعش — ٧٥٠ مل', 5, 'c3'),
    P('بيض بلدي طبق ٣٠ حبة', 24, 'c3', { stockQuantity: 18 }),
    P('خبز عربي طازج — كيس ٦ أقراص', 3, 'c4'),
    P('كعك بالسمسم وحبة البركة — علبة', 12, 'c4'),
    P('قهوة عربية مطحونة بالهيل — ٢٥٠ غم', 28, 'c5', { originalPrice: 34 }),
    P('شاي أسود فاخر — ٤٥٠ غم', 16.5, 'c5'),
    P('مياه معدنية — عبوة ١٢ × ١.٥ ليتر', 21, 'c5'),
    P('زعفران أصلي — غرام', 45, 'c6'),
    P('بهارات مشكلة للجمبر — ١٠٠ غم', 9, 'c6'),
    P('زعتر أخضر فاخر — ٥٠٠ غم', 18, 'c6', { originalPrice: 23 }),
    P('تونة بزيت الزيتون — ٣ علب', 17, 'c7'),
    P('دبس رمان سميك — ٧٥٠ غم', 14, 'c7'),
    P('منظف أرضيات مركّز — ٣ ليتر', 15.5, 'c8'),
    P('مساحيق غسيل أوتوماتيك — ٥ كغم', 42, 'c8', { originalPrice: 49 }),
  ],
  banners: [
    {
      title: 'خضار وفواكه طازجة يومياً',
      subtitle: 'من السوق لباب بيتك',
      image: IMG.banner,
      button_text: 'تسوق الطازج',
      button_link: '#souq-deals',
    },
    {
      title: 'عرض المؤونة الأسبوعي',
      subtitle: 'وفّر حتى 25%',
      image: IMG.spices,
      button_text: 'شاهد العروض',
      button_link: '#souq-deals',
    },
  ],
};

export function buildGroceryPreviewStoreData(store: any, branding?: Record<string, any>): any {
  return {
    ...store,
    categories: GROCERY_DEMO.categories,
    products: GROCERY_DEMO.products.map((p) => ({ ...p })),
    config: {
      ...(branding?.config || {}),
      storeName: store?.name || 'سوق البقالة',
      logo: branding?.config?.logo || store?.logo,
      socialMedia: branding?.config?.socialMedia || {},
    },
    content: { banners: GROCERY_DEMO.banners },
  };
}
