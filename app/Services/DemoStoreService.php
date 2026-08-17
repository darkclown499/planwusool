<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Models\User;
use Illuminate\Support\Facades\Storage;

class DemoStoreService
{
    public const SLUG = 'demo';

    /**
     * Image slug => [emoji, gradient from color, gradient to color]
     */
    private const IMAGES = [
        'p1'  => ['📱', '#4F46E5', '#9333EA'],
        'p2'  => ['🎧', '#0EA5E9', '#6366F1'],
        'p3'  => ['⌚', '#14B8A6', '#0EA5E9'],
        'p4'  => ['👗', '#EC4899', '#F97316'],
        'p5'  => ['👕', '#22C55E', '#84CC16'],
        'p6'  => ['👟', '#F97316', '#EF4444'],
        'p7'  => ['🍳', '#64748B', '#94A3B8'],
        'p8'  => ['💡', '#F59E0B', '#FBBF24'],
        'p9'  => ['🧴', '#8B5CF6', '#6366F1'],
        'p10' => ['🌸', '#F472B6', '#FB7185'],
        'p11' => ['🧸', '#FB923C', '#F97316'],
        'p12' => ['🎒', '#3B82F6', '#6366F1'],
        'p13' => ['📚', '#92400E', '#B45309'],
        'p14' => ['☕', '#6F4E37', '#A97C50'],
        'p15' => ['💊', '#0D9488', '#14B8A6'],
        'p16' => ['🐶', '#84CC16', '#22C55E'],
        'p17' => ['🍾', '#E11D48', '#F43F5E'],
        'p18' => ['💐', '#F472B6', '#C026D3'],
        'p19' => ['🛠️', '#F97316', '#EA580C'],
        'p20' => ['🧶', '#B45309', '#92400E'],
        'p21' => ['🥦', '#16A34A', '#15803D'],
        'p22' => ['✏️', '#6366F1', '#4F46E5'],
        'p23' => ['🖥️', '#3B82F6', '#0EA5E9'],
        'p24' => ['💍', '#C9A227', '#E5E4E2'],
        'p25' => ['⌚', '#334155', '#0F172A'],
        'p26' => ['📦', '#3B82F6', '#2563EB'],
        'p27' => ['⚽', '#22C55E', '#16A34A'],
        'cat-electronics'  => ['🔌', '#4F46E5', '#7C3AED'],
        'cat-fashion'      => ['👗', '#EC4899', '#F43F5E'],
        'cat-home'         => ['🏠', '#F59E0B', '#F97316'],
        'cat-beauty'       => ['✨', '#8B5CF6', '#D946EF'],
        'cat-kids'         => ['🎈', '#22C55E', '#14B8A6'],
        'cat-books'        => ['📚', '#92400E', '#B45309'],
        'cat-coffee'       => ['☕', '#6F4E37', '#A97C50'],
        'cat-pharmacy'     => ['💊', '#0D9488', '#14B8A6'],
        'cat-pets'         => ['🐾', '#84CC16', '#22C55E'],
        'cat-perfumes'     => ['🍾', '#E11D48', '#F43F5E'],
        'cat-flowers'      => ['💐', '#F472B6', '#C026D3'],
        'cat-home-tools'   => ['🔧', '#F97316', '#EA580C'],
        'cat-handcrafted'  => ['🧶', '#B45309', '#92400E'],
        'cat-grocery'      => ['🥦', '#16A34A', '#15803D'],
        'cat-stationery'   => ['✏️', '#6366F1', '#4F46E5'],
        'cat-electronics-pro' => ['🖥️', '#3B82F6', '#0EA5E9'],
        'cat-jewelry'      => ['💍', '#C9A227', '#E5E4E2'],
        'cat-watches'      => ['⌚', '#334155', '#0F172A'],
        'cat-b2b'          => ['📦', '#3B82F6', '#2563EB'],
        'cat-sports'       => ['⚽', '#22C55E', '#16A34A'],
        'cat-restaurant'   => ['🍽️', '#A47C3F', '#C19A6B'],
    ];

