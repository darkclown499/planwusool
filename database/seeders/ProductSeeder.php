<?php

namespace Database\Seeders;

use App\Models\Product;
use App\Models\Store;
use App\Models\Category;
use App\Models\Tax;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{

    public function run(): void
    {
        // Seed every store (legacy themes + all dedicated template stores).
        // Existing stores are skipped below to preserve client data.
        $stores = Store::all();

        foreach ($stores as $store) {
            // Skip if products already exist for this store - preserve existing client data
            if (Product::where('store_id', $store->id)->exists()) {
                $this->command->info('Products already exist for store: ' . $store->name . '. Skipping.');
                continue;
            }

            $categories = Category::where('store_id', $store->id)->get();
            $taxes = Tax::where('store_id', $store->id)->where('is_active', true)->get();

            // In demo mode, use all categories; otherwise only first category
            if (!config('app.is_demo')) {
                $categories = $categories->take(1);
            }

            foreach ($categories as $category) {
                $products = $this->getProductsForCategory($category->name);
                
                // In demo mode, use all products; otherwise limit to 4 products
                if (!config('app.is_demo')) {
                    $products = array_slice($products, 0, 4);
                }
                
                foreach ($products as $productData) {
                    // Randomly assign tax to products (70% chance of having tax)
                    $randomTax = null;
                    if (rand(1, 100) <= 70 && $taxes->isNotEmpty()) {
                        $randomTax = $taxes->random();
                    }
                    
                    Product::create([
                        'name' => $productData['name'],
                        'sku' => $this->generateSKU($store->id, $category->id),
                        'description' => $productData['description'],
                        'specifications' => $productData['specifications'] ?? null,
                        'details' => $productData['details'] ?? null,
                        'price' => $productData['price'],
                        'sale_price' => $productData['sale_price'] ?? null,
                        'stock' => rand(15, 150),
                        'variants' => $productData['variants'] ?? null,
                        'category_id' => $category->id,
                        'tax_id' => $randomTax?->id,
                        'store_id' => $store->id,
                        'is_active' => true,
                        'cover_image' => $productData['cover_image'] ?? '',
                        'images' => $productData['images'] ?? '',
                    ]);
                }
            }
        }

    }

    private function generateSKU($storeId, $categoryId): string
    {
        $store = Store::find($storeId);
        $prefix = match($store->getTemplateSlug()) {
            'gadgets', 'tech', 'electronics-pro' => 'TV',
            'fashion', 'fashion-premium' => 'TT',
            'home-decor', 'furniture' => 'CC',
            'bakery', 'food', 'food-premium', 'restaurant' => 'SD',
            'supermarket', 'grocery-delivery' => 'DE',
            'car-accessories', 'auto-parts' => 'AE',
            'toy', 'kids' => 'WT',
            'books' => 'BN',
            'coffee-shop' => 'CH',
            'pharmacy' => 'PC',
            'pet-store' => 'PF',
            'perfumes' => 'ES',
            'flowers-gifts' => 'BG',
            'home-tools' => 'TD',
            'handcrafted' => 'HH',
            'stationery' => 'PS',
            'luxury-jewelry' => 'GL',
            'luxury-watches' => 'TE',
            'b2b-wholesale' => 'WC',
            'sports' => 'AG',
            'beauty', 'beauty-premium' => 'BT',
            'basic', 'single-product', 'digital' => 'DS',
            default => 'TV'
        };
        return $prefix . $storeId . 'C' . $categoryId . 'P' . rand(1000, 9999);
    }


    private function getProductsForCategory($categoryName): array
    {
        $products = [
            'إكسسوارات الجوال' => [
                [
                    'name' => 'غطاء هاتف iPhone 14 Plus',
                    'description' => 'غلاف حماية فاخر لهاتف iPhone 14 Plus مع امتصاص الصدمات وقصّات دقيقة.',
                    'specifications' => '<ul><li>مادة TPU ماصة للصدمات</li><li>قصّات دقيقة للكاميرا</li><li>متوافق مع الشحن اللاسلكي</li><li>حواف مرتفعة لحماية الشاشة</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>احمِ هاتفك iPhone 14 Plus بهذا الغلاف الفاخر الذي يتميز بتقنية امتصاص الصدمات المتقدمة وقصّات دقيقة لجميع المنافذ والكاميرات.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-296420?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-304792?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-301766?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-098636?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-666168?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-399742?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'واقي شاشة iPhone 14 مع درج التطبيق',
                    'description' => 'واقي شاشة من الزجاج المقسّى مع درج تركيب سهل لتطبيق خالٍ من الفقاعات.',
                    'specifications' => '<ul><li>زجاج مقسّى 9H</li><li>تركيب بدون فقاعات</li><li>يشمل درج التطبيق</li><li>شفافية 99%</li><li>طبقة طاردة للزيوت</li></ul>',
                    'details' => '<p>واقي شاشة فاخر من الزجاج المقسّى مع درج تطبيق مبتكر لتركيب مثالي وخالٍ من الفقاعات في كل مرة.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-575336?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-338117?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-284770?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-471037?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-997015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303218?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'باور بانك Luxcell B12 بسعة 10,000mAh وبطاقة 12 واط',
                    'description' => 'باور بانك محمول عالي السعة مع شحن سريع ودعم لأجهزة متعددة.',
                    'specifications' => '<ul><li>سعة 10,000mAh</li><li>شحن سريع 12 واط</li><li>منفذا USB</li><li>مؤشر LED للطاقة</li><li>تصميم مضغوط</li></ul>',
                    'details' => '<p>أبقِ أجهزتك مشحونة مع هذا الباور بانك عالي السعة الذي يتميز بتقنية الشحن السريع ودعم الأجهزة المتعددة في نفس الوقت.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-986581?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-649235?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-317316?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-913913?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-024439?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-768196?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حامل هاتف مكتبي قابل للتعديل والطي',
                    'description' => 'حامل هاتف مريح بزوايا قابلة للتعديل للعرض المريح ومكالمات الفيديو.',
                    'specifications' => '<ul><li>زوايا عرض قابلة للتعديل</li><li>تصميم قابل للطي</li><li>قاعدة مانعة للانزلاق</li><li>توافق شامل</li><li>هيكل من الألومنيوم</li></ul>',
                    'details' => '<p>حامل هاتف مريح مصمم للعرض المريح ومكالمات الفيديو والاستخدام بدون استخدام اليدين مع زوايا قابلة للتعديل وهيكل ألومنيوم ثابت.</p>',
                    'price' => 16.99,
                    'cover_image' => 'https://images.unsplash.com/photo-677379?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-022324?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-543250?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-475617?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-131296?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-535831?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كابل شحن ومزامنة البيانات من USB إلى Lightning سريع الشحن',
                    'description' => 'كابل Lightning معتمد MFi مع شحن سريع وقدرات مزامنة البيانات.',
                    'specifications' => '<ul><li>معتمد MFi</li><li>يدعم الشحن السريع</li><li>قدرة مزامنة البيانات</li><li>تصميم مضفّر متين</li><li>طول 6 أقدام</li></ul>',
                    'details' => '<p>كابل Lightning فاخر معتمد MFi مع دعم الشحن السريع وهيكل مضفّر متين لمزامنة وشحن موثوقين.</p>',
                    'price' => 12.99,
                    'variants' => [
                        ['name' => 'الطول', 'options' => ['3 أقدام', '6 أقدام', '10 أقدام']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-233258?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-903993?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654422?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-484612?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-712646?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-808658?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شاحن لاسلكي boat Flexcharge 360 ثلاثي الأجهزة',
                    'description' => 'محطة شحن لاسلكي لأجهزة متعددة للهاتف وسماعات الأذن والساعة الذكية.',
                    'specifications' => '<ul><li>محطة شحن ثلاثية الأجهزة</li><li>شحن لاسلكي سريع بقوة 15 واط</li><li>دوران 360 درجة</li><li>مؤشرات LED للشحن</li><li>توافق شامل</li></ul>',
                    'details' => '<p>محطة شحن لاسلكية مريحة ثلاثية الأجهزة يمكنها شحن هاتفك وسماعات الأذن وساعتك الذكية في نفس الوقت بشحن سريع بقوة 15 واط.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-351169?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-636714?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-705182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-489684?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143712?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-460689?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'عصا سيلفي WeCool S2-Ultra مع حامل ثلاثي',
                    'description' => 'عصا سيلفي قابلة للتمديد مع قاعدة حامل ثلاثي وجهاز تحكم عن بعد بتقنية البلوتوث.',
                    'specifications' => '<ul><li>قابلة للتمديد حتى 40 بوصة</li><li>تشمل قاعدة حامل ثلاثي</li><li>جهاز تحكم عن بعد بالبلوتوث</li><li>دوران 360 درجة</li><li>توافق شامل مع الهواتف</li></ul>',
                    'details' => '<p>عصا سيلفي متعددة الاستخدامات مع وظيفة الحامل الثلاثي وجهاز تحكم عن بعد بالبلوتوث لالتقاط صور وفيديوهات مثالية من أي زاوية أو مسافة.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود', 'أحمر']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-382519?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-551356?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214522?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-682024?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-410787?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-232643?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قبضة PopSocket للهاتف مع حامل قابل للتوسيع',
                    'description' => 'قبضة وحامل هاتف قابل للطي للإمساك الآمن والمشاهدة بدون استخدام اليدين.',
                    'specifications' => '<ul><li>تصميم قابل للطي</li><li>إمساك آمن للهاتف</li><li>وظيفة الحامل</li><li>لاصق قابل لإعادة الاستخدام</li><li>تصميم علوي قابل للتبديل</li></ul>',
                    'details' => '<p>قبضة PopSocket الأصلية للهاتف التي تتمدد للإمساك الآمن وتنطوي لتكون مسطحة، مع وظيفة الحامل للمشاهدة بدون استخدام اليدين.</p>',
                    'price' => 14.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['رمادي', 'أزرق', 'بني']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-573874?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-987732?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-471160?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-811543?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-385782?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-113267?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'أجهزة الصوت' => [
                [
                    'name' => 'سماعات أذن Mi السلكية بمحركين',
                    'description' => 'سماعات أذن سلكية فاخرة بمحركين مزدوجين لجودة صوت فائقة وراحة.',
                    'specifications' => '<ul><li>تقنية المحركين المزدوجين</li><li>جودة صوت فائقة</li><li>ملاءمة مريحة</li><li>كابل غير متشابك</li><li>ميكروفون مدمج في السلك</li></ul>',
                    'details' => '<p>اختبر جودة صوت استثنائية مع سماعات أذن Mi السلكية بمحركين مزدوجين بتقنية متقدمة لنغمات عالية نقية وصوت جهير عميق.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-780381?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-315840?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-976200?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-763731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-120462?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-835951?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سماعات boAt Airdopes 138 Pro اللاسلكية',
                    'description' => 'سماعات أذن لاسلكية حقيقية مع عزل ضوضاء نشط وعمر بطارية طويل.',
                    'specifications' => '<ul><li>تصميم لاسلكي حقيقي</li><li>عزل ضوضاء نشط</li><li>تشغيل إجمالي 32 ساعة</li><li>مقاومة للماء IPX4</li><li>أزرار تحكم باللمس</li></ul>',
                    'details' => '<p>توفر سماعات boAt Airdopes 138 Pro تجربة صوت لاسلكية فاخرة بتقنية عزل الضوضاء النشط وعمر بطارية ممتد للاستماع طوال اليوم.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-010633?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-464819?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-563101?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-454748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-750329?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-431205?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سماعات JBL Tune 520BT اللاسلكية فوق الأذن',
                    'description' => 'سماعات لاسلكية فوق الأذن بصوت JBL Pure Bass وعمر بطارية طويل.',
                    'specifications' => '<ul><li>صوت JBL Pure Bass</li><li>عمر بطارية 57 ساعة</li><li>بلوتوث لاسلكي 5.3</li><li>تصميم خفيف الوزن</li><li>اتصال متعدد النقاط</li></ul>',
                    'details' => '<p>توفر سماعات JBL Tune 520BT صوت JBL Pure Bass الأسطوري مع عمر بطارية مذهل يصل إلى 57 ساعة وتصميم مريح فوق الأذن.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-148358?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-612295?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-495869?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-072026?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-236412?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-582503?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سماعة رقبة Pro Bass بتقنية البلوتوث',
                    'description' => 'سماعات رقبة لاسلكية بصوت جهير معزز وسماعات أذن مغناطيسية.',
                    'specifications' => '<ul><li>استجابة جهير معززة</li><li>سماعات أذن مغناطيسية</li><li>عمر بطارية 15 ساعة</li><li>مقاومة للعرق IPX5</li><li>دعم الشحن السريع</li></ul>',
                    'details' => '<p>توفر سماعة الرقبة Pro Bass استجابة جهير قوية وسماعات أذن مغناطيسية مريحة مع عمر بطارية طوال اليوم لأسلوب حياة نشط.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-359408?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-301466?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-135338?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-862995?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-894042?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-470794?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سماعة ساوند بار بلوتوث بقوة 10 واط',
                    'description' => 'ساوند بار بلوتوث مدمج بقوة إخراج 10 واط لتحسين صوت التلفزيون والموسيقى.',
                    'specifications' => '<ul><li>قوة إخراج إجمالية 10 واط</li><li>اتصال بلوتوث 5.0</li><li>خيارات إدخال متعددة</li><li>تصميم مدمج</li><li>يشمل جهاز التحكم عن بعد</li></ul>',
                    'details' => '<p>حسّن تجربة التلفزيون والموسيقى مع هذا الساوند بار المدمج بقوة 10 واط الذي يتميز بخيارات اتصال متعددة وإخراج صوت واضح.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-995688?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-291094?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-745334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126992?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-348714?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-321802?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ساوند بار Zebronics Juke Bar 10000',
                    'description' => 'ساوند بار فاخر مع إخراج صوت قوي وخيارات اتصال متعددة.',
                    'specifications' => '<ul><li>إخراج صوت قوي</li><li>اتصال متعدد</li><li>شاشة LED</li><li>جهاز تحكم عن بعد</li><li>قابل للتثبيت على الحائط</li></ul>',
                    'details' => '<p>يوفر ساوند بار Zebronics Juke Bar 10000 جودة صوت فاخرة مع محركات قوية واتصال مرن لتجربة صوت منزلية مثالية.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-763300?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-821106?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-502318?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-848527?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315916?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-716490?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سماعة ألعاب عالية الأداء',
                    'description' => 'سماعة ألعاب احترافية مع صوت محيطي 7.1 وميكروفون عازل للضوضاء.',
                    'specifications' => '<ul><li>صوت محيطي 7.1</li><li>ميكروفون عازل للضوضاء</li><li>إضاءة RGB</li><li>حشوات مريحة</li><li>توافق مع منصات متعددة</li></ul>',
                    'details' => '<p>سماعة ألعاب احترافية مصممة للألعاب التنافسية مع صوت محيطي 7.1 غامر وتواصل واضح تمامًا.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود','أبيض']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-656123?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-859178?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-049481?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-922143?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-160497?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-144632?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ميكروفون بث صوتي Shure MV7 مع USB / XLR',
                    'description' => 'ميكروفون بودكاست احترافي مع اتصال USB و XLR لتسجيل بجودة الاستوديو.',
                    'specifications' => '<ul><li>مخرجات USB و XLR</li><li>تسجيل بجودة الاستوديو</li><li>مراقبة سماعة مدمجة</li><li>أزرار تحكم بلمسة لمسية</li><li>هيكل بمستوى احترافي</li></ul>',
                    'details' => '<p>ميكروفون Shure MV7 هو الميكروفون المثالي للبودكاست حيث يوفر اتصال USB و XLR مع صوت احترافي بجودة الاستوديو لصناع المحتوى.</p>',
                    'price' => 279.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود','أبيض']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-796258?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-649198?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-583224?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-293285?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-923383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-430979?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'التقنيات القابلة للارتداء' => [
                [
                    'name' => 'Noise Halo 2 - إصدار محدود',
                    'description' => 'ساعة ذكية فاخرة بإصدار محدود مع مراقبة صحية متقدمة وتصميم أنيق.',
                    'specifications' => '<ul><li>تصميم بإصدار محدود</li><li>مراقبة صحية متقدمة</li><li>عمر بطارية 7 أيام</li><li>مقاومة للماء IP68</li><li>أوضاع رياضية متعددة</li></ul>',
                    'details' => '<p>يجمع Noise Halo 2 الإصدار المحدود بين الجماليات الفاخرة وتقنية الصحة المتطورة لتجربة الساعة الذكية المثالية.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-042563?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-000219?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-910670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-549690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-835036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-022441?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سوار Samsung Galaxy Fit E الذكي',
                    'description' => 'متتبع لياقة خفيف الوزن مع مراقبة معدل ضربات القلب وتتبع النوم.',
                    'specifications' => '<ul><li>مراقبة معدل ضربات القلب</li><li>تتبع النوم</li><li>مقاومة للماء 5ATM</li><li>بطارية حتى أسبوع</li><li>تصميم خفيف الوزن</li></ul>',
                    'details' => '<p>يوفر سوار Samsung Galaxy Fit E ميزات تتبع اللياقة الأساسية بتصميم مريح وخفيف الوزن مثالي للارتداء اليومي.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-362133?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-861134?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-953686?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-972119?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-895475?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-619748?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خاتم ذكي نسائي مع تحكم NFC وقياس نبض القلب',
                    'description' => 'خاتم ذكي أنيق مع تحكم NFC ومراقبة معدل ضربات القلب وتتبع الصحة.',
                    'specifications' => '<ul><li>وظيفة التحكم NFC</li><li>مراقبة معدل ضربات القلب</li><li>أجهزة استشعار تتبع الصحة</li><li>تصميم أنيق</li><li>هيكل مقاوم للماء</li></ul>',
                    'details' => '<p>خاتم ذكي ثوري مصمم للنساء، يجمع بين الجماليات الأنيقة والمراقبة الصحية المتقدمة وقدرات التحكم NFC.</p>',
                    'price' => 199.99,
                    'cover_image' => 'https://images.unsplash.com/photo-773439?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-563762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-911587?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-609987?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-919383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-861748?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سوار لياقة Pebble Qore الجديد',
                    'description' => 'سوار لياقة متقدم مع مراقبة صحية شاملة وعمر بطارية طويل.',
                    'specifications' => '<ul><li>مراقبة صحية شاملة</li><li>عمر بطارية 15 يومًا</li><li>مراقبة SpO2</li><li>أوضاع تمرين متعددة</li><li>مقاومة للماء IP67</li></ul>',
                    'details' => '<p>يوفر سوار Pebble Qore رؤى صحية شاملة مع عمر بطارية ممتد وقدرات مراقبة متقدمة لأسلوب حياة نشط.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-753240?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-477697?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-601676?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-033861?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-738709?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-494572?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ساعة Noise Champ 2 الذكية',
                    'description' => 'ساعة ذكية غنية بالميزات مع إمكانية إجراء المكالمات عبر البلوتوث ومراقبة الصحة.',
                    'specifications' => '<ul><li>مكالمات عبر البلوتوث</li><li>مجموعة مراقبة صحية</li><li>شاشة AMOLED بحجم 1.39 بوصة</li><li>عمر بطارية 7 أيام</li><li>أكثر من 100 وجه ساعة</li></ul>',
                    'details' => '<p>توفر ساعة Noise Champ 2 الذكية ميزات فاخرة تشمل المكالمات عبر البلوتوث ومراقبة صحية شاملة في تصميم أنيق.</p>',
                    'price' => 129.99,
                    'sale_price' => 109.99,
                    'cover_image' => 'https://images.unsplash.com/photo-276707?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-861336?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-781425?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-520282?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-546972?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-699327?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Apple Vision Pro',
                    'description' => 'كمبيوتر مكاني ثوري بقدرات متقدمة للواقع المختلط.',
                    'specifications' => '<ul><li>حوسبة مكانية</li><li>تجربة واقع مختلط</li><li>تقنية تتبع العين</li><li>التحكم بإيماءات اليد</li><li>شاشات فائقة الدقة</li></ul>',
                    'details' => '<p>يمثل Apple Vision Pro مستقبل الحوسبة بتقنية مكانية رائدة وتجارب واقع مختلط غامرة.</p>',
                    'price' => 3499.99,
                    'cover_image' => 'https://images.unsplash.com/photo-895032?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-268498?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-452993?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-945909?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-373813?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-373795?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ملاحق بلوتوث للعثور على المفاتيح والأغراض',
                    'description' => 'متتبع بلوتوث ذكي للمفاتيح والأشياء الثمينة مع تحديد دقيق.',
                    'specifications' => '<ul><li>تحديد دقيق</li><li>بلوتوث 5.0</li><li>بطارية قابلة للاستبدال</li><li>مقاوم للماء</li><li>تكامل مع تطبيق الجوال</li></ul>',
                    'details' => '<p>لا تفقد مفاتيحك مرة أخرى مع هذا المتتبع الذكي بتقنية البلوتوث التي تتميز بتقنية تحديد دقيقة وتكامل سلس مع تطبيق الجوال.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود', 'أخضر', 'أبيض']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-324359?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-515283?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404442?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-197459?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-403469?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-980928?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'عصابة رأس ذكية لاستشعار الموجات الدماغية',
                    'description' => 'عصابة رأس متقدمة لمراقبة الموجات الدماغية للتأمل والتدريب المعرفي.',
                    'specifications' => '<ul><li>مراقبة الموجات الدماغية EEG</li><li>إرشادات التأمل</li><li>تدريب معرفي</li><li>تصميم عصابة رأس مريح</li><li>اتصال بتطبيق الجوال</li></ul>',
                    'details' => '<p>عصابة رأس ثورية بجهاز استشعار الموجات الدماغية تراقب حالتك العقلية وتوفر تجارب تأمل موجه وتدريب معرفي.</p>',
                    'price' => 299.99,
                    'sale_price' => 249.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'أزرق', 'أسود']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-108528?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-018787?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-444982?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-426395?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-106620?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-242551?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الطاقة والشحن' => [
                [
                    'name' => 'باور بانك سامسونج بسعة 10000mAh',
                    'description' => 'باور بانك محمول عالي السعة مع شحن سريع ودعم لأجهزة متعددة.',
                    'specifications' => '<ul><li>سعة 10000mAh</li><li>دعم الشحن السريع</li><li>منفذا USB</li><li>مؤشر LED للطاقة</li><li>تصميم مضغوط</li></ul>',
                    'details' => '<p>يوفر باور بانك سامسونج بسعة 10000mAh شحنًا محمولاً موثوقًا مع تقنية الشحن السريع ودعم الأجهزة المتعددة في نفس الوقت.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-474522?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-986820?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-425240?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-799065?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-289367?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-794894?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شاحن Noise Power Series GaN بقوة 30 واط',
                    'description' => 'شاحن GaN مدمج بشحن سريع بقوة 30 واط للهواتف الذكية والأجهزة اللوحية.',
                    'specifications' => '<ul><li>تقنية GaN بقوة 30 واط</li><li>تصميم مدمج</li><li>دعم الشحن السريع</li><li>توافق شامل</li><li>حماية من الشحن الزائد</li></ul>',
                    'details' => '<p>يوفر شاحن Noise Power Series GaN بقوة 30 واط شحنًا سريعًا فعالاً في تصميم مضغوط باستخدام تقنية GaN المتقدمة.</p>',
                    'price' => 29.99,
                    'sale_price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-069716?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-539874?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-398353?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-644793?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-032252?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-094380?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لوحة تمديد مقابس مع واقي التيار الكهربائي',
                    'description' => 'لوحة تمديد متعددة المقابس مع حماية مدمجة من ارتفاع التيار وميزات أمان.',
                    'specifications' => '<ul><li>6 مقابس عالمية</li><li>حماية من ارتفاع التيار</li><li>حماية من الحمل الزائد</li><li>مؤشر LED للطاقة</li><li>كابل طاقة بطول 6 أقدام</li></ul>',
                    'details' => '<p>لوحة تمديد احترافية مع حماية من ارتفاع التيار لحماية أجهزتك من تقلبات التيار الكهربائي والارتفاعات المفاجئة.</p>',
                    'price' => 39.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'أسود']],
                        ['name' => 'المقابس', 'options' => ['4 مقابس', '6 مقابس', '8 مقابس']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-488726?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-747789?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-302677?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-409954?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-590281?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-109674?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كابل Belkin مضفر من USB-C إلى USB-A',
                    'description' => 'كابل مضفر متين من USB-C إلى USB-A للشحن ونقل البيانات.',
                    'specifications' => '<ul><li>من USB-C إلى USB-A</li><li>هيكل مضفر</li><li>دعم الشحن السريع</li><li>قدرة مزامنة البيانات</li><li>طول 6 أقدام</li></ul>',
                    'details' => '<p>كابل USB مضفر من Belkin بهيكل متين للشحن ونقل البيانات بشكل موثوق بين أجهزة USB-C و USB-A.</p>',
                    'price' => 19.99,
                    'variants' => [
                        ['name' => 'الطول', 'options' => ['3 أقدام', '6 أقدام', '10 أقدام']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-280195?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-649095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-669208?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-872246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-868265?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959572?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'محول POP GaN5 ثلاثي المنافذ بقوة 67 واط',
                    'description' => 'محول GaN5 عالي الطاقة بثلاثة منافذ للشحن المتزامن للأجهزة.',
                    'specifications' => '<ul><li>قوة إخراج إجمالية 67 واط</li><li>تقنية GaN5</li><li>تصميم ثلاثي المنافذ</li><li>منافذ USB-C و USB-A</li><li>شكل مضغوط</li></ul>',
                    'details' => '<p>يوفر محول POP 67W ثلاثي المنافذ GaN5 شحنًا قويًا للأجهزة المتعددة في نفس الوقت باستخدام تقنية GaN5 المتقدمة.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-884432?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-943087?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461449?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-832004?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-843045?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708362?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شاحن سيارة سريع مزدوج الإخراج بقوة 30 واط',
                    'description' => 'شاحن سيارة بمنفذين مع شحن سريع بقوة 30 واط للطاقة أثناء التنقل.',
                    'specifications' => '<ul><li>شحن سريع بقوة 30 واط</li><li>منفذا USB</li><li>مؤشر LED للطاقة</li><li>توافق شامل</li><li>تصميم مدمج</li></ul>',
                    'details' => '<p>يوفر شاحن السيارة Car Power 30 شحنًا سريعًا موثوقًا لجهازين في نفس الوقت أثناء القيادة، مع توافق شامل وميزات أمان.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-362752?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-441222?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-164579?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-050368?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-272625?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-881582?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لوحة تمديد Portronics Power Plate 7',
                    'description' => 'لوحة تمديد ذكية مع 7 مقابس وميزات أمان متقدمة.',
                    'specifications' => '<ul><li>7 مقابس عالمية</li><li>إدارة ذكية للطاقة</li><li>حماية من الحمل الزائد</li><li>ستائر أمان للأطفال</li><li>كابل متين بطول 8 أقدام</li></ul>',
                    'details' => '<p>توفر لوحة Portronics Power Plate 7 إدارة ذكية للطاقة مع 7 مقابس وميزات أمان شاملة للاستخدام المنزلي والمكتبي.</p>',
                    'price' => 44.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'أسود']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-691524?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-207024?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708487?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-513557?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654030?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-302259?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شاحن Type-C فائق السرعة بقوة 67 واط',
                    'description' => 'شاحن USB-C فائق السرعة بقوة 67 واط لأجهزة الكمبيوتر المحمولة والأجهزة اللوحية والهواتف الذكية.',
                    'specifications' => '<ul><li>شحن فائق السرعة بقوة 67 واط</li><li>دعم USB-C PD</li><li>توافق شامل</li><li>تصميم مدمج</li><li>شهادات أمان</li></ul>',
                    'details' => '<p>يوفر شاحن Type-C فائق السرعة بقوة 67 واط أقصى سرعة شحن لأجهزة USB-C بما في ذلك أجهزة الكمبيوتر المحمولة والأجهزة اللوحية والهواتف الذكية مع شهادات أمان.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-938078?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-243082?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-487855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-664199?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-044823?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-783394?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'إكسسوارات الكمبيوتر' => [
                [
                    'name' => 'فأرة لاسلكية ZEBRONICS Charm قابلة لإعادة الشحن',
                    'description' => 'فأرة لاسلكية مريحة قابلة لإعادة الشحن مع تتبع دقيق وعمر بطارية طويل.',
                    'specifications' => '<ul><li>بطارية قابلة لإعادة الشحن</li><li>اتصال لاسلكي</li><li>تصميم مريح</li><li>مستشعر بصري دقيق</li><li>شحن USB-C</li></ul>',
                    'details' => '<p>توفر فأرة ZEBRONICS Charm اللاسلكية تصميمًا مريحًا مع بطارية قابلة لإعادة الشحن وتتبعًا بصريًا دقيقًا للإنتاجية والألعاب.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-431006?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-693512?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-049015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-112626?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-906844?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-584161?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لوحة مفاتيح سلكية مقاومة للماء بمفاتيح صامتة',
                    'description' => 'لوحة مفاتيح سلكية مقاومة للماء بمفاتيح صامتة لتجربة كتابة مريحة.',
                    'specifications' => '<ul><li>تصميم مقاوم للماء</li><li>مفاتيح صامتة</li><li>تخطيط بالحجم الكامل</li><li>هيكل متين</li><li>اتصال USB</li></ul>',
                    'details' => '<p>لوحة مفاتيح سلكية احترافية تتميز بتصميم مقاوم للماء ومفاتيح صامتة للكتابة المريحة والهادئة في أي بيئة.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-836552?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-718250?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-944115?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-258861?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-652441?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-824684?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'طقم لوحة مفاتيح وفأرة لاسلكية',
                    'description' => 'طقم لوحة مفاتيح وفأرة لاسلكية متكامل لإنتاجية المكتب.',
                    'specifications' => '<ul><li>لوحة مفاتيح وفأرة لاسلكية</li><li>اتصال 2.4GHz</li><li>عمر بطارية طويل</li><li>تصميم مدمج</li><li>يشمل مستقبل USB</li></ul>',
                    'details' => '<p>طقم لاسلكي متكامل يضم لوحة مفاتيح بالحجم الكامل وفأرة بصرية مع اتصال موثوق 2.4GHz وعمر بطارية ممتد.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-901190?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-780106?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005786?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-670852?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-517117?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-179129?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حامل كمبيوتر محمول قابل للتعديل فاخر',
                    'description' => 'حامل كمبيوتر محمول مريح قابل للتعديل مع إعدادات متعددة للارتفاع والزاوية.',
                    'specifications' => '<ul><li>إعدادات ارتفاع متعددة</li><li>زوايا عرض قابلة للتعديل</li><li>هيكل من الألومنيوم</li><li>تصميم لتبديد الحرارة</li><li>محمول وقابل للطي</li></ul>',
                    'details' => '<p>حامل كمبيوتر محمول من الألومنيوم الفاخر مع خيارات تعديل متعددة لوضعية مريحة وتحسين تدفق الهواء لتبريد أفضل للكمبيوتر المحمول.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-716833?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-697479?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-354821?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-168030?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-580120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-769047?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مبرد كمبيوتر محمول Zebronics ZEB-NC3300 بطاقة USB',
                    'description' => 'مبرد كمبيوتر محمول يعمل بالطاقة USB مع مراوح متعددة للتحكم الأمثل في الحرارة.',
                    'specifications' => '<ul><li>يعمل بالطاقة USB</li><li>مراوح تبريد متعددة</li><li>ارتفاع قابل للتعديل</li><li>مؤشرات LED</li><li>توافق شامل مع أجهزة الكمبيوتر المحمولة</li></ul>',
                    'details' => '<p>يتميز مبرد Zebronics ZEB-NC3300 بمراوح متعددة وارتفاع قابل للتعديل للحفاظ على برودة الكمبيوتر المحمول أثناء المهام المكثفة.</p>',
                    'price' => 29.99,
                    'sale_price' => 24.99,
                    'variants' => [
                        ['name' => 'الحجم', 'options' => ['حتى 15.6 بوصة', 'حتى 17 بوصة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-912774?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-004779?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333910?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-185555?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-268171?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214439?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'موزع USB Zebronics 200HB',
                    'description' => 'موزع USB متعدد المنافذ لتوسيع خيارات الاتصال مع نقل بيانات عالي السرعة.',
                    'specifications' => '<ul><li>منافذ USB متعددة</li><li>نقل بيانات عالي السرعة</li><li>تشغيل فوري</li><li>تصميم مدمج</li><li>مؤشر LED للطاقة</li></ul>',
                    'details' => '<p>يوسع موزع Zebronics 200HB اتصالك بمنافذ USB متعددة عالية السرعة في تصميم مدمج يعمل فورًا.</p>',
                    'price' => 19.99,
                    'variants' => [
                        ['name' => 'المنافذ', 'options' => ['4 منافذ', '7 منافذ']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-909834?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-318563?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-663985?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-771965?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-094490?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-913876?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كاميرا ويب Zebronics Live Pro',
                    'description' => 'كاميرا ويب عالية الدقة مع تركيز تلقائي وميكروفون مدمج لمكالمات الفيديو والبث.',
                    'specifications' => '<ul><li>فيديو HD بدقة 1080p</li><li>تقنية التركيز التلقائي</li><li>ميكروفون مدمج</li><li>تشغيل فوري عبر USB</li><li>عدسة واسعة الزاوية</li></ul>',
                    'details' => '<p>توفر كاميرا Zebronics Live Pro فيديو واضحًا بدقة 1080p مع تركيز تلقائي وميكروفون مدمج لمكالمات فيديو وبث احترافي.</p>',
                    'price' => 44.99,
                    'sale_price' => 39.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود', 'أبيض']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-479324?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-326205?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-642534?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-152297?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777478?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-670329?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قرص صلب خارجي UnionSine محمول بسعة 500GB',
                    'description' => 'قرص صلب خارجي محمول بسعة تخزين 500GB واتصال USB 3.0.',
                    'specifications' => '<ul><li>سعة تخزين 500GB</li><li>اتصال USB 3.0</li><li>تصميم محمول</li><li>تشغيل فوري</li><li>متوافق مع أنظمة تشغيل متعددة</li></ul>',
                    'details' => '<p>يوفر القرص الصلب الخارجي المحمول UnionSine بسعة 500GB توسيع تخزين موثوقًا مع اتصال USB 3.0 سريع وتوافق عبر المنصات.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-296647?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-525472?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-836137?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-113397?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-660080?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129174?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'أزياء الرجال' => [
                [
                    'name' => 'تيشيرت H&M رجالي بقصّة عادية',
                    'description' => 'تيشيرت مريح بقصّة عادية مصنوع من قماش قطن مخلوط ناعم.',
                    'specifications' => '<ul><li>قطن 100%</li><li>قصّة عادية</li><li>ياقة دائرية</li><li>أكمام قصيرة</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>تيشيرت كلاسيكي بقصّة عادية مثالي للارتداء اليومي. مصنوع من قطن مخلوط ناعم للراحة والمتانة.</p>',
                    'price' => 12.99,
                    'cover_image' => 'https://images.unsplash.com/photo-456247?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-363562?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-451867?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-805385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-314472?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026809?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قميص Highlander رجالي كاجوال سادة',
                    'description' => 'قميص كاجوال أنيق بلون سادة مع قصّة عصرية وقماش فاخر.',
                    'specifications' => '<ul><li>قماش قطن مخلوط</li><li>قصّة عصرية</li><li>ياقة بأزرار</li><li>أكمام طويلة</li><li>سهل العناية</li></ul>',
                    'details' => '<p>قميص كاجوال فاخر بقصّة عصرية وألوان سادة. مثالي للمناسبات الكاجوال وشبه الرسمية.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['S', 'M', 'L', 'XL', 'XXL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-749990?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-817346?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-597680?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-346874?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143402?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-030362?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'جينز Levi\'s 511 رجالي بقصّة نحيفة',
                    'description' => 'جينز كلاسيكي بقصّة نحيفة مع لمسة Levi\'s الأصيلة والراحة.',
                    'specifications' => '<ul><li>قطن 99%، إيلاستان 1%</li><li>قصّة نحيفة</li><li>تصميم بخمسة جيوب</li><li>إغلاق بأزرار</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>جينز Levi\'s 511 الأيقوني بقصّة نحيفة مع تصميم كلاسيكي وراحة عصرية. قصّة مثالية للارتداء اليومي.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['30', '32', '34', '36', '38', '40']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-998197?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-835718?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-517342?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-869095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-203811?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-162683?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بنطال Campus Sutra رجالي رسمي بقصّة مفصّلة',
                    'description' => 'بنطال رسمي بقصّة مفصّلة وتصميم نحيف وقماش فاخر.',
                    'specifications' => '<ul><li>خليط البوليستر</li><li>قصّة مفصّلة</li><li>أمامي مسطح</li><li>حلقات للحزام</li><li>ينصح بالتنظيف الجاف</li></ul>',
                    'details' => '<p>بنطال رسمي مفصّل مثالي للارتداء في المكتب والمناسبات الرسمية. قماش فاخر مع قصّة مريحة.</p>',
                    'price' => 39.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['30', '32', '34', '36', '38', '40']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-932220?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-624927?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-711208?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777343?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-090316?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-700208?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'جاكيت Lymio رجالي',
                    'description' => 'جاكيت كاجوال أنيق بتصميم عصري وقصّة مريحة.',
                    'specifications' => '<ul><li>طبقة خارجية من البوليستر</li><li>إغلاق بسحاب</li><li>جيوب جانبية</li><li>قصّة عادية</li><li>مقاوم للماء</li></ul>',
                    'details' => '<p>جاكيت كاجوال عصري مثالي للطبقات. قماش مقاوم للماء مع قصّة مريحة للارتداء اليومي.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-815661?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-491411?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-585533?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-756068?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-328120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-499345?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'هودي Nobero بقصّة واسعة',
                    'description' => 'هودي مريح بقصّة واسعة مع بطانة صوفية ناعمة وأسلوب عصري.',
                    'specifications' => '<ul><li>خليط القطن والبوليستر</li><li>قصّة واسعة</li><li>بطانة صوفية</li><li>جيب كنغارو</li><li>قلنسوة قابلة للتعديل</li></ul>',
                    'details' => '<p>هودي عصري بقصّة واسعة مع بطانة صوفية ناعمة لأقصى راحة. مثالي للارتداء الكاجوال وأسلوب الشارع.</p>',
                    'price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-681903?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-206454?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-702983?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005492?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-148962?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462524?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حذاء Cruiser رياضي كاجوال رجالي',
                    'description' => 'حذاء رياضي كاجوال مريح بتصميم عصري ونعل مبطن.',
                    'specifications' => '<ul><li>جزء علوي صناعي</li><li>نعل مبطن</li><li>إغلاق بأربطة</li><li>بطانة قابلة للتنفس</li><li>نعل خارجي مطاطي</li></ul>',
                    'details' => '<p>حذاء رياضي كاجوال أنيق مثالي للارتداء اليومي. نعل مبطن مريح مع تصميم عصري وهيكل متين.</p>',
                    'price' => 34.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['7', '8', '9', '10', '11', '12']],
                        ['name' => 'اللون', 'options' => ['أسود', 'أخضر', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-605445?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-708855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-292696?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-051961?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-477625?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-881592?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ساعة Fastrack-Tees Hype Adventure الكوارتز التناظرية',
                    'description' => 'ساعة تناظرية رياضية بتصميم مستوحى من المغامرة وحركة كوارتز موثوقة.',
                    'specifications' => '<ul><li>حركة كوارتز</li><li>عرض تناظري</li><li>مقاومة للماء</li><li>سوار متين</li><li>تصميم مغامرات</li></ul>',
                    'details' => '<p>ساعة تناظرية مستوحاة من المغامرة مع حركة كوارتز موثوقة. مثالية لأسلوب الحياة النشط بتصميم رياضي ومقاومة للماء.</p>',
                    'price' => 49.99,
                    'sale_price' => 39.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['تركوازي', 'بني', 'كريمي', 'أبيض']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-360234?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-356399?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-873215?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-690933?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-429159?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-162255?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'أزياء النساء' => [
                [
                    'name' => 'فستان Mexi من القطن الخالص بقصّة مجمّعة',
                    'description' => 'فستان مريح من القطن الخالص مع تفاصيل مجمّعة وتصميم مستوحى من المكسيك.',
                    'specifications' => '<ul><li>قطن خالص 100%</li><li>صدرية مجمّعة</li><li>طباعة مستوحاة من المكسيك</li><li>طول متوسط</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>فستان جميل من القطن الخالص يتميز بتفاصيل مجمّعة تقليدية وأنماط نابضة مستوحاة من المكسيك. مثالي للمناسبات الكاجوال وشبه الرسمية.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-275144?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-918818?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-577440?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-591925?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-264563?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-643146?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بلوزة Peplum قابلة للتمدد بتصميم مقسّم',
                    'description' => 'بلوزة Peplum أنيقة بتصميم مقسّم وقماش قابل للتمدد للراحة.',
                    'specifications' => '<ul><li>خليط قماش قابل للتمدد</li><li>تصميم مقسّم</li><li>صورة ظلية Peplum</li><li>رقبة دائرية</li><li>قابلة للغسل في الغسالة</li></ul>',
                    'details' => '<p>بلوزة Peplum عصرية بتصميم مقسّم جذاب وقماش مريح قابل للتمدد. مثالية لملابس المكتب والخروجات الكاجوال.</p>',
                    'price' => 34.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['XS', 'S', 'M', 'L', 'XL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-911325?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-619150?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-529704?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-398662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-125508?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-020740?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كورتي مستقيم بطباعة الأزهار',
                    'description' => 'كورتي أنيق بقصّة مستقيمة مع طباعة أزهار جميلة وقصّة مريحة.',
                    'specifications' => '<ul><li>قماش قطن مخلوط</li><li>تصميم بطباعة الأزهار</li><li>قصّة مستقيمة</li><li>أكمام ثلاثة أرباع</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>كورتي مستقيم جميل يتميز بطباعات زهرية أنيقة. مثالي للملابس التقليدية والمناسبات الكاجوال مع قماش قطن مخلوط مريح.</p>',
                    'price' => 29.99,
                    'sale_price' => 24.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['XS', 'S', 'M', 'L', 'XL', 'XXL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-968381?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-730786?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-649153?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-060604?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-372958?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-501360?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'جينز بقصّة مستقيمة بلون غسيل فاتح',
                    'description' => 'جينز كلاسيكي بقصّة مستقيمة بلون غسيل فاتح مع قماش مطاطي مريح.',
                    'specifications' => '<ul><li>قطن 98%، إيلاستان 2%</li><li>لمسة غسيل فاتح</li><li>قصّة مستقيمة</li><li>تصميم بخمسة جيوب</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>جينز كلاسيكي بقصّة مستقيمة بلون غسيل فاتح عصري. قماش مطاطي مريح مع تصميم خالد مثالي للارتداء اليومي.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['24', '26', '28', '30', '32', '34']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-196364?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-313328?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-484762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-086383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-221554?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'تنورة متوسطة من القطن الخالص بثنيات صندوقية',
                    'description' => 'تنورة متوسطة أنيقة بثنيات صندوقية مصنوعة من قماش القطن الخالص.',
                    'specifications' => '<ul><li>قطن خالص 100%</li><li>تصميم بثنيات صندوقية</li><li>طول متوسط</li><li>إغلاق بسحاب جانبي</li><li>قابلة للغسل في الغسالة</li></ul>',
                    'details' => '<p>تنورة متوسطة راقية تتميز بثنيات صندوقية كلاسيكية من القطن الخالص. مثالية لملابس المكتب والمناسبات الرسمية بأناقة خالدة.</p>',
                    'price' => 44.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['XS', 'S', 'M', 'L', 'XL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-415854?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-676491?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-200169?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-906652?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-534782?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-952346?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حقيبة كتف Clarice مجعّدة',
                    'description' => 'حقيبة كتف أنيقة بتصميم مجعّد وخامات عالية الجودة.',
                    'specifications' => '<ul><li>جلد صناعي فاخر</li><li>تصميم مجعّد</li><li>حزام كتف قابل للتعديل</li><li>أقسام متعددة</li><li>إغلاق مغناطيسي</li></ul>',
                    'details' => '<p>حقيبة كتف أنيقة تتميز بتصميم مجعّد راقٍ. الأقسام المتعددة والحزام القابل للتعديل يجعلانها مثالية للاستخدام اليومي.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-436231?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-250524?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-291600?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-833493?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404808?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-052606?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حذاء كعب إسفيني بحلقة كاحل',
                    'description' => 'حذاء كعب إسفيني مريح مع تصميم حلقة كاحل لثبات آمن.',
                    'specifications' => '<ul><li>تصميم كعب إسفيني</li><li>إغلاق بحلقة الكاحل</li><li>نعل داخلي مبطن</li><li>نعل مانع للانزلاق</li><li>ارتفاع الكعب 3 بوصات</li></ul>',
                    'details' => '<p>حذاء كعب إسفيني أنيق مع تصميم حلقة كاحل آمنة. نعل داخلي مبطن ونعل مانع للانزلاق يوفران الراحة والثبات للارتداء طوال اليوم.</p>',
                    'price' => 54.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']],
                        ['name' => 'اللون', 'options' => ['أخضر', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-069737?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-369331?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303376?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-823641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-270283?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-568579?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قلادة Elowen Vine بألماس مخبري',
                    'description' => 'قلادة أنيقة بماسات مخبرية بتصميم مستوحى من الكرمة.',
                    'specifications' => '<ul><li>ألماس مخبري</li><li>سلسلة من الفضة الإسترليني</li><li>تصميم مستوحى من الكرمة</li><li>مضاد للحساسية</li><li>تشمل علبة هدية</li></ul>',
                    'details' => '<p>قلادة فاخرة بماسات مخبرية مصدرها أخلاقي بتصميم جميل مستوحى من الكرمة. مثالية للمناسبات الخاصة والأناقة اليومية.</p>',
                    'price' => 199.99,
                    'sale_price' => 179.99,
                    'cover_image' => 'https://images.unsplash.com/photo-364777?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-463464?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-798356?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-833284?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249408?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-939352?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'أزياء الأطفال' => [
                [
                    'name' => 'تيشيرت أولاد قطني بقصّة عادية',
                    'description' => 'تيشيرت قطني مريح بقصّة عادية، مثالي للارتداء اليومي.',
                    'specifications' => '<ul><li>قماش قطني 100%</li><li>تصميم بقصّة عادية</li><li>ياقة دائرية</li><li>قابل للغسل في الغسالة</li><li>ناعم وقابل للتنفس</li></ul>',
                    'details' => '<p>تيشيرت قطني كلاسيكي مصمم للأولاد بقصّة عادية للراحة والأناقة. مصنوع من قطن ناعم قابل للتنفس مثالي للأطفال النشطين.</p>',
                    'price' => 12.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['3-6M']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-188251?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-589925?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-310457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-410968?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-323706?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-413447?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'فستان قطني كاجوال للبنات',
                    'description' => 'فستان قطني لطيف للبنات بقصّة مريحة وتصميم مرح.',
                    'specifications' => '<ul><li>خامة قطنية 100%</li><li>تصميم بأسلوب كاجوال</li><li>قصّة مريحة</li><li>قماش سهل العناية</li><li>أنماط ملونة</li></ul>',
                    'details' => '<p>فستان قطني جميل مثالي للمناسبات الكاجوال. يتميز بقصّة مريحة وتصميمات مرحة تحبها البنات، مصنوع من قطن ناعم للراحة طوال اليوم.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['3-6M']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-379601?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-537623?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-003962?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-509073?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-427162?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-231764?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شورت جري للأطفال',
                    'description' => 'شورت جري خفيف الوزن مصمم للأطفال النشطين بقماش يمتص العرق.',
                    'specifications' => '<ul><li>قماش يمتص العرق</li><li>تصميم خفيف الوزن</li><li>حزام خصر مطاطي</li><li>جيوب جانبية</li><li>خامة سريعة الجفاف</li></ul>',
                    'details' => '<p>شورت جري مثالي للأطفال النشطين بقماش يمتص العرق وتصميم خفيف الوزن. حزام الخصر المطاطي والجيوب الجانبية يوفران الراحة والوظائف.</p>',
                    'price' => 16.99,
                    'cover_image' => 'https://images.unsplash.com/photo-888542?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-110975?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-549864?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-893722?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-132236?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-486588?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حذاء مشي رياضي للأطفال',
                    'description' => 'حذاء رياضي مريح مصمم للمشي والأنشطة اليومية.',
                    'specifications' => '<ul><li>نعل مبطن</li><li>جزء علوي من شبكة قابلة للتنفس</li><li>نعل خارجي مانع للانزلاق</li><li>إغلاق بفيلكرو</li><li>هيكل خفيف الوزن</li></ul>',
                    'details' => '<p>حذاء مشي رياضي مريح مثالي للأطفال النشطين. يتميز بنعل مبطن وجزء علوي شبكي قابل للتنفس وإغلاق سهل بفيلكرو للراحة.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['4-4.5 سنوات']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-938206?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-734465?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-988532?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-883127?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-961271?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-235478?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سويت شيرت أطفال بشخصيات رسمية',
                    'description' => 'سويت شيرت دافئ بشخصيات كرتونية مشهورة، مثالي للارتداء الكاجوال.',
                    'specifications' => '<ul><li>قماش قطن مخلوط</li><li>تصميمات شخصيات رسمية</li><li>أسلوب باللبس فوق الرأس</li><li>أصفاد وحافة مضلّعة</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>سويت شيرت ممتع ودافئ بشخصيات كرتونية رسمية يحبها الأطفال. مصنوع من قطن مخلوط ناعم مع أصفاد مضلّعة للراحة والمتانة.</p>',
                    'price' => 28.99,
                    'cover_image' => 'https://images.unsplash.com/photo-110342?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-013304?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-522853?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-515625?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-760068?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-796778?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حقيبة ظهر للأطفال الصغار ومرحلة ما قبل المدرسة',
                    'description' => 'حقيبة ظهر ملونة وعملية مصممة خصيصًا للأطفال الصغار ومرحلة ما قبل المدرسة.',
                    'specifications' => '<ul><li>حجم مناسب للأطفال الصغار</li><li>أحزمة كتف مبطنة</li><li>أقسام متعددة</li><li>خامة مقاومة للماء</li><li>تصميمات كرتونية مرحة</li></ul>',
                    'details' => '<p>حقيبة ظهر مثالية للأطفال الصغار ومرحلة ما قبل المدرسة بحجم مناسب للعمر وتصميمات ممتعة. تتميز بأحزمة مبطنة وأقسام متعددة للتنظيم.</p>',
                    'price' => 22.99,
                    'cover_image' => 'https://images.unsplash.com/photo-105206?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-787422?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-323717?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-485206?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-907644?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-087648?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قبعة رياضية كلاسيكية صغيرة للأطفال النشطين',
                    'description' => 'قبعة رياضية كلاسيكية مصممة للأطفال النشطين بمقاس قابل للتعديل وحماية من الشمس.',
                    'specifications' => '<ul><li>حزام قابل للتعديل</li><li>حماية من الأشعة فوق البنفسجية</li><li>قماش قابل للتنفس</li><li>تصميم رياضي كلاسيكي</li><li>مقاس واحد يناسب معظم الأطفال</li></ul>',
                    'details' => '<p>قبعة رياضية كلاسيكية مثالية للأطفال النشطين بمقاس قابل للتعديل وحماية من الأشعة فوق البنفسجية. القماش القابل للتنفس يحافظ على راحة الأطفال أثناء الأنشطة الخارجية.</p>',
                    'price' => 14.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أصفر', 'وردي', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-044689?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-111629?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-952748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-863191?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249869?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-076092?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بيجامة أطفال قطنية خالصة بأكمام طويلة',
                    'description' => 'بيجامة مريحة من القطن الخالص بأكمام طويلة لنوم مريح.',
                    'specifications' => '<ul><li>قطن خالص 100%</li><li>تصميم بأكمام طويلة</li><li>قصّة مريحة</li><li>ناعمة وقابلة للتنفس</li><li>قماش سهل العناية</li></ul>',
                    'details' => '<p>بيجامة مريحة مصنوعة من القطن الخالص لنوم مريح. تتميز بأكمام طويلة وقماش ناعم لطيف على بشرة الأطفال الحساسة.</p>',
                    'price' => 26.99,
                    'sale_price' => 22.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['3-6M']],
                        ['name' => 'اللون', 'options' => ['أزرق', 'رمادي', 'وردي']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-844771?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-941559?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-384425?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143701?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-445494?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-577024?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الأحذية' => [
                [
                    'name' => 'حذاء Nike Court Vision Low Next Nature رجالي',
                    'description' => 'حذاء Nike كلاسيكي بخامات مستدامة وتصميم خالد مستوحى من كرة السلة.',
                    'specifications' => '<ul><li>خامات مستدامة</li><li>تصميم مستوحى من كرة السلة</li><li>نعل خارجي مطاطي</li><li>ياقة مبطنة</li><li>إغلاق بأربطة</li></ul>',
                    'details' => '<p>يجمع حذاء Nike Court Vision Low Next Nature بين أسلوب كرة السلة الكلاسيكي والخامات المستدامة. مثالي للارتداء اليومي براحة وتصميم Nike الأيقوني.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-359926?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-714945?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-466207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-614160?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-888564?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709404?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حذاء مشي نسائي ANNIE رمادي',
                    'description' => 'حذاء مشي رمادي مريح مصمم للراحة والدعم طوال اليوم.',
                    'specifications' => '<ul><li>نعل داخلي مبطن</li><li>جزء علوي شبكي قابل للتنفس</li><li>تصميم خفيف الوزن</li><li>نعل خارجي مانع للانزلاق</li><li>دعم لقوس القدم</li></ul>',
                    'details' => '<p>توفر أحذية ANNIE الرمادية للمشي راحة استثنائية للمشي والأنشطة اليومية. تتميز بنعل داخلي مبطن وتصميم قابل للتنفس للارتداء طوال اليوم.</p>',
                    'price' => 64.99,
                    'sale_price' => 54.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-500027?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-932959?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-514017?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-100358?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-797953?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-547410?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حذاء لوفار رسمي رجالي',
                    'description' => 'لوفار رسمي كلاسيكي مثالي للأعمال والمناسبات الرسمية.',
                    'specifications' => '<ul><li>جزء علوي من الجلد الطبيعي</li><li>تصميم بدون أربطة</li><li>نعل داخلي مبطن</li><li>تصميم رسمي</li><li>هيكل متين</li></ul>',
                    'details' => '<p>لوفار رسمي أنيق مصنوع من الجلد الطبيعي بتصميم كلاسيكي. مثالي لاجتماعات العمل والمناسبات الرسمية والأماكن المهنية.</p>',
                    'price' => 119.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-990733?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-654551?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-700208?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-198145?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-500126?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-866045?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'صندل نسائي كاجوال بيج',
                    'description' => 'صندل بيج أنيق مثالي لارتداء الصيف الكاجوال والراحة اليومية.',
                    'specifications' => '<ul><li>تصميم بلون بيج</li><li>أشرطة قابلة للتعديل</li><li>نعل مبطن</li><li>أسلوب كاجوال</li><li>قصّة مريحة</li></ul>',
                    'details' => '<p>صندل بيج مريح مصمم للارتداء الكاجوال. يتميز بأشرطة قابلة للتعديل ونعل مبطن للراحة طوال اليوم أثناء الأنشطة الصيفية.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-860948?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-482518?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-080706?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315981?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-075682?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-058993?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كعب نسائي بلوك أزرق باستيل بأشرطة',
                    'description' => 'كعب بلوك أزرق باستيل أنيق بتصميم شرائط للمناسبات الخاصة.',
                    'specifications' => '<ul><li>لون أزرق باستيل</li><li>تصميم بشرائط</li><li>أسلوب كعب بلوك</li><li>إغلاق بحزام كاحل</li><li>ارتفاع الكعب 3 بوصات</li></ul>',
                    'details' => '<p>كعب بلوك أزرق باستيل جميل بتصميم شرائط أنيق. مثالي للحفلات والمواعيد والمناسبات الخاصة مع بناء كعب بلوك مريح.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-368843?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-391104?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-218580?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462637?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-412805?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-025133?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حذاء رجالي مسطح مفتوح الأصابع من الجلد الصناعي',
                    'description' => 'حذاء مسطح مفتوح الأصابع مريح مصنوع من الجلد الصناعي للارتداء الكاجوال.',
                    'specifications' => '<ul><li>خامة جلد صناعي</li><li>تصميم مفتوح الأصابع</li><li>نعل مسطح</li><li>أسلوب بدون أربطة</li><li>راحة كاجوال</li></ul>',
                    'details' => '<p>حذاء مسطح مفتوح الأصابع مريح للرجال مصنوع من الجلد الصناعي. مثالي لارتداء الصيف الكاجوال بتصميم سهل بدون أربطة وهيكل مفتوح قابل للتنفس.</p>',
                    'price' => 49.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-618065?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-003888?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-674442?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-345644?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-488447?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-998922?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حذاء شيلسي نسائي من الجلد الطبيعي',
                    'description' => 'حذاء شيلسي كلاسيكي مصنوع من الجلد الطبيعي مع جوانب مرنة.',
                    'specifications' => '<ul><li>هيكل من الجلد الطبيعي</li><li>جوانب مرنة</li><li>تصميم باللبس</li><li>كعب منخفض</li><li>ارتفاع الكاحل</li></ul>',
                    'details' => '<p>حذاء شيلسي خالد مصنوع من الجلد الطبيعي مع جوانب مرنة كلاسيكية. مثالي للمناسبات الكاجوال وشبه الرسمية بتصميم متعدد الاستخدامات.</p>',
                    'price' => 149.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']],
                        ['name' => 'اللون', 'options' => ['أسود', 'بني']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-184672?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-725951?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-096420?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-951041?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-664690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-740118?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'صنادل إصبع نسائية',
                    'description' => 'صنادل إصبع مريحة بتصميم الشريط الفاصل مثالية للشاطئ والارتداء الكاجوال.',
                    'specifications' => '<ul><li>تصميم شريط فاصل</li><li>نعل داخلي مبطن</li><li>نعل مانع للانزلاق</li><li>هيكل خفيف الوزن</li><li>أسلوب جاهز للشاطئ</li></ul>',
                    'details' => '<p>صنادل إصبع مريحة بتصميم الشريط الفاصل الكلاسيكي ونعل داخلي مبطن. مثالية لأيام الشاطئ وحفلات المسبح والأنشطة الصيفية الكاجوال.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']],
                        ['name' => 'اللون', 'options' => ['أصفر', 'أبيض', 'وردي']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-174353?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-578220?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-719772?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-329119?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-768105?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-521006?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الإكسسوارات' => [
                [
                    'name' => 'ساعة Tissot PRX رجالية',
                    'description' => 'ساعة Tissot PRX فاخرة صنعت في سويسرا بهيكل من الفولاذ المقاوم للصدأ وحركة دقيقة.',
                    'specifications' => '<ul><li>حركة كوارتز سويسرية</li><li>هيكل من الفولاذ المقاوم للصدأ</li><li>زجاج كريستال الياقوت</li><li>مقاومة للماء حتى 100 متر</li><li>سوار مدمج</li></ul>',
                    'details' => '<p>تجمع ساعة Tissot PRX الأيقونية بين الجماليات الرجعية والدقة السويسرية الحديثة. تتميز بتصميم سوار مدمج وخامات فاخرة لضبط وقت متطور.</p>',
                    'price' => 349.99,
                    'cover_image' => 'https://images.unsplash.com/photo-690326?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-502224?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-789997?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-326161?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461537?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-934467?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'نظارات IFLASH شمسية مثمّنة بعدسات مستقطبة',
                    'description' => 'نظارات شمسية مثمّنة أنيقة بعدسات مستقطبة وحماية من الأشعة فوق البنفسجية.',
                    'specifications' => '<ul><li>عدسات مستقطبة</li><li>حماية UV400</li><li>تصميم إطار مثمّن</li><li>هيكل خفيف الوزن</li><li>طبقة مضادة للوهج</li></ul>',
                    'details' => '<p>توفر نظارات IFLASH المثمّنة تصميمًا هندسيًا فريدًا مع عدسات مستقطبة فائقة لحماية مثالية للعين ووضوح بصري.</p>',
                    'price' => 79.99,
                    'sale_price' => 64.99,
                    'cover_image' => 'https://images.unsplash.com/photo-317280?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-702470?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-487171?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-207121?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-914256?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-160416?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حزام رجالي كاجوال أسود من قماش النايلون',
                    'description' => 'حزام متعدد الاستخدامات من قماش النايلون الأسود مثالي للارتداء الكاجوال والمسائي.',
                    'specifications' => '<ul><li>قماش نايلون متين</li><li>إبزيم معدني</li><li>طول قابل للتعديل</li><li>من الكاجوال إلى المسائي</li><li>خامة سهلة العناية</li></ul>',
                    'details' => '<p>حزام أنيق من قماش النايلون الأسود ينتقل بسلاسة من الارتداء الكاجوال النهاري إلى المناسبات المسائية. هيكل متين مع قصّة مريحة.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['32', '34', '36', '38', '40', '42', '44']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-090967?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-192999?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-626859?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-405336?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-494856?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-965662?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'محفظة جلدية مدمجة Storite',
                    'description' => 'محفظة جلدية طبيعية مدمجة مع فتحات بطاقات متعددة وحجرة للنقود.',
                    'specifications' => '<ul><li>هيكل من الجلد الطبيعي</li><li>فتحات بطاقات متعددة</li><li>حجرة للنقود</li><li>تصميم مدمج</li><li>تقنية حجب RFID</li></ul>',
                    'details' => '<p>تجمع محفظة Storite الجلدية المدمجة بين الوظائف والأناقة. تتميز بتقنية حجب RFID وحجرات منظمة في تصميم أنيق ومدمج.</p>',
                    'price' => 49.99,
                    'sale_price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-453359?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-643645?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-351030?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-446171?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-021657?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-317145?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قبعة كاجوال للنساء',
                    'description' => 'قبعة كاجوال أنيقة مصممة للنساء بمقاس قابل للتعديل وارتداء مريح.',
                    'specifications' => '<ul><li>قماش قطن مخلوط</li><li>حزام خلفي قابل للتعديل</li><li>تصميم بحافة منحنية</li><li>خامة قابلة للتنفس</li><li>مقاس واحد يناسب معظم النساء</li></ul>',
                    'details' => '<p>قبعة كاجوال عصرية مثالية للارتداء اليومي. تتميز بقماش قطن مخلوط مريح ومقاس قابل للتعديل للراحة والأناقة طوال اليوم.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-239052?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-384922?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-020852?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-790979?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-532667?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-284595?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'وشاح قطني للنساء',
                    'description' => 'وشاح قطني ناعم بأنماط أنيقة، مثالي لجميع الفصول.',
                    'specifications' => '<ul><li>خامة قطنية 100%</li><li>تصميم خفيف الوزن</li><li>أنماط أنيقة</li><li>تنسيق متعدد الاستخدامات</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>وشاح قطني جميل يتميز بأنماط أنيقة وملمس ناعم. مثالي لإضافة لمسة أناقة لأي زي مع توفير الراحة في جميع الفصول.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-535271?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-061055?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-040547?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-100939?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-842094?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548718?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قلادة فاخرة بشكل دمعة',
                    'description' => 'قلادة أنيقة بشكل دمعة بتصميم زخرفي معقد وسلسلة.',
                    'specifications' => '<ul><li>تصميم زخرفي بشكل دمعة</li><li>مطلي بالفضة الإسترليني</li><li>تفاصيل معقدة</li><li>سلسلة قابلة للتعديل</li><li>تشمل علبة هدية</li></ul>',
                    'details' => '<p>قلادة فاخرة بشكل دمعة تتميز بتصميم معقد ومطلي بالفضة الإسترليني. مثالية للمناسبات الخاصة والأناقة اليومية.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'طول السلسلة', 'options' => ['16 بوصة', '18 بوصة', '20 بوصة']],
                        ['name' => 'اللون', 'options' => ['فضي', 'مطلي بالذهب', 'ذهب وردي']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-929454?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-062391?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-787223?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665800?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-102743?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-530869?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حقيبة كتف بنقش الحروف البارزة',
                    'description' => 'حقيبة كتف أنيقة بتصميم نقش الحروف البارزة وحزام قابل للتعديل.',
                    'specifications' => '<ul><li>تصميم نقش الحروف البارزة</li><li>حزام كتف قابل للتعديل</li><li>أقسام متعددة</li><li>إغلاق بسحاب</li><li>حجم مدمج</li></ul>',
                    'details' => '<p>حقيبة كتف عصرية تتميز بتصميم نقش حروف أنيق. مثالية للاستخدام اليومي مع حجرات منظمة وحزام مريح قابل للتعديل.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'بني', 'أزرق سماوي']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-643812?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-792078?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-109374?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-145384?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558906?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-628939?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'ديكور الجدران' => [
                [
                    'name' => 'لوحة جدارية Astro ليلة النجوم',
                    'description' => 'لوحة جدارية جميلة بموضوع الليلة المرصعة بالنجوم مثالية لديكور المنزل الحديث.',
                    'specifications' => '<ul><li>طباعة كانفاس فاخرة</li><li>أحبار مقاومة للبهتان</li><li>جاهزة للتعليق</li><li>تصميم عصري</li><li>إطار عالي الجودة</li></ul>',
                    'details' => '<p>حوّل مساحتك مع هذه اللوحة الجدارية الرائعة Astro ليلة النجوم التي تتميز بمواضيع سماوية وتصميم فني عصري.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'الحجم', 'options' => ['12x16 بوصة', '16x20 بوصة', '20x24 بوصة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-481055?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-698814?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-496797?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-898289?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-776178?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-119800?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لوحة كانفاس كريشنا الإلهية',
                    'description' => 'لوحة كانفاس كريشنا روحانية بألوان نابضة وصور إلهية.',
                    'specifications' => '<ul><li>خامة الكانفاس</li><li>ألوان نابضة</li><li>أعمال فنية روحانية</li><li>إطار خشبي</li><li>محمية من الأشعة فوق البنفسجية</li></ul>',
                    'details' => '<p>لوحة كانفاس كريشنا الإلهية الجميلة التي تتميز بالفن الروحاني التقليدي بألوان نابضة وخامات عالية الجودة.</p>',
                    'price' => 129.99,
                    'sale_price' => 109.99,
                    'cover_image' => 'https://images.unsplash.com/photo-356324?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-459234?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-877515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-920296?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-551760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-861144?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'إطار صور معلّق FNP بنمط الأنمي',
                    'description' => 'إطار صور معلّق لطيف بنمط الأنمي مثالي لعرض الذكريات.',
                    'specifications' => '<ul><li>تصميم أنمي</li><li>أسلوب معلّق</li><li>فتحات صور متعددة</li><li>خامة متينة</li><li>سهل التعليق</li></ul>',
                    'details' => '<p>إطار صور معلّق FNP أنمي مرح لطيف بتصميمات جميلة مثالي لعرض ذكرياتك المفضلة بأناقة.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-194702?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-202261?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-203095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-403892?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871605?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-690188?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ساعة حائط Nautica عصرية',
                    'description' => 'ساعة حائط عصرية أنيقة مع عناصر تصميم بحرية.',
                    'specifications' => '<ul><li>تصميم عصري</li><li>موضوع بحري</li><li>حركة صامتة</li><li>سهلة القراءة</li><li>تعمل بالبطارية</li></ul>',
                    'details' => '<p>ساعة حائط Nautica عصرية أنيقة تجمع بين التصميم المعاصر والعناصر البحرية لإطلالة راقية.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-438988?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-519309?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-545700?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-138674?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-829984?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-622570?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مرآة Plantex بدون إطار',
                    'description' => 'مرآة عصرية بدون إطار مثالية للديكورات الداخلية الحديثة.',
                    'specifications' => '<ul><li>تصميم بدون إطار</li><li>زجاج عالي الجودة</li><li>تركيب سهل</li><li>أسلوب عصري</li><li>حواف مشطوفة</li></ul>',
                    'details' => '<p>مرآة Plantex الأنيقة بدون إطار بحواف مشطوفة وزجاج عالي الجودة، مثالية لخلق إحساس عصري وفسيح.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-548029?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-060154?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777932?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777567?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-686918?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-523032?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'رف عائم من خشب شيشام الصلب',
                    'description' => 'رف عائم فاخر من خشب الشيشام للتخزين والعرض الأنيق.',
                    'specifications' => '<ul><li>خشب شيشام صلب</li><li>تصميم عائم</li><li>أقواس مخفية</li><li>لمسة نهائية طبيعية</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>رف عائم جميل من خشب الشيشام الصلب بلمسة نهائية طبيعية وأقواس مخفية لمظهر نظيف وعصري.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-099391?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-659515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-399102?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-405584?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-167555?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-596637?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منظم معدني بخطافات للمدخل',
                    'description' => 'منظم معدني عملي بخطافات متعددة مصمم لتنظيم المدخل.',
                    'specifications' => '<ul><li>هيكل معدني</li><li>خطافات متعددة</li><li>تصميم للمدخل</li><li>مثبّت على الحائط</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>منظم معدني عملي بخطافات مثالي لتنظيم المدخل، يوفر تخزينًا مريحًا للمعاطف والحقائب والمفاتيح والإكسسوارات.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['برونزي', 'فضي', 'ذهبي']],
                        ['name' => 'الخطافات', 'options' => ['4 خطافات', '6 خطافات', '8 خطافات']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-515581?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-032638?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-706457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-771811?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-221665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-583897?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'تمثال ميرليون سنغافورة المعدني',
                    'description' => 'تمثال ميرليون سنغافورة المعدني المزخرف لديكور منزلي فريد.',
                    'specifications' => '<ul><li>هيكل معدني</li><li>تصميم ميرليون سنغافورة</li><li>قطعة ديكورية</li><li>لمسة عتيقة</li><li>قطعة قابلة للجمع</li></ul>',
                    'details' => '<p>تمثال ميرليون سنغافورة المعدني الفريد بتصميم مفصل وبتشطيب عتيق، مثالي لهواة الجمع وعشاق سنغافورة.</p>',
                    'price' => 199.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود', 'ذهبي']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-263517?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-257315?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-913184?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-200662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-789817?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-091745?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الإضاءة والمصابيح' => [
                [
                    'name' => 'مصباح طاولة Cumberland بظل بيج',
                    'description' => 'مصباح طاولة أنيق بظل قماشي بيج وتصميم كلاسيكي.',
                    'specifications' => '<ul><li>ظل قماشي بيج</li><li>تصميم كلاسيكي</li><li>قاعدة معدنية</li><li>مقبس لمبة E27</li><li>تجميع سهل</li></ul>',
                    'details' => '<p>مصباح طاولة Cumberland الجميل بظل بيج يوفر إضاءة دافئة ومحيطة مثالية للقراءة والاسترخاء.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-070207?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-778206?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-785881?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-268861?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548016?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-146847?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مصباح أرضي حامل ثلاثي بقاعدة معدنية',
                    'description' => 'مصباح أرضي حامل ثلاثي عصري بقاعدة معدنية قابلة للتعديل وتصميم أنيق.',
                    'specifications' => '<ul><li>قاعدة معدنية ثلاثية</li><li>ارتفاع قابل للتعديل</li><li>تصميم عصري</li><li>ظل قماشي</li><li>هيكل ثابت</li></ul>',
                    'details' => '<p>مصباح أرضي حامل ثلاثي معاصر بقاعدة معدنية يوفر ارتفاعًا قابلاً للتعديل وتصميمًا عصريًا لأي مساحة معيشة.</p>',
                    'price' => 149.99,
                    'sale_price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-451523?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-814398?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-920440?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-217758?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-117202?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-138396?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مصباح جدار ليلي ذهبي بظل زجاجي',
                    'description' => 'مصباح جدار ليلي أنيق بلمسة ذهبية وظل زجاجي.',
                    'specifications' => '<ul><li>لمسة ذهبية</li><li>ظل زجاجي</li><li>مثبّت على الحائط</li><li>تصميم ليلي</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>مصباح جدار ليلي متطور بلمسة ذهبية وظل زجاجي، مثالي لخلق إضاءة محيطة في غرف النوم.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-210243?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-363100?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-725457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-544661?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-953243?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-332966?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ثريا معلقة بمجموعة مصابيح',
                    'description' => 'ثريا مجموعة عصرية مع مصابيح معلقة متعددة لتأثير درامي.',
                    'specifications' => '<ul><li>تصميم مجموعة</li><li>معلقات متعددة</li><li>أسلوب عصري</li><li>ارتفاع قابل للتعديل</li><li>قطعة مميزة</li></ul>',
                    'details' => '<p>ثريا مجموعة مذهلة تضم مصابيح معلقة متعددة تخلق نقطة محورية درامية لغرف الطعام ومساحات المعيشة.</p>',
                    'price' => 299.99,
                    'sale_price' => 259.99,
                    'cover_image' => 'https://images.unsplash.com/photo-876940?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-935588?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-107593?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-012083?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-947246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-194768?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مصباح سقفي أبيض زجاجي ملاصق',
                    'description' => 'مصباح سقف ملاصق نظيف من الزجاج الأبيض للديكورات الداخلية الحديثة.',
                    'specifications' => '<ul><li>ظل زجاجي أبيض</li><li>تصميم ملاصق</li><li>أسلوب عصري</li><li>تركيب سهل</li><li>موفر للطاقة</li></ul>',
                    'details' => '<p>مصباح سقف ملاصق أنيق من الزجاج الأبيض يوفر إضاءة نظيفة ومتساوية مثالية للمنازل الحديثة والمساحات ذات الأسقف المنخفضة.</p>',
                    'price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-878487?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-204207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-621221?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-015313?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-758432?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-370516?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لمبة LED بقاعدة E27 بقوة 4 واط',
                    'description' => 'لمبة LED موفرة للطاقة بقوة 4 واط بقاعدة E27 للتجهيزات القياسية.',
                    'specifications' => '<ul><li>قوة 4 واط</li><li>قاعدة E27</li><li>تقنية LED</li><li>موفرة للطاقة</li><li>عمر افتراضي طويل</li></ul>',
                    'details' => '<p>لمبة LED عالية الجودة بقوة 4 واط بقاعدة E27 توفر كفاءة في الطاقة وعمرًا افتراضيًا طويلاً لجميع احتياجات الإضاءة.</p>',
                    'price' => 12.99,
                    'sale_price' => 9.99,
                    'cover_image' => 'https://images.unsplash.com/photo-691623?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-315800?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-739929?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-061101?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-679867?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-526412?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'أضواء زخرفية ذهبية Love Reaction',
                    'description' => 'أضواء زخرفية ذهبية رومانسية بتصميم مستوحى من الحب للمناسبات الخاصة.',
                    'specifications' => '<ul><li>لمسة ذهبية</li><li>تصميم بموضوع الحب</li><li>إضاءة زخرفية</li><li>ميزة مزدوجة</li><li>مناسبات خاصة</li></ul>',
                    'details' => '<p>أضواء زخرفية Love Reaction الجميلة بلمسة ذهبية، مثالية للأجواء الرومانسية والاحتفالات الخاصة.</p>',
                    'price' => 45.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['ذهبي', 'أسود', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-912422?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-290431?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-465620?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-358107?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-727205?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-177863?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مصباح ليلي بظل فينيسيا',
                    'description' => 'مصباح ليلي أنيق بأسلوب فينيسيا مع ظل زخرفي للاستخدام بجانب السرير.',
                    'specifications' => '<ul><li>تصميم بأسلوب فينيسيا</li><li>ظل زخرفي</li><li>وظيفة مصباح ليلي</li><li>إضاءة ناعمة</li><li>مناسب بجانب السرير</li></ul>',
                    'details' => '<p>مصباح ليلي ساحر بظل فينيسيا يوفر إضاءة ناعمة ولطيفة مثالية لغرف النوم وخلق أجواء مريحة.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أخضر', 'أزرق', 'بيج']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-773477?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-053400?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-371351?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-291748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-607314?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-242861?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'مفروشات المنزل' => [
                [
                    'name' => 'وسادة ناعمة من المايكروفايبر',
                    'description' => 'وسادة فائقة النعومة من المايكروفايبر بحشوة فاخرة لأقصى راحة.',
                    'specifications' => '<ul><li>قماش مايكروفايبر</li><li>حشوة فاخرة</li><li>ملمس فائق النعومة</li><li>قابلة للغسل في الغسالة</li><li>مضادة للحساسية</li></ul>',
                    'details' => '<p>وسادة فاخرة من المايكروفايبر الناعم مصممة للراحة القصوى بحشوة فاخرة وخصائص مضادة للحساسية.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-968318?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-708365?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-527236?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-882117?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-574795?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-165007?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'غطاء سرير قطني ناعم جدًا وقابل للتنفس',
                    'description' => 'غطاء سرير قطني فاخر ناعم جدًا وقابل للتنفس للراحة طوال العام.',
                    'specifications' => '<ul><li>خامة قطنية 100%</li><li>ملمس فائق النعومة</li><li>قماش قابل للتنفس</li><li>قابل للغسل في الغسالة</li><li>تصميم خفيف الوزن</li></ul>',
                    'details' => '<p>غطاء سرير قطني جميل يوفر نعومة وقابلية تنفس فائقة، مثالي للطبقات والراحة في أي موسم.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-624652?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-995022?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-930985?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333413?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-450635?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-523359?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ستائر شفافة أنيقة بلون سادة للنوافذ',
                    'description' => 'ستائر شفافة أنيقة بلون سادة توفر الخصوصية مع السماح بدخول الضوء الطبيعي.',
                    'specifications' => '<ul><li>قماش شبه شفاف</li><li>تصميم بلون سادة</li><li>تصفية الضوء</li><li>أسلوب جيب القضيب</li><li>قابلة للغسل في الغسالة</li></ul>',
                    'details' => '<p>ستائر شبه شفافة راقية بألوان سادة تصفّي الضوء بشكل جميل مع الحفاظ على الخصوصية والأناقة.</p>',
                    'price' => 49.99,
                    'variants' => [
                        ['name' => 'الطول', 'options' => ['84 بوصة', '96 بوصة', '108 بوصة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-280890?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-251040?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-764059?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-837468?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-568285?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-736390?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سجادة ممر عصرية فاخرة للمنزل',
                    'description' => 'سجادة ممر عصرية فاخرة بتصميم معاصر للممرات والمداخل.',
                    'specifications' => '<ul><li>تصميم عصري</li><li>جودة فاخرة</li><li>ظهر مانع للانزلاق</li><li>سهلة التنظيف</li><li>هيكل متين</li></ul>',
                    'details' => '<p>سجادة ممر عصرية فاخرة أنيقة تتميز بأنماط معاصرة، مثالية لإضافة الأناقة للممرات والمناطق عالية الحركة.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-778424?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-166947?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593937?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-821149?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646530?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-084161?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'غطاء سرير مبطن مقاس كينغ من القطن الخالص 100%',
                    'description' => 'غطاء سرير مبطن فاخر من القطن الخالص 100% بمقاس كينغ وتصميم بلون سادة.',
                    'specifications' => '<ul><li>قماش قطني 100%</li><li>مقاس كينغ</li><li>تصميم مبطن</li><li>لون سادة</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>غطاء سرير مبطن فاخر من القطن الخالص 100% بمقاس كينغ يتميز بألوان سادة وخياطة فاخرة للراحة والأناقة.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-709629?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-720341?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-611606?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-838431?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-927641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-060121?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سجادات فائقة النعومة مانعة للانزلاق وشديدة الامتصاص',
                    'description' => 'سجادات فائقة النعومة مانعة للانزلاق بخصائص امتصاص فائقة للحمام والمطبخ.',
                    'specifications' => '<ul><li>ملمس فائق النعومة</li><li>ظهر مانع للانزلاق</li><li>شديدة الامتصاص</li><li>سريعة الجفاف</li><li>قابلة للغسل في الغسالة</li></ul>',
                    'details' => '<p>سجادات فاخرة فائقة النعومة بظهر مانع للانزلاق وخصائص امتصاص فائقة، مثالية للحمامات ومناطق المطبخ.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-449915?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-826368?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-115017?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-970999?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-127621?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-901735?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مفرش طاولة مركزية بطباعة الورد',
                    'description' => 'مفرش طاولة مركزية جميل بطباعة الورد لديكور طعام ومعيشة أنيق.',
                    'specifications' => '<ul><li>تصميم بطباعة الورد</li><li>قماش فاخر</li><li>حجم الطاولة المركزية</li><li>سهل التنظيف</li><li>حدود زخرفية</li></ul>',
                    'details' => '<p>مفرش طاولة مركزية أنيق بطباعة الورد يتميز بأنماط زهرية جميلة وحدود زخرفية لتنسيق طاولة متطور.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-417378?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-621771?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-787105?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-236265?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-407923?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-780186?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'غطاء أريكة قماشي مخمل مع تفاصيل دانتيل',
                    'description' => 'غطاء أريكة أنيق من قماش الكوردوروي مع تفاصيل دانتيل لحماية الأثاث والديكور.',
                    'specifications' => '<ul><li>قماش كوردوروي</li><li>تفاصيل دانتيل</li><li>حماية الأثاث</li><li>تركيب سهل</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>غطاء أريكة فاخر من الكوردوروي مع تفاصيل دانتيل أنيقة يحمي الأثاث مع إضافة لمسة راقية لمساحة معيشتك.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أزرق', 'أخضر', 'وردي']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-109788?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-639805?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-311309?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-736905?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-091443?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-393295?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'اللمسات الديكورية' => [
                [
                    'name' => 'مزهرية سيراميك مصنوعة يدويًا بلون أزرق سماوي',
                    'description' => 'مزهرية سيراميك جميلة بلون أزرق سماوي بلمسة فنية نهائية وتصميم أنيق.',
                    'specifications' => '<ul><li>سيراميك مطلي يدويًا</li><li>لون أزرق سماوي</li><li>لمسة فنية</li><li>تصميم أنيق</li><li>داخل مقاوم للماء</li></ul>',
                    'details' => '<p>مزهرية سيراميك رائعة بلون أزرق سماوي مصنوعة يدويًا تتميز بحرفية فنية وتصميم أنيق، مثالية للزهور الطازجة أو المجففة.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-010478?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-284100?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-673251?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-172306?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-089143?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404385?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قطعة سيراميك ديكورية',
                    'description' => 'قطعة سيراميك ديكورية أنيقة بتفاصيل معقدة لديكور المنزل.',
                    'specifications' => '<ul><li>سيراميك فاخر</li><li>تفاصيل معقدة</li><li>تصميم ديكوري</li><li>جودة مصنوعة يدويًا</li><li>لمسة متينة</li></ul>',
                    'details' => '<p>قطعة سيراميك ديكورية جميلة تتميز بحرفية معقدة وتصميم أنيق، مثالية لتحسين أي مساحة معيشة.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-997730?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-812207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-848935?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-734588?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-300683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-415749?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'تمثال فتاة راتنجي أنيق مع تفاحة',
                    'description' => 'تمثال راتنجي ساحر لفتاة مع تفاحة، مثالي لديكور المنزل والهدايا.',
                    'specifications' => '<ul><li>راتنج عالي الجودة</li><li>تصميم فتاة مع تفاحة</li><li>لمسة أنيقة</li><li>حرفية مفصّلة</li><li>قطعة هدية مثالية</li></ul>',
                    'details' => '<p>تمثال راتنجي أنيق وساحر لفتاة مع تفاحة، يعرض حرفية مفصّلة ومثالي لديكور المنزل أو كهدية مدروسة.</p>',
                    'price' => 45.99,
                    'cover_image' => 'https://images.unsplash.com/photo-595089?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-893765?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-235973?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-800350?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-530092?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-616354?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شمعة عمودية Claire بدون عطر من هوم سنتر',
                    'description' => 'شمعة عمودية فاخرة بدون عطر من مجموعة Claire في هوم سنتر لأجواء أنيقة.',
                    'specifications' => '<ul><li>تركيبة بدون عطر</li><li>تصميم عمودي</li><li>وقت احتراق طويل</li><li>شمع فاخر</li><li>مظهر أنيق</li></ul>',
                    'details' => '<p>شمعة عمودية فاخرة بدون عطر من هوم سنتر Claire توفر وقت احتراق طويل وأجواء أنيقة بدون روائح طاغية.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-054969?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-469396?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-051731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-435735?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303352?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-938503?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حامل شموع ديكوري فاخر',
                    'description' => 'حامل شموع ديكوري مزخرف بتصميم فاخر لعرض أنيق للشموع.',
                    'specifications' => '<ul><li>تصميم ديكوري فاخر</li><li>خامات فاخرة</li><li>قاعدة ثابتة</li><li>لمسة أنيقة</li><li>مناسب لجميع الشموع</li></ul>',
                    'details' => '<p>حامل شموع ديكوري جميل وفاخر يتميز بتصميم مزخرف وخامات فاخرة، مثالي لخلق عروض شموع أنيقة.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-652064?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-859680?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-652918?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-832801?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-912903?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129466?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'صينية خشبية مربعة بتطعيمات',
                    'description' => 'صينية خشبية مربعة مصنوعة يدويًا بتطعيمات جميلة وحرفية تقليدية.',
                    'specifications' => '<ul><li>هيكل خشب صلب</li><li>تصميم بتطعيمات</li><li>شكل مربع</li><li>جودة مصنوعة يدويًا</li><li>لمسة ناعمة</li></ul>',
                    'details' => '<p>صينية خشبية مربعة فاخرة مصنوعة يدويًا بتطعيمات جميلة، تعرض حرفية تقليدية ومثالية للتقديم أو الديكور.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-529575?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-646477?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-048234?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-536378?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-181322?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-065194?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'وعاء سيراميك ديكوري ذهبي ملكي',
                    'description' => 'وعاء سيراميك ديكوري فاخر بلون ذهبي ملكي بتصميم أنيق ولمسة نهائية فاخرة.',
                    'specifications' => '<ul><li>سيراميك فاخر</li><li>لمسة ذهبية ملكية</li><li>تصميم ديكوري</li><li>مظهر أنيق</li><li>جودة مصنوعة يدويًا</li></ul>',
                    'details' => '<p>وعاء سيراميك ديكوري فاخر بلون ذهبي ملكي يتميز بلمسة نهائية فاخرة وتصميم أنيق، مثالي لديكور المنزل المتطور.</p>',
                    'price' => 129.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'ذهبي', 'وردي']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-111826?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-920049?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-847120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-286868?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-197372?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-089903?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منحوتات حديقة عصرية للديكور الخارجي',
                    'description' => 'منحوتات عصرية حديثة مصممة لديكور الحديقة والمناطق الخارجية.',
                    'specifications' => '<ul><li>تصميم عصري</li><li>مقاومة للطقس</li><li>مناسبة للحديقة</li><li>أسلوب معاصر</li><li>خامات متينة</li></ul>',
                    'details' => '<p>منحوتات عصرية لافتة مثالية للحديقة والمساحات الخارجية، بتصميم معاصر وخامات مقاومة للطقس لجمال يدوم.</p>',
                    'price' => 199.99,
                    'sale_price' => 179.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أسود', 'ذهبي', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-082351?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-217688?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-797270?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-155561?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665409?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-131637?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'التخزين والتنظيم' => [
                [
                    'name' => 'صناديق تخزين Homestrap',
                    'description' => 'صناديق تخزين متعددة الاستخدامات من Homestrap لتنظيم الأغراض المنزلية بكفاءة.',
                    'specifications' => '<ul><li>هيكل متين</li><li>تصميم قابل للتكديس</li><li>غطاء سهل الوصول</li><li>مقاسات متعددة</li><li>موفر للمساحة</li></ul>',
                    'details' => '<p>صناديق تخزين Homestrap عملية مصممة للتنظيم الفعال بتصميم قابل للتكديس وهيكل متين للاستخدام طويل الأمد.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-760084?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-596324?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-724010?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-326681?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-366924?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-814243?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'صناديق تخزين وأدراج',
                    'description' => 'حل تخزين كامل بالصناديق والأدراج لتنظيم شامل.',
                    'specifications' => '<ul><li>نظام صندوق ودرج مدمج</li><li>تصميم وحداتي</li><li>تجميع سهل</li><li>أدراج منزلقة بسلاسة</li><li>تخزين متعدد الاستخدامات</li></ul>',
                    'details' => '<p>حل تخزين شامل يجمع بين الصناديق والأدراج في نظام وحداتي لأقصى مرونة في التنظيم واستغلال المساحة.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-527158?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-735174?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-501837?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-061175?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-424109?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-717562?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'رف تخزين معدني',
                    'description' => 'رف تخزين معدني ثقيل الطراز بطبقات متعددة لتنظيم بقوة صناعية.',
                    'specifications' => '<ul><li>هيكل معدني ثقيل</li><li>طبقات متعددة</li><li>أرفف قابلة للتعديل</li><li>سعة وزن عالية</li><li>تجميع سهل</li></ul>',
                    'details' => '<p>رف تخزين معدني قوي بهيكل ثقيل وأرفف قابلة للتعديل، مثالي للمرآب أو المستودع أو احتياجات التخزين الثقيلة.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-051275?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-433792?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-267961?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-159510?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-245704?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220479?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منظم أدراج Flyngo قابل للطي',
                    'description' => 'منظم أدراج مبتكر قابل للطي من Flyngo لحلول تخزين مرنة.',
                    'specifications' => '<ul><li>تصميم قابل للطي</li><li>تنظيم الأدراج</li><li>حجرات مرنة</li><li>موفر للمساحة</li><li>سهل التخزين عند عدم الاستخدام</li></ul>',
                    'details' => '<p>منظم أدراج ذكي من Flyngo قابل للطي يوفر حجرات مرنة وتصميمًا موفرًا للمساحة يُطوى بشكل مسطح عند الحاجة.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-863145?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-173113?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-550086?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-364657?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-034979?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-165916?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خطافات تخزين مرآب ثقيلة للجدران',
                    'description' => 'خطافات تخزين مثبتة على الحائط بقوة صناعية مصممة لتنظيم المرآب الثقيل.',
                    'specifications' => '<ul><li>هيكل ثقيل الطراز</li><li>تصميم مثبت على الحائط</li><li>سعة وزن عالية</li><li>مناسب للمرآب</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>خطافات تخزين مرآب احترافية ثقيلة مصممة للتثبيت على الحائط بسعة وزن عالية للأدوات والمعدات والأغراض الثقيلة.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-145545?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-204098?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005188?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-744956?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-492066?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-104100?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'رف تخزين متعدد الاستخدامات بأربع طبقات',
                    'description' => 'رف تخزين متعدد الاستخدامات بأربع طبقات مناسب لأغراض متعددة وغرف مختلفة.',
                    'specifications' => '<ul><li>تصميم بأربع طبقات</li><li>استخدامات متعددة</li><li>هيكل متين</li><li>تجميع سهل</li><li>وضع مرن</li></ul>',
                    'details' => '<p>رف تخزين عملي متعدد الاستخدامات بأربع طبقات يوفر حلول تخزين مرنة للمطبخ أو الحمام أو المكتب أو أي غرفة تحتاج تنظيمًا.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-952485?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-357893?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-746971?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315112?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247628?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126010?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'طقم 3 صواني متينة',
                    'description' => 'طقم من 3 صواني متينة لتنظيم وتخزين الأغراض المختلفة بكفاءة.',
                    'specifications' => '<ul><li>طقم من 3 صواني</li><li>هيكل متين</li><li>تصميم قابل للتكديس</li><li>سهل التنظيف</li><li>استخدامات متعددة</li></ul>',
                    'details' => '<p>طقم عملي من 3 صواني متينة بتصميم قابل للتكديس، مثالي لتنظيم اللوازم المكتبية أو مواد الحرف أو الأغراض المنزلية.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['بني', 'أبيض', 'أسود']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-036040?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-162101?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-676153?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005258?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-376873?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خزائن Evaro بلمسة بنية ونجيه',
                    'description' => 'خزائن تخزين Evaro فاخرة بلمسة بنية ونجيه أنيقة لتنظيم متطور.',
                    'specifications' => '<ul><li>لمسة بنية ونجيه</li><li>تصميم خزانة فاخر</li><li>حجرات متعددة</li><li>مظهر أنيق</li><li>هيكل متين</li></ul>',
                    'details' => '<p>خزائن Evaro متطورة بلمسة بنية ونجيه أنيقة وهيكل فاخر، مثالية للتخزين الأنيق في أي منزل حديث.</p>',
                    'price' => 299.99,
                    'sale_price' => 269.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['بني', 'أخضر', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-031298?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-762907?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-328995?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-139739?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-801327?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-732281?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الكيك' => [
                [
                    'name' => 'كيكة عيد ميلاد باستيل بالزهور',
                    'description' => 'كيكة عيد ميلاد جميلة بألوان باستيل مزينة بتصميمات زهرية رقيقة.',
                    'specifications' => '<ul><li>زخرفة زهرية باستيل</li><li>طبقات إسفنجية بالفانيليا</li><li>كريمة الزبدة</li><li>لمسات زهور طازجة</li><li>إمكانية إضافة رسالة مخصصة</li></ul>',
                    'details' => '<p>كيكة عيد ميلاد أنيقة بألوان باستيل وزخارف زهرية رقيقة، مثالية للاحتفال بأعياد الميلاد الخاصة بأناقة.</p>',
                    'price' => 49.99,
                    'variants' => [
                        ['name' => 'الوزن', 'options' => ['1 كجم', '1.5 كجم', '2 كجم']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-729208?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-076197?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-889430?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-609135?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-280457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-933736?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كيكة زفاف بالفراولة',
                    'description' => 'كيكة زفاف أنيقة متعددة الطبقات مع فراولة طازجة وكريمة.',
                    'specifications' => '<ul><li>تصميم متعدد الطبقات</li><li>فراولة طازجة</li><li>طبقات كريمة مخفوقة</li><li>زخرفة زفاف</li><li>تكفي 50-60 شخصًا</li></ul>',
                    'details' => '<p>كيكة زفاف رائعة بالفراولة متعددة الطبقات مع فراولة طازجة وزخارف أنيقة مثالية ليوم زفافك الخاص.</p>',
                    'price' => 299.99,
                    'sale_price' => 279.99,
                    'cover_image' => 'https://images.unsplash.com/photo-048810?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-724659?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026487?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-557951?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-054046?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-617896?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كيكة شوكولاتة فاخرة لذيذة',
                    'description' => 'كيكة شوكولاتة فاخرة غنية وفاخرة بطبقات شوكولاتة متعددة.',
                    'specifications' => '<ul><li>شوكولاتة فاخرة</li><li>طبقات متعددة</li><li>جاناش شوكولاتة غني</li><li>إسفنجية رطبة</li><li>رقائق شوكولاتة</li></ul>',
                    'details' => '<p>كيكة شوكولاتة فاخرة لذيذة تتميز بطبقات شوكولاتة غنية وجاناش ناعم وكاكاو فاخر لتجربة شوكولاتة مثالية.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-505017?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-201580?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-261119?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-769359?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-015520?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كيكة قاتو فواكه مشكلة نصف كجم من Just Bake',
                    'description' => 'كيكة قاتو لذيذة بالفواكه المشكلة مع فواكه موسمية وطبقات كريمة.',
                    'specifications' => '<ul><li>فواكه موسمية مشكلة</li><li>طبقات كريمة</li><li>حجم نصف كجم</li><li>طبقة فواكه طازجة</li><li>قاعدة إسفنجية خفيفة</li></ul>',
                    'details' => '<p>كيكة قاتو طازجة بالفواكه المشكلة من Just Bake تتميز بفواكه موسمية وطبقات كريمة خفيفة وقاعدة إسفنجية ناعمة بحجم نصف كجم مريح.</p>',
                    'price' => 24.99,
                    'sale_price' => 21.99,
                    'cover_image' => 'https://images.unsplash.com/photo-731730?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-324894?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-358302?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593935?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-196744?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-846664?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كيكة Ivory Rose أناقة',
                    'description' => 'كيكة متطورة بلون عاجي مزينة بتصميمات ورد أنيقة.',
                    'specifications' => '<ul><li>موضوع اللون العاجي</li><li>زخارف ورد</li><li>تصميم أنيق</li><li>طبقة زينة فاخرة</li><li>مناسبات خاصة</li></ul>',
                    'details' => '<p>كيكة Ivory Rose للأناقة المتطورة تتميز بألوان عاجية جميلة وزخارف ورد رقيقة، مثالية للاحتفالات الأنيقة والمناسبات الخاصة.</p>',
                    'price' => 69.99,
                    'variants' => [
                        ['name' => 'الوزن', 'options' => ['1 كجم', '1.5 كجم', '2 كجم']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-068348?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-365291?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-737452?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-979020?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-723549?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-204620?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كيكة FNP مصممة بدون بيض نصف كجم',
                    'description' => 'كيكة مصممة بدون بيض من FNP بزخارف فنية ومكونات فاخرة.',
                    'specifications' => '<ul><li>وصفة بدون بيض</li><li>زخارف مصممة</li><li>حجم نصف كجم</li><li>مكونات فاخرة</li><li>تصميم فني</li></ul>',
                    'details' => '<p>كيكة FNP الجميلة المصممة بدون بيض تتميز بزخارف فنية ووصفة فاخرة بدون بيض، مثالية لمن يفضلون الحلويات الخالية من البيض.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-173859?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-216226?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-802545?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-943422?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-505268?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-714425?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'علبة 6 كب كيك قابلة للطي',
                    'description' => 'طقم من 6 كب كيك مشكلة في علبة هدايا أنيقة قابلة للطي.',
                    'specifications' => '<ul><li>6 كب كيك مشكلة</li><li>علبة هدايا قابلة للطي</li><li>نكهات متنوعة</li><li>زخرفة فردية</li><li>مثالية للهدايا</li></ul>',
                    'details' => '<p>طقم لذيذ من 6 كب كيك بنكهات وزخارف متنوعة، معروضة بشكل جميل في علبة أنيقة قابلة للطي مثالية للهدايا والحفلات.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-895272?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-128461?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-586426?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559318?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-973075?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-039371?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كيكة اللؤلؤ والورد 7.0 كجم',
                    'description' => 'كيكة كبيرة بموضوع اللؤلؤ والورد بوزن 7.0 كجم، مثالية للاحتفالات الكبيرة.',
                    'specifications' => '<ul><li>وزن 7.0 كجم</li><li>زخارف لؤلؤ</li><li>تصميم بموضوع الورد</li><li>حجم للاحتفالات الكبيرة</li><li>تكفي 70-80 شخصًا</li></ul>',
                    'details' => '<p>كيكة اللؤلؤ والورد الرائعة بوزن 7.0 كجم، تتميز بزخارف لؤلؤية أنيقة وموضوع ورد، مثالية للاحتفالات الكبرى والتجمعات الكبيرة.</p>',
                    'price' => 399.99,
                    'sale_price' => 369.99,
                    'cover_image' => 'https://images.unsplash.com/photo-147693?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-448059?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-856724?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-747615?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-529637?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-116512?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'المعجنات' => [
                [
                    'name' => 'معجنات الشوكولاتة الغنية',
                    'description' => 'معجنات شوكولاتة فاخرة بالكاكاو الغني وحشوة شوكولاتة ناعمة.',
                    'specifications' => '<ul><li>قاعدة كاكاو غنية</li><li>حشوة شوكولاتة ناعمة</li><li>شوكولاتة فاخرة</li><li>قوام رطب</li><li>حصص فردية</li></ul>',
                    'details' => '<p>معجنات شوكولاتة غنية فاخرة مصنوعة من كاكاو ممتاز ومحشوة بكريمة شوكولاتة ناعمة لتجربة شوكولاتة مثالية.</p>',
                    'price' => 18.99,
                    'variants' => [
                        ['name' => 'الكمية', 'options' => ['4 قطع', '6 قطع', '8 قطع']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-188418?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-458759?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-506641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-017966?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-618742?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129775?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معجنات الفواكه الطازجة المغطاة',
                    'description' => 'معجنات خفيفة مغطاة بالفواكه الموسمية الطازجة والكريمة.',
                    'specifications' => '<ul><li>فواكه موسمية طازجة</li><li>قاعدة معجنات خفيفة</li><li>طبقة كريمة</li><li>عرض ملون</li><li>نكهات طبيعية</li></ul>',
                    'details' => '<p>معجنات فواكه طازجة جميلة تتميز بفواكه موسمية على قاعدة معجنات خفيفة مع طبقة كريمة لتقديم منعش وملون.</p>',
                    'price' => 16.99,
                    'sale_price' => 14.99,
                    'cover_image' => 'https://images.unsplash.com/photo-586268?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-040996?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-380721?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-271184?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-350728?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-533662?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معجنات الكريمة الكلاسيكية بالكريمة المخفوقة الناعمة',
                    'description' => 'معجنات كريمة تقليدية محشوة بكريمة مخفوقة ناعمة وحريرية.',
                    'specifications' => '<ul><li>قشرة معجنات تقليدية</li><li>كريمة مخفوقة حريرية</li><li>وصفة كلاسيكية</li><li>خفيفة وهوائية</li><li>قوام مثالي</li></ul>',
                    'details' => '<p>معجنات كريمة كلاسيكية مصنوعة بطرق تقليدية ومحشوة بكريمة مخفوقة ناعمة وحريرية لتقديم خالدة وأنيقة.</p>',
                    'price' => 15.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['عادي', 'كبير']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-535487?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-405370?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-347792?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-158263?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709658?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-173133?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شرائح تشيز كيك كريمية فاخرة',
                    'description' => 'شرائح تشيز كيك فاخرة بجبنة كريمية غنية وقاعدة بسكويت.',
                    'specifications' => '<ul><li>جبنة كريمية فاخرة</li><li>قاعدة بسكويت</li><li>غنية وكريمية</li><li>شرائح فردية</li><li>بنمط نيويورك</li></ul>',
                    'details' => '<p>شرائح تشيز كيك كريمية فاخرة مصنوعة من أفضل جبنة كريمية وقاعدة بسكويت، بنكهة غنية على نمط نيويورك.</p>',
                    'price' => 22.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-200309?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-387460?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-751645?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-356448?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-057615?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-860921?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معجنات الموس الخفيفة والهوائية',
                    'description' => 'معجنات موس رقيقة بقوام خفيف وهوائي ولمسة نهائية ناعمة.',
                    'specifications' => '<ul><li>قوام موس خفيف</li><li>اتساق هوائي</li><li>لمسة نهائية ناعمة</li><li>نكهة رقيقة</li><li>عرض أنيق</li></ul>',
                    'details' => '<p>معجنات موس رائعة خفيفة وهوائية بقوام رقيق ولمسة ناعمة، مثالية لمن يقدرون الحلويات الراقية.</p>',
                    'price' => 20.99,
                    'cover_image' => 'https://images.unsplash.com/photo-142076?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-731213?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-442971?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593558?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-432684?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-401492?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معجنات مصغرة مشكلة بحصص صغيرة',
                    'description' => 'علبة متنوعة من المعجنات المصغرة بحصص صغيرة بنكهات مختلفة.',
                    'specifications' => '<ul><li>حصص صغيرة بحجم القضمة</li><li>نكهات مشكلة</li><li>معجنات مصغرة</li><li>علبة متنوعة</li><li>مثالية للمشاركة</li></ul>',
                    'details' => '<p>معجنات مصغرة مشكلة لذيذة بحصص صغيرة تتميز بنكهات وأنماط متنوعة، مثالية للحفلات والمشاركة.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-155595?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-794890?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-095470?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-491212?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-530445?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-446329?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معجنات طبقات أنيقة بكريمة متعددة',
                    'description' => 'معجنات طبقات متطورة بطبقات كريمة متعددة وتصميم أنيق.',
                    'specifications' => '<ul><li>طبقات كريمة متعددة</li><li>تصميم أنيق</li><li>عرض متطور</li><li>نكهات معقدة</li><li>مكونات فاخرة</li></ul>',
                    'details' => '<p>معجنات طبقات أنيقة متطورة تتميز بطبقات كريمة متعددة ونكهات معقدة بمكونات فاخرة وتقديم جميل.</p>',
                    'price' => 28.99,
                    'sale_price' => 25.99,
                    'cover_image' => 'https://images.unsplash.com/photo-643855?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-522453?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-092448?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-008546?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-189563?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-730980?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معجنات خاصة مميزة بتصميم فاخر',
                    'description' => 'معجنات حصرية مميزة بتصميم فاخر وصناعة يدوية رفيعة.',
                    'specifications' => '<ul><li>وصفة مميزة</li><li>تصميم فاخر</li><li>صناعة رفيعة</li><li>إبداع حصري</li><li>عرض فني</li></ul>',
                    'details' => '<p>معجنات حصرية مميزة بتصميم فاخر وصناعة رفيعة، تمثل قمة الفن في صناعة المعجنات.</p>',
                    'price' => 35.99,
                    'sale_price' => 32.99,
                    'cover_image' => 'https://images.unsplash.com/photo-210824?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-742535?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-875753?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-286338?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-657543?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-671762?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الخبز والأرغفة' => [
                [
                    'name' => 'خبز أبيض فاخر طازج مقطع شرائح',
                    'description' => 'خبز أبيض بجودة فاخرة بقوام ناعم وطعم طازج، مقطع شرائح للراحة.',
                    'specifications' => '<ul><li>دقيق أبيض فاخر</li><li>قوام ناعم</li><li>مقطع شرائح مسبقًا</li><li>خبز طازج يوميًا</li><li>مثالي للساندويتشات</li></ul>',
                    'details' => '<p>خبز أبيض فاخر مخبوز طازجًا بقوام ناعم استثنائي وطعم لذيذ، مقطع شرائح مسبقًا لاحتياجاتك اليومية.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-180379?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-879399?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-826098?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-624813?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-748944?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-202560?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خبز أسمر بفوائد القمح',
                    'description' => 'خبز أسمر مغذي مدعّم بالفوائد الطبيعية للقمح لحياة صحية.',
                    'specifications' => '<ul><li>مدعّم بالقمح</li><li>فوائد طبيعية</li><li>نسبة ألياف عالية</li><li>مكونات مغذية</li><li>اختيار صحي</li></ul>',
                    'details' => '<p>خبز أسمر صحي غني بالفوائد الطبيعية للقمح، يوفر العناصر الغذائية الأساسية والألياف لنمط حياة صحي.</p>',
                    'price' => 5.49,
                    'variants' => [
                        ['name' => 'نوع الشرائح', 'options' => ['شريحة عادية', 'شريحة سميكة']],
                        ['name' => 'الشرائح', 'options' => ['1', '2', '3']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-691053?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-822312?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-395895?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-916977?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-144751?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-033679?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خبز متعدد الحبوب بدون ميدا من Factory',
                    'description' => 'خبز متعدد الحبوب صحي مصنوع بدون ميدا، غني بالحبوب والبذور المتعددة.',
                    'specifications' => '<ul><li>صيغة خالية من الميدا</li><li>مزيج حبوب متعددة</li><li>غني بالبذور</li><li>بديل صحي</li><li>مكونات طبيعية</li></ul>',
                    'details' => '<p>خبز متعدد الحبوب مبتكر مصنوع بدون ميدا، يتميز بمزيج من الحبوب والبذور الصحية لأقصى تغذية وطعم.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-309329?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-699453?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-730832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-399928?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-351278?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573189?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خبز الثوم الرائع',
                    'description' => 'خبز ثوم عطري بنكهة ثوم غنية وأعشاب، مثالي كطبق جانبي أو وجبة خفيفة.',
                    'specifications' => '<ul><li>نكهة ثوم غنية</li><li>توابل أعشاب</li><li>طعم عطري</li><li>جاهز للتقديم</li><li>طبق جانبي مثالي</li></ul>',
                    'details' => '<p>خبز ثوم لذيذ وعطري منقوع بنكهة الثوم الغنية والأعشاب، مما يجعله المرافق المثالي لأي وجبة.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-912968?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-185056?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-385981?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-144760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-456260?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-076247?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خبز الصودا الكلاسيكي بدون ميدا من Factory',
                    'description' => 'خبز صودا تقليدي مصنوع بدون ميدا، يتميز بنكهة حمضية كلاسيكية وقوام مميز.',
                    'specifications' => '<ul><li>وصفة خالية من الميدا</li><li>صودا كلاسيكي</li><li>نكهة حمضية</li><li>تخمير تقليدي</li><li>جودة حرفية</li></ul>',
                    'details' => '<p>خبز صودا كلاسيكي مصنوع بدون ميدا بطرق تخمير تقليدية، يقدم نكهة حمضية أصيلة وقوامًا مثاليًا.</p>',
                    'price' => 8.99,
                    'sale_price' => 7.99,
                    'variants' => [
                        ['name' => 'القطع', 'options' => ['1', '2', '3']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-942190?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-337926?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-688789?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249581?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-554942?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-872838?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خبز فوكاتشيا إيطالي مسطح مخبوز بالفرن',
                    'description' => 'فوكاتشيا إيطالية أصيلة مسطحة، مخبوزة في الفرن مع الأعشاب وزيت الزيتون.',
                    'specifications' => '<ul><li>وصفة إيطالية أصيلة</li><li>خبز مثالي في الفرن</li><li>منقوع بالأعشاب</li><li>متبل بزيت الزيتون</li><li>نمط الخبز المسطح</li></ul>',
                    'details' => '<p>فوكاتشيا إيطالية تقليدية مسطحة مخبوزة بإتقان في الفرن، منقوعة بالأعشاب العطرية ومتبلة بزيت الزيتون الفاخر.</p>',
                    'price' => 9.99,
                    'variants' => [
                        ['name' => 'الإضافات', 'options' => ['أعشاب كلاسيكية', 'إكليل الجبل', 'طماطم وريحان', 'زيتون']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-309552?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-416964?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-736634?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-079914?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-561655?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-250650?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لفات عشاء ناعمة مخبوزة طازجة',
                    'description' => 'لفات عشاء ناعمة وهشة، مخبوزة طازجة يوميًا لمرافقة الوجبات بشكل مثالي.',
                    'specifications' => '<ul><li>ناعمة وهشة</li><li>خبز طازج يوميًا</li><li>حجم عشاء مثالي</li><li>لمسة بنية ذهبية</li><li>علبة من 6 لفات</li></ul>',
                    'details' => '<p>لفات عشاء ناعمة وهشة تمامًا مخبوزة طازجة يوميًا، تتميز بلمسة بنية ذهبية وحجم مثالي لأي مناسبة طعام.</p>',
                    'price' => 5.99,
                    'variants' => [
                        ['name' => 'حجم العبوة', 'options' => ['6 لفات', '12 لفة', '18 لفة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-138547?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-104870?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-290449?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-749241?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-956692?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خبز برجر فاخر ناعم بقضمة سلسة',
                    'description' => 'خبز برجر بجودة فاخرة بقوام ناعم استثنائي وتجربة قضمة سلسة.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>نعومة استثنائية</li><li>قوام قضمة سلس</li><li>حجم برجر مثالي</li><li>علبة من 4 أرغفة</li></ul>',
                    'details' => '<p>خبز برجر ناعم فاخر مصمم لتجربة برجر مثالية، يتميز بقوام قضمة سلس وحجم مثالي للبرجر الفاخر.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-031062?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-167096?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-623240?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-603334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-455762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-790536?w=800&h=800&fit=crop&crop=center'
                ],
            ],
            'البسكويت والكوكيز' => [
                [
                    'name' => 'كوكيز الشوكولاتة المزدوجة',
                    'description' => 'كوكيز شوكولاتة مزدوجة غنية بالكاكاو الفاخر وقطع الشوكولاتة.',
                    'specifications' => '<ul><li>وصفة شوكولاتة مزدوجة</li><li>قاعدة كاكاو فاخرة</li><li>قطع شوكولاتة</li><li>غني وفاخر</li><li>علبة من 12 كوكيز</li></ul>',
                    'details' => '<p>كوكيز شوكولاتة مزدوجة فاخرة مصنوعة من كاكاو ممتاز ومحملة بقطع الشوكولاتة لتجربة شوكولاتة مثالية.</p>',
                    'price' => 18.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['عادي', 'كبير', 'علبة صغيرة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-248725?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-361753?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-273905?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-732877?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-730203?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-191448?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كوكيز الزبدة الذهبية الكلاسيكية',
                    'description' => 'كوكيز زبدة ذهبية تقليدية بنكهة زبدة غنية وقوام مقرمش.',
                    'specifications' => '<ul><li>وصفة زبدة كلاسيكية</li><li>لون ذهبي</li><li>نكهة زبدة غنية</li><li>قوام مقرمش</li><li>خبز تقليدي</li></ul>',
                    'details' => '<p>كوكيز زبدة ذهبية كلاسيكي مصنوع بوصفة تقليدية بنكهة زبدة غنية وقوام مقرمش مثالي لمتعة خالدة.</p>',
                    'price' => 14.99,
                    'variants' => [
                        ['name' => 'حجم العبوة', 'options' => ['8 قطع', '12 قطعة', '16 قطعة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-944923?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-505436?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-205626?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-056773?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-587238?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-480645?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كوكيز الشوفان الصحي المخبوز بالفرن',
                    'description' => 'كوكيز شوفان مغذية مخبوزة بالفرن بمكونات صحية وقوام مشبع.',
                    'specifications' => '<ul><li>شوفان صحي</li><li>مخبوز طازجًا في الفرن</li><li>مكونات مغذية</li><li>قوام مشبع</li><li>حلاوة طبيعية</li></ul>',
                    'details' => '<p>كوكيز شوفان صحي مخبوز بالفرن مصنوع من مكونات مغذية وشوفان مشبع لتقديم صحي ومرضٍ.</p>',
                    'price' => 16.99,
                    'sale_price' => 14.99,
                    'cover_image' => 'https://images.unsplash.com/photo-921271?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-816424?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871425?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-918155?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-041242?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-054652?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كوكيز اللوز الفاخر المصنوع بعناية',
                    'description' => 'كوكيز لوز فاخر بنكهة لوز غنية وقوام رقيق.',
                    'specifications' => '<ul><li>لوز فاخر</li><li>وصفة مصنوعة بعناية</li><li>نكهة لوز غنية</li><li>قوام رقيق</li><li>جودة حرفية</li></ul>',
                    'details' => '<p>كوكيز لوز فاخر مصنوع بعناية من أفضل أنواع اللوز، يقدم نكهة لوز غنية وقوامًا رقيقًا في كل قضمة.</p>',
                    'price' => 22.99,
                    'cover_image' => 'https://images.unsplash.com/photo-166228?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-776629?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-958655?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-621399?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-198734?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-677979?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بسكويت الشورتبرد الكلاسيكي على الطريقة الاسكتلندية',
                    'description' => 'بسكويت شورتبرد تقليدي على الطريقة الاسكتلندية بطعم زبدة أصيل.',
                    'specifications' => '<ul><li>وصفة على الطريقة الاسكتلندية</li><li>طعم زبدة أصيل</li><li>طريقة تقليدية</li><li>قوام متفتت</li><li>شكل كلاسيكي</li></ul>',
                    'details' => '<p>بسكويت شورتبرد أصيل على الطريقة الاسكتلندية مصنوع بطرق تقليدية وزبدة فاخرة للقوام المتفتت الكلاسيكي والطعم الغني.</p>',
                    'price' => 19.99,
                    'sale_price' => 17.99,
                    'cover_image' => 'https://images.unsplash.com/photo-554157?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-941122?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-725730?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-518681?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646186?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-277170?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بسكويت محشو بالكريمة الفاخر',
                    'description' => 'بسكويت فاخر محشو بالكريمة بمركز كريمي ناعم وقشرة مقرمشة.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>حشوة كريمة ناعمة</li><li>قشرة مقرمشة</li><li>مكونات فاخرة</li><li>ساندويتش مثالي</li></ul>',
                    'details' => '<p>بسكويت فاخر محشو بالكريمة يتميز بحشوة كريمة غنية وناعمة بين قطعتين مقرمشتين مصنوعتين بمكونات فاخرة.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'نكهة الكريمة', 'options' => ['فانيليا', 'شوكولاتة', 'فراولة', 'برتقال']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-723902?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-718281?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-764629?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573500?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-107950?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-712086?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بسكويت جاف تقليدي بنمط المخابز',
                    'description' => 'بسكويت جاف تقليدي بنمط المخابز بطعم أصيل ومقرمشة مثالية.',
                    'specifications' => '<ul><li>وصفة مخابز تقليدية</li><li>نمط البسكويت الجاف</li><li>طعم أصيل</li><li>مقرمشة مثالية</li><li>مدة صلاحية طويلة</li></ul>',
                    'details' => '<p>بسكويت جاف تقليدي بنمط المخابز مصنوع بوصفات أصيلة، يقدم مقرمشة مثالية وطعمًا كلاسيكيًا يتناسب مع الشاي أو القهوة.</p>',
                    'price' => 12.99,
                    'cover_image' => 'https://images.unsplash.com/photo-427239?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-588407?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-417977?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-970495?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-779228?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-235922?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'علب هدايا الكوكيز المشكل الفاخرة',
                    'description' => 'علب هدايا أنيقة تحتوي على كوكيز مشكل فاخر بتغليف مميز.',
                    'specifications' => '<ul><li>تشكيلة فاخرة</li><li>تغليف هدايا مميز</li><li>أصناف كوكيز متعددة</li><li>عرض أنيق</li><li>مثالية للهدايا</li></ul>',
                    'details' => '<p>علب هدايا كوكيز مشكل فاخرة تتميز بأنواع كوكيز متعددة بتغليف أنيق، مثالية للمناسبات الخاصة والهدايا.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'variants' => [
                        ['name' => 'حجم العلبة', 'options' => ['صغير (12 قطعة)', 'متوسط (24 قطعة)', 'كبير (36 قطعة)']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-834694?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-309957?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-581373?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-413760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-762802?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214473?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'المخبوزات المالحة' => [
                [
                    'name' => 'نفخة صينية - مقرمشة ومنعشة ومليئة بالنكهة',
                    'description' => 'معجنات نفخة صينية مقرمشة بحشوة منعشة ونكهات جريئة.',
                    'specifications' => '<ul><li>قشرة معجنات مقرمشة</li><li>حشوة منعشة</li><li>نكهات جريئة</li><li>تحضير على الطريقة الصينية</li><li>مخبوز طازج يوميًا</li></ul>',
                    'details' => '<p>نفخة صينية لذيذة تتميز بقشرة مقرمشة محشوة بمكونات منعشة ونكهات جريئة لتجربة طعم أصيلة.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-015497?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-134179?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-114169?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-039081?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-663230?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-859227?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كرواسون الزبدة من Lakeview Milkbar',
                    'description' => 'كرواسون زبدة فاخر من Lakeview Milkbar بطبقات رقيقة وطعم غني.',
                    'specifications' => '<ul><li>زبدة فاخرة</li><li>طبقات رقيقة</li><li>طعم غني</li><li>جودة Lakeview Milkbar</li><li>تقنية فرنسية</li></ul>',
                    'details' => '<p>كرواسون زبدة أصيل من Lakeview Milkbar مصنوع بزبدة فاخرة وتقنية فرنسية لطبقات رقيقة مثالية وطعم غني.</p>',
                    'price' => 12.99,
                    'sale_price' => 10.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['عادي', 'كبير', 'علبة صغيرة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-664708?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-941953?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-369920?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-153421?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-635468?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249252?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ساندويتش مزدوج الطبقات',
                    'description' => 'ساندويتش مزدوج الطبقات متعدد الطبقات بمكونات طازجة وحشوات فاخرة.',
                    'specifications' => '<ul><li>تصميم متعدد الطبقات</li><li>مكونات طازجة</li><li>حشوات فاخرة</li><li>نمط مزدوج الطبقات</li><li>حصة مشبعة</li></ul>',
                    'details' => '<p>ساندويتش مزدوج الطبقات مشبع يتميز بطبقات متعددة من المكونات الطازجة والحشوات الفاخرة لتجربة وجبة مرضية.</p>',
                    'price' => 15.99,
                    'cover_image' => 'https://images.unsplash.com/photo-630683?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-201015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-044550?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-879484?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665865?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-052125?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كيش نباتي مصغر',
                    'description' => 'كيش نباتي بحجم القضمة مع خضروات طازجة وكاسترد بيض كريمي.',
                    'specifications' => '<ul><li>حصص بحجم القضمة</li><li>خضروات طازجة</li><li>كاسترد بيض كريمي</li><li>وصفة نباتية</li><li>مثالي للحفلات</li></ul>',
                    'details' => '<p>كيش مصغر نباتي لذيذ يتميز بخضروات طازجة في كاسترد بيض كريمي، مثالي للحفلات والوجبات الخفيفة.</p>',
                    'price' => 18.99,
                    'variants' => [
                        ['name' => 'حجم العبوة', 'options' => ['6 قطع', '12 قطعة', '18 قطعة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-092385?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-281363?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-011306?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-596716?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-076418?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-661712?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شريحة بيتزا بدقيق الحنطة مع الخضروات',
                    'description' => 'شريحة بيتزا صحية بدقيق الحنطة مغطاة بخضروات طازجة وجبن.',
                    'specifications' => '<ul><li>قاعدة دقيق حنطة</li><li>خضروات طازجة</li><li>جبن عالي الجودة</li><li>خيار صحي</li><li>حصة شريحة واحدة</li></ul>',
                    'details' => '<p>شريحة بيتزا مغذية بدقيق الحنطة مغطاة بخضروات طازجة وجبن عالي الجودة لخيار وجبة صحي ولذيذ.</p>',
                    'price' => 9.99,
                    'sale_price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-965639?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-167069?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-676748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-629321?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-465367?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-122097?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لفات خبز دلي ناعمة مجمدة ومقطعة',
                    'description' => 'لفات خبز دلي ناعمة مجمدة ومريحة، مقطعة شرائح مسبقًا لسهولة الاستخدام.',
                    'specifications' => '<ul><li>مجمد للحفاظ على النضارة</li><li>مقطعة شرائح مسبقًا</li><li>قوام ناعم</li><li>جودة دلي</li><li>سهلة التذويب</li></ul>',
                    'details' => '<p>لفات خبز دلي ناعمة مجمدة ومريحة مقطعة شرائح مسبقًا لسهولة الاستخدام، تحافظ على النضارة والقوام الناعم عند التذويب.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-774789?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-892207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-286331?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-104747?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665729?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-598771?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خبز كوري محشو بالجبن',
                    'description' => 'خبز ناعم على الطريقة الكورية محشو بالجبن الذائب ونكهات تقليدية.',
                    'specifications' => '<ul><li>خبز على الطريقة الكورية</li><li>حشوة جبن ذائب</li><li>قوام ناعم</li><li>نكهات تقليدية</li><li>وصفة أصيلة</li></ul>',
                    'details' => '<p>خبز أصيل على الطريقة الكورية بقوام ناعم وحشوة جبن ذائب، محضر بنكهات تقليدية لتجربة طعم أصيلة.</p>',
                    'price' => 11.99,
                    'cover_image' => 'https://images.unsplash.com/photo-105458?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-058515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-731637?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-750343?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-327450?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-147227?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'فطيرة يدوية بالسبانخ والذرة والجبن - قطعة واحدة',
                    'description' => 'فطيرة يدوية فردية محشوة بالسبانخ والذرة والجبن في معجنات رقيقة.',
                    'specifications' => '<ul><li>حصة فردية</li><li>حشوة سبانخ وذرة</li><li>مزيج جبن</li><li>معجنات رقيقة</li><li>سهولة الحمل باليد</li></ul>',
                    'details' => '<p>فطيرة يدوية فردية لذيذة تتميز بحشوة السبانخ والذرة والجبن ملفوفة في معجنات رقيقة للاستمتاع بها بسهولة باليد.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-117720?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-804567?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-531987?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-722705?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-518947?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-337716?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الفواكه والخضروات' => [
                [
                    'name' => 'فراولة هجينة بأفضل جودة',
                    'description' => 'فراولة هجينة فاخرة بحلاوة ونكهة استثنائية.',
                    'specifications' => '<ul><li>صنف هجين</li><li>حلاوة استثنائية</li><li>غنية بفيتامين C</li><li>عبوة رطل واحد</li><li>طازجة من المزرعة</li></ul>',
                    'details' => '<p>فراولة هجينة بأفضل جودة بحلاوة استثنائية ونكهة نابضة. غنية بفيتامين C ومضادات الأكسدة، مثالية كوجبة خفيفة أو للحلويات.</p>',
                    'price' => 5.99,
                    'sale_price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-374266?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-707297?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461709?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-205517?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-155649?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-093174?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سبانخ بلق عضوية',
                    'description' => 'أوراق سبانخ بلق عضوية طازجة، غنية بالحديد والعناصر الغذائية.',
                    'specifications' => '<ul><li>عضوية معتمدة</li><li>غنية بالحديد</li><li>صنف بلق طازج</li><li>حزمة 500 جم</li><li>خالية من المبيدات</li></ul>',
                    'details' => '<p>سبانخ بلق عضوية طازجة بأوراق طرية غنية بالحديد والعناصر الغذائية الأساسية. خالية من المبيدات ومثالية للطهي الصحي.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-483904?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-443333?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-415749?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-389307?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-391692?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-975023?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'جزر طازج من المزرعة',
                    'description' => 'جزر طازج من المزرعة مقرمش وحلو، مثالي للطهي والوجبات الخفيفة.',
                    'specifications' => '<ul><li>طازج من المزرعة</li><li>مقرمش وحلو</li><li>غني بالبيتا كاروتين</li><li>عبوة 1 كجم</li><li>من مصادر محلية</li></ul>',
                    'details' => '<p>جزر طازج من المزرعة مقرمش وحلو بلون برتقالي نابض. غني بالبيتا كاروتين ومثالي للطهي أو العصير أو الوجبات الخفيفة.</p>',
                    'price' => 2.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['صغير', 'متوسط', 'كبير']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-111414?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-911819?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-056741?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-769901?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-053036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-058497?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'تفاح عضوي محصود طازجًا',
                    'description' => 'تفاح عضوي مقرمش محصود طازجًا بحلاوة طبيعية.',
                    'specifications' => '<ul><li>عضوي معتمد</li><li>حصاد طازج</li><li>حلاوة طبيعية</li><li>عبوة 1 كجم</li><li>قوام مقرمش</li></ul>',
                    'details' => '<p>تفاح عضوي محصود طازجًا بقوام مقرمش وحلاوة طبيعية. عضوي معتمد ومثالي للوجبات الخفيفة الصحية أو الطهي.</p>',
                    'price' => 4.49,
                    'sale_price' => 3.99,
                    'variants' => [
                        ['name' => 'الصنف', 'options' => ['ريد ديليشس', 'تفاح أخضر', 'جالا']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-931172?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-191890?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-273349?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-763474?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-700194?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-630375?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خضروات مشكلة مقطعة طازجة',
                    'description' => 'خضروات مشكلة جاهزة للطهي، مقطعة ومنظفة حديثًا.',
                    'specifications' => '<ul><li>جاهزة للطهي</li><li>مقطعة حديثًا</li><li>أصناف مشكلة</li><li>عبوة 500 جم</li><li>مغسولة مسبقًا</li></ul>',
                    'details' => '<p>خضروات مشكلة مقطعة طازجة ومريحة جاهزة للطهي. مغسولة ومنظفة مسبقًا لتحضير الوجبات بسرعة.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-043397?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-755627?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-336846?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-494850?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-692824?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-938602?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'فاكهة التنين الغريبة المنتقاة يدويًا',
                    'description' => 'فاكهة تنين فاخرة منتقاة يدويًا بنكهة وقوام فريدين.',
                    'specifications' => '<ul><li>جودة منتقاة يدويًا</li><li>صنف غريب</li><li>نكهة فريدة</li><li>لكل قطعة</li><li>غنية بمضادات الأكسدة</li></ul>',
                    'details' => '<p>فاكهة تنين غريبة فاخرة منتقاة يدويًا بنكهة حلوة فريدة ومظهر مميز. غنية بمضادات الأكسدة والفيتامينات.</p>',
                    'price' => 8.99,
                    'variants' => [
                        ['name' => 'النوع', 'options' => ['لب أبيض', 'لب أحمر']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-312211?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-996488?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-946939?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-300832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-063841?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-587921?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سلة فواكه موسمية فاخرة',
                    'description' => 'سلة فاخرة تحتوي على تشكيلة فواكه موسمية راقية.',
                    'specifications' => '<ul><li>تشكيلة فاخرة</li><li>أصناف موسمية</li><li>جودة فاخرة</li><li>سلة هدايا</li><li>فواكه مشكلة</li></ul>',
                    'details' => '<p>سلة فواكه موسمية فاخرة تتميز بفواكه مشكلة عالية الجودة. مثالية للهدايا أو المناسبات الخاصة.</p>',
                    'price' => 24.99,
                    'sale_price' => 21.99,
                    'cover_image' => 'https://images.unsplash.com/photo-532360?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-292668?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-686837?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-553683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-406648?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-937558?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'نبتة نعناع طازجة',
                    'description' => 'نبتة نعناع طازجة حية للزراعة المنزلية والطبخ.',
                    'specifications' => '<ul><li>نبتة حية</li><li>صنف نعناع طازج</li><li>زراعة منزلية</li><li>نبتة في أصيص</li><li>أوراق عطرية</li></ul>',
                    'details' => '<p>نبتة نعناع طازجة حية مثالية للزراعة المنزلية. أوراق عطرية مثالية للطبخ والشاي والعلاجات الطبيعية.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-851854?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-081548?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-477056?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-328791?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-492143?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871401?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'فطر طازج',
                    'description' => 'فطر طازج فاخر بنكهة ترابية وقوام لحمي.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>نكهة ترابية</li><li>قوام لحمي</li><li>عبوة 250 جم</li><li>غني بالبروتين</li></ul>',
                    'details' => '<p>فطر طازج فاخر بنكهة ترابية غنية وقوام لحمي. عالي البروتين ومثالي للطهي والسلطات والأطباق الفاخرة.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-151316?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-812341?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-289246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559981?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-108897?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-213160?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بروكلي طازج',
                    'description' => 'زهرات بروكلي طازجة مقرمشة غنية بالفيتامينات والعناصر الغذائية.',
                    'specifications' => '<ul><li>زهرات طازجة</li><li>غني بالفيتامينات</li><li>نسبة ألياف عالية</li><li>عبوة 500 جم</li><li>مزروع عضويًا</li></ul>',
                    'details' => '<p>زهرات بروكلي طازجة مقرمشة مليئة بفيتاميني C وK والألياف والعناصر الغذائية الأساسية. مزروعة عضويًا ومثالية للطهي الصحي.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-874299?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-162432?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-043591?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-771737?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-975579?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-164487?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الألبان والبيض' => [
                [
                    'name' => 'حليب Aurora الكريمي',
                    'description' => 'حليب Aurora الكريمي الفاخر بقوام غني وكريمي وطعم طبيعي.',
                    'specifications' => '<ul><li>حليب كريمي فاخر</li><li>غني وكريمي</li><li>طعم طبيعي</li><li>عبوة 1 لتر</li><li>طازج يوميًا</li></ul>',
                    'details' => '<p>حليب Aurora الكريمي يقدم جودة فاخرة بقوام غني وكريمي وطعم طبيعي. مثالي للشرب والطبخ واحتياجات الخبز.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-561205?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-928320?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-608594?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-592248?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-754989?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-136315?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'زبدة مملحة فاخرة',
                    'description' => 'زبدة مملحة فاخرة من الدرجة الأولى مصنوعة من كريمة طازجة بتوازن ملح مثالي.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>مصنوعة من كريمة طازجة</li><li>توازن ملح مثالي</li><li>عبوة 500 جم</li><li>نكهة غنية</li></ul>',
                    'details' => '<p>زبدة مملحة فاخرة مصنوعة من كريمة طازجة بتوازن ملح مثالي لنكهة غنية. مثالية للطهي والخبز والدهن.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-473817?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-491090?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-225505?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-588650?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-668560?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-755138?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'جبن Aurora',
                    'description' => 'جبن Aurora الفاخر بنكهة غنية وقوام ناعم.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>نكهة غنية</li><li>قوام ناعم</li><li>عبوة 200 جم</li><li>مكونات طبيعية</li></ul>',
                    'details' => '<p>جبن Aurora يقدم جودة فاخرة بنكهة غنية وقوام ناعم. مصنوع من مكونات طبيعية لطعم أصيل.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-925324?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-871529?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-264680?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-274361?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-371794?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573945?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'زبادي بنكهة العسل',
                    'description' => 'زبادي كريمي بنكهة عسل طبيعية ومزارع نشطة حية.',
                    'specifications' => '<ul><li>نكهة عسل طبيعية</li><li>مزارع نشطة حية</li><li>قوام كريمي</li><li>عبوة 400 جم</li><li>فوائد بروبيوتيك</li></ul>',
                    'details' => '<p>زبادي بنكهة العسل يجمع بين القوام الكريمي وحلاوة العسل الطبيعية والمزارع الحية المفيدة لهضم صحي.</p>',
                    'price' => 4.49,
                    'cover_image' => 'https://images.unsplash.com/photo-396247?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-161772?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-395688?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247743?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-127495?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-565190?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كريمة طازجة من Creamvia',
                    'description' => 'كريمة طازجة فاخرة من Creamvia بقوام غني للطهي والحلويات.',
                    'specifications' => '<ul><li>كريمة طازجة فاخرة</li><li>قوام غني</li><li>مثالية للطهي</li><li>عبوة 250 مل</li><li>نسبة دهون عالية</li></ul>',
                    'details' => '<p>كريمة طازجة من Creamvia توفر جودة فاخرة بقوام غني، مثالية للطهي والخبز وصنع الحلويات اللذيذة.</p>',
                    'price' => 5.49,
                    'sale_price' => 4.99,
                    'variants' => [
                        ['name' => 'الكمية', 'options' => ['200 مل', '250 مل', '500 مل']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-131677?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-267279?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026321?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-351639?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333240?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333829?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بانير من Lactobloom',
                    'description' => 'بانير طازج من Lactobloom بقوام ناعم وطعم أصيل.',
                    'specifications' => '<ul><li>بانير طازج</li><li>قوام ناعم</li><li>طعم أصيل</li><li>عبوة 200 جم</li><li>عالي البروتين</li></ul>',
                    'details' => '<p>بانير من Lactobloom يقدم قوامًا طازجًا وناعمًا بطعم أصيل. عالي البروتين ومثالي للطبخ الهندي والوجبات الصحية.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-570282?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-240013?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-012228?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-179584?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-848874?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-046230?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بيض طازج كبير من دجاج يربى بحرية',
                    'description' => 'بيض طازج كبير فاخر من دجاج يربى بحرية بصفار ذهبي غني.',
                    'specifications' => '<ul><li>دجاج يربى بحرية</li><li>حجم كبير</li><li>صفار ذهبي غني</li><li>عبوة دستة</li><li>طازج من المزرعة</li></ul>',
                    'details' => '<p>بيض طازج كبير من دجاج يربى بحرية يوفر جودة فاخرة بصفار ذهبي غني ونكهة متفوقة من دجاج مربى أخلاقيًا.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'variants' => [
                        ['name' => 'حجم العبوة', 'options' => ['6 بيضات', '12 بيضة', '18 بيضة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-272397?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-076823?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-567664?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-097348?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-907458?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-340080?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مشروب زبادي رغوي',
                    'description' => 'مشروب زبادي رغوي منعش بقوام ناعم وطعم طبيعي.',
                    'specifications' => '<ul><li>قوام رغوي</li><li>اتساق ناعم</li><li>طعم طبيعي</li><li>زجاجة 250 مل</li><li>مشروب منعش</li></ul>',
                    'details' => '<p>مشروب زبادي رغوي يقدم طعمًا منعشًا بقوام ناعم ورغوي. مثالي للانتعاش أثناء التنقل والترطيب الصحي.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-766831?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-448561?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-233090?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-682025?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-697580?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-181903?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حليب بنكهة الشوكولاتة',
                    'description' => 'حليب بنكهة الشوكولاتة غني وكريمي بالكاكاو الفاخر.',
                    'specifications' => '<ul><li>كاكاو فاخر</li><li>نكهة شوكولاتة غنية</li><li>قوام كريمي</li><li>زجاجة 500 مل</li><li>بدون ألوان صناعية</li></ul>',
                    'details' => '<p>حليب بنكهة الشوكولاتة غني وكريمي مصنوع بالكاكاو الفاخر لطعم شوكولاتة أصيل. مثالي للأطفال ومحبي الشوكولاتة.</p>',
                    'price' => 2.99,
                    'cover_image' => 'https://images.unsplash.com/photo-570119?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-926668?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-720348?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-383866?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-759007?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-184891?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ميلك شيك الفراولة',
                    'description' => 'ميلك شيك فراولة لذيذ بقطع فاكهة حقيقية وحليب كريمي.',
                    'specifications' => '<ul><li>قطع فراولة حقيقية</li><li>قاعدة حليب كريمية</li><li>نكهة فاكهة طبيعية</li><li>زجاجة 400 مل</li><li>غني بالكالسيوم</li></ul>',
                    'details' => '<p>ميلك شيك فراولة لذيذ مصنوع بقطع فاكهة حقيقية وحليب كريمي. نكهة فاكهة طبيعية وغني بالكالسيوم لتقديم صحي.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-023218?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-170705?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-723589?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-072592?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-425803?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-536207?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'المواد الغذائية الأساسية' => [
                [
                    'name' => 'أرز بسمتي الحصاد الذهبي',
                    'description' => 'أرز بسمتي فاخر من Golden Harvest بحبوب طويلة ورائحة عطرية.',
                    'specifications' => '<ul><li>صنف بسمتي فاخر</li><li>حبة طويلة</li><li>رائحة عطرية</li><li>عبوة 5 كجم</li><li>معتق لتحسين النكهة</li></ul>',
                    'details' => '<p>أرز بسمتي الحصاد الذهبي يقدم جودة فاخرة برائحة عطرية مميزة وقوام هش. معتق لتعزيز النكهة ومثالي للبرياني والبيلاو.</p>',
                    'price' => 15.99,
                    'sale_price' => 13.99,
                    'cover_image' => 'https://images.unsplash.com/photo-789893?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-165120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-760095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-497665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708357?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-644023?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'دقيق قمح كامل خلبي',
                    'description' => 'دقيق قمح كامل خلبي مغذي بنسبة ألياف وبروتين عالية.',
                    'specifications' => '<ul><li>صنف قمح خلبي</li><li>مطحون بالحجر</li><li>نسبة ألياف عالية</li><li>عبوة 2 كجم</li><li>خالٍ من المواد الكيميائية</li></ul>',
                    'details' => '<p>دقيق قمح كامل خلبي مصنوع من صنف قمح قديم، مطحون بالحجر للحفاظ على العناصر الغذائية. عالي الألياف والبروتين، مثالي للخبز الصحي.</p>',
                    'price' => 8.99,
                    'variants' => [
                        ['name' => 'حجم العبوة', 'options' => ['1 كجم', '2 كجم', '5 كجم']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-766001?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-111933?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-914820?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-992281?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-973175?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-151643?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'عدس ماسور ومونج بقوليات',
                    'description' => 'عدس ماسور ومونج بقوليات بجودة فاخرة غنية بالبروتين.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>غني بالبروتين</li><li>سهل الطهي</li><li>عبوة 1 كجم لكل منهما</li><li>منظف آليًا</li></ul>',
                    'details' => '<p>عدس ماسور ومونج بقوليات فاخر يوفر محتوى بروتين ممتاز وسهولة في الطهي. منظف ومرتب آليًا لضمان الجودة.</p>',
                    'price' => 12.99,
                    'sale_price' => 10.99,
                    'cover_image' => 'https://images.unsplash.com/photo-187090?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-555214?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-149124?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-729941?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-607128?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-584160?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'عدس بني فاخر',
                    'description' => 'عدس بني فاخر بنكهة غنية وقيمة غذائية عالية.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>نكهة غنية</li><li>تغذية عالية</li><li>عبوة 500 جم</li><li>عضوي معتمد</li></ul>',
                    'details' => '<p>عدس بني فاخر يقدم نكهة غنية وقيمة غذائية عالية. عضوي معتمد ومثالي للشوربات والكاري والسلطات الصحية.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-027718?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-569522?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247887?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026766?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-561319?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-140724?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'زيوت الطبخ Fortune',
                    'description' => 'زيوت طبخ فاخرة من ماركة Fortune للطبخ والقلي الصحي.',
                    'specifications' => '<ul><li>ماركة Fortune</li><li>جودة فاخرة</li><li>طبخ صحي</li><li>زجاجة 1 لتر</li><li>أنواع متعددة</li></ul>',
                    'details' => '<p>زيوت الطبخ Fortune توفر جودة فاخرة للطبخ والقلي الصحي. متوفرة بأنواع متعددة تشمل زيت عباد الشمس والخردل والزيت المكرر.</p>',
                    'price' => 9.99,
                    'sale_price' => 8.49,
                    'cover_image' => 'https://images.unsplash.com/photo-937854?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-896024?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-598958?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559293?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-130904?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سكر وملح',
                    'description' => 'عبوة مشتركة فاخرة من السكر والملح لاحتياجات الطبخ اليومية.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>سكر مكرر</li><li>ملح مدعم باليود</li><li>عبوة مشتركة</li><li>أساسيات يومية</li></ul>',
                    'details' => '<p>عبوة مشتركة فاخرة من السكر والملح تشمل السكر المكرر والملح المدعم باليود لاحتياجات الطبخ اليومية. مكونات أساسية لكل مطبخ.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-863446?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-169006?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709560?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-297262?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-492383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-827429?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'توابل Outino',
                    'description' => 'تشكيلة توابل فاخرة من ماركة Outino لنكهات أصيلة.',
                    'specifications' => '<ul><li>ماركة Outino</li><li>توابل فاخرة</li><li>نكهات أصيلة</li><li>علبة متنوعة</li><li>مطحونة طازجًا</li></ul>',
                    'details' => '<p>توابل Outino تقدم تشكيلة توابل بجودة فاخرة ونكهات أصيلة. توابل مطحونة طازجًا مثالية للطبخ الهندي والمطابخ العالمية.</p>',
                    'price' => 11.99,
                    'sale_price' => 9.99,
                    'cover_image' => 'https://images.unsplash.com/photo-780721?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-092773?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-987559?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709064?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-058349?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-809600?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'خلطات جاهزة صحية',
                    'description' => 'خلطات صحية جاهزة للطهي لوجبات سريعة ومغذية.',
                    'specifications' => '<ul><li>جاهزة للطهي</li><li>مكونات صحية</li><li>تحضير سريع</li><li>عبوة 200 جم</li><li>خالية من المواد الحافظة</li></ul>',
                    'details' => '<p>خلطات جاهزة صحية توفر خيارات مريحة جاهزة للطهي بمكونات صحية. تحضير سريع لوجبات مغذية بدون مواد حافظة.</p>',
                    'price' => 7.49,
                    'variants' => [
                        ['name' => 'نوع الخلطة', 'options' => ['خلطة إدلي', 'خلطة دوسا', 'خلطة أبما', 'خلطة بان كيك']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-110497?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-870831?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-552390?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-947998?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-772182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-908808?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لوز ملكي',
                    'description' => 'لوز ملكي فاخر بنكهة غنية وفوائد طبيعية.',
                    'specifications' => '<ul><li>جودة فاخرة</li><li>غني بالبروتين</li><li>فوائد طبيعية</li><li>عبوة 500 جم</li><li>لوز خام</li></ul>',
                    'details' => '<p>لوز ملكي فاخر بنكهة غنية وفوائد طبيعية. عالي البروتين والدهون الصحية، مثالي للوجبات الخفيفة والطهي.</p>',
                    'price' => 18.99,
                    'cover_image' => 'https://images.unsplash.com/photo-485904?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-853871?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-860011?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-746942?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-037470?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-627221?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حبوب الإفطار Nutrios',
                    'description' => 'حبوب إفطار مغذية بالحبوب الكاملة والفيتامينات الأساسية.',
                    'specifications' => '<ul><li>حبوب كاملة</li><li>فيتامينات أساسية</li><li>نسبة ألياف عالية</li><li>علبة 400 جم</li><li>مدعمة بالمعادن</li></ul>',
                    'details' => '<p>حبوب إفطار Nutrios توفر بداية مغذية ليومك بالحبوب الكاملة والفيتامينات الأساسية. نسبة ألياف عالية ومدعمة بالمعادن.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-260887?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-067672?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-661923?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-618620?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-874269?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-797266?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الوجبات الخفيفة والمشروبات' => [
                [
                    'name' => 'رقائق Lays',
                    'description' => 'رقائق بطاطس Lays مقرمشة بنكهة كلاسيكية ومقرمشة مثالية.',
                    'specifications' => '<ul><li>رقائق بطاطس مقرمشة</li><li>نكهة كلاسيكية</li><li>مقرمشة مثالية</li><li>عبوة 50 جم</li><li>بدون ألوان صناعية</li></ul>',
                    'details' => '<p>رقائق Lays تقدم المزيج المثالي من القوام المقرمش والنكهة الكلاسيكية. مصنوعة من بطاطس عالية الجودة لتجربة وجبات خفيفة مثالية.</p>',
                    'price' => 2.99,
                    'cover_image' => 'https://images.unsplash.com/photo-679762?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-258116?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-803124?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-569017?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-557486?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-136580?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'بسكويت Hide & Seek',
                    'description' => 'بسكويت Hide & Seek اللذيذ بقطع الشوكولاتة ونكهة شوكولاتة غنية.',
                    'specifications' => '<ul><li>بسكويت بقطع الشوكولاتة</li><li>نكهة شوكولاتة غنية</li><li>قوام مقرمش</li><li>عبوة 100 جم</li><li>مكونات فاخرة</li></ul>',
                    'details' => '<p>بسكويت Hide & Seek يتميز بقطع شوكولاتة لذيذة في كل قضمة بنكهة شوكولاتة غنية وقوام مقرمش مثالي.</p>',
                    'price' => 3.49,
                    'sale_price' => 2.99,
                    'cover_image' => 'https://images.unsplash.com/photo-546973?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-817453?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-281338?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-918147?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462043?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-675069?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شوكولاتة Indya Amul Chocomini',
                    'description' => 'شوكولاتة Indya Amul Chocomini فاخرة بكاكاو غني وقوام ناعم.',
                    'specifications' => '<ul><li>شوكولاتة فاخرة</li><li>محتوى كاكاو غني</li><li>قوام ناعم</li><li>حجم مصغر</li><li>جودة Amul</li></ul>',
                    'details' => '<p>شوكولاتة Indya Amul Chocomini تقدم جودة فاخرة بمحتوى كاكاو غني وقوام ناعم بحصص مصغرة مريحة.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-574479?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-912328?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214967?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-732808?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-331551?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-542644?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مشروب غازي بنكهة التوت البري',
                    'description' => 'مشروب غازي منعش بنكهة التوت البري بجوهر فاكهة طبيعي.',
                    'specifications' => '<ul><li>نكهة التوت البري</li><li>جوهر فاكهة طبيعي</li><li>طعم منعش</li><li>زجاجة 330 مل</li><li>مشروب غازي</li></ul>',
                    'details' => '<p>مشروب غازي بنكهة التوت البري يقدم طعمًا منعشًا بجوهر فاكهة طبيعي وكربنة مثالية لانتعاش مثالي.</p>',
                    'price' => 1.99,
                    'sale_price' => 1.79,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['330 مل', '500 مل', '1 لتر']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-786209?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-059532?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-164836?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126522?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-066908?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-628678?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'عصير عضوي طازج',
                    'description' => 'عصير عضوي طازج فاخر مصنوع من فواكه عضوية 100%.',
                    'specifications' => '<ul><li>فواكه عضوية 100%</li><li>معصور طازجًا</li><li>بدون مواد حافظة</li><li>زجاجة 250 مل</li><li>فيتامينات طبيعية</li></ul>',
                    'details' => '<p>عصير عضوي طازج مصنوع من فواكه عضوية 100% بدون مواد حافظة. غني بالفيتامينات الطبيعية ومعصور طازجًا لأقصى تغذية.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-140905?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-098306?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-240150?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-045217?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-426914?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-039819?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شاي رمادي حرفي',
                    'description' => 'شاي رمادي فاخر مصنوع يدويًا بزيت البرغموت ونكهات طبيعية.',
                    'specifications' => '<ul><li>أوراق شاي فاخرة</li><li>زيت البرغموت</li><li>نكهات طبيعية</li><li>25 كيس شاي</li><li>جودة حرفية</li></ul>',
                    'details' => '<p>شاي رمادي حرفي يتميز بأوراق شاي فاخرة منقوعة بزيت البرغموت ونكهات طبيعية لتجربة شاي أصيلة وراقية.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-241762?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-440924?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-615499?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-854725?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959040?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-153920?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مشروبات الطاقة Nitro Boost',
                    'description' => 'مشروبات Nitro Boost عالية الطاقة بالكافيين والمكونات الطبيعية.',
                    'specifications' => '<ul><li>محتوى كافيين عالي</li><li>مكونات طبيعية</li><li>صيغة تعزيز الطاقة</li><li>علبة 250 مل</li><li>خيار بدون سكر</li></ul>',
                    'details' => '<p>مشروبات الطاقة Nitro Boost توفر تعزيز طاقة قوي بمحتوى كافيين عالٍ ومكونات طبيعية لطاقة وتركيز مستمرين.</p>',
                    'price' => 2.49,
                    'variants' => [
                        ['name' => 'النكهة', 'options' => ['الأصلية', 'انفجار التوت', 'اندفاع الحمضيات', 'بدون سكر']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-815841?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-040548?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-198552?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-579677?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-410295?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-359340?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'نامكين مالح مشكل',
                    'description' => 'نامكين مالح تقليدي مشكل بالتوابل والمكونات المقرمشة.',
                    'specifications' => '<ul><li>وصفة تقليدية</li><li>نكهة حارة</li><li>قوام مقرمش</li><li>عبوة 200 جم</li><li>مكونات مشكلة</li></ul>',
                    'details' => '<p>نامكين مالح مشكل يقدم تجربة وجبات خفيفة هندية تقليدية بمزيج مثالي من التوابل والمكونات المقرمشة لطعم أصيل.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-528459?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-481414?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-456277?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-246015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-856886?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-894275?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'نودلز Noodle King سريعة التحضير',
                    'description' => 'نودلز فورية سريعة ولذيذة بنكهة غنية وقوام مثالي.',
                    'specifications' => '<ul><li>طهي سريع في 3 دقائق</li><li>كيس نكهة غني</li><li>قوام مثالي</li><li>عبوة 70 جم</li><li>بدون مواد حافظة</li></ul>',
                    'details' => '<p>نودلز Noodle King الفورية توفر وجبة سريعة ومرضية بنكهة غنية وقوام مثالي. جاهزة في 3 دقائق فقط بدون مواد حافظة.</p>',
                    'price' => 1.99,
                    'cover_image' => 'https://images.unsplash.com/photo-909009?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-902056?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-332472?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-158372?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-701549?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ألواح الطاقة Nutri-Core',
                    'description' => 'ألواح طاقة مغذية مليئة بالبروتين والمكونات الطبيعية.',
                    'specifications' => '<ul><li>محتوى بروتين عالي</li><li>مكونات طبيعية</li><li>صيغة تعزيز الطاقة</li><li>لوح 40 جم</li><li>بدون نكهات صناعية</li></ul>',
                    'details' => '<p>ألواح الطاقة Nutri-Core توفر طاقة مستمرة بمحتوى بروتين عالٍ ومكونات طبيعية. مثالية قبل التمرين أو كوجبة خفيفة صحية.</p>',
                    'price' => 2.49,
                    'cover_image' => 'https://images.unsplash.com/photo-734345?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-478812?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-154271?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-533053?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-738168?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-421291?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'المنزل والعناية الشخصية' => [
                [
                    'name' => 'ممسحة دوارة بعجلات ونظام عصر فاخر',
                    'description' => 'ممسحة دوارة متطورة بعجلات ونظام عصر فاخر لتنظيف سهل.',
                    'specifications' => '<ul><li>تقنية دوران 360 درجة</li><li>عجلات لسهولة الحركة</li><li>نظام عصر فاخر</li><li>رأس ممسحة من الألياف الدقيقة</li><li>مقبض قابل للتعديل</li></ul>',
                    'details' => '<p>ممسحة دوارة مبتكرة بعجلات ونظام عصر فاخر لتنظيف الأرضيات بسهولة. تتميز بتقنية دوران 360 درجة ورأس من الألياف الدقيقة لأداء تنظيف فائق.</p>',
                    'price' => 49.99,
                    'sale_price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-101674?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-678650?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-550842?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-491095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-675316?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-386683?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منظف سائل طازج',
                    'description' => 'منظف سائل طازج فاخر لتنظيف قوي ورائحة منعشة.',
                    'specifications' => '<ul><li>صيغة مركزة</li><li>رائحة منعشة</li><li>قوة إزالة البقع</li><li>زجاجة 1 لتر</li><li>مكونات صديقة للبيئة</li></ul>',
                    'details' => '<p>منظف سائل طازج يوفر تنظيفًا قويًا بصيغة مركزة ورائحة منعشة. مكونات صديقة للبيئة لإزالة البقع بفعالية.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-668691?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-640120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-512774?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-169731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-019776?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-298017?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'سائل غسيل الأطباق بالليمون Ecowash',
                    'description' => 'سائل غسيل أطباق بالليمون صديق للبيئة بقوة تنظيف طبيعية.',
                    'specifications' => '<ul><li>صيغة صديقة للبيئة</li><li>مستخلص ليمون طبيعي</li><li>قوة إزالة الدهون</li><li>زجاجة 500 مل</li><li>لطيف على اليدين</li></ul>',
                    'details' => '<p>سائل غسيل الأطباق بالليمون Ecowash يجمع بين صيغة صديقة للبيئة ومستخلص ليمون طبيعي لقوة إزالة الدهون مع اللطف على اليدين.</p>',
                    'price' => 4.99,
                    'sale_price' => 4.49,
                    'cover_image' => 'https://images.unsplash.com/photo-043836?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-352604?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-078136?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-423771?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-364624?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-679412?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'صابون عنصري بمصل مغذٍ',
                    'description' => 'صابون عنصري فاخر غني بمصل مغذٍ لتغذية البشرة.',
                    'specifications' => '<ul><li>غني بمصل مغذٍ</li><li>مكونات طبيعية</li><li>صيغة مرطبة</li><li>قطعة 100 جم</li><li>مناسب لجميع أنواع البشرة</li></ul>',
                    'details' => '<p>صابون عنصري بمصل مغذٍ يوفر عناية فاخرة بالبشرة بمكونات طبيعية وصيغة مرطبة. غني بالمغذيات لبشرة صحية ومغذية.</p>',
                    'price' => 6.99,
                    'variants' => [
                        ['name' => 'النوع', 'options' => ['ألوفيرا', 'عسل وشوفان', 'فحم', 'ورد']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-507633?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-017660?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-405837?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461645?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-339000?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-619955?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شامبو أعشاب للعناية اليومية',
                    'description' => 'شامبو أعشاب لطيف للعناية اليومية بالشعر بمكونات طبيعية.',
                    'specifications' => '<ul><li>صيغة أعشاب</li><li>مكونات طبيعية</li><li>مناسب للاستخدام اليومي</li><li>زجاجة 300 مل</li><li>خالٍ من الكبريتات</li></ul>',
                    'details' => '<p>شامبو أعشاب للعناية اليومية يوفر تنظيفًا لطيفًا بمكونات أعشاب طبيعية. صيغة خالية من الكبريتات مناسبة للاستخدام اليومي وجميع أنواع الشعر.</p>',
                    'price' => 7.99,
                    'sale_price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-584900?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-556368?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-257166?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-009862?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-159310?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-382287?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معجون أسنان Denawhite',
                    'description' => 'معجون أسنان متطور للتبييض لأسنان مشرقة وصحية ونفس منعش.',
                    'specifications' => '<ul><li>صيغة تبييض</li><li>حماية بالفلورايد</li><li>نكهة نعناع طازج</li><li>أنبوب 100 جم</li><li>آمن للمينا</li></ul>',
                    'details' => '<p>معجون أسنان Denawhite يتميز بصيغة تبييض متطورة مع حماية بالفلورايد لأسنان مشرقة وصحية. نكهة نعناع طازج ومكونات آمنة للمينا.</p>',
                    'price' => 3.99,
                    'variants' => [
                        ['name' => 'النكهة', 'options' => ['نعناع طازج', 'نعناع منعش', 'أعشاب', 'للأسنان الحساسة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-460953?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-916520?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-335166?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-085330?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-854391?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959830?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منتجات ورقية للاستخدام الواحد',
                    'description' => 'منتجات ورقية عالية الجودة للاستخدام الواحد للاستخدامات المنزلية المريحة.',
                    'specifications' => '<ul><li>ورق عالي الجودة</li><li>راحة الاستخدام الواحد</li><li>استخدامات متعددة</li><li>علبة من 100 قطعة</li><li>مادة صديقة للبيئة</li></ul>',
                    'details' => '<p>منتجات ورقية للاستخدام الواحد توفر حلولًا منزلية مريحة بورق عالي الجودة ومواد صديقة للبيئة. مثالية لاحتياجات التنظيف والتقديم المختلفة.</p>',
                    'price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-568773?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-724881?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-270944?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-073121?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247158?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-601159?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معطر جو Aromist',
                    'description' => 'معطر جو فاخر من Aromist لرائحة ونضارة تدوم طويلاً.',
                    'specifications' => '<ul><li>رائحة تدوم طويلاً</li><li>جودة فاخرة</li><li>نضارة فورية</li><li>بخاخ 300 مل</li><li>عدة عطور متاحة</li></ul>',
                    'details' => '<p>معطر جو Aromist يوفر رائحة بجودة فاخرة بنضارة تدوم طويلاً. تحول فوري للغرفة مع عدة عطور ممتعة للاختيار منها.</p>',
                    'price' => 6.49,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-558799?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-704384?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-391738?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220857?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-369583?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-158325?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منظف الأرضيات Sparkler',
                    'description' => 'منظف أرضيات قوي يزيل البقع الصعبة ويترك الأرضيات لامعة ونظيفة.',
                    'specifications' => '<ul><li>صيغة تنظيف قوية</li><li>يزيل البقع الصعبة</li><li>لمسة نهائية لامعة</li><li>زجاجة 1 لتر</li><li>رائحة لطيفة</li></ul>',
                    'details' => '<p>منظف الأرضيات Sparkler يوفر تنظيفًا قويًا يزيل البقع والأوساخ الصعبة، تاركًا أرضياتك نظيفة ولامعة برائحة لطيفة.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-602956?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-317670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-982385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-957039?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-508980?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-251185?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'غسول اليدين Aura Clean',
                    'description' => 'غسول يدين لطيف مضاد للبكتيريا بصيغة مرطبة لأيدٍ ناعمة ونظيفة.',
                    'specifications' => '<ul><li>صيغة مضادة للبكتيريا</li><li>مكونات مرطبة</li><li>لطيف على البشرة</li><li>زجاجة بمضخة 250 مل</li><li>رائحة منعشة</li></ul>',
                    'details' => '<p>غسول اليدين Aura Clean يوفر حماية فعالة ضد البكتيريا مع ترطيب يديك. صيغة لطيفة تبقي اليدين ناعمتين ونظيفتين برائحة منعشة.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-909660?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-345174?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129067?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-491438?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-551437?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-705912?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'إكسسوارات داخلية' => [
                [
                    'name' => 'أغطية مقاعد سيارة فاخرة',
                    'description' => 'أغطية مقاعد فاخرة عالية الجودة لراحة وحماية معززين.',
                    'specifications' => '<ul><li>مواد فاخرة</li><li>تناسب عام</li><li>تركيب سهل</li><li>قابلة للغسل في الغسالة</li><li>قماش قابل للتنفس</li></ul>',
                    'details' => '<p>أغطية مقاعد سيارات فاخرة مصنوعة من مواد عالية الجودة لراحة وحماية معززين. تصميم يناسب جميع السيارات مع تركيب سهل وقماش قابل للغسل في الغسالة.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'الخامة', 'options' => ['جلد', 'قماش', 'نيوبرين']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-838836?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-513385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-212663?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-424639?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-302771?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-285665?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'غطاء مقود السيارة',
                    'description' => 'غطاء مقود مريح بثبات محسن وأناقة.',
                    'specifications' => '<ul><li>ثبات محسن</li><li>ملمس مريح</li><li>تركيب سهل</li><li>مقاس عام</li><li>مادة متينة</li></ul>',
                    'details' => '<p>غطاء مقود مريح مصمم لثبات محسن وراحة قيادة. تركيب سهل بمقاس يناسب معظم السيارات.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-055209?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-853052?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-619499?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-557002?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-498078?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-586056?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'فرش أرضية فاخرة للسيارات',
                    'description' => 'فرش أرضية فاخرة لجميع الفصول لحماية وأسلوب فائقين.',
                    'specifications' => '<ul><li>حماية لجميع الفصول</li><li>تصميم فاخر</li><li>تناسب مخصص</li><li>سهل التنظيف</li><li>خلفية مانعة للانزلاق</li></ul>',
                    'details' => '<p>فرش أرضية فاخر يوفر حماية فائقة من الأوساخ والرطوبة. تصميم بمقاس مخصص مع خلفية مانعة للانزلاق للسلامة والأناقة.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-301456?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-709660?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-265564?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-613635?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-752654?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-029794?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'غطاء لوحة قيادة السيارة الأنيق',
                    'description' => 'غطاء لوحة قيادة أنيق للحماية من الأشعة فوق البنفسجية وتحسين المظهر الداخلي.',
                    'specifications' => '<ul><li>حماية من الأشعة فوق البنفسجية</li><li>تصميم أنيق</li><li>تناسب مخصص</li><li>مقاوم للحرارة</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>غطاء لوحة قيادة أنيق يوفر حماية من الأشعة فوق البنفسجية مع تحسين المظهر الداخلي. تصميم بمقاس مخصص بمواد مقاومة للحرارة.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-194996?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-623401?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-567141?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-064409?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-828674?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-729208?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'وسادة مسند ذراع ComfortDrive',
                    'description' => 'وسادة مسند ذراع مريحة وبيئة العمل لراحة قيادة محسنة أثناء الرحلات الطويلة.',
                    'specifications' => '<ul><li>تصميم مريح وبيئة عمل</li><li>رغوة ذاكرة</li><li>تناسب عام</li><li>تركيب سهل</li><li>غطاء قابل للتنفس</li></ul>',
                    'details' => '<p>وسادة مسند ذراع ComfortDrive بتصميم مريح ورغوة ذاكرة لراحة محسنة أثناء القيادة الطويلة. تناسب عام مع تركيب سهل.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-612355?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-137863?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708601?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-719855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-411149?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-542472?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'واقي نافذة السيارة AutoShade',
                    'description' => 'واقي نافذة فاخر للحماية من الأشعة فوق البنفسجية والتحكم في درجة الحرارة.',
                    'specifications' => '<ul><li>حماية من الأشعة فوق البنفسجية</li><li>التحكم في درجة الحرارة</li><li>تركيب سهل</li><li>تصميم قابل للطي</li><li>تناسب عام</li></ul>',
                    'details' => '<p>واقي نافذة AutoShade يوفر حماية ممتازة من الأشعة فوق البنفسجية والتحكم في درجة الحرارة. تصميم قابل للطي مع تركيب سهل لجميع السيارات.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-646084?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-049643?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-227690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-748807?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-639179?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-092355?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منظم السيارة SmartStore',
                    'description' => 'منظم سيارة متعدد الحجرات لتخزين وتنظيم فعال.',
                    'specifications' => '<ul><li>تصميم متعدد الحجرات</li><li>مواد متينة</li><li>تركيب سهل</li><li>أحزمة قابلة للتعديل</li><li>حجم مضغوط</li></ul>',
                    'details' => '<p>منظم سيارة SmartStore بتصميم متعدد الحجرات لتخزين فعال. مواد متينة مع أحزمة قابلة للتعديل لتركيب آمن.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-111547?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-051044?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-210743?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-396136?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-812323?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-206467?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'إضاءة محيطية ذكية SmartGlow',
                    'description' => 'نظام إضاءة محيطية LED لتحسين أجواء المقصورة الداخلية.',
                    'specifications' => '<ul><li>تقنية LED</li><li>ألوان متعددة</li><li>تحكم عن بعد</li><li>تركيب سهل</li><li>استهلاك طاقة منخفض</li></ul>',
                    'details' => '<p>نظام إضاءة محيطية SmartGlow بتقنية LED وخيارات ألوان متعددة. تشغيل بالتحكم عن بعد مع تركيب سهل واستهلاك طاقة منخفض.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'الطول', 'options' => ['2 متر', '3 أمتار', '5 أمتار']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-308117?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-694270?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-564205?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-417530?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573520?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-727843?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'أداة تنظيف بقبضة مزدوجة',
                    'description' => 'أداة تنظيف متعددة الاستخدامات بقبضة مزدوجة للعناية الداخلية والصيانة.',
                    'specifications' => '<ul><li>تصميم بقبضة مزدوجة</li><li>ملحقات من الألياف الدقيقة</li><li>مقبض مريح</li><li>وسادات قابلة للغسل</li><li>استخدام على أسطح متعددة</li></ul>',
                    'details' => '<p>أداة تنظيف بقبضة مزدوجة بتصميم متعدد الاستخدامات للعناية الداخلية. تشمل ملحقات من الألياف الدقيقة ومقبضًا مريحًا لتنظيف فعال.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-959292?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-642486?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-350999?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-845906?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-755314?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-085568?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'وسادة دعم الرقبة لمقعد السيارة',
                    'description' => 'وسادة دعم رقبة مريحة وبيئة العمل لتجربة قيادة وركوب مريحة.',
                    'specifications' => '<ul><li>تصميم مريح وبيئة عمل</li><li>قلب رغوة ذاكرة</li><li>حزام قابل للتعديل</li><li>غطاء قابل للتنفس</li><li>تناسب عام</li></ul>',
                    'details' => '<p>وسادة دعم الرقبة لمقعد السيارة بتصميم مريح وقلب رغوة ذاكرة لراحة مثالية. حزام قابل للتعديل بغطاء قابل للتنفس لجميع السيارات.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-203647?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-911908?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-299821?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-393927?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-584955?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-798967?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'إكسسوارات خارجية' => [
                [
                    'name' => 'غطاء سيارة مقاوم للماء',
                    'description' => 'غطاء سيارة فاخر مقاوم للماء لحماية لجميع الفصول.',
                    'specifications' => '<ul><li>مادة مقاومة للماء</li><li>حماية من الأشعة فوق البنفسجية</li><li>قماش قابل للتنفس</li><li>حاشية مطاطية</li><li>تشمل حقيبة تخزين</li></ul>',
                    'details' => '<p>غطاء سيارة فاخر مقاوم للماء يوفر حماية كاملة من المطر والثلج والأشعة فوق البنفسجية والغبار. قماش قابل للتنفس يمنع تراكم الرطوبة.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['صغير', 'متوسط', 'كبير', 'كبير جدًا']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-474644?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-040253?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-115777?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-464246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-073293?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-260908?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'واقي باب السيارة غير القابل للكسر',
                    'description' => 'واقي باب متين للحماية من المطر والتهوية.',
                    'specifications' => '<ul><li>مادة غير قابلة للكسر</li><li>حماية من المطر</li><li>تركيب سهل</li><li>تصميم انسيابي</li><li>طقم من 4 قطع</li></ul>',
                    'details' => '<p>واقي باب غير قابل للكسر مصنوع من مواد عالية الجودة للحماية من المطر مع السماح بتدوير الهواء النقي. تركيب سهل بتصميم انسيابي.</p>',
                    'price' => 45.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'أسود', 'رمادي']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-972776?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-687621?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-170485?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-947016?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-659969?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-185684?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'واقيات الطين لعجلات السيارة',
                    'description' => 'واقيات طين شديدة التحمل لحماية العجلات ونظافتها.',
                    'specifications' => '<ul><li>بناء شديد التحمل</li><li>مادة مرنة</li><li>تركيب سهل</li><li>تناسب عام</li><li>طقم من 4 قطع</li></ul>',
                    'details' => '<p>واقيات طين شديدة التحمل مصممة لحماية سيارتك والسيارات الأخرى من الطين والصخور والحطام. مادة مرنة بتصميم يناسب جميع السيارات.</p>',
                    'price' => 35.99,
                    'cover_image' => 'https://images.unsplash.com/photo-868621?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-755105?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-751394?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-382085?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-940790?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-115619?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شريط كروم زخرفي للسيارة',
                    'description' => 'شريط كروم زخرفي لتحسين مظهر السيارة.',
                    'specifications' => '<ul><li>لمسة كروم</li><li>تصميم مرن</li><li>ذاتي اللصق</li><li>مقاوم للعوامل الجوية</li><li>أطوال متعددة متاحة</li></ul>',
                    'details' => '<p>شريط كروم زخرفي لتحسين مظهر السيارة. تركيب ذاتي اللصق بتصميم مرن ولفة كروم مقاومة للعوامل الجوية.</p>',
                    'price' => 25.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'أحمر', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-170007?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-420444?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-976972?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-902998?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-717676?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-400330?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ملصقات رسومات جانبية للسيارات',
                    'description' => 'ملصقات جرافيك فاخرة من الفينيل لتخصيص السيارة.',
                    'specifications' => '<ul><li>مادة فينيل فاخرة</li><li>مقاومة للعوامل الجوية</li><li>تطبيق سهل</li><li>تصاميم متعددة</li><li>تشمل زوجًا</li></ul>',
                    'details' => '<p>ملصقات جرافيك فاخرة من الفينيل لتخصيص السيارة. مادة مقاومة للعوامل الجوية مع تطبيق سهل وخيارات تصميم متعددة متاحة.</p>',
                    'price' => 39.99,
                    'variants' => [
                        ['name' => 'اللون', 'options' => ['أبيض', 'أصفر', 'أسود', 'أزرق']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-236813?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-994325?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-803670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303430?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-048876?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-989480?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قضبان سقف سوداء تناسب جميع السيارات',
                    'description' => 'قضبان سقف سوداء عامة لزيادة قدرة حمل الأمتعة.',
                    'specifications' => '<ul><li>تناسب عام</li><li>لمسة سوداء</li><li>سعة تحميل عالية</li><li>تركيب سهل</li><li>تصميم انسيابي</li></ul>',
                    'details' => '<p>قضبان سقف سوداء عامة مصممة لجميع السيارات لزيادة قدرة حمل الأمتعة. تصميم انسيابي بسعة تحميل عالية وتركيب سهل.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-542974?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-177762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-059864?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462892?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646778?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-868280?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'إطارات لوحة أرقام من الفولاذ المقاوم للصدأ',
                    'description' => 'إطارات لوحة أرقام فاخرة من الفولاذ المقاوم للصدأ للمتانة.',
                    'specifications' => '<ul><li>بناء من الفولاذ المقاوم للصدأ</li><li>مقاوم للصدأ</li><li>تركيب سهل</li><li>تناسب عام</li><li>طقم من إطارين</li></ul>',
                    'details' => '<p>إطارات لوحة أرقام فاخرة من الفولاذ المقاوم للصدأ توفر متانة فائقة ومقاومة للصدأ. تناسب عام مع تركيب سهل للوحات الأمامية والخلفية.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-987688?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-444455?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-274467?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-080702?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-882849?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-489151?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شفرة مساحات اقتصادية',
                    'description' => 'شفرة مساحات فعالة من حيث التكلفة لرؤية واضحة في جميع الأحوال الجوية.',
                    'specifications' => '<ul><li>تصميم اقتصادي</li><li>أداء لجميع الفصول</li><li>تركيب سهل</li><li>مقاسات متعددة</li><li>مطاط متين</li></ul>',
                    'details' => '<p>شفرة مساحات اقتصادية توفر أداءً موثوقًا في جميع الظروف الجوية. بناء مطاطي متين مع تركيب سهل وخيارات مقاسات متعددة.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-811106?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-148688?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-869464?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-253825?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-868759?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-763870?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'جناح سبويلر صغير للسيارات لجميع السيارات',
                    'description' => 'جناح سبويلر صغير عام لتحسين الديناميكا الهوائية والأناقة.',
                    'specifications' => '<ul><li>تناسب عام</li><li>تصميم انسيابي</li><li>بناء خفيف الوزن</li><li>تركيب سهل</li><li>ألوان متعددة</li></ul>',
                    'details' => '<p>جناح سبويلر صغير عام مصمم لجميع السيارات لتحسين الديناميكا الهوائية والمظهر. بناء خفيف الوزن مع تركيب سهل وخيارات ألوان متعددة.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-969067?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-249930?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-799832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-625353?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-171541?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-835500?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'غطاء مصباح الضباب الأمامي',
                    'description' => 'غطاء مصباح ضباب وقائي لمتانة وأناقة معززتين.',
                    'specifications' => '<ul><li>تصميم وقائي</li><li>متانة معززة</li><li>تركيب سهل</li><li>تناسب مثالي</li><li>تشمل زوجًا</li></ul>',
                    'details' => '<p>غطاء مصباح ضباب أمامي وقائي مصمم لتعزيز المتانة والأناقة. تناسب مثالي مع تركيب سهل ويشمل زوجًا لحماية كاملة.</p>',
                    'price' => 55.99,
                    'cover_image' => 'https://images.unsplash.com/photo-082980?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-906334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-199878?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-079612?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-986826?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-122061?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'إلكترونيات السيارة' => [
                [
                    'name' => 'شاحن سيارة Voltmax بقدرة 85 واط',
                    'description' => 'شاحن سيارة عالي الطاقة بقدرة 85 واط لشحن سريع للجوال.',
                    'specifications' => '<ul><li>شحن سريع 85 واط</li><li>منافذ USB متعددة</li><li>مؤشر LED</li><li>حماية من الشحن الزائد</li><li>توافق عام</li></ul>',
                    'details' => '<p>شاحن سيارة Voltmax بقدرة 85 واط يوفر شحنًا سريعًا للأجهزة المحمولة بمنافذ USB متعددة وميزات حماية السلامة.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-559994?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-748810?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-930236?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-798091?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-372451?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-966050?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كاميرا داش كام مصغرة Garmin Mini 3',
                    'description' => 'كاميرا داش كام مدمجة بتسجيل فيديو عالي الجودة وميزات ذكية.',
                    'specifications' => '<ul><li>تسجيل عالي الدقة 1080p</li><li>مجال رؤية 140 درجة</li><li>رؤية ليلية</li><li>مستشعر G</li><li>تسجيل حلقي</li></ul>',
                    'details' => '<p>كاميرا داش كام Garmin Mini 3 بتصميم مدمج، وتسجيل عالي الدقة 1080p، وميزات ذكية لحماية قيادة شاملة.</p>',
                    'price' => 199.99,
                    'cover_image' => 'https://images.unsplash.com/photo-561665?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-609023?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-869781?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-506348?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-690109?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-036113?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'نظام حساسات ركن للركن العكسي',
                    'description' => 'نظام حساسات ركن متطور لمساعدة آمنة عند الرجوع والركن.',
                    'specifications' => '<ul><li>4 حساسات فوق صوتية</li><li>تنبيهات صوتية</li><li>شاشة LED</li><li>مقاوم للعوامل الجوية</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>نظام حساسات ركن عكسي متطور بأربعة حساسات فوق صوتية توفر تنبيهات صوتية وشاشة LED لمساعدة آمنة عند الركن.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'عدد الحساسات', 'options' => ['4 حساسات', '6 حساسات', '8 حساسات']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-239730?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-922481?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-245659?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-523395?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315598?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-479105?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'كاميرا خلفية للركن والرجوع للسيارة',
                    'description' => 'كاميرا خلفية عالية الدقة لرؤية خلفية واضحة.',
                    'specifications' => '<ul><li>دقة عالية</li><li>رؤية ليلية</li><li>تصميم مقاوم للماء</li><li>زاوية رؤية واسعة</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>كاميرا خلفية عالية الدقة توفر رؤية خلفية واضحة مع رؤية ليلية وتصميم مقاوم للماء لجميع الظروف الجوية.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-178226?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-662036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-533909?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-728551?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-478919?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-966088?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ملاحة GPS بقياس 7 بوصة للسيارة',
                    'description' => 'نظام ملاحة GPS كبير بقياس 7 بوصة مع تحديثات حركة المرور اللحظية.',
                    'specifications' => '<ul><li>شاشة لمس 7 بوصة</li><li>حركة مرور لحظية</li><li>إرشاد صوتي</li><li>تحديثات خرائط مدى الحياة</li><li>اتصال بلوتوث</li></ul>',
                    'details' => '<p>نظام ملاحة GPS بقياس 7 بوصة بشاشة لمس كبيرة وتحديثات مرور لحظية وإرشاد صوتي وتحديثات خرائط مدى الحياة لملاحة مريحة.</p>',
                    'price' => 179.99,
                    'cover_image' => 'https://images.unsplash.com/photo-162486?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-340216?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-991327?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871597?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-887734?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-170919?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مشغل أندرويد للسيارة بمقبضين',
                    'description' => 'ستيريو سيارة متطور بنظام أندرويد مع تحكم بمقبضين وميزات ذكية.',
                    'specifications' => '<ul><li>نظام تشغيل أندرويد</li><li>تحكم بمقبضين</li><li>اتصال بلوتوث</li><li>مدخل USB/AUX</li><li>شاشة لمس</li></ul>',
                    'details' => '<p>ستيريو سيارة متطور بنظام أندرويد مع تحكم بمقبضين وشاشة لمس وخيارات اتصال شاملة لتجربة قيادة محسنة.</p>',
                    'price' => 299.99,
                    'variants' => [
                        ['name' => 'حجم الشاشة', 'options' => ['7 بوصة', '9 بوصة', '10 بوصة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-852533?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-802444?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-932548?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-948103?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559983?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-013160?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'محول بلوتوث لاسلكي للإرسال والاستقبال',
                    'description' => 'محول بلوتوث متعدد الاستخدامات للإرسال والاستقبال اللاسلكي للصوت.',
                    'specifications' => '<ul><li>بلوتوث 5.0</li><li>أوضاع الإرسال والاستقبال</li><li>عمر بطارية طويل</li><li>مقبس صوت 3.5 ملم</li><li>زمن استجابة منخفض</li></ul>',
                    'details' => '<p>محول بلوتوث متعدد الاستخدامات بأوضاع إرسال واستقبال، وتقنية بلوتوث 5.0، وعمر بطارية طويل لحلول صوت لاسلكية.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-573663?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-436763?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-170662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-425856?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-923019?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-589985?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'نظام مراقبة ضغط الإطارات TPMS',
                    'description' => 'نظام متطور لمراقبة ضغط الإطارات للسلامة وكفاءة الوقود.',
                    'specifications' => '<ul><li>مراقبة لحظية</li><li>حساسات لاسلكية</li><li>شاشة LCD</li><li>مراقبة درجة الحرارة</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>نظام TPMS متطور يوفر مراقبة لحظية لضغط الإطارات ودرجة الحرارة بحساسات لاسلكية وشاشة LCD لتعزيز السلامة.</p>',
                    'price' => 159.99,
                    'cover_image' => 'https://images.unsplash.com/photo-009104?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-474499?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-811626?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-668721?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-307683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-020100?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مكنسة كهربائية محمولة باليد',
                    'description' => 'مكنسة كهربائية محمولة باليد لتنظيف داخل السيارة.',
                    'specifications' => '<ul><li>تصميم بدون أسلاك</li><li>قوة شفط قوية</li><li>ملحقات متعددة</li><li>بطارية قابلة للشحن</li><li>حجم مضغوط</li></ul>',
                    'details' => '<p>مكنسة كهربائية محمولة باليد بتصميم بدون أسلاك وقوة شفط قوية وملحقات متعددة لتنظيف شامل لداخل السيارة.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-738587?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-478781?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-840560?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-543611?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-829654?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-196264?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'شاشة عرض ذكية للسرعة HUD للسيارة',
                    'description' => 'شاشة عرض أمامية تعرض السرعة ومعلومات القيادة على الزجاج الأمامي.',
                    'specifications' => '<ul><li>عرض HUD</li><li>عرض السرعة</li><li>اتصال OBD2</li><li>سطوع تلقائي</li><li>أوضاع عرض متعددة</li></ul>',
                    'details' => '<p>شاشة HUD ذكية للسيارة تعرض السرعة ومعلومات القيادة مباشرة على الزجاج الأمامي مع اتصال OBD2 وضبط سطوع تلقائي.</p>',
                    'price' => 119.99,
                    'cover_image' => 'https://images.unsplash.com/photo-286477?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-655963?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-795006?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-894869?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-929310?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-497431?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'السلامة والأمان' => [
                [
                    'name' => 'إنذار أمان السيارة Sentinel X',
                    'description' => 'نظام إنذار أمان متطور للسيارة مع تحكم عن بعد واتصال بالهاتف الذكي.',
                    'specifications' => '<ul><li>تحكم عن بعد</li><li>اتصال بالهاتف الذكي</li><li>مستشعر صدمات</li><li>إنذار صفارة</li><li>مؤشر LED</li></ul>',
                    'details' => '<p>نظام إنذار أمان متطور للسيارة Sentinel X مع تحكم عن بعد واتصال بالهاتف الذكي وحساسات متعددة لحماية شاملة للمركبة.</p>',
                    'price' => 199.99,
                    'variants' => [
                        ['name' => 'المدى', 'options' => ['500م', '1كم', '2كم']],
                        ['name' => 'الميزات', 'options' => ['أساسية', 'فاخرة', 'احترافية']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-465111?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-757160?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-621158?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-316557?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220261?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220903?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قفل مقود سيارة شديد التحمل',
                    'description' => 'قفل مقود شديد التحمل لأقصى أمان للمركبة.',
                    'specifications' => '<ul><li>فولاذ شديد التحمل</li><li>تناسب عام</li><li>رادع مرئي</li><li>تركيب سهل</li><li>حماية من السرقة</li></ul>',
                    'details' => '<p>قفل مقود شديد التحمل مصنوع من فولاذ معزز يوفر أقصى أمان ورادعًا مرئيًا ضد سرقة المركبات.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-346638?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-382681?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-110397?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-561751?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-090667?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-887373?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قفل عجلة سيارة شديد التحمل مضاد للسرقة',
                    'description' => 'قفل عجلة شديد التحمل لحماية شاملة مضادة للسرقة.',
                    'specifications' => '<ul><li>بناء شديد التحمل</li><li>تصميم مشبك عجلة</li><li>مقاوم للعوامل الجوية</li><li>قفل عالي الأمان</li><li>لون أصفر فاقع</li></ul>',
                    'details' => '<p>قفل عجلة شديد التحمل بتصميم مشبك يوفر حماية شاملة مضادة للسرقة. بناء مقاوم للعوامل الجوية بآلية قفل عالية الأمان.</p>',
                    'price' => 149.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['صغير', 'متوسط', 'كبير']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-915717?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-007353?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-107087?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-490460?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-368509?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-630592?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'طفاية حريق بمسحوق جاف ABC',
                    'description' => 'طفاية حريق بمسحوق جاف ABC لحماية شاملة من الحرائق.',
                    'specifications' => '<ul><li>مسحوق جاف ABC</li><li>حماية متعددة الفئات</li><li>مقياس ضغط</li><li>تشمل حامل حائط</li><li>سلامة معتمدة</li></ul>',
                    'details' => '<p>طفاية حريق بمسحوق جاف ABC توفر حماية متعددة الفئات للمركبات. تشمل مقياس ضغط وحامل حائط للوصول السهل.</p>',
                    'price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-913223?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-771738?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-014582?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-546515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-945991?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-691814?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حقيبة صحية للطوارئ',
                    'description' => 'حقيبة صحية شاملة للطوارئ للمواقف الطبية على جانب الطريق.',
                    'specifications' => '<ul><li>لوازم شاملة</li><li>تصميم مضغوط</li><li>أدوية طارئة</li><li>دليل تعليمات</li><li>حقيبة متينة</li></ul>',
                    'details' => '<p>حقيبة صحية شاملة للطوارئ تحتوي على اللوازم الطبية الأساسية لحالات الطوارئ على جانب الطريق. تصميم مضغوط بحقيبة حمل متينة.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-778966?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-733395?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-065146?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-358193?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-459530?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-431309?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'حقيبة إسعافات أولية مقاومة للماء',
                    'description' => 'حقيبة إسعافات أولية مقاومة للماء للاستعداد للطوارئ في جميع الأحوال الجوية.',
                    'specifications' => '<ul><li>حقيبة مقاومة للماء</li><li>لوازم إسعافات أولية كاملة</li><li>حجرات منظمة</li><li>دليل طوارئ</li><li>حجم مضغوط</li></ul>',
                    'details' => '<p>حقيبة إسعافات أولية مقاومة للماء مع لوازم طبية كاملة في حجرات منظمة. تشمل دليل طوارئ وحقيبة مقاومة للماء مضغوطة لجميع الظروف.</p>',
                    'price' => 69.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['مضغوط', 'قياسي', 'كبير']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-058378?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-182539?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-568284?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-698253?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593761?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-551480?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مثلثات تحذيرية عاكسة للطوارئ متعددة الاستخدامات',
                    'description' => 'مثلثات تحذيرية عاكسة للطوارئ لسلامة ورؤية على جانب الطريق.',
                    'specifications' => '<ul><li>رؤية عالية</li><li>مادة عاكسة</li><li>تصميم قابل للطي</li><li>قاعدة ثابتة</li><li>طقم من 3 مثلثات</li></ul>',
                    'details' => '<p>مثلثات تحذيرية عاكسة متعددة الاستخدامات توفر رؤية عالية للسلامة على جانب الطريق. تصميم قابل للطي بقاعدة ثابتة، طقم من 3 مثلثات.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-903094?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-479871?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-917304?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-127002?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-635138?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-973330?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'أحزمة تمديد حزام أمان السيارة',
                    'description' => 'أحزمة تمديد حزام أمان قابلة للتعديل لراحة وأمان معززين.',
                    'specifications' => '<ul><li>طول قابل للتعديل</li><li>معتمد للسلامة</li><li>توافق عام</li><li>مواد متينة</li><li>تركيب سهل</li></ul>',
                    'details' => '<p>أحزمة تمديد حزام أمان قابلة للتعديل توفر راحة وأمانًا معززين. معتمدة للسلامة بتوافق عام وبناء متين.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-235500?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-409840?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143090?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-018572?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-407828?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-958519?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مضخة هواء إطارات Galaxy',
                    'description' => 'مضخة هواء إطارات محمولة بشاشة رقمية وإيقاف تلقائي.',
                    'specifications' => '<ul><li>شاشة رقمية</li><li>إيقاف تلقائي</li><li>تصميم محمول</li><li>طاقة 12 فولت</li><li>ملحقات متعددة</li></ul>',
                    'details' => '<p>مضخة هواء إطارات محمولة من Galaxy بشاشة رقمية وميزة إيقاف تلقائي. تعمل بطاقة 12 فولت مع ملحقات متعددة لاحتياجات النفخ المختلفة.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-787538?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-384731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-775624?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-474864?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-597790?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-655505?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'جهاز تشغيل بطارية ذكي ونافخ إطارات',
                    'description' => 'جهاز متعدد الوظائف يجمع بين قدرات تشغيل البطارية ونفخ الإطارات.',
                    'specifications' => '<ul><li>وظيفة تشغيل البطارية</li><li>نافخ إطارات</li><li>منافذ شحن USB</li><li>مصباح LED</li><li>حماية أمان</li></ul>',
                    'details' => '<p>جهاز ذكي متعدد الوظائف يجمع بين تشغيل البطارية ونفخ الإطارات مع منافذ شحن USB ومصباح LED وحماية أمان شاملة.</p>',
                    'price' => 199.99,
                    'cover_image' => 'https://images.unsplash.com/photo-165630?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-503679?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-131720?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-402722?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-636752?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-140652?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'التنظيف والصيانة' => [
                [
                    'name' => 'شامبو غسيل سيارة رغوي',
                    'description' => 'شامبو غسيل سيارة رغوي فاخر لتنظيف عميق ولمعان.',
                    'specifications' => '<ul><li>صيغة رغوة غنية</li><li>متوازن الأس الهيدروجيني</li><li>آمن لجميع الدهانات</li><li>صيغة مركزة</li><li>قابل للتحلل</li></ul>',
                    'details' => '<p>شامبو غسيل سيارة رغوي فاخر بصيغة رغوة غنية يوفر تنظيفًا عميقًا مع كونه آمنًا لجميع الدهانات. مركز وقابل للتحلل.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'الحجم', 'options' => ['500 مل', '1 لتر', '2 لتر']],
                        ['name' => 'النوع', 'options' => ['عادي', 'معزز بالشمع', 'آمن للسيراميك']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-141342?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-225576?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646750?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-605331?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-396036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-035220?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قماش تنظيف السيارة من الألياف الدقيقة',
                    'description' => 'قماش تنظيف فائق النعومة من الألياف الدقيقة لعناية بالسيارة بدون خدوش.',
                    'specifications' => '<ul><li>ألياف دقيقة فائقة النعومة</li><li>تنظيف بدون خدوش</li><li>عالي الامتصاص</li><li>قابل للغسل في الغسالة</li><li>بدون وبر</li></ul>',
                    'details' => '<p>قماش تنظيف فائق النعومة من الألياف الدقيقة مصمم للعناية بالسيارة بدون خدوش. عالي الامتصاص وقابل للغسل في الغسالة لاستخدام طويل.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-188837?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-259908?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-766349?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-864877?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-191809?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-134362?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مكنسة كهربائية بدون أسلاك للسيارة',
                    'description' => 'مكنسة كهربائية قوية بدون أسلاك مصممة خصيصًا لداخل السيارة.',
                    'specifications' => '<ul><li>تشغيل بدون أسلاك</li><li>قوة شفط قوية</li><li>ملحقات متعددة</li><li>بطارية قابلة للشحن</li><li>تصميم مضغوط</li></ul>',
                    'details' => '<p>مكنسة كهربائية قوية بدون أسلاك بقوة شفط عالية وملحقات متعددة لتنظيف شامل لداخل السيارة. مضغوطة وقابلة لإعادة الشحن.</p>',
                    'price' => 129.99,
                    'variants' => [
                        ['name' => 'القوة', 'options' => ['120 واط', '150 واط', '180 واط']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-729969?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-891760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-445131?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-029460?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-946662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-560793?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ملمع وشمع سيراميك Hybrid Solutions',
                    'description' => 'ملمع وشمع سيراميك متقدم لحماية ولمعان فائقين.',
                    'specifications' => '<ul><li>تقنية سيراميك</li><li>حماية تدوم طويلاً</li><li>لمسة لمعان عالية</li><li>حماية من الأشعة فوق البنفسجية</li><li>تطبيق سهل</li></ul>',
                    'details' => '<p>ملمع وشمع سيراميك هجين متقدم يوفر حماية فائقة ولفة لمعان عالية. صيغة تدوم طويلاً مع حماية من الأشعة فوق البنفسجية وتطبيق سهل.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-398942?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-321940?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-161512?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-966521?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-120766?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-457892?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'منظف مركز للعجلات والإطارات',
                    'description' => 'منظف مركز للعجلات والإطارات لتنظيف عميق وترميم.',
                    'specifications' => '<ul><li>صيغة مركزة</li><li>تنظيف عميق</li><li>آمن لجميع العجلات</li><li>يزيل غبار الفرامل</li><li>قابل للتحلل</li></ul>',
                    'details' => '<p>منظف مركز للعجلات والإطارات بفعل تنظيف عميق آمن لجميع أنواع العجلات. يزيل غبار الفرامل والأوساخ بفعالية مع كونه قابلًا للتحلل.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-523359?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-395385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-916751?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-049808?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-282526?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-921508?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'معطر جو ليمون جراس للسيارة',
                    'description' => 'معطر جو طبيعي برائحة الليمون جراس لعطر سيارات يدوم طويلاً.',
                    'specifications' => '<ul><li>رائحة ليمون جراس طبيعية</li><li>عطر يدوم طويلاً</li><li>صيغة غير سامة</li><li>تركيب سهل</li><li>شدة قابلة للتعديل</li></ul>',
                    'details' => '<p>معطر جو طبيعي برائحة الليمون جراس يوفر عطرًا يدوم طويلاً بصيغة غير سامة. تركيب سهل مع تحكم في الشدة قابل للتعديل.</p>',
                    'price' => 14.99,
                    'cover_image' => 'https://images.unsplash.com/photo-439708?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-422879?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-088278?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-228769?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-100300?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-685364?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'طقم العناية الأساسي بالسيارة',
                    'description' => 'طقم عناية كامل بالسيارة مع منتجات تنظيف وصيانة أساسية.',
                    'specifications' => '<ul><li>طقم عناية كامل</li><li>منتجات متعددة</li><li>جودة احترافية</li><li>علبة تخزين</li><li>دليل إرشادي</li></ul>',
                    'details' => '<p>طقم عناية أساسي كامل بالسيارة يحتوي على منتجات تنظيف وصيانة متعددة بجودة احترافية مع علبة تخزين ودليل إرشادي.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-974304?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-130782?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-263855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-278282?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-964136?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-903272?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'إصلاح خدوش السيارة',
                    'description' => 'محلول احترافي لإصلاح الخدوش لترميم طلاء السيارة.',
                    'specifications' => '<ul><li>صيغة احترافية</li><li>تطبيق سهل</li><li>مطابقة الألوان</li><li>إصلاح دائم</li><li>آمن للطبقة الشفافة</li></ul>',
                    'details' => '<p>محلول احترافي لإصلاح خدوش السيارة بتطبيق سهل وتقنية مطابقة الألوان لإصلاح دائم للطلاء. آمن للطبقات الشفافة.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-674404?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-131037?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315725?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-958544?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-168906?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558517?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'مركز سائل غسيل الزجاج الأمامي',
                    'description' => 'سائل غسيل زجاج مركّز لرؤية واضحة تمامًا.',
                    'specifications' => '<ul><li>صيغة مركزة</li><li>حماية لجميع الفصول</li><li>تنظيف بدون خطوط</li><li>خصائص مضادة للتجمد</li><li>قابل للتحلل</li></ul>',
                    'details' => '<p>سائل غسيل زجاج مركّز يوفر حماية لجميع الفصول مع تنظيف بدون خطوط وخصائص مضادة للتجمد. صيغة قابلة للتحلل.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-748380?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-065696?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-948454?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-756691?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-274636?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-003235?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قماش تنظيف الألياف الدقيقة وطقم غسيل للسيارة',
                    'description' => 'طقم كامل من قماش التنظيف من الألياف الدقيقة وطقم الغسيل لعناية شاملة بالسيارة.',
                    'specifications' => '<ul><li>أقمشة ألياف دقيقة متعددة</li><li>قفاز غسيل مرفق</li><li>أنواع مختلفة من الأقمشة</li><li>قابل للغسل في الغسالة</li><li>حقيبة تخزين</li></ul>',
                    'details' => '<p>طقم كامل من قماش التنظيف من الألياف الدقيقة وطقم غسيل بأنواع أقمشة متعددة وقفاز غسيل لعناية شاملة بالسيارة. يشمل حقيبة تخزين وقابل للغسل في الغسالة.</p>',
                    'price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-300452?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-474690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-327662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-727704?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-663082?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-357651?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الدمى القطيفة' => [
                [
                    'name' => 'دبدوب بني كبير جدًا قطيفة',
                    'description' => 'دبدوب بني قطيفة كبير جدًا مثالي للعناق والراحة.',
                    'specifications' => '<ul><li>حجم كبير جدًا</li><li>مادة قطيفة بنية</li><li>ناعم ودافئ</li><li>آمن لجميع الأعمار</li><li>قابل للغسل في الغسالة</li></ul>',
                    'details' => '<p>دبدوب بني كبير جدًا مصنوع من مادة قطيفة فاخرة. رفيق مثالي للأطفال يوفر الراحة والأمان بتصميم قابل للغسل في الغسالة.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['كبير (36 بوصة)', 'كبير جدًا (48 بوصة)', 'عملاق (60 بوصة)']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-432840?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-780084?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-681684?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-061490?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-672269?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-997243?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لعبة فيل قطيفة جالس من Babique',
                    'description' => 'لعبة فيل قطيفة جالس لطيفة بتفاصيل واقعية وملمس ناعم.',
                    'specifications' => '<ul><li>تصميم بوضعية الجلوس</li><li>ملامح فيل واقعية</li><li>قطيفة فائقة النعومة</li><li>مواد آمنة</li><li>منذ الولادة فما فوق</li></ul>',
                    'details' => '<p>لعبة فيل قطيفة من Babique بوضعية الجلوس بملامح واقعية وملمس فائق النعومة. مصنوعة من مواد آمنة مثالية للأطفال من جميع الأعمار.</p>',
                    'price' => 45.99,
                    'cover_image' => 'https://images.unsplash.com/photo-405212?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-302366?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-689270?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-911962?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-284922?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247022?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لعبة قطة بنية ناعمة للأطفال',
                    'description' => 'لعبة قطة بنية لطيفة بملامح واقعية وتصميم دافئ.',
                    'specifications' => '<ul><li>تصميم قطة واقعي</li><li>فرو قطيفة بني</li><li>ناعمة ودافئة</li><li>مواد آمنة للأطفال</li><li>من 3 سنوات فما فوق</li></ul>',
                    'details' => '<p>لعبة قطة بنية لطيفة بملامح واقعية وتصميم دافئ. مصنوعة من مواد آمنة للأطفال مع فرو قطيفة ناعم للعب مريح.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-128129?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-482886?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-190846?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558070?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-276968?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-431534?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'وسادة قطيفة محشوة لعبة ناعمة لطيفة',
                    'description' => 'وسادة قطيفة متعددة الوظائف تعمل أيضًا كلعبة ناعمة للراحة.',
                    'specifications' => '<ul><li>تصميم ثنائي الغرض</li><li>وظيفة وسادة ولعبة</li><li>مادة فائقة النعومة</li><li>حشوة مضادة للحساسية</li><li>قابلة للغسل في الغسالة</li></ul>',
                    'details' => '<p>وسادة قطيفة لطيفة تعمل كوسادة مريحة ولعبة ناعمة رائعة. مادة فائقة النعومة بحشوة مضادة للحساسية وقابلة للغسل في الغسالة.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-975672?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-714955?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-195180?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-369665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-436130?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-524923?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'دبدوب قطيفة موسيقي لعبة',
                    'description' => 'دبدوب موسيقي تفاعلي يعزف ألحانًا وأصواتًا مهدئة.',
                    'specifications' => '<ul><li>صندوق موسيقى مدمج</li><li>ألحان مهدئة</li><li>مادة قطيفة ناعمة</li><li>يعمل بالبطارية</li><li>منذ الولادة فما فوق</li></ul>',
                    'details' => '<p>دبدوب قطيفة موسيقي بصندوق موسيقى مدمج يعزف ألحانًا مهدئة. مادة قطيفة ناعمة مع ميزات موسيقية تعمل بالبطارية للراحة والترفيه.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'المقاس', 'options' => ['كبير (36 بوصة)', 'كبير جدًا (48 بوصة)', 'عملاق (60 بوصة)']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-329556?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-381794?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-432740?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-746262?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-036069?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-782285?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'قرد قطيفة لطيف جدًا لعبة ناعمة',
                    'description' => 'قرد قطيفة لطيف جدًا بملامح رائعة وملمس ناعم.',
                    'specifications' => '<ul><li>تصميم قرد لطيف</li><li>قطيفة فائقة النعومة</li><li>ملامح وجه لطيفة</li><li>آمن للأطفال</li><li>منذ الولادة فما فوق</li></ul>',
                    'details' => '<p>قرد قطيفة لطيف جدًا بملامح رائعة وملمس ناعم بشكل لا يصدق. آمن للأطفال بملامح وجه لطيفة ومادة قطيفة فاخرة.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-587540?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-461832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-337261?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548604?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-465781?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-595734?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ألعاب محشوة للأطفال طقم من 3 دبدوبات مصغرة',
                    'description' => 'طقم من 3 ألعاب دبدوب مصغرة مثالية للجمع واللعب.',
                    'specifications' => '<ul><li>طقم من 3 دبدوبات مصغرة</li><li>ألوان مختلفة</li><li>حجم مضغوط</li><li>مادة قطيفة ناعمة</li><li>من 3 سنوات فما فوق</li></ul>',
                    'details' => '<p>طقم لطيف من 3 ألعاب دبدوب مصغرة بألوان مختلفة. حجم مضغوط مثالي للجمع والسفر واللعب الخيالي بمادة قطيفة ناعمة.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-561985?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-151723?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-243619?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-960831?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-634892?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-962060?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'دبدوب عملاق كبير لطيف قطيفة',
                    'description' => 'دبدوب قطيفة عملاق الحجم لطيف لتجربة عناق فائقة.',
                    'specifications' => '<ul><li>حجم عملاق</li><li>قطيفة فائقة النعومة</li><li>تصميم لطيف</li><li>جودة فاخرة</li><li>منذ الولادة فما فوق</li></ul>',
                    'details' => '<p>دبدوب قطيفة لطيف بحجم عملاق يوفر تجربة عناق فائقة. مادة قطيفة فائقة النعومة بجودة فاخرة وتصميم رائع.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-001944?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-557167?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-787365?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-932838?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654607?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-651251?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لعبة حيوان محشو قطيفة',
                    'description' => 'لعبة حيوان محشو قطيفة متعددة الاستخدامات متوفرة بتصاميم حيوانات متنوعة.',
                    'specifications' => '<ul><li>خيارات حيوانات متنوعة</li><li>تصميم محشو ناعم</li><li>قطيفة عالية الجودة</li><li>مواد آمنة</li><li>منذ الولادة فما فوق</li></ul>',
                    'details' => '<p>لعبة حيوان محشو قطيفة متعددة الاستخدامات متوفرة بتصاميم حيوانات لطيفة متنوعة. مادة قطيفة عالية الجودة ببناء آمن للأطفال من جميع الأعمار.</p>',
                    'price' => 42.99,
                    'cover_image' => 'https://images.unsplash.com/photo-173373?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-705286?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-455158?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-297695?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-685599?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871843?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'دمية قفاز Tommy للعرائس',
                    'description' => 'دمية قفاز Tommy تفاعلية لسرد القصص واللعب الخيالي.',
                    'specifications' => '<ul><li>تصميم دمية قفاز</li><li>لعب تفاعلي</li><li>بناء قماشي ناعم</li><li>سهلة الاستخدام</li><li>من 3 سنوات فما فوق</li></ul>',
                    'details' => '<p>دمية قفاز Tommy تفاعلية مثالية لسرد القصص واللعب الخيالي. بناء قماشي ناعم بتصميم سهل الاستخدام لعروض دمى مشوقة.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-956566?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-655194?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-631369?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-111207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-414057?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-529443?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'الألعاب التعليمية' => [
                [
                    'name' => 'مكعبات تعلم متعددة الألوان من Sterling',
                    'description' => 'مكعبات تعلم ملونة للبناء والتراص واللعب التعليمي.',
                    'specifications' => '<ul><li>تصميم متعدد الألوان</li><li>مادة بلاستيك آمنة</li><li>أشكال وأحجام متنوعة</li><li>حروف وأرقام تعليمية</li><li>من سنتين فما فوق</li></ul>',
                    'details' => '<p>مكعبات تعلم من Sterling بألوان زاهية متعددة مصممة للبناء والتراص واللعب التعليمي. تتميز بحروف وأرقام لتطوير التعلم المبكر.</p>',
                    'price' => 34.99,
                    'variants' => [
                        ['name' => 'حجم الطقم', 'options' => ['50 قطعة', '100 قطعة', '150 قطعة']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-224418?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-652827?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-813780?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-822609?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-550099?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-419987?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'لعبة أحجية بلاستيكية للأبجدية والأرقام',
                    'description' => 'أحجية بلاستيكية تفاعلية تضم حروف الأبجدية والأرقام للتعلم.',
                    'specifications' => '<ul><li>قطع حروف وأرقام</li><li>بناء بلاستيكي متين</li><li>ألوان زاهية</li><li>قطع سهلة الإمساك</li><li>من 3 سنوات فما فوق</li></ul>',
                    'details' => '<p>لعبة أحجية بلاستيكية تفاعلية تجمع حروف الأبجدية والأرقام لتعلم مبكر شامل. بناء متين بألوان زاهية وقطع سهلة الإمساك.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-148842?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-842262?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-757276?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-369053?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-742947?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-563311?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Toys Wooden Russian Blocks Puzzles',
                    'description' => 'Traditional wooden Russian block puzzles for spatial reasoning and problem-solving.',
                    'specifications' => '<ul><li>Natural wood construction</li><li>Russian block design</li><li>Multiple puzzle configurations</li><li>Smooth finish</li><li>Ages 5+ years</li></ul>',
                    'details' => '<p>Traditional wooden Russian block puzzles designed to develop spatial reasoning and problem-solving skills. Natural wood construction with smooth finish and multiple configurations.</p>',
                    'price' => 39.99,
                    'variants' => [
                        ['name' => 'Difficulty', 'options' => ['Beginner', 'Intermediate', 'Advanced']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-732801?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-527823?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-055641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-998841?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-262411?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-975175?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Ultimate Science STEM Learning Educational Toys',
                    'description' => 'Comprehensive STEM learning kit with science experiments and educational activities.',
                    'specifications' => '<ul><li>100+ science experiments</li><li>STEM learning focus</li><li>Safety tested materials</li><li>Detailed instruction guide</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Ultimate science STEM learning kit featuring over 100 experiments and educational activities. Comprehensive instruction guide with safety-tested materials for hands-on learning.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-955287?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-221338?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-672600?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-780250?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-483735?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-599685?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Montessori Busy Board for Toddlers',
                    'description' => 'Montessori-inspired busy board with various activities for toddler development.',
                    'specifications' => '<ul><li>Montessori method</li><li>Multiple activity stations</li><li>Fine motor skill development</li><li>Safe materials</li><li>Ages 18 months-4 years</li></ul>',
                    'details' => '<p>Montessori-inspired busy board featuring multiple activity stations designed to develop fine motor skills and cognitive abilities in toddlers through hands-on exploration.</p>',
                    'price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-736205?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-567252?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-506776?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-466678?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-996816?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-636226?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Toys Rechargeable Educational Flash Cards',
                    'description' => 'Interactive rechargeable flash cards with audio and visual learning features.',
                    'specifications' => '<ul><li>Rechargeable battery</li><li>Audio pronunciation</li><li>Visual learning cards</li><li>Multiple subjects</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive rechargeable educational flash cards featuring audio pronunciation and visual learning elements. Covers multiple subjects for comprehensive early education.</p>',
                    'price' => 49.99,
                    'variants' => [
                        ['name' => 'Subject', 'options' => ['Alphabet', 'Numbers', 'Animals', 'Mixed']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-757740?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-029390?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-799312?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-085092?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-496711?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-374927?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Wooden Memory Chess Color Matching Game',
                    'description' => 'Wooden memory and color matching game combining chess elements with learning.',
                    'specifications' => '<ul><li>Natural wood construction</li><li>Memory training</li><li>Color matching elements</li><li>Chess-inspired design</li><li>Ages 4+ years</li></ul>',
                    'details' => '<p>Wooden memory chess game combining color matching and memory training elements. Natural wood construction with chess-inspired design for cognitive development.</p>',
                    'price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-714615?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-694129?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-248070?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-876039?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-681334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-566562?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Children Learning & Puzzle Cards',
                    'description' => 'Educational puzzle cards designed for children learning and development.',
                    'specifications' => '<ul><li>Educational content</li><li>Puzzle format</li><li>Durable card material</li><li>Age-appropriate designs</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Educational puzzle cards specifically designed for children learning and development. Durable card material with age-appropriate designs and educational content.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-025143?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-090393?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-542500?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593823?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-658674?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777518?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Kids Alphabet & Number Learning Board',
                    'description' => 'Interactive learning board featuring alphabet letters and numbers for early education.',
                    'specifications' => '<ul><li>Alphabet and numbers</li><li>Interactive features</li><li>Durable construction</li><li>Bright colors</li><li>Ages 2+ years</li></ul>',
                    'details' => '<p>Interactive learning board combining alphabet letters and numbers for comprehensive early education. Features bright colors and durable construction for long-lasting use.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-622149?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-556724?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-051820?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-136600?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-953967?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-492517?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Science Volcano Lab for Kids',
                    'description' => 'Exciting volcano science lab kit for hands-on geological learning and experiments.',
                    'specifications' => '<ul><li>Volcano model included</li><li>Safe experiment materials</li><li>Educational guide</li><li>Hands-on learning</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Exciting science volcano lab kit providing hands-on geological learning through safe experiments. Includes volcano model and comprehensive educational guide for interactive learning.</p>',
                    'price' => 54.99,
                    'cover_image' => 'https://images.unsplash.com/photo-809629?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-694129?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-248070?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-876039?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-681334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-566562?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            "Action Figures & Playsets" => [
                [
                    "name" => "Superhero Figures",
                    "description" => "Collection of superhero action figures with articulated joints and accessories.",
                    "specifications" => "<ul><li>Articulated joints</li><li>Detailed design</li><li>Accessories included</li><li>Durable materials</li><li>Ages 4+ years</li></ul>",
                    "details" => "<p>Collection of superhero action figures with articulated joints and detailed design. Includes accessories and made from durable materials for long-lasting play.</p>",
                    "price" => 39.99,
                    "variants" => [
                        ["name" => "Size", "options" => ["6 inch", "12 inch", "18 inch"]]
                    ],
                    "cover_image" => "https://images.unsplash.com/photo-029543?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-043067?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-202975?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-078006?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-848445?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-209313?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Blue Fox Cartoon Character",
                    "description" => "Adorable blue fox cartoon character figure with moveable parts.",
                    "specifications" => "<ul><li>Cartoon design</li><li>Moveable parts</li><li>Bright blue color</li><li>Child-safe materials</li><li>Ages 3+ years</li></ul>",
                    "details" => "<p>Adorable blue fox cartoon character figure with moveable parts and bright blue color. Made from child-safe materials perfect for imaginative play.</p>",
                    "price" => 24.99,
                    "cover_image" => "https://images.unsplash.com/photo-472575?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-170798?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-859095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-517898?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-009398?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-299436?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Building & Constructions Playsets",
                    "description" => "Construction-themed playset with building blocks and construction vehicles.",
                    "specifications" => "<ul><li>Building blocks included</li><li>Construction vehicles</li><li>Worker figures</li><li>Realistic accessories</li><li>Ages 5+ years</li></ul>",
                    "details" => "<p>Construction-themed playset featuring building blocks, construction vehicles, and worker figures with realistic accessories for creative building play.</p>",
                    "price" => 69.99,
                    "cover_image" => "https://images.unsplash.com/photo-549268?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-737068?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-025765?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-883450?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-624476?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-251605?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Home Miniature Playset",
                    "description" => "Detailed miniature home playset with furniture and family figures.",
                    "specifications" => "<ul><li>Miniature home design</li><li>Furniture included</li><li>Family figures</li><li>Multiple rooms</li><li>Ages 3+ years</li></ul>",
                    "details" => "<p>Detailed miniature home playset with furniture and family figures. Features multiple rooms for realistic home play and storytelling adventures.</p>",
                    "price" => 89.99,
                    "cover_image" => "https://images.unsplash.com/photo-827472?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-995258?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-166602?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-977317?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-640007?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-728814?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Royal Armor Warrior Toy",
                    "description" => "Medieval warrior figure with royal armor and battle accessories.",
                    "specifications" => "<ul><li>Royal armor design</li><li>Battle accessories</li><li>Articulated figure</li><li>Medieval theme</li><li>Ages 6+ years</li></ul>",
                    "details" => "<p>Medieval warrior figure featuring royal armor design with battle accessories. Articulated figure perfect for medieval-themed adventures and battles.</p>",
                    "price" => 34.99,
                    "variants" => [
                        ["name" => "Size", "options" => ["6 inch", "12 inch", "18 inch"]]
                    ],
                    "cover_image" => "https://images.unsplash.com/photo-307064?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-818309?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-626385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-704988?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-306285?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-108709?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Magic Ruins Explorer Playset",
                    "description" => "Adventure playset featuring magic ruins with explorer figures and treasures.",
                    "specifications" => "<ul><li>Magic ruins setting</li><li>Explorer figures</li><li>Hidden treasures</li><li>Adventure accessories</li><li>Ages 5+ years</li></ul>",
                    "details" => "<p>Adventure playset featuring magic ruins setting with explorer figures and hidden treasures. Includes adventure accessories for exciting exploration play.</p>",
                    "price" => 79.99,
                    "cover_image" => "https://images.unsplash.com/photo-835537?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-599885?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-898683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-177747?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-639182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-866543?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Iron Ronin Shadow Warrior",
                    "description" => "Ninja warrior figure with iron armor and shadow combat accessories.",
                    "specifications" => "<ul><li>Iron armor design</li><li>Shadow combat theme</li><li>Ninja accessories</li><li>Articulated joints</li><li>Ages 8+ years</li></ul>",
                    "details" => "<p>Ninja warrior figure with iron armor design and shadow combat theme. Features ninja accessories and articulated joints for dynamic action poses.</p>",
                    "price" => 44.99,
                    "cover_image" => "https://images.unsplash.com/photo-391240?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-175668?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-444688?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-724173?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-066641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-987157?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Crown Guard Lion Knight Figure",
                    "description" => "Noble lion knight figure with crown guard armor and royal weapons.",
                    "specifications" => "<ul><li>Lion knight design</li><li>Crown guard armor</li><li>Royal weapons</li><li>Premium details</li><li>Ages 6+ years</li></ul>",
                    "details" => "<p>Noble lion knight figure featuring crown guard armor and royal weapons. Premium details and craftsmanship for collectors and young knights alike.</p>",
                    "price" => 49.99,
                    "variants" => [
                        ["name" => "Size", "options" => ["6 inch", "12 inch", "18 inch"]]
                    ],
                    "cover_image" => "https://images.unsplash.com/photo-741293?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-066713?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-875103?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-298098?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-927095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-360056?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Damage Scorpios Rex Dinosaur Figure",
                    "description" => "Fierce Scorpios Rex dinosaur figure with battle damage details and accessories.",
                    "specifications" => "<ul><li>Scorpios Rex design</li><li>Battle damage details</li><li>Moveable parts</li><li>Realistic features</li><li>Ages 4+ years</li></ul>",
                    "details" => "<p>Fierce Scorpios Rex dinosaur figure with battle damage details and moveable parts. Realistic features for prehistoric adventures and dinosaur battles.</p>",
                    "price" => 54.99,
                    "cover_image" => "https://images.unsplash.com/photo-539642?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-790419?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-793325?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-781555?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-271469?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-671302?w=800&h=800&fit=crop&crop=center"
                ],
                [
                    "name" => "Construction Site Building Blocks Set",
                    "description" => "Complete construction site building blocks set with vehicles and workers.",
                    "specifications" => "<ul><li>Building blocks included</li><li>Construction vehicles</li><li>Worker figures</li><li>Site accessories</li><li>Ages 4+ years</li></ul>",
                    "details" => "<p>Complete construction site building blocks set featuring construction vehicles, worker figures, and site accessories for realistic construction play.</p>",
                    "price" => 64.99,
                    "cover_image" => "https://images.unsplash.com/photo-857319?w=800&h=800&fit=crop&crop=center",
                    "images" => "https://images.unsplash.com/photo-357871?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-256837?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-663747?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-197040?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-627938?w=800&h=800&fit=crop&crop=center"
                ]
            ],
            'Outdoor & Sports Toys' => [
                [
                    'name' => 'Byking Premium Quality Cycle For Kids',
                    'description' => 'Premium quality bicycle designed specifically for children with safety features.',
                    'specifications' => '<ul><li>Premium quality frame</li><li>Safety features</li><li>Adjustable seat</li><li>Training wheels included</li><li>Ages 3-8 years</li></ul>',
                    'details' => '<p>Byking premium quality bicycle designed specifically for children with safety features and adjustable components. Includes training wheels for learning.</p>',
                    'price' => 149.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['12 inch', '16 inch', '20 inch']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-832031?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-828004?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-651346?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-011120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-436780?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-470710?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Kidsmate Rider Pro Kick Scooter',
                    'description' => 'Professional kick scooter with adjustable height and smooth wheels.',
                    'specifications' => '<ul><li>Adjustable height</li><li>Smooth rolling wheels</li><li>Lightweight design</li><li>Safety brake</li><li>Ages 5+ years</li></ul>',
                    'details' => '<p>Kidsmate Rider Pro kick scooter with adjustable height and smooth rolling wheels. Lightweight design with safety brake for secure riding.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-737745?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-521026?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-165485?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-702443?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-295461?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-216883?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Soccer Ball Black White Football',
                    'description' => 'Classic black and white soccer ball for outdoor sports and games.',
                    'specifications' => '<ul><li>Classic black white design</li><li>Official size and weight</li><li>Durable construction</li><li>Weather resistant</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Classic black and white soccer ball with official size and weight. Durable construction and weather resistant for outdoor play and sports.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-260090?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-078120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-299566?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-538746?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-847432?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-028402?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Skipping Rope with Built-In Counter',
                    'description' => 'Digital skipping rope with built-in counter for tracking jumps and exercise.',
                    'specifications' => '<ul><li>Built-in digital counter</li><li>Adjustable length</li><li>Comfortable handles</li><li>Exercise tracking</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Digital skipping rope with built-in counter for tracking jumps and exercise progress. Adjustable length with comfortable handles for fitness fun.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-892908?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-469222?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-466253?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-204634?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-390533?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-954995?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Toddler Foot to Floor Sliding Walker',
                    'description' => 'Safe sliding walker for toddlers to develop balance and coordination.',
                    'specifications' => '<ul><li>Foot to floor design</li><li>Safe sliding motion</li><li>Balance development</li><li>Sturdy construction</li><li>Ages 12-36 months</li></ul>',
                    'details' => '<p>Safe toddler sliding walker with foot to floor design for developing balance and coordination. Sturdy construction with safe sliding motion.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Small', 'Medium', 'Large']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-429290?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-752899?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-536581?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-743794?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-617496?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-545322?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Kids Crab Water Slide Playset',
                    'description' => 'Fun crab-themed water slide playset for outdoor summer play and water activities.',
                    'specifications' => '<ul><li>Crab-themed design</li><li>Water slide feature</li><li>Outdoor play</li><li>Summer activities</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Exciting kids crab water slide playset featuring fun crab theme with water slide for outdoor summer play and refreshing water activities.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-915401?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-323596?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-317400?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-866698?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-018437?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-775927?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Colorful Kids Slide',
                    'description' => 'Bright and colorful kids slide for safe indoor and outdoor playground fun.',
                    'specifications' => '<ul><li>Colorful design</li><li>Safe construction</li><li>Indoor outdoor use</li><li>Playground fun</li><li>Ages 2+ years</li></ul>',
                    'details' => '<p>Bright and colorful kids slide with safe construction for indoor and outdoor use. Perfect playground equipment for safe and fun sliding activities.</p>',
                    'price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-287573?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-986676?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-478600?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-423860?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-842610?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-162300?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Webby Kids Jungle Adventure Play Tent House',
                    'description' => 'Jungle-themed adventure play tent house for indoor and outdoor fun.',
                    'specifications' => '<ul><li>Jungle adventure theme</li><li>Easy setup</li><li>Indoor outdoor use</li><li>Spacious interior</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Webby Kids jungle adventure play tent house with easy setup for indoor and outdoor use. Spacious interior with jungle theme for imaginative play.</p>',
                    'price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-594820?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-944170?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-992141?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-901959?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-935944?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-436380?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Eagle Strike Flying Disc',
                    'description' => 'Aerodynamic flying disc for outdoor throwing games and sports.',
                    'specifications' => '<ul><li>Aerodynamic design</li><li>Durable material</li><li>Perfect weight balance</li><li>Outdoor sports</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Eagle Strike flying disc with aerodynamic design and perfect weight balance. Durable material construction for outdoor throwing games and sports.</p>',
                    'price' => 14.99,
                    'cover_image' => 'https://images.unsplash.com/photo-158016?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-806758?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-722323?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-928780?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-941983?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-243193?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Summer Splash Kids Pool',
                    'description' => 'Inflatable kids pool for summer water fun and outdoor play.',
                    'specifications' => '<ul><li>Inflatable design</li><li>Easy setup</li><li>Summer water fun</li><li>Safe materials</li><li>Ages 2+ years</li></ul>',
                    'details' => '<p>Summer Splash inflatable kids pool with easy setup for summer water fun. Made from safe materials perfect for outdoor water play and cooling off.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-530802?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-481939?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-431721?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-194232?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-579683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-476503?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Electronic & Remote Toys' => [
                [
                    'name' => 'Remote Control Off-Road Racing Car',
                    'description' => 'High-performance off-road racing car with remote control and rugged design.',
                    'specifications' => '<ul><li>Off-road capability</li><li>High-speed motor</li><li>Rechargeable battery</li><li>2.4GHz remote</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>High-performance off-road racing car with rugged design for all-terrain adventures. Features rechargeable battery and 2.4GHz remote control.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Small', 'Medium', 'Large']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-412565?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-293725?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-712794?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-281077?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-963947?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-433849?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Mirana Air Football Smart Red',
                    'description' => 'Smart air football with LED lights and hover technology.',
                    'specifications' => '<ul><li>Hover technology</li><li>LED lights</li><li>Rechargeable battery</li><li>Safe foam bumpers</li><li>Ages 5+ years</li></ul>',
                    'details' => '<p>Mirana smart air football with hover technology and LED lights. Safe foam bumpers and rechargeable battery for indoor flying fun.</p>',
                    'price' => 45.99,
                    'cover_image' => 'https://images.unsplash.com/photo-138096?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-390527?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-347379?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-276694?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-860219?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-816794?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Interactive Music Piano Toy for Kids',
                    'description' => 'Electronic piano toy with interactive music features and learning modes.',
                    'specifications' => '<ul><li>Interactive music features</li><li>Learning modes</li><li>Multiple instruments</li><li>Recording function</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive music piano toy with learning modes and multiple instrument sounds. Features recording function for creative musical play.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-974914?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-327088?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-737212?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-876961?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-930649?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-594493?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Smart Talking Robot Toy',
                    'description' => 'Advanced talking robot with AI features and interactive conversations.',
                    'specifications' => '<ul><li>AI conversation</li><li>Voice recognition</li><li>Educational content</li><li>Rechargeable battery</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Smart talking robot toy with AI conversation features and voice recognition. Educational content and rechargeable battery for hours of interactive play.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-284881?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-137332?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-149455?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-141181?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-889838?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-108589?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Big Face Fox Night Light for Kids',
                    'description' => 'Cute fox-shaped night light with soft LED illumination for bedtime comfort.',
                    'specifications' => '<ul><li>Fox design</li><li>Soft LED light</li><li>Touch control</li><li>Rechargeable battery</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Big face fox night light with cute design and soft LED illumination. Touch control and rechargeable battery for bedtime comfort and security.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-144685?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-264009?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-679728?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-880707?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-216419?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-072767?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cute Robot Pets for Kids',
                    'description' => 'Interactive robot pet with realistic movements and sounds.',
                    'specifications' => '<ul><li>Realistic movements</li><li>Pet sounds</li><li>Touch sensors</li><li>Rechargeable battery</li><li>Ages 4+ years</li></ul>',
                    'details' => '<p>Cute robot pet with realistic movements and pet sounds. Touch sensors and rechargeable battery for interactive pet care experience.</p>',
                    'price' => 99.99,
                    'cover_image' => 'https://images.unsplash.com/photo-645029?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-537600?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-957705?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-583809?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-223798?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-957527?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Mini Remote Control Helicopter',
                    'description' => 'Compact remote control helicopter with gyroscope stabilization.',
                    'specifications' => '<ul><li>Gyroscope stabilization</li><li>LED lights</li><li>Rechargeable battery</li><li>Indoor flying</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Mini remote control helicopter with gyroscope stabilization for stable flight. LED lights and rechargeable battery for indoor flying adventures.</p>',
                    'price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-966552?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-024700?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-328438?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-065510?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-391070?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-073085?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Talking Cactus Toy for Kids',
                    'description' => 'Interactive talking cactus toy that repeats speech and dances.',
                    'specifications' => '<ul><li>Speech repetition</li><li>Dancing movements</li><li>Soft plush material</li><li>Battery operated</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive talking cactus toy that repeats speech and performs dancing movements. Soft plush material with battery operation for entertaining play.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Small', 'Medium', 'Large']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-750190?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-583975?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-960517?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-716856?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-031824?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-474157?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Lightning Pro Racing Boat',
                    'description' => 'High-speed remote control racing boat for water adventures.',
                    'specifications' => '<ul><li>High-speed motor</li><li>Waterproof design</li><li>Remote control</li><li>Rechargeable battery</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Lightning Pro racing boat with high-speed motor and waterproof design. Remote control and rechargeable battery for exciting water racing adventures.</p>',
                    'price' => 119.99,
                    'cover_image' => 'https://images.unsplash.com/photo-916639?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-788165?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-812271?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-813967?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-344780?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-293423?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Smart Educational Toy Tablet',
                    'description' => 'Educational tablet with interactive learning games and activities.',
                    'specifications' => '<ul><li>Educational games</li><li>Interactive activities</li><li>Touchscreen display</li><li>Parental controls</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Smart educational toy tablet with interactive learning games and activities. Touchscreen display with parental controls for safe educational entertainment.</p>',
                    'price' => 109.99,
                    'cover_image' => 'https://images.unsplash.com/photo-270135?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-963474?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-686866?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-930610?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-976459?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-221691?w=800&h=800&fit=crop&crop=center'
                ]
            ]
        ];

        $newProducts = [
            'Fiction & Literature' => [
                ['name' => 'Novel "The Shadow of the Wind"', 'description' => 'An unforgettable literary journey through a city of secrets.', 'price' => 29.99, 'sale_price' => 24.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
                ['name' => 'Arabic Poetry Collection', 'description' => 'A curated anthology of timeless Arabic poetry.', 'price' => 24.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
                ['name' => 'Short Stories Bundle', 'description' => 'Three short story collections in one elegant box.', 'price' => 39.99, 'sale_price' => 34.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
            ],
            'Self Development' => [
                ['name' => 'The Art of Thinking', 'description' => 'A practical guide to critical thinking and decision making.', 'price' => 19.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
                ['name' => 'Habits for Growth', 'description' => 'Build lasting habits that compound into real change.', 'price' => 22.99, 'sale_price' => 18.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
                ['name' => 'Focus & Flow', 'description' => 'Master deep work in a distracted world.', 'price' => 17.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
            ],
            'Science & History' => [
                ['name' => 'Illustrated History Atlas', 'description' => 'A richly illustrated journey through civilizations.', 'price' => 49.99, 'sale_price' => 42.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
                ['name' => 'The Story of Science', 'description' => 'From the wheel to the smartphone in one volume.', 'price' => 35.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
            ],
            'Hot Drinks' => [
                ['name' => 'Specialty Espresso Blend', 'description' => 'Freshly roasted beans with rich crema and bold flavor.', 'price' => 24.99, 'cover_image' => '/storage/demo/p14.svg', 'images' => '/storage/demo/p14.svg'],
                ['name' => 'Arabic Coffee Gift Tin', 'description' => 'Traditional Arabic coffee in an elegant collectible tin.', 'price' => 29.99, 'sale_price' => 24.99, 'cover_image' => '/storage/demo/p14.svg', 'images' => '/storage/demo/p14.svg'],
                ['name' => 'Latte Art Cups Set', 'description' => 'Two ceramic cups crafted for the perfect latte art.', 'price' => 19.99, 'cover_image' => '/storage/demo/p14.svg', 'images' => '/storage/demo/p14.svg'],
            ],
            'Cold Drinks' => [
                ['name' => 'Iced Coffee Kit', 'description' => 'Everything you need for café-style iced coffee at home.', 'price' => 32.99, 'sale_price' => 27.99, 'cover_image' => '/storage/demo/p15.svg', 'images' => '/storage/demo/p15.svg'],
                ['name' => 'Cold Brew Bottle', 'description' => 'Reusable bottle with built-in infuser for slow cold brew.', 'price' => 18.99, 'cover_image' => '/storage/demo/p15.svg', 'images' => '/storage/demo/p15.svg'],
            ],
            'Fresh Pastries' => [
                ['name' => 'Butter Croissant Box', 'description' => 'Six flaky, golden croissants baked fresh each morning.', 'price' => 12.99, 'cover_image' => '/storage/demo/p15.svg', 'images' => '/storage/demo/p15.svg'],
                ['name' => 'Assorted Danish Tray', 'description' => 'A mix of fruit and cheese danishes for sharing.', 'price' => 16.99, 'sale_price' => 13.99, 'cover_image' => '/storage/demo/p15.svg', 'images' => '/storage/demo/p15.svg'],
            ],
            'Vitamins & Supplements' => [
                ['name' => 'Vitamin D3 2000IU', 'description' => 'Daily support for immunity and bone health.', 'price' => 14.99, 'sale_price' => 11.99, 'cover_image' => '/storage/demo/p16.svg', 'images' => '/storage/demo/p16.svg'],
                ['name' => 'Multivitamin Complex', 'description' => 'Complete daily vitamins and minerals in one dose.', 'price' => 19.99, 'cover_image' => '/storage/demo/p16.svg', 'images' => '/storage/demo/p16.svg'],
                ['name' => 'Omega-3 Fish Oil', 'description' => 'High-purity omega-3 for heart and brain health.', 'price' => 22.99, 'sale_price' => 18.99, 'cover_image' => '/storage/demo/p16.svg', 'images' => '/storage/demo/p16.svg'],
            ],
            'Skin Care' => [
                ['name' => 'Gentle Hydrating Cream', 'description' => 'Non-greasy daily moisturizer for sensitive skin.', 'price' => 15.99, 'cover_image' => '/storage/demo/p16.svg', 'images' => '/storage/demo/p16.svg'],
                ['name' => 'Sunscreen SPF 50', 'description' => 'Lightweight broad-spectrum daily protection.', 'price' => 17.99, 'sale_price' => 14.99, 'cover_image' => '/storage/demo/p16.svg', 'images' => '/storage/demo/p16.svg'],
            ],
            'Medical Devices' => [
                ['name' => 'Digital Blood Pressure Monitor', 'description' => 'Accurate home readings with memory storage.', 'price' => 34.99, 'sale_price' => 29.99, 'cover_image' => '/storage/demo/p16.svg', 'images' => '/storage/demo/p16.svg'],
                ['name' => 'Digital Thermometer', 'description' => 'Fast, safe temperature readings for the whole family.', 'price' => 12.99, 'cover_image' => '/storage/demo/p16.svg', 'images' => '/storage/demo/p16.svg'],
            ],
            'Pet Food' => [
                ['name' => 'Premium Dog Food 3kg', 'description' => 'Balanced high-protein formula for adult dogs.', 'price' => 29.99, 'sale_price' => 24.99, 'cover_image' => '/storage/demo/p17.svg', 'images' => '/storage/demo/p17.svg'],
                ['name' => 'Cat Food with Salmon', 'description' => 'Omega-rich salmon formula for healthy coats.', 'price' => 24.99, 'cover_image' => '/storage/demo/p17.svg', 'images' => '/storage/demo/p17.svg'],
            ],
            'Toys & Play' => [
                ['name' => 'Interactive Feather Wand', 'description' => 'Endless fun for curious cats of every age.', 'price' => 9.99, 'cover_image' => '/storage/demo/p18.svg', 'images' => '/storage/demo/p18.svg'],
                ['name' => 'Chew-Resistant Rope', 'description' => 'Durable rope toy for energetic dogs.', 'price' => 11.99, 'sale_price' => 9.49, 'cover_image' => '/storage/demo/p18.svg', 'images' => '/storage/demo/p18.svg'],
            ],
            'Bedding & Comfort' => [
                ['name' => 'Orthopedic Dog Bed', 'description' => 'Memory foam support for aches and joint care.', 'price' => 49.99, 'sale_price' => 42.99, 'cover_image' => '/storage/demo/p18.svg', 'images' => '/storage/demo/p18.svg'],
                ['name' => 'Cozy Cat Cave', 'description' => 'A snug hideaway cats love to curl up in.', 'price' => 27.99, 'cover_image' => '/storage/demo/p18.svg', 'images' => '/storage/demo/p18.svg'],
            ],
            'Men Fragrances' => [
                ['name' => 'Oud Royal Eau de Parfum', 'description' => 'Rich oriental oud and amber that lasts all day.', 'price' => 59.99, 'sale_price' => 49.99, 'cover_image' => '/storage/demo/p19.svg', 'images' => '/storage/demo/p19.svg'],
                ['name' => 'Citrus & Cedar Cologne', 'description' => 'Fresh daytime scent with a woody dry-down.', 'price' => 39.99, 'cover_image' => '/storage/demo/p19.svg', 'images' => '/storage/demo/p19.svg'],
            ],
            'Women Fragrances' => [
                ['name' => 'Floral Bloom Parfum', 'description' => 'Elegant floral bouquet with a soft powdery finish.', 'price' => 44.99, 'sale_price' => 37.99, 'cover_image' => '/storage/demo/p19.svg', 'images' => '/storage/demo/p19.svg'],
                ['name' => 'Rose & Musk Attar', 'description' => 'A classic oriental blend of rose and musk.', 'price' => 49.99, 'cover_image' => '/storage/demo/p19.svg', 'images' => '/storage/demo/p19.svg'],
            ],
            'Gift Sets' => [
                ['name' => 'Discovery Fragrance Set', 'description' => 'Five miniature scents to find your signature.', 'price' => 34.99, 'sale_price' => 29.99, 'cover_image' => '/storage/demo/p20.svg', 'images' => '/storage/demo/p20.svg'],
                ['name' => 'Perfume & Bakhoor Gift Box', 'description' => 'The perfect oriental gift pairing.', 'price' => 54.99, 'cover_image' => '/storage/demo/p20.svg', 'images' => '/storage/demo/p20.svg'],
            ],
            'Bouquets' => [
                ['name' => 'Fresh Rose Bouquet', 'description' => 'A dozen fresh roses arranged by hand.', 'price' => 39.99, 'sale_price' => 34.99, 'cover_image' => '/storage/demo/p21.svg', 'images' => '/storage/demo/p21.svg'],
                ['name' => 'Mixed Wildflower Bouquet', 'description' => 'A cheerful mix of seasonal blooms.', 'price' => 29.99, 'cover_image' => '/storage/demo/p21.svg', 'images' => '/storage/demo/p21.svg'],
            ],
            'Gifts' => [
                ['name' => 'Flower Box with Chocolate', 'description' => 'A keepsake box of dried flowers and chocolates.', 'price' => 44.99, 'sale_price' => 37.99, 'cover_image' => '/storage/demo/p21.svg', 'images' => '/storage/demo/p21.svg'],
                ['name' => 'Birthday Surprise Set', 'description' => 'Balloon, blooms, and a candle — ready to gift.', 'price' => 34.99, 'cover_image' => '/storage/demo/p21.svg', 'images' => '/storage/demo/p21.svg'],
            ],
            'Plants' => [
                ['name' => 'Snake Plant in Ceramic', 'description' => 'Low-maintenance air-purifying houseplant.', 'price' => 24.99, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
                ['name' => 'Mini Succulent Trio', 'description' => 'Three easy-care succulents in a stone planter.', 'price' => 19.99, 'sale_price' => 16.99, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
            ],
            'Hand Tools' => [
                ['name' => 'Professional Tool Set', 'description' => '96-piece household tool set in a sturdy case.', 'price' => 79.99, 'sale_price' => 64.99, 'cover_image' => '/storage/demo/p23.svg', 'images' => '/storage/demo/p23.svg'],
                ['name' => 'Claw Hammer 16oz', 'description' => 'Forged steel hammer with anti-slip grip.', 'price' => 17.99, 'cover_image' => '/storage/demo/p23.svg', 'images' => '/storage/demo/p23.svg'],
            ],
            'Power Tools' => [
                ['name' => 'Cordless Drill 18V', 'description' => 'Long-lasting battery with variable speeds.', 'price' => 89.99, 'sale_price' => 74.99, 'cover_image' => '/storage/demo/p23.svg', 'images' => '/storage/demo/p23.svg'],
                ['name' => 'Angle Grinder Kit', 'description' => 'Heavy-duty grinder with cutting and grinding discs.', 'price' => 69.99, 'cover_image' => '/storage/demo/p23.svg', 'images' => '/storage/demo/p23.svg'],
            ],
            'Safety & Hardware' => [
                ['name' => 'Work Gloves (Pair)', 'description' => 'Cut-resistant gloves for tough jobs.', 'price' => 8.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
                ['name' => 'Laser Distance Measurer', 'description' => 'Precise digital measuring up to 40m.', 'price' => 32.99, 'sale_price' => 27.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
            ],
            'Woven & Textile' => [
                ['name' => 'Hand-Woven Basket', 'description' => 'Natural seagrass basket woven by local artisans.', 'price' => 24.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
                ['name' => 'Wool Knit Shawl', 'description' => 'Warm shawl hand-knitted in earthy tones.', 'price' => 44.99, 'sale_price' => 37.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
            ],
            'Pottery & Ceramics' => [
                ['name' => 'Hand-Thrown Clay Mug', 'description' => 'One-of-a-kind mug with a rustic glaze.', 'price' => 19.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
                ['name' => 'Decorated Ceramic Vase', 'description' => 'Hand-painted vase with traditional motifs.', 'price' => 29.99, 'sale_price' => 24.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
            ],
            'Wood Crafts' => [
                ['name' => 'Carved Wooden Bowl', 'description' => 'Hand-carved from a single block of olive wood.', 'price' => 34.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
                ['name' => 'Wooden Spice Box', 'description' => 'Handcrafted organizer with carved lid.', 'price' => 27.99, 'sale_price' => 22.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
            ],
            'Fresh Produce' => [
                ['name' => 'Seasonal Fruit Box', 'description' => 'Farm-fresh seasonal fruits hand-picked daily.', 'price' => 19.99, 'sale_price' => 16.99, 'cover_image' => '/storage/demo/p27.svg', 'images' => '/storage/demo/p27.svg'],
                ['name' => 'Organic Vegetables Bundle', 'description' => 'A week of fresh organic vegetables.', 'price' => 22.99, 'cover_image' => '/storage/demo/p27.svg', 'images' => '/storage/demo/p27.svg'],
            ],
            'Dairy & Eggs' => [
                ['name' => 'Farm Fresh Eggs (30)', 'description' => 'Free-range eggs from local farms.', 'price' => 6.99, 'cover_image' => '/storage/demo/p27.svg', 'images' => '/storage/demo/p27.svg'],
                ['name' => 'Greek Yogurt Tub', 'description' => 'Thick, creamy strained yogurt.', 'price' => 5.49, 'sale_price' => 4.79, 'cover_image' => '/storage/demo/p27.svg', 'images' => '/storage/demo/p27.svg'],
            ],
            'Pantry Staples' => [
                ['name' => 'Extra Virgin Olive Oil 1L', 'description' => 'Cold-pressed first harvest olive oil.', 'price' => 14.99, 'sale_price' => 12.49, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
                ['name' => 'Organic Basmati Rice 5kg', 'description' => 'Long-grain fragrant rice from organic farms.', 'price' => 16.99, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
            ],
            'Pens & Writing' => [
                ['name' => 'Fountain Pen Gift Set', 'description' => 'Elegant fountain pen with ink bottles.', 'price' => 24.99, 'sale_price' => 19.99, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
                ['name' => 'Premium Ballpoint 5-Pack', 'description' => 'Buttery-smooth refillable ballpoints.', 'price' => 9.99, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
            ],
            'Notebooks' => [
                ['name' => 'Leather Journal', 'description' => 'Faux-leather cover with 192 ruled pages.', 'price' => 14.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
                ['name' => 'Bullet Dot Notebook', 'description' => 'Dot-grid notebook perfect for planning.', 'price' => 12.99, 'sale_price' => 10.49, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
            ],
            'Art Supplies' => [
                ['name' => 'Watercolor 24-Pan Set', 'description' => 'Vibrant watercolors in a travel tin.', 'price' => 22.99, 'sale_price' => 18.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
                ['name' => 'Graphite Pencil Set', 'description' => '12 professional grades for sketching.', 'price' => 11.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
            ],
            'Computers' => [
                ['name' => 'Creator Laptop 16"', 'description' => 'Powerful CPU, discrete GPU, and 32GB RAM.', 'price' => 1299.99, 'sale_price' => 1199.99, 'cover_image' => '/storage/demo/p23.svg', 'images' => '/storage/demo/p23.svg'],
                ['name' => 'Compact Desktop Workstation', 'description' => 'Silent, upgradeable tower for heavy workloads.', 'price' => 899.99, 'cover_image' => '/storage/demo/p23.svg', 'images' => '/storage/demo/p23.svg'],
            ],
            'Displays & Audio' => [
                ['name' => '27" 4K UHD Monitor', 'description' => 'Color-accurate panel for designers.', 'price' => 449.99, 'sale_price' => 399.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
                ['name' => 'Studio Monitor Speakers', 'description' => 'Reference-quality powered monitors.', 'price' => 249.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
            ],
            'Cameras' => [
                ['name' => 'Mirrorless Camera Body', 'description' => 'Full-frame sensor with 4K video.', 'price' => 1499.99, 'sale_price' => 1349.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
                ['name' => 'Portrait Prime Lens 50mm', 'description' => 'Fast f/1.8 lens for gorgeous bokeh.', 'price' => 199.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
            ],
            'Rings' => [
                ['name' => '18K Gold Diamond Ring', 'description' => 'Hand-set brilliant diamonds in solid gold.', 'price' => 899.99, 'sale_price' => 799.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
                ['name' => 'Silver Eternity Band', 'description' => 'Classic sterling silver band.', 'price' => 129.99, 'cover_image' => '/storage/demo/p24.svg', 'images' => '/storage/demo/p24.svg'],
            ],
            'Necklaces' => [
                ['name' => 'Diamond Pendant Necklace', 'description' => 'A radiant pendant on a fine chain.', 'price' => 649.99, 'sale_price' => 569.99, 'cover_image' => '/storage/demo/p1.svg', 'images' => '/storage/demo/p1.svg'],
                ['name' => 'Pearl Strand Necklace', 'description' => 'Hand-knotted freshwater pearls.', 'price' => 399.99, 'cover_image' => '/storage/demo/p1.svg', 'images' => '/storage/demo/p1.svg'],
            ],
            'Bracelets' => [
                ['name' => 'Gold Chain Bracelet', 'description' => 'Sturdy woven gold link bracelet.', 'price' => 329.99, 'sale_price' => 289.99, 'cover_image' => '/storage/demo/p2.svg', 'images' => '/storage/demo/p2.svg'],
                ['name' => 'Charm Bracelet with Crystals', 'description' => 'Sparkling crystals on a silver base.', 'price' => 179.99, 'cover_image' => '/storage/demo/p2.svg', 'images' => '/storage/demo/p2.svg'],
            ],
            'Classic Watches' => [
                ['name' => 'Automatic Dress Watch', 'description' => 'Swiss movement with sapphire crystal.', 'price' => 699.99, 'sale_price' => 599.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
                ['name' => 'Leather Strap Classic', 'description' => 'Timeless design with genuine leather.', 'price' => 249.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
            ],
            'Sports Watches' => [
                ['name' => 'Diver Watch 200m', 'description' => 'Water-resistant with unidirectional bezel.', 'price' => 399.99, 'sale_price' => 349.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
                ['name' => 'Chronograph Racing Watch', 'description' => 'Multi-function chronograph with tachymeter.', 'price' => 299.99, 'cover_image' => '/storage/demo/p26.svg', 'images' => '/storage/demo/p26.svg'],
            ],
            'Limited Edition' => [
                ['name' => 'Limited Gold Edition Watch', 'description' => 'Numbered piece with gold accents.', 'price' => 1299.99, 'sale_price' => 1099.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
                ['name' => 'Anniversary Tribute Watch', 'description' => 'A collector tribute to watchmaking.', 'price' => 899.99, 'cover_image' => '/storage/demo/p25.svg', 'images' => '/storage/demo/p25.svg'],
            ],
            'Packaging' => [
                ['name' => 'Corrugated Boxes (50)', 'description' => 'Heavy-duty shipping boxes in bulk.', 'price' => 89.99, 'sale_price' => 74.99, 'cover_image' => '/storage/demo/p26.svg', 'images' => '/storage/demo/p26.svg'],
                ['name' => 'Bubble Wrap Roll', 'description' => 'Protective wrap for safe shipping.', 'price' => 24.99, 'cover_image' => '/storage/demo/p26.svg', 'images' => '/storage/demo/p26.svg'],
            ],
            'Office Bulk' => [
                ['name' => 'Promo Pens (500)', 'description' => 'Customizable pens for bulk distribution.', 'price' => 99.99, 'sale_price' => 84.99, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
                ['name' => 'Notebooks Carton (100)', 'description' => 'Bulk carton of A5 notebooks.', 'price' => 119.99, 'cover_image' => '/storage/demo/p13.svg', 'images' => '/storage/demo/p13.svg'],
            ],
            'Business Supplies' => [
                ['name' => 'Thermal Receipt Rolls (50)', 'description' => 'POS thermal rolls for retail.', 'price' => 59.99, 'cover_image' => '/storage/demo/p26.svg', 'images' => '/storage/demo/p26.svg'],
                ['name' => 'Heavy-Duty Stapler Set', 'description' => 'Desktop stapler plus 5000 staples.', 'price' => 18.99, 'sale_price' => 15.49, 'cover_image' => '/storage/demo/p22.svg', 'images' => '/storage/demo/p22.svg'],
            ],
            'Football & Balls' => [
                ['name' => 'Match Ball Size 5', 'description' => 'FIFA-approved match football.', 'price' => 44.99, 'sale_price' => 37.99, 'cover_image' => '/storage/demo/p27.svg', 'images' => '/storage/demo/p27.svg'],
                ['name' => 'Training Ball Multi-Pack', 'description' => 'Four durable training balls.', 'price' => 59.99, 'cover_image' => '/storage/demo/p27.svg', 'images' => '/storage/demo/p27.svg'],
            ],
            'Fitness' => [
                ['name' => 'Adjustable Dumbbell 24kg', 'description' => 'One pair that replaces a full rack.', 'price' => 189.99, 'sale_price' => 159.99, 'cover_image' => '/storage/demo/p27.svg', 'images' => '/storage/demo/p27.svg'],
                ['name' => 'Yoga Mat 6mm', 'description' => 'Non-slip cushioned mat with carry strap.', 'price' => 29.99, 'cover_image' => '/storage/demo/p3.svg', 'images' => '/storage/demo/p3.svg'],
            ],
            'Athletic Wear' => [
                ['name' => 'Performance Running Shirt', 'description' => 'Moisture-wicking fabric for training.', 'price' => 24.99, 'cover_image' => '/storage/demo/p5.svg', 'images' => '/storage/demo/p5.svg'],
                ['name' => 'Compression Leggings', 'description' => 'Squat-proof supportive tights.', 'price' => 34.99, 'sale_price' => 29.99, 'cover_image' => '/storage/demo/p5.svg', 'images' => '/storage/demo/p5.svg'],
            ],
            'Skincare Rituals' => [
                ['name' => 'Vitamin C Serum', 'description' => 'Brightening serum for radiant skin.', 'price' => 29.99, 'sale_price' => 24.99, 'cover_image' => '/storage/demo/p9.svg', 'images' => '/storage/demo/p9.svg'],
                ['name' => 'Night Repair Cream', 'description' => 'Deeply nourishing overnight formula.', 'price' => 34.99, 'cover_image' => '/storage/demo/p9.svg', 'images' => '/storage/demo/p9.svg'],
            ],
            'Makeup' => [
                ['name' => 'Longwear Matte Lipstick', 'description' => 'Transfer-proof color that lasts.', 'price' => 19.99, 'cover_image' => '/storage/demo/p10.svg', 'images' => '/storage/demo/p10.svg'],
                ['name' => 'Eyeshadow Palette', 'description' => '12 neutral shades, highly pigmented.', 'price' => 32.99, 'sale_price' => 27.99, 'cover_image' => '/storage/demo/p10.svg', 'images' => '/storage/demo/p10.svg'],
            ],
            'Hair Care' => [
                ['name' => 'Argan Oil Hair Serum', 'description' => 'Frizz control with a silky finish.', 'price' => 18.99, 'cover_image' => '/storage/demo/p9.svg', 'images' => '/storage/demo/p9.svg'],
                ['name' => 'Repairing Hair Mask', 'description' => 'Deep conditioning for damaged hair.', 'price' => 22.99, 'sale_price' => 18.99, 'cover_image' => '/storage/demo/p9.svg', 'images' => '/storage/demo/p9.svg'],
            ],
            'Dresses' => [
                ['name' => 'Silk Evening Dress', 'description' => 'Floor-length silk dress with a slit.', 'price' => 189.99, 'sale_price' => 159.99, 'cover_image' => '/storage/demo/p4.svg', 'images' => '/storage/demo/p4.svg'],
                ['name' => 'Linen Summer Dress', 'description' => 'Breathable linen midi dress.', 'price' => 79.99, 'cover_image' => '/storage/demo/p4.svg', 'images' => '/storage/demo/p4.svg'],
            ],
            'Outerwear' => [
                ['name' => 'Tailored Wool Coat', 'description' => 'Sharp wool-blend coat for cold days.', 'price' => 249.99, 'sale_price' => 209.99, 'cover_image' => '/storage/demo/p5.svg', 'images' => '/storage/demo/p5.svg'],
                ['name' => 'Premium Denim Jacket', 'description' => 'Classic fit in heavy-weight denim.', 'price' => 99.99, 'cover_image' => '/storage/demo/p5.svg', 'images' => '/storage/demo/p5.svg'],
            ],
            'Accessories' => [
                ['name' => 'Leather Tote Bag', 'description' => 'Genuine leather with gold hardware.', 'price' => 149.99, 'sale_price' => 129.99, 'cover_image' => '/storage/demo/p4.svg', 'images' => '/storage/demo/p4.svg'],
                ['name' => 'Silk Scarf', 'description' => 'Hand-rolled edges, elegant print.', 'price' => 49.99, 'cover_image' => '/storage/demo/p4.svg', 'images' => '/storage/demo/p4.svg'],
            ],
            'Main Courses' => [
                ['name' => 'Chef\'s Signature Grill', 'description' => 'Slow-grilled premium cuts with house rub.', 'price' => 39.99, 'cover_image' => '/storage/demo/p20.svg', 'images' => '/storage/demo/p20.svg'],
                ['name' => 'Seafood Tagine', 'description' => 'Fresh seafood simmered with spices.', 'price' => 34.99, 'sale_price' => 29.99, 'cover_image' => '/storage/demo/p21.svg', 'images' => '/storage/demo/p21.svg'],
            ],
            'Starters' => [
                ['name' => 'Truffle Mushroom Soup', 'description' => 'Velvety soup with truffle oil.', 'price' => 14.99, 'cover_image' => '/storage/demo/p14.svg', 'images' => '/storage/demo/p14.svg'],
                ['name' => 'Mezze Selection', 'description' => 'A curated platter of house mezze.', 'price' => 19.99, 'sale_price' => 16.99, 'cover_image' => '/storage/demo/p14.svg', 'images' => '/storage/demo/p14.svg'],
            ],
            'Desserts' => [
                ['name' => 'Molten Chocolate Cake', 'description' => 'Warm cake with a flowing center.', 'price' => 12.99, 'cover_image' => '/storage/demo/p15.svg', 'images' => '/storage/demo/p15.svg'],
                ['name' => 'Pistachio Baklava Plate', 'description' => 'Handmade layers with crushed pistachio.', 'price' => 16.99, 'sale_price' => 13.99, 'cover_image' => '/storage/demo/p15.svg', 'images' => '/storage/demo/p15.svg'],
            ],
            'Featured Products' => [
                ['name' => 'Best Seller Pick', 'description' => 'A customer favourite, hand-picked for you.', 'price' => 29.99, 'cover_image' => '/storage/demo/p1.svg', 'images' => '/storage/demo/p1.svg'],
                ['name' => 'Top Rated Product', 'description' => 'Highly rated by customers this month.', 'price' => 39.99, 'sale_price' => 34.99, 'cover_image' => '/storage/demo/p2.svg', 'images' => '/storage/demo/p2.svg'],
            ],
            'New Arrivals' => [
                ['name' => 'Just Arrived', 'description' => 'The latest addition to our catalog.', 'price' => 24.99, 'cover_image' => '/storage/demo/p3.svg', 'images' => '/storage/demo/p3.svg'],
                ['name' => 'Fresh in Stock', 'description' => 'New products restocked weekly.', 'price' => 19.99, 'sale_price' => 16.99, 'cover_image' => '/storage/demo/p8.svg', 'images' => '/storage/demo/p8.svg'],
            ],
            'Best Sellers' => [
                ['name' => 'Customer Favourite', 'description' => 'The most loved product in this store.', 'price' => 49.99, 'cover_image' => '/storage/demo/p6.svg', 'images' => '/storage/demo/p6.svg'],
                ['name' => 'Most Wanted', 'description' => 'Back in stock after high demand.', 'price' => 34.99, 'sale_price' => 29.99, 'cover_image' => '/storage/demo/p7.svg', 'images' => '/storage/demo/p7.svg'],
            ],
        ];

        if (isset($products[$categoryName])) {
            return $products[$categoryName];
        }

        return $newProducts[$categoryName] ?? [];
    }
}