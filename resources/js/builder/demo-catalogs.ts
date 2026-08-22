import { getBuilderTemplate } from './templates';

/* ===================================================================== */
/* DEMO_CATALOGS — per-template Arabic demo catalogs so every live       */
/* preview (gallery modal, onboarding) shows realistic niche content     */
/* instead of generic products. Mirrors the CategorySeeder blueprints.   */
/* Images are served locally from /images/store — no external hosts.     */
/* ===================================================================== */

export interface DemoCategory {
  id: string;
  name: string;
  slug: string;
  image: string;
  product_count: number;
}

export interface DemoProduct {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image: string;
  categoryId: string;
}

export interface DemoCatalog {
  categories: DemoCategory[];
  products: DemoProduct[];
}

const cat = (id: string, name: string, slug: string, image: string, product_count = 6): DemoCategory => ({
  id, name, slug, image, product_count,
});
const prod = (
  id: string, name: string, price: number, sale_price: number | null,
  image: string, categoryId: string,
): DemoProduct => ({ id, name, price, sale_price, image, categoryId });

/* ------------------------------------------------------- classic عام */
const CLASSIC_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'عطارة وتوابل', 'spices', '/images/store/spices.jpg', 8),
    cat('2', 'الفواكه والخضروات', 'produce', '/images/store/vegetables.jpg', 12),
    cat('3', 'حلويات عربية', 'sweets', '/images/store/sweets.jpg', 6),
    cat('4', 'أزياء وملابس', 'fashion', '/images/store/clothes.jpg', 9),
    cat('5', 'قهوة وأعشاب', 'coffee', '/images/store/coffee.jpg', 5),
    cat('6', 'مخبز ومعجنات', 'bakery', '/images/store/bakery.jpg', 7),
    cat('7', 'ألبان وأجبان', 'dairy', '/images/store/dairy.jpg', 4),
  ],
  products: [
    prod('p1', 'زعفران فاخر 5 غرام', 45, 39, '/images/store/spices.jpg', '1'),
    prod('p2', 'فلفل أسود مطحون طازج 250غ', 18, 14, '/images/store/spices.jpg', '1'),
    prod('p3', 'سلة خضار موسمية طازجة', 35, 29, '/images/store/vegetables.jpg', '2'),
    prod('p4', 'تمر مجدول بجودة ممتازة', 60, null, '/images/store/fruits.jpg', '2'),
    prod('p5', 'كنافة نابلسية بالجبن', 55, 48, '/images/store/sweets.jpg', '3'),
    prod('p6', 'بقلاوة فستق حلبي (كيلو)', 85, null, '/images/store/sweets.jpg', '3'),
    prod('p7', 'عباية صيفية بتطريز يدوي', 220, 180, '/images/store/clothes.jpg', '4'),
    prod('p8', 'قهوة عربية مطحونة 500غ', 40, null, '/images/store/coffee.jpg', '5'),
    prod('p9', 'جبنة بيضاء بلدية طازجة', 22, 19, '/images/store/dairy.jpg', '7'),
  ],
};

/* --------------------------------------------- fresh-bakers مخبوزات */
const FRESH_BAKERS_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'الخبز والأرغفة', 'bread', '/images/store/bakery.jpg', 8),
    cat('2', 'المعجنات', 'pastries', '/images/store/bakery.jpg', 10),
    cat('3', 'المخبوزات المالحة', 'savory', '/images/store/bakery.jpg', 6),
    cat('4', 'الكيك والتورتات', 'cakes', '/images/store/sweets.jpg', 7),
    cat('5', 'البسكويت والكوكيز', 'cookies', '/images/store/bakery.jpg', 5),
    cat('6', 'قهوة ومشروبات', 'drinks', '/images/store/coffee.jpg', 4),
  ],
  products: [
    prod('p1', 'خبز عربي حجري (10 أرغفة)', 12, null, '/images/store/bakery.jpg', '1'),
    prod('p2', 'توست أسمر بالحبوب الكاملة', 15, 12, '/images/store/bakery.jpg', '1'),
    prod('p3', 'فطائر زعتر بلبناني (12 قطعة)', 28, null, '/images/store/bakery.jpg', '2'),
    prod('p4', 'كرواسون بالجبن والزعتر', 8, null, '/images/store/bakery.jpg', '2'),
    prod('p5', 'سمبوسة جبن ساخنة (كيلو)', 32, 27, '/images/store/bakery.jpg', '3'),
    prod('p6', 'كيك شوكولاتة فاخر (نصف كيلو)', 65, 55, '/images/store/sweets.jpg', '4'),
    prod('p7', 'تشيز كيك فراولة قطعة', 18, null, '/images/store/sweets.jpg', '4'),
    prod('p8', 'كوكيز شوكوليتشيب (علبة 12)', 25, null, '/images/store/bakery.jpg', '5'),
    prod('p9', 'قهوة مختصة محمصة اليوم', 35, null, '/images/store/coffee.jpg', '6'),
  ],
};