    /**
     * Get the demo store, creating and seeding it on first request.
     */
    public function ensureDemoStore(): Store
    {
        $store = Store::where('slug', self::SLUG)->first();

        if ($store) {
            return $store;
        }

        $owner = User::where('type', 'superadmin')->first()
            ?? User::where('type', 'admin')->first()
            ?? User::where('type', 'company')->orderBy('id')->first();

        $store = Store::create([
            'name' => __('Demo Store'),
            'slug' => self::SLUG,
            'description' => __('A fully working demo store showing the capabilities of Wusool.'),
            'theme' => 'core-minimal',
            'user_id' => $owner?->id,
            'email' => 'demo@wusool.ps',
            'enable_custom_domain' => false,
            'enable_custom_subdomain' => false,
        ]);

        $this->writeSvgImages();
        $this->seedData($store);

        return $store;
    }

    /**
     * Get the storefront URL for the demo store, e.g. https://demo.wusool.ps
     */
    public function demoStoreUrl(): string
    {
        $store = $this->ensureDemoStore();

        return $store->getStoreSubdomainUrl();
    }

    public function writeSvgImages(): void
    {
        foreach (self::IMAGES as $slug => $meta) {
            [$emoji, $from, $to] = $meta;

            $svg = $this->buildSvg($emoji, $from, $to);

            Storage::disk('public')->put('demo/' . $slug . '.svg', $svg);
        }
    }

    /**
     * Import the demo catalog directly into a target store, using the language
     * the merchant picked during onboarding.
     */
    public function importCatalog(Store $store, string $lang = 'ar', ?int $maxProducts = null): void
    {
        $lang = in_array($lang, ['ar', 'en'], true) ? $lang : 'ar';

        $this->writeSvgImages();

        // Respect the merchant's plan product limit so the demo catalog never
        // leaves them over quota (e.g. free plan capped at 18 products).
        if ($maxProducts === null) {
            $plan = $store->user?->getCurrentPlan() ?? Plan::getDefaultPlan();
            $maxProducts = (int) ($plan->max_products_per_store ?? 0);
        }

        $imported = 0;

        foreach ($this->catalog($lang) as $categorySlug => $category) {
            if ($maxProducts > 0 && $imported >= $maxProducts) {
                break;
            }

            $categoryModel = Category::create([
                'name' => $category['name'],
                'slug' => Category::generateUniqueSlug($category['name'], $store->id),
                'description' => '',
                'image' => '/storage/demo/' . $categorySlug . '.svg',
                'store_id' => $store->id,
                'sort_order' => 0,
                'is_active' => true,
            ]);

            foreach ($category['products'] as [$imageSlug, $name, $description, $price, $salePrice, $stock]) {
                if ($maxProducts > 0 && $imported >= $maxProducts) {
                    break;
                }

                Product::create([
                    'name' => $name,
                    'sku' => 'DEMO-' . strtoupper($imageSlug),
                    'description' => $description,
                    'price' => $price,
                    'sale_price' => $salePrice,
                    'stock' => $stock,
                    'cover_image' => '/storage/demo/' . $imageSlug . '.svg',
                    'images' => json_encode(['/storage/demo/' . $imageSlug . '.svg']),
                    'category_id' => $categoryModel->id,
                    'store_id' => $store->id,
                    'is_active' => true,
                ]);

                $imported++;
            }
        }
    }

    private function buildSvg(string $emoji, string $from, string $to): string
    {
        return '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">'
            . '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
            . '<stop offset="0%" stop-color="' . $from . '"/>'
            . '<stop offset="100%" stop-color="' . $to . '"/>'
            . '</linearGradient></defs>'
            . '<rect width="600" height="600" fill="url(#g)"/>'
            . '<circle cx="80" cy="80" r="120" fill="rgba(255,255,255,0.12)"/>'
            . '<circle cx="520" cy="520" r="160" fill="rgba(255,255,255,0.10)"/>'
            . '<circle cx="470" cy="120" r="70" fill="rgba(255,255,255,0.08)"/>'
            . '<text x="50%" y="54%" font-size="230" text-anchor="middle" dominant-baseline="middle">' . $emoji . '</text>'
            . '</svg>';
    }

