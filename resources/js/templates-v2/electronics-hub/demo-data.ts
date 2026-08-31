/* Electronics Hub — sector demo catalog: phones, laptops, audio, wearables
   with spec-sheet style descriptions. */

const IMG = {
  electronics: '/images/store/electronics.jpg',
  banner: '/images/store/banner-store.jpg',
};

/* A distinct photo per product (cycled by catalog order) — phones, laptops,
   audio and gaming gear each show their own real device shot. */
const PHOTOS = [
  '/images/demo/products/store2_p2.jpg',
  '/images/demo/products/store2_p1.jpg',
  '/images/demo/products/store2_p3.jpg',
  '/images/demo/products/store2_p4.jpg',
  '/images/demo/products/store2_p6.jpg',
  '/images/demo/products/store2_p7.jpg',
  '/images/demo/products/store2_p8.jpg',
  '/images/demo/products/store2_p9.jpg',
  '/images/demo/products/store2_p10.jpg',
  '/images/demo/products/store2_p11.jpg',
  '/images/demo/products/store2_p12.jpg',
  '/images/demo/products/store2_p5.jpg',
  '/images/store/electronics.jpg',
];

let seq = 0;
const P = (name: string, price: number, categoryId: string, opts: Record<string, any> = {}): any => {
  const photo = PHOTOS[seq % PHOTOS.length];
  seq++;
  return {
    id: `el-${seq}`,
    name,
    price,
    originalPrice: null,
    sku: `EL-${String(seq).padStart(3, '0')}`,
    stockQuantity: opts.stockQuantity ?? 12,
    categoryId,
    availability: 'in_stock' as const,
    image: photo,
    images: [photo],
    description: 'جهاز أصلي بضمان الوكيل الرسمي، بعلبته الكاملة وكامل ملحقاته.',
    ...opts,
  };
};

export const ELECTRONICS_DEMO = {
  categories: [
    { id: 'c1', name: 'هواتف ذكية', slug: 'phones', image: IMG.electronics },
    { id: 'c2', name: 'لابتوبات وأجهزة', slug: 'laptops', image: IMG.electronics },
    { id: 'c3', name: 'سماعات وصوتيات', slug: 'audio', image: IMG.electronics },
    { id: 'c4', name: 'ساعات ذكية', slug: 'wearables', image: IMG.electronics },
    { id: 'c5', name: 'أجهزة منزلية ذكية', slug: 'smart-home', image: IMG.electronics },
    { id: 'c6', name: 'ملحقات وشواحن', slug: 'accessories', image: IMG.electronics },
    { id: 'c7', name: 'شاشات وتلفزيونات', slug: 'tvs', image: IMG.electronics },
    { id: 'c8', name: 'ألعاب وترفيه', slug: 'gaming', image: IMG.electronics },
  ],
  products: [
    P('هاتف جالكسي إس الترا 512GB', 3899, 'c1', {
      originalPrice: 4250,
      description: 'الشاشة: 6.8 بوصة QHD+ بمعدل 120Hz\nالمعالج: ثماني النواة أحدث جيل\nالكاميرا: رباعية 200MP\nالبطارية: 5000mAh شحن سريع 45W',
      variants: [{ name: 'الذاكرة', values: ['256GB', '512GB', '1TB'] }],
    }),
    P('آيفون برو ماكس 256GB', 4550, 'c1', {
      description: 'الشاشة: Super Retina XDR 6.9"\nالمعالج: A18 Pro\nالكاميرا: ثلاثية 48MP\nالهيكل: تيتانيوم',
      variants: [{ name: 'اللون', values: ['تيتانيوم طبيعي', 'أسود', 'صحراوي'] }],
      stockQuantity: 6,
    }),
    P('هاتف اقتصادي 128GB مزدوج الشريحة', 699, 'c1', { originalPrice: 780 }),
    P('لابتوب أعمال 14" i7 / 16GB / 512SSD', 3290, 'c2', {
      description: 'المعالج: Intel Core i7 الجيل 13\nالذاكرة: 16GB DDR5\nالتخزين: SSD 512GB\nالوزن: 1.3 كغم فقط',
    }),
    P('لابتوب ألعاب RTX 4060 / 15.6" 165Hz', 4890, 'c2', {
      originalPrice: 5200,
      description: 'كرت الشاشة: RTX 4060 8GB\nالمعالج: Ryzen 7\nالشاشة: 15.6" 165Hz\nتبريد: نظام ثنائي المراوح',
    }),
    P('تابلت 11" بشاشة 2K + قلم', 1450, 'c2'),
    P('سماعة لاسلكية عازلة للضوضاء ANC', 689, 'c3', {
      originalPrice: 799,
      description: 'عزل ضوضاء نشط هجين\nبطارية: 40 ساعة\nبلوتوث 5.3 multipoint\nشحن سريع 10 دقائق = 5 ساعات',
    }),
    P('إيربودز لاسلكية مع علبة شحن', 249, 'c3'),
    P('مكبر صوت بلوتوث مقاوم للماء IPX7', 189, 'c3'),
    P('ساعة ذكية GPS بشاشة AMOLED', 749, 'c4', {
      description: 'الشاشة: AMOLED 1.43"\nGPS مزدوج التردد\nقياس الأكسجين والنبض 24/7\nبطارية تصل 14 يوم',
      variants: [{ name: 'السوار', values: ['سيليكون', 'جلد', 'معدن'] }],
    }),
    P('سوار لياقة خفيف بشاشة ملونة', 129, 'c4'),
    P('كاميرا مراقبة ذكية 2K داخلية', 229, 'c5', { originalPrice: 260 }),
    P('مصباح ذكي RGB — قطعتان', 89, 'c5'),
    P('شاحن سريع 65W ثلاثي المنافذ GaN', 149, 'c6'),
    P('بنك طاقة 20000mAh شحن سريع', 179, 'c6'),
    P('تلفزيون ذكي 55" 4K HDR', 2150, 'c7', {
      originalPrice: 2390,
      description: 'الدقة: 4K UHD HDR10+\nالنظام: Android TV\nالحجم: 55 بوصة\nمنافذ: 3× HDMI 2.1',
      stockQuantity: 5,
    }),
    P('شاشة ألعاب 27" 180Hz 1ms', 1090, 'c7'),
    P('يد تحكم لاسلكية احترافية', 219, 'c8'),
  ],
  banners: [
    {
      title: 'تقنية تليق بك',
      subtitle: 'إصدارات 2026 وصلت',
      image: IMG.banner,
      button_text: 'تصفح المنتجات',
      button_link: '#',
    },
  ],
};

export function buildElectronicsPreviewStoreData(store: any, branding?: Record<string, any>): any {
  return {
    ...store,
    categories: ELECTRONICS_DEMO.categories,
    products: ELECTRONICS_DEMO.products.map((p) => ({ ...p })),
    config: {
      ...(branding?.config || {}),
      storeName: store?.name || 'عالم التقنية',
      logo: branding?.config?.logo || store?.logo,
      socialMedia: branding?.config?.socialMedia || {},
    },
    content: { banners: ELECTRONICS_DEMO.banners },
  };
}