/* ----------------------------------------- grocery-shopping بقالة */
const GROCERY_SHOPPING_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'الفواكه والخضروات', 'produce', '/images/store/vegetables.jpg', 14),
    cat('2', 'الألبان والبيض', 'dairy-eggs', '/images/store/dairy.jpg', 8),
    cat('3', 'عطارة وتوابل', 'spices', '/images/store/spices.jpg', 9),
    cat('4', 'المواد الغذائية الأساسية', 'staples', '/images/store/grocery.jpg', 20),
    cat('5', 'وجبات خفيفة ومشروبات', 'snacks', '/images/store/fruits.jpg', 11),
  ],
  products: [
    prod('p1', 'طماطم بلدي طازجة (كيلو)', 6, null, '/images/store/vegetables.jpg', '1'),
    prod('p2', 'موز صومالي (كيلو)', 9, 7, '/images/store/fruits.jpg', '1'),
    prod('p3', 'برتقال أبو سرة (كيلو)', 8, null, '/images/store/fruits.jpg', '1'),
    prod('p4', 'حليب طازج كامل الدسم (لتر)', 7, null, '/images/store/dairy.jpg', '2'),
    prod('p5', 'بيض بلدي طبق (30 حبة)', 24, 21, '/images/store/dairy.jpg', '2'),
    prod('p6', 'كمون مطحون 200غ', 10, null, '/images/store/spices.jpg', '3'),
    prod('p7', 'أرز بسمتي هندي (5 كيلو)', 58, 52, '/images/store/grocery.jpg', '4'),
    prod('p8', 'زيت زيتون بكر ممتاز (لتر)', 42, null, '/images/store/grocery.jpg', '4'),
    prod('p9', 'مكسرات مشكلة فاخرة (500غ)', 48, null, '/images/store/fruits.jpg', '5'),
  ],
};

/* ---------------------------------------- super-mart-store سوبرماركت */
const SUPER_MART_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'المواد الغذائية الأساسية', 'staples', '/images/store/grocery.jpg', 25),
    cat('2', 'الفواكه والخضروات', 'produce', '/images/store/vegetables.jpg', 16),
    cat('3', 'الألبان والبيض', 'dairy-eggs', '/images/store/dairy.jpg', 10),
    cat('4', 'منظفات ومنزل', 'household', '/images/store/hypermarket.jpg', 12),
    cat('5', 'مخبز ومعجنات', 'bakery', '/images/store/bakery.jpg', 7),
    cat('6', 'حلويات وشوكولاتة', 'sweets', '/images/store/sweets.jpg', 9),
  ],
  products: [
    prod('p1', 'سكر ناعم (2 كيلو)', 13, null, '/images/store/grocery.jpg', '1'),
    prod('p2', 'معكرونة إيطالية (500غ)', 5, 4, '/images/store/grocery.jpg', '1'),
    prod('p3', 'بطاطس بلدية (كيلو)', 5, null, '/images/store/vegetables.jpg', '2'),
    prod('p4', 'تفاح أحمر أمريكي (كيلو)', 11, 9, '/images/store/fruits.jpg', '2'),
    prod('p5', 'لبن زبادي عائلي (1.5 كجم)', 14, null, '/images/store/dairy.jpg', '3'),
    prod('p6', 'مسحوق غسيل أوتوماتيك (5 كجم)', 45, 39, '/images/store/hypermarket.jpg', '4'),
    prod('p7', 'مناديل مطبخ (6 لفات)', 18, null, '/images/store/hypermarket.jpg', '4'),
    prod('p8', 'كرواسون طازج (4 حبات)', 10, null, '/images/store/bakery.jpg', '5'),
    prod('p9', 'شوكولاتة فاخرة مشكلة', 28, 22, '/images/store/sweets.jpg', '6'),
  ],
};

