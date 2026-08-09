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
     * Resolve the category blueprint for a store based on its active template.
     */
    private function categoriesForStore($store): array
    {
        $template = $store->getTemplateSlug();

        $demo = fn ($slug, $name, $desc, $sort) => [
            'name' => $name,
            'description' => $desc,
            'image' => '/storage/demo/' . $slug . '.svg',
            'sort_order' => $sort,
        ];

        // Legacy themes are still supported (e.g. stores created before the
        // template system). New templates get a fresh blueprint below.
        $legacy = [
            'gadgets' => [
                ['name' => 'Mobile Accessories', 'description' => 'Phone cases, screen protectors, chargers, and mobile device accessories', 'image' => '/storage/media/1/collection.png', 'sort_order' => 1],
                ['name' => 'Audio Devices', 'description' => 'Headphones, earbuds, speakers, and premium audio equipment', 'image' => '/storage/media/2/collection.png', 'sort_order' => 2],
                ['name' => 'Wearable Tech', 'description' => 'Smartwatches, fitness trackers, and wearable technology devices', 'image' => '/storage/media/3/collection.png', 'sort_order' => 3],
                ['name' => 'Power & Charging', 'description' => 'Power banks, wireless chargers, cables, and charging accessories', 'image' => '/storage/media/4/collection.png', 'sort_order' => 4],
                ['name' => 'Computer Accessories', 'description' => 'Keyboards, mice, webcams, and computer peripheral devices', 'image' => '/storage/media/5/collection.png', 'sort_order' => 5],
            ],
            'fashion' => [
                ['name' => "Men's Fashion", 'description' => 'Stylish clothing, shirts, pants, jackets, and casual wear for men', 'image' => '/storage/media/246/collection.png', 'sort_order' => 1],
                ['name' => "Women's Fashion", 'description' => 'Trendy dresses, tops, bottoms, and outerwear for women', 'image' => '/storage/media/247/collection.png', 'sort_order' => 2],
                ['name' => "Kid's Fashion", 'description' => 'Comfortable and stylish clothing for children and toddlers', 'image' => '/storage/media/248/collection.png', 'sort_order' => 3],
                ['name' => 'Footwear', 'description' => 'Designer shoes, sneakers, boots, and sandals for all occasions', 'image' => '/storage/media/249/collection.png', 'sort_order' => 4],
                ['name' => 'Accessories', 'description' => 'Bags, jewelry, watches, and fashion accessories', 'image' => '/storage/media/250/collection.png', 'sort_order' => 5],
            ],
            'home-decor' => [
                ['name' => 'Wall Decor', 'description' => 'Wall art, mirrors, frames, and decorative wall accessories', 'image' => '/storage/media/491/collection.png', 'sort_order' => 1],
                ['name' => 'Lighting & Lamps', 'description' => 'Table lamps, floor lamps, ceiling lights, and lighting fixtures', 'image' => '/storage/media/492/collection.png', 'sort_order' => 2],
                ['name' => 'Home Furnishings', 'description' => 'Cushions, curtains, rugs, and soft furnishing accessories', 'image' => '/storage/media/493/collection.png', 'sort_order' => 3],
                ['name' => 'Decorative Accents', 'description' => 'Vases, candles, sculptures, and decorative home accessories', 'image' => '/storage/media/494/collection.png', 'sort_order' => 4],
                ['name' => 'Storage & Organizers', 'description' => 'Storage boxes, baskets, shelving, and organization solutions', 'image' => '/storage/media/495/collection.png', 'sort_order' => 5],
            ],
            'bakery' => [
                ['name' => 'Cakes', 'description' => 'Custom cakes, birthday cakes, celebration cakes, and specialty desserts', 'image' => '/storage/media/736/collection.png', 'sort_order' => 1],
                ['name' => 'Pastries', 'description' => 'Flaky pastries, croissants, danishes, and morning treats', 'image' => '/storage/media/737/collection.png', 'sort_order' => 2],
                ['name' => 'Breads & Loaves', 'description' => 'Artisan breads, baguettes, sourdough, and daily fresh loaves', 'image' => '/storage/media/738/collection.png', 'sort_order' => 3],
                ['name' => 'Cookies & Biscuits', 'description' => 'Homemade cookies, biscuits, macarons, and sweet treats', 'image' => '/storage/media/739/collection.png', 'sort_order' => 4],
                ['name' => 'Savory Bakes', 'description' => 'Savory pies, quiches, sandwiches, and baked snacks', 'image' => '/storage/media/740/collection.png', 'sort_order' => 5],
            ],
            'supermarket' => [
                ['name' => 'Fruits & Vegetables', 'description' => 'Fresh fruits, vegetables, herbs, and organic produce', 'image' => '/storage/media/981/collection.png', 'sort_order' => 1],
                ['name' => 'Dairy & Eggs', 'description' => 'Milk, cheese, yogurt, eggs, and dairy products', 'image' => '/storage/media/982/collection.png', 'sort_order' => 2],
                ['name' => 'Grocery & Staples', 'description' => 'Canned goods, pasta, rice, oils, and cooking essentials', 'image' => '/storage/media/983/collection.png', 'sort_order' => 3],
                ['name' => 'Snacks & Beverages', 'description' => 'Snacks, drinks, beverages, and refreshments', 'image' => '/storage/media/984/collection.png', 'sort_order' => 4],
                ['name' => 'Household & Personal Care', 'description' => 'Cleaning supplies, personal care, and household necessities', 'image' => '/storage/media/985/collection.png', 'sort_order' => 5],
            ],
            'car-accessories' => [
                ['name' => 'Interior Accessories', 'description' => 'Seat covers, floor mats, organizers, and comfort items', 'image' => '/storage/media/1286/collection.png', 'sort_order' => 1],
                ['name' => 'Exterior Accessories', 'description' => 'Body kits, lights, mirrors, and exterior styling accessories', 'image' => '/storage/media/1287/collection.png', 'sort_order' => 2],
                ['name' => 'Car Electronics', 'description' => 'Audio systems, navigation, dash cams, and electronic accessories', 'image' => '/storage/media/1288/collection.png', 'sort_order' => 3],
                ['name' => 'Safety & Security', 'description' => 'Alarms, locks, safety equipment, and security accessories', 'image' => '/storage/media/1289/collection.png', 'sort_order' => 4],
                ['name' => 'Cleaning & Maintenance', 'description' => 'Car wash supplies, wax, cleaners, and maintenance products', 'image' => '/storage/media/1290/collection.png', 'sort_order' => 5],
            ],
            'toy' => [
                ['name' => 'Soft Toys & Plush', 'description' => 'Cuddly soft toys, plush animals, teddy bears, and comfort toys', 'image' => '/storage/media/1291/collection.png', 'sort_order' => 1],
                ['name' => 'Educational Toys', 'description' => 'Learning toys, STEM kits, puzzles, and brain development games', 'image' => '/storage/media/1292/collection.png', 'sort_order' => 2],
                ['name' => 'Action Figures & Playsets', 'description' => 'Action figures, playsets, collectibles, and adventure toys', 'image' => '/storage/media/1293/collection.png', 'sort_order' => 3],
                ['name' => 'Outdoor & Sports Toys', 'description' => 'Outdoor toys, sports equipment, bikes, and active play items', 'image' => '/storage/media/1294/collection.png', 'sort_order' => 4],
                ['name' => 'Electronic & Remote Toys', 'description' => 'Electronic toys, remote control vehicles, and interactive gadgets', 'image' => '/storage/media/1295/collection.png', 'sort_order' => 5],
            ],
        ];

        if (isset($legacy[$template])) {
            return $legacy[$template];
        }

        $new = [
            'books' => [
                $demo('cat-books', 'Fiction & Literature', 'Novels and literary works selected with care', 1),
                $demo('cat-books', 'Self Development', 'Growth, philosophy and personal development books', 2),
                $demo('cat-books', 'Science & History', 'Richly illustrated science and history references', 3),
            ],
            'coffee-shop' => [
                $demo('cat-coffee', 'Hot Drinks', 'Espresso, specialty coffee and hot beverages', 1),
                $demo('cat-coffee', 'Cold Drinks', 'Iced coffee, cold brew and refreshers', 2),
                $demo('cat-coffee', 'Fresh Pastries', 'Croissants and baked goods from our own kitchen', 3),
            ],
            'pharmacy' => [
                $demo('cat-pharmacy', 'Vitamins & Supplements', 'Trusted daily supplements and vitamins', 1),
                $demo('cat-pharmacy', 'Skin Care', 'Gentle, effective skincare products', 2),
                $demo('cat-pharmacy', 'Medical Devices', 'Home health devices and measuring tools', 3),
            ],
            'pet-store' => [
                $demo('cat-pets', 'Pet Food', 'Balanced premium food for dogs and cats', 1),
                $demo('cat-pets', 'Toys & Play', 'Fun and durable toys for your furry friend', 2),
                $demo('cat-pets', 'Bedding & Comfort', 'Cozy beds and comfort accessories', 3),
            ],
            'perfumes' => [
                $demo('cat-perfumes', 'Men Fragrances', 'Rich masculine scents that last all day', 1),
                $demo('cat-perfumes', 'Women Fragrances', 'Elegant floral and oriental perfumes', 2),
                $demo('cat-perfumes', 'Gift Sets', 'Curated fragrance gift collections', 3),
            ],
            'flowers-gifts' => [
                $demo('cat-flowers', 'Bouquets', 'Fresh flowers arranged by hand daily', 1),
                $demo('cat-flowers', 'Gifts', 'Thoughtful gifts for every occasion', 2),
                $demo('cat-flowers', 'Plants', 'Easy-care indoor plants and greenery', 3),
            ],
            'home-tools' => [
                $demo('cat-home-tools', 'Hand Tools', 'Durable hand tools for every job', 1),
                $demo('cat-home-tools', 'Power Tools', 'Reliable power tools for workshops', 2),
                $demo('cat-home-tools', 'Safety & Hardware', 'Safety gear and hardware supplies', 3),
            ],
            'handcrafted' => [
                $demo('cat-handcrafted', 'Woven & Textile', 'Hand-woven baskets and textiles', 1),
                $demo('cat-handcrafted', 'Pottery & Ceramics', 'Artisan pottery and glazed ceramics', 2),
                $demo('cat-handcrafted', 'Wood Crafts', 'Hand-carved wooden pieces', 3),
            ],
            'grocery-delivery' => [
                $demo('cat-grocery', 'Fresh Produce', 'Daily-picked fruits and vegetables', 1),
                $demo('cat-grocery', 'Dairy & Eggs', 'Fresh dairy, eggs and breakfast staples', 2),
                $demo('cat-grocery', 'Pantry Staples', 'Oils, grains and everyday essentials', 3),
            ],
            'stationery' => [
                $demo('cat-stationery', 'Pens & Writing', 'Smooth writing instruments', 1),
                $demo('cat-stationery', 'Notebooks', 'Premium notebooks and journals', 2),
                $demo('cat-stationery', 'Art Supplies', 'Colors, paints and creative tools', 3),
            ],
            'electronics-pro' => [
                $demo('cat-electronics-pro', 'Computers', 'High-performance laptops and desktops', 1),
                $demo('cat-electronics-pro', 'Displays & Audio', 'Professional 4K displays and audio', 2),
                $demo('cat-electronics-pro', 'Cameras', 'Cameras and video equipment for creators', 3),
            ],
            'luxury-jewelry' => [
                $demo('cat-jewelry', 'Rings', 'Fine gold and diamond rings', 1),
                $demo('cat-jewelry', 'Necklaces', 'Elegant necklaces and pendants', 2),
                $demo('cat-jewelry', 'Bracelets', 'Hand-finished bracelets and bangles', 3),
            ],
            'luxury-watches' => [
                $demo('cat-watches', 'Classic Watches', 'Timeless classic timepieces', 1),
                $demo('cat-watches', 'Sports Watches', 'Durable watches built for action', 2),
                $demo('cat-watches', 'Limited Edition', 'Exclusive limited runs', 3),
            ],
            'b2b-wholesale' => [
                $demo('cat-b2b', 'Packaging', 'Bulk packaging supplies for businesses', 1),
                $demo('cat-b2b', 'Office Bulk', 'Office essentials in wholesale quantities', 2),
                $demo('cat-b2b', 'Business Supplies', 'Commercial supplies and equipment', 3),
            ],
            'sports' => [
                $demo('cat-sports', 'Football & Balls', 'Match-grade balls and equipment', 1),
                $demo('cat-sports', 'Fitness', 'Home and gym fitness gear', 2),
                $demo('cat-sports', 'Athletic Wear', 'Performance sportswear', 3),
            ],
            'beauty-premium' => [
                $demo('cat-beauty', 'Skincare Rituals', 'Rituals for every skin type', 1),
                $demo('cat-beauty', 'Makeup', 'Premium makeup collection', 2),
                $demo('cat-beauty', 'Hair Care', 'Nourishing hair care formulas', 3),
            ],
            'fashion-premium' => [
                $demo('cat-fashion', 'Dresses', 'Editorial dresses and evening wear', 1),
                $demo('cat-fashion', 'Outerwear', 'Tailored coats and jackets', 2),
                $demo('cat-fashion', 'Accessories', 'Refined accessories and bags', 3),
            ],
            'food-premium' => [
                $demo('cat-restaurant', 'Main Courses', 'Chef signature main courses', 1),
                $demo('cat-restaurant', 'Starters', 'Refined appetizers and starters', 2),
                $demo('cat-restaurant', 'Desserts', 'Artisanal desserts and sweets', 3),
            ],
        ];

        // Templates without a dedicated blueprint fall back to a general set.
        $general = [
            $demo('cat-electronics', 'Featured Products', 'Hand-picked bestsellers for this store', 1),
            $demo('cat-electronics', 'New Arrivals', 'The latest products in our catalog', 2),
            $demo('cat-home', 'Best Sellers', 'Customer favourites this month', 3),
        ];

        return $new[$template] ?? $general;
    }
}
