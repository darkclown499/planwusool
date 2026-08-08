const unsplash = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=320&q=60`;
const flickr = (url: string) => url;

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
  image?: string;
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
    url: 'anana.wusool.ps',
    emoji: '👗',
    brand: '#a855f7',
    brandDeep: '#7e22ce',
    bannerTitle: 'تخفيضات الموسم حتى 50%',
    bannerSub: 'تشكيلة جديدة وصلت حديثًا — لفترة محدودة',
    coupon: 'ANAN26',
    categories: ['رجالي', 'نسائي', 'أحذية', 'حقائب', 'إكسسوارات'],
    products: [
      { emoji: '👕', name: 'تيشيرت قطني أسود', price: 49, oldPrice: 69, rating: 4.8, ratingCount: 312, badge: 'الأكثر مبيعًا', c1: '#e9d5ff', c2: '#f3e8ff', image: unsplash('1521572163474-6864f9cf17ab') },
      { emoji: '🧥', name: 'جاكيت جلد صناعي', price: 199, oldPrice: 299, rating: 4.7, ratingCount: 87, badge: 'جديد', c1: '#dbeafe', c2: '#e0f2fe', image: unsplash('1551028719-00167b16eac5') },
      { emoji: '👖', name: 'جينز سكيني داكن', price: 89, oldPrice: 129, rating: 4.6, ratingCount: 214, c1: '#dbeafe', c2: '#eff6ff', image: unsplash('1542272604-787c3835535d') },
      { emoji: '👗', name: 'فستان مسائي أنيق', price: 179, oldPrice: 249, rating: 4.9, ratingCount: 96, badge: 'الأكثر مبيعًا', c1: '#fce7f3', c2: '#fdf2f8', image: unsplash('1595777457583-95e059d581b8') },
      { emoji: '👟', name: 'حذاء رياضي كاجوال', price: 169, oldPrice: 219, rating: 4.7, ratingCount: 183, c1: '#e0e7ff', c2: '#eef2ff', image: unsplash('1542291026-7eec264c27ff') },
      { emoji: '👜', name: 'حقيبة يد جلدية', price: 129, oldPrice: 189, rating: 4.8, ratingCount: 121, c1: '#fef3c7', c2: '#fffbeb', image: unsplash('1584917865442-de89df76afd3') },
      { emoji: '👔', name: 'قميص رسمي حريري', price: 119, oldPrice: 169, rating: 4.5, ratingCount: 74, c1: '#e0e7ff', c2: '#f8fafc', image: unsplash('1602810318383-e386cc2a3ccf') },
      { emoji: '🧢', name: 'كاب بيسبول أسود', price: 49, oldPrice: 69, rating: 4.4, ratingCount: 158, c1: '#e2e8f0', c2: '#f1f5f9', image: unsplash('1521369909029-2afed882baee') },
      { emoji: '⌚', name: 'ساعة كلاسيكية بجلد', price: 249, oldPrice: 349, rating: 4.8, ratingCount: 64, badge: 'حصرية', c1: '#e9d5ff', c2: '#faf5ff', image: unsplash('1524592094714-0f0654e20314') },
      { emoji: '🧣', name: 'شال صوف محبك', price: 39, oldPrice: 59, rating: 4.6, ratingCount: 99, c1: '#fce7f3', c2: '#fdf4ff', image: unsplash('1591047139829-d91aecb6caea') },
      { emoji: '🕶', name: 'نظارات شمسية رياضية', price: 89, oldPrice: 129, rating: 4.3, ratingCount: 143, c1: '#cbd5e1', c2: '#f8fafc', image: unsplash('1511499767150-a48a237f0083') },
      { emoji: '💍', name: 'عقد فضي أنيق', price: 99, oldPrice: 149, rating: 4.7, ratingCount: 52, c1: '#e0e7ff', c2: '#f8fafc', image: unsplash('1599643478518-a784e5dc4c8f') }
    ]
  },
  {
    id: 2,
    name: 'تك ستور',
    tagline: 'متجر الإلكترونيات الحديثة',
    url: 'tecto.wusool.ps',
    emoji: '📱',
    brand: '#3b82f6',
    brandDeep: '#1d4ed8',
    bannerTitle: 'عروض إلكترونيات حتى 25%',
    bannerSub: 'أحدث الأجهزة بضمان سنة — توصيل سريع',
    coupon: 'TECH10',
    categories: ['جوالات', 'لابتوبات', 'صوتيات', 'إكسسوارات', 'ألعاب'],
    products: [
      { emoji: '📱', name: 'هاتف ذكي 256GB', price: 1499, oldPrice: 1999, rating: 4.8, ratingCount: 421, badge: 'الأكثر مبيعًا', c1: '#dbeafe', c2: '#eff6ff', image: unsplash('1511707171634-5f897ff02aa9') },
      { emoji: '💻', name: 'لابتوب احترافي i7', price: 3799, oldPrice: 4499, rating: 4.9, ratingCount: 187, c1: '#e0e7ff', c2: '#f8fafc', image: unsplash('1496181133206-80ce9b88a853') },
      { emoji: '🎧', name: 'سماعات لاسلكية ANC', price: 159, oldPrice: 229, rating: 4.7, ratingCount: 356, c1: '#ede9fe', c2: '#f5f3ff', image: unsplash('1505740420928-5e560c06d30e') },
      { emoji: '⌚', name: 'ساعة ذكية رياضية', price: 399, oldPrice: 649, rating: 4.6, ratingCount: 245, c1: '#c7d2fe', c2: '#eef2ff', image: unsplash('1523275335684-37898b6baf30') },
      { emoji: '🖥', name: 'شاشة 27 بوصة 144Hz', price: 899, oldPrice: 1299, rating: 4.8, ratingCount: 134, c1: '#dbeafe', c2: '#f0f9ff', image: unsplash('1593305841991-05c297ba4575') },
      { emoji: '🎮', name: 'جهاز ألعاب حديث', price: 1499, oldPrice: 1799, rating: 4.9, ratingCount: 198, badge: 'الأكثر مبيعًا', c1: '#dcfce7', c2: '#f0fdf4', image: unsplash('1606144042614-b2417e99c4e3') },
      { emoji: '📷', name: 'كاميرا احترافية 4K', price: 2299, oldPrice: 3299, rating: 4.7, ratingCount: 89, c1: '#e2e8f0', c2: '#f8fafc', image: unsplash('1502920917128-1aa500764cbd') },
      { emoji: '🔌', name: 'شاحن سريع 65W', price: 89, oldPrice: 149, rating: 4.5, ratingCount: 512, c1: '#fef3c7', c2: '#fffbeb', image: unsplash('1583863788434-e58a36330cf0') },
      { emoji: '💾', name: 'قرص SSD 1TB سريع', price: 249, oldPrice: 349, rating: 4.8, ratingCount: 231, c1: '#dbeafe', c2: '#f8fafc', image: flickr('https://live.staticflickr.com/3829/12628268695_78885d2a5b.jpg') },
      { emoji: '⌨️', name: 'كيبورد ميكانيكي RGB', price: 199, oldPrice: 299, rating: 4.6, ratingCount: 164, c1: '#ede9fe', c2: '#f5f3ff', image: unsplash('1587829741301-dc798b83add3') },
      { emoji: '🖱', name: 'ماوس ألعاب 16000DPI', price: 119, oldPrice: 199, rating: 4.4, ratingCount: 177, c1: '#fce7f3', c2: '#fdf2f8', image: unsplash('1615663245857-ac93bb7c39e7') },
      { emoji: '🔊', name: 'مكبر صوت ذكي كامل', price: 349, oldPrice: 499, rating: 4.5, ratingCount: 92, c1: '#e0e7ff', c2: '#f5f3ff', image: unsplash('1608043152269-423dbba4e7e1') }
    ]
  },
  {
    id: 3,
    name: 'ماركت',
    tagline: 'سوبرماركت البيت الأقرب',
    url: 'souq.wusool.ps',
    emoji: '🛒',
    brand: '#22c55e',
    brandDeep: '#166534',
    bannerTitle: 'عروض اليوم — حتى 40%',
    bannerSub: 'خضار طازجة كل صباح — توصيل خلال 24 ساعة',
    coupon: 'FRESH15',
    categories: ['خضار وفواكه', 'ألبان', 'لحوم', 'مشروبات', 'حلويات'],
    products: [
      { emoji: '🍎', name: 'تفاح أحمر طازج / كغ', price: 8, oldPrice: 10, rating: 4.8, ratingCount: 640, badge: 'عرض اليوم', c1: '#fecaca', c2: '#fee2e2', image: unsplash('1560806887-1e4cd0b6cbd6') },
      { emoji: '🍅', name: 'طماطم بلدية / كغ', price: 9, rating: 4.7, ratingCount: 388, badge: 'طازج', c1: '#fda4af', c2: '#fecdd3', image: unsplash('1592841200221-a6898f307baa') },
      { emoji: '🥛', name: 'حليب طبيعي 1 لتر', price: 11, rating: 4.6, ratingCount: 512, c1: '#bfdbfe', c2: '#eff6ff', image: unsplash('1550583724-b2692b85b150') },
      { emoji: '🍞', name: 'خبز فرنساوي طازج', price: 7, rating: 4.9, ratingCount: 431, c1: '#fde68a', c2: '#fef3c7', image: unsplash('1509440159596-0249088772ff') },
      { emoji: '🧀', name: 'جبنة عكاوي 500غ', price: 24, oldPrice: 32, rating: 4.7, ratingCount: 276, c1: '#fde68a', c2: '#fffbeb', image: unsplash('1486297678162-eb2a19b0a32d') },
      { emoji: '🍌', name: 'موز كافنديش / كغ', price: 9, oldPrice: 15, rating: 4.5, ratingCount: 359, c1: '#fef08a', c2: '#fef9c3', image: unsplash('1571771894821-ce9b6c11b08e') },
      { emoji: '🥩', name: 'لحمة طازجة / كغ', price: 45, oldPrice: 60, rating: 4.8, ratingCount: 205, badge: 'عرض', c1: '#fecaca', c2: '#fdf2f8', image: unsplash('1529692236671-f1f6cf9683ba') },
      { emoji: '🍗', name: 'دجاج طازج كامل', price: 28, rating: 4.6, ratingCount: 344, badge: 'طازج', c1: '#fed7aa', c2: '#fff7ed', image: unsplash('1567620905732-2d1ec7ab7445') },
      { emoji: '☕', name: 'قهوة عربية فاخرة 250غ', price: 28, oldPrice: 45, rating: 4.9, ratingCount: 167, c1: '#d6d3d1', c2: '#fafaf9', image: unsplash('1495474472287-4d71bcdd2085') },
      { emoji: '🍯', name: 'عسل جبلي طبيعي 500غ', price: 39, oldPrice: 59, rating: 4.9, ratingCount: 122, c1: '#fde68a', c2: '#fef9c3', image: unsplash('1587049352846-4a222e784d38') },
      { emoji: '🍫', name: 'شوكولاتة حليب بالمكسرات', price: 15, oldPrice: 22, rating: 4.7, ratingCount: 289, c1: '#d6d3d1', c2: '#faf5f0', image: flickr('https://live.staticflickr.com/4127/4998195848_7b99375c74_b.jpg') },
      { emoji: '🧃', name: 'عصير برتقال طبيعي 1ل', price: 13, rating: 4.5, ratingCount: 176, c1: '#fdba74', c2: '#ffedd5', image: unsplash('1600271886742-f049cd451bba') }
    ]
  },
  {
    id: 4,
    name: 'بريق',
    tagline: 'عطور وتجميل راقي',
    url: 'bariq.wusool.ps',
    emoji: '🌺',
    brand: '#f59e0b',
    brandDeep: '#b45309',
    bannerTitle: 'عطور وهدايا مميزة',
    bannerSub: 'شحن مجاني للطلبات فوق 200₪',
    coupon: 'GLOW20',
    categories: ['عطور', 'مكياج', 'بشرة', 'هدايا'],
    products: [
      { emoji: '💄', name: 'أحمر شفاه ثابت مدة', price: 49, oldPrice: 79, rating: 4.8, ratingCount: 402, badge: 'الأكثر مبيعًا', c1: '#fecdd3', c2: '#fee2e2', image: unsplash('1586495777744-4413f21062fa') },
      { emoji: '🌸', name: 'عطر نسائي فرنسي 100مل', price: 199, oldPrice: 299, rating: 4.9, ratingCount: 231, c1: '#fbcfe8', c2: '#fdf2f8', image: unsplash('1541643600914-78b084683601') },
      { emoji: '🫧', name: 'عطر رجالي خشبي 100مل', price: 189, oldPrice: 279, rating: 4.8, ratingCount: 178, c1: '#d6d3d1', c2: '#f5f5f4', image: unsplash('1594035910387-fea47794261f') },
      { emoji: '🧴', name: 'مرطب وجه يومي SPF50', price: 89, oldPrice: 129, rating: 4.7, ratingCount: 291, c1: '#a7f3d0', c2: '#ecfdf5', image: unsplash('1556228720-195a672e8a03') },
      { emoji: '💅', name: 'طلاء أظافر لماع 15مل', price: 39, oldPrice: 59, rating: 4.5, ratingCount: 336, c1: '#fbcfe8', c2: '#fdf2f8', image: unsplash('1604654894610-df63bc536371') },
      { emoji: '🥑', name: 'سيروم تنظيف عميق', price: 119, oldPrice: 159, rating: 4.6, ratingCount: 143, c1: '#bbf7d0', c2: '#f0fdf4', image: unsplash('1620916566398-39f1143ab7be') },
      { emoji: '🧼', name: 'صابون طبيعي بيتي', price: 29, oldPrice: 49, rating: 4.4, ratingCount: 208, c1: '#fde68a', c2: '#fffbeb', image: unsplash('1544367567-0f2fcb009e0b') },
      { emoji: '🪞', name: 'ماسكارا مكثفة سوداء', price: 79, oldPrice: 99, rating: 4.6, ratingCount: 187, c1: '#cbd5e1', c2: '#f8fafc', image: flickr('https://live.staticflickr.com/5190/5365866358_2dd6ed35b8_b.jpg') },
      { emoji: '✨', name: 'جلو شفايه لامع', price: 49, oldPrice: 69, rating: 4.5, ratingCount: 214, c1: '#fecdd3', c2: '#fff1f2', image: unsplash('1512496015851-a90fb38ba796') },
      { emoji: '🚿', name: 'جل استحمام مرطب 250مل', price: 59, oldPrice: 79, rating: 4.4, ratingCount: 156, c1: '#bfdbfe', c2: '#eff6ff', image: unsplash('1522335789203-aabd1fc54bc9') },
      { emoji: '🎀', name: 'طقم هدايا عطر + لوشن', price: 149, oldPrice: 199, rating: 4.8, ratingCount: 98, badge: 'هدية مميزة', c1: '#fbcfe8', c2: '#fce7f3', image: unsplash('1549465220-1a8b9238cd48') },
      { emoji: '🪮', name: 'مشط حراري فاخر', price: 69, oldPrice: 99, rating: 4.3, ratingCount: 131, c1: '#e9d5ff', c2: '#f5f3ff', image: flickr('https://live.staticflickr.com/4135/4912510671_c2ef88ec2f_b.jpg') }
    ]
  },
  {
    id: 5,
    name: 'بيتي',
    tagline: 'أثاث وديكور منزلي',
    url: 'beity.wusool.ps',
    emoji: '🛋',
    brand: '#f97316',
    brandDeep: '#c2410c',
    bannerTitle: 'أسبوع البيت — خصومات حتى 35%',
    bannerSub: 'أثاث وديكور بجودة عالية وتوصيل للبيت',
    coupon: 'HOME20',
    categories: ['أثاث', 'إضاءة', 'أجهزة', 'ديكور'],
    products: [
      { emoji: '🛋', name: 'كنبة عائلية 3 مقاعد', price: 2199, oldPrice: 2899, rating: 4.8, ratingCount: 76, badge: 'الأكثر مبيعًا', c1: '#fdba74', c2: '#fff7ed', image: unsplash('1555041469-a586c61ea9bc') },
      { emoji: '🛏', name: 'سرير خشبي مع فراش', price: 1499, oldPrice: 1999, rating: 4.7, ratingCount: 92, c1: '#fed7aa', c2: '#fff7ed', image: unsplash('1505693416388-ac5ce068fe85') },
      { emoji: '🪑', name: 'كرسي مكتب مريح', price: 189, oldPrice: 299, rating: 4.5, ratingCount: 167, c1: '#d6d3d1', c2: '#fafaf9', image: unsplash('1592078615290-033ee584e267') },
      { emoji: '🍽', name: 'طقم سفرة 12 قطعة', price: 399, oldPrice: 549, rating: 4.6, ratingCount: 89, c1: '#bae6fd', c2: '#f0f9ff', image: unsplash('1414235077428-338989a2e8c0') },
      { emoji: '💡', name: 'لمبة LED ذكية', price: 39, oldPrice: 59, rating: 4.7, ratingCount: 244, c1: '#fef08a', c2: '#fefce8', image: unsplash('1513506003901-1e6a229e2d15') },
      { emoji: '🧹', name: 'مكنسة كهربائية لاسلكية', price: 299, oldPrice: 449, rating: 4.6, ratingCount: 132, c1: '#cbd5e1', c2: '#f8fafc', image: unsplash('1558317374-067fb5f30001') },
      { emoji: '☕', name: 'غلاية كهربائية زجاجية', price: 79, oldPrice: 139, rating: 4.5, ratingCount: 204, c1: '#bae6fd', c2: '#f0f9ff', image: unsplash('1556910103-1c02745aae4d') },
      { emoji: '🍞', name: 'محمصة خبز استانلس', price: 89, oldPrice: 149, rating: 4.4, ratingCount: 118, c1: '#e2e8f0', c2: '#f8fafc', image: flickr('https://live.staticflickr.com/2828/33674241970_686c9bb12d_b.jpg') },
      { emoji: '🪞', name: 'مرآة زينة دائرية LED', price: 129, oldPrice: 189, rating: 4.7, ratingCount: 91, c1: '#e0e7ff', c2: '#eef2ff', image: unsplash('1618221195710-dd6b41faaea6') },
      { emoji: '🪴', name: 'نبات صناعي بأناء', price: 49, oldPrice: 79, rating: 4.3, ratingCount: 146, c1: '#bbf7d0', c2: '#f0fdf4', image: unsplash('1463320726281-696a485928c7') },
      { emoji: '🧺', name: 'سلة تخزين خيزران', price: 35, oldPrice: 49, rating: 4.5, ratingCount: 88, c1: '#fed7aa', c2: '#fffbeb', image: unsplash('1590874103328-eac38a683ce7') },
      { emoji: '🕯', name: 'شمعة معطرة 3 فتلان', price: 69, oldPrice: 99, rating: 4.6, ratingCount: 74, c1: '#fecdd3', c2: '#fff1f2', image: flickr('https://live.staticflickr.com/2697/4487830610_4abef1db3b_b.jpg') }
    ]
  }
];