    private function seedData(Store $store): void
    {
        $this->importCatalog($store, 'ar');
    }

    /**
     * Full demo catalog, localizable. Product rows are
     * [imageSlug, name, description, price, salePrice, stock].
     */
    private function catalog(string $lang): array
    {
        return $lang === 'en' ? $this->catalogEnglish() : $this->catalogArabic();
    }

    private function catalogArabic(): array
    {
        return [
            'cat-electronics' => [
                'name' => 'إلكترونيات',
                'products' => [
                    ['p1', 'هاتف نوكس X1 الذكي', 'هاتف ذكي بشاشة AMOLED 6.7 بوصة وكاميرا 108 ميجابكسل وبطارية تدوم طوال اليوم.', 1499, 1799, 25],
                    ['p2', 'سماعات لاسلكية برو', 'سماعات أذن لاسلكية مع عزل الضوضاء النشط ونقاء صوت عالي الجودة.', 299, 399, 50],
                    ['p3', 'ساعة ذكية فيت تي', 'ساعة ذكية متعددة الوظائف مع تتبع اللياقة والنوم والإشعارات الذكية.', 499, 599, 30],
                ],
            ],
            'cat-fashion' => [
                'name' => 'أزياء',
                'products' => [
                    ['p4', 'فستان صيفي أنيق', 'فستان صيفي خفيف بتصميم عصري يناسب جميع المناسبات.', 199, 249, 15],
                    ['p5', 'تيشيرت قطني', 'تيشيرت قطن 100% مريح وناعم بجميع المقاسات والألوان.', 89, 119, 80],
                    ['p6', 'حذاء رياضي رياضي', 'حذاء رياضي خفيف ومريح مثالي للجري والمشي اليومي.', 249, 349, 20],
                ],
            ],
            'cat-home' => [
                'name' => 'منزل ومطبخ',
                'products' => [
                    ['p7', 'طقم أواني منزلية', 'طقم أواني مطبخية كامل مقاوم للخدش مناسب لجميع أنواع الطهي.', 349, 449, 12],
                    ['p8', 'مصباح مكتبي ليد', 'مصباح مكتبي بإضاءة LED قابلة للتعديل مع شحن USB.', 129, 159, 40],
                ],
            ],
            'cat-beauty' => [
                'name' => 'جمال وعناية',
                'products' => [
                    ['p9', 'كريم ترطيب البشرة', 'كريم غني بالمرطبات الطبيعية للعناية اليومية بالبشرة.', 99, 129, 45],
                    ['p10', 'عطر مسك فاخر', 'عطر مسك شرقي فاخر برائحة تدوم طوال اليوم.', 159, 199, 35],
                ],
            ],
            'cat-kids' => [
                'name' => 'أطفال',
                'products' => [
                    ['p11', 'لعبة تعليمية ذكية', 'لعبة تعليمية تفاعلية تساعد على تنمية مهارات الطفل.', 79, 99, 60],
                    ['p12', 'حقيبة مدرسية مريحة', 'حقيبة مدرسية مريحة بتصميم عصري وحماية لظهر الطفل.', 119, 149, 28],
                ],
            ],
            'cat-books' => [
                'name' => 'كتب',
                'products' => [
                    ['p13', 'رواية «ظل الريح»', 'رواية أدبية آسرة تأخذك في رحلة لا تُنسى بين أسرار مدينة قديمة.', 89, 109, 40],
                    ['p13', 'كتاب «فن التفكير»', 'دليل عملي لتطوير مهارات التفكير النقدي واتخاذ القرار.', 75, 95, 55],
                    ['p14', 'موسوعة التاريخ المصور', 'مرجع مصور غني بالصور النادرة يروي قصة الحضارات.', 199, 249, 20],
                ],
            ],
            'cat-coffee' => [
                'name' => 'قهوة ومشروبات',
                'products' => [
                    ['p15', 'قهوة عربية فاخرة', 'حبوب مختارة محمصة بعناية لنكهة غنية ورغوة مثالية.', 129, 149, 70],
                    ['p14', 'ماكينة إسبريسو', 'ماكينة إسبريسو منزلية بضغط 15 بار ورغوة حليب احترافية.', 899, 1099, 10],
                    ['p15', 'كوب سيراميك حراري', 'كوب يحافظ على حرارة مشروبك لساعات بتصميم أنيق.', 49, 69, 90],
                ],
            ],
            'cat-pharmacy' => [
                'name' => 'صيدلية',
                'products' => [
                    ['p16', 'مكمل فيتامين د', 'مكمل غذائي يقوي المناعة والعظام بجرعة يومية متوازنة.', 59, 79, 120],
                    ['p16', 'جهاز قياس الضغط', 'جهاز رقمي دقيق لقياس ضغط الدم في المنزل.', 149, 199, 35],
                    ['p17', 'عناية بالبشرة الحساسة', 'مجموعة لطيفة لتنظيف وترطيب البشرة الحساسة.', 99, 129, 45],
                ],
            ],
            'cat-pets' => [
                'name' => 'مستلزمات الحيوانات',
                'products' => [
                    ['p17', 'طعام قطط متوازن', 'طعام جاف غني بالبروتين والفيتامينات لنمو صحي.', 119, 149, 80],
                    ['p18', 'سرير كلب مريح', 'سرير فاخر بتصميم مريح يدعم مفاصل حيوانك الأليف.', 169, 219, 30],
                    ['p18', 'طوق بمناسبة ذكية', 'طوق مزود بشريحة تتبع الموقع لحيوانك الأليف.', 89, 119, 50],
                ],
            ],
            'cat-perfumes' => [
                'name' => 'عطور',
                'products' => [
                    ['p19', 'عطر العود الملكي', 'عطر شرقي فاخر برائحة العود والعنبر تدوم طوال اليوم.', 249, 329, 25],
                    ['p19', 'ماء عطر الزهور', 'عطر منعش بنفحات زهرية ناعمة تناسب الاستخدام اليومي.', 159, 199, 60],
                    ['p20', 'مجموعة عطور مصغرة', 'تشكيلة من 5 عطور مصغرة لاكتشاف توقيعك الخاص.', 129, 179, 40],
                ],
            ],
            'cat-flowers' => [
                'name' => 'زهور وهدايا',
                'products' => [
                    ['p21', 'باقة ورد طبيعي', 'باقة ورد طازج مقطوفة صباح كل يوم بألوان مبهجة.', 149, 189, 20],
                    ['p21', 'صندوق هدية ورد', 'صندوق أنيق مملوء بالورد المجفف مع رسالة شخصية.', 179, 229, 15],
                    ['p22', 'نبتة مكتبية أنيقة', 'نبتة منزلية سهلة العناية تضفي لمسة خضراء على مكتبك.', 59, 79, 70],
                ],
            ],
            'cat-home-tools' => [
                'name' => 'أدوات منزلية',
                'products' => [
                    ['p23', 'صندوق عدة كامل', 'صندوق أدوات متكامل بجودة متينة لكل أعمال المنزل.', 299, 399, 25],
                    ['p23', 'مثقاب كهربائي', 'مثقاب قوي ببطارية تدوم طويلاً وسرعات متعددة.', 249, 329, 18],
                    ['p24', 'مقياس ليزر للمسافات', 'أداة قياس ليزر دقيقة للتصميم والديكور.', 129, 169, 30],
                ],
            ],
            'cat-handcrafted' => [
                'name' => 'حرف يدوية',
                'products' => [
                    ['p25', 'سلة خيزران منسوجة', 'سلة يدوية الصنع من خامات طبيعية 100%.', 99, 129, 35],
                    ['p25', 'إبريق فخاري مزخرف', 'قطعة فخارية مصنوعة يدوياً بنقوش تقليدية.', 139, 179, 20],
                    ['p26', 'شال صوفي محبوك', 'شال دافئ محبوك يدوياً بألوان ترابية هادئة.', 189, 239, 15],
                ],
            ],
            'cat-grocery' => [
                'name' => 'بقالة',
                'products' => [
                    ['p27', 'علبة فواكه موسمية', 'فواكه طازجة مختارة بعناية من أفضل المزارع.', 79, 99, 100],
                    ['p27', 'طرد خضروات طازج', 'خضروات يومية طازجة تلبي احتياجات أسبوع كامل.', 89, 109, 85],
                    ['p22', 'زيت زيتون بكر', 'زيت زيتون بكر ممتاز من معصرة تقليدية.', 149, 189, 60],
                ],
            ],
            'cat-stationery' => [
                'name' => 'قرطاسية',
                'products' => [
                    ['p13', 'دفتر ملاحظات فاخر', 'دفتر بغلاف جلدي وورق عالي الجودة لكتابة سلسة.', 45, 65, 120],
                    ['p14', 'طقم أقلام رصاص', 'مجموعة أقلام رصاص احترافية بدرجات متعددة.', 39, 55, 150],
                    ['p13', 'ألوان مائية احترافية', 'طقم ألوان مائية غني مناسب للفنانين والطلاب.', 89, 119, 40],
                ],
            ],
            'cat-electronics-pro' => [
                'name' => 'إلكترونيات احترافية',
                'products' => [
                    ['p23', 'لابتوب عمل قوي', 'لابتوب بمعالج حديث وذاكرة كبيرة للمهام الثقيلة.', 5499, 6499, 8],
                    ['p23', 'شاشة 4K احترافية', 'شاشة بدقة 4K وألوان دقيقة مناسبة للمصممين.', 1899, 2299, 12],
                    ['p24', 'كاميرا ميرورلس', 'كاميرا احترافية بجودة سينمائية وسرعة تركيز عالية.', 3499, 3999, 6],
                ],
            ],
            'cat-jewelry' => [
                'name' => 'مجوهرات',
                'products' => [
                    ['p1', 'خاتم ذهب مرصع', 'خاتم من الذهب الخالص مرصع بأحجار كريمة لامعة.', 2499, 2999, 5],
                    ['p1', 'قلادة ألماس أنيقة', 'قلادة بتصميم راقٍ من الألماس الطبيعي.', 3999, 4599, 3],
                    ['p2', 'سوار فضة مطلي', 'سوار من الفضة الإسترليني بنقشة يدوية.', 899, 1099, 15],
                ],
            ],
            'cat-watches' => [
                'name' => 'ساعات',
                'products' => [
                    ['p25', 'ساعة كرونوغراف', 'ساعة ميكانيكية فاخرة بحركة سويسرية دقيقة.', 5999, 6999, 4],
                    ['p25', 'ساعة جلد كلاسيكية', 'ساعة بتصميم كلاسيكي خالد وجلد طبيعي أصلي.', 899, 1199, 10],
                    ['p26', 'ساعة رياضية مقاومة', 'ساعة مقاومة للماء والصدمات لرياضيين التحمل.', 649, 799, 20],
                ],
            ],
            'cat-b2b' => [
                'name' => 'توريد جملة',
                'products' => [
                    ['p26', 'كرتون عبوات تغليف', 'جملة عبوات تغليف متينة للمتاجر والشركات.', 499, 599, 500],
                    ['p26', 'علبة أقلام ترويجية', 'أقلام مخصصة بكميات كبيرة للتوزيع الترويجي.', 299, 399, 800],
                    ['p22', 'دباسة مكتبية مدرسية', 'دفعة مكتبية من الدباسات عالية الجودة للموردين.', 199, 249, 300],
                ],
            ],
            'cat-sports' => [
                'name' => 'رياضة',
                'products' => [
                    ['p27', 'كرة قدم رسمية', 'كرة قدم معتمدة للاستخدام الاحترافي.', 149, 199, 40],
                    ['p27', 'دمبل قابل للتعديل', 'دمبل ذكي قابل للتعديل من 2 إلى 24 كجم.', 599, 749, 15],
                    ['p3', 'سجادة يوجا مطاطية', 'سجادة يوغا مضادة للانزلاق بسمك مريح.', 129, 169, 35],
                ],
            ],
            'cat-restaurant' => [
                'name' => 'أطباق رئيسية',
                'products' => [
                    ['p20', 'شاورما لحم خاصة', 'لحم متبل على الفحم مع صوص الثوم وخلطة الشيف السرية.', 59, 79, 200],
                    ['p14', 'مانتو محشو بالخضار', 'معجنات رفيعة محشوة بخضار موسمية على طريقة الشيف.', 45, 65, 150],
                    ['p21', 'سلطة البحر الأبيض', 'مأكولات بحرية طازجة مع صلصة حمضيات منعشة.', 79, 99, 90],
                ],
            ],
        ];
    }

