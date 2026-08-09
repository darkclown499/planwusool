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
            'Mobile Accessories' => [
                [
                    'name' => 'iPhone 14 Plus mobile cover',
                    'description' => 'Premium protective case for iPhone 14 Plus with shock absorption and precise cutouts.',
                    'specifications' => '<ul><li>Shock-absorbing TPU material</li><li>Precise camera cutouts</li><li>Wireless charging compatible</li><li>Raised edges for screen protection</li><li>Easy installation</li></ul>',
                    'details' => '<p>Protect your iPhone 14 Plus with this premium mobile cover featuring advanced shock absorption technology and precise cutouts for all ports and cameras.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-296420?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-304792?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-301766?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-098636?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-666168?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-399742?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'iPhone 14 - Sheath Screen Protector with Applicator Tray',
                    'description' => 'Tempered glass screen protector with easy installation tray for bubble-free application.',
                    'specifications' => '<ul><li>9H tempered glass</li><li>Bubble-free installation</li><li>Applicator tray included</li><li>99% transparency</li><li>Oleophobic coating</li></ul>',
                    'details' => '<p>Premium tempered glass screen protector with innovative applicator tray for perfect, bubble-free installation every time.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-575336?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-338117?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-284770?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-471037?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-997015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303218?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Luxcell B12 10,000mAh 12W Power Bank',
                    'description' => 'High-capacity portable power bank with fast charging and multiple device support.',
                    'specifications' => '<ul><li>10,000mAh capacity</li><li>12W fast charging</li><li>Dual USB outputs</li><li>LED power indicator</li><li>Compact design</li></ul>',
                    'details' => '<p>Keep your devices powered with this high-capacity power bank featuring fast charging technology and support for multiple devices simultaneously.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-986581?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-649235?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-317316?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-913913?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-024439?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-768196?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Adjustable & Foldable Desktop Phone Holder Stand',
                    'description' => 'Ergonomic phone stand with adjustable angles for comfortable viewing and video calls.',
                    'specifications' => '<ul><li>Adjustable viewing angles</li><li>Foldable design</li><li>Non-slip base</li><li>Universal compatibility</li><li>Aluminum construction</li></ul>',
                    'details' => '<p>Ergonomic phone stand designed for comfortable viewing, video calls, and hands-free use with adjustable angles and stable aluminum construction.</p>',
                    'price' => 16.99,
                    'cover_image' => 'https://images.unsplash.com/photo-677379?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-022324?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-543250?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-475617?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-131296?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-535831?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fast Charge USB to Lightning Data Sync and Charging Cable',
                    'description' => 'MFi certified Lightning cable with fast charging and data sync capabilities.',
                    'specifications' => '<ul><li>MFi certified</li><li>Fast charging support</li><li>Data sync capability</li><li>Durable braided design</li><li>6ft length</li></ul>',
                    'details' => '<p>Premium MFi certified Lightning cable with fast charging support and durable braided construction for reliable data sync and charging.</p>',
                    'price' => 12.99,
                    'variants' => [
                        ['name' => 'Length', 'options' => ['3ft', '6ft', '10ft']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-233258?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-903993?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654422?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-484612?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-712646?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-808658?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'boat Flexcharge 360 3-in-1 Wireless Charger',
                    'description' => 'Multi-device wireless charging station for phone, earbuds, and smartwatch.',
                    'specifications' => '<ul><li>3-in-1 charging station</li><li>15W fast wireless charging</li><li>360-degree rotation</li><li>LED charging indicators</li><li>Universal compatibility</li></ul>',
                    'details' => '<p>Convenient 3-in-1 wireless charging station that can simultaneously charge your phone, earbuds, and smartwatch with fast 15W charging.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-351169?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-636714?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-705182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-489684?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143712?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-460689?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'WeCool S2-Ultra Selfie Stick Tripod',
                    'description' => 'Extendable selfie stick with tripod base and Bluetooth remote control.',
                    'specifications' => '<ul><li>Extendable up to 40 inches</li><li>Tripod base included</li><li>Bluetooth remote control</li><li>360-degree rotation</li><li>Universal phone compatibility</li></ul>',
                    'details' => '<p>Versatile selfie stick with tripod functionality and Bluetooth remote for perfect photos and videos from any angle or distance.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black', 'Red']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-382519?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-551356?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214522?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-682024?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-410787?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-232643?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'PopSockets Phone Grip with Expanding Kickstand',
                    'description' => 'Collapsible phone grip and stand for secure holding and hands-free viewing.',
                    'specifications' => '<ul><li>Collapsible design</li><li>Secure phone grip</li><li>Kickstand functionality</li><li>Reusable adhesive</li><li>Swappable top design</li></ul>',
                    'details' => '<p>The original PopSocket phone grip that expands for secure holding and collapses flat, with kickstand functionality for hands-free viewing.</p>',
                    'price' => 14.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Gray', 'Blue', 'Brown']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-573874?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-987732?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-471160?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-811543?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-385782?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-113267?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Audio Devices' => [
                [
                    'name' => 'Mi Dual Driver Wired Earphones',
                    'description' => 'Premium wired earphones with dual drivers for superior sound quality and comfort.',
                    'specifications' => '<ul><li>Dual driver technology</li><li>Superior sound quality</li><li>Comfortable fit</li><li>Tangle-free cable</li><li>In-line microphone</li></ul>',
                    'details' => '<p>Experience exceptional audio quality with Mi Dual Driver Wired Earphones featuring advanced dual driver technology for crisp highs and deep bass.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-780381?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-315840?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-976200?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-763731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-120462?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-835951?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'boAt Airdopes 138 Pro',
                    'description' => 'True wireless earbuds with active noise cancellation and long battery life.',
                    'specifications' => '<ul><li>True wireless design</li><li>Active noise cancellation</li><li>32-hour total playback</li><li>IPX4 water resistance</li><li>Touch controls</li></ul>',
                    'details' => '<p>boAt Airdopes 138 Pro delivers premium wireless audio experience with ANC technology and extended battery life for all-day listening.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-010633?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-464819?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-563101?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-454748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-750329?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-431205?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'JBL Tune 520BT Wireless On Ear Headphones',
                    'description' => 'Wireless on-ear headphones with JBL Pure Bass sound and long battery life.',
                    'specifications' => '<ul><li>JBL Pure Bass sound</li><li>57-hour battery life</li><li>Wireless Bluetooth 5.3</li><li>Lightweight design</li><li>Multi-point connection</li></ul>',
                    'details' => '<p>JBL Tune 520BT headphones deliver legendary JBL Pure Bass sound with incredible 57-hour battery life and comfortable on-ear design.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-148358?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-612295?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-495869?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-072026?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-236412?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-582503?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Pro Bass Bluetooth Neckband',
                    'description' => 'Wireless neckband earphones with enhanced bass and magnetic earbuds.',
                    'specifications' => '<ul><li>Enhanced bass response</li><li>Magnetic earbuds</li><li>15-hour battery life</li><li>IPX5 sweat resistance</li><li>Quick charge support</li></ul>',
                    'details' => '<p>Pro Bass Bluetooth Neckband offers powerful bass response and convenient magnetic earbuds with all-day battery life for active lifestyles.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-359408?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-301466?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-135338?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-862995?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-894042?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-470794?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => '10W Bluetooth Soundbar Speaker',
                    'description' => 'Compact Bluetooth soundbar with 10W output for enhanced TV and music audio.',
                    'specifications' => '<ul><li>10W total output</li><li>Bluetooth 5.0 connectivity</li><li>Multiple input options</li><li>Compact design</li><li>Remote control included</li></ul>',
                    'details' => '<p>Enhance your TV and music experience with this compact 10W Bluetooth soundbar featuring multiple connectivity options and clear audio output.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-995688?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-291094?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-745334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126992?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-348714?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-321802?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Zebronics Juke Bar 10000 Soundbar',
                    'description' => 'Premium soundbar with powerful audio output and multiple connectivity options.',
                    'specifications' => '<ul><li>Powerful audio output</li><li>Multiple connectivity</li><li>LED display</li><li>Remote control</li><li>Wall mountable</li></ul>',
                    'details' => '<p>Zebronics Juke Bar 10000 delivers premium sound quality with powerful drivers and versatile connectivity for the ultimate home audio experience.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-763300?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-821106?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-502318?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-848527?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315916?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-716490?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'High-Performance Gaming Headset',
                    'description' => 'Professional gaming headset with 7.1 surround sound and noise-canceling microphone.',
                    'specifications' => '<ul><li>7.1 surround sound</li><li>Noise-canceling microphone</li><li>RGB lighting</li><li>Comfortable padding</li><li>Multi-platform compatibility</li></ul>',
                    'details' => '<p>Professional gaming headset designed for competitive gaming with immersive 7.1 surround sound and crystal-clear communication.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black','White']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-656123?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-859178?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-049481?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-922143?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-160497?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-144632?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Shure MV7 USB / XLR Podcast Microphone',
                    'description' => 'Professional podcast microphone with USB and XLR connectivity for studio-quality recording.',
                    'specifications' => '<ul><li>USB and XLR outputs</li><li>Studio-quality recording</li><li>Built-in headphone monitoring</li><li>Touch panel controls</li><li>Professional-grade construction</li></ul>',
                    'details' => '<p>Shure MV7 is the ultimate podcast microphone offering both USB and XLR connectivity with professional studio-quality sound for content creators.</p>',
                    'price' => 279.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black','White']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-796258?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-649198?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-583224?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-293285?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-923383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-430979?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Wearable Tech' => [
                [
                    'name' => 'Noise Halo 2 - Limited Edition',
                    'description' => 'Premium limited edition smartwatch with advanced health monitoring and sleek design.',
                    'specifications' => '<ul><li>Limited edition design</li><li>Advanced health monitoring</li><li>7-day battery life</li><li>Water resistant IP68</li><li>Multiple sport modes</li></ul>',
                    'details' => '<p>Noise Halo 2 Limited Edition combines premium aesthetics with cutting-edge health technology for the ultimate smartwatch experience.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-042563?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-000219?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-910670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-549690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-835036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-022441?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Samsung Galaxy Fit E Smart Band',
                    'description' => 'Lightweight fitness tracker with heart rate monitoring and sleep tracking.',
                    'specifications' => '<ul><li>Heart rate monitoring</li><li>Sleep tracking</li><li>Water resistant 5ATM</li><li>Up to 1 week battery</li><li>Lightweight design</li></ul>',
                    'details' => '<p>Samsung Galaxy Fit E offers essential fitness tracking features in a comfortable, lightweight design perfect for everyday wear.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-362133?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-861134?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-953686?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-972119?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-895475?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-619748?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Women\'s Smart Ring NFC Control Heart Rate',
                    'description' => 'Elegant smart ring with NFC control, heart rate monitoring, and health tracking.',
                    'specifications' => '<ul><li>NFC control functionality</li><li>Heart rate monitoring</li><li>Health tracking sensors</li><li>Elegant design</li><li>Waterproof construction</li></ul>',
                    'details' => '<p>Revolutionary smart ring designed for women, combining elegant aesthetics with advanced health monitoring and NFC control capabilities.</p>',
                    'price' => 199.99,
                    'cover_image' => 'https://images.unsplash.com/photo-773439?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-563762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-911587?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-609987?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-919383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-861748?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Pebble Newly Launched Qore Fitness Band',
                    'description' => 'Advanced fitness band with comprehensive health monitoring and long battery life.',
                    'specifications' => '<ul><li>Comprehensive health monitoring</li><li>15-day battery life</li><li>SpO2 monitoring</li><li>Multiple workout modes</li><li>Water resistant IP67</li></ul>',
                    'details' => '<p>Pebble Qore Fitness Band delivers comprehensive health insights with extended battery life and advanced monitoring capabilities for active lifestyles.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-753240?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-477697?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-601676?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-033861?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-738709?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-494572?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Noise Champ 2 Smartwatch',
                    'description' => 'Feature-rich smartwatch with Bluetooth calling and health monitoring.',
                    'specifications' => '<ul><li>Bluetooth calling</li><li>Health monitoring suite</li><li>1.39-inch AMOLED display</li><li>7-day battery life</li><li>100+ watch faces</li></ul>',
                    'details' => '<p>Noise Champ 2 Smartwatch offers premium features including Bluetooth calling and comprehensive health monitoring in a stylish package.</p>',
                    'price' => 129.99,
                    'sale_price' => 109.99,
                    'cover_image' => 'https://images.unsplash.com/photo-276707?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-861336?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-781425?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-520282?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-546972?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-699327?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Apple Vision Pro',
                    'description' => 'Revolutionary spatial computer with advanced mixed reality capabilities.',
                    'specifications' => '<ul><li>Spatial computing</li><li>Mixed reality experience</li><li>Eye tracking technology</li><li>Hand gesture control</li><li>Ultra-high resolution displays</li></ul>',
                    'details' => '<p>Apple Vision Pro represents the future of computing with groundbreaking spatial technology and immersive mixed reality experiences.</p>',
                    'price' => 3499.99,
                    'cover_image' => 'https://images.unsplash.com/photo-895032?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-268498?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-452993?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-945909?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-373813?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-373795?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Bluetooth TAG & Item Finder for Keys',
                    'description' => 'Smart Bluetooth tracker for keys and valuables with precision finding.',
                    'specifications' => '<ul><li>Precision finding</li><li>Bluetooth 5.0</li><li>Replaceable battery</li><li>Water resistant</li><li>Mobile app integration</li></ul>',
                    'details' => '<p>Never lose your keys again with this smart Bluetooth tracker featuring precision finding technology and seamless mobile app integration.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black', 'Green', 'White']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-324359?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-515283?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404442?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-197459?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-403469?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-980928?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Headband Smart Brainwave Sensor Wearable Headband',
                    'description' => 'Advanced brainwave monitoring headband for meditation and cognitive training.',
                    'specifications' => '<ul><li>EEG brainwave monitoring</li><li>Meditation guidance</li><li>Cognitive training</li><li>Comfortable headband design</li><li>Mobile app connectivity</li></ul>',
                    'details' => '<p>Revolutionary brainwave sensor headband that monitors your mental state and provides guided meditation and cognitive training experiences.</p>',
                    'price' => 299.99,
                    'sale_price' => 249.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Blue', 'Black']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-108528?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-018787?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-444982?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-426395?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-106620?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-242551?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Power & Charging' => [
                [
                    'name' => 'Samsung 10000 mAh Power Bank',
                    'description' => 'High-capacity portable power bank with fast charging and multiple device support.',
                    'specifications' => '<ul><li>10000 mAh capacity</li><li>Fast charging support</li><li>Dual USB outputs</li><li>LED power indicator</li><li>Compact design</li></ul>',
                    'details' => '<p>Samsung 10000 mAh Power Bank provides reliable portable charging with fast charging technology and support for multiple devices simultaneously.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-474522?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-986820?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-425240?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-799065?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-289367?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-794894?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Noise Power Series Gan 30W GaN Charger',
                    'description' => 'Compact GaN charger with 30W fast charging for smartphones and tablets.',
                    'specifications' => '<ul><li>30W GaN technology</li><li>Compact design</li><li>Fast charging support</li><li>Universal compatibility</li><li>Overcharge protection</li></ul>',
                    'details' => '<p>Noise Power Series GaN 30W charger delivers efficient fast charging in a compact form factor using advanced GaN technology.</p>',
                    'price' => 29.99,
                    'sale_price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-069716?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-539874?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-398353?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-644793?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-032252?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-094380?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Socket Extension Board with Surge Protector',
                    'description' => 'Multi-socket extension board with built-in surge protection and safety features.',
                    'specifications' => '<ul><li>6 universal sockets</li><li>Surge protection</li><li>Overload protection</li><li>LED power indicator</li><li>6-foot power cord</li></ul>',
                    'details' => '<p>Professional extension board with surge protection to safeguard your devices from power fluctuations and electrical surges.</p>',
                    'price' => 39.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Black']],
                        ['name' => 'Sockets', 'options' => ['4 Socket', '6 Socket', '8 Socket']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-488726?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-747789?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-302677?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-409954?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-590281?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-109674?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Belkin USB Cable USB-C To USB-A Braided',
                    'description' => 'Durable braided USB-C to USB-A cable for charging and data transfer.',
                    'specifications' => '<ul><li>USB-C to USB-A</li><li>Braided construction</li><li>Fast charging support</li><li>Data sync capability</li><li>6ft length</li></ul>',
                    'details' => '<p>Belkin braided USB cable with durable construction for reliable charging and data transfer between USB-C and USB-A devices.</p>',
                    'price' => 19.99,
                    'variants' => [
                        ['name' => 'Length', 'options' => ['3ft', '6ft', '10ft']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-280195?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-649095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-669208?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-872246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-868265?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959572?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'POP 67W Triple Port GaN5 Adapter',
                    'description' => 'High-power GaN5 adapter with three ports for simultaneous device charging.',
                    'specifications' => '<ul><li>67W total output</li><li>GaN5 technology</li><li>Triple port design</li><li>USB-C and USB-A ports</li><li>Compact form factor</li></ul>',
                    'details' => '<p>POP 67W Triple Port GaN5 Adapter delivers powerful charging for multiple devices simultaneously using advanced GaN5 technology.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-884432?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-943087?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461449?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-832004?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-843045?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708362?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Power 30 Dual Output Fast Car Charger',
                    'description' => 'Dual-port car charger with 30W fast charging for on-the-go power.',
                    'specifications' => '<ul><li>30W fast charging</li><li>Dual USB outputs</li><li>LED power indicator</li><li>Universal compatibility</li><li>Compact design</li></ul>',
                    'details' => '<p>Car Power 30 provides reliable fast charging for two devices simultaneously while driving, with universal compatibility and safety features.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-362752?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-441222?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-164579?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-050368?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-272625?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-881582?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Portronics Power Plate 7 Extension Board',
                    'description' => 'Smart extension board with 7 sockets and advanced safety features.',
                    'specifications' => '<ul><li>7 universal sockets</li><li>Smart power management</li><li>Overload protection</li><li>Child safety shutters</li><li>8-foot heavy duty cord</li></ul>',
                    'details' => '<p>Portronics Power Plate 7 offers smart power management with 7 sockets and comprehensive safety features for home and office use.</p>',
                    'price' => 44.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Black']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-691524?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-207024?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708487?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-513557?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654030?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-302259?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => '67W Ultra Fast Type-C Charger',
                    'description' => 'Ultra-fast 67W USB-C charger for laptops, tablets, and smartphones.',
                    'specifications' => '<ul><li>67W ultra-fast charging</li><li>USB-C PD support</li><li>Universal compatibility</li><li>Compact design</li><li>Safety certifications</li></ul>',
                    'details' => '<p>67W Ultra Fast Type-C Charger delivers maximum charging speed for USB-C devices including laptops, tablets, and smartphones with safety certifications.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-938078?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-243082?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-487855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-664199?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-044823?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-783394?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Computer Accessories' => [
                [
                    'name' => 'ZEBRONICS Charm Rechargeable Wireless Mouse',
                    'description' => 'Ergonomic rechargeable wireless mouse with precision tracking and long battery life.',
                    'specifications' => '<ul><li>Rechargeable battery</li><li>Wireless connectivity</li><li>Ergonomic design</li><li>Precision optical sensor</li><li>USB-C charging</li></ul>',
                    'details' => '<p>ZEBRONICS Charm wireless mouse offers comfortable ergonomic design with rechargeable battery and precise optical tracking for productivity and gaming.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-431006?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-693512?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-049015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-112626?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-906844?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-584161?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Wired Keyboard Water-Resistant Silent Typing',
                    'description' => 'Water-resistant wired keyboard with silent keys for comfortable typing experience.',
                    'specifications' => '<ul><li>Water-resistant design</li><li>Silent key switches</li><li>Full-size layout</li><li>Durable construction</li><li>USB connectivity</li></ul>',
                    'details' => '<p>Professional wired keyboard featuring water-resistant design and silent key switches for comfortable and quiet typing in any environment.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-836552?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-718250?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-944115?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-258861?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-652441?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-824684?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Wireless Keyboard and Mouse Combo',
                    'description' => 'Complete wireless keyboard and mouse combo set for desktop productivity.',
                    'specifications' => '<ul><li>Wireless keyboard and mouse</li><li>2.4GHz connectivity</li><li>Long battery life</li><li>Compact design</li><li>USB receiver included</li></ul>',
                    'details' => '<p>Complete wireless combo set featuring full-size keyboard and optical mouse with reliable 2.4GHz connectivity and extended battery life.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-901190?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-780106?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005786?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-670852?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-517117?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-179129?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Premium Adjustable Laptop Stand',
                    'description' => 'Ergonomic adjustable laptop stand with multiple height and angle settings.',
                    'specifications' => '<ul><li>Multiple height settings</li><li>Adjustable viewing angles</li><li>Aluminum construction</li><li>Heat dissipation design</li><li>Portable and foldable</li></ul>',
                    'details' => '<p>Premium aluminum laptop stand with multiple adjustment options for ergonomic positioning and improved airflow for better laptop cooling.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-716833?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-697479?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-354821?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-168030?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-580120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-769047?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Zebronics ZEB-NC3300 USB Powered Laptop Cooling Pad',
                    'description' => 'USB-powered laptop cooling pad with multiple fans for optimal temperature control.',
                    'specifications' => '<ul><li>USB powered operation</li><li>Multiple cooling fans</li><li>Adjustable height</li><li>LED indicators</li><li>Universal laptop compatibility</li></ul>',
                    'details' => '<p>Zebronics ZEB-NC3300 cooling pad features multiple fans and adjustable height to keep your laptop cool during intensive tasks.</p>',
                    'price' => 29.99,
                    'sale_price' => 24.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Up to 15.6"', 'Up to 17"']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-912774?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-004779?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333910?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-185555?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-268171?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214439?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Zebronics 200HB USB Hub',
                    'description' => 'Multi-port USB hub for expanding connectivity options with high-speed data transfer.',
                    'specifications' => '<ul><li>Multiple USB ports</li><li>High-speed data transfer</li><li>Plug and play</li><li>Compact design</li><li>LED power indicator</li></ul>',
                    'details' => '<p>Zebronics 200HB USB Hub expands your connectivity with multiple high-speed USB ports in a compact, plug-and-play design.</p>',
                    'price' => 19.99,
                    'variants' => [
                        ['name' => 'Ports', 'options' => ['4 Port', '7 Port']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-909834?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-318563?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-663985?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-771965?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-094490?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-913876?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Zebronics Live Pro Webcam',
                    'description' => 'HD webcam with auto-focus and built-in microphone for video calls and streaming.',
                    'specifications' => '<ul><li>1080p HD video</li><li>Auto-focus technology</li><li>Built-in microphone</li><li>USB plug and play</li><li>Wide-angle lens</li></ul>',
                    'details' => '<p>Zebronics Live Pro Webcam delivers crystal-clear 1080p video with auto-focus and built-in microphone for professional video calls and streaming.</p>',
                    'price' => 44.99,
                    'sale_price' => 39.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black', 'White']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-479324?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-326205?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-642534?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-152297?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777478?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-670329?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'UnionSine External Hard Disk Drive 500GB Portable',
                    'description' => 'Portable external hard drive with 500GB storage capacity and USB 3.0 connectivity.',
                    'specifications' => '<ul><li>500GB storage capacity</li><li>USB 3.0 connectivity</li><li>Portable design</li><li>Plug and play</li><li>Compatible with multiple OS</li></ul>',
                    'details' => '<p>UnionSine 500GB portable external hard drive offers reliable storage expansion with fast USB 3.0 connectivity and cross-platform compatibility.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-296647?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-525472?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-836137?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-113397?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-660080?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129174?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Men\'s Fashion' => [
                [
                    'name' => 'H&M Men\'s Regular Fit T-shirt',
                    'description' => 'Comfortable regular fit t-shirt made from soft cotton blend fabric.',
                    'specifications' => '<ul><li>100% Cotton</li><li>Regular fit</li><li>Crew neck</li><li>Short sleeves</li><li>Machine washable</li></ul>',
                    'details' => '<p>Classic regular fit t-shirt perfect for everyday wear. Made from soft cotton blend for comfort and durability.</p>',
                    'price' => 12.99,
                    'cover_image' => 'https://images.unsplash.com/photo-456247?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-363562?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-451867?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-805385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-314472?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026809?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Highlander Men\'s Solid Casual Shirt',
                    'description' => 'Stylish solid casual shirt with modern fit and premium fabric.',
                    'specifications' => '<ul><li>Cotton blend fabric</li><li>Modern fit</li><li>Button-down collar</li><li>Long sleeves</li><li>Easy care</li></ul>',
                    'details' => '<p>Premium casual shirt with modern fit and solid colors. Perfect for both casual and semi-formal occasions.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['S', 'M', 'L', 'XL', 'XXL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-749990?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-817346?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-597680?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-346874?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143402?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-030362?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Levi\'s Men\'s 511 Slim Fit Jeans',
                    'description' => 'Classic slim fit jeans with authentic Levi\'s styling and comfort.',
                    'specifications' => '<ul><li>99% Cotton, 1% Elastane</li><li>Slim fit</li><li>Five-pocket styling</li><li>Button fly</li><li>Machine washable</li></ul>',
                    'details' => '<p>Iconic Levi\'s 511 slim fit jeans with classic styling and modern comfort. Perfect fit for everyday wear.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['30', '32', '34', '36', '38', '40']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-998197?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-835718?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-517342?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-869095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-203811?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-162683?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Campus Sutra Men\'s Solid Tailored Trousers',
                    'description' => 'Formal tailored trousers with slim fit and premium fabric.',
                    'specifications' => '<ul><li>Polyester blend</li><li>Tailored fit</li><li>Flat front</li><li>Belt loops</li><li>Dry clean recommended</li></ul>',
                    'details' => '<p>Professional tailored trousers perfect for office wear and formal occasions. Premium fabric with comfortable fit.</p>',
                    'price' => 39.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['30', '32', '34', '36', '38', '40']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-932220?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-624927?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-711208?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777343?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-090316?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-700208?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Lymio Jackets | Jacket for men',
                    'description' => 'Stylish casual jacket with modern design and comfortable fit.',
                    'specifications' => '<ul><li>Polyester outer shell</li><li>Zip closure</li><li>Side pockets</li><li>Regular fit</li><li>Water resistant</li></ul>',
                    'details' => '<p>Modern casual jacket perfect for layering. Water-resistant fabric with comfortable fit for everyday wear.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-815661?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-491411?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-585533?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-756068?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-328120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-499345?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Nobero Oversized Hoodie',
                    'description' => 'Comfortable oversized hoodie with soft fleece lining and modern style.',
                    'specifications' => '<ul><li>Cotton-polyester blend</li><li>Oversized fit</li><li>Fleece lining</li><li>Kangaroo pocket</li><li>Adjustable hood</li></ul>',
                    'details' => '<p>Trendy oversized hoodie with soft fleece lining for maximum comfort. Perfect for casual wear and streetwear style.</p>',
                    'price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-681903?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-206454?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-702983?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005492?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-148962?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462524?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cruiser Mens Casual Sneakers',
                    'description' => 'Comfortable casual sneakers with modern design and cushioned sole.',
                    'specifications' => '<ul><li>Synthetic upper</li><li>Cushioned sole</li><li>Lace-up closure</li><li>Breathable lining</li><li>Rubber outsole</li></ul>',
                    'details' => '<p>Stylish casual sneakers perfect for everyday wear. Comfortable cushioned sole with modern design and durable construction.</p>',
                    'price' => 34.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['7', '8', '9', '10', '11', '12']],
                        ['name' => 'Color', 'options' => ['Black', 'Green', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-605445?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-708855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-292696?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-051961?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-477625?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-881592?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fastrack-Tees Hype Adventure Quartz Analog Watch',
                    'description' => 'Sporty analog watch with adventure-inspired design and reliable quartz movement.',
                    'specifications' => '<ul><li>Quartz movement</li><li>Analog display</li><li>Water resistant</li><li>Durable strap</li><li>Adventure design</li></ul>',
                    'details' => '<p>Adventure-inspired analog watch with reliable quartz movement. Perfect for active lifestyle with sporty design and water resistance.</p>',
                    'price' => 49.99,
                    'sale_price' => 39.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Teal', 'Brown', 'Cream', 'White']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-360234?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-356399?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-873215?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-690933?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-429159?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-162255?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Women\'s Fashion' => [
                [
                    'name' => 'Pure Cotton Smocked Mexi Dress',
                    'description' => 'Comfortable pure cotton dress with smocked detailing and Mexican-inspired design.',
                    'specifications' => '<ul><li>100% Pure cotton</li><li>Smocked bodice</li><li>Mexican-inspired print</li><li>Midi length</li><li>Machine washable</li></ul>',
                    'details' => '<p>Beautiful pure cotton dress featuring traditional smocked detailing and vibrant Mexican-inspired patterns. Perfect for casual and semi-formal occasions.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-275144?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-918818?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-577440?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-591925?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-264563?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-643146?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Stretchable Panelled Peplum Top',
                    'description' => 'Stylish peplum top with panelled design and stretchable fabric for comfort.',
                    'specifications' => '<ul><li>Stretchable fabric blend</li><li>Panelled design</li><li>Peplum silhouette</li><li>Round neck</li><li>Machine washable</li></ul>',
                    'details' => '<p>Trendy peplum top with flattering panelled design and comfortable stretchable fabric. Perfect for office wear and casual outings.</p>',
                    'price' => 34.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['XS', 'S', 'M', 'L', 'XL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-911325?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-619150?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-529704?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-398662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-125508?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-020740?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Floral Print Straight Kurtis',
                    'description' => 'Elegant straight kurti with beautiful floral print and comfortable fit.',
                    'specifications' => '<ul><li>Cotton blend fabric</li><li>Floral print design</li><li>Straight cut</li><li>Three-quarter sleeves</li><li>Machine washable</li></ul>',
                    'details' => '<p>Beautiful straight kurti featuring elegant floral prints. Perfect for ethnic wear and casual occasions with comfortable cotton blend fabric.</p>',
                    'price' => 29.99,
                    'sale_price' => 24.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['XS', 'S', 'M', 'L', 'XL', 'XXL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-968381?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-730786?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-649153?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-060604?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-372958?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-501360?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Light Washed Straight Fit Jeans',
                    'description' => 'Classic straight fit jeans in light wash with comfortable stretch.',
                    'specifications' => '<ul><li>98% Cotton, 2% Elastane</li><li>Light wash finish</li><li>Straight fit</li><li>Five-pocket styling</li><li>Machine washable</li></ul>',
                    'details' => '<p>Classic straight fit jeans in trendy light wash. Comfortable stretch fabric with timeless styling perfect for everyday wear.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['24', '26', '28', '30', '32', '34']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-196364?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-313328?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-484762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-086383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-221554?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Pure Cotton Box Pleated Midi Skirt',
                    'description' => 'Elegant midi skirt with box pleats made from pure cotton fabric.',
                    'specifications' => '<ul><li>100% Pure cotton</li><li>Box pleated design</li><li>Midi length</li><li>Side zip closure</li><li>Machine washable</li></ul>',
                    'details' => '<p>Sophisticated midi skirt featuring classic box pleats in pure cotton. Perfect for office wear and formal occasions with timeless elegance.</p>',
                    'price' => 44.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['XS', 'S', 'M', 'L', 'XL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-415854?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-676491?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-200169?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-906652?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-534782?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-952346?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Clarice Pleated Shoulder Bag',
                    'description' => 'Stylish shoulder bag with pleated design and premium quality materials.',
                    'specifications' => '<ul><li>Premium synthetic leather</li><li>Pleated design</li><li>Adjustable shoulder strap</li><li>Multiple compartments</li><li>Magnetic closure</li></ul>',
                    'details' => '<p>Elegant shoulder bag featuring sophisticated pleated design. Multiple compartments and adjustable strap make it perfect for daily use.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-436231?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-250524?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-291600?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-833493?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404808?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-052606?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Ankle Loop Wedges Heels',
                    'description' => 'Comfortable wedge heels with ankle loop design for secure fit.',
                    'specifications' => '<ul><li>Wedge heel design</li><li>Ankle loop closure</li><li>Cushioned footbed</li><li>Non-slip sole</li><li>3-inch heel height</li></ul>',
                    'details' => '<p>Stylish wedge heels with secure ankle loop design. Cushioned footbed and non-slip sole provide comfort and stability for all-day wear.</p>',
                    'price' => 54.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']],
                        ['name' => 'Color', 'options' => ['Green', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-069737?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-369331?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303376?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-823641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-270283?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-568579?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Elowen Vine Lab-Grown Diamond Pendant',
                    'description' => 'Elegant pendant featuring lab-grown diamonds in vine-inspired design.',
                    'specifications' => '<ul><li>Lab-grown diamonds</li><li>Sterling silver chain</li><li>Vine-inspired design</li><li>Hypoallergenic</li><li>Gift box included</li></ul>',
                    'details' => '<p>Exquisite pendant featuring ethically sourced lab-grown diamonds in a beautiful vine-inspired design. Perfect for special occasions and everyday elegance.</p>',
                    'price' => 199.99,
                    'sale_price' => 179.99,
                    'cover_image' => 'https://images.unsplash.com/photo-364777?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-463464?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-798356?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-833284?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249408?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-939352?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Kid\'s Fashion' => [
                [
                    'name' => 'Boy\'s Cotton Regular Fit T-Shirt',
                    'description' => 'Comfortable cotton t-shirt with regular fit, perfect for everyday wear.',
                    'specifications' => '<ul><li>100% Cotton fabric</li><li>Regular fit design</li><li>Crew neck style</li><li>Machine washable</li><li>Soft and breathable</li></ul>',
                    'details' => '<p>Classic cotton t-shirt designed for boys with regular fit for comfort and style. Made from soft, breathable cotton that\'s perfect for active kids.</p>',
                    'price' => 12.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['3-6M']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-188251?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-589925?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-310457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-410968?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-323706?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-413447?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Girls Cotton Casual Dress',
                    'description' => 'Adorable cotton dress for girls with comfortable fit and playful design.',
                    'specifications' => '<ul><li>100% Cotton material</li><li>Casual style design</li><li>Comfortable fit</li><li>Easy care fabric</li><li>Colorful patterns</li></ul>',
                    'details' => '<p>Beautiful cotton dress perfect for casual occasions. Features comfortable fit and playful designs that girls love, made from soft cotton for all-day comfort.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['3-6M']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-379601?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-537623?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-003962?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-509073?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-427162?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-231764?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Kid\'s Running Shorts',
                    'description' => 'Lightweight running shorts designed for active kids with moisture-wicking fabric.',
                    'specifications' => '<ul><li>Moisture-wicking fabric</li><li>Lightweight design</li><li>Elastic waistband</li><li>Side pockets</li><li>Quick-dry material</li></ul>',
                    'details' => '<p>Perfect running shorts for active kids featuring moisture-wicking fabric and lightweight design. Elastic waistband and side pockets provide comfort and functionality.</p>',
                    'price' => 16.99,
                    'cover_image' => 'https://images.unsplash.com/photo-888542?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-110975?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-549864?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-893722?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-132236?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-486588?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Sports Walking Shoes for Kids',
                    'description' => 'Comfortable sports shoes designed for walking and everyday activities.',
                    'specifications' => '<ul><li>Cushioned sole</li><li>Breathable mesh upper</li><li>Non-slip outsole</li><li>Velcro closure</li><li>Lightweight construction</li></ul>',
                    'details' => '<p>Comfortable sports walking shoes perfect for active kids. Features cushioned sole, breathable mesh upper, and easy velcro closure for convenience.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['4-4.5 Years']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-938206?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-734465?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-988532?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-883127?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-961271?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-235478?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Kid\'s Official Characters Sweatshirt',
                    'description' => 'Cozy sweatshirt featuring popular cartoon characters, perfect for casual wear.',
                    'specifications' => '<ul><li>Cotton blend fabric</li><li>Official character designs</li><li>Pullover style</li><li>Ribbed cuffs and hem</li><li>Machine washable</li></ul>',
                    'details' => '<p>Fun and cozy sweatshirt featuring official cartoon characters that kids love. Made from soft cotton blend with ribbed cuffs for comfort and durability.</p>',
                    'price' => 28.99,
                    'cover_image' => 'https://images.unsplash.com/photo-110342?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-013304?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-522853?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-515625?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-760068?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-796778?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Toddler/Preschoolers Backpack for Kids',
                    'description' => 'Colorful and functional backpack designed specifically for toddlers and preschoolers.',
                    'specifications' => '<ul><li>Toddler-friendly size</li><li>Padded shoulder straps</li><li>Multiple compartments</li><li>Water-resistant material</li><li>Fun cartoon designs</li></ul>',
                    'details' => '<p>Perfect backpack for toddlers and preschoolers with age-appropriate size and fun designs. Features padded straps and multiple compartments for organization.</p>',
                    'price' => 22.99,
                    'cover_image' => 'https://images.unsplash.com/photo-105206?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-787422?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-323717?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-485206?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-907644?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-087648?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Classic Little Sports Cap for Active Kids',
                    'description' => 'Classic sports cap designed for active kids with adjustable fit and sun protection.',
                    'specifications' => '<ul><li>Adjustable strap</li><li>UV protection</li><li>Breathable fabric</li><li>Classic sports design</li><li>One size fits most</li></ul>',
                    'details' => '<p>Classic sports cap perfect for active kids featuring adjustable fit and UV protection. Breathable fabric keeps kids comfortable during outdoor activities.</p>',
                    'price' => 14.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Yellow', 'Pink', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-044689?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-111629?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-952748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-863191?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249869?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-076092?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Pure Cotton Full Sleeve Night Suit for Kids',
                    'description' => 'Comfortable pure cotton night suit with full sleeves for cozy sleep.',
                    'specifications' => '<ul><li>100% Pure cotton</li><li>Full sleeve design</li><li>Comfortable fit</li><li>Soft and breathable</li><li>Easy care fabric</li></ul>',
                    'details' => '<p>Cozy night suit made from pure cotton for comfortable sleep. Features full sleeves and soft fabric that\'s gentle on kids\' sensitive skin.</p>',
                    'price' => 26.99,
                    'sale_price' => 22.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['3-6M']],
                        ['name' => 'Color', 'options' => ['Blue', 'Gray', 'Pink']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-844771?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-941559?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-384425?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143701?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-445494?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-577024?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Footwear' => [
                [
                    'name' => 'Nike Men\'s Court Vision Low Next Nature Sneakers',
                    'description' => 'Classic Nike sneakers with sustainable materials and timeless basketball-inspired design.',
                    'specifications' => '<ul><li>Sustainable materials</li><li>Basketball-inspired design</li><li>Rubber outsole</li><li>Padded collar</li><li>Lace-up closure</li></ul>',
                    'details' => '<p>Nike Court Vision Low Next Nature sneakers combine classic basketball style with sustainable materials. Perfect for everyday wear with comfort and iconic Nike design.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-359926?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-714945?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-466207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-614160?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-888564?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709404?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ANNIE Grey Women\'s Walking Shoes',
                    'description' => 'Comfortable grey walking shoes designed for all-day comfort and support.',
                    'specifications' => '<ul><li>Cushioned insole</li><li>Breathable mesh upper</li><li>Lightweight design</li><li>Non-slip outsole</li><li>Arch support</li></ul>',
                    'details' => '<p>ANNIE Grey walking shoes provide exceptional comfort for daily walks and activities. Features cushioned insole and breathable design for all-day wear.</p>',
                    'price' => 64.99,
                    'sale_price' => 54.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-500027?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-932959?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-514017?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-100358?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-797953?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-547410?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Men\'s Loafer Formal Shoes',
                    'description' => 'Classic formal loafers perfect for business and formal occasions.',
                    'specifications' => '<ul><li>Genuine leather upper</li><li>Slip-on design</li><li>Cushioned footbed</li><li>Formal styling</li><li>Durable construction</li></ul>',
                    'details' => '<p>Elegant formal loafers crafted from genuine leather with classic styling. Perfect for business meetings, formal events, and professional settings.</p>',
                    'price' => 119.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-990733?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-654551?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-700208?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-198145?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-500126?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-866045?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Beige Casual Women Sandals',
                    'description' => 'Stylish beige sandals perfect for casual summer wear and everyday comfort.',
                    'specifications' => '<ul><li>Beige color design</li><li>Adjustable straps</li><li>Cushioned sole</li><li>Casual style</li><li>Comfortable fit</li></ul>',
                    'details' => '<p>Comfortable beige sandals designed for casual wear. Features adjustable straps and cushioned sole for all-day comfort during summer activities.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-860948?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-482518?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-080706?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315981?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-075682?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-058993?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Women\'s Pastel Blue Strappy Block Heels',
                    'description' => 'Elegant pastel blue block heels with strappy design for special occasions.',
                    'specifications' => '<ul><li>Pastel blue color</li><li>Strappy design</li><li>Block heel style</li><li>Ankle strap closure</li><li>3-inch heel height</li></ul>',
                    'details' => '<p>Beautiful pastel blue block heels featuring elegant strappy design. Perfect for parties, dates, and special occasions with comfortable block heel construction.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-368843?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-391104?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-218580?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462637?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-412805?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-025133?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Men Solid Open Toe Synthetic Leather Flats',
                    'description' => 'Comfortable open toe flats made from synthetic leather for casual wear.',
                    'specifications' => '<ul><li>Synthetic leather material</li><li>Open toe design</li><li>Flat sole construction</li><li>Slip-on style</li><li>Casual comfort</li></ul>',
                    'details' => '<p>Comfortable men\'s open toe flats crafted from synthetic leather. Perfect for casual summer wear with easy slip-on design and breathable open toe construction.</p>',
                    'price' => 49.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-618065?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-003888?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-674442?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-345644?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-488447?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-998922?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Genuine Leather Women Chelsea Boots',
                    'description' => 'Classic Chelsea boots made from genuine leather with elastic side panels.',
                    'specifications' => '<ul><li>Genuine leather construction</li><li>Elastic side panels</li><li>Pull-on design</li><li>Low heel</li><li>Ankle height</li></ul>',
                    'details' => '<p>Timeless Chelsea boots crafted from genuine leather with classic elastic side panels. Perfect for both casual and semi-formal occasions with versatile styling.</p>',
                    'price' => 149.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']],
                        ['name' => 'Color', 'options' => ['Black', 'Brown']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-184672?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-725951?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-096420?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-951041?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-664690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-740118?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Women Thong Strap Flip Flops',
                    'description' => 'Comfortable flip flops with thong strap design perfect for beach and casual wear.',
                    'specifications' => '<ul><li>Thong strap design</li><li>Cushioned footbed</li><li>Non-slip sole</li><li>Lightweight construction</li><li>Beach-ready style</li></ul>',
                    'details' => '<p>Comfortable flip flops featuring classic thong strap design with cushioned footbed. Perfect for beach days, pool parties, and casual summer activities.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['6', '6.5', '7', '7.5', '8', '8.5', '9', '9.5', '10']],
                        ['name' => 'Color', 'options' => ['Yellow', 'White', 'Pink']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-174353?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-578220?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-719772?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-329119?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-768105?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-521006?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Accessories' => [
                [
                    'name' => 'Tissot PRX Men Watch',
                    'description' => 'Premium Swiss-made Tissot PRX watch with stainless steel construction and precision movement.',
                    'specifications' => '<ul><li>Swiss quartz movement</li><li>Stainless steel case</li><li>Sapphire crystal glass</li><li>Water resistant 100m</li><li>Integrated bracelet</li></ul>',
                    'details' => '<p>The iconic Tissot PRX combines retro aesthetics with modern Swiss precision. Features integrated bracelet design and premium materials for sophisticated timekeeping.</p>',
                    'price' => 349.99,
                    'cover_image' => 'https://images.unsplash.com/photo-690326?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-502224?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-789997?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-326161?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461537?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-934467?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'IFLASH Octagonal Polarized Sunglasses',
                    'description' => 'Stylish octagonal sunglasses with polarized lenses and UV protection.',
                    'specifications' => '<ul><li>Polarized lenses</li><li>UV400 protection</li><li>Octagonal frame design</li><li>Lightweight construction</li><li>Anti-glare coating</li></ul>',
                    'details' => '<p>IFLASH octagonal sunglasses offer unique geometric styling with superior polarized lenses for optimal eye protection and visual clarity.</p>',
                    'price' => 79.99,
                    'sale_price' => 64.99,
                    'cover_image' => 'https://images.unsplash.com/photo-317280?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-702470?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-487171?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-207121?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-914256?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-160416?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Men Casual Evening Black Nylon Fabric Belt',
                    'description' => 'Versatile black nylon fabric belt perfect for casual and evening wear.',
                    'specifications' => '<ul><li>Durable nylon fabric</li><li>Metal buckle</li><li>Adjustable length</li><li>Casual to evening wear</li><li>Easy care material</li></ul>',
                    'details' => '<p>Stylish black nylon fabric belt that transitions seamlessly from casual day wear to evening occasions. Durable construction with comfortable fit.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['32', '34', '36', '38', '40', '42', '44']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-090967?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-192999?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-626859?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-405336?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-494856?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-965662?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Storite Compact Leather Wallet',
                    'description' => 'Compact genuine leather wallet with multiple card slots and bill compartment.',
                    'specifications' => '<ul><li>Genuine leather construction</li><li>Multiple card slots</li><li>Bill compartment</li><li>Compact design</li><li>RFID blocking technology</li></ul>',
                    'details' => '<p>Storite compact leather wallet combines functionality with style. Features RFID blocking technology and organized compartments in a sleek, compact design.</p>',
                    'price' => 49.99,
                    'sale_price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-453359?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-643645?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-351030?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-446171?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-021657?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-317145?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Casual Cap for Women',
                    'description' => 'Stylish casual cap designed for women with adjustable fit and comfortable wear.',
                    'specifications' => '<ul><li>Cotton blend fabric</li><li>Adjustable back strap</li><li>Curved brim design</li><li>Breathable material</li><li>One size fits most</li></ul>',
                    'details' => '<p>Fashionable casual cap perfect for everyday wear. Features comfortable cotton blend fabric and adjustable fit for all-day comfort and style.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-239052?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-384922?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-020852?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-790979?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-532667?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-284595?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cotton Scarf for Women',
                    'description' => 'Soft cotton scarf with elegant patterns, perfect for all seasons.',
                    'specifications' => '<ul><li>100% Cotton material</li><li>Lightweight design</li><li>Elegant patterns</li><li>Versatile styling</li><li>Machine washable</li></ul>',
                    'details' => '<p>Beautiful cotton scarf featuring elegant patterns and soft texture. Perfect for adding style to any outfit while providing comfort in all seasons.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-535271?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-061055?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-040547?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-100939?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-842094?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548718?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fancy Teardrop Motif Pendant',
                    'description' => 'Elegant teardrop-shaped pendant with intricate motif design and chain.',
                    'specifications' => '<ul><li>Teardrop motif design</li><li>Sterling silver plated</li><li>Intricate detailing</li><li>Adjustable chain</li><li>Gift box included</li></ul>',
                    'details' => '<p>Exquisite teardrop motif pendant featuring intricate design work and sterling silver plating. Perfect for special occasions and everyday elegance.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'Chain Length', 'options' => ['16 inch', '18 inch', '20 inch']],
                        ['name' => 'Color', 'options' => ['Silver', 'Gold Plated', 'Rose Gold']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-929454?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-062391?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-787223?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665800?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-102743?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-530869?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Monogram Embossed Sling Bag',
                    'description' => 'Stylish sling bag with monogram embossed design and adjustable strap.',
                    'specifications' => '<ul><li>Monogram embossed design</li><li>Adjustable shoulder strap</li><li>Multiple compartments</li><li>Zip closure</li><li>Compact size</li></ul>',
                    'details' => '<p>Fashionable sling bag featuring elegant monogram embossed design. Perfect for daily use with organized compartments and comfortable adjustable strap.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Brown', 'Sky Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-643812?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-792078?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-109374?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-145384?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558906?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-628939?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Wall Decor' => [
                [
                    'name' => 'Astro Starry Night Wall Art',
                    'description' => 'Beautiful starry night themed wall art perfect for modern home decor.',
                    'specifications' => '<ul><li>Premium canvas print</li><li>Fade-resistant inks</li><li>Ready to hang</li><li>Modern design</li><li>High-quality frame</li></ul>',
                    'details' => '<p>Transform your space with this stunning Astro Starry Night wall art featuring celestial themes and modern artistic design.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['12x16 inch', '16x20 inch', '20x24 inch']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-481055?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-698814?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-496797?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-898289?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-776178?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-119800?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Divine Krishna Canvas Painting',
                    'description' => 'Spiritual Krishna canvas painting with vibrant colors and divine imagery.',
                    'specifications' => '<ul><li>Canvas material</li><li>Vibrant colors</li><li>Spiritual artwork</li><li>Wooden frame</li><li>UV protected</li></ul>',
                    'details' => '<p>Beautiful Divine Krishna canvas painting featuring traditional spiritual art with vibrant colors and premium quality materials.</p>',
                    'price' => 129.99,
                    'sale_price' => 109.99,
                    'cover_image' => 'https://images.unsplash.com/photo-356324?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-459234?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-877515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-920296?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-551760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-861144?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'FNP Playful Anime Hanging Photo Frame',
                    'description' => 'Cute anime-themed hanging photo frame perfect for displaying memories.',
                    'specifications' => '<ul><li>Anime design</li><li>Hanging style</li><li>Multiple photo slots</li><li>Durable material</li><li>Easy to hang</li></ul>',
                    'details' => '<p>Adorable FNP Playful Anime hanging photo frame with cute designs perfect for displaying your favorite memories in style.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-194702?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-202261?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-203095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-403892?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871605?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-690188?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Nautica Modern Wall Clock',
                    'description' => 'Sleek modern wall clock with nautical design elements.',
                    'specifications' => '<ul><li>Modern design</li><li>Nautical theme</li><li>Silent movement</li><li>Easy to read</li><li>Battery operated</li></ul>',
                    'details' => '<p>Stylish Nautica Modern wall clock combining contemporary design with nautical elements for a sophisticated look.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-438988?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-519309?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-545700?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-138674?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-829984?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-622570?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Plantex Frameless Mirror',
                    'description' => 'Contemporary frameless mirror perfect for modern interiors.',
                    'specifications' => '<ul><li>Frameless design</li><li>High-quality glass</li><li>Easy installation</li><li>Modern style</li><li>Beveled edges</li></ul>',
                    'details' => '<p>Elegant Plantex frameless mirror with beveled edges and high-quality glass, perfect for creating a modern and spacious feel.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-548029?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-060154?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777932?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-777567?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-686918?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-523032?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Sheesham Solid Wood Floating Shelf',
                    'description' => 'Premium sheesham wood floating shelf for stylish storage and display.',
                    'specifications' => '<ul><li>Solid sheesham wood</li><li>Floating design</li><li>Hidden brackets</li><li>Natural finish</li><li>Easy installation</li></ul>',
                    'details' => '<p>Beautiful Sheesham solid wood floating shelf with natural finish and hidden brackets for a clean, modern look.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-099391?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-659515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-399102?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-405584?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-167555?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-596637?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Metal Organizer with Hooks for Entryway',
                    'description' => 'Functional metal organizer with multiple hooks designed for entryway organization.',
                    'specifications' => '<ul><li>Metal construction</li><li>Multiple hooks</li><li>Entryway design</li><li>Wall-mounted</li><li>Easy installation</li></ul>',
                    'details' => '<p>Practical metal organizer with hooks perfect for entryway organization, providing convenient storage for coats, bags, keys, and accessories.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Bronze', 'Silver', 'Gold']],
                        ['name' => 'Hooks', 'options' => ['4 Hooks', '6 Hooks', '8 Hooks']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-515581?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-032638?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-706457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-771811?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-221665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-583897?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Merlion Singapore Metal Statue',
                    'description' => 'Decorative Merlion Singapore metal statue for unique home decor.',
                    'specifications' => '<ul><li>Metal construction</li><li>Singapore Merlion design</li><li>Decorative piece</li><li>Antique finish</li><li>Collectible item</li></ul>',
                    'details' => '<p>Unique Merlion Singapore metal statue featuring detailed craftsmanship and antique finish, perfect for collectors and Singapore enthusiasts.</p>',
                    'price' => 199.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black', 'Gold']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-263517?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-257315?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-913184?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-200662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-789817?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-091745?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Lighting & Lamps' => [
                [
                    'name' => 'Cumberland Beige Shade Table Lamp',
                    'description' => 'Elegant table lamp with beige fabric shade and classic design.',
                    'specifications' => '<ul><li>Beige fabric shade</li><li>Classic design</li><li>Metal base</li><li>E27 bulb socket</li><li>Easy assembly</li></ul>',
                    'details' => '<p>Beautiful Cumberland table lamp with beige shade that provides warm, ambient lighting perfect for reading and relaxation.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-070207?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-778206?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-785881?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-268861?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548016?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-146847?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Tripod Floor Lamp With Metal Base',
                    'description' => 'Modern tripod floor lamp with adjustable metal base and stylish design.',
                    'specifications' => '<ul><li>Tripod metal base</li><li>Adjustable height</li><li>Modern design</li><li>Fabric shade</li><li>Stable construction</li></ul>',
                    'details' => '<p>Contemporary tripod floor lamp with metal base offering adjustable height and modern styling for any living space.</p>',
                    'price' => 149.99,
                    'sale_price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-451523?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-814398?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-920440?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-217758?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-117202?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-138396?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Bedside Golden Wall Light Lamp with Glass Shade',
                    'description' => 'Elegant bedside wall light with golden finish and glass shade.',
                    'specifications' => '<ul><li>Golden finish</li><li>Glass shade</li><li>Wall mounted</li><li>Bedside design</li><li>Easy installation</li></ul>',
                    'details' => '<p>Sophisticated bedside wall light with golden finish and glass shade, perfect for creating ambient lighting in bedrooms.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-210243?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-363100?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-725457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-544661?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-953243?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-332966?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Lights Cluster Chandelier Pendant Light',
                    'description' => 'Modern cluster chandelier with multiple pendant lights for dramatic effect.',
                    'specifications' => '<ul><li>Cluster design</li><li>Multiple pendants</li><li>Modern style</li><li>Adjustable height</li><li>Statement piece</li></ul>',
                    'details' => '<p>Stunning cluster chandelier featuring multiple pendant lights that create a dramatic focal point for dining rooms and living spaces.</p>',
                    'price' => 299.99,
                    'sale_price' => 259.99,
                    'cover_image' => 'https://images.unsplash.com/photo-876940?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-935588?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-107593?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-012083?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-947246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-194768?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'White Glass Ceiling Flush Mount',
                    'description' => 'Clean white glass ceiling flush mount light for modern interiors.',
                    'specifications' => '<ul><li>White glass shade</li><li>Flush mount design</li><li>Modern style</li><li>Easy installation</li><li>Energy efficient</li></ul>',
                    'details' => '<p>Sleek white glass ceiling flush mount providing clean, even lighting perfect for modern homes and low ceiling spaces.</p>',
                    'price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-878487?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-204207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-621221?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-015313?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-758432?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-370516?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => '4 Watts E27 Holder LED Bulb',
                    'description' => 'Energy-efficient 4W LED bulb with E27 base for standard fixtures.',
                    'specifications' => '<ul><li>4 watts power</li><li>E27 base</li><li>LED technology</li><li>Energy efficient</li><li>Long lifespan</li></ul>',
                    'details' => '<p>High-quality 4W LED bulb with E27 base offering energy efficiency and long lifespan for all your lighting needs.</p>',
                    'price' => 12.99,
                    'sale_price' => 9.99,
                    'cover_image' => 'https://images.unsplash.com/photo-691623?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-315800?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-739929?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-061101?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-679867?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-526412?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Love Reaction Double, Gold, Decorative lights',
                    'description' => 'Romantic gold decorative lights with love-themed design for special occasions.',
                    'specifications' => '<ul><li>Gold finish</li><li>Love theme design</li><li>Decorative lighting</li><li>Double feature</li><li>Special occasions</li></ul>',
                    'details' => '<p>Beautiful Love Reaction decorative lights in gold finish, perfect for romantic settings and special celebrations.</p>',
                    'price' => 45.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Gold', 'Black', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-912422?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-290431?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-465620?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-358107?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-727205?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-177863?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Venice Shade Night Lamp',
                    'description' => 'Elegant Venice-style night lamp with decorative shade for bedside use.',
                    'specifications' => '<ul><li>Venice style design</li><li>Decorative shade</li><li>Night lamp function</li><li>Soft lighting</li><li>Bedside suitable</li></ul>',
                    'details' => '<p>Charming Venice shade night lamp providing soft, gentle lighting perfect for bedrooms and creating a cozy atmosphere.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Green', 'Blue', 'Beige']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-773477?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-053400?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-371351?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-291748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-607314?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-242861?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Home Furnishings' => [
                [
                    'name' => 'Microfiber Soft Cushion',
                    'description' => 'Ultra-soft microfiber cushion with premium filling for maximum comfort.',
                    'specifications' => '<ul><li>Microfiber fabric</li><li>Premium filling</li><li>Ultra-soft texture</li><li>Machine washable</li><li>Hypoallergenic</li></ul>',
                    'details' => '<p>Luxurious microfiber soft cushion designed for ultimate comfort with premium filling and hypoallergenic properties.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-968318?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-708365?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-527236?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-882117?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-574795?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-165007?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cotton Throw Bedcover Super Soft & Breathable',
                    'description' => 'Premium cotton throw bedcover that is super soft and breathable for year-round comfort.',
                    'specifications' => '<ul><li>100% cotton material</li><li>Super soft texture</li><li>Breathable fabric</li><li>Machine washable</li><li>Lightweight design</li></ul>',
                    'details' => '<p>Beautiful cotton throw bedcover offering superior softness and breathability, perfect for layering and comfort in any season.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-624652?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-995022?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-930985?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333413?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-450635?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-523359?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Elegant Solid Semi-Sheer Curtains for Window',
                    'description' => 'Elegant solid color semi-sheer curtains that provide privacy while allowing natural light.',
                    'specifications' => '<ul><li>Semi-sheer fabric</li><li>Solid color design</li><li>Light filtering</li><li>Rod pocket style</li><li>Machine washable</li></ul>',
                    'details' => '<p>Sophisticated semi-sheer curtains in solid colors that beautifully filter light while maintaining privacy and elegance.</p>',
                    'price' => 49.99,
                    'variants' => [
                        ['name' => 'Length', 'options' => ['84 inch', '96 inch', '108 inch']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-280890?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-251040?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-764059?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-837468?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-568285?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-736390?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'home Premium Modern Runner Rug',
                    'description' => 'Premium modern runner rug with contemporary design for hallways and entryways.',
                    'specifications' => '<ul><li>Modern design</li><li>Premium quality</li><li>Non-slip backing</li><li>Easy to clean</li><li>Durable construction</li></ul>',
                    'details' => '<p>Stylish premium modern runner rug featuring contemporary patterns, perfect for adding elegance to hallways and high-traffic areas.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-778424?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-166947?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593937?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-821149?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646530?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-084161?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => '100% Cotton Solid King Size Quilted Bed Cover',
                    'description' => 'Premium 100% cotton quilted bed cover in king size with solid color design.',
                    'specifications' => '<ul><li>100% cotton fabric</li><li>King size</li><li>Quilted design</li><li>Solid color</li><li>Machine washable</li></ul>',
                    'details' => '<p>Luxurious 100% cotton quilted bed cover in king size featuring solid colors and premium quilting for comfort and style.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-709629?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-720341?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-611606?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-838431?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-927641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-060121?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Super Soft Anti-Skid Super Absorbent Mats',
                    'description' => 'Ultra-soft anti-skid mats with superior absorbent properties for bathroom and kitchen use.',
                    'specifications' => '<ul><li>Super soft texture</li><li>Anti-skid backing</li><li>Super absorbent</li><li>Quick dry</li><li>Machine washable</li></ul>',
                    'details' => '<p>Premium super soft mats with anti-skid backing and superior absorbent properties, perfect for bathrooms and kitchen areas.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-449915?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-826368?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-115017?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-970999?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-127621?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-901735?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Rose Printed Center Table Cover',
                    'description' => 'Beautiful rose printed center table cover for elegant dining and living room decor.',
                    'specifications' => '<ul><li>Rose print design</li><li>Premium fabric</li><li>Center table size</li><li>Easy to clean</li><li>Decorative border</li></ul>',
                    'details' => '<p>Elegant rose printed center table cover featuring beautiful floral patterns and decorative borders for sophisticated table styling.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-417378?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-621771?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-787105?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-236265?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-407923?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-780186?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Corduroy Lace Sofa Cover',
                    'description' => 'Stylish corduroy sofa cover with lace detailing for furniture protection and decoration.',
                    'specifications' => '<ul><li>Corduroy fabric</li><li>Lace detailing</li><li>Furniture protection</li><li>Easy installation</li><li>Machine washable</li></ul>',
                    'details' => '<p>Premium corduroy sofa cover with elegant lace detailing that protects furniture while adding sophisticated style to your living space.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Blue', 'Green', 'Pink']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-109788?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-639805?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-311309?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-736905?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-091443?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-393295?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Decorative Accents' => [
                [
                    'name' => 'Skyblue Hand-Glazed Ceramic Vase',
                    'description' => 'Beautiful sky blue hand-glazed ceramic vase with artistic finish and elegant design.',
                    'specifications' => '<ul><li>Hand-glazed ceramic</li><li>Sky blue color</li><li>Artistic finish</li><li>Elegant design</li><li>Waterproof interior</li></ul>',
                    'details' => '<p>Stunning sky blue hand-glazed ceramic vase featuring artistic craftsmanship and elegant design, perfect for fresh or dried flowers.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-010478?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-284100?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-673251?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-172306?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-089143?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404385?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Decorative Ceramic Showpiece',
                    'description' => 'Elegant decorative ceramic showpiece with intricate details for home decoration.',
                    'specifications' => '<ul><li>Premium ceramic</li><li>Intricate details</li><li>Decorative design</li><li>Handcrafted quality</li><li>Durable finish</li></ul>',
                    'details' => '<p>Beautiful decorative ceramic showpiece featuring intricate craftsmanship and elegant design, perfect for enhancing any living space.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-997730?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-812207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-848935?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-734588?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-300683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-415749?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Elegant Resin Girl Figurine with Apple',
                    'description' => 'Charming resin figurine of a girl with apple, perfect for home decoration and gifting.',
                    'specifications' => '<ul><li>High-quality resin</li><li>Girl with apple design</li><li>Elegant finish</li><li>Detailed craftsmanship</li><li>Perfect gift item</li></ul>',
                    'details' => '<p>Charming elegant resin figurine featuring a girl with apple, showcasing detailed craftsmanship and perfect for home decor or as a thoughtful gift.</p>',
                    'price' => 45.99,
                    'cover_image' => 'https://images.unsplash.com/photo-595089?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-893765?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-235973?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-800350?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-530092?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-616354?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Home Centre Claire Unscented Pillar Candle',
                    'description' => 'Premium unscented pillar candle from Home Centre Claire collection for elegant ambiance.',
                    'specifications' => '<ul><li>Unscented formula</li><li>Pillar design</li><li>Long burning time</li><li>Premium wax</li><li>Elegant appearance</li></ul>',
                    'details' => '<p>Premium Home Centre Claire unscented pillar candle offering long burning time and elegant ambiance without overpowering fragrances.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-054969?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-469396?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-051731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-435735?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303352?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-938503?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Decorative Fancy Candle Holder',
                    'description' => 'Ornate decorative candle holder with fancy design for elegant candle display.',
                    'specifications' => '<ul><li>Fancy decorative design</li><li>Premium materials</li><li>Stable base</li><li>Elegant finish</li><li>Universal candle fit</li></ul>',
                    'details' => '<p>Beautiful decorative fancy candle holder featuring ornate design and premium materials, perfect for creating elegant candle displays.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-652064?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-859680?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-652918?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-832801?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-912903?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129466?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Wooden Square Tray with Inlay Work',
                    'description' => 'Handcrafted wooden square tray featuring beautiful inlay work and traditional craftsmanship.',
                    'specifications' => '<ul><li>Solid wood construction</li><li>Inlay work design</li><li>Square shape</li><li>Handcrafted quality</li><li>Smooth finish</li></ul>',
                    'details' => '<p>Exquisite handcrafted wooden square tray with beautiful inlay work, showcasing traditional craftsmanship and perfect for serving or decoration.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => 'https://images.unsplash.com/photo-529575?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-646477?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-048234?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-536378?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-181322?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-065194?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Royal Gold Ceramic Decorative Bowl',
                    'description' => 'Luxurious royal gold ceramic decorative bowl with elegant design and premium finish.',
                    'specifications' => '<ul><li>Premium ceramic</li><li>Royal gold finish</li><li>Decorative design</li><li>Elegant appearance</li><li>Handcrafted quality</li></ul>',
                    'details' => '<p>Luxurious royal gold ceramic decorative bowl featuring premium finish and elegant design, perfect for sophisticated home decoration.</p>',
                    'price' => 129.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Gold', 'Pink']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-111826?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-920049?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-847120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-286868?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-197372?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-089903?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Garden Decor Modern Sculptures',
                    'description' => 'Contemporary modern sculptures designed for garden and outdoor decoration.',
                    'specifications' => '<ul><li>Modern design</li><li>Weather resistant</li><li>Garden suitable</li><li>Contemporary style</li><li>Durable materials</li></ul>',
                    'details' => '<p>Striking modern sculptures perfect for garden and outdoor spaces, featuring contemporary design and weather-resistant materials for lasting beauty.</p>',
                    'price' => 199.99,
                    'sale_price' => 179.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Black', 'Gold', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-082351?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-217688?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-797270?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-155561?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665409?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-131637?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Storage & Organizers' => [
                [
                    'name' => 'Homestrap Storage Boxes',
                    'description' => 'Versatile storage boxes from Homestrap for organizing household items efficiently.',
                    'specifications' => '<ul><li>Durable construction</li><li>Stackable design</li><li>Easy access lid</li><li>Multiple sizes</li><li>Space-saving</li></ul>',
                    'details' => '<p>Practical Homestrap storage boxes designed for efficient organization with stackable design and durable construction for long-lasting use.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-760084?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-596324?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-724010?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-326681?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-366924?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-814243?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Storage Boxes and Drawers',
                    'description' => 'Complete storage solution with boxes and drawers for comprehensive organization.',
                    'specifications' => '<ul><li>Combined box and drawer system</li><li>Modular design</li><li>Easy assembly</li><li>Smooth sliding drawers</li><li>Versatile storage</li></ul>',
                    'details' => '<p>Comprehensive storage solution combining boxes and drawers in a modular system for maximum organization flexibility and space utilization.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-527158?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-735174?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-501837?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-061175?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-424109?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-717562?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Metal Storage Shelf',
                    'description' => 'Heavy-duty metal storage shelf with multiple tiers for industrial-strength organization.',
                    'specifications' => '<ul><li>Heavy-duty metal construction</li><li>Multiple tiers</li><li>Adjustable shelves</li><li>High weight capacity</li><li>Easy assembly</li></ul>',
                    'details' => '<p>Robust metal storage shelf featuring heavy-duty construction and adjustable shelves, perfect for garage, warehouse, or heavy-duty storage needs.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-051275?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-433792?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-267961?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-159510?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-245704?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220479?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Flyngo Foldable Drawer Organizer',
                    'description' => 'Innovative foldable drawer organizer from Flyngo for flexible storage solutions.',
                    'specifications' => '<ul><li>Foldable design</li><li>Drawer organization</li><li>Flexible compartments</li><li>Space-efficient</li><li>Easy storage when not in use</li></ul>',
                    'details' => '<p>Smart Flyngo foldable drawer organizer offering flexible compartments and space-efficient design that folds flat when not needed.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-863145?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-173113?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-550086?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-364657?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-034979?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-165916?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Heavy Duty Garage Storage Hooks for Wall',
                    'description' => 'Industrial-strength wall-mounted storage hooks designed for heavy-duty garage organization.',
                    'specifications' => '<ul><li>Heavy-duty construction</li><li>Wall-mounted design</li><li>High weight capacity</li><li>Garage suitable</li><li>Easy installation</li></ul>',
                    'details' => '<p>Professional heavy-duty garage storage hooks designed for wall mounting with high weight capacity for tools, equipment, and heavy items.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-145545?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-204098?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005188?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-744956?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-492066?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-104100?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => '4-Tier Multipurpose Storage Rack',
                    'description' => 'Versatile 4-tier storage rack suitable for multiple purposes and various room settings.',
                    'specifications' => '<ul><li>4-tier design</li><li>Multipurpose use</li><li>Sturdy construction</li><li>Easy assembly</li><li>Versatile placement</li></ul>',
                    'details' => '<p>Practical 4-tier multipurpose storage rack offering versatile storage solutions for kitchen, bathroom, office, or any room requiring organized storage.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-952485?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-357893?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-746971?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315112?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247628?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126010?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Durable 3 Tray Set',
                    'description' => 'Set of 3 durable trays for organizing and storing various items efficiently.',
                    'specifications' => '<ul><li>Set of 3 trays</li><li>Durable construction</li><li>Stackable design</li><li>Easy to clean</li><li>Versatile use</li></ul>',
                    'details' => '<p>Practical set of 3 durable trays with stackable design, perfect for organizing office supplies, craft materials, or household items.</p>',
                    'price' => 29.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Brown', 'White', 'Black']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-036040?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-162101?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-676153?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-005258?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-376873?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Evaro Cabinets In Wenge Brown Finish',
                    'description' => 'Premium Evaro storage cabinets with elegant wenge brown finish for sophisticated organization.',
                    'specifications' => '<ul><li>Wenge brown finish</li><li>Premium cabinet design</li><li>Multiple compartments</li><li>Elegant appearance</li><li>Durable construction</li></ul>',
                    'details' => '<p>Sophisticated Evaro cabinets featuring elegant wenge brown finish and premium construction, perfect for stylish storage in any modern home.</p>',
                    'price' => 299.99,
                    'sale_price' => 269.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['Brown', 'Green', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-031298?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-762907?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-328995?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-139739?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-801327?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-732281?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Cakes' => [
                [
                    'name' => 'Pastel Floral Birthday Cake',
                    'description' => 'Beautiful pastel-colored birthday cake decorated with delicate floral designs.',
                    'specifications' => '<ul><li>Pastel floral decoration</li><li>Vanilla sponge layers</li><li>Buttercream frosting</li><li>Fresh flower accents</li><li>Custom message available</li></ul>',
                    'details' => '<p>Elegant pastel floral birthday cake featuring soft colors and delicate flower decorations, perfect for celebrating special birthdays in style.</p>',
                    'price' => 49.99,
                    'variants' => [
                        ['name' => 'Weight', 'options' => ['1 Kg', '1.5 Kg', '2 Kg']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-729208?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-076197?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-889430?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-609135?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-280457?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-933736?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Strawberry Wedding Cake',
                    'description' => 'Elegant multi-tier wedding cake with fresh strawberries and cream.',
                    'specifications' => '<ul><li>Multi-tier design</li><li>Fresh strawberries</li><li>Whipped cream layers</li><li>Wedding decoration</li><li>Serves 50-60 people</li></ul>',
                    'details' => '<p>Stunning strawberry wedding cake with multiple tiers, fresh strawberries, and elegant decorations perfect for your special wedding day.</p>',
                    'price' => 299.99,
                    'sale_price' => 279.99,
                    'cover_image' => 'https://images.unsplash.com/photo-048810?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-724659?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026487?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-557951?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-054046?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-617896?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Yummy Premium Chocolate Cake',
                    'description' => 'Rich and decadent premium chocolate cake with multiple chocolate layers.',
                    'specifications' => '<ul><li>Premium chocolate</li><li>Multiple layers</li><li>Rich chocolate ganache</li><li>Moist sponge</li><li>Chocolate shavings</li></ul>',
                    'details' => '<p>Indulgent Yummy Premium chocolate cake featuring rich chocolate layers, smooth ganache, and premium cocoa for the ultimate chocolate experience.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-505017?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-201580?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-261119?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-769359?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-015520?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Just Bake Mixed Fruit Gateaux Half KG',
                    'description' => 'Delicious mixed fruit gateaux cake with seasonal fruits and cream layers.',
                    'specifications' => '<ul><li>Mixed seasonal fruits</li><li>Cream layers</li><li>Half KG size</li><li>Fresh fruit topping</li><li>Light sponge base</li></ul>',
                    'details' => '<p>Fresh and fruity Just Bake mixed fruit gateaux featuring seasonal fruits, light cream layers, and a soft sponge base in convenient half KG size.</p>',
                    'price' => 24.99,
                    'sale_price' => 21.99,
                    'cover_image' => 'https://images.unsplash.com/photo-731730?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-324894?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-358302?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593935?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-196744?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-846664?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Ivory Rose Elegance Cake',
                    'description' => 'Sophisticated ivory-colored cake decorated with elegant rose designs.',
                    'specifications' => '<ul><li>Ivory color theme</li><li>Rose decorations</li><li>Elegant design</li><li>Premium frosting</li><li>Special occasions</li></ul>',
                    'details' => '<p>Sophisticated Ivory Rose Elegance cake featuring beautiful ivory colors and delicate rose decorations, perfect for elegant celebrations and special occasions.</p>',
                    'price' => 69.99,
                    'variants' => [
                        ['name' => 'Weight', 'options' => ['1 Kg', '1.5 Kg', '2 Kg']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-068348?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-365291?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-737452?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-979020?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-723549?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-204620?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'FNP Designer Eggless Half KG',
                    'description' => 'Designer eggless cake from FNP with artistic decorations and premium ingredients.',
                    'specifications' => '<ul><li>Eggless recipe</li><li>Designer decorations</li><li>Half KG size</li><li>Premium ingredients</li><li>Artistic design</li></ul>',
                    'details' => '<p>Beautiful FNP Designer eggless cake featuring artistic decorations and premium eggless recipe, perfect for those preferring egg-free desserts.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-173859?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-216226?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-802545?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-943422?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-505268?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-714425?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => '6 Pcs Cupcake Folding Box',
                    'description' => 'Set of 6 assorted cupcakes presented in an elegant folding gift box.',
                    'specifications' => '<ul><li>6 assorted cupcakes</li><li>Folding gift box</li><li>Mixed flavors</li><li>Individual decoration</li><li>Perfect for gifting</li></ul>',
                    'details' => '<p>Delightful set of 6 cupcakes with assorted flavors and decorations, beautifully presented in an elegant folding box perfect for gifts and parties.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-895272?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-128461?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-586426?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559318?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-973075?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-039371?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Pearl & Rose Cake 7.0 Kg',
                    'description' => 'Grand pearl and rose themed cake weighing 7.0 kg, perfect for large celebrations.',
                    'specifications' => '<ul><li>7.0 Kg weight</li><li>Pearl decorations</li><li>Rose theme design</li><li>Large celebration size</li><li>Serves 70-80 people</li></ul>',
                    'details' => '<p>Magnificent Pearl & Rose cake weighing 7.0 kg, featuring elegant pearl decorations and rose themes, perfect for grand celebrations and large gatherings.</p>',
                    'price' => 399.99,
                    'sale_price' => 369.99,
                    'cover_image' => 'https://images.unsplash.com/photo-147693?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-448059?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-856724?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-747615?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-529637?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-116512?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Pastries' => [
                [
                    'name' => 'Rich Chocolate Pastries',
                    'description' => 'Decadent chocolate pastries with rich cocoa and smooth chocolate filling.',
                    'specifications' => '<ul><li>Rich cocoa base</li><li>Smooth chocolate filling</li><li>Premium chocolate</li><li>Moist texture</li><li>Individual portions</li></ul>',
                    'details' => '<p>Indulgent rich chocolate pastries made with premium cocoa and filled with smooth chocolate cream for the ultimate chocolate experience.</p>',
                    'price' => 18.99,
                    'variants' => [
                        ['name' => 'Quantity', 'options' => ['4 Pieces', '6 Pieces', '8 Pieces']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-188418?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-458759?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-506641?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-017966?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-618742?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129775?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Fruit Pastries Topped',
                    'description' => 'Light pastries topped with fresh seasonal fruits and cream.',
                    'specifications' => '<ul><li>Fresh seasonal fruits</li><li>Light pastry base</li><li>Cream topping</li><li>Colorful presentation</li><li>Natural flavors</li></ul>',
                    'details' => '<p>Beautiful fresh fruit pastries featuring seasonal fruits on light pastry base with cream topping for a refreshing and colorful treat.</p>',
                    'price' => 16.99,
                    'sale_price' => 14.99,
                    'cover_image' => 'https://images.unsplash.com/photo-586268?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-040996?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-380721?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-271184?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-350728?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-533662?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Classic Cream Pastries with Silky Whipped Cream',
                    'description' => 'Traditional cream pastries filled with silky smooth whipped cream.',
                    'specifications' => '<ul><li>Traditional pastry shells</li><li>Silky whipped cream</li><li>Classic recipe</li><li>Light and airy</li><li>Perfect texture</li></ul>',
                    'details' => '<p>Classic cream pastries made with traditional methods and filled with silky smooth whipped cream for a timeless and elegant treat.</p>',
                    'price' => 15.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Regular', 'Large']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-535487?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-405370?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-347792?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-158263?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709658?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-173133?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Premium Creamy Cheesecake Slices',
                    'description' => 'Premium cheesecake slices with rich cream cheese and graham crust.',
                    'specifications' => '<ul><li>Premium cream cheese</li><li>Graham cracker crust</li><li>Rich and creamy</li><li>Individual slices</li><li>New York style</li></ul>',
                    'details' => '<p>Premium creamy cheesecake slices made with the finest cream cheese and graham cracker crust, offering rich New York-style flavor.</p>',
                    'price' => 22.99,
                    'sale_price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-200309?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-387460?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-751645?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-356448?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-057615?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-860921?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Light and Airy Mousse Pastries',
                    'description' => 'Delicate mousse pastries with light, airy texture and smooth finish.',
                    'specifications' => '<ul><li>Light mousse texture</li><li>Airy consistency</li><li>Smooth finish</li><li>Delicate flavor</li><li>Elegant presentation</li></ul>',
                    'details' => '<p>Exquisite light and airy mousse pastries with delicate texture and smooth finish, perfect for those who appreciate refined desserts.</p>',
                    'price' => 20.99,
                    'cover_image' => 'https://images.unsplash.com/photo-142076?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-731213?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-442971?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593558?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-432684?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-401492?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Assorted Mini Pastries with Bite-Sized Portions',
                    'description' => 'Variety pack of mini pastries in bite-sized portions with different flavors.',
                    'specifications' => '<ul><li>Bite-sized portions</li><li>Assorted flavors</li><li>Mini pastries</li><li>Variety pack</li><li>Perfect for sharing</li></ul>',
                    'details' => '<p>Delightful assorted mini pastries in bite-sized portions featuring various flavors and styles, perfect for parties and sharing.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-155595?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-794890?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-095470?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-491212?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-530445?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-446329?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Elegant Layered Pastries with Multiple Cream',
                    'description' => 'Sophisticated layered pastries with multiple cream layers and elegant design.',
                    'specifications' => '<ul><li>Multiple cream layers</li><li>Elegant design</li><li>Sophisticated presentation</li><li>Complex flavors</li><li>Premium ingredients</li></ul>',
                    'details' => '<p>Sophisticated elegant layered pastries featuring multiple cream layers and complex flavors with premium ingredients and beautiful presentation.</p>',
                    'price' => 28.99,
                    'sale_price' => 25.99,
                    'cover_image' => 'https://images.unsplash.com/photo-643855?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-522453?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-092448?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-008546?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-189563?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-730980?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Signature Special Pastries with Luxurious Design',
                    'description' => 'Exclusive signature pastries with luxurious design and premium craftsmanship.',
                    'specifications' => '<ul><li>Signature recipe</li><li>Luxurious design</li><li>Premium craftsmanship</li><li>Exclusive creation</li><li>Artistic presentation</li></ul>',
                    'details' => '<p>Exclusive signature special pastries featuring luxurious design and premium craftsmanship, representing the pinnacle of pastry artistry.</p>',
                    'price' => 35.99,
                    'sale_price' => 32.99,
                    'cover_image' => 'https://images.unsplash.com/photo-210824?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-742535?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-875753?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-286338?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-657543?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-671762?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Breads & Loaves' => [
                [
                    'name' => 'Freshly Baked Sliced Premium White Bread',
                    'description' => 'Premium quality white bread with soft texture and fresh taste, sliced for convenience.',
                    'specifications' => '<ul><li>Premium white flour</li><li>Soft texture</li><li>Pre-sliced convenience</li><li>Fresh daily baking</li><li>Perfect for sandwiches</li></ul>',
                    'details' => '<p>Freshly baked premium white bread with exceptionally soft texture and delicious taste, conveniently pre-sliced for your daily needs.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-180379?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-879399?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-826098?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-624813?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-748944?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-202560?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Brown Bread with Goodness Of Wheat',
                    'description' => 'Nutritious brown bread enriched with the natural goodness of wheat for healthy living.',
                    'specifications' => '<ul><li>Wheat enriched</li><li>Natural goodness</li><li>High fiber content</li><li>Nutritious ingredients</li><li>Healthy choice</li></ul>',
                    'details' => '<p>Wholesome brown bread packed with the natural goodness of wheat, providing essential nutrients and fiber for a healthy lifestyle.</p>',
                    'price' => 5.49,
                    'variants' => [
                        ['name' => 'Slice Type', 'options' => ['Regular Slice', 'Thick Slice']],
                        ['name' => 'Slices', 'options' => ['1', '2', '3']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-691053?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-822312?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-395895?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-916977?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-144751?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-033679?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Factory Zero Maida Multigrain Bread',
                    'description' => 'Healthy multigrain bread made without maida, packed with multiple grains and seeds.',
                    'specifications' => '<ul><li>Zero maida formula</li><li>Multiple grains blend</li><li>Seed enriched</li><li>Healthy alternative</li><li>Natural ingredients</li></ul>',
                    'details' => '<p>Revolutionary multigrain bread made without maida, featuring a blend of healthy grains and seeds for maximum nutrition and taste.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-309329?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-699453?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-730832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-399928?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-351278?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573189?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Great Garlic Bread',
                    'description' => 'Aromatic garlic bread with rich garlic flavor and herbs, perfect as a side or snack.',
                    'specifications' => '<ul><li>Rich garlic flavor</li><li>Herb seasoning</li><li>Aromatic taste</li><li>Ready to serve</li><li>Perfect side dish</li></ul>',
                    'details' => '<p>Deliciously aromatic garlic bread infused with rich garlic flavor and herbs, making it the perfect accompaniment to any meal.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-912968?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-185056?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-385981?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-144760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-456260?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-076247?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Factory Zero Maida Sourdough Classic Bread',
                    'description' => 'Traditional sourdough bread made without maida, featuring classic tangy flavor and texture.',
                    'specifications' => '<ul><li>Zero maida recipe</li><li>Classic sourdough</li><li>Tangy flavor</li><li>Traditional fermentation</li><li>Artisan quality</li></ul>',
                    'details' => '<p>Classic sourdough bread crafted without maida using traditional fermentation methods, delivering authentic tangy flavor and perfect texture.</p>',
                    'price' => 8.99,
                    'sale_price' => 7.99,
                    'variants' => [
                        ['name' => 'Peices', 'options' => ['1', '2', '3']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-942190?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-337926?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-688789?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249581?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-554942?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-872838?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Oven-Baked Italian Flatbread Focaccia',
                    'description' => 'Authentic Italian focaccia flatbread, oven-baked with herbs and olive oil.',
                    'specifications' => '<ul><li>Authentic Italian recipe</li><li>Oven-baked perfection</li><li>Herb infused</li><li>Olive oil drizzled</li><li>Flatbread style</li></ul>',
                    'details' => '<p>Traditional Italian focaccia flatbread baked to perfection in the oven, infused with aromatic herbs and drizzled with premium olive oil.</p>',
                    'price' => 9.99,
                    'variants' => [
                        ['name' => 'Topping', 'options' => ['Classic Herbs', 'Rosemary', 'Tomato & Basil', 'Olive']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-309552?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-416964?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-736634?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-079914?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-561655?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-250650?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Freshly Baked Soft Dinner Rolls',
                    'description' => 'Soft and fluffy dinner rolls, freshly baked daily for the perfect meal accompaniment.',
                    'specifications' => '<ul><li>Soft and fluffy</li><li>Fresh daily baking</li><li>Perfect dinner size</li><li>Golden brown finish</li><li>Pack of 6 rolls</li></ul>',
                    'details' => '<p>Perfectly soft and fluffy dinner rolls baked fresh daily, featuring a golden brown finish and ideal size for any meal occasion.</p>',
                    'price' => 5.99,
                    'variants' => [
                        ['name' => 'Pack Size', 'options' => ['6 Rolls', '12 Rolls', '18 Rolls']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-138547?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-104870?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-290449?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-749241?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-956692?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Premium Soft Burger Buns with Smooth Bites',
                    'description' => 'Premium quality burger buns with exceptionally soft texture and smooth bite experience.',
                    'specifications' => '<ul><li>Premium quality</li><li>Exceptionally soft</li><li>Smooth bite texture</li><li>Perfect burger size</li><li>Pack of 4 buns</li></ul>',
                    'details' => '<p>Premium soft burger buns designed for the ultimate burger experience, featuring smooth bite texture and perfect size for gourmet burgers.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-031062?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-167096?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-623240?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-603334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-455762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-790536?w=800&h=800&fit=crop&crop=center'
                ],
            ],
            'Cookies & Biscuits' => [
                [
                    'name' => 'Double Chocochip Cookies',
                    'description' => 'Rich double chocolate chip cookies with premium cocoa and chocolate chunks.',
                    'specifications' => '<ul><li>Double chocolate recipe</li><li>Premium cocoa base</li><li>Chocolate chunks</li><li>Rich and indulgent</li><li>Pack of 12 cookies</li></ul>',
                    'details' => '<p>Indulgent double chocolate chip cookies made with premium cocoa and loaded with chocolate chunks for the ultimate chocolate experience.</p>',
                    'price' => 18.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Regular', 'Large', 'Mini Pack']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-248725?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-361753?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-273905?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-732877?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-730203?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-191448?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Classic Golden Butter Cookies',
                    'description' => 'Traditional golden butter cookies with rich, buttery flavor and crisp texture.',
                    'specifications' => '<ul><li>Classic butter recipe</li><li>Golden color</li><li>Rich buttery flavor</li><li>Crisp texture</li><li>Traditional baking</li></ul>',
                    'details' => '<p>Classic golden butter cookies made with traditional recipe featuring rich, buttery flavor and perfect crisp texture for timeless enjoyment.</p>',
                    'price' => 14.99,
                    'variants' => [
                        ['name' => 'Pack Size', 'options' => ['8 Pieces', '12 Pieces', '16 Pieces']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-944923?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-505436?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-205626?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-056773?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-587238?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-480645?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Wholesome Oven-Baked Oatmeal Cookies',
                    'description' => 'Nutritious oven-baked oatmeal cookies with wholesome ingredients and hearty texture.',
                    'specifications' => '<ul><li>Wholesome oats</li><li>Oven-baked fresh</li><li>Nutritious ingredients</li><li>Hearty texture</li><li>Natural sweetness</li></ul>',
                    'details' => '<p>Wholesome oven-baked oatmeal cookies made with nutritious ingredients and hearty oats for a healthy and satisfying treat.</p>',
                    'price' => 16.99,
                    'sale_price' => 14.99,
                    'cover_image' => 'https://images.unsplash.com/photo-921271?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-816424?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871425?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-918155?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-041242?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-054652?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Premium Almond Cookies Crafted',
                    'description' => 'Premium crafted almond cookies with rich almond flavor and delicate texture.',
                    'specifications' => '<ul><li>Premium almonds</li><li>Crafted recipe</li><li>Rich almond flavor</li><li>Delicate texture</li><li>Artisan quality</li></ul>',
                    'details' => '<p>Premium almond cookies carefully crafted with the finest almonds, delivering rich almond flavor and delicate texture in every bite.</p>',
                    'price' => 22.99,
                    'cover_image' => 'https://images.unsplash.com/photo-166228?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-776629?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-958655?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-621399?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-198734?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-677979?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Classic Scottish-Style Shortbread Biscuits',
                    'description' => 'Traditional Scottish-style shortbread biscuits with authentic buttery taste.',
                    'specifications' => '<ul><li>Scottish-style recipe</li><li>Authentic butter taste</li><li>Traditional method</li><li>Crumbly texture</li><li>Classic shape</li></ul>',
                    'details' => '<p>Authentic Scottish-style shortbread biscuits made with traditional methods and premium butter for the classic crumbly texture and rich taste.</p>',
                    'price' => 19.99,
                    'sale_price' => 17.99,
                    'cover_image' => 'https://images.unsplash.com/photo-554157?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-941122?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-725730?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-518681?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646186?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-277170?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Deluxe Cream-Filled Biscuits',
                    'description' => 'Luxurious cream-filled biscuits with smooth cream center and crispy exterior.',
                    'specifications' => '<ul><li>Deluxe quality</li><li>Smooth cream filling</li><li>Crispy exterior</li><li>Premium ingredients</li><li>Perfect sandwich</li></ul>',
                    'details' => '<p>Deluxe cream-filled biscuits featuring smooth, rich cream filling sandwiched between crispy biscuits made with premium ingredients.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'Cream Flavor', 'options' => ['Vanilla', 'Chocolate', 'Strawberry', 'Orange']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-723902?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-718281?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-764629?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573500?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-107950?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-712086?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Traditional Bakery-Style Dry',
                    'description' => 'Traditional bakery-style dry with authentic taste and perfect crunch.',
                    'specifications' => '<ul><li>Traditional bakery recipe</li><li>Dry biscuit style</li><li>Authentic taste</li><li>Perfect crunch</li><li>Long shelf life</li></ul>',
                    'details' => '<p>Traditional bakery-style dry made with authentic recipes, offering perfect crunch and classic taste that pairs well with tea or coffee.</p>',
                    'price' => 12.99,
                    'cover_image' => 'https://images.unsplash.com/photo-427239?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-588407?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-417977?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-970495?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-779228?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-235922?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Luxury Assorted Cookie Gift Boxes',
                    'description' => 'Elegant gift boxes containing luxury assorted cookies in premium packaging.',
                    'specifications' => '<ul><li>Luxury assortment</li><li>Premium gift packaging</li><li>Multiple cookie varieties</li><li>Elegant presentation</li><li>Perfect for gifting</li></ul>',
                    'details' => '<p>Luxury assorted cookie gift boxes featuring multiple premium cookie varieties in elegant packaging, perfect for special occasions and gifting.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'variants' => [
                        ['name' => 'Box Size', 'options' => ['Small (12 pieces)', 'Medium (24 pieces)', 'Large (36 pieces)']],
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-834694?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-309957?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-581373?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-413760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-762802?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214473?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Savory Bakes' => [
                [
                    'name' => 'Chinese Puff - Crunchy, Zesty, and Full of Flavor',
                    'description' => 'Crispy Chinese puff pastry with zesty filling and bold flavors.',
                    'specifications' => '<ul><li>Crunchy pastry shell</li><li>Zesty filling</li><li>Bold flavors</li><li>Chinese-style preparation</li><li>Fresh baked daily</li></ul>',
                    'details' => '<p>Delicious Chinese puff featuring crunchy pastry shell filled with zesty ingredients and bold flavors for an authentic taste experience.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-015497?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-134179?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-114169?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-039081?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-663230?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-859227?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Lakeview Milkbar Butter Croissants',
                    'description' => 'Premium butter croissants from Lakeview Milkbar with flaky layers and rich taste.',
                    'specifications' => '<ul><li>Premium butter</li><li>Flaky layers</li><li>Rich taste</li><li>Lakeview Milkbar quality</li><li>French technique</li></ul>',
                    'details' => '<p>Authentic Lakeview Milkbar butter croissants made with premium butter and French technique for perfect flaky layers and rich taste.</p>',
                    'price' => 12.99,
                    'sale_price' => 10.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Regular', 'Large', 'Mini Pack']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-664708?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-941953?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-369920?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-153421?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-635468?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-249252?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Double Decker Sandwich',
                    'description' => 'Multi-layered double decker sandwich with fresh ingredients and premium fillings.',
                    'specifications' => '<ul><li>Multi-layered design</li><li>Fresh ingredients</li><li>Premium fillings</li><li>Double decker style</li><li>Hearty portion</li></ul>',
                    'details' => '<p>Hearty double decker sandwich featuring multiple layers of fresh ingredients and premium fillings for a satisfying meal experience.</p>',
                    'price' => 15.99,
                    'cover_image' => 'https://images.unsplash.com/photo-630683?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-201015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-044550?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-879484?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665865?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-052125?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Veg Mini Quiches',
                    'description' => 'Bite-sized vegetarian quiches with fresh vegetables and creamy egg custard.',
                    'specifications' => '<ul><li>Bite-sized portions</li><li>Fresh vegetables</li><li>Creamy egg custard</li><li>Vegetarian recipe</li><li>Perfect for parties</li></ul>',
                    'details' => '<p>Delightful vegetarian mini quiches featuring fresh vegetables in creamy egg custard, perfect for parties and light meals.</p>',
                    'price' => 18.99,
                    'variants' => [
                        ['name' => 'Pack Size', 'options' => ['6 Pieces', '12 Pieces', '18 Pieces']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-092385?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-281363?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-011306?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-596716?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-076418?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-661712?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Spelled Pizza Slice with Vegetables',
                    'description' => 'Healthy spelled flour pizza slice topped with fresh vegetables and cheese.',
                    'specifications' => '<ul><li>Spelled flour base</li><li>Fresh vegetables</li><li>Quality cheese</li><li>Healthy option</li><li>Single slice serving</li></ul>',
                    'details' => '<p>Nutritious spelled flour pizza slice topped with fresh vegetables and quality cheese for a healthy and delicious meal option.</p>',
                    'price' => 9.99,
                    'sale_price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-965639?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-167069?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-676748?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-629321?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-465367?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-122097?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Frozen Sliced Soft Deli Bread Rolls',
                    'description' => 'Convenient frozen soft deli bread rolls, pre-sliced for easy use.',
                    'specifications' => '<ul><li>Frozen for freshness</li><li>Pre-sliced convenience</li><li>Soft texture</li><li>Deli quality</li><li>Easy to thaw</li></ul>',
                    'details' => '<p>Convenient frozen soft deli bread rolls that are pre-sliced for easy use, maintaining freshness and soft texture when thawed.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-774789?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-892207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-286331?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-104747?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-665729?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-598771?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cheese Stuffed Korean Bun',
                    'description' => 'Soft Korean-style bun stuffed with melted cheese and traditional flavors.',
                    'specifications' => '<ul><li>Korean-style bun</li><li>Melted cheese filling</li><li>Soft texture</li><li>Traditional flavors</li><li>Authentic recipe</li></ul>',
                    'details' => '<p>Authentic Korean-style bun with soft texture and melted cheese filling, prepared with traditional flavors for an authentic taste experience.</p>',
                    'price' => 11.99,
                    'cover_image' => 'https://images.unsplash.com/photo-105458?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-058515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-731637?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-750343?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-327450?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-147227?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Spinach Corn & Cheese Hand Pie Single Piece',
                    'description' => 'Individual hand pie filled with spinach, corn, and cheese in flaky pastry.',
                    'specifications' => '<ul><li>Individual serving</li><li>Spinach and corn filling</li><li>Cheese blend</li><li>Flaky pastry</li><li>Hand-held convenience</li></ul>',
                    'details' => '<p>Delicious individual hand pie featuring spinach, corn, and cheese filling wrapped in flaky pastry for convenient hand-held enjoyment.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-117720?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-804567?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-531987?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-722705?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-518947?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-337716?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Fruits & Vegetables' => [
                [
                    'name' => 'Best Quality Hybrid Strawberry',
                    'description' => 'Premium hybrid strawberries with exceptional sweetness and flavor.',
                    'specifications' => '<ul><li>Hybrid variety</li><li>Exceptional sweetness</li><li>Rich in vitamin C</li><li>1 lb container</li><li>Farm fresh</li></ul>',
                    'details' => '<p>Best quality hybrid strawberries with exceptional sweetness and vibrant flavor. Rich in vitamin C and antioxidants, perfect for snacking or desserts.</p>',
                    'price' => 5.99,
                    'sale_price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-374266?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-707297?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461709?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-205517?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-155649?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-093174?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Organic Palak Spinach',
                    'description' => 'Fresh organic palak spinach leaves, rich in iron and nutrients.',
                    'specifications' => '<ul><li>Certified organic</li><li>Rich in iron</li><li>Fresh palak variety</li><li>500g bundle</li><li>Pesticide-free</li></ul>',
                    'details' => '<p>Fresh organic palak spinach with tender leaves rich in iron and essential nutrients. Pesticide-free and perfect for healthy cooking.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-483904?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-443333?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-415749?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-389307?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-391692?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-975023?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Farm Fresh Carrot',
                    'description' => 'Crisp and sweet farm fresh carrots, perfect for cooking and snacking.',
                    'specifications' => '<ul><li>Farm fresh</li><li>Crisp and sweet</li><li>Rich in beta-carotene</li><li>1 kg pack</li><li>Locally sourced</li></ul>',
                    'details' => '<p>Crisp and sweet farm fresh carrots with vibrant orange color. Rich in beta-carotene and perfect for cooking, juicing, or snacking.</p>',
                    'price' => 2.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Small', 'Medium', 'Large']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-111414?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-911819?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-056741?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-769901?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-053036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-058497?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Harvest Organic Apple',
                    'description' => 'Crisp organic apples freshly harvested with natural sweetness.',
                    'specifications' => '<ul><li>Certified organic</li><li>Fresh harvest</li><li>Natural sweetness</li><li>1 kg pack</li><li>Crisp texture</li></ul>',
                    'details' => '<p>Fresh harvest organic apples with crisp texture and natural sweetness. Certified organic and perfect for healthy snacking or cooking.</p>',
                    'price' => 4.49,
                    'sale_price' => 3.99,
                    'variants' => [
                        ['name' => 'Variety', 'options' => ['Red Delicious', 'Green Apple', 'Gala']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-931172?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-191890?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-273349?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-763474?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-700194?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-630375?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Cut Mixed Vegetables',
                    'description' => 'Ready-to-cook mixed vegetables, freshly cut and cleaned.',
                    'specifications' => '<ul><li>Ready-to-cook</li><li>Freshly cut</li><li>Mixed varieties</li><li>500g pack</li><li>Pre-washed</li></ul>',
                    'details' => '<p>Convenient fresh cut mixed vegetables that are ready-to-cook. Pre-washed and cleaned for quick meal preparation.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-043397?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-755627?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-336846?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-494850?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-692824?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-938602?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Handpicked Exotic Dragon Fruit',
                    'description' => 'Premium handpicked dragon fruit with unique flavor and texture.',
                    'specifications' => '<ul><li>Handpicked quality</li><li>Exotic variety</li><li>Unique flavor</li><li>Per piece</li><li>Rich in antioxidants</li></ul>',
                    'details' => '<p>Premium handpicked exotic dragon fruit with unique sweet flavor and distinctive appearance. Rich in antioxidants and vitamins.</p>',
                    'price' => 8.99,
                    'variants' => [
                        ['name' => 'Type', 'options' => ['White Flesh', 'Red Flesh']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-312211?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-996488?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-946939?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-300832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-063841?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-587921?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Luxury Seasonal Fruits Hamper',
                    'description' => 'Premium hamper with assorted luxury seasonal fruits.',
                    'specifications' => '<ul><li>Luxury selection</li><li>Seasonal varieties</li><li>Premium quality</li><li>Gift hamper</li><li>Mixed fruits</li></ul>',
                    'details' => '<p>Luxury seasonal fruits hamper featuring premium quality assorted fruits. Perfect for gifting or special occasions.</p>',
                    'price' => 24.99,
                    'sale_price' => 21.99,
                    'cover_image' => 'https://images.unsplash.com/photo-532360?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-292668?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-686837?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-553683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-406648?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-937558?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Mint / Pudina Plant',
                    'description' => 'Live fresh mint plant for home gardening and cooking.',
                    'specifications' => '<ul><li>Live plant</li><li>Fresh mint variety</li><li>Home gardening</li><li>Potted plant</li><li>Aromatic leaves</li></ul>',
                    'details' => '<p>Live fresh mint plant perfect for home gardening. Aromatic leaves ideal for cooking, teas, and natural remedies.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-851854?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-081548?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-477056?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-328791?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-492143?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871401?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Mushroom',
                    'description' => 'Premium fresh mushrooms with earthy flavor and meaty texture.',
                    'specifications' => '<ul><li>Premium quality</li><li>Earthy flavor</li><li>Meaty texture</li><li>250g pack</li><li>Rich in protein</li></ul>',
                    'details' => '<p>Premium fresh mushrooms with rich earthy flavor and meaty texture. High in protein and perfect for cooking, salads, and gourmet dishes.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-151316?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-812341?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-289246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559981?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-108897?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-213160?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Broccoli',
                    'description' => 'Crisp fresh broccoli florets rich in vitamins and nutrients.',
                    'specifications' => '<ul><li>Fresh florets</li><li>Rich in vitamins</li><li>High fiber content</li><li>500g pack</li><li>Organic grown</li></ul>',
                    'details' => '<p>Crisp fresh broccoli florets packed with vitamins C and K, fiber, and essential nutrients. Organic grown and perfect for healthy cooking.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-874299?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-162432?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-043591?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-771737?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-975579?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-164487?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Dairy & Eggs' => [
                [
                    'name' => 'Aurora Cream Milk',
                    'description' => 'Premium Aurora cream milk with rich, creamy texture and natural taste.',
                    'specifications' => '<ul><li>Premium cream milk</li><li>Rich and creamy</li><li>Natural taste</li><li>1 liter pack</li><li>Fresh daily</li></ul>',
                    'details' => '<p>Aurora Cream Milk offers premium quality with rich, creamy texture and natural taste. Perfect for drinking, cooking, and baking needs.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-561205?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-928320?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-608594?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-592248?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-754989?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-136315?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Finest Salted Butter',
                    'description' => 'Premium finest salted butter made from fresh cream with perfect salt balance.',
                    'specifications' => '<ul><li>Premium quality</li><li>Made from fresh cream</li><li>Perfect salt balance</li><li>500g pack</li><li>Rich flavor</li></ul>',
                    'details' => '<p>Finest Salted Butter crafted from fresh cream with perfect salt balance for rich flavor. Ideal for cooking, baking, and spreading.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-473817?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-491090?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-225505?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-588650?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-668560?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-755138?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Aurora Cheese',
                    'description' => 'Premium Aurora Cheese with rich flavor and smooth texture.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich flavor</li><li>Smooth texture</li><li>200g pack</li><li>Natural ingredients</li></ul>',
                    'details' => '<p>Aurora Cheese offers premium quality with rich flavor and smooth texture. Made from natural ingredients for authentic taste.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-925324?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-871529?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-264680?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-274361?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-371794?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573945?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Honey Flavor Yogurt',
                    'description' => 'Creamy yogurt with natural honey flavor and live active cultures.',
                    'specifications' => '<ul><li>Natural honey flavor</li><li>Live active cultures</li><li>Creamy texture</li><li>400g container</li><li>Probiotic benefits</li></ul>',
                    'details' => '<p>Honey Flavor Yogurt combines creamy texture with natural honey sweetness and beneficial live cultures for healthy digestion.</p>',
                    'price' => 4.49,
                    'cover_image' => 'https://images.unsplash.com/photo-396247?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-161772?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-395688?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247743?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-127495?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-565190?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Creamvia Fresh Cream',
                    'description' => 'Premium Creamvia fresh cream with rich consistency for cooking and desserts.',
                    'specifications' => '<ul><li>Premium fresh cream</li><li>Rich consistency</li><li>Perfect for cooking</li><li>250ml pack</li><li>High fat content</li></ul>',
                    'details' => '<p>Creamvia Fresh Cream provides premium quality with rich consistency, perfect for cooking, baking, and making delicious desserts.</p>',
                    'price' => 5.49,
                    'sale_price' => 4.99,
                    'variants' => [
                        ['name' => 'Quantity', 'options' => ['200ml', '250ml', '500ml']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-131677?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-267279?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026321?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-351639?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333240?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-333829?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Lactobloom Paneer',
                    'description' => 'Fresh Lactobloom paneer with soft texture and authentic taste.',
                    'specifications' => '<ul><li>Fresh paneer</li><li>Soft texture</li><li>Authentic taste</li><li>200g pack</li><li>High protein</li></ul>',
                    'details' => '<p>Lactobloom Paneer offers fresh, soft texture with authentic taste. High in protein and perfect for Indian cooking and healthy meals.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-570282?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-240013?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-012228?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-179584?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-848874?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-046230?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Large Fresh Eggs from Free-Roaming Hens',
                    'description' => 'Premium large fresh eggs from free-roaming hens with rich golden yolks.',
                    'specifications' => '<ul><li>Free-roaming hens</li><li>Large size</li><li>Rich golden yolks</li><li>Dozen pack</li><li>Farm fresh</li></ul>',
                    'details' => '<p>Large Fresh Eggs from Free-Roaming Hens provide premium quality with rich golden yolks and superior flavor from ethically raised hens.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'variants' => [
                        ['name' => 'Pack Size', 'options' => ['6 Eggs', '12 Eggs', '18 Eggs']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-272397?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-076823?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-567664?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-097348?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-907458?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-340080?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Frothy Yogurt Drink',
                    'description' => 'Refreshing frothy yogurt drink with smooth texture and natural taste.',
                    'specifications' => '<ul><li>Frothy texture</li><li>Smooth consistency</li><li>Natural taste</li><li>250ml bottle</li><li>Refreshing drink</li></ul>',
                    'details' => '<p>Frothy Yogurt Drink offers refreshing taste with smooth, frothy texture. Perfect for on-the-go refreshment and healthy hydration.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-766831?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-448561?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-233090?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-682025?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-697580?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-181903?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Chocolate Flavoured Milk',
                    'description' => 'Rich and creamy chocolate flavoured milk with premium cocoa.',
                    'specifications' => '<ul><li>Premium cocoa</li><li>Rich chocolate flavor</li><li>Creamy texture</li><li>500ml bottle</li><li>No artificial colors</li></ul>',
                    'details' => '<p>Rich and creamy chocolate flavoured milk made with premium cocoa for authentic chocolate taste. Perfect for kids and chocolate lovers.</p>',
                    'price' => 2.99,
                    'cover_image' => 'https://images.unsplash.com/photo-570119?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-926668?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-720348?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-383866?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-759007?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-184891?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Strawberry Milkshake',
                    'description' => 'Delicious strawberry milkshake with real fruit pieces and creamy milk.',
                    'specifications' => '<ul><li>Real strawberry pieces</li><li>Creamy milk base</li><li>Natural fruit flavor</li><li>400ml bottle</li><li>Rich in calcium</li></ul>',
                    'details' => '<p>Delicious strawberry milkshake made with real fruit pieces and creamy milk. Natural fruit flavor and rich in calcium for a healthy treat.</p>',
                    'price' => 3.49,
                    'cover_image' => 'https://images.unsplash.com/photo-023218?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-170705?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-723589?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-072592?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-425803?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-536207?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Grocery & Staples' => [
                [
                    'name' => 'Golden Harvest Basmati Rice',
                    'description' => 'Premium Golden Harvest basmati rice with long grains and aromatic fragrance.',
                    'specifications' => '<ul><li>Premium basmati variety</li><li>Long grain</li><li>Aromatic fragrance</li><li>5kg pack</li><li>Aged for flavor</li></ul>',
                    'details' => '<p>Golden Harvest Basmati Rice offers premium quality with distinctive aromatic fragrance and fluffy texture. Aged for enhanced flavor and perfect for biryanis and pulao.</p>',
                    'price' => 15.99,
                    'sale_price' => 13.99,
                    'cover_image' => 'https://images.unsplash.com/photo-789893?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-165120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-760095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-497665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708357?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-644023?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Khapli Whole Wheat Flour',
                    'description' => 'Nutritious Khapli whole wheat flour with high fiber and protein content.',
                    'specifications' => '<ul><li>Khapli wheat variety</li><li>Stone ground</li><li>High fiber content</li><li>2kg pack</li><li>Chemical-free</li></ul>',
                    'details' => '<p>Khapli Whole Wheat Flour is made from ancient wheat variety, stone ground to preserve nutrients. High in fiber and protein, perfect for healthy rotis and bread.</p>',
                    'price' => 8.99,
                    'variants' => [
                        ['name' => 'Pack Size', 'options' => ['1kg', '2kg', '5kg']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-766001?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-111933?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-914820?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-992281?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-973175?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-151643?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Masoor Dal and Moong Dal Pulses',
                    'description' => 'Premium quality masoor dal and moong dal pulses rich in protein.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich in protein</li><li>Easy to cook</li><li>1kg pack each</li><li>Machine cleaned</li></ul>',
                    'details' => '<p>Premium Masoor Dal and Moong Dal Pulses offer excellent protein content and easy cooking. Machine cleaned and sorted for quality assurance.</p>',
                    'price' => 12.99,
                    'sale_price' => 10.99,
                    'cover_image' => 'https://images.unsplash.com/photo-187090?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-555214?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-149124?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-729941?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-607128?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-584160?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Premium Brown Lentils',
                    'description' => 'Premium brown lentils with rich flavor and high nutritional value.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich flavor</li><li>High nutrition</li><li>500g pack</li><li>Organic certified</li></ul>',
                    'details' => '<p>Premium Brown Lentils offer rich flavor and high nutritional value. Organic certified and perfect for healthy soups, curries, and salads.</p>',
                    'price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-027718?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-569522?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247887?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-026766?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-561319?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-140724?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fortune Cooking Oils',
                    'description' => 'Fortune brand premium cooking oils for healthy cooking and frying.',
                    'specifications' => '<ul><li>Fortune brand</li><li>Premium quality</li><li>Healthy cooking</li><li>1L bottle</li><li>Multiple varieties</li></ul>',
                    'details' => '<p>Fortune Cooking Oils provide premium quality for healthy cooking and frying. Available in multiple varieties including sunflower, mustard, and refined oil.</p>',
                    'price' => 9.99,
                    'sale_price' => 8.49,
                    'cover_image' => 'https://images.unsplash.com/photo-937854?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-896024?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-404182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-598958?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559293?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-130904?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Sugar & Salt',
                    'description' => 'Premium quality sugar and salt combo pack for daily cooking needs.',
                    'specifications' => '<ul><li>Premium quality</li><li>Refined sugar</li><li>Iodized salt</li><li>Combo pack</li><li>Daily essentials</li></ul>',
                    'details' => '<p>Premium Sugar & Salt combo pack includes refined sugar and iodized salt for daily cooking needs. Essential ingredients for every kitchen.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-863446?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-169006?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709560?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-297262?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-492383?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-827429?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Outino Spices',
                    'description' => 'Outino brand premium spices collection for authentic flavors.',
                    'specifications' => '<ul><li>Outino brand</li><li>Premium spices</li><li>Authentic flavors</li><li>Variety pack</li><li>Fresh ground</li></ul>',
                    'details' => '<p>Outino Spices offer premium quality spice collection with authentic flavors. Fresh ground spices perfect for Indian cooking and international cuisines.</p>',
                    'price' => 11.99,
                    'sale_price' => 9.99,
                    'cover_image' => 'https://images.unsplash.com/photo-780721?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-092773?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-987559?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-709064?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-058349?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-809600?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Healthy Ready Mixes',
                    'description' => 'Healthy ready-to-cook mixes for quick and nutritious meals.',
                    'specifications' => '<ul><li>Ready-to-cook</li><li>Healthy ingredients</li><li>Quick preparation</li><li>200g pack</li><li>Preservative-free</li></ul>',
                    'details' => '<p>Healthy Ready Mixes provide convenient ready-to-cook options with healthy ingredients. Quick preparation for nutritious meals without preservatives.</p>',
                    'price' => 7.49,
                    'variants' => [
                        ['name' => 'Mix Type', 'options' => ['Idli Mix', 'Dosa Mix', 'Upma Mix', 'Pancake Mix']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-110497?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-870831?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-552390?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-947998?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-772182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-908808?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Royal Almonds',
                    'description' => 'Premium quality royal almonds with rich flavor and natural goodness.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich in protein</li><li>Natural goodness</li><li>500g pack</li><li>Raw almonds</li></ul>',
                    'details' => '<p>Premium Royal Almonds with rich flavor and natural goodness. High in protein and healthy fats, perfect for snacking and cooking.</p>',
                    'price' => 18.99,
                    'cover_image' => 'https://images.unsplash.com/photo-485904?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-853871?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-860011?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-746942?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-037470?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-627221?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Nutrios Breakfast Cereals',
                    'description' => 'Nutritious breakfast cereals with whole grains and essential vitamins.',
                    'specifications' => '<ul><li>Whole grain cereals</li><li>Essential vitamins</li><li>High fiber content</li><li>400g box</li><li>Fortified with minerals</li></ul>',
                    'details' => '<p>Nutrios Breakfast Cereals provide nutritious start to your day with whole grains and essential vitamins. High fiber content and fortified with minerals.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-260887?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-067672?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-661923?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-618620?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-874269?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-797266?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Snacks & Beverages' => [
                [
                    'name' => 'Lays Chips',
                    'description' => 'Crispy Lays potato chips with classic flavor and perfect crunch.',
                    'specifications' => '<ul><li>Crispy potato chips</li><li>Classic flavor</li><li>Perfect crunch</li><li>50g pack</li><li>No artificial colors</li></ul>',
                    'details' => '<p>Lays Chips offer the perfect combination of crispy texture and classic flavor. Made from quality potatoes for the ultimate snacking experience.</p>',
                    'price' => 2.99,
                    'cover_image' => 'https://images.unsplash.com/photo-679762?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-258116?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-803124?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-569017?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-557486?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-136580?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Hide & Seek Biscuits',
                    'description' => 'Delicious Hide & Seek chocolate chip biscuits with rich chocolate flavor.',
                    'specifications' => '<ul><li>Chocolate chip biscuits</li><li>Rich chocolate flavor</li><li>Crunchy texture</li><li>100g pack</li><li>Premium ingredients</li></ul>',
                    'details' => '<p>Hide & Seek Biscuits feature delicious chocolate chips in every bite with rich chocolate flavor and perfect crunchy texture.</p>',
                    'price' => 3.49,
                    'sale_price' => 2.99,
                    'cover_image' => 'https://images.unsplash.com/photo-546973?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-817453?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-281338?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-918147?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462043?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-675069?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Indya Amul Chocomini Chocolate',
                    'description' => 'Premium Indya Amul Chocomini chocolates with rich cocoa and smooth texture.',
                    'specifications' => '<ul><li>Premium chocolate</li><li>Rich cocoa content</li><li>Smooth texture</li><li>Mini size</li><li>Amul quality</li></ul>',
                    'details' => '<p>Indya Amul Chocomini Chocolate offers premium quality with rich cocoa content and smooth texture in convenient mini size portions.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-574479?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-912328?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-214967?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-732808?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-331551?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-542644?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cranbery Flavoured Soft Drink',
                    'description' => 'Refreshing cranberry flavored soft drink with natural fruit essence.',
                    'specifications' => '<ul><li>Cranberry flavor</li><li>Natural fruit essence</li><li>Refreshing taste</li><li>330ml bottle</li><li>Carbonated drink</li></ul>',
                    'details' => '<p>Cranbery Flavoured Soft Drink provides refreshing taste with natural fruit essence and perfect carbonation for ultimate refreshment.</p>',
                    'price' => 1.99,
                    'sale_price' => 1.79,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['330ml', '500ml', '1L']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-786209?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-059532?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-164836?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-126522?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-066908?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-628678?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Organic Juice',
                    'description' => 'Premium fresh organic juice made from 100% organic fruits.',
                    'specifications' => '<ul><li>100% organic fruits</li><li>Fresh pressed</li><li>No preservatives</li><li>250ml bottle</li><li>Natural vitamins</li></ul>',
                    'details' => '<p>Fresh Organic Juice made from 100% organic fruits with no preservatives. Rich in natural vitamins and fresh pressed for maximum nutrition.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-140905?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-098306?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-240150?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-045217?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-426914?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-039819?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Artisan Grey Tea',
                    'description' => 'Premium artisan grey tea with bergamot oil and natural flavors.',
                    'specifications' => '<ul><li>Premium tea leaves</li><li>Bergamot oil</li><li>Natural flavors</li><li>25 tea bags</li><li>Artisan quality</li></ul>',
                    'details' => '<p>Artisan Grey Tea features premium tea leaves infused with bergamot oil and natural flavors for an authentic and refined tea experience.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-241762?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-440924?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-615499?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-854725?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959040?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-153920?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Nitro Boost Energy Drinks',
                    'description' => 'High-energy Nitro Boost drinks with caffeine and natural ingredients.',
                    'specifications' => '<ul><li>High caffeine content</li><li>Natural ingredients</li><li>Energy boost formula</li><li>250ml can</li><li>Sugar-free option</li></ul>',
                    'details' => '<p>Nitro Boost Energy Drinks provide powerful energy boost with high caffeine content and natural ingredients for sustained energy and focus.</p>',
                    'price' => 2.49,
                    'variants' => [
                        ['name' => 'Flavor', 'options' => ['Original', 'Berry Blast', 'Citrus Rush', 'Sugar-Free']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-815841?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-040548?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-198552?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-579677?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-410295?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-359340?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Savory Mix Namkeen',
                    'description' => 'Traditional savory mix namkeen with spices and crunchy ingredients.',
                    'specifications' => '<ul><li>Traditional recipe</li><li>Spicy flavor</li><li>Crunchy texture</li><li>200g pack</li><li>Mixed ingredients</li></ul>',
                    'details' => '<p>Savory Mix Namkeen offers traditional Indian snacking experience with perfect blend of spices and crunchy ingredients for authentic taste.</p>',
                    'price' => 3.99,
                    'cover_image' => 'https://images.unsplash.com/photo-528459?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-481414?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-456277?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-246015?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-856886?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-894275?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Noodle King Instant Noodles',
                    'description' => 'Quick and delicious instant noodles with rich flavor and perfect texture.',
                    'specifications' => '<ul><li>Quick 3-minute cooking</li><li>Rich flavor packet</li><li>Perfect texture</li><li>70g pack</li><li>No preservatives</li></ul>',
                    'details' => '<p>Noodle King Instant Noodles provide quick and satisfying meal with rich flavor and perfect texture. Ready in just 3 minutes with no preservatives.</p>',
                    'price' => 1.99,
                    'cover_image' => 'https://images.unsplash.com/photo-909009?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-902056?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654182?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-332472?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-158372?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-701549?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Nutri-Core Energy Bars',
                    'description' => 'Nutritious energy bars packed with protein and natural ingredients.',
                    'specifications' => '<ul><li>High protein content</li><li>Natural ingredients</li><li>Energy boost formula</li><li>40g bar</li><li>No artificial flavors</li></ul>',
                    'details' => '<p>Nutri-Core Energy Bars provide sustained energy with high protein content and natural ingredients. Perfect for pre-workout or healthy snacking.</p>',
                    'price' => 2.49,
                    'cover_image' => 'https://images.unsplash.com/photo-734345?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-478812?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-154271?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-533053?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-738168?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-421291?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Household & Personal Care' => [
                [
                    'name' => 'Spin Mop with Wheels and Deluxe Wringer System',
                    'description' => 'Advanced spin mop with wheels and deluxe wringer system for effortless cleaning.',
                    'specifications' => '<ul><li>360-degree spin technology</li><li>Wheels for easy mobility</li><li>Deluxe wringer system</li><li>Microfiber mop head</li><li>Adjustable handle</li></ul>',
                    'details' => '<p>Revolutionary spin mop with wheels and deluxe wringer system for effortless floor cleaning. Features 360-degree spin technology and microfiber head for superior cleaning performance.</p>',
                    'price' => 49.99,
                    'sale_price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-101674?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-678650?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-550842?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-491095?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-675316?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-386683?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fresh Liquid Detergent',
                    'description' => 'Premium fresh liquid detergent for powerful cleaning and fresh fragrance.',
                    'specifications' => '<ul><li>Concentrated formula</li><li>Fresh fragrance</li><li>Stain removal power</li><li>1L bottle</li><li>Eco-friendly ingredients</li></ul>',
                    'details' => '<p>Fresh Liquid Detergent provides powerful cleaning action with concentrated formula and fresh fragrance. Eco-friendly ingredients for effective stain removal.</p>',
                    'price' => 8.99,
                    'cover_image' => 'https://images.unsplash.com/photo-668691?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-640120?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-512774?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-169731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-019776?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-298017?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Ecowash Drop Liquid Lemon Dishwash',
                    'description' => 'Eco-friendly lemon dishwash liquid with natural cleaning power.',
                    'specifications' => '<ul><li>Eco-friendly formula</li><li>Natural lemon extract</li><li>Grease cutting power</li><li>500ml bottle</li><li>Gentle on hands</li></ul>',
                    'details' => '<p>Ecowash Drop Liquid Lemon Dishwash combines eco-friendly formula with natural lemon extract for powerful grease cutting while being gentle on hands.</p>',
                    'price' => 4.99,
                    'sale_price' => 4.49,
                    'cover_image' => 'https://images.unsplash.com/photo-043836?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-352604?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-078136?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-423771?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-364624?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-679412?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Elemental Soap with Nutrient Serum',
                    'description' => 'Premium elemental soap enriched with nutrient serum for skin nourishment.',
                    'specifications' => '<ul><li>Nutrient serum enriched</li><li>Natural ingredients</li><li>Moisturizing formula</li><li>100g bar</li><li>Suitable for all skin types</li></ul>',
                    'details' => '<p>Elemental Soap with Nutrient Serum provides premium skincare with natural ingredients and moisturizing formula. Enriched with nutrients for healthy, nourished skin.</p>',
                    'price' => 6.99,
                    'variants' => [
                        ['name' => 'Variant', 'options' => ['Aloe Vera', 'Honey & Oats', 'Charcoal', 'Rose']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-507633?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-017660?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-405837?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-461645?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-339000?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-619955?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Daily Care Herbal Shampoo',
                    'description' => 'Gentle herbal shampoo for daily hair care with natural ingredients.',
                    'specifications' => '<ul><li>Herbal formula</li><li>Natural ingredients</li><li>Daily use suitable</li><li>300ml bottle</li><li>Sulfate-free</li></ul>',
                    'details' => '<p>Daily Care Herbal Shampoo provides gentle cleansing with natural herbal ingredients. Sulfate-free formula suitable for daily use and all hair types.</p>',
                    'price' => 7.99,
                    'sale_price' => 6.99,
                    'cover_image' => 'https://images.unsplash.com/photo-584900?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-556368?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-257166?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-009862?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-159310?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-382287?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Denawhite Toothpaste',
                    'description' => 'Advanced whitening toothpaste for bright, healthy teeth and fresh breath.',
                    'specifications' => '<ul><li>Whitening formula</li><li>Fluoride protection</li><li>Fresh mint flavor</li><li>100g tube</li><li>Enamel safe</li></ul>',
                    'details' => '<p>Denawhite Toothpaste features advanced whitening formula with fluoride protection for bright, healthy teeth. Fresh mint flavor and enamel-safe ingredients.</p>',
                    'price' => 3.99,
                    'variants' => [
                        ['name' => 'Flavor', 'options' => ['Fresh Mint', 'Cool Mint', 'Herbal', 'Sensitive']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-460953?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-916520?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-335166?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-085330?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-854391?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-959830?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Disposable Paper Products',
                    'description' => 'High-quality disposable paper products for convenient household use.',
                    'specifications' => '<ul><li>High-quality paper</li><li>Disposable convenience</li><li>Multi-purpose use</li><li>Pack of 100 pieces</li><li>Eco-friendly material</li></ul>',
                    'details' => '<p>Disposable Paper Products offer convenient household solutions with high-quality paper and eco-friendly materials. Perfect for various cleaning and serving needs.</p>',
                    'price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-568773?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-724881?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-270944?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-073121?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247158?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-601159?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Aromist Air Freshener',
                    'description' => 'Premium Aromist air freshener for long-lasting fragrance and freshness.',
                    'specifications' => '<ul><li>Long-lasting fragrance</li><li>Premium quality</li><li>Instant freshness</li><li>300ml spray</li><li>Multiple scents available</li></ul>',
                    'details' => '<p>Aromist Air Freshener provides premium quality fragrance with long-lasting freshness. Instant room transformation with multiple delightful scents to choose from.</p>',
                    'price' => 6.49,
                    'sale_price' => 5.99,
                    'cover_image' => 'https://images.unsplash.com/photo-558799?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-704384?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-391738?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220857?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-369583?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-158325?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Sparkler Floor Cleaner',
                    'description' => 'Powerful floor cleaner that removes tough stains and leaves floors sparkling clean.',
                    'specifications' => '<ul><li>Powerful cleaning formula</li><li>Removes tough stains</li><li>Sparkling clean finish</li><li>1L bottle</li><li>Pleasant fragrance</li></ul>',
                    'details' => '<p>Sparkler Floor Cleaner provides powerful cleaning action that removes tough stains and dirt, leaving your floors sparkling clean with a pleasant fragrance.</p>',
                    'price' => 7.99,
                    'cover_image' => 'https://images.unsplash.com/photo-602956?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-317670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-982385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-957039?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-508980?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-251185?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Aura Clean Hand Wash',
                    'description' => 'Gentle antibacterial hand wash with moisturizing formula for soft, clean hands.',
                    'specifications' => '<ul><li>Antibacterial formula</li><li>Moisturizing ingredients</li><li>Gentle on skin</li><li>250ml pump bottle</li><li>Fresh fragrance</li></ul>',
                    'details' => '<p>Aura Clean Hand Wash provides effective antibacterial protection while moisturizing your hands. Gentle formula keeps hands soft and clean with fresh fragrance.</p>',
                    'price' => 4.99,
                    'cover_image' => 'https://images.unsplash.com/photo-909660?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-345174?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-129067?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-491438?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-551437?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-705912?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Interior Accessories' => [
                [
                    'name' => 'Premium Car Seat Covers',
                    'description' => 'High-quality premium seat covers for enhanced comfort and protection.',
                    'specifications' => '<ul><li>Premium materials</li><li>Universal fit</li><li>Easy installation</li><li>Machine washable</li><li>Breathable fabric</li></ul>',
                    'details' => '<p>Premium car seat covers made from high-quality materials for enhanced comfort and protection. Universal fit design with easy installation and machine washable fabric.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'Material', 'options' => ['Leather', 'Fabric', 'Neoprene']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-838836?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-513385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-212663?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-424639?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-302771?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-285665?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Steering Wheel Cover',
                    'description' => 'Comfortable steering wheel cover with enhanced grip and style.',
                    'specifications' => '<ul><li>Enhanced grip</li><li>Comfortable feel</li><li>Easy installation</li><li>Universal size</li><li>Durable material</li></ul>',
                    'details' => '<p>Comfortable steering wheel cover designed for enhanced grip and driving comfort. Easy installation with universal sizing for most vehicles.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-055209?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-853052?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-619499?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-557002?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-498078?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-586056?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Luxury Floor Mats for Cars',
                    'description' => 'Luxury all-weather floor mats for superior protection and style.',
                    'specifications' => '<ul><li>All-weather protection</li><li>Luxury design</li><li>Custom fit</li><li>Easy to clean</li><li>Anti-slip backing</li></ul>',
                    'details' => '<p>Luxury floor mats providing superior protection against dirt and moisture. Custom fit design with anti-slip backing for safety and style.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-301456?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-709660?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-265564?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-613635?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-752654?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-029794?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Elegant Car Dashboard Cover',
                    'description' => 'Elegant dashboard cover for UV protection and enhanced interior aesthetics.',
                    'specifications' => '<ul><li>UV protection</li><li>Elegant design</li><li>Custom fit</li><li>Heat resistant</li><li>Easy installation</li></ul>',
                    'details' => '<p>Elegant dashboard cover providing UV protection while enhancing interior aesthetics. Custom fit design with heat resistant materials.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-194996?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-623401?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-567141?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-064409?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-828674?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-729208?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'ComfortDrive Armrest Cushion',
                    'description' => 'Ergonomic armrest cushion for enhanced driving comfort during long trips.',
                    'specifications' => '<ul><li>Ergonomic design</li><li>Memory foam</li><li>Universal fit</li><li>Easy attachment</li><li>Breathable cover</li></ul>',
                    'details' => '<p>ComfortDrive armrest cushion with ergonomic design and memory foam for enhanced comfort during long drives. Universal fit with easy attachment.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-612355?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-137863?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-708601?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-719855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-411149?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-542472?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'AutoShade Window Sunshade',
                    'description' => 'Premium window sunshade for UV protection and temperature control.',
                    'specifications' => '<ul><li>UV protection</li><li>Temperature control</li><li>Easy installation</li><li>Foldable design</li><li>Universal fit</li></ul>',
                    'details' => '<p>AutoShade window sunshade providing excellent UV protection and temperature control. Foldable design with easy installation for all vehicles.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-646084?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-049643?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-227690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-748807?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-639179?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-092355?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'SmartStore Car Organizer',
                    'description' => 'Multi-compartment car organizer for efficient storage and organization.',
                    'specifications' => '<ul><li>Multi-compartment design</li><li>Durable materials</li><li>Easy installation</li><li>Adjustable straps</li><li>Compact size</li></ul>',
                    'details' => '<p>SmartStore car organizer with multi-compartment design for efficient storage. Durable materials with adjustable straps for secure installation.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-111547?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-051044?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-210743?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-396136?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-812323?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-206467?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'SmartGlow Ambient Lighting',
                    'description' => 'LED ambient lighting system for enhanced interior atmosphere.',
                    'specifications' => '<ul><li>LED technology</li><li>Multiple colors</li><li>Remote control</li><li>Easy installation</li><li>Low power consumption</li></ul>',
                    'details' => '<p>SmartGlow ambient lighting system with LED technology and multiple color options. Remote control operation with easy installation and low power consumption.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'Length', 'options' => ['2 meters', '3 meters', '5 meters']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-308117?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-694270?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-564205?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-417530?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-573520?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-727843?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Dual Grip Cleaning Tool',
                    'description' => 'Versatile dual-grip cleaning tool for interior detailing and maintenance.',
                    'specifications' => '<ul><li>Dual-grip design</li><li>Microfiber attachments</li><li>Ergonomic handle</li><li>Washable pads</li><li>Multi-surface use</li></ul>',
                    'details' => '<p>Dual Grip cleaning tool with versatile design for interior detailing. Includes microfiber attachments and ergonomic handle for effective cleaning.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-959292?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-642486?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-350999?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-845906?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-755314?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-085568?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Seat Neck Support Pillow',
                    'description' => 'Ergonomic neck support pillow for comfortable driving and passenger experience.',
                    'specifications' => '<ul><li>Ergonomic design</li><li>Memory foam core</li><li>Adjustable strap</li><li>Breathable cover</li><li>Universal fit</li></ul>',
                    'details' => '<p>Car Seat Neck Support Pillow with ergonomic design and memory foam core for optimal comfort. Adjustable strap with breathable cover for all vehicles.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-203647?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-911908?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-299821?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-393927?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-584955?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-798967?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Exterior Accessories' => [
                [
                    'name' => 'Waterproof Car Cover',
                    'description' => 'Premium waterproof car cover for all-weather protection.',
                    'specifications' => '<ul><li>Waterproof material</li><li>UV protection</li><li>Breathable fabric</li><li>Elastic hem</li><li>Storage bag included</li></ul>',
                    'details' => '<p>Premium waterproof car cover providing complete protection from rain, snow, UV rays, and dust. Breathable fabric prevents moisture buildup.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Small', 'Medium', 'Large', 'XL']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-474644?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-040253?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-115777?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-464246?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-073293?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-260908?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Unbreakable Door Visor',
                    'description' => 'Durable door visor for rain protection and ventilation.',
                    'specifications' => '<ul><li>Unbreakable material</li><li>Rain protection</li><li>Easy installation</li><li>Aerodynamic design</li><li>Set of 4 pieces</li></ul>',
                    'details' => '<p>Unbreakable door visor made from high-quality materials for rain protection while allowing fresh air circulation. Easy installation with aerodynamic design.</p>',
                    'price' => 45.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Black', 'Gray']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-972776?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-687621?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-170485?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-947016?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-659969?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-185684?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Mud Flap Automotive Wheels Car Mudguard',
                    'description' => 'Heavy-duty mud flaps for wheel protection and cleanliness.',
                    'specifications' => '<ul><li>Heavy-duty construction</li><li>Flexible material</li><li>Easy installation</li><li>Universal fit</li><li>Set of 4 pieces</li></ul>',
                    'details' => '<p>Heavy-duty mud flaps designed to protect your vehicle and other cars from mud, rocks, and debris. Flexible material with universal fit for all vehicles.</p>',
                    'price' => 35.99,
                    'cover_image' => 'https://images.unsplash.com/photo-868621?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-755105?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-751394?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-382085?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-940790?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-115619?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Chrome Trim Strip',
                    'description' => 'Decorative chrome trim strip for enhanced vehicle styling.',
                    'specifications' => '<ul><li>Chrome finish</li><li>Flexible design</li><li>Self-adhesive</li><li>Weather resistant</li><li>Multiple lengths available</li></ul>',
                    'details' => '<p>Decorative chrome trim strip for enhancing vehicle styling. Self-adhesive installation with flexible design and weather-resistant chrome finish.</p>',
                    'price' => 25.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Red', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-170007?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-420444?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-976972?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-902998?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-717676?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-400330?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cars Side Graphics Stickers',
                    'description' => 'Premium vinyl graphics stickers for vehicle customization.',
                    'specifications' => '<ul><li>Premium vinyl material</li><li>Weather resistant</li><li>Easy application</li><li>Multiple designs</li><li>Pair included</li></ul>',
                    'details' => '<p>Premium vinyl graphics stickers for vehicle customization. Weather-resistant material with easy application and multiple design options available.</p>',
                    'price' => 39.99,
                    'variants' => [
                        ['name' => 'Color', 'options' => ['White', 'Yellow', 'Black', 'Blue']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-236813?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-994325?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-803670?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-303430?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-048876?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-989480?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Roof Rails Black Suitable For All Cars',
                    'description' => 'Universal black roof rails for cargo carrying capacity.',
                    'specifications' => '<ul><li>Universal fit</li><li>Black finish</li><li>High load capacity</li><li>Easy installation</li><li>Aerodynamic design</li></ul>',
                    'details' => '<p>Universal black roof rails designed for all cars to increase cargo carrying capacity. Aerodynamic design with high load capacity and easy installation.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-542974?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-177762?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-059864?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-462892?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646778?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-868280?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Stainless Steel License Plate Frames',
                    'description' => 'Premium stainless steel license plate frames for durability.',
                    'specifications' => '<ul><li>Stainless steel construction</li><li>Rust resistant</li><li>Easy installation</li><li>Universal fit</li><li>Set of 2 frames</li></ul>',
                    'details' => '<p>Premium stainless steel license plate frames offering superior durability and rust resistance. Universal fit with easy installation for front and rear plates.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-987688?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-444455?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-274467?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-080702?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-882849?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-489151?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Economical Wiper Blade',
                    'description' => 'Cost-effective wiper blade for clear visibility in all weather.',
                    'specifications' => '<ul><li>Economical design</li><li>All-weather performance</li><li>Easy installation</li><li>Multiple sizes</li><li>Durable rubber</li></ul>',
                    'details' => '<p>Economical wiper blade providing reliable performance in all weather conditions. Durable rubber construction with easy installation and multiple size options.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-811106?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-148688?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-869464?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-253825?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-868759?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-763870?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Mini Spoiler Wing For All Cars',
                    'description' => 'Universal mini spoiler wing for enhanced aerodynamics and style.',
                    'specifications' => '<ul><li>Universal fit</li><li>Aerodynamic design</li><li>Lightweight construction</li><li>Easy installation</li><li>Multiple colors</li></ul>',
                    'details' => '<p>Universal mini spoiler wing designed for all cars to enhance aerodynamics and styling. Lightweight construction with easy installation and multiple color options.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-969067?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-249930?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-799832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-625353?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-171541?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-835500?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Front Fog Lamp Cover',
                    'description' => 'Protective fog lamp cover for enhanced durability and style.',
                    'specifications' => '<ul><li>Protective design</li><li>Enhanced durability</li><li>Easy installation</li><li>Perfect fit</li><li>Pair included</li></ul>',
                    'details' => '<p>Protective front fog lamp cover designed to enhance durability and style. Perfect fit with easy installation and pair included for complete protection.</p>',
                    'price' => 55.99,
                    'cover_image' => 'https://images.unsplash.com/photo-082980?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-906334?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-199878?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-079612?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-986826?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-122061?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Car Electronics' => [
                [
                    'name' => 'Voltmax 85W Car Charger Mobile',
                    'description' => 'High-power 85W car charger for fast mobile device charging.',
                    'specifications' => '<ul><li>85W fast charging</li><li>Multiple USB ports</li><li>LED indicator</li><li>Overcharge protection</li><li>Universal compatibility</li></ul>',
                    'details' => '<p>Voltmax 85W car charger providing fast charging for mobile devices with multiple USB ports and safety protection features.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-559994?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-748810?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-930236?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-798091?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-372451?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-966050?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Garmin Dash Cam Mini 3',
                    'description' => 'Compact dash cam with high-quality video recording and smart features.',
                    'specifications' => '<ul><li>1080p HD recording</li><li>140° field of view</li><li>Night vision</li><li>G-sensor</li><li>Loop recording</li></ul>',
                    'details' => '<p>Garmin Dash Cam Mini 3 with compact design, 1080p HD recording, and smart features for comprehensive driving protection.</p>',
                    'price' => 199.99,
                    'cover_image' => 'https://images.unsplash.com/photo-561665?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-609023?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-869781?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-506348?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-690109?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-036113?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Reversing Parking Sensor System',
                    'description' => 'Advanced parking sensor system for safe reversing and parking assistance.',
                    'specifications' => '<ul><li>4 ultrasonic sensors</li><li>Audio alerts</li><li>LED display</li><li>Weather resistant</li><li>Easy installation</li></ul>',
                    'details' => '<p>Advanced reversing parking sensor system with 4 ultrasonic sensors providing audio alerts and LED display for safe parking assistance.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'Sensor Count', 'options' => ['4 Sensors', '6 Sensors', '8 Sensors']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-239730?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-922481?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-245659?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-523395?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315598?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-479105?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Backup Rear View Reverse Parking',
                    'description' => 'High-definition backup camera for clear rear view visibility.',
                    'specifications' => '<ul><li>HD resolution</li><li>Night vision</li><li>Waterproof design</li><li>Wide angle view</li><li>Easy installation</li></ul>',
                    'details' => '<p>High-definition backup camera providing clear rear view visibility with night vision and waterproof design for all weather conditions.</p>',
                    'price' => 129.99,
                    'cover_image' => 'https://images.unsplash.com/photo-178226?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-662036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-533909?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-728551?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-478919?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-966088?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => '7 Inch GPS Navigation for Car',
                    'description' => 'Large 7-inch GPS navigation system with real-time traffic updates.',
                    'specifications' => '<ul><li>7-inch touchscreen</li><li>Real-time traffic</li><li>Voice guidance</li><li>Lifetime map updates</li><li>Bluetooth connectivity</li></ul>',
                    'details' => '<p>7-inch GPS navigation system with large touchscreen, real-time traffic updates, voice guidance, and lifetime map updates for convenient navigation.</p>',
                    'price' => 179.99,
                    'cover_image' => 'https://images.unsplash.com/photo-162486?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-340216?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-991327?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871597?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-887734?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-170919?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Dual Knob Car Android Player',
                    'description' => 'Advanced Android car stereo with dual knob control and smart features.',
                    'specifications' => '<ul><li>Android OS</li><li>Dual knob control</li><li>Bluetooth connectivity</li><li>USB/AUX input</li><li>Touchscreen display</li></ul>',
                    'details' => '<p>Advanced Android car stereo with dual knob control, touchscreen display, and comprehensive connectivity options for enhanced driving experience.</p>',
                    'price' => 299.99,
                    'variants' => [
                        ['name' => 'Screen Size', 'options' => ['7 inch', '9 inch', '10 inch']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-852533?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-802444?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-932548?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-948103?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-559983?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-013160?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Wireless Bluetooth Transmitter & Receiver Adapter',
                    'description' => 'Versatile Bluetooth adapter for wireless audio transmission and reception.',
                    'specifications' => '<ul><li>Bluetooth 5.0</li><li>Transmitter & receiver modes</li><li>Long battery life</li><li>3.5mm audio jack</li><li>Low latency</li></ul>',
                    'details' => '<p>Versatile Bluetooth adapter with transmitter and receiver modes, Bluetooth 5.0 technology, and long battery life for wireless audio solutions.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-573663?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-436763?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-170662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-425856?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-923019?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-589985?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'TPMS Tyre Pressure Monitoring System',
                    'description' => 'Advanced tire pressure monitoring system for safety and fuel efficiency.',
                    'specifications' => '<ul><li>Real-time monitoring</li><li>Wireless sensors</li><li>LCD display</li><li>Temperature monitoring</li><li>Easy installation</li></ul>',
                    'details' => '<p>Advanced TPMS system providing real-time tire pressure and temperature monitoring with wireless sensors and LCD display for enhanced safety.</p>',
                    'price' => 159.99,
                    'cover_image' => 'https://images.unsplash.com/photo-009104?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-474499?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-811626?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-668721?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-307683?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-020100?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Handheld Vacuum Cleaner',
                    'description' => 'Portable handheld vacuum cleaner for car interior cleaning.',
                    'specifications' => '<ul><li>Cordless design</li><li>Strong suction power</li><li>Multiple attachments</li><li>Rechargeable battery</li><li>Compact size</li></ul>',
                    'details' => '<p>Portable handheld vacuum cleaner with cordless design, strong suction power, and multiple attachments for thorough car interior cleaning.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-738587?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-478781?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-840560?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-543611?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-829654?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-196264?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Smart Car HUD Speed Display',
                    'description' => 'Head-up display showing speed and driving information on windshield.',
                    'specifications' => '<ul><li>HUD projection</li><li>Speed display</li><li>OBD2 connection</li><li>Auto brightness</li><li>Multiple display modes</li></ul>',
                    'details' => '<p>Smart car HUD displaying speed and driving information directly on windshield with OBD2 connection and automatic brightness adjustment.</p>',
                    'price' => 119.99,
                    'cover_image' => 'https://images.unsplash.com/photo-286477?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-655963?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-795006?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-894869?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-929310?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-497431?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Safety & Security' => [
                [
                    'name' => 'Sentinel X Car Security Alarm',
                    'description' => 'Advanced car security alarm system with remote control and smartphone connectivity.',
                    'specifications' => '<ul><li>Remote control</li><li>Smartphone connectivity</li><li>Shock sensor</li><li>Siren alarm</li><li>LED indicator</li></ul>',
                    'details' => '<p>Sentinel X advanced car security alarm system with remote control, smartphone connectivity, and multiple sensors for comprehensive vehicle protection.</p>',
                    'price' => 199.99,
                    'variants' => [
                        ['name' => 'Range', 'options' => ['500m', '1km', '2km']],
                        ['name' => 'Features', 'options' => ['Basic', 'Premium', 'Pro']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-465111?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-757160?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-621158?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-316557?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220261?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-220903?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Heavy Duty Car Steering Wheel Lock',
                    'description' => 'Heavy-duty steering wheel lock for maximum vehicle security.',
                    'specifications' => '<ul><li>Heavy-duty steel</li><li>Universal fit</li><li>Visible deterrent</li><li>Easy installation</li><li>Anti-theft protection</li></ul>',
                    'details' => '<p>Heavy-duty steering wheel lock made from reinforced steel providing maximum security and visible deterrent against vehicle theft.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-346638?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-382681?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-110397?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-561751?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-090667?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-887373?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Heavy Duty Car Lock Anti Theft Wheel Lock',
                    'description' => 'Heavy-duty wheel lock for comprehensive anti-theft protection.',
                    'specifications' => '<ul><li>Heavy-duty construction</li><li>Wheel clamp design</li><li>Weather resistant</li><li>High-security lock</li><li>Bright yellow color</li></ul>',
                    'details' => '<p>Heavy-duty wheel lock with clamp design providing comprehensive anti-theft protection. Weather-resistant construction with high-security locking mechanism.</p>',
                    'price' => 149.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Small', 'Medium', 'Large']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-915717?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-007353?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-107087?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-490460?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-368509?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-630592?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Fire Extinguisher ABC Dry Powder',
                    'description' => 'ABC dry powder fire extinguisher for comprehensive fire protection.',
                    'specifications' => '<ul><li>ABC dry powder</li><li>Multi-class protection</li><li>Pressure gauge</li><li>Wall bracket included</li><li>Certified safety</li></ul>',
                    'details' => '<p>ABC dry powder fire extinguisher providing multi-class fire protection for vehicles. Includes pressure gauge and wall mounting bracket for easy access.</p>',
                    'price' => 59.99,
                    'cover_image' => 'https://images.unsplash.com/photo-913223?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-771738?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-014582?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-546515?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-945991?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-691814?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Emergency Health Kit',
                    'description' => 'Comprehensive emergency health kit for roadside medical situations.',
                    'specifications' => '<ul><li>Comprehensive supplies</li><li>Compact design</li><li>Emergency medications</li><li>Instruction manual</li><li>Durable case</li></ul>',
                    'details' => '<p>Comprehensive emergency health kit containing essential medical supplies for roadside emergencies. Compact design with durable carrying case.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-778966?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-733395?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-065146?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-358193?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-459530?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-431309?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Waterproof First Aid Kit',
                    'description' => 'Waterproof first aid kit for all-weather emergency preparedness.',
                    'specifications' => '<ul><li>Waterproof case</li><li>Complete first aid supplies</li><li>Organized compartments</li><li>Emergency guide</li><li>Compact size</li></ul>',
                    'details' => '<p>Waterproof first aid kit with complete medical supplies in organized compartments. Includes emergency guide and compact waterproof case for all conditions.</p>',
                    'price' => 69.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Compact', 'Standard', 'Large']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-058378?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-182539?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-568284?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-698253?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-593761?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-551480?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Multipurpose Reflective Triangles Emergency',
                    'description' => 'Reflective emergency triangles for roadside safety and visibility.',
                    'specifications' => '<ul><li>High visibility</li><li>Reflective material</li><li>Foldable design</li><li>Stable base</li><li>Set of 3 triangles</li></ul>',
                    'details' => '<p>Multipurpose reflective emergency triangles providing high visibility for roadside safety. Foldable design with stable base, set of 3 triangles included.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-903094?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-479871?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-917304?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-127002?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-635138?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-973330?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Car Seat Belt Extensions Straps',
                    'description' => 'Adjustable seat belt extension straps for enhanced comfort and safety.',
                    'specifications' => '<ul><li>Adjustable length</li><li>Safety certified</li><li>Universal compatibility</li><li>Durable materials</li><li>Easy installation</li></ul>',
                    'details' => '<p>Adjustable seat belt extension straps providing enhanced comfort and safety. Safety certified with universal compatibility and durable construction.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-235500?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-409840?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-143090?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-018572?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-407828?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-958519?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Galaxy Tyre Air Pump',
                    'description' => 'Portable tire air pump with digital display and auto shut-off.',
                    'specifications' => '<ul><li>Digital display</li><li>Auto shut-off</li><li>Portable design</li><li>12V power</li><li>Multiple attachments</li></ul>',
                    'details' => '<p>Galaxy portable tire air pump with digital display and auto shut-off feature. 12V power operation with multiple attachments for various inflation needs.</p>',
                    'price' => 79.99,
                    'cover_image' => 'https://images.unsplash.com/photo-787538?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-384731?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-775624?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-474864?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-597790?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-655505?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Smart Battery Jump Starter and Tyre Inflator',
                    'description' => 'Multi-function device combining jump starter and tire inflator capabilities.',
                    'specifications' => '<ul><li>Jump starter function</li><li>Tire inflator</li><li>USB charging ports</li><li>LED flashlight</li><li>Safety protection</li></ul>',
                    'details' => '<p>Smart multi-function device combining battery jump starter and tire inflator with USB charging ports, LED flashlight, and comprehensive safety protection.</p>',
                    'price' => 199.99,
                    'cover_image' => 'https://images.unsplash.com/photo-165630?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-503679?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-131720?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-402722?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-636752?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-140652?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Cleaning & Maintenance' => [
                [
                    'name' => 'Foam Car Wash Shampoo',
                    'description' => 'Premium foam car wash shampoo for deep cleaning and shine.',
                    'specifications' => '<ul><li>Rich foam formula</li><li>pH balanced</li><li>Safe for all finishes</li><li>Concentrated formula</li><li>Biodegradable</li></ul>',
                    'details' => '<p>Premium foam car wash shampoo with rich foam formula providing deep cleaning while being safe for all paint finishes. Concentrated and biodegradable.</p>',
                    'price' => 24.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['500ml', '1L', '2L']],
                        ['name' => 'Type', 'options' => ['Regular', 'Wax Enhanced', 'Ceramic Safe']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-141342?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-225576?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-646750?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-605331?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-396036?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-035220?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Microfiber Car Cleaning Cloth',
                    'description' => 'Ultra-soft microfiber cleaning cloth for scratch-free car care.',
                    'specifications' => '<ul><li>Ultra-soft microfiber</li><li>Scratch-free cleaning</li><li>Highly absorbent</li><li>Machine washable</li><li>Lint-free</li></ul>',
                    'details' => '<p>Ultra-soft microfiber cleaning cloth designed for scratch-free car care. Highly absorbent and machine washable for long-lasting use.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-188837?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-259908?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-766349?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-864877?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-191809?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-134362?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cordless Vacuum Cleaner for Car',
                    'description' => 'Powerful cordless vacuum cleaner designed specifically for car interiors.',
                    'specifications' => '<ul><li>Cordless operation</li><li>Strong suction power</li><li>Multiple attachments</li><li>Rechargeable battery</li><li>Compact design</li></ul>',
                    'details' => '<p>Powerful cordless vacuum cleaner with strong suction power and multiple attachments for thorough car interior cleaning. Compact and rechargeable.</p>',
                    'price' => 129.99,
                    'variants' => [
                        ['name' => 'Power', 'options' => ['120W', '150W', '180W']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-729969?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-891760?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-445131?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-029460?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-946662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-560793?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Hybrid Solutions Ceramic Polish & Wax',
                    'description' => 'Advanced ceramic polish and wax for superior protection and shine.',
                    'specifications' => '<ul><li>Ceramic technology</li><li>Long-lasting protection</li><li>High gloss finish</li><li>UV protection</li><li>Easy application</li></ul>',
                    'details' => '<p>Advanced hybrid ceramic polish and wax providing superior protection and high gloss finish. Long-lasting formula with UV protection and easy application.</p>',
                    'price' => 49.99,
                    'cover_image' => 'https://images.unsplash.com/photo-398942?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-321940?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-161512?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-966521?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-120766?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-457892?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Wheel and Tyre Cleaner Concentrate',
                    'description' => 'Concentrated wheel and tire cleaner for deep cleaning and restoration.',
                    'specifications' => '<ul><li>Concentrated formula</li><li>Deep cleaning action</li><li>Safe for all wheels</li><li>Removes brake dust</li><li>Biodegradable</li></ul>',
                    'details' => '<p>Concentrated wheel and tire cleaner with deep cleaning action safe for all wheel types. Effectively removes brake dust and grime while being biodegradable.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-523359?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-395385?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-916751?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-049808?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-282526?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-921508?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Lemongrass Air Freshener for Car',
                    'description' => 'Natural lemongrass air freshener for long-lasting car fragrance.',
                    'specifications' => '<ul><li>Natural lemongrass scent</li><li>Long-lasting fragrance</li><li>Non-toxic formula</li><li>Easy installation</li><li>Adjustable intensity</li></ul>',
                    'details' => '<p>Natural lemongrass air freshener providing long-lasting fragrance with non-toxic formula. Easy installation with adjustable intensity control.</p>',
                    'price' => 14.99,
                    'cover_image' => 'https://images.unsplash.com/photo-439708?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-422879?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-088278?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-228769?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-100300?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-685364?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Essential Car Care Kit',
                    'description' => 'Complete car care kit with essential cleaning and maintenance products.',
                    'specifications' => '<ul><li>Complete care kit</li><li>Multiple products included</li><li>Professional quality</li><li>Storage case</li><li>Instruction guide</li></ul>',
                    'details' => '<p>Complete essential car care kit containing multiple professional-quality cleaning and maintenance products with storage case and instruction guide.</p>',
                    'price' => 89.99,
                    'cover_image' => 'https://images.unsplash.com/photo-974304?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-130782?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-263855?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-278282?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-964136?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-903272?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Vehicle Scratch Repair',
                    'description' => 'Professional scratch repair solution for vehicle paint restoration.',
                    'specifications' => '<ul><li>Professional formula</li><li>Easy application</li><li>Color matching</li><li>Permanent repair</li><li>Clear coat safe</li></ul>',
                    'details' => '<p>Professional vehicle scratch repair solution with easy application and color matching technology for permanent paint restoration. Safe for clear coats.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-674404?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-131037?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-315725?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-958544?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-168906?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558517?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Windshield Washer Fluid Concentrate',
                    'description' => 'Concentrated windshield washer fluid for crystal clear visibility.',
                    'specifications' => '<ul><li>Concentrated formula</li><li>All-season protection</li><li>Streak-free cleaning</li><li>Anti-freeze properties</li><li>Biodegradable</li></ul>',
                    'details' => '<p>Concentrated windshield washer fluid providing all-season protection with streak-free cleaning and anti-freeze properties. Biodegradable formula.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-748380?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-065696?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-948454?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-756691?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-274636?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-003235?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Microfiber Car Cleaning Cloth and Wash Kit',
                    'description' => 'Complete microfiber cleaning cloth and wash kit for comprehensive car care.',
                    'specifications' => '<ul><li>Multiple microfiber cloths</li><li>Wash mitt included</li><li>Different cloth types</li><li>Machine washable</li><li>Storage bag</li></ul>',
                    'details' => '<p>Complete microfiber cleaning cloth and wash kit with multiple cloth types and wash mitt for comprehensive car care. Includes storage bag and machine washable.</p>',
                    'price' => 44.99,
                    'cover_image' => 'https://images.unsplash.com/photo-300452?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-474690?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-327662?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-727704?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-663082?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-357651?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Soft Toys & Plush' => [
                [
                    'name' => 'Teddy Bear Soft Toy Brown Extra-Large',
                    'description' => 'Extra-large brown teddy bear soft toy perfect for cuddling and comfort.',
                    'specifications' => '<ul><li>Extra-large size</li><li>Brown plush material</li><li>Soft and cuddly</li><li>Safe for all ages</li><li>Machine washable</li></ul>',
                    'details' => '<p>Extra-large brown teddy bear made from premium plush material. Perfect companion for children providing comfort and security with machine washable design.</p>',
                    'price' => 89.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Large (36 inch)', 'Extra-Large (48 inch)', 'Giant (60 inch)']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-432840?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-780084?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-681684?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-061490?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-672269?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-997243?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Babique Elephant Sitting Plush Soft Toy',
                    'description' => 'Adorable sitting elephant plush toy with realistic details and soft texture.',
                    'specifications' => '<ul><li>Sitting position design</li><li>Realistic elephant features</li><li>Super soft plush</li><li>Safe materials</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Babique elephant plush toy in sitting position with realistic features and super soft texture. Made from safe materials perfect for children of all ages.</p>',
                    'price' => 45.99,
                    'cover_image' => 'https://images.unsplash.com/photo-405212?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-302366?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-689270?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-911962?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-284922?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-247022?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Brown Cat Soft Toy for Kids',
                    'description' => 'Cute brown cat soft toy with realistic features and cuddly design.',
                    'specifications' => '<ul><li>Realistic cat design</li><li>Brown plush fur</li><li>Soft and cuddly</li><li>Child-safe materials</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Adorable brown cat soft toy with realistic features and cuddly design. Made from child-safe materials with soft plush fur for comfortable play.</p>',
                    'price' => 29.99,
                    'cover_image' => 'https://images.unsplash.com/photo-128129?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-482886?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-190846?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-558070?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-276968?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-431534?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Cute Plush Pillow Stuffed Soft Toy',
                    'description' => 'Multi-functional plush pillow that doubles as a soft toy for comfort.',
                    'specifications' => '<ul><li>Dual-purpose design</li><li>Pillow and toy function</li><li>Ultra-soft material</li><li>Hypoallergenic filling</li><li>Machine washable</li></ul>',
                    'details' => '<p>Cute plush pillow that serves as both a comfortable pillow and adorable soft toy. Ultra-soft material with hypoallergenic filling and machine washable.</p>',
                    'price' => 39.99,
                    'cover_image' => 'https://images.unsplash.com/photo-975672?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-714955?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-195180?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-369665?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-436130?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-524923?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Musical Toy-Plush Teddy Bear',
                    'description' => 'Interactive musical teddy bear that plays soothing melodies and sounds.',
                    'specifications' => '<ul><li>Built-in music box</li><li>Soothing melodies</li><li>Soft plush material</li><li>Battery operated</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Musical plush teddy bear with built-in music box playing soothing melodies. Soft plush material with battery-operated musical features for comfort and entertainment.</p>',
                    'price' => 59.99,
                    'variants' => [
                        ['name' => 'Size', 'options' => ['Large (36 inch)', 'Extra-Large (48 inch)', 'Giant (60 inch)']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-329556?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-381794?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-432740?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-746262?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-036069?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-782285?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Monkey Super Cute Plushie Soft Toys',
                    'description' => 'Super cute monkey plushie with adorable features and soft texture.',
                    'specifications' => '<ul><li>Adorable monkey design</li><li>Super soft plush</li><li>Cute facial features</li><li>Safe for children</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Super cute monkey plushie with adorable features and incredibly soft texture. Safe for children with cute facial features and premium plush material.</p>',
                    'price' => 34.99,
                    'cover_image' => 'https://images.unsplash.com/photo-587540?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-461832?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-337261?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-548604?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-465781?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-595734?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Stuffed Toys for Kids Set of 3 Mini Teddy Toys',
                    'description' => 'Set of 3 mini teddy bear toys perfect for collection and play.',
                    'specifications' => '<ul><li>Set of 3 mini teddies</li><li>Different colors</li><li>Compact size</li><li>Soft plush material</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Adorable set of 3 mini teddy bear toys in different colors. Compact size perfect for collection, travel, and imaginative play with soft plush material.</p>',
                    'price' => 24.99,
                    'cover_image' => 'https://images.unsplash.com/photo-561985?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-151723?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-243619?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-960831?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-634892?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-962060?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Giant Teddy Bears Big Cute Plush Teddy Bear',
                    'description' => 'Giant-sized cute plush teddy bear for ultimate cuddling experience.',
                    'specifications' => '<ul><li>Giant size</li><li>Ultra-soft plush</li><li>Cute design</li><li>Premium quality</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Giant-sized cute plush teddy bear providing the ultimate cuddling experience. Ultra-soft plush material with premium quality construction and adorable design.</p>',
                    'price' => 149.99,
                    'cover_image' => 'https://images.unsplash.com/photo-001944?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-557167?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-787365?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-932838?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-654607?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-651251?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Plush Stuffed Animal Toy',
                    'description' => 'Versatile plush stuffed animal toy available in various animal designs.',
                    'specifications' => '<ul><li>Various animal options</li><li>Soft stuffed design</li><li>High-quality plush</li><li>Safe materials</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Versatile plush stuffed animal toy available in various cute animal designs. High-quality plush material with safe construction for children of all ages.</p>',
                    'price' => 42.99,
                    'cover_image' => 'https://images.unsplash.com/photo-173373?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-705286?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-455158?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-297695?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-685599?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-871843?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Puppets Tommy Glove Puppet',
                    'description' => 'Interactive Tommy glove puppet for storytelling and imaginative play.',
                    'specifications' => '<ul><li>Glove puppet design</li><li>Interactive play</li><li>Soft fabric construction</li><li>Easy to use</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive Tommy glove puppet perfect for storytelling and imaginative play. Soft fabric construction with easy-to-use design for engaging puppet shows.</p>',
                    'price' => 19.99,
                    'cover_image' => 'https://images.unsplash.com/photo-956566?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-655194?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-631369?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-111207?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-414057?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-529443?w=800&h=800&fit=crop&crop=center'
                ]
            ],
            'Educational Toys' => [
                [
                    'name' => 'Sterling Learning Blocks Multicolor',
                    'description' => 'Colorful learning blocks for building, stacking, and educational play.',
                    'specifications' => '<ul><li>Multicolor design</li><li>Safe plastic material</li><li>Various shapes and sizes</li><li>Educational letters and numbers</li><li>Ages 2+ years</li></ul>',
                    'details' => '<p>Sterling learning blocks in vibrant multicolors designed for building, stacking, and educational play. Features letters and numbers for early learning development.</p>',
                    'price' => 34.99,
                    'variants' => [
                        ['name' => 'Set Size', 'options' => ['50 pieces', '100 pieces', '150 pieces']]
                    ],
                    'cover_image' => 'https://images.unsplash.com/photo-224418?w=800&h=800&fit=crop&crop=center',
                    'images' => 'https://images.unsplash.com/photo-652827?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-813780?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-822609?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-550099?w=800&h=800&fit=crop&crop=center,https://images.unsplash.com/photo-419987?w=800&h=800&fit=crop&crop=center'
                ],
                [
                    'name' => 'Plastic Alphabet Number Puzzle Toy',
                    'description' => 'Interactive plastic puzzle featuring alphabet letters and numbers for learning.',
                    'specifications' => '<ul><li>Alphabet and number pieces</li><li>Durable plastic construction</li><li>Bright colors</li><li>Easy-grip pieces</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive plastic puzzle toy combining alphabet letters and numbers for comprehensive early learning. Durable construction with bright colors and easy-grip pieces.</p>',
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