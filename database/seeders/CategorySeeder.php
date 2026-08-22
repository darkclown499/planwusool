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

            $categories = $this->categoriesForStore($store);

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
     * The single classic-template blueprint: an Arabic local-store catalog
     * (spices, produce, Arabic sweets, fashion...) backed by real photos
     * served locally from /images/store.
     */
    private function categoriesForStore($store): array
    {
        $img = fn (string $name) => "/images/store/{$name}.jpg";

        return [
            ['name' => 'عطارة وتوابل', 'description' => 'بهارات وأعشاب وتوابل طازجة بروائحها الأصيلة', 'image' => $img('spices'), 'sort_order' => 1],
            ['name' => 'الفواكه والخضروات', 'description' => 'خضار وفواكه موسمية طازجة تصل يومياً', 'image' => $img('vegetables'), 'sort_order' => 2],
            ['name' => 'حلويات عربية', 'description' => 'بقلاوة وكنافة وحلويات شرقية بلمسة أصيلة', 'image' => $img('sweets'), 'sort_order' => 3],
            ['name' => 'أزياء وملابس', 'description' => 'ملابس وأزياء عصرية لكل أفراد العائلة', 'image' => $img('clothes'), 'sort_order' => 4],
            ['name' => 'قهوة وأعشاب', 'description' => 'قهوة مختصة وأعشاب طبيعية ومحمصات فاخرة', 'image' => $img('coffee'), 'sort_order' => 5],
            ['name' => 'مخبز ومعجنات', 'description' => 'خبز ومعجنات تخرج من الفرن مباشرة إليك', 'image' => $img('bakery'), 'sort_order' => 6],
            ['name' => 'ألبان وأجبان', 'description' => 'ألبان وأجبان طازجة يومياً', 'image' => $img('dairy'), 'sort_order' => 7],
        ];
    }
}
