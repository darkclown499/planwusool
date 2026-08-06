<?php

namespace App\Services;

use App\Models\Category;
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
        'cat-electronics'  => ['🔌', '#4F46E5', '#7C3AED'],
        'cat-fashion'      => ['👗', '#EC4899', '#F43F5E'],
        'cat-home'         => ['🏠', '#F59E0B', '#F97316'],
        'cat-beauty'       => ['✨', '#8B5CF6', '#D946EF'],
        'cat-kids'         => ['🎈', '#22C55E', '#14B8A6'],
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
            'theme' => 'gadgets',
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

    private function writeSvgImages(): void
    {
        foreach (self::IMAGES as $slug => $meta) {
            [$emoji, $from, $to] = $meta;

            $svg = $this->buildSvg($emoji, $from, $to);

            Storage::disk('public')->put('demo/' . $slug . '.svg', $svg);
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
        $data = [
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
        ];

        foreach ($data as $categorySlug => $category) {
            $categoryModel = Category::create([
                'name' => $category['name'],
                'slug' => $categorySlug,
                'description' => '',
                'image' => '/storage/demo/' . $categorySlug . '.svg',
                'store_id' => $store->id,
                'sort_order' => 0,
                'is_active' => true,
            ]);

            foreach ($category['products'] as [$imageSlug, $name, $description, $price, $salePrice, $stock]) {
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
            }
        }
    }
}
