export interface DemoProduct {
  emoji: string;
  name: string;
  price: number;
  oldPrice?: number;
  rating: number;
  ratingCount: number;
  badge?: string;
  c1: string;
  c2: string;
}

export interface DemoStore {
  id: number;
  name: string;
  tagline: string;
  url: string;
  emoji: string;
  brand: string;
  brandDeep: string;
  bannerTitle: string;
  bannerSub: string;
  coupon: string;
  categories: string[];
  products: DemoProduct[];
}

export const demoStores: DemoStore[] = [
  {
    id: 1,
    name: 'أناقة',
    tagline: 'متجر أزياء وموضة',
    url: 'anana.store',
    emoji: '👗',
    brand: '#a855f7',
    brandDeep: '#7e22ce',
    bannerTitle: 'تخفيضات الموسم حتى 50%',
    bannerSub: 'تشكيلة جديدة وصلت حديثًا — لفترة محدودة',
    coupon: 'ANAN26',
    categories: ['رجالي', 'نسائي', 'أحذية', 'حقائب', 'إكسسوارات'],
    products: [
      { emoji: '👕', name: 'تيشيرت قطني أسود', price: 49, oldPrice: 69, rating: 4.8, ratingCount: 312, badge: 'الأكثر مبيعًا', c1: '#e9d5ff', c2: '#f3e8ff' },
      { emoji: '🧥', name: 'جاكيت جلد صناعي', price: 199, oldPrice: 299, rating: 4.7, ratingCount: 87, badge: 'جديد', c1: '#dbeafe', c2: '#e0f2fe' },
      { emoji: '👖', name: 'جينز سكيني داكن', price: 89, oldPrice: 129, rating: 4.6, ratingCount: 214, c1: '#dbeafe', c2: '#eff6ff' },
      { emoji: '👗', name: 'فستان مسائي أنيق', price: 179, oldPrice: 249, rating: 4.9, ratingCount: 96, badge: 'الأكثر مبيعًا', c1: '#fce7f3', c2: '#fdf2f8' },
      { emoji: '👟', name: 'حذاء رياضي كاجوال', price: 169, oldPrice: 219, rating: 4.7, ratingCount: 183, c1: '#e0e7ff', c2: '#eef2ff' },
      { emoji: '👜', name: 'حقيبة يد جلدية', price: 129, oldPrice: 189, rating: 4.8, ratingCount: 121, c1: '#fef3c7', c2: '#fffbeb' },
      { emoji: '👔', name: 'قميص رسمي حريري', price: 119, oldPrice: 169, rating: 4.5, ratingCount: 74, c1: '#e0e7ff', c2: '#f8fafc' },
      { emoji: '🧢', name: 'كاب بيسبول أسود', price: 49, oldPrice: 69, rating: 4.4, ratingCount: 158, c1: '#e2e8f0', c2: '#f1f5f9' },
      { emoji: '⌚', name: 'ساعة كلاسيكية بجلد', price: 249, oldPrice: 349, rating: 4.8, ratingCount: 64, badge: 'حصرية', c1: '#e9d5ff', c2: '#faf5ff' },
      { emoji: '🧣', name: 'شال صوف محبك', price: 39, oldPrice: 59, rating: 4.6, ratingCount: 99, c1: '#fce7f3', c2: '#fdf4ff' },
      { emoji: '🕶', name: 'نظارات شمسية رياضية', price: 89, oldPrice: 129, rating: 4.3, ratingCount: 143, c1: '#cbd5e1', c2: '#f8fafc' },
      { emoji: '💍', name: 'عقد فضي أنيق', price: 99, oldPrice: 149, rating: 4.7, ratingCount: 52, c1: '#e0e7ff', c2: '#f8fafc' }
    ]
  },
  {
    id: 2,
    name: 'تك ستور',
    tagline: 'متجر الإلكترونيات الحديثة',
    url: 'tecto.shop',
    emoji: '📱',
    brand: '#3b82f6',
    brandDeep: '#1d4ed8',
    bannerTitle: 'عروض إلكترونيات حتى 25%',
    bannerSub: 'أحدث الأجهزة بضمان سنة — توصيل سريع',
    coupon: 'TECH10',
    categories: ['جوالات', 'لابتوبات', 'صوتيات', 'إكسسوارات', 'ألعاب'],
    products: [
      { emoji: '📱', name: 'هاتف ذكي 256GB', price: 1499, oldPrice: 1999, rating: 4.8, ratingCount: 421, badge: 'الأكثر مبيعًا', c1: '#dbeafe', c2: '#eff6ff' },
      { emoji: '💻', name: 'لابتوب احترافي i7', price: 3799, oldPrice: 4499, rating: 4.9, ratingCount: 187, c1: '#e0e7ff', c2: '#f8fafc' },
      { emoji: '🎧', name: 'سماعات لاسلكية ANC', price: 159, oldPrice: 229, rating: 4.7, ratingCount: 356, c1: '#ede9fe', c2: '#f5f3ff' },
      { emoji: '⌚', name: 'ساعة ذكية رياضية', price: 399, oldPrice: 649, rating: 4.6, ratingCount: 245, c1: '#c7d2fe', c2: '#eef2ff' },
      { emoji: '🖥', name: 'شاشة 27 بوصة 144Hz', price: 899, oldPrice: 1299, rating: 4.8, ratingCount: 134, c1: '#dbeafe', c2: '#f0f9ff' },
      { emoji: '🎮', name: 'جهاز ألعاب حديث', price: 1499, oldPrice: 1799, rating: 4.9, ratingCount: 198, badge: 'الأكثر مبيعًا', c1: '#dcfce7', c2: '#f0fdf4' },
      { emoji: '📷', name: 'كاميرا احترافية 4K', price: 2299, oldPrice: 3299, rating: 4.7, ratingCount: 89, c1: '#e2e8f0', c2: '#f8fafc' },
      { emoji: '🔋', name: 'شاحن سريع 65W', price: 89, oldPrice: 149, rating: 4.5, ratingCount: 512, c1: '#fef3c7', c2: '#fffbeb' },
      { emoji: '💾', name: 'قرص SSD 1TB سريع', price: 249, oldPrice: 349, rating: 4.8, ratingCount: 231, c1: '#dbeafe', c2: '#f8fafc' },
      { emoji: '⌨️', name: 'كيبورد ميكانيكي RGB', price: 199, oldPrice: 299, rating: 4.6, ratingCount: 164, c1: '#ede9fe', c2: '#f5f3ff' },
      { emoji: '🖱', name: 'ماوس ألعاب 16000DPI', price: 119, oldPrice: 199, rating: 4.4, ratingCount: 177, c1: '#fce7f3', c2: '#fdf2f8' },
      { emoji: '🔊', name: 'مكبر صوت ذكي كامل', price: 349, oldPrice: 499, rating: 4.5, ratingCount: 92, c1: '#e0e7ff', c2: '#f5f3ff' }
    ]
  },
  {
    id: 3,
    name: 'ماركت',
    tagline: 'سوبرماركت البيت الأقرب',
    url: 'souq.shop',
    emoji: '🛒',
    brand: '#22c55e',
    brandDeep: '#166534',
    bannerTitle: 'عروض اليوم — حتى 40%',
    bannerSub: 'خضار طازجة كل صباح — توصيل خلال 24 ساعة',
    coupon: 'FRESH15',
    categories: ['خضار وفواكه', 'ألبان', 'لحوم', 'مشروبات', 'حلويات'],
    products: [
      { emoji: '🍎', name: 'تفاح أحمر طازج / كغ', price: 8, oldPrice: 10, rating: 4.8, ratingCount: 640, badge: 'عرض اليوم', c1: '#fecaca', c2: '#fee2e2' },
      { emoji: '🍅', name: 'طماطم بلدية / كغو', price: 9, rating: 4.7, ratingCount: 388, badge: 'طازج', c1: '#fda4af', c2: '#fecdd3' },
      { emoji: '🥛', name: 'حليب طبيعي 1 لتر', price: 11, rating: 4.6, ratingCount: 512, c1: '#bfdbfe', c2: '#eff6ff' },
      { emoji: '🍞', name: 'خبز فرنساوي طازج', price: 7, rating: 4.9, ratingCount: 431, c1: '#fde68a', c2: '#fef3c7' },
      { emoji: '🧀', name: 'جبنة عكاوي 500غ', price: 24, oldPrice: 32, rating: 4.7, ratingCount: 276, c1: '#fde68a', c2: '#fffbeb' },
      { emoji: '🍌', name: 'موز كافنديش / كغو', price: 9, oldPrice: 15, rating: 4.5, ratingCount: 359, c1: '#fef08a', c2: '#fef9c3' },
      { emoji: '🥩', name: 'لحمة طازجة / كغو', price: 45, oldPrice: 60, rating: 4.8, ratingCount: 205, badge: 'عرض', c1: '#fecaca', c2: '#fdf2f8' },
      { emoji: '🍗', name: 'دجاج طازج كامل', price: 28, rating: 4.6, ratingCount: 344, badge: 'طازج', c1: '#fed7aa', c2: '#fff7ed' },
      { emoji: '☕', name: 'قهوة عربية فاخرة 250غ', price: 28, oldPrice: 45, rating: 4.9, ratingCount: 167, c1: '#d6d3d1', c2: '#fafaf9' },
      { emoji: '🍯', name: 'عسل جبلي طبيعي 500غ', price: 39, oldPrice: 59, rating: 4.9, ratingCount: 122, c1: '#fde68a', c2: '#fef9c3' },
      { emoji: '🍫', name: 'شوكولاتة حليب بالمكسرات', price: 15, oldPrice: 22, rating: 4.7, ratingCount: 289, c1: '#d6d3d1', c2: '#faf5f0' },
      { emoji: '🧃', name: 'عصير برتقال طبيعي 1ل', price: 13, rating: 4.5, ratingCount: 176, c1: '#fdba74', c2: '#ffedd5' }
    ]
  },
  {
    id: 4,
    name: 'بريق',
    tagline: 'عطور وتجميل راقي',
    url: 'bariq.shop',
    emoji: '🌺',
    brand: '#f59e0b',
    brandDeep: '#b45309',
    bannerTitle: 'عطور وهدايا مقدمة',
    bannerSub: 'شحن مجاني للطلبات فوق 200₪',
    coupon: 'GLOW20',
    categories: ['عطور', 'مكياج', 'بشرة', 'هدايا'],
    products: [
      { emoji: '💄', name: 'أحمر شفاه ثابت فحدة', price: 49, oldPrice: 79, rating: 4.8, ratingCount: 402, badge: 'الأكثر مبيعًا', c1: '#fecdd3', c2: '#fee2e2' },
      { emoji: '🌸', name: 'عطر نسائي فرنسي 100مل', price: 199, oldPrice: 299, rating: 4.9, ratingCount: 231, c1: '#fbcfe8', c2: '#fdf2f8' },
      { emoji: '🫧', name: 'عطر رجالي خشبي 100مل', price: 189, oldPrice: 279, rating: 4.8, ratingCount: 178, c1: '#d6d3d1', c2: '#f5f5f4' },
      { emoji: '🧴', name: 'مرطب وجه يومي SPF50', price: 89, oldPrice: 129, rating: 4.7, ratingCount: 291, c1: '#a7f3d0', c2: '#ecfdf5' },
      { emoji: '💅', name: 'طلاء أظافر لماع 15مل', price: 39, oldPrice: 59, rating: 4.5, ratingCount: 336, c1: '#fbcfe8', c2: '#fdf2f8' },
      { emoji: '🥑', name: 'سيروم تنظيف عميق', price: 119, oldPrice: 159, rating: 4.6, ratingCount: 143, c1: '#bbf7d0', c2: '#f0fdf4' },
      { emoji: '🧼', name: 'صابون طبيعي بيتي', price: 29, oldPrice: 49, rating: 4.4, ratingCount: 208, c1: '#fde68a', c2: '#fffbeb' },
      { emoji: '👁', name: 'ماسكارا مكثفة سوداء', price: 79, oldPrice: 99, rating: 4.6, ratingCount: 187, c1: '#cbd5e1', c2: '#f8fafc' },
      { emoji: '✨', name: 'جلو شفايه لامع', price: 49, oldPrice: 69, rating: 4.5, ratingCount: 214, c1: '#fecdd3', c2: '#fff1f2' },
      { emoji: '🚿', name: 'جل استحمام مرطب 250مل', price: 59, oldPrice: 79, rating: 4.4, ratingCount: 156, c1: '#bfdbfe', c2: '#eff6ff' },
      { emoji: '🎀', name: 'طقم هدايا عطر + لوشن', price: 149, oldPrice: 199, rating: 4.8, ratingCount: 98, badge: 'هدية مميزة', c1: '#fbcfe8', c2: '#fce7f3' },
      { emoji: '🪮', name: 'مشط حراري فاخر', price: 69, oldPrice: 99, rating: 4.3, ratingCount: 131, c1: '#e9d5ff', c2: '#f5f3ff' }
    ]
  },
  {
    id: 5,
    name: 'بيتي',
    tagline: 'أثاث وخلل منزلي',
    url: 'beity.store',
    emoji: '🛋',
    brand: '#f97316',
    brandDeep: '#c2410c',
    bannerTitle: 'أسبوع البيت — خصومات حتى 35%',
    bannerSub: 'أثاث وديكور بجودة عالية وتوصيل للبيت',
    coupon: 'HOME20',
    categories: ['أثاث', 'إضاءة', 'أجهزة', 'ديكور'],
    products: [
      { emoji: '🛋', name: 'كنبة عائلية 3 مقاعد', price: 2199, oldPrice: 2899, rating: 4.8, ratingCount: 76, badge: 'الأكثر مبيعًا', c1: '#fdba74', c2: '#fff7ed' },
      { emoji: '🛏', name: 'سرير خشبي مع فراش', price: 1499, oldPrice: 1999, rating: 4.7, ratingCount: 92, c1: '#fed7aa', c2: '#fff7ed' },
      { emoji: '🪑', name: 'كرسي مكتب مريح', price: 189, oldPrice: 299, rating: 4.5, ratingCount: 167, c1: '#d6d3d1', c2: '#fafaf9' },
      { emoji: '🍽', name: 'طقم سفرة 12 قطعة', price: 399, oldPrice: 549, rating: 4.6, ratingCount: 89, c1: '#bae6fd', c2: '#f0f9ff' },
      { emoji: '💡', name: 'لمبة LED ذكية عسغ', price: 39, oldPrice: 59, rating: 4.7, ratingCount: 244, c1: '#fef08a', c2: '#fefce8' },
      { emoji: '🧹', name: 'مكنسة كهربائية لاسلكية', price: 299, oldPrice: 449, rating: 4.6, ratingCount: 132, c1: '#cbd5e1', c2: '#f8fafc' },
      { emoji: '☕', name: 'غلاية كهربائية زجاجية', price: 79, oldPrice: 139, rating: 4.5, ratingCount: 204, c1: '#bae6fd', c2: '#f0f9ff' },
      { emoji: '🍞', name: 'محمصة خبز استانلس', price: 89, oldPrice: 149, rating: 4.4, ratingCount: 118, c1: '#e2e8f0', c2: '#f8fafc' },
      { emoji: '🪞', name: 'مرآة زينة دائرية LED', price: 129, oldPrice: 189, rating: 4.7, ratingCount: 91, c1: '#e0e7ff', c2: '#eef2ff' },
      { emoji: '🪴', name: 'نبات صناعي بأناية', price: 49, oldPrice: 79, rating: 4.3, ratingCount: 146, c1: '#bbf7d0', c2: '#f0fdf4' },
      { emoji: '🧺', name: 'سلة تخزين خيزران', price: 35, oldPrice: 49, rating: 4.5, ratingCount: 88, c1: '#fed7aa', c2: '#fffbeb' },
      { emoji: '🕯', name: 'شمعة معطرة 3 فتلان', price: 69, oldPrice: 99, rating: 4.6, ratingCount: 74, c1: '#fecdd3', c2: '#fff1f2' }
    ]
  }
];