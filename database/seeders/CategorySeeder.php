<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Store;
use App\Services\DemoStoreService;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        // Ensure the demo SVG placeholder images exist for newly seeded stores.
        app(DemoStoreService::class)->writeSvgImages();

        $stores = Store::all();

        foreach ($stores as $store) {
            // Skip if categories already exist for this store - preserve existing client data
            if (Category::where('store_id', $store->id)->exists()) {
                $this->command->info('Categories already exist for store: ' . $store->name . '. Skipping.');
                continue;
            }

            $categories = $this->categoriesForTemplate($store->getTemplateSlug());

            // In demo mode, create all categories; otherwise only first category
            if (!config('app.is_demo')) {
                $categories = array_slice($categories, 0, 1);
            }

            foreach ($categories as $categoryData) {
                $slug = \Illuminate\Support\Str::slug($categoryData['name']);
                $count = Category::where('slug', 'LIKE', $slug . '%')->count();
                $uniqueSlug = $count > 0 ? "{$slug}-{$count}" : $slug;

                Category::create([
                    'name' => $categoryData['name'],
                    'slug' => $uniqueSlug,
                    'image' => $categoryData['image'] ?? '',
                    'description' => $categoryData['description'],
                    'store_id' => $store->id,
                    'sort_order' => $categoryData['sort_order'],
                    'is_active' => true,
                ]);
            }
        }
    }

    /**
     * Per-template Arabic catalog blueprints. Each mirrors the frontend
     * DEMO_CATALOGS (resources/js/builder/demo-catalogs.ts) and is backed by
     * real photos served locally from /images/store, so what the owner sees
     * in the gallery preview matches the seeded storefront exactly.
     */
    private function categoriesForTemplate(string $template): array
    {
        $img = fn (string $name) => "/images/store/{$name}.jpg";

        $blueprints = [
            'classic' => [
                ['name' => 'عطارة وتوابل', 'description' => 'بهارات وأعشاب وتوابل طازجة بروائحها الأصيلة', 'image' => $img('spices')],
                ['name' => 'الفواكه والخضروات', 'description' => 'خضار وفواكه موسمية طازجة تصل يومياً', 'image' => $img('vegetables')],
                ['name' => 'حلويات عربية', 'description' => 'بقلاوة وكنافة وحلويات شرقية بلمسة أصيلة', 'image' => $img('sweets')],
                ['name' => 'أزياء وملابس', 'description' => 'ملابس وأزياء عصرية لكل أفراد العائلة', 'image' => $img('clothes')],
                ['name' => 'قهوة وأعشاب', 'description' => 'قهوة مختصة وأعشاب طبيعية ومحمصات فاخرة', 'image' => $img('coffee')],
                ['name' => 'مخبز ومعجنات', 'description' => 'خبز ومعجنات تخرج من الفرن مباشرة إليك', 'image' => $img('bakery')],
                ['name' => 'ألبان وأجبان', 'description' => 'ألبان وأجبان طازجة يومياً', 'image' => $img('dairy')],
            ],
            'fresh-bakers' => [
                ['name' => 'الخبز والأرغفة', 'description' => 'خبز حجري وعربي وتوست يُخبز على مدار اليوم', 'image' => $img('bakery')],
                ['name' => 'المعجنات', 'description' => 'فطائر وكرواسون ومعجنات ذائبة في الفم', 'image' => $img('bakery')],
                ['name' => 'المخبوزات المالحة', 'description' => 'سمبوسة وفطائر مالحة مثالية للضيافة', 'image' => $img('bakery')],
                ['name' => 'الكيك والتورتات', 'description' => 'كيك وتورتات المناسبات بحشوات فاخرة', 'image' => $img('sweets')],
                ['name' => 'البسكويت والكوكيز', 'description' => 'كوكيز وبسكويت طازج بتشكيلات متنوعة', 'image' => $img('bakery')],
                ['name' => 'قهوة ومشروبات', 'description' => 'قهوة مختصة ومشروبات ساخنة ترافق مخبوزاتك', 'image' => $img('coffee')],
            ],
            'grocery-shopping' => [
                ['name' => 'الفواكه والخضروات', 'description' => 'منتقاة يدوياً كل صباح من أفضل الأسواق', 'image' => $img('vegetables')],
                ['name' => 'الألبان والبيض', 'description' => 'حليب وأجبان وبيض طازج يومياً', 'image' => $img('dairy')],
                ['name' => 'عطارة وتوابل', 'description' => 'توابل وبهارات مطحونة عند الطلب', 'image' => $img('spices')],
                ['name' => 'المواد الغذائية الأساسية', 'description' => 'أرز وسكر وزيوت وسلع تموينية بأسعار الجملة', 'image' => $img('grocery')],
                ['name' => 'الوجبات الخفيفة والمشروبات', 'description' => 'سكريات ومكسرات وعصائر طبيعية', 'image' => $img('fruits')],
            ],
            'super-mart-store' => [
                ['name' => 'المواد الغذائية الأساسية', 'description' => 'كل سلع التموين اليومية تحت سقف واحد', 'image' => $img('grocery')],
                ['name' => 'الفواكه والخضروات', 'description' => 'أقسام طازجة تتجدد يومياً', 'image' => $img('vegetables')],
                ['name' => 'الألبان والبيض', 'description' => 'ثلاجة كاملة من الأجبان والألبان الطازجة', 'image' => $img('dairy')],
                ['name' => 'المنزل والعناية الشخصية', 'description' => 'منظفات وورقيات ومستلزمات المنزل', 'image' => $img('hypermarket')],
                ['name' => 'مخبز ومعجنات', 'description' => 'فرن داخلي يخدمكم على مدار اليوم', 'image' => $img('bakery')],
                ['name' => 'حلويات عربية', 'description' => 'حلويات شرقية وشوكولاتة للضيافة', 'image' => $img('sweets')],
            ],
            'mega-store-woocommerce' => [
                ['name' => 'المواد الغذائية الأساسية', 'description' => 'عبوات جملة وعروض عائلية موفرة', 'image' => $img('grocery')],
                ['name' => 'إكسسوارات الجوال', 'description' => 'شواحن وجرابات وحمايات لأحدث الهواتف', 'image' => $img('electronics')],
                ['name' => 'أجهزة الصوت', 'description' => 'سماعات ومكبرات صوت بأحدث التقنيات', 'image' => $img('electronics')],
                ['name' => 'مفروشات المنزل', 'description' => 'مفارش وأغطية ولحافات بجودة فندقية', 'image' => $img('hypermarket')],
                ['name' => 'الألعاب التعليمية', 'description' => 'ألعاب تنمي مهارات أطفالك وهي تلعب', 'image' => $img('kids-toys')],
                ['name' => 'أزياء وملابس', 'description' => 'تشكيلات عائلية بأفضل القيم', 'image' => $img('clothes')],
            ],
            'ecommerce-mega-store' => [
                ['name' => 'إكسسوارات الجوال', 'description' => 'عروض أسبوعية على ملحقات الجوال', 'image' => $img('electronics')],
                ['name' => 'التقنيات القابلة للارتداء', 'description' => 'ساعات ذكية وأسورة لياقة بأفضل الأسعار', 'image' => $img('electronics')],
                ['name' => 'أزياء النساء', 'description' => 'أحدث صيحات الموسم بخصومات مستمرة', 'image' => $img('clothes')],
                ['name' => 'أزياء الرجال', 'description' => 'قمصان وجاكيتات وبدل بقصات عصرية', 'image' => $img('clothes')],
                ['name' => 'الإكسسوارات', 'description' => 'نظارات وحقائب وأحزمة تكمل إطلالتك', 'image' => $img('clothes')],
            ],
            'ecommerce-clothing' => [
                ['name' => 'أزياء النساء', 'description' => 'قطع مختارة تعكس أناقة الموسم', 'image' => $img('clothes')],
                ['name' => 'أزياء الرجال', 'description' => 'رسمية وكاجوال بخيارات قماش ممتازة', 'image' => $img('clothes')],
                ['name' => 'الأحذية', 'description' => 'جلد طبيعي وقصات كلاسيكية خالدة', 'image' => $img('clothes')],
                ['name' => 'الإكسسوارات', 'description' => 'لمسات أخيرة تصنع الفرق في إطلالتك', 'image' => $img('clothes')],
            ],
            'fashion-designer-mart' => [
                ['name' => 'كوتور نسائي', 'description' => 'قطع سهرة حصرية بإنتاج محدود', 'image' => $img('clothes')],
                ['name' => 'عبايات وقفاطين', 'description' => 'تصاميم راقية بأقمشة يابانية ومغربية', 'image' => $img('clothes')],
                ['name' => 'حقائب فاخرة', 'description' => 'جلد طبيعي بإصدارات محدودة العدد', 'image' => $img('clothes')],
                ['name' => 'مجوهرات وإكسسوارات', 'description' => 'لمسات ذهبية تكمل حضورك المميز', 'image' => $img('clothes')],
            ],
            'kids-fashion' => [
                ['name' => 'أزياء الأطفال', 'description' => 'قطن مريح 100% مصمم لحركة الصغار', 'image' => $img('kids-clothes')],
                ['name' => 'الدمى القطيفة', 'description' => 'رفيق نوم ناعم وآمن لطفلك', 'image' => $img('kids-toys')],
                ['name' => 'الألعاب التعليمية', 'description' => 'تلعب وتتعلم في آن واحد', 'image' => $img('kids-toys')],
                ['name' => 'الأحذية', 'description' => 'أحذية مريحة تدعم خطوات أولى واثقة', 'image' => $img('kids-clothes')],
            ],
            'cosmetic-store' => [
                ['name' => 'العناية بالبشرة', 'description' => 'سيرومات ومرطبات بتركيبات فعالة', 'image' => $img('cosmetics')],
                ['name' => 'المكياج', 'description' => 'علامات عالمية أصلية 100%', 'image' => $img('cosmetics')],
                ['name' => 'العطور', 'description' => 'عطور شرقية وفرنسية بثبات استثنائي', 'image' => $img('perfume')],
                ['name' => 'العناية بالشعر', 'description' => 'زيوت وكريمات تستعيد حيوية شعرك', 'image' => $img('cosmetics')],
            ],
            'restaurant-food-delivery' => [
                ['name' => 'المشاوي', 'description' => 'مشاوي على الفحم بنكهة أصيلة', 'image' => $img('grills')],
                ['name' => 'الوجبات السريعة', 'description' => 'برجر وبطاطس ووجبات عائلية موفرة', 'image' => $img('fast-food')],
                ['name' => 'الأطباق الرئيسية', 'description' => 'كبسة ومندي وطبخات شعبية أصيلة', 'image' => $img('restaurant-dish')],
                ['name' => 'المقبلات والسلطات', 'description' => 'بدايات شهية تفتح الشهية', 'image' => $img('restaurant-dish')],
                ['name' => 'الحلويات', 'description' => 'ختام حلو يليق بوجبتك', 'image' => $img('sweets')],
            ],
            'e-storefront' => [
                ['name' => 'إكسسوارات الجوال', 'description' => 'شواحن سريعة وحمايات لأحدث الإصدارات', 'image' => $img('electronics')],
                ['name' => 'أجهزة الصوت', 'description' => 'سماعات ANC ومكبرات محمولة', 'image' => $img('electronics')],
                ['name' => 'التقنيات القابلة للارتداء', 'description' => 'ساعات ذكية وأسورة رياضية', 'image' => $img('electronics')],
                ['name' => 'الطاقة والشحن', 'description' => 'باور بانك وشواحن GaN بسرعات قصوى', 'image' => $img('electronics')],
                ['name' => 'إكسسوارات الكمبيوتر', 'description' => 'لوحات مفاتيح وفئران وملحقات مكتبية', 'image' => $img('electronics')],
            ],
            'ecommece-marketplace' => [
                ['name' => 'المواد الغذائية الأساسية', 'description' => 'سلع التموين من بائعين موثوقين', 'image' => $img('grocery')],
                ['name' => 'أزياء النساء', 'description' => 'تشكيلة متجددة من متاجر متعددة', 'image' => $img('clothes')],
                ['name' => 'مفروشات المنزل', 'description' => 'كل ما يجعل منزلك أجمل', 'image' => $img('hypermarket')],
                ['name' => 'العطور', 'description' => 'عطور أصلية بأسعار منافسة', 'image' => $img('perfume')],
                ['name' => 'إكسسوارات الجوال', 'description' => 'ملحقات تقنية بضمان الوكلاء', 'image' => $img('electronics')],
            ],
            'marketplace-shop' => [
                ['name' => 'مفروشات المنزل', 'description' => 'مفارش وأغطية تضيف دفء لغرفتك', 'image' => $img('hypermarket')],
                ['name' => 'ديكور الجدران', 'description' => 'لوحات وقطع فنية بلمسة عربية', 'image' => $img('hypermarket')],
                ['name' => 'الإكسسوارات', 'description' => 'محافظ وأحزمة وقطع جلدية أنيقة', 'image' => $img('clothes')],
                ['name' => 'حلويات عربية', 'description' => 'بوكسات ضيافة وهدايا جاهزة', 'image' => $img('sweets')],
                ['name' => 'إكسسوارات الجوال', 'description' => 'ملحقات عملية بأسعار مدروسة', 'image' => $img('electronics')],
            ],
        ];

        $list = $blueprints[$template] ?? $blueprints['classic'];

        return array_map(fn ($c, $i) => $c + ['sort_order' => $i + 1], $list, array_keys($list));
    }
}
