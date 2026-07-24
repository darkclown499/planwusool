<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Store;
use Illuminate\Database\Seeder;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $stores = Store::all();

        foreach ($stores as $store) {
            // Skip if categories already exist for this store - preserve existing client data
            if (Category::where('store_id', $store->id)->exists()) {
                $this->command->info('Categories already exist for store: ' . $store->name . '. Skipping.');
                continue;
            }

            $categories = [];
            
            if ($store->theme === 'gadgets') {
                $categories = [
                    ['name' => 'Mobile Accessories', 'description' => 'Phone cases, screen protectors, chargers, and mobile device accessories', 'image' => '/storage/media/1/collection.png', 'sort_order' => 1],
                    ['name' => 'Audio Devices', 'description' => 'Headphones, earbuds, speakers, and premium audio equipment', 'image' => '/storage/media/2/collection.png', 'sort_order' => 2],
                    ['name' => 'Wearable Tech', 'description' => 'Smartwatches, fitness trackers, and wearable technology devices', 'image' => '/storage/media/3/collection.png', 'sort_order' => 3],
                    ['name' => 'Power & Charging', 'description' => 'Power banks, wireless chargers, cables, and charging accessories', 'image' => '/storage/media/4/collection.png', 'sort_order' => 4],
                    ['name' => 'Computer Accessories', 'description' => 'Keyboards, mice, webcams, and computer peripheral devices', 'image' => '/storage/media/5/collection.png', 'sort_order' => 5],
                ];
            } elseif ($store->theme === 'fashion') {
                $categories = [
                    ['name' => 'Men\'s Fashion', 'description' => 'Stylish clothing, shirts, pants, jackets, and casual wear for men', 'image' => '/storage/media/246/collection.png', 'sort_order' => 1],
                    ['name' => 'Women\'s Fashion', 'description' => 'Trendy dresses, tops, bottoms, and outerwear for women', 'image' => '/storage/media/247/collection.png', 'sort_order' => 2],
                    ['name' => 'Kid\'s Fashion', 'description' => 'Comfortable and stylish clothing for children and toddlers', 'image' => '/storage/media/248/collection.png', 'sort_order' => 3],
                    ['name' => 'Footwear', 'description' => 'Designer shoes, sneakers, boots, and sandals for all occasions', 'image' => '/storage/media/249/collection.png', 'sort_order' => 4],
                    ['name' => 'Accessories', 'description' => 'Bags, jewelry, watches, and fashion accessories', 'image' => '/storage/media/250/collection.png', 'sort_order' => 5],
                ];
            } elseif ($store->theme === 'home-decor') {
                $categories = [
                    ['name' => 'Wall Decor', 'description' => 'Wall art, mirrors, frames, and decorative wall accessories', 'image' => '/storage/media/491/collection.png', 'sort_order' => 1],
                    ['name' => 'Lighting & Lamps', 'description' => 'Table lamps, floor lamps, ceiling lights, and lighting fixtures', 'image' => '/storage/media/492/collection.png', 'sort_order' => 2],
                    ['name' => 'Home Furnishings', 'description' => 'Cushions, curtains, rugs, and soft furnishing accessories', 'image' => '/storage/media/493/collection.png', 'sort_order' => 3],
                    ['name' => 'Decorative Accents', 'description' => 'Vases, candles, sculptures, and decorative home accessories', 'image' => '/storage/media/494/collection.png', 'sort_order' => 4],
                    ['name' => 'Storage & Organizers', 'description' => 'Storage boxes, baskets, shelving, and organization solutions', 'image' => '/storage/media/495/collection.png', 'sort_order' => 5],
                ];
            } elseif ($store->theme === 'bakery') {
                $categories = [
                    ['name' => 'Cakes', 'description' => 'Custom cakes, birthday cakes, celebration cakes, and specialty desserts', 'image' => '/storage/media/736/collection.png', 'sort_order' => 1],
                    ['name' => 'Pastries', 'description' => 'Flaky pastries, croissants, danishes, and morning treats', 'image' => '/storage/media/737/collection.png', 'sort_order' => 2],
                    ['name' => 'Breads & Loaves', 'description' => 'Artisan breads, baguettes, sourdough, and daily fresh loaves', 'image' => '/storage/media/738/collection.png', 'sort_order' => 3],
                    ['name' => 'Cookies & Biscuits', 'description' => 'Homemade cookies, biscuits, macarons, and sweet treats', 'image' => '/storage/media/739/collection.png', 'sort_order' => 4],
                    ['name' => 'Savory Bakes', 'description' => 'Savory pies, quiches, sandwiches, and baked snacks', 'image' => '/storage/media/740/collection.png', 'sort_order' => 5],
                ];
            } elseif ($store->theme === 'supermarket') {
                $categories = [
                    ['name' => 'Fruits & Vegetables', 'description' => 'Fresh fruits, vegetables, herbs, and organic produce', 'image' => '/storage/media/981/collection.png', 'sort_order' => 1],
                    ['name' => 'Dairy & Eggs', 'description' => 'Milk, cheese, yogurt, eggs, and dairy products', 'image' => '/storage/media/982/collection.png', 'sort_order' => 2],
                    ['name' => 'Grocery & Staples', 'description' => 'Canned goods, pasta, rice, oils, and cooking essentials', 'image' => '/storage/media/983/collection.png', 'sort_order' => 3],
                    ['name' => 'Snacks & Beverages', 'description' => 'Snacks, drinks, beverages, and refreshments', 'image' => '/storage/media/984/collection.png', 'sort_order' => 4],
                    ['name' => 'Household & Personal Care', 'description' => 'Cleaning supplies, personal care, and household necessities', 'image' => '/storage/media/985/collection.png', 'sort_order' => 5],
                ];
            } elseif ($store->theme === 'car-accessories') {
                $categories = [
                    ['name' => 'Interior Accessories', 'description' => 'Seat covers, floor mats, organizers, and comfort items', 'image' => '/storage/media/1286/collection.png', 'sort_order' => 1],
                    ['name' => 'Exterior Accessories', 'description' => 'Body kits, lights, mirrors, and exterior styling accessories', 'image' => '/storage/media/1287/collection.png', 'sort_order' => 2],
                    ['name' => 'Car Electronics', 'description' => 'Audio systems, navigation, dash cams, and electronic accessories', 'image' => '/storage/media/1288/collection.png', 'sort_order' => 3],
                    ['name' => 'Safety & Security', 'description' => 'Alarms, locks, safety equipment, and security accessories', 'image' => '/storage/media/1289/collection.png', 'sort_order' => 4],
                    ['name' => 'Cleaning & Maintenance', 'description' => 'Car wash supplies, wax, cleaners, and maintenance products', 'image' => '/storage/media/1290/collection.png', 'sort_order' => 5],
                ];
            } elseif ($store->theme === 'toy') {
                $categories = [
                    ['name' => 'Soft Toys & Plush', 'description' => 'Cuddly soft toys, plush animals, teddy bears, and comfort toys', 'image' => '/storage/media/1291/collection.png', 'sort_order' => 1],
                    ['name' => 'Educational Toys', 'description' => 'Learning toys, STEM kits, puzzles, and brain development games', 'image' => '/storage/media/1292/collection.png', 'sort_order' => 2],
                    ['name' => 'Action Figures & Playsets', 'description' => 'Action figures, playsets, collectibles, and adventure toys', 'image' => '/storage/media/1293/collection.png', 'sort_order' => 3],
                    ['name' => 'Outdoor & Sports Toys', 'description' => 'Outdoor toys, sports equipment, bikes, and active play items', 'image' => '/storage/media/1294/collection.png', 'sort_order' => 4],
                    ['name' => 'Electronic & Remote Toys', 'description' => 'Electronic toys, remote control vehicles, and interactive gadgets', 'image' => '/storage/media/1295/collection.png', 'sort_order' => 5],
                ];
            }
            
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
}