/* ----------------------------------- mega-store-woocommerce هايبر مارت */
const MEGA_STORE_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'مواد غذائية بالجملة', 'wholesale-food', '/images/store/grocery.jpg', 30),
    cat('2', 'إكسسوارات الجوال', 'phone-accessories', '/images/store/electronics.jpg', 18),
    cat('3', 'أجهزة الصوت', 'audio', '/images/store/electronics.jpg', 12),
    cat('4', 'مفروشات المنزل', 'home-textiles', '/images/store/hypermarket.jpg', 15),
    cat('5', 'الألعاب التعليمية', 'edu-toys', '/images/store/kids-toys.jpg', 9),
    cat('6', 'أزياء وملابس', 'fashion', '/images/store/clothes.jpg', 20),
  ],
  products: [
    prod('p1', 'زيت ذرة عبوات (4×1.5 لتر)', 52, 46, '/images/store/grocery.jpg', '1'),
    prod('p2', 'شاحن سريع 33 واط أصلي', 65, null, '/images/store/electronics.jpg', '2'),
    prod('p3', 'سماعة بلوتوث رياضية مقاومة للماء', 129, 99, '/images/store/electronics.jpg', '3'),
    prod('p4', 'طقم مفارش سرير قطن مصري', 189, null, '/images/store/hypermarket.jpg', '4'),
    prod('p5', 'مكعبات بناء تعليمية (250 قطعة)', 79, 64, '/images/store/kids-toys.jpg', '5'),
    prod('p6', 'قمصان رجالية كلاسيك', 95, 75, '/images/store/clothes.jpg', '6'),
  ],
};

/* ------------------------------ ecommerce-mega-store عروض كبيرة */
const ECOMMERCE_MEGA_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'إكسسوارات الجوال', 'phone-accessories', '/images/store/electronics.jpg', 22),
    cat('2', 'التقنيات القابلة للارتداء', 'wearables', '/images/store/electronics.jpg', 10),
    cat('3', 'أزياء النساء', 'women-fashion', '/images/store/clothes.jpg', 16),
    cat('4', 'أزياء الرجال', 'men-fashion', '/images/store/clothes.jpg', 12),
    cat('5', 'الإكسسوارات', 'accessories', '/images/store/clothes.jpg', 14),
  ],
  products: [
    prod('p1', 'باور بانك 20000 مللي أمبير', 145, 119, '/images/store/electronics.jpg', '1'),
    prod('p2', 'ساعة ذكية بشاشة AMOLED', 349, 299, '/images/store/electronics.jpg', '2'),
    prod('p3', 'فستان سواريه مطرز', 420, 340, '/images/store/clothes.jpg', '3'),
    prod('p4', 'جاكيت جلد طبيعي رجالي', 480, null, '/images/store/clothes.jpg', '4'),
    prod('p5', 'نظارة شمسية بولارايزد', 160, 129, '/images/store/clothes.jpg', '5'),
    prod('p6', 'حقيبة ظهر عملية مضادة للماء', 135, null, '/images/store/clothes.jpg', '5'),
  ],
};