    private function catalogEnglish(): array
    {
        return [
            'cat-electronics' => [
                'name' => 'Electronics',
                'products' => [
                    ['p1', 'Nox X1 Smartphone', 'Smartphone with a 6.7-inch AMOLED display, a 108MP camera and an all-day battery.', 1499, 1799, 25],
                    ['p2', 'Pro Wireless Earbuds', 'Wireless earbuds with active noise cancellation and crystal-clear sound.', 299, 399, 50],
                    ['p3', 'Fit T Smartwatch', 'Multi-function smartwatch with fitness and sleep tracking and smart notifications.', 499, 599, 30],
                ],
            ],
            'cat-fashion' => [
                'name' => 'Fashion',
                'products' => [
                    ['p4', 'Elegant Summer Dress', 'Light summer dress with a modern design that suits every occasion.', 199, 249, 15],
                    ['p5', 'Cotton T-Shirt', '100% cotton t-shirt, comfortable and soft in all sizes and colors.', 89, 119, 80],
                    ['p6', 'Athletic Sneakers', 'Lightweight, comfortable running shoes, perfect for jogging and daily walks.', 249, 349, 20],
                ],
            ],
            'cat-home' => [
                'name' => 'Home & Kitchen',
                'products' => [
                    ['p7', 'Home Cookware Set', 'Complete scratch-resistant kitchen cookware set suitable for all cooking styles.', 349, 449, 12],
                    ['p8', 'LED Desk Lamp', 'Desk lamp with adjustable LED lighting and USB charging.', 129, 159, 40],
                ],
            ],
            'cat-beauty' => [
                'name' => 'Beauty & Care',
                'products' => [
                    ['p9', 'Skin Moisturizing Cream', 'Cream rich in natural moisturizers for daily skin care.', 99, 129, 45],
                    ['p10', 'Luxury Musk Perfume', 'Premium oriental musk perfume with a long-lasting scent.', 159, 199, 35],
                ],
            ],
            'cat-kids' => [
                'name' => 'Kids',
                'products' => [
                    ['p11', 'Smart Educational Toy', 'Interactive educational toy that helps develop your child\'s skills.', 79, 99, 60],
                    ['p12', 'Comfortable School Bag', 'Comfortable school bag with a modern design and back support.', 119, 149, 28],
                ],
            ],
            'cat-books' => [
                'name' => 'Books',
                'products' => [
                    ['p13', '"Shadow of the Wind" Novel', 'An absorbing literary novel that takes you on an unforgettable journey.', 89, 109, 40],
                    ['p13', '"The Art of Thinking" Book', 'A practical guide to developing critical thinking and decision-making skills.', 75, 95, 55],
                    ['p14', 'Illustrated History Encyclopedia', 'An illustrated reference full of rare photos telling the story of civilizations.', 199, 249, 20],
                ],
            ],
            'cat-coffee' => [
                'name' => 'Coffee & Drinks',
                'products' => [
                    ['p15', 'Premium Arabic Coffee', 'Hand-picked beans roasted with care for a rich flavor and perfect foam.', 129, 149, 70],
                    ['p14', 'Espresso Machine', 'Home espresso machine with 15-bar pressure and professional milk frothing.', 899, 1099, 10],
                    ['p15', 'Thermal Ceramic Mug', 'A mug that keeps your drink hot for hours with an elegant design.', 49, 69, 90],
                ],
            ],
            'cat-pharmacy' => [
                'name' => 'Pharmacy',
                'products' => [
                    ['p16', 'Vitamin D Supplement', 'A supplement that strengthens immunity and bones with a balanced daily dose.', 59, 79, 120],
                    ['p16', 'Blood Pressure Monitor', 'Accurate digital device for measuring blood pressure at home.', 149, 199, 35],
                    ['p17', 'Sensitive Skin Care', 'A gentle set for cleansing and moisturizing sensitive skin.', 99, 129, 45],
                ],
            ],
            'cat-pets' => [
                'name' => 'Pet Supplies',
                'products' => [
                    ['p17', 'Balanced Cat Food', 'Protein- and vitamin-rich dry food for healthy growth.', 119, 149, 80],
                    ['p18', 'Comfortable Dog Bed', 'Luxurious comfortable design that supports your pet\'s joints.', 169, 219, 30],
                    ['p18', 'Smart Location Collar', 'A collar with a location tracking chip for your pet.', 89, 119, 50],
                ],
            ],
            'cat-perfumes' => [
                'name' => 'Perfumes',
                'products' => [
                    ['p19', 'Royal Oud Perfume', 'Luxurious oriental perfume with oud and amber that lasts all day.', 249, 329, 25],
                    ['p19', 'Floral Eau de Parfum', 'Refreshing fragrance with soft floral notes for everyday use.', 159, 199, 60],
                    ['p20', 'Mini Perfume Collection', 'A selection of 5 mini perfumes to discover your own signature.', 129, 179, 40],
                ],
            ],
            'cat-flowers' => [
                'name' => 'Flowers & Gifts',
                'products' => [
                    ['p21', 'Fresh Flower Bouquet', 'Fresh flowers picked every morning in vibrant colors.', 149, 189, 20],
                    ['p21', 'Flower Gift Box', 'An elegant box filled with dried flowers and a personal message.', 179, 229, 15],
                    ['p22', 'Elegant Desk Plant', 'An easy-care houseplant that adds a green touch to your desk.', 59, 79, 70],
                ],
            ],
            'cat-home-tools' => [
                'name' => 'Home Tools',
                'products' => [
                    ['p23', 'Complete Tool Box', 'A complete, durable tool set for all home repairs.', 299, 399, 25],
                    ['p23', 'Electric Drill', 'Powerful drill with a long-lasting battery and multiple speeds.', 249, 329, 18],
                    ['p24', 'Laser Distance Meter', 'Precise laser measuring tool for design and decoration.', 129, 169, 30],
                ],
            ],
            'cat-handcrafted' => [
                'name' => 'Handcrafted',
                'products' => [
                    ['p25', 'Woven Bamboo Basket', 'A handcrafted basket made from 100% natural materials.', 99, 129, 35],
                    ['p25', 'Decorated Pottery Pitcher', 'A handmade pottery piece with traditional patterns.', 139, 179, 20],
                    ['p26', 'Knitted Wool Shawl', 'A warm, hand-knitted shawl in calm earthy tones.', 189, 239, 15],
                ],
            ],
            'cat-grocery' => [
                'name' => 'Grocery',
                'products' => [
                    ['p27', 'Seasonal Fruit Box', 'Fresh fruits carefully selected from the best farms.', 79, 99, 100],
                    ['p27', 'Fresh Vegetables Pack', 'Daily fresh vegetables that cover a full week of needs.', 89, 109, 85],
                    ['p22', 'Extra Virgin Olive Oil', 'Premium extra virgin olive oil from a traditional press.', 149, 189, 60],
                ],
            ],
            'cat-stationery' => [
                'name' => 'Stationery',
                'products' => [
                    ['p13', 'Luxury Notebook', 'Notebook with a leather cover and high-quality paper for smooth writing.', 45, 65, 120],
                    ['p14', 'Professional Pencil Set', 'Professional pencil set with multiple grades.', 39, 55, 150],
                    ['p13', 'Professional Watercolors', 'A rich watercolor set suitable for artists and students.', 89, 119, 40],
                ],
            ],
            'cat-electronics-pro' => [
                'name' => 'Professional Electronics',
                'products' => [
                    ['p23', 'Powerful Work Laptop', 'Laptop with a modern processor and plenty of memory for heavy tasks.', 5499, 6499, 8],
                    ['p23', 'Professional 4K Monitor', '4K resolution monitor with accurate colors, ideal for designers.', 1899, 2299, 12],
                    ['p24', 'Mirrorless Camera', 'Professional camera with cinematic quality and fast autofocus.', 3499, 3999, 6],
                ],
            ],
            'cat-jewelry' => [
                'name' => 'Jewelry',
                'products' => [
                    ['p1', 'Gemstone Gold Ring', 'A pure gold ring set with sparkling gemstones.', 2499, 2999, 5],
                    ['p1', 'Elegant Diamond Pendant', 'A refined pendant made of natural diamonds.', 3999, 4599, 3],
                    ['p2', 'Silver-Plated Bracelet', 'A sterling silver bracelet with handcrafted engraving.', 899, 1099, 15],
                ],
            ],
            'cat-watches' => [
                'name' => 'Watches',
                'products' => [
                    ['p25', 'Chronograph Watch', 'Luxury mechanical watch with precise Swiss movement.', 5999, 6999, 4],
                    ['p25', 'Classic Leather Watch', 'A timeless classic design with genuine natural leather.', 899, 1199, 10],
                    ['p26', 'Rugged Sports Watch', 'Water- and shock-resistant watch for endurance athletes.', 649, 799, 20],
                ],
            ],
            'cat-b2b' => [
                'name' => 'Bulk Supply',
                'products' => [
                    ['p26', 'Packaging Cartons Box', 'Bulk durable packaging cartons for stores and companies.', 499, 599, 500],
                    ['p26', 'Promotional Pens Box', 'Customized pens in bulk for promotional distribution.', 299, 399, 800],
                    ['p22', 'Office Stapler Bulk', 'Bulk high-quality office staplers for suppliers.', 199, 249, 300],
                ],
            ],
            'cat-sports' => [
                'name' => 'Sports',
                'products' => [
                    ['p27', 'Official Football', 'An approved football for professional use.', 149, 199, 40],
                    ['p27', 'Adjustable Dumbbell', 'Smart adjustable dumbbell from 2 to 24 kg.', 599, 749, 15],
                    ['p3', 'Rubber Yoga Mat', 'Anti-slip yoga mat with comfortable thickness.', 129, 169, 35],
                ],
            ],
            'cat-restaurant' => [
                'name' => 'Main Dishes',
                'products' => [
                    ['p20', 'Special Meat Shawarma', 'Charcoal-grilled seasoned meat with garlic sauce and the chef\'s secret mix.', 59, 79, 200],
                    ['p14', 'Veggie-Filled Mantu', 'Thin pastries stuffed with seasonal vegetables, chef-style.', 45, 65, 150],
                    ['p21', 'White Sea Salad', 'Fresh seafood with a refreshing citrus dressing.', 79, 99, 90],
                ],
            ],
        ];
    }
}
