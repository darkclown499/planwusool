/* Restaurant Menu — sector demo catalog: grills, appetizers, mains,
   desserts and drinks, menu-board style. */

const IMG = {
  restaurant: '/images/store/restaurant-dish.jpg',
  sweets: '/images/store/sweets.jpg',
  coffee: '/images/store/coffee.jpg',
  banner: '/images/store/banner-store.jpg',
};

let seq = 0;
const P = (name: string, price: number, categoryId: string, opts: Record<string, any> = {}): any => ({
  id: `rs-${++seq}`,
  name,
  price,
  originalPrice: null,
  sku: `RS-${String(seq).padStart(3, '0')}`,
  stockQuantity: opts.stockQuantity ?? 30,
  categoryId,
  availability: 'in_stock' as const,
  image: IMG.restaurant,
  images: [IMG.restaurant],
  description: 'يُحضّر طازجاً عند الطلب بمكونات مختارة وتوابل بيتية.',
  ...opts,
});

export const RESTAURANT_DEMO = {
  categories: [
    { id: 'c1', name: 'المقبلات', slug: 'appetizers', image: IMG.restaurant },
    { id: 'c2', name: 'السلطات', slug: 'salads', image: IMG.restaurant },
    { id: 'c3', name: 'المشاوي على الفحم', slug: 'grills', image: IMG.restaurant },
    { id: 'c4', name: 'الأطباق الرئيسية', slug: 'mains', image: IMG.restaurant },
    { id: 'c5', name: 'الحلويات', slug: 'desserts', image: IMG.sweets },
    { id: 'c6', name: 'المشروبات', slug: 'drinks', image: IMG.coffee },
  ],
  products: [
    P('حمص بالطحينة وزيت الزيتون', 18, 'c1'),
    P('متبل باذنجان مشوي', 20, 'c1'),
    P('سمبوسك جبن — ٦ حبات', 22, 'c1', { originalPrice: 26 }),
    P('أجنحة دجاج حارة — ٨ حبات', 32, 'c1', { variants: [{ name: 'الحارّة', values: ['عادية', 'حارة 🔥', 'نارية 🔥🔥'] }] }),
    P('فتوش الخضار بخبز محمص', 24, 'c2'),
    P('سلطة سيزر بالدجاج المشوي', 34, 'c2'),
    P('تبولة ناعمة بزيت الزيتون', 22, 'c2'),
    P('مشاوي مشكلة لعائلة ٤ أشخاص', 165, 'c3', { originalPrice: 190, variants: [{ name: 'الحجم', values: ['لشخصين', 'عائلي'] }] }),
    P('كباب حلبي — ١٢ سيخ', 85, 'c3'),
    P('شيش طاووق بالثوم والليمون', 62, 'c3'),
    P('ريش غنم على الفحم — كيلو', 120, 'c3', { stockQuantity: 8 }),
    P('دجاج مسحب على الطريقة الشامية', 55, 'c4', { originalPrice: 64 }),
    P('كبسة لحم مع الرز المفلفل', 78, 'c4'),
    P('منسف جمزة باللبن الجميد', 88, 'c4'),
    P('كنافة بالقشطة — صينية وسط', 42, 'c5'),
    P('مهلبية بماء الورد ومكسرات', 16, 'c5'),
    P('تشيكوك حلى الشوكولاتة الباردة', 21, 'c5'),
    P('ليموناضة نعنع طازجة — إبريق', 14, 'c6'),
    P('شاي مغربي بالنعنع — براد', 12, 'c6'),
    P('قهوة عربية بالهيل — دلة', 15, 'c6'),
  ],
  banners: [
    {
      title: 'من قائمة الشيف',
      subtitle: 'مشاوي على الفحم • توابل بيتية • خبز التنور',
      image: IMG.banner,
      button_text: 'اطلب الآن',
      button_link: '#chef-picks',
    },
  ],
};

export function buildRestaurantPreviewStoreData(store: any, branding?: Record<string, any>): any {
  return {
    ...store,
    categories: RESTAURANT_DEMO.categories,
    products: RESTAURANT_DEMO.products.map((p) => ({ ...p })),
    config: {
      ...(branding?.config || {}),
      storeName: store?.name || 'مطعم الفحم',
      logo: branding?.config?.logo || store?.logo,
      socialMedia: branding?.config?.socialMedia || {},
    },
    content: { banners: RESTAURANT_DEMO.banners },
  };
}
