/* Local demo photography — served from public/images/store so previews
   never depend on external hosts or the legacy builder catalog. */
const IMG = {
  clothes: '/images/store/clothes.jpg',
  kidsClothes: '/images/store/kids-clothes.jpg',
  cosmetics: '/images/store/cosmetics.jpg',
  perfume: '/images/store/perfume.jpg',
  banner: '/images/store/banner-store.jpg',
};

/** Deterministic pseudo-front/back image pair from the local media pool. */
function pair(a: string, b?: string): { image: string; images: string[] } {
  return b ? { image: a, images: [a, b] } : { image: a, images: [a] };
}

const SIZES = ['S', 'M', 'L', 'XL'];
const COLORS = ['أسود', 'بيج', 'زيتي', 'نبيتي'];

export interface FashionDemoProduct {
  id: string;
  name: string;
  price: number;
  originalPrice?: number | null;
  sku: string;
  stockQuantity: number;
  categoryId: string;
  availability: 'in_stock' | 'out_of_stock';
  description?: string;
  variants?: Array<{ name: string; values: string[] }>;
}

let seq = 0;
const P = (
  name: string,
  price: number,
  categoryId: string,
  opts: Partial<FashionDemoProduct> & { alt?: string } = {}
): any => ({
  id: `fa-${++seq}`,
  name,
  price,
  originalPrice: null,
  sku: `ATL-${String(seq).padStart(3, '0')}`,
  stockQuantity: 12,
  categoryId,
  availability: 'in_stock' as const,
  ...pair(IMG.clothes, IMG.kidsClothes),
  description:
    'قطعة مميزة من تشكيلة الأتيليه بخامة عالية وجودة خياطة دقيقة، مناسبة للمناسبات والاستخدام اليومي. متوفرة بعدة مقاسات وألوان.',
  ...opts,
});

export const FASHION_DEMO = {
  categories: [
    { id: 'c1', name: 'عبايات', slug: 'abayas' },
    { id: 'c2', name: 'فساتين سهرة', slug: 'evening-dresses' },
    { id: 'c3', name: 'بلايز وتيشيرتات', slug: 'tops' },
    { id: 'c4', name: 'تنانير', slug: 'skirts' },
    { id: 'c5', name: 'شالات وإيشارب', slug: 'scarves' },
    { id: 'c6', name: 'جاكيتات ومعاطف', slug: 'jackets' },
    { id: 'c7', name: 'ملابس رياضية', slug: 'activewear' },
    { id: 'c8', name: 'حقائب', slug: 'bags' },
  ],
  products: [
    P('عبة كلاسيكية بقصة مستقيمة — تشكيلة رمضان', 320, 'c1', { originalPrice: 420, variants: [{ name: 'المقاس', values: SIZES }, { name: 'اللون', values: COLORS }] }),
    P('عبة إماراتية بتطريز يدوي على الأكمام', 480, 'c1', { variants: [{ name: 'المقاس', values: SIZES }, { name: 'اللون', values: ['أسود', 'كحلي'] }] }),
    P('عبة يومية عملية بقماش الكريب', 210, 'c1', { stockQuantity: 4 }),
    P('فستان سهرة دانتيل بأكمام واسعة', 550, 'c2', { originalPrice: 690, variants: [{ name: 'المقاس', values: SIZES }] }),
    P('فستان سواريه مخملي بلون الزيتون', 610, 'c2', { stockQuantity: 3, variants: [{ name: 'المقاس', values: SIZES }] }),
    P('فستان صيفي بطبعة زهور هادئة', 240, 'c2', { variants: [{ name: 'المقاس', values: SIZES }, { name: 'اللون', values: ['وردي', 'أزرق'] }] }),
    P('بلوزة ساتان بياقة قلب', 120, 'c3', { originalPrice: 165, variants: [{ name: 'اللون', values: COLORS }] }),
    P('تيشيرت قطن أساسي — بساطة الأتيليه', 75, 'c3', { variants: [{ name: 'المقاس', values: SIZES }, { name: 'اللون', values: ['أبيض', 'أسود', 'رمادي'] }] }),
    P('قميص أوفر سايز كتان', 145, 'c3'),
    P('تنورة ميدي بليسيه طويلة', 180, 'c4', { originalPrice: 230, variants: [{ name: 'اللون', values: ['بيج', 'أسود'] }] }),
    P('تنورة قماش مستقيم بخصر مطاطي', 130, 'c4'),
    P('شال حرير مزدوج بتدرج لوني', 95, 'c5', { stockQuantity: 4 }),
    P('إيشارب شيفون فاخر — مجموعة الألوان الباستيل', 65, 'c5', { variants: [{ name: 'اللون', values: ['وردي', 'بيج', 'سماوي', 'أخضر فاتح'] }] }),
    P('جاكيت تويد بأزرار ذهبية', 380, 'c6', { originalPrice: 450 }),
    P('معطف صوف طويل بحزام', 520, 'c6', { stockQuantity: 5, variants: [{ name: 'اللون', values: ['كاميل', 'رمادي'] }] }),
    P('طقم رياضي ثلاث قطع قطن ليكرا', 220, 'c7', { variants: [{ name: 'المقاس', values: SIZES }, { name: 'اللون', values: ['زيتي', 'بيج', 'أسود'] }] }),
    P('ليقنز رياضي بخصر عالي', 110, 'c7'),
    P('حقيبة يد جلد فاخر بحزام كتف', 290, 'c8', { originalPrice: 350 }),
    P('حقيبة كلتش سهرة بإكسسوار معدني', 160, 'c8'),
  ],
  banners: [
    {
      title: 'تشكيلة الموسم الجديدة',
      subtitle: 'NEW COLLECTION',
      image: IMG.banner,
      button_text: 'اكتشفي التشكيلة',
      button_link: '#atelier-new',
    },
    {
      title: 'كولكشن العبايات الفاخرة',
      subtitle: 'ABAYA EDIT',
      image: IMG.clothes,
      button_text: 'تسوقي الآن',
      button_link: '#atelier-best',
    },
    {
      title: 'تخفيضات نهاية الموسم حتى 40%',
      subtitle: 'SALE',
      image: IMG.kidsClothes,
      button_text: 'شاهدي العروض',
      button_link: '#atelier-best',
    },
  ],
};

/**
 * Merges the merchant's real branding into the sector demo catalog so the
 * gallery preview shows THEIR store wearing the template.
 */
export function buildFashionPreviewStoreData(store: any, branding?: Record<string, any>): any {
  return {
    ...store,
    categories: FASHION_DEMO.categories,
    products: FASHION_DEMO.products.map((p: any) => ({ ...p })),
    config: {
      ...(branding?.config || {}),
      storeName: store?.name || 'أتيليه الموضة',
      logo: branding?.config?.logo || store?.logo,
      currency: branding?.config?.currency || '₪',
      socialMedia: branding?.config?.socialMedia || {},
    },
    content: { banners: FASHION_DEMO.banners },
  };
}