/* ---------------------------------- ecommerce-clothing أناقة */
const ECOMMERCE_CLOTHING_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'أزياء النساء', 'women', '/images/store/clothes.jpg', 18),
    cat('2', 'أزياء الرجال', 'men', '/images/store/clothes.jpg', 14),
    cat('3', 'الأحذية', 'shoes', '/images/store/clothes.jpg', 10),
    cat('4', 'الإكسسوارات', 'accessories', '/images/store/clothes.jpg', 12),
  ],
  products: [
    prod('p1', 'فستان ميدي كلاسيك أسود', 260, 210, '/images/store/clothes.jpg', '1'),
    prod('p2', 'بلوزة حرير بقصة إيطالية', 180, null, '/images/store/clothes.jpg', '1'),
    prod('p3', 'بدلة رسمية قماش إيطالي', 750, 640, '/images/store/clothes.jpg', '2'),
    prod('p4', 'قميص قطن مصري أبيض', 145, null, '/images/store/clothes.jpg', '2'),
    prod('p5', 'حذاء جلد طبيعي كلاسيك', 320, 280, '/images/store/clothes.jpg', '3'),
    prod('p6', 'حزام جلد إيطالي فاخر', 120, null, '/images/store/clothes.jpg', '4'),
  ],
};

/* ---------------------------- fashion-designer-mart ديزاينر */
const FASHION_DESIGNER_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'كوتور نسائي', 'couture', '/images/store/clothes.jpg', 8),
    cat('2', 'عبايات وقفاطين', 'abayas', '/images/store/clothes.jpg', 12),
    cat('3', 'حقائب فاخرة', 'luxury-bags', '/images/store/clothes.jpg', 6),
    cat('4', 'مجوهرات وإكسسوارات', 'jewelry', '/images/store/clothes.jpg', 9),
  ],
  products: [
    prod('p1', 'فستان سهرة بتطريز يدوي', 1250, null, '/images/store/clothes.jpg', '1'),
    prod('p2', 'قفطان مغربي بموشى حريري', 890, 790, '/images/store/clothes.jpg', '2'),
    prod('p3', 'عباية كلوش كريب ياباني', 520, null, '/images/store/clothes.jpg', '2'),
    prod('p4', 'حقيبة يد جلد بإصدار محدود', 980, null, '/images/store/clothes.jpg', '3'),
    prod('p5', 'طقم ألماس مقلد فاخر', 450, 380, '/images/store/clothes.jpg', '4'),
    prod('p6', 'شال حرير طبيعي مطبوع', 210, null, '/images/store/clothes.jpg', '4'),
  ],
};

/* ------------------------------------- kids-fashion أطفال */
const KIDS_FASHION_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'أزياء الأطفال', 'kids-clothes', '/images/store/kids-clothes.jpg', 15),
    cat('2', 'الدمى القطيفة', 'plush-dolls', '/images/store/kids-toys.jpg', 8),
    cat('3', 'الألعاب التعليمية', 'edu-toys', '/images/store/kids-toys.jpg', 11),
    cat('4', 'أحذية الأطفال', 'kids-shoes', '/images/store/kids-clothes.jpg', 7),
  ],
  products: [
    prod('p1', 'طقم بناتي قطن (قطعتان)', 85, 69, '/images/store/kids-clothes.jpg', '1'),
    prod('p2', 'جاكيت أولاد شتوي مبطن', 120, null, '/images/store/kids-clothes.jpg', '1'),
    prod('p3', 'دمية دبدوب عملاقة 80 سم', 95, 78, '/images/store/kids-toys.jpg', '2'),
    prod('p4', 'حروف وأرقام مغناطيسية تعليمية', 45, null, '/images/store/kids-toys.jpg', '3'),
    prod('p5', 'مكعبات خشبية بأشكال هندسية', 65, 54, '/images/store/kids-toys.jpg', '3'),
    prod('p6', 'حذاء رياضي أطفال مريح', 110, null, '/images/store/kids-clothes.jpg', '4'),
  ],
};

/* ------------------------------------ cosmetic-store تجميل وعناية */
const COSMETIC_STORE_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'العناية بالبشرة', 'skincare', '/images/store/cosmetics.jpg', 14),
    cat('2', 'المكياج', 'makeup', '/images/store/cosmetics.jpg', 18),
    cat('3', 'العطور', 'perfumes', '/images/store/perfume.jpg', 10),
    cat('4', 'العناية بالشعر', 'haircare', '/images/store/cosmetics.jpg', 9),
  ],
  products: [
    prod('p1', 'سيروم فيتامين سي المركز', 165, 139, '/images/store/cosmetics.jpg', '1'),
    prod('p2', 'كريم مرطب بحمض الهيالورونيك', 120, null, '/images/store/cosmetics.jpg', '1'),
    prod('p3', 'باليت ظلال ترابية 16 لون', 145, 118, '/images/store/cosmetics.jpg', '2'),
    prod('p4', 'أحمر شفاه مطفي ثابت طويل', 68, null, '/images/store/cosmetics.jpg', '2'),
    prod('p5', 'عطر شرقي فاخر 100 مل', 380, 310, '/images/store/perfume.jpg', '3'),
    prod('p6', 'مسك أبيض مركّز (رول أون)', 75, null, '/images/store/perfume.jpg', '3'),
    prod('p7', 'زيت أرجان مغربي أصلي', 90, null, '/images/store/cosmetics.jpg', '4'),
  ],
};

/* -------------------------- restaurant-food-delivery مطعم وتوصيل */
const RESTAURANT_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'المشاوي', 'grills', '/images/store/grills.jpg', 8),
    cat('2', 'الوجبات السريعة', 'fast-food', '/images/store/fast-food.jpg', 10),
    cat('3', 'الأطباق الرئيسية', 'main-courses', '/images/store/restaurant-dish.jpg', 12),
    cat('4', 'المقبلات والسلطات', 'starters', '/images/store/restaurant-dish.jpg', 7),
    cat('5', 'الحلويات', 'desserts', '/images/store/sweets.jpg', 5),
  ],
  products: [
    prod('p1', 'نصف دجاجة مشوية على الفحم', 38, null, '/images/store/grills.jpg', '1'),
    prod('p2', 'مشاوي مشكل عائلي', 145, 125, '/images/store/grills.jpg', '1'),
    prod('p3', 'برجر لحم أنغوس مزدوج', 42, null, '/images/store/fast-food.jpg', '2'),
    prod('p4', 'وجبة عائلية (برجر+بطاطس+مشروبات)', 119, 99, '/images/store/fast-food.jpg', '2'),
    prod('p5', 'كبسة لحم ضاني', 89, null, '/images/store/restaurant-dish.jpg', '3'),
    prod('p6', 'مندي دجاج بالفرن الحجري', 65, 55, '/images/store/restaurant-dish.jpg', '3'),
    prod('p7', 'سلطة سيزر بالدجاج المشوي', 32, null, '/images/store/restaurant-dish.jpg', '4'),
    prod('p8', 'حمص بالطحينة وزيت الزيتون', 18, null, '/images/store/restaurant-dish.jpg', '4'),
    prod('p9', 'كنافة بالقشطة (طبق)', 28, null, '/images/store/sweets.jpg', '5'),
  ],
};

/* -------------------------------------- e-storefront إلكترونيات */
const E_STOREFRONT_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'هواتف وأجهزة ذكية', 'phones', '/images/store/electronics.jpg', 12),
    cat('2', 'لابتوبات وكمبيوتر', 'laptops', '/images/store/electronics.jpg', 9),
    cat('3', 'سماعات وأنظمة صوت', 'audio', '/images/store/electronics.jpg', 14),
    cat('4', 'شواحن وكوابل', 'chargers', '/images/store/electronics.jpg', 16),
  ],
  products: [
    prod('p1', 'هاتف ذكي 256GB إصدار 2026', 2890, 2650, '/images/store/electronics.jpg', '1'),
    prod('p2', 'تابلت 11 بوصة مع قلم رقمي', 1590, null, '/images/store/electronics.jpg', '1'),
    prod('p3', 'لابتوب أعمال i7 / 16GB', 4290, 3950, '/images/store/electronics.jpg', '2'),
    prod('p4', 'سماعات لاسلكية عزل ضوضاء ANC', 890, 720, '/images/store/electronics.jpg', '3'),
    prod('p5', 'مكبر صوت محمول مقاوم للماء', 245, null, '/images/store/electronics.jpg', '3'),
    prod('p6', 'شاحن جداري GaN 65 واط', 149, 125, '/images/store/electronics.jpg', '4'),
  ],
};

/* ------------------------------- ecommece-marketplace السوق */
const MARKETPLACE_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'المواد الغذائية الأساسية', 'staples', '/images/store/grocery.jpg', 20),
    cat('2', 'أزياء النساء', 'women-fashion', '/images/store/clothes.jpg', 15),
    cat('3', 'مفروشات المنزل', 'home-textiles', '/images/store/hypermarket.jpg', 13),
    cat('4', 'العطور', 'perfumes', '/images/store/perfume.jpg', 8),
    cat('5', 'أجهزة وإلكترونيات', 'electronics', '/images/store/electronics.jpg', 17),
  ],
  products: [
    prod('p1', 'قهوة عربية فاخرة 1 كجم', 68, 59, '/images/store/coffee.jpg', '1'),
    prod('p2', 'طقم أكواب قهوة شاي (6 حبات)', 85, null, '/images/store/hypermarket.jpg', '3'),
    prod('p3', 'جلابية نسائية صيفية مطرزة', 240, 199, '/images/store/clothes.jpg', '2'),
    prod('p4', 'عطر مسك الطهارة 50 مل', 95, null, '/images/store/perfume.jpg', '4'),
    prod('p5', 'ساعة ذكية رياضية', 320, 270, '/images/store/electronics.jpg', '5'),
    prod('p6', 'عسل سدر جبلي أصلي (كيلو)', 320, null, '/images/store/grocery.jpg', '1'),
  ],
};

/* ------------------------------------ marketplace-shop بازار */
const BAZAAR_CATALOG: DemoCatalog = {
  categories: [
    cat('1', 'مفروشات المنزل', 'home-textiles', '/images/store/hypermarket.jpg', 14),
    cat('2', 'ديكور الجدران', 'wall-decor', '/images/store/hypermarket.jpg', 8),
    cat('3', 'الإكسسوارات', 'accessories', '/images/store/clothes.jpg', 10),
    cat('4', 'حلويات وهدايا', 'gifts-sweets', '/images/store/sweets.jpg', 9),
    cat('5', 'إلكترونيات صغيرة', 'small-electronics', '/images/store/electronics.jpg', 11),
  ],
  products: [
    prod('p1', 'طقم مفارش قطنية (سرير مزدوج)', 175, 148, '/images/store/hypermarket.jpg', '1'),
    prod('p2', 'لوحة جدارية خط عربي', 130, null, '/images/store/hypermarket.jpg', '2'),
    prod('p3', 'محفظة جلد طبيعي رجالية', 115, 95, '/images/store/clothes.jpg', '3'),
    prod('p4', 'بوكس هدايا شوكلاتة وتمر فاخر', 145, null, '/images/store/sweets.jpg', '4'),
    prod('p5', 'خلاط كهربائي 800 واط', 210, 178, '/images/store/electronics.jpg', '5'),
    prod('p6', 'مصباح مكتب LED قابل للتعديل', 98, null, '/images/store/electronics.jpg', '5'),
  ],
};

export const DEMO_CATALOGS: Record<string, DemoCatalog> = {
  classic: CLASSIC_CATALOG,
  'fresh-bakers': FRESH_BAKERS_CATALOG,
  'grocery-shopping': GROCERY_SHOPPING_CATALOG,
  'super-mart-store': SUPER_MART_CATALOG,
  'mega-store-woocommerce': MEGA_STORE_CATALOG,
  'ecommerce-mega-store': ECOMMERCE_MEGA_CATALOG,
  'ecommerce-clothing': ECOMMERCE_CLOTHING_CATALOG,
  'fashion-designer-mart': FASHION_DESIGNER_CATALOG,
  'kids-fashion': KIDS_FASHION_CATALOG,
  'cosmetic-store': COSMETIC_STORE_CATALOG,
  'restaurant-food-delivery': RESTAURANT_CATALOG,
  'e-storefront': E_STOREFRONT_CATALOG,
  'ecommece-marketplace': MARKETPLACE_CATALOG,
  'marketplace-shop': BAZAAR_CATALOG,
};

/** Demo catalog for a template slug (legacy slugs normalize automatically). */
export const getDemoCatalog = (slug?: string | null): DemoCatalog => {
  const tpl = getBuilderTemplate(slug);
  return DEMO_CATALOGS[tpl?.slug || 'classic'] || CLASSIC_CATALOG;
};
