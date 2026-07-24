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
        $stores = Store::whereIn('theme', ['gadgets', 'fashion', 'home-decor', 'bakery', 'supermarket', 'car-accessories', 'toy'])->get();

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
        $prefix = match($store->theme) {
            'gadgets' => 'TV',
            'fashion' => 'TT',
            'home-decor' => 'CC',
            'bakery' => 'SD',
            'supermarket' => 'DE',
            'car-accessories' => 'AE',
            'toy-store' => 'WT',
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
                    'cover_image' => '/storage/media/6/collection.png',
                    'images' => '/storage/media/11/1.png,/storage/media/10/2.png,/storage/media/9/3.png,/storage/media/8/4.png,/storage/media/7/5.png'
                ],
                [
                    'name' => 'iPhone 14 - Sheath Screen Protector with Applicator Tray',
                    'description' => 'Tempered glass screen protector with easy installation tray for bubble-free application.',
                    'specifications' => '<ul><li>9H tempered glass</li><li>Bubble-free installation</li><li>Applicator tray included</li><li>99% transparency</li><li>Oleophobic coating</li></ul>',
                    'details' => '<p>Premium tempered glass screen protector with innovative applicator tray for perfect, bubble-free installation every time.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/12/collection.png',
                    'images' => '/storage/media/17/1.png,/storage/media/16/2.png,/storage/media/15/3.png,/storage/media/14/4.png,/storage/media/13/5.png'
                ],
                [
                    'name' => 'Luxcell B12 10,000mAh 12W Power Bank',
                    'description' => 'High-capacity portable power bank with fast charging and multiple device support.',
                    'specifications' => '<ul><li>10,000mAh capacity</li><li>12W fast charging</li><li>Dual USB outputs</li><li>LED power indicator</li><li>Compact design</li></ul>',
                    'details' => '<p>Keep your devices powered with this high-capacity power bank featuring fast charging technology and support for multiple devices simultaneously.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => '/storage/media/18/collection.png',
                    'images' => '/storage/media/23/1.png,/storage/media/22/2.png,/storage/media/21/3.png,/storage/media/20/4.png,/storage/media/19/5.png'
                ],
                [
                    'name' => 'Adjustable & Foldable Desktop Phone Holder Stand',
                    'description' => 'Ergonomic phone stand with adjustable angles for comfortable viewing and video calls.',
                    'specifications' => '<ul><li>Adjustable viewing angles</li><li>Foldable design</li><li>Non-slip base</li><li>Universal compatibility</li><li>Aluminum construction</li></ul>',
                    'details' => '<p>Ergonomic phone stand designed for comfortable viewing, video calls, and hands-free use with adjustable angles and stable aluminum construction.</p>',
                    'price' => 16.99,
                    'cover_image' => '/storage/media/24/collection.png',
                    'images' => '/storage/media/29/1.png,/storage/media/28/2.png,/storage/media/27/3.png,/storage/media/26/4.png,/storage/media/25/5.png'
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
                    'cover_image' => '/storage/media/30/collection.png',
                    'images' => '/storage/media/35/1.png,/storage/media/34/2.png,/storage/media/33/3.png,/storage/media/32/4.png,/storage/media/31/5.png'
                ],
                [
                    'name' => 'boat Flexcharge 360 3-in-1 Wireless Charger',
                    'description' => 'Multi-device wireless charging station for phone, earbuds, and smartwatch.',
                    'specifications' => '<ul><li>3-in-1 charging station</li><li>15W fast wireless charging</li><li>360-degree rotation</li><li>LED charging indicators</li><li>Universal compatibility</li></ul>',
                    'details' => '<p>Convenient 3-in-1 wireless charging station that can simultaneously charge your phone, earbuds, and smartwatch with fast 15W charging.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => '/storage/media/36/collection.png',
                    'images' => '/storage/media/41/1.png,/storage/media/40/2.png,/storage/media/39/3.png,/storage/media/38/4.png,/storage/media/37/5.png'
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
                    'cover_image' => '/storage/media/42/collection.png',
                    'images' => '/storage/media/47/1.png,/storage/media/46/2.png,/storage/media/45/3.png,/storage/media/44/4.png,/storage/media/43/5.png'
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
                    'cover_image' => '/storage/media/48/collection.png',
                    'images' => '/storage/media/53/1.png,/storage/media/52/2.png,/storage/media/51/3.png,/storage/media/50/4.png,/storage/media/49/5.png'
                ]
            ],
            'Audio Devices' => [
                [
                    'name' => 'Mi Dual Driver Wired Earphones',
                    'description' => 'Premium wired earphones with dual drivers for superior sound quality and comfort.',
                    'specifications' => '<ul><li>Dual driver technology</li><li>Superior sound quality</li><li>Comfortable fit</li><li>Tangle-free cable</li><li>In-line microphone</li></ul>',
                    'details' => '<p>Experience exceptional audio quality with Mi Dual Driver Wired Earphones featuring advanced dual driver technology for crisp highs and deep bass.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/54/collection.png',
                    'images' => '/storage/media/59/1.png,/storage/media/58/2.png,/storage/media/57/3.png,/storage/media/56/4.png,/storage/media/55/5.png'
                ],
                [
                    'name' => 'boAt Airdopes 138 Pro',
                    'description' => 'True wireless earbuds with active noise cancellation and long battery life.',
                    'specifications' => '<ul><li>True wireless design</li><li>Active noise cancellation</li><li>32-hour total playback</li><li>IPX4 water resistance</li><li>Touch controls</li></ul>',
                    'details' => '<p>boAt Airdopes 138 Pro delivers premium wireless audio experience with ANC technology and extended battery life for all-day listening.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => '/storage/media/60/collection.png',
                    'images' => '/storage/media/65/1.png,/storage/media/64/2.png,/storage/media/63/3.png,/storage/media/62/4.png,/storage/media/61/5.png'
                ],
                [
                    'name' => 'JBL Tune 520BT Wireless On Ear Headphones',
                    'description' => 'Wireless on-ear headphones with JBL Pure Bass sound and long battery life.',
                    'specifications' => '<ul><li>JBL Pure Bass sound</li><li>57-hour battery life</li><li>Wireless Bluetooth 5.3</li><li>Lightweight design</li><li>Multi-point connection</li></ul>',
                    'details' => '<p>JBL Tune 520BT headphones deliver legendary JBL Pure Bass sound with incredible 57-hour battery life and comfortable on-ear design.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/66/collection.png',
                    'images' => '/storage/media/71/1.png,/storage/media/70/2.png,/storage/media/69/3.png,/storage/media/68/4.png,/storage/media/67/5.png'
                ],
                [
                    'name' => 'Pro Bass Bluetooth Neckband',
                    'description' => 'Wireless neckband earphones with enhanced bass and magnetic earbuds.',
                    'specifications' => '<ul><li>Enhanced bass response</li><li>Magnetic earbuds</li><li>15-hour battery life</li><li>IPX5 sweat resistance</li><li>Quick charge support</li></ul>',
                    'details' => '<p>Pro Bass Bluetooth Neckband offers powerful bass response and convenient magnetic earbuds with all-day battery life for active lifestyles.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/72/collection.png',
                    'images' => '/storage/media/77/1.png,/storage/media/76/2.png,/storage/media/75/3.png,/storage/media/74/4.png,/storage/media/73/5.png'
                ],
                [
                    'name' => '10W Bluetooth Soundbar Speaker',
                    'description' => 'Compact Bluetooth soundbar with 10W output for enhanced TV and music audio.',
                    'specifications' => '<ul><li>10W total output</li><li>Bluetooth 5.0 connectivity</li><li>Multiple input options</li><li>Compact design</li><li>Remote control included</li></ul>',
                    'details' => '<p>Enhance your TV and music experience with this compact 10W Bluetooth soundbar featuring multiple connectivity options and clear audio output.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => '/storage/media/78/collection.png',
                    'images' => '/storage/media/83/1.png,/storage/media/82/2.png,/storage/media/81/3.png,/storage/media/80/4.png,/storage/media/79/5.png'
                ],
                [
                    'name' => 'Zebronics Juke Bar 10000 Soundbar',
                    'description' => 'Premium soundbar with powerful audio output and multiple connectivity options.',
                    'specifications' => '<ul><li>Powerful audio output</li><li>Multiple connectivity</li><li>LED display</li><li>Remote control</li><li>Wall mountable</li></ul>',
                    'details' => '<p>Zebronics Juke Bar 10000 delivers premium sound quality with powerful drivers and versatile connectivity for the ultimate home audio experience.</p>',
                    'price' => 129.99,
                    'cover_image' => '/storage/media/84/collection.png',
                    'images' => '/storage/media/89/1.png,/storage/media/88/2.png,/storage/media/87/3.png,/storage/media/86/4.png,/storage/media/85/5.png'
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
                    'cover_image' => '/storage/media/90/collection.png',
                    'images' => '/storage/media/95/1.png,/storage/media/94/2.png,/storage/media/93/3.png,/storage/media/92/4.png,/storage/media/91/5.png'
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
                    'cover_image' => '/storage/media/96/collection.png',
                    'images' => '/storage/media/101/1.png,/storage/media/100/2.png,/storage/media/99/3.png,/storage/media/98/4.png,/storage/media/97/5.png'
                ]
            ],
            'Wearable Tech' => [
                [
                    'name' => 'Noise Halo 2 - Limited Edition',
                    'description' => 'Premium limited edition smartwatch with advanced health monitoring and sleek design.',
                    'specifications' => '<ul><li>Limited edition design</li><li>Advanced health monitoring</li><li>7-day battery life</li><li>Water resistant IP68</li><li>Multiple sport modes</li></ul>',
                    'details' => '<p>Noise Halo 2 Limited Edition combines premium aesthetics with cutting-edge health technology for the ultimate smartwatch experience.</p>',
                    'price' => 149.99,
                    'cover_image' => '/storage/media/150/collection.png',
                    'images' => '/storage/media/155/1.png,/storage/media/154/2.png,/storage/media/153/3.png,/storage/media/152/4.png,/storage/media/151/5.png'
                ],
                [
                    'name' => 'Samsung Galaxy Fit E Smart Band',
                    'description' => 'Lightweight fitness tracker with heart rate monitoring and sleep tracking.',
                    'specifications' => '<ul><li>Heart rate monitoring</li><li>Sleep tracking</li><li>Water resistant 5ATM</li><li>Up to 1 week battery</li><li>Lightweight design</li></ul>',
                    'details' => '<p>Samsung Galaxy Fit E offers essential fitness tracking features in a comfortable, lightweight design perfect for everyday wear.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => '/storage/media/156/collection.png',
                    'images' => '/storage/media/161/1.png,/storage/media/160/2.png,/storage/media/159/3.png,/storage/media/158/4.png,/storage/media/157/5.png'
                ],
                [
                    'name' => 'Women\'s Smart Ring NFC Control Heart Rate',
                    'description' => 'Elegant smart ring with NFC control, heart rate monitoring, and health tracking.',
                    'specifications' => '<ul><li>NFC control functionality</li><li>Heart rate monitoring</li><li>Health tracking sensors</li><li>Elegant design</li><li>Waterproof construction</li></ul>',
                    'details' => '<p>Revolutionary smart ring designed for women, combining elegant aesthetics with advanced health monitoring and NFC control capabilities.</p>',
                    'price' => 199.99,
                    'cover_image' => '/storage/media/162/collection.png',
                    'images' => '/storage/media/167/1.png,/storage/media/166/2.png,/storage/media/165/3.png,/storage/media/164/4.png,/storage/media/163/5.png'
                ],
                [
                    'name' => 'Pebble Newly Launched Qore Fitness Band',
                    'description' => 'Advanced fitness band with comprehensive health monitoring and long battery life.',
                    'specifications' => '<ul><li>Comprehensive health monitoring</li><li>15-day battery life</li><li>SpO2 monitoring</li><li>Multiple workout modes</li><li>Water resistant IP67</li></ul>',
                    'details' => '<p>Pebble Qore Fitness Band delivers comprehensive health insights with extended battery life and advanced monitoring capabilities for active lifestyles.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/168/collection.png',
                    'images' => '/storage/media/173/1.png,/storage/media/172/2.png,/storage/media/171/3.png,/storage/media/170/4.png,/storage/media/169/5.png'
                ],
                [
                    'name' => 'Noise Champ 2 Smartwatch',
                    'description' => 'Feature-rich smartwatch with Bluetooth calling and health monitoring.',
                    'specifications' => '<ul><li>Bluetooth calling</li><li>Health monitoring suite</li><li>1.39-inch AMOLED display</li><li>7-day battery life</li><li>100+ watch faces</li></ul>',
                    'details' => '<p>Noise Champ 2 Smartwatch offers premium features including Bluetooth calling and comprehensive health monitoring in a stylish package.</p>',
                    'price' => 129.99,
                    'sale_price' => 109.99,
                    'cover_image' => '/storage/media/174/collection.png',
                    'images' => '/storage/media/179/1.png,/storage/media/178/2.png,/storage/media/177/3.png,/storage/media/176/4.png,/storage/media/175/5.png'
                ],
                [
                    'name' => 'Apple Vision Pro',
                    'description' => 'Revolutionary spatial computer with advanced mixed reality capabilities.',
                    'specifications' => '<ul><li>Spatial computing</li><li>Mixed reality experience</li><li>Eye tracking technology</li><li>Hand gesture control</li><li>Ultra-high resolution displays</li></ul>',
                    'details' => '<p>Apple Vision Pro represents the future of computing with groundbreaking spatial technology and immersive mixed reality experiences.</p>',
                    'price' => 3499.99,
                    'cover_image' => '/storage/media/180/collection.png',
                    'images' => '/storage/media/185/1.png,/storage/media/184/2.png,/storage/media/183/3.png,/storage/media/182/4.png,/storage/media/181/5.png'
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
                    'cover_image' => '/storage/media/186/collection.png',
                    'images' => '/storage/media/191/1.png,/storage/media/190/2.png,/storage/media/189/3.png,/storage/media/188/4.png,/storage/media/187/5.png'
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
                    'cover_image' => '/storage/media/192/collection.png',
                    'images' => '/storage/media/197/1.png,/storage/media/196/2.png,/storage/media/195/3.png,/storage/media/194/4.png,/storage/media/193/5.png'
                ]
            ],
            'Power & Charging' => [
                [
                    'name' => 'Samsung 10000 mAh Power Bank',
                    'description' => 'High-capacity portable power bank with fast charging and multiple device support.',
                    'specifications' => '<ul><li>10000 mAh capacity</li><li>Fast charging support</li><li>Dual USB outputs</li><li>LED power indicator</li><li>Compact design</li></ul>',
                    'details' => '<p>Samsung 10000 mAh Power Bank provides reliable portable charging with fast charging technology and support for multiple devices simultaneously.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/102/collection.png',
                    'images' => '/storage/media/107/1.png,/storage/media/106/2.png,/storage/media/105/3.png,/storage/media/104/4.png,/storage/media/103/5.png'
                ],
                [
                    'name' => 'Noise Power Series Gan 30W GaN Charger',
                    'description' => 'Compact GaN charger with 30W fast charging for smartphones and tablets.',
                    'specifications' => '<ul><li>30W GaN technology</li><li>Compact design</li><li>Fast charging support</li><li>Universal compatibility</li><li>Overcharge protection</li></ul>',
                    'details' => '<p>Noise Power Series GaN 30W charger delivers efficient fast charging in a compact form factor using advanced GaN technology.</p>',
                    'price' => 29.99,
                    'sale_price' => 24.99,
                    'cover_image' => '/storage/media/108/collection.png',
                    'images' => '/storage/media/113/1.png,/storage/media/112/2.png,/storage/media/111/3.png,/storage/media/110/4.png,/storage/media/109/5.png'
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
                    'cover_image' => '/storage/media/114/collection.png',
                    'images' => '/storage/media/119/1.png,/storage/media/118/2.png,/storage/media/117/3.png,/storage/media/116/4.png,/storage/media/115/5.png'
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
                    'cover_image' => '/storage/media/120/collection.png',
                    'images' => '/storage/media/125/1.png,/storage/media/124/2.png,/storage/media/123/3.png,/storage/media/122/4.png,/storage/media/121/5.png'
                ],
                [
                    'name' => 'POP 67W Triple Port GaN5 Adapter',
                    'description' => 'High-power GaN5 adapter with three ports for simultaneous device charging.',
                    'specifications' => '<ul><li>67W total output</li><li>GaN5 technology</li><li>Triple port design</li><li>USB-C and USB-A ports</li><li>Compact form factor</li></ul>',
                    'details' => '<p>POP 67W Triple Port GaN5 Adapter delivers powerful charging for multiple devices simultaneously using advanced GaN5 technology.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => '/storage/media/126/collection.png',
                    'images' => '/storage/media/131/1.png,/storage/media/130/2.png,/storage/media/129/3.png,/storage/media/128/4.png,/storage/media/127/5.png'
                ],
                [
                    'name' => 'Car Power 30 Dual Output Fast Car Charger',
                    'description' => 'Dual-port car charger with 30W fast charging for on-the-go power.',
                    'specifications' => '<ul><li>30W fast charging</li><li>Dual USB outputs</li><li>LED power indicator</li><li>Universal compatibility</li><li>Compact design</li></ul>',
                    'details' => '<p>Car Power 30 provides reliable fast charging for two devices simultaneously while driving, with universal compatibility and safety features.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/132/collection.png',
                    'images' => '/storage/media/137/1.png,/storage/media/136/2.png,/storage/media/135/3.png,/storage/media/134/4.png,/storage/media/133/5.png'
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
                    'cover_image' => '/storage/media/138/collection.png',
                    'images' => '/storage/media/143/1.png,/storage/media/142/2.png,/storage/media/141/3.png,/storage/media/140/4.png,/storage/media/139/5.png'
                ],
                [
                    'name' => '67W Ultra Fast Type-C Charger',
                    'description' => 'Ultra-fast 67W USB-C charger for laptops, tablets, and smartphones.',
                    'specifications' => '<ul><li>67W ultra-fast charging</li><li>USB-C PD support</li><li>Universal compatibility</li><li>Compact design</li><li>Safety certifications</li></ul>',
                    'details' => '<p>67W Ultra Fast Type-C Charger delivers maximum charging speed for USB-C devices including laptops, tablets, and smartphones with safety certifications.</p>',
                    'price' => 39.99,
                    'sale_price' => 34.99,
                    'cover_image' => '/storage/media/144/collection.png',
                    'images' => '/storage/media/149/1.png,/storage/media/148/2.png,/storage/media/147/3.png,/storage/media/146/4.png,/storage/media/145/5.png'
                ]
            ],
            'Computer Accessories' => [
                [
                    'name' => 'ZEBRONICS Charm Rechargeable Wireless Mouse',
                    'description' => 'Ergonomic rechargeable wireless mouse with precision tracking and long battery life.',
                    'specifications' => '<ul><li>Rechargeable battery</li><li>Wireless connectivity</li><li>Ergonomic design</li><li>Precision optical sensor</li><li>USB-C charging</li></ul>',
                    'details' => '<p>ZEBRONICS Charm wireless mouse offers comfortable ergonomic design with rechargeable battery and precise optical tracking for productivity and gaming.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/198/collection.png',
                    'images' => '/storage/media/203/1.png,/storage/media/202/2.png,/storage/media/201/3.png,/storage/media/200/4.png,/storage/media/199/5.png'
                ],
                [
                    'name' => 'Wired Keyboard Water-Resistant Silent Typing',
                    'description' => 'Water-resistant wired keyboard with silent keys for comfortable typing experience.',
                    'specifications' => '<ul><li>Water-resistant design</li><li>Silent key switches</li><li>Full-size layout</li><li>Durable construction</li><li>USB connectivity</li></ul>',
                    'details' => '<p>Professional wired keyboard featuring water-resistant design and silent key switches for comfortable and quiet typing in any environment.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'cover_image' => '/storage/media/204/collection.png',
                    'images' => '/storage/media/209/1.png,/storage/media/208/2.png,/storage/media/207/3.png,/storage/media/206/4.png,/storage/media/205/5.png'
                ],
                [
                    'name' => 'Wireless Keyboard and Mouse Combo',
                    'description' => 'Complete wireless keyboard and mouse combo set for desktop productivity.',
                    'specifications' => '<ul><li>Wireless keyboard and mouse</li><li>2.4GHz connectivity</li><li>Long battery life</li><li>Compact design</li><li>USB receiver included</li></ul>',
                    'details' => '<p>Complete wireless combo set featuring full-size keyboard and optical mouse with reliable 2.4GHz connectivity and extended battery life.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/215/collection.png',
                    'images' => '/storage/media/210/1.png,/storage/media/211/2.png,/storage/media/212/3.png,/storage/media/213/4.png,/storage/media/214/5.png'
                ],
                [
                    'name' => 'Premium Adjustable Laptop Stand',
                    'description' => 'Ergonomic adjustable laptop stand with multiple height and angle settings.',
                    'specifications' => '<ul><li>Multiple height settings</li><li>Adjustable viewing angles</li><li>Aluminum construction</li><li>Heat dissipation design</li><li>Portable and foldable</li></ul>',
                    'details' => '<p>Premium aluminum laptop stand with multiple adjustment options for ergonomic positioning and improved airflow for better laptop cooling.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/221/collection.png',
                    'images' => '/storage/media/216/1.png,/storage/media/217/2.png,/storage/media/218/3.png,/storage/media/219/4.png,/storage/media/220/5.png'
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
                    'cover_image' => '/storage/media/222/collection.png',
                    'images' => '/storage/media/227/1.png,/storage/media/226/2.png,/storage/media/225/3.png,/storage/media/224/4.png,/storage/media/223/5.png'
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
                    'cover_image' => '/storage/media/228/collection.png',
                    'images' => '/storage/media/233/1.png,/storage/media/232/2.png,/storage/media/231/3.png,/storage/media/230/4.png,/storage/media/229/5.png'
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
                    'cover_image' => '/storage/media/234/collection.png',
                    'images' => '/storage/media/239/1.png,/storage/media/238/2.png,/storage/media/237/3.png,/storage/media/236/4.png,/storage/media/235/5.png'
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
                    'cover_image' => '/storage/media/240/collection.png',
                    'images' => '/storage/media/245/1.png,/storage/media/244/2.png,/storage/media/243/3.png,/storage/media/242/4.png,/storage/media/241/5.png'
                ]
            ],
            'Men\'s Fashion' => [
                [
                    'name' => 'H&M Men\'s Regular Fit T-shirt',
                    'description' => 'Comfortable regular fit t-shirt made from soft cotton blend fabric.',
                    'specifications' => '<ul><li>100% Cotton</li><li>Regular fit</li><li>Crew neck</li><li>Short sleeves</li><li>Machine washable</li></ul>',
                    'details' => '<p>Classic regular fit t-shirt perfect for everyday wear. Made from soft cotton blend for comfort and durability.</p>',
                    'price' => 12.99,
                    'cover_image' => '/storage/media/251/collection.png',
                    'images' => '/storage/media/256/1.png,/storage/media/255/2.png,/storage/media/254/3.png,/storage/media/253/4.png,/storage/media/252/5.png'
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
                    'cover_image' => '/storage/media/257/collection.png',
                    'images' => '/storage/media/262/1.png,/storage/media/261/2.png,/storage/media/260/3.png,/storage/media/259/4.png,/storage/media/258/5.png'
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
                    'cover_image' => '/storage/media/263/collection.png',
                    'images' => '/storage/media/268/1.png,/storage/media/267/2.png,/storage/media/266/3.png,/storage/media/265/4.png,/storage/media/264/5.png'
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
                    'cover_image' => '/storage/media/269/collection.png',
                    'images' => '/storage/media/274/1.png,/storage/media/273/2.png,/storage/media/272/3.png,/storage/media/271/4.png,/storage/media/270/5.png'
                ],
                [
                    'name' => 'Lymio Jackets | Jacket for men',
                    'description' => 'Stylish casual jacket with modern design and comfortable fit.',
                    'specifications' => '<ul><li>Polyester outer shell</li><li>Zip closure</li><li>Side pockets</li><li>Regular fit</li><li>Water resistant</li></ul>',
                    'details' => '<p>Modern casual jacket perfect for layering. Water-resistant fabric with comfortable fit for everyday wear.</p>',
                    'price' => 59.99,
                    'sale_price' => 49.99,
                    'cover_image' => '/storage/media/275/collection.png',
                    'images' => '/storage/media/280/1.png,/storage/media/279/2.png,/storage/media/278/3.png,/storage/media/277/4.png,/storage/media/276/5.png'
                ],
                [
                    'name' => 'Nobero Oversized Hoodie',
                    'description' => 'Comfortable oversized hoodie with soft fleece lining and modern style.',
                    'specifications' => '<ul><li>Cotton-polyester blend</li><li>Oversized fit</li><li>Fleece lining</li><li>Kangaroo pocket</li><li>Adjustable hood</li></ul>',
                    'details' => '<p>Trendy oversized hoodie with soft fleece lining for maximum comfort. Perfect for casual wear and streetwear style.</p>',
                    'price' => 44.99,
                    'cover_image' => '/storage/media/281/collection.png',
                    'images' => '/storage/media/286/1.png,/storage/media/285/2.png,/storage/media/284/3.png,/storage/media/283/4.png,/storage/media/282/5.png'
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
                    'cover_image' => '/storage/media/287/collection.png',
                    'images' => '/storage/media/292/1.png,/storage/media/291/2.png,/storage/media/290/3.png,/storage/media/289/4.png,/storage/media/288/5.png'
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
                    'cover_image' => '/storage/media/293/collection.png',
                    'images' => '/storage/media/298/1.png,/storage/media/297/2.png,/storage/media/296/3.png,/storage/media/295/4.png,/storage/media/294/5.png'
                ]
            ],
            'Women\'s Fashion' => [
                [
                    'name' => 'Pure Cotton Smocked Mexi Dress',
                    'description' => 'Comfortable pure cotton dress with smocked detailing and Mexican-inspired design.',
                    'specifications' => '<ul><li>100% Pure cotton</li><li>Smocked bodice</li><li>Mexican-inspired print</li><li>Midi length</li><li>Machine washable</li></ul>',
                    'details' => '<p>Beautiful pure cotton dress featuring traditional smocked detailing and vibrant Mexican-inspired patterns. Perfect for casual and semi-formal occasions.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/299/collection.png',
                    'images' => '/storage/media/304/1.png,/storage/media/303/2.png,/storage/media/302/3.png,/storage/media/301/4.png,/storage/media/300/5.png'
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
                    'cover_image' => '/storage/media/305/collection.png',
                    'images' => '/storage/media/310/1.png,/storage/media/309/2.png,/storage/media/308/3.png,/storage/media/307/4.png,/storage/media/306/5.png'
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
                    'cover_image' => '/storage/media/311/collection.png',
                    'images' => '/storage/media/316/1.png,/storage/media/315/2.png,/storage/media/314/3.png,/storage/media/313/4.png,/storage/media/312/5.png'
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
                    'cover_image' => '/storage/media/317/collection.png',
                    'images' => '/storage/media/322/1.png,/storage/media/321/2.png,/storage/media/320/3.png,/storage/media/319/4.png,/storage/media/318/5.png'
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
                    'cover_image' => '/storage/media/323/collection.png',
                    'images' => '/storage/media/328/1.png,/storage/media/327/2.png,/storage/media/326/3.png,/storage/media/325/4.png,/storage/media/324/5.png'
                ],
                [
                    'name' => 'Clarice Pleated Shoulder Bag',
                    'description' => 'Stylish shoulder bag with pleated design and premium quality materials.',
                    'specifications' => '<ul><li>Premium synthetic leather</li><li>Pleated design</li><li>Adjustable shoulder strap</li><li>Multiple compartments</li><li>Magnetic closure</li></ul>',
                    'details' => '<p>Elegant shoulder bag featuring sophisticated pleated design. Multiple compartments and adjustable strap make it perfect for daily use.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => '/storage/media/329/collection.png',
                    'images' => '/storage/media/334/1.png,/storage/media/333/2.png,/storage/media/332/3.png,/storage/media/331/4.png,/storage/media/330/5.png'
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
                    'cover_image' => '/storage/media/335/collection.png',
                    'images' => '/storage/media/340/1.png,/storage/media/339/2.png,/storage/media/338/3.png,/storage/media/337/4.png,/storage/media/336/5.png'
                ],
                [
                    'name' => 'Elowen Vine Lab-Grown Diamond Pendant',
                    'description' => 'Elegant pendant featuring lab-grown diamonds in vine-inspired design.',
                    'specifications' => '<ul><li>Lab-grown diamonds</li><li>Sterling silver chain</li><li>Vine-inspired design</li><li>Hypoallergenic</li><li>Gift box included</li></ul>',
                    'details' => '<p>Exquisite pendant featuring ethically sourced lab-grown diamonds in a beautiful vine-inspired design. Perfect for special occasions and everyday elegance.</p>',
                    'price' => 199.99,
                    'sale_price' => 179.99,
                    'cover_image' => '/storage/media/341/collection.png',
                    'images' => '/storage/media/346/1.png,/storage/media/345/2.png,/storage/media/344/3.png,/storage/media/343/4.png,/storage/media/342/5.png'
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
                    'cover_image' => '/storage/media/347/collection.png',
                    'images' => '/storage/media/352/1.png,/storage/media/351/2.png,/storage/media/350/3.png,/storage/media/349/4.png,/storage/media/348/5.png'
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
                    'cover_image' => '/storage/media/353/collection.png',
                    'images' => '/storage/media/358/1.png,/storage/media/357/2.png,/storage/media/356/3.png,/storage/media/355/4.png,/storage/media/354/5.png'
                ],
                [
                    'name' => 'Kid\'s Running Shorts',
                    'description' => 'Lightweight running shorts designed for active kids with moisture-wicking fabric.',
                    'specifications' => '<ul><li>Moisture-wicking fabric</li><li>Lightweight design</li><li>Elastic waistband</li><li>Side pockets</li><li>Quick-dry material</li></ul>',
                    'details' => '<p>Perfect running shorts for active kids featuring moisture-wicking fabric and lightweight design. Elastic waistband and side pockets provide comfort and functionality.</p>',
                    'price' => 16.99,
                    'cover_image' => '/storage/media/359/collection.png',
                    'images' => '/storage/media/364/1.png,/storage/media/363/2.png,/storage/media/362/3.png,/storage/media/361/4.png,/storage/media/360/5.png'
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
                    'cover_image' => '/storage/media/365/collection.png',
                    'images' => '/storage/media/370/1.png,/storage/media/369/2.png,/storage/media/368/3.png,/storage/media/367/4.png,/storage/media/366/5.png'
                ],
                [
                    'name' => 'Kid\'s Official Characters Sweatshirt',
                    'description' => 'Cozy sweatshirt featuring popular cartoon characters, perfect for casual wear.',
                    'specifications' => '<ul><li>Cotton blend fabric</li><li>Official character designs</li><li>Pullover style</li><li>Ribbed cuffs and hem</li><li>Machine washable</li></ul>',
                    'details' => '<p>Fun and cozy sweatshirt featuring official cartoon characters that kids love. Made from soft cotton blend with ribbed cuffs for comfort and durability.</p>',
                    'price' => 28.99,
                    'cover_image' => '/storage/media/371/collection.png',
                    'images' => '/storage/media/376/1.png,/storage/media/375/2.png,/storage/media/374/3.png,/storage/media/373/4.png,/storage/media/372/5.png'
                ],
                [
                    'name' => 'Toddler/Preschoolers Backpack for Kids',
                    'description' => 'Colorful and functional backpack designed specifically for toddlers and preschoolers.',
                    'specifications' => '<ul><li>Toddler-friendly size</li><li>Padded shoulder straps</li><li>Multiple compartments</li><li>Water-resistant material</li><li>Fun cartoon designs</li></ul>',
                    'details' => '<p>Perfect backpack for toddlers and preschoolers with age-appropriate size and fun designs. Features padded straps and multiple compartments for organization.</p>',
                    'price' => 22.99,
                    'cover_image' => '/storage/media/377/collection.png',
                    'images' => '/storage/media/382/1.png,/storage/media/381/2.png,/storage/media/380/3.png,/storage/media/379/4.png,/storage/media/378/5.png'
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
                    'cover_image' => '/storage/media/383/collection.png',
                    'images' => '/storage/media/388/1.png,/storage/media/387/2.png,/storage/media/386/3.png,/storage/media/385/4.png,/storage/media/384/5.png'
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
                    'cover_image' => '/storage/media/389/collection.png',
                    'images' => '/storage/media/394/1.png,/storage/media/393/2.png,/storage/media/392/3.png,/storage/media/391/4.png,/storage/media/390/5.png'
                ]
            ],
            'Footwear' => [
                [
                    'name' => 'Nike Men\'s Court Vision Low Next Nature Sneakers',
                    'description' => 'Classic Nike sneakers with sustainable materials and timeless basketball-inspired design.',
                    'specifications' => '<ul><li>Sustainable materials</li><li>Basketball-inspired design</li><li>Rubber outsole</li><li>Padded collar</li><li>Lace-up closure</li></ul>',
                    'details' => '<p>Nike Court Vision Low Next Nature sneakers combine classic basketball style with sustainable materials. Perfect for everyday wear with comfort and iconic Nike design.</p>',
                    'price' => 89.99,
                    'cover_image' => '/storage/media/395/collection.png',
                    'images' => '/storage/media/400/1.png,/storage/media/399/2.png,/storage/media/398/3.png,/storage/media/397/4.png,/storage/media/396/5.png'
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
                    'cover_image' => '/storage/media/401/collection.png',
                    'images' => '/storage/media/406/1.png,/storage/media/405/2.png,/storage/media/404/3.png,/storage/media/403/4.png,/storage/media/402/5.png'
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
                    'cover_image' => '/storage/media/407/collection.png',
                    'images' => '/storage/media/412/1.png,/storage/media/411/2.png,/storage/media/410/3.png,/storage/media/409/4.png,/storage/media/408/5.png'
                ],
                [
                    'name' => 'Beige Casual Women Sandals',
                    'description' => 'Stylish beige sandals perfect for casual summer wear and everyday comfort.',
                    'specifications' => '<ul><li>Beige color design</li><li>Adjustable straps</li><li>Cushioned sole</li><li>Casual style</li><li>Comfortable fit</li></ul>',
                    'details' => '<p>Comfortable beige sandals designed for casual wear. Features adjustable straps and cushioned sole for all-day comfort during summer activities.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/413/collection.png',
                    'images' => '/storage/media/418/1.png,/storage/media/417/2.png,/storage/media/416/3.png,/storage/media/415/4.png,/storage/media/414/5.png'
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
                    'cover_image' => '/storage/media/419/collection.png',
                    'images' => '/storage/media/424/1.png,/storage/media/423/2.png,/storage/media/422/3.png,/storage/media/421/4.png,/storage/media/420/5.png'
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
                    'cover_image' => '/storage/media/425/collection.png',
                    'images' => '/storage/media/430/1.png,/storage/media/429/2.png,/storage/media/428/3.png,/storage/media/427/4.png,/storage/media/426/5.png'
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
                    'cover_image' => '/storage/media/431/collection.png',
                    'images' => '/storage/media/436/1.png,/storage/media/435/2.png,/storage/media/434/3.png,/storage/media/433/4.png,/storage/media/432/5.png'
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
                    'cover_image' => '/storage/media/437/collection.png',
                    'images' => '/storage/media/442/1.png,/storage/media/441/2.png,/storage/media/440/3.png,/storage/media/439/4.png,/storage/media/438/5.png'
                ]
            ],
            'Accessories' => [
                [
                    'name' => 'Tissot PRX Men Watch',
                    'description' => 'Premium Swiss-made Tissot PRX watch with stainless steel construction and precision movement.',
                    'specifications' => '<ul><li>Swiss quartz movement</li><li>Stainless steel case</li><li>Sapphire crystal glass</li><li>Water resistant 100m</li><li>Integrated bracelet</li></ul>',
                    'details' => '<p>The iconic Tissot PRX combines retro aesthetics with modern Swiss precision. Features integrated bracelet design and premium materials for sophisticated timekeeping.</p>',
                    'price' => 349.99,
                    'cover_image' => '/storage/media/443/collection.png',
                    'images' => '/storage/media/448/1.png,/storage/media/447/2.png,/storage/media/446/3.png,/storage/media/445/4.png,/storage/media/444/5.png'
                ],
                [
                    'name' => 'IFLASH Octagonal Polarized Sunglasses',
                    'description' => 'Stylish octagonal sunglasses with polarized lenses and UV protection.',
                    'specifications' => '<ul><li>Polarized lenses</li><li>UV400 protection</li><li>Octagonal frame design</li><li>Lightweight construction</li><li>Anti-glare coating</li></ul>',
                    'details' => '<p>IFLASH octagonal sunglasses offer unique geometric styling with superior polarized lenses for optimal eye protection and visual clarity.</p>',
                    'price' => 79.99,
                    'sale_price' => 64.99,
                    'cover_image' => '/storage/media/449/collection.png',
                    'images' => '/storage/media/454/1.png,/storage/media/453/2.png,/storage/media/452/3.png,/storage/media/451/4.png,/storage/media/450/5.png'
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
                    'cover_image' => '/storage/media/455/collection.png',
                    'images' => '/storage/media/460/1.png,/storage/media/459/2.png,/storage/media/458/3.png,/storage/media/457/4.png,/storage/media/456/5.png'
                ],
                [
                    'name' => 'Storite Compact Leather Wallet',
                    'description' => 'Compact genuine leather wallet with multiple card slots and bill compartment.',
                    'specifications' => '<ul><li>Genuine leather construction</li><li>Multiple card slots</li><li>Bill compartment</li><li>Compact design</li><li>RFID blocking technology</li></ul>',
                    'details' => '<p>Storite compact leather wallet combines functionality with style. Features RFID blocking technology and organized compartments in a sleek, compact design.</p>',
                    'price' => 49.99,
                    'sale_price' => 39.99,
                    'cover_image' => '/storage/media/461/collection.png',
                    'images' => '/storage/media/466/1.png,/storage/media/465/2.png,/storage/media/464/3.png,/storage/media/463/4.png,/storage/media/462/5.png'
                ],
                [
                    'name' => 'Casual Cap for Women',
                    'description' => 'Stylish casual cap designed for women with adjustable fit and comfortable wear.',
                    'specifications' => '<ul><li>Cotton blend fabric</li><li>Adjustable back strap</li><li>Curved brim design</li><li>Breathable material</li><li>One size fits most</li></ul>',
                    'details' => '<p>Fashionable casual cap perfect for everyday wear. Features comfortable cotton blend fabric and adjustable fit for all-day comfort and style.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/467/collection.png',
                    'images' => '/storage/media/472/1.png,/storage/media/471/2.png,/storage/media/470/3.png,/storage/media/469/4.png,/storage/media/468/5.png'
                ],
                [
                    'name' => 'Cotton Scarf for Women',
                    'description' => 'Soft cotton scarf with elegant patterns, perfect for all seasons.',
                    'specifications' => '<ul><li>100% Cotton material</li><li>Lightweight design</li><li>Elegant patterns</li><li>Versatile styling</li><li>Machine washable</li></ul>',
                    'details' => '<p>Beautiful cotton scarf featuring elegant patterns and soft texture. Perfect for adding style to any outfit while providing comfort in all seasons.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/473/collection.png',
                    'images' => '/storage/media/478/1.png,/storage/media/477/2.png,/storage/media/476/3.png,/storage/media/475/4.png,/storage/media/474/5.png'
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
                    'cover_image' => '/storage/media/479/collection.png',
                    'images' => '/storage/media/484/1.png,/storage/media/483/2.png,/storage/media/482/3.png,/storage/media/481/4.png,/storage/media/480/5.png'
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
                    'cover_image' => '/storage/media/485/collection.png',
                    'images' => '/storage/media/490/1.png,/storage/media/489/2.png,/storage/media/488/3.png,/storage/media/487/4.png,/storage/media/486/5.png'
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
                    'cover_image' => '/storage/media/693/collection.png',
                    'images' => '/storage/media/688/1.png,/storage/media/689/2.png,/storage/media/690/3.png,/storage/media/691/4.png,/storage/media/692/5.png'
                ],
                [
                    'name' => 'Divine Krishna Canvas Painting',
                    'description' => 'Spiritual Krishna canvas painting with vibrant colors and divine imagery.',
                    'specifications' => '<ul><li>Canvas material</li><li>Vibrant colors</li><li>Spiritual artwork</li><li>Wooden frame</li><li>UV protected</li></ul>',
                    'details' => '<p>Beautiful Divine Krishna canvas painting featuring traditional spiritual art with vibrant colors and premium quality materials.</p>',
                    'price' => 129.99,
                    'sale_price' => 109.99,
                    'cover_image' => '/storage/media/694/collection.png',
                    'images' => '/storage/media/699/1.png,/storage/media/698/2.png,/storage/media/697/3.png,/storage/media/696/4.png,/storage/media/695/5.png'
                ],
                [
                    'name' => 'FNP Playful Anime Hanging Photo Frame',
                    'description' => 'Cute anime-themed hanging photo frame perfect for displaying memories.',
                    'specifications' => '<ul><li>Anime design</li><li>Hanging style</li><li>Multiple photo slots</li><li>Durable material</li><li>Easy to hang</li></ul>',
                    'details' => '<p>Adorable FNP Playful Anime hanging photo frame with cute designs perfect for displaying your favorite memories in style.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/700/collection.png',
                    'images' => '/storage/media/705/1.png,/storage/media/704/2.png,/storage/media/703/3.png,/storage/media/702/4.png,/storage/media/701/5.png'
                ],
                [
                    'name' => 'Nautica Modern Wall Clock',
                    'description' => 'Sleek modern wall clock with nautical design elements.',
                    'specifications' => '<ul><li>Modern design</li><li>Nautical theme</li><li>Silent movement</li><li>Easy to read</li><li>Battery operated</li></ul>',
                    'details' => '<p>Stylish Nautica Modern wall clock combining contemporary design with nautical elements for a sophisticated look.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => '/storage/media/706/collection.png',
                    'images' => '/storage/media/711/1.png,/storage/media/710/2.png,/storage/media/709/3.png,/storage/media/708/4.png,/storage/media/707/5.png'
                ],
                [
                    'name' => 'Plantex Frameless Mirror',
                    'description' => 'Contemporary frameless mirror perfect for modern interiors.',
                    'specifications' => '<ul><li>Frameless design</li><li>High-quality glass</li><li>Easy installation</li><li>Modern style</li><li>Beveled edges</li></ul>',
                    'details' => '<p>Elegant Plantex frameless mirror with beveled edges and high-quality glass, perfect for creating a modern and spacious feel.</p>',
                    'price' => 149.99,
                    'cover_image' => '/storage/media/712/collection.png',
                    'images' => '/storage/media/717/1.png,/storage/media/716/2.png,/storage/media/715/3.png,/storage/media/714/4.png,/storage/media/713/5.png'
                ],
                [
                    'name' => 'Sheesham Solid Wood Floating Shelf',
                    'description' => 'Premium sheesham wood floating shelf for stylish storage and display.',
                    'specifications' => '<ul><li>Solid sheesham wood</li><li>Floating design</li><li>Hidden brackets</li><li>Natural finish</li><li>Easy installation</li></ul>',
                    'details' => '<p>Beautiful Sheesham solid wood floating shelf with natural finish and hidden brackets for a clean, modern look.</p>',
                    'price' => 89.99,
                    'cover_image' => '/storage/media/718/collection.png',
                    'images' => '/storage/media/723/1.png,/storage/media/722/2.png,/storage/media/721/3.png,/storage/media/720/4.png,/storage/media/719/5.png'
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
                    'cover_image' => '/storage/media/724/collection.png',
                    'images' => '/storage/media/729/1.png,/storage/media/728/2.png,/storage/media/727/3.png,/storage/media/726/4.png,/storage/media/725/5.png'
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
                    'cover_image' => '/storage/media/730/collection.png',
                    'images' => '/storage/media/735/1.png,/storage/media/734/2.png,/storage/media/733/3.png,/storage/media/732/4.png,/storage/media/731/5.png'
                ]
            ],
            'Lighting & Lamps' => [
                [
                    'name' => 'Cumberland Beige Shade Table Lamp',
                    'description' => 'Elegant table lamp with beige fabric shade and classic design.',
                    'specifications' => '<ul><li>Beige fabric shade</li><li>Classic design</li><li>Metal base</li><li>E27 bulb socket</li><li>Easy assembly</li></ul>',
                    'details' => '<p>Beautiful Cumberland table lamp with beige shade that provides warm, ambient lighting perfect for reading and relaxation.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/501/collection.png',
                    'images' => '/storage/media/496/1.png,/storage/media/497/2.png,/storage/media/498/3.png,/storage/media/499/4.png,/storage/media/500/5.png'
                ],
                [
                    'name' => 'Tripod Floor Lamp With Metal Base',
                    'description' => 'Modern tripod floor lamp with adjustable metal base and stylish design.',
                    'specifications' => '<ul><li>Tripod metal base</li><li>Adjustable height</li><li>Modern design</li><li>Fabric shade</li><li>Stable construction</li></ul>',
                    'details' => '<p>Contemporary tripod floor lamp with metal base offering adjustable height and modern styling for any living space.</p>',
                    'price' => 149.99,
                    'sale_price' => 129.99,
                    'cover_image' => '/storage/media/507/collection.png',
                    'images' => '/storage/media/502/1.png,/storage/media/503/2.png,/storage/media/504/3.png,/storage/media/505/4.png,/storage/media/506/5.png'
                ],
                [
                    'name' => 'Bedside Golden Wall Light Lamp with Glass Shade',
                    'description' => 'Elegant bedside wall light with golden finish and glass shade.',
                    'specifications' => '<ul><li>Golden finish</li><li>Glass shade</li><li>Wall mounted</li><li>Bedside design</li><li>Easy installation</li></ul>',
                    'details' => '<p>Sophisticated bedside wall light with golden finish and glass shade, perfect for creating ambient lighting in bedrooms.</p>',
                    'price' => 89.99,
                    'cover_image' => '/storage/media/513/collection.png',
                    'images' => '/storage/media/508/1.png,/storage/media/509/2.png,/storage/media/510/3.png,/storage/media/511/4.png,/storage/media/512/5.png'
                ],
                [
                    'name' => 'Lights Cluster Chandelier Pendant Light',
                    'description' => 'Modern cluster chandelier with multiple pendant lights for dramatic effect.',
                    'specifications' => '<ul><li>Cluster design</li><li>Multiple pendants</li><li>Modern style</li><li>Adjustable height</li><li>Statement piece</li></ul>',
                    'details' => '<p>Stunning cluster chandelier featuring multiple pendant lights that create a dramatic focal point for dining rooms and living spaces.</p>',
                    'price' => 299.99,
                    'sale_price' => 259.99,
                    'cover_image' => '/storage/media/519/collection.png',
                    'images' => '/storage/media/514/1.png,/storage/media/515/2.png,/storage/media/516/3.png,/storage/media/517/4.png,/storage/media/518/5.png'
                ],
                [
                    'name' => 'White Glass Ceiling Flush Mount',
                    'description' => 'Clean white glass ceiling flush mount light for modern interiors.',
                    'specifications' => '<ul><li>White glass shade</li><li>Flush mount design</li><li>Modern style</li><li>Easy installation</li><li>Energy efficient</li></ul>',
                    'details' => '<p>Sleek white glass ceiling flush mount providing clean, even lighting perfect for modern homes and low ceiling spaces.</p>',
                    'price' => 69.99,
                    'cover_image' => '/storage/media/525/collection.png',
                    'images' => '/storage/media/520/1.png,/storage/media/521/2.png,/storage/media/522/3.png,/storage/media/523/4.png,/storage/media/524/5.png'
                ],
                [
                    'name' => '4 Watts E27 Holder LED Bulb',
                    'description' => 'Energy-efficient 4W LED bulb with E27 base for standard fixtures.',
                    'specifications' => '<ul><li>4 watts power</li><li>E27 base</li><li>LED technology</li><li>Energy efficient</li><li>Long lifespan</li></ul>',
                    'details' => '<p>High-quality 4W LED bulb with E27 base offering energy efficiency and long lifespan for all your lighting needs.</p>',
                    'price' => 12.99,
                    'sale_price' => 9.99,
                    'cover_image' => '/storage/media/531/collection.png',
                    'images' => '/storage/media/526/1.png,/storage/media/527/2.png,/storage/media/528/3.png,/storage/media/529/4.png,/storage/media/530/5.png'
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
                    'cover_image' => '/storage/media/537/collection.png',
                    'images' => '/storage/media/532/1.png,/storage/media/533/2.png,/storage/media/534/3.png,/storage/media/535/4.png,/storage/media/536/5.png'
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
                    'cover_image' => '/storage/media/543/collection.png',
                    'images' => '/storage/media/538/1.png,/storage/media/539/2.png,/storage/media/540/3.png,/storage/media/541/4.png,/storage/media/542/5.png'
                ]
            ],
            'Home Furnishings' => [
                [
                    'name' => 'Microfiber Soft Cushion',
                    'description' => 'Ultra-soft microfiber cushion with premium filling for maximum comfort.',
                    'specifications' => '<ul><li>Microfiber fabric</li><li>Premium filling</li><li>Ultra-soft texture</li><li>Machine washable</li><li>Hypoallergenic</li></ul>',
                    'details' => '<p>Luxurious microfiber soft cushion designed for ultimate comfort with premium filling and hypoallergenic properties.</p>',
                    'price' => 29.99,
                    'cover_image' => '/storage/media/549/collection.png',
                    'images' => '/storage/media/544/1.png,/storage/media/545/2.png,/storage/media/546/3.png,/storage/media/547/4.png,/storage/media/548/5.png'
                ],
                [
                    'name' => 'Cotton Throw Bedcover Super Soft & Breathable',
                    'description' => 'Premium cotton throw bedcover that is super soft and breathable for year-round comfort.',
                    'specifications' => '<ul><li>100% cotton material</li><li>Super soft texture</li><li>Breathable fabric</li><li>Machine washable</li><li>Lightweight design</li></ul>',
                    'details' => '<p>Beautiful cotton throw bedcover offering superior softness and breathability, perfect for layering and comfort in any season.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => '/storage/media/555/collection.png',
                    'images' => '/storage/media/550/1.png,/storage/media/551/2.png,/storage/media/552/3.png,/storage/media/553/4.png,/storage/media/554/5.png'
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
                    'cover_image' => '/storage/media/561/collection.png',
                    'images' => '/storage/media/556/1.png,/storage/media/557/2.png,/storage/media/558/3.png,/storage/media/559/4.png,/storage/media/560/5.png'
                ],
                [
                    'name' => 'home Premium Modern Runner Rug',
                    'description' => 'Premium modern runner rug with contemporary design for hallways and entryways.',
                    'specifications' => '<ul><li>Modern design</li><li>Premium quality</li><li>Non-slip backing</li><li>Easy to clean</li><li>Durable construction</li></ul>',
                    'details' => '<p>Stylish premium modern runner rug featuring contemporary patterns, perfect for adding elegance to hallways and high-traffic areas.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'cover_image' => '/storage/media/567/collection.png',
                    'images' => '/storage/media/562/1.png,/storage/media/563/2.png,/storage/media/564/3.png,/storage/media/565/4.png,/storage/media/566/5.png'
                ],
                [
                    'name' => '100% Cotton Solid King Size Quilted Bed Cover',
                    'description' => 'Premium 100% cotton quilted bed cover in king size with solid color design.',
                    'specifications' => '<ul><li>100% cotton fabric</li><li>King size</li><li>Quilted design</li><li>Solid color</li><li>Machine washable</li></ul>',
                    'details' => '<p>Luxurious 100% cotton quilted bed cover in king size featuring solid colors and premium quilting for comfort and style.</p>',
                    'price' => 129.99,
                    'cover_image' => '/storage/media/573/collection.png',
                    'images' => '/storage/media/568/1.png,/storage/media/569/2.png,/storage/media/570/3.png,/storage/media/571/4.png,/storage/media/572/5.png'
                ],
                [
                    'name' => 'Super Soft Anti-Skid Super Absorbent Mats',
                    'description' => 'Ultra-soft anti-skid mats with superior absorbent properties for bathroom and kitchen use.',
                    'specifications' => '<ul><li>Super soft texture</li><li>Anti-skid backing</li><li>Super absorbent</li><li>Quick dry</li><li>Machine washable</li></ul>',
                    'details' => '<p>Premium super soft mats with anti-skid backing and superior absorbent properties, perfect for bathrooms and kitchen areas.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => '/storage/media/579/collection.png',
                    'images' => '/storage/media/574/1.png,/storage/media/575/2.png,/storage/media/576/3.png,/storage/media/577/4.png,/storage/media/578/5.png'
                ],
                [
                    'name' => 'Rose Printed Center Table Cover',
                    'description' => 'Beautiful rose printed center table cover for elegant dining and living room decor.',
                    'specifications' => '<ul><li>Rose print design</li><li>Premium fabric</li><li>Center table size</li><li>Easy to clean</li><li>Decorative border</li></ul>',
                    'details' => '<p>Elegant rose printed center table cover featuring beautiful floral patterns and decorative borders for sophisticated table styling.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/585/collection.png',
                    'images' => '/storage/media/580/1.png,/storage/media/581/2.png,/storage/media/582/3.png,/storage/media/583/4.png,/storage/media/584/5.png'
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
                    'cover_image' => '/storage/media/591/collection.png',
                    'images' => '/storage/media/586/1.png,/storage/media/587/2.png,/storage/media/588/3.png,/storage/media/589/4.png,/storage/media/590/5.png'
                ]
            ],
            'Decorative Accents' => [
                [
                    'name' => 'Skyblue Hand-Glazed Ceramic Vase',
                    'description' => 'Beautiful sky blue hand-glazed ceramic vase with artistic finish and elegant design.',
                    'specifications' => '<ul><li>Hand-glazed ceramic</li><li>Sky blue color</li><li>Artistic finish</li><li>Elegant design</li><li>Waterproof interior</li></ul>',
                    'details' => '<p>Stunning sky blue hand-glazed ceramic vase featuring artistic craftsmanship and elegant design, perfect for fresh or dried flowers.</p>',
                    'price' => 89.99,
                    'cover_image' => '/storage/media/597/collection.png',
                    'images' => '/storage/media/592/1.png,/storage/media/593/2.png,/storage/media/594/3.png,/storage/media/595/4.png,/storage/media/596/5.png'
                ],
                [
                    'name' => 'Decorative Ceramic Showpiece',
                    'description' => 'Elegant decorative ceramic showpiece with intricate details for home decoration.',
                    'specifications' => '<ul><li>Premium ceramic</li><li>Intricate details</li><li>Decorative design</li><li>Handcrafted quality</li><li>Durable finish</li></ul>',
                    'details' => '<p>Beautiful decorative ceramic showpiece featuring intricate craftsmanship and elegant design, perfect for enhancing any living space.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'cover_image' => '/storage/media/603/collection.png',
                    'images' => '/storage/media/598/1.png,/storage/media/599/2.png,/storage/media/600/3.png,/storage/media/601/4.png,/storage/media/602/5.png'
                ],
                [
                    'name' => 'Elegant Resin Girl Figurine with Apple',
                    'description' => 'Charming resin figurine of a girl with apple, perfect for home decoration and gifting.',
                    'specifications' => '<ul><li>High-quality resin</li><li>Girl with apple design</li><li>Elegant finish</li><li>Detailed craftsmanship</li><li>Perfect gift item</li></ul>',
                    'details' => '<p>Charming elegant resin figurine featuring a girl with apple, showcasing detailed craftsmanship and perfect for home decor or as a thoughtful gift.</p>',
                    'price' => 45.99,
                    'cover_image' => '/storage/media/609/collection.png',
                    'images' => '/storage/media/604/1.png,/storage/media/605/2.png,/storage/media/606/3.png,/storage/media/607/4.png,/storage/media/608/5.png'
                ],
                [
                    'name' => 'Home Centre Claire Unscented Pillar Candle',
                    'description' => 'Premium unscented pillar candle from Home Centre Claire collection for elegant ambiance.',
                    'specifications' => '<ul><li>Unscented formula</li><li>Pillar design</li><li>Long burning time</li><li>Premium wax</li><li>Elegant appearance</li></ul>',
                    'details' => '<p>Premium Home Centre Claire unscented pillar candle offering long burning time and elegant ambiance without overpowering fragrances.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => '/storage/media/615/collection.png',
                    'images' => '/storage/media/610/1.png,/storage/media/611/2.png,/storage/media/612/3.png,/storage/media/613/4.png,/storage/media/614/5.png'
                ],
                [
                    'name' => 'Decorative Fancy Candle Holder',
                    'description' => 'Ornate decorative candle holder with fancy design for elegant candle display.',
                    'specifications' => '<ul><li>Fancy decorative design</li><li>Premium materials</li><li>Stable base</li><li>Elegant finish</li><li>Universal candle fit</li></ul>',
                    'details' => '<p>Beautiful decorative fancy candle holder featuring ornate design and premium materials, perfect for creating elegant candle displays.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/621/collection.png',
                    'images' => '/storage/media/616/1.png,/storage/media/617/2.png,/storage/media/618/3.png,/storage/media/619/4.png,/storage/media/620/5.png'
                ],
                [
                    'name' => 'Wooden Square Tray with Inlay Work',
                    'description' => 'Handcrafted wooden square tray featuring beautiful inlay work and traditional craftsmanship.',
                    'specifications' => '<ul><li>Solid wood construction</li><li>Inlay work design</li><li>Square shape</li><li>Handcrafted quality</li><li>Smooth finish</li></ul>',
                    'details' => '<p>Exquisite handcrafted wooden square tray with beautiful inlay work, showcasing traditional craftsmanship and perfect for serving or decoration.</p>',
                    'price' => 79.99,
                    'sale_price' => 69.99,
                    'cover_image' => '/storage/media/627/collection.png',
                    'images' => '/storage/media/622/1.png,/storage/media/623/2.png,/storage/media/624/3.png,/storage/media/625/4.png,/storage/media/626/5.png'
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
                    'cover_image' => '/storage/media/633/collection.png',
                    'images' => '/storage/media/628/1.png,/storage/media/629/2.png,/storage/media/630/3.png,/storage/media/631/4.png,/storage/media/632/5.png'
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
                    'cover_image' => '/storage/media/639/collection.png',
                    'images' => '/storage/media/634/1.png,/storage/media/635/2.png,/storage/media/636/3.png,/storage/media/637/4.png,/storage/media/638/5.png'
                ]
            ],
            'Storage & Organizers' => [
                [
                    'name' => 'Homestrap Storage Boxes',
                    'description' => 'Versatile storage boxes from Homestrap for organizing household items efficiently.',
                    'specifications' => '<ul><li>Durable construction</li><li>Stackable design</li><li>Easy access lid</li><li>Multiple sizes</li><li>Space-saving</li></ul>',
                    'details' => '<p>Practical Homestrap storage boxes designed for efficient organization with stackable design and durable construction for long-lasting use.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/645/collection.png',
                    'images' => '/storage/media/640/1.png,/storage/media/641/2.png,/storage/media/642/3.png,/storage/media/643/4.png,/storage/media/644/5.png'
                ],
                [
                    'name' => 'Storage Boxes and Drawers',
                    'description' => 'Complete storage solution with boxes and drawers for comprehensive organization.',
                    'specifications' => '<ul><li>Combined box and drawer system</li><li>Modular design</li><li>Easy assembly</li><li>Smooth sliding drawers</li><li>Versatile storage</li></ul>',
                    'details' => '<p>Comprehensive storage solution combining boxes and drawers in a modular system for maximum organization flexibility and space utilization.</p>',
                    'price' => 89.99,
                    'sale_price' => 79.99,
                    'cover_image' => '/storage/media/651/collection.png',
                    'images' => '/storage/media/646/1.png,/storage/media/647/2.png,/storage/media/648/3.png,/storage/media/649/4.png,/storage/media/650/5.png'
                ],
                [
                    'name' => 'Metal Storage Shelf',
                    'description' => 'Heavy-duty metal storage shelf with multiple tiers for industrial-strength organization.',
                    'specifications' => '<ul><li>Heavy-duty metal construction</li><li>Multiple tiers</li><li>Adjustable shelves</li><li>High weight capacity</li><li>Easy assembly</li></ul>',
                    'details' => '<p>Robust metal storage shelf featuring heavy-duty construction and adjustable shelves, perfect for garage, warehouse, or heavy-duty storage needs.</p>',
                    'price' => 149.99,
                    'cover_image' => '/storage/media/657/collection.png',
                    'images' => '/storage/media/652/1.png,/storage/media/653/2.png,/storage/media/654/3.png,/storage/media/655/4.png,/storage/media/656/5.png'
                ],
                [
                    'name' => 'Flyngo Foldable Drawer Organizer',
                    'description' => 'Innovative foldable drawer organizer from Flyngo for flexible storage solutions.',
                    'specifications' => '<ul><li>Foldable design</li><li>Drawer organization</li><li>Flexible compartments</li><li>Space-efficient</li><li>Easy storage when not in use</li></ul>',
                    'details' => '<p>Smart Flyngo foldable drawer organizer offering flexible compartments and space-efficient design that folds flat when not needed.</p>',
                    'price' => 24.99,
                    'sale_price' => 19.99,
                    'cover_image' => '/storage/media/663/collection.png',
                    'images' => '/storage/media/658/1.png,/storage/media/659/2.png,/storage/media/660/3.png,/storage/media/661/4.png,/storage/media/662/5.png'
                ],
                [
                    'name' => 'Heavy Duty Garage Storage Hooks for Wall',
                    'description' => 'Industrial-strength wall-mounted storage hooks designed for heavy-duty garage organization.',
                    'specifications' => '<ul><li>Heavy-duty construction</li><li>Wall-mounted design</li><li>High weight capacity</li><li>Garage suitable</li><li>Easy installation</li></ul>',
                    'details' => '<p>Professional heavy-duty garage storage hooks designed for wall mounting with high weight capacity for tools, equipment, and heavy items.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/669/collection.png',
                    'images' => '/storage/media/664/1.png,/storage/media/665/2.png,/storage/media/666/3.png,/storage/media/667/4.png,/storage/media/668/5.png'
                ],
                [
                    'name' => '4-Tier Multipurpose Storage Rack',
                    'description' => 'Versatile 4-tier storage rack suitable for multiple purposes and various room settings.',
                    'specifications' => '<ul><li>4-tier design</li><li>Multipurpose use</li><li>Sturdy construction</li><li>Easy assembly</li><li>Versatile placement</li></ul>',
                    'details' => '<p>Practical 4-tier multipurpose storage rack offering versatile storage solutions for kitchen, bathroom, office, or any room requiring organized storage.</p>',
                    'price' => 69.99,
                    'sale_price' => 59.99,
                    'cover_image' => '/storage/media/675/collection.png',
                    'images' => '/storage/media/670/1.png,/storage/media/671/2.png,/storage/media/672/3.png,/storage/media/673/4.png,/storage/media/674/5.png'
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
                    'cover_image' => '/storage/media/681/collection.png',
                    'images' => '/storage/media/676/1.png,/storage/media/677/2.png,/storage/media/678/3.png,/storage/media/679/4.png,/storage/media/680/5.png'
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
                    'cover_image' => '/storage/media/687/collection.png',
                    'images' => '/storage/media/682/1.png,/storage/media/683/2.png,/storage/media/684/3.png,/storage/media/685/4.png,/storage/media/686/5.png'
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
                    'cover_image' => '/storage/media/746/collection.png',
                    'images' => '/storage/media/741/1.png,/storage/media/742/2.png,/storage/media/743/3.png,/storage/media/744/4.png,/storage/media/745/5.png'
                ],
                [
                    'name' => 'Strawberry Wedding Cake',
                    'description' => 'Elegant multi-tier wedding cake with fresh strawberries and cream.',
                    'specifications' => '<ul><li>Multi-tier design</li><li>Fresh strawberries</li><li>Whipped cream layers</li><li>Wedding decoration</li><li>Serves 50-60 people</li></ul>',
                    'details' => '<p>Stunning strawberry wedding cake with multiple tiers, fresh strawberries, and elegant decorations perfect for your special wedding day.</p>',
                    'price' => 299.99,
                    'sale_price' => 279.99,
                    'cover_image' => '/storage/media/752/collection.png',
                    'images' => '/storage/media/747/1.png,/storage/media/748/2.png,/storage/media/749/3.png,/storage/media/750/4.png,/storage/media/751/5.png'
                ],
                [
                    'name' => 'Yummy Premium Chocolate Cake',
                    'description' => 'Rich and decadent premium chocolate cake with multiple chocolate layers.',
                    'specifications' => '<ul><li>Premium chocolate</li><li>Multiple layers</li><li>Rich chocolate ganache</li><li>Moist sponge</li><li>Chocolate shavings</li></ul>',
                    'details' => '<p>Indulgent Yummy Premium chocolate cake featuring rich chocolate layers, smooth ganache, and premium cocoa for the ultimate chocolate experience.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/758/collection.png',
                    'images' => '/storage/media/753/1.png,/storage/media/754/2.png,/storage/media/755/3.png,/storage/media/756/4.png,/storage/media/757/5.png'
                ],
                [
                    'name' => 'Just Bake Mixed Fruit Gateaux Half KG',
                    'description' => 'Delicious mixed fruit gateaux cake with seasonal fruits and cream layers.',
                    'specifications' => '<ul><li>Mixed seasonal fruits</li><li>Cream layers</li><li>Half KG size</li><li>Fresh fruit topping</li><li>Light sponge base</li></ul>',
                    'details' => '<p>Fresh and fruity Just Bake mixed fruit gateaux featuring seasonal fruits, light cream layers, and a soft sponge base in convenient half KG size.</p>',
                    'price' => 24.99,
                    'sale_price' => 21.99,
                    'cover_image' => '/storage/media/764/collection.png',
                    'images' => '/storage/media/759/1.png,/storage/media/760/2.png,/storage/media/761/3.png,/storage/media/762/4.png,/storage/media/763/5.png'
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
                    'cover_image' => '/storage/media/770/collection.png',
                    'images' => '/storage/media/765/1.png,/storage/media/766/2.png,/storage/media/767/3.png,/storage/media/768/4.png,/storage/media/769/5.png'
                ],
                [
                    'name' => 'FNP Designer Eggless Half KG',
                    'description' => 'Designer eggless cake from FNP with artistic decorations and premium ingredients.',
                    'specifications' => '<ul><li>Eggless recipe</li><li>Designer decorations</li><li>Half KG size</li><li>Premium ingredients</li><li>Artistic design</li></ul>',
                    'details' => '<p>Beautiful FNP Designer eggless cake featuring artistic decorations and premium eggless recipe, perfect for those preferring egg-free desserts.</p>',
                    'price' => 34.99,
                    'sale_price' => 29.99,
                    'cover_image' => '/storage/media/775/collection.png',
                    'images' => '/storage/media/771/1.png,/storage/media/772/2.png,/storage/media/773/3.png,/storage/media/776/4.png,/storage/media/774/5.png'
                ],
                [
                    'name' => '6 Pcs Cupcake Folding Box',
                    'description' => 'Set of 6 assorted cupcakes presented in an elegant folding gift box.',
                    'specifications' => '<ul><li>6 assorted cupcakes</li><li>Folding gift box</li><li>Mixed flavors</li><li>Individual decoration</li><li>Perfect for gifting</li></ul>',
                    'details' => '<p>Delightful set of 6 cupcakes with assorted flavors and decorations, beautifully presented in an elegant folding box perfect for gifts and parties.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/782/collection.png',
                    'images' => '/storage/media/777/1.png,/storage/media/778/2.png,/storage/media/779/3.png,/storage/media/780/4.png,/storage/media/781/5.png'
                ],
                [
                    'name' => 'Pearl & Rose Cake 7.0 Kg',
                    'description' => 'Grand pearl and rose themed cake weighing 7.0 kg, perfect for large celebrations.',
                    'specifications' => '<ul><li>7.0 Kg weight</li><li>Pearl decorations</li><li>Rose theme design</li><li>Large celebration size</li><li>Serves 70-80 people</li></ul>',
                    'details' => '<p>Magnificent Pearl & Rose cake weighing 7.0 kg, featuring elegant pearl decorations and rose themes, perfect for grand celebrations and large gatherings.</p>',
                    'price' => 399.99,
                    'sale_price' => 369.99,
                    'cover_image' => '/storage/media/788/collection.png',
                    'images' => '/storage/media/783/1.png,/storage/media/784/2.png,/storage/media/785/3.png,/storage/media/786/4.png,/storage/media/787/5.png'
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
                    'cover_image' => '/storage/media/794/collection.png',
                    'images' => '/storage/media/789/1.png,/storage/media/790/2.png,/storage/media/791/3.png,/storage/media/792/4.png,/storage/media/793/5.png'
                ],
                [
                    'name' => 'Fresh Fruit Pastries Topped',
                    'description' => 'Light pastries topped with fresh seasonal fruits and cream.',
                    'specifications' => '<ul><li>Fresh seasonal fruits</li><li>Light pastry base</li><li>Cream topping</li><li>Colorful presentation</li><li>Natural flavors</li></ul>',
                    'details' => '<p>Beautiful fresh fruit pastries featuring seasonal fruits on light pastry base with cream topping for a refreshing and colorful treat.</p>',
                    'price' => 16.99,
                    'sale_price' => 14.99,
                    'cover_image' => '/storage/media/800/collection.png',
                    'images' => '/storage/media/795/1.png,/storage/media/796/2.png,/storage/media/797/3.png,/storage/media/798/4.png,/storage/media/799/5.png'
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
                    'cover_image' => '/storage/media/806/collection.png',
                    'images' => '/storage/media/801/1.png,/storage/media/802/2.png,/storage/media/803/3.png,/storage/media/804/4.png,/storage/media/805/5.png'
                ],
                [
                    'name' => 'Premium Creamy Cheesecake Slices',
                    'description' => 'Premium cheesecake slices with rich cream cheese and graham crust.',
                    'specifications' => '<ul><li>Premium cream cheese</li><li>Graham cracker crust</li><li>Rich and creamy</li><li>Individual slices</li><li>New York style</li></ul>',
                    'details' => '<p>Premium creamy cheesecake slices made with the finest cream cheese and graham cracker crust, offering rich New York-style flavor.</p>',
                    'price' => 22.99,
                    'sale_price' => 19.99,
                    'cover_image' => '/storage/media/812/collection.png',
                    'images' => '/storage/media/807/1.png,/storage/media/808/2.png,/storage/media/809/3.png,/storage/media/810/4.png,/storage/media/811/5.png'
                ],
                [
                    'name' => 'Light and Airy Mousse Pastries',
                    'description' => 'Delicate mousse pastries with light, airy texture and smooth finish.',
                    'specifications' => '<ul><li>Light mousse texture</li><li>Airy consistency</li><li>Smooth finish</li><li>Delicate flavor</li><li>Elegant presentation</li></ul>',
                    'details' => '<p>Exquisite light and airy mousse pastries with delicate texture and smooth finish, perfect for those who appreciate refined desserts.</p>',
                    'price' => 20.99,
                    'cover_image' => '/storage/media/818/collection.png',
                    'images' => '/storage/media/813/1.png,/storage/media/814/2.png,/storage/media/815/3.png,/storage/media/816/4.png,/storage/media/817/5.png'
                ],
                [
                    'name' => 'Assorted Mini Pastries with Bite-Sized Portions',
                    'description' => 'Variety pack of mini pastries in bite-sized portions with different flavors.',
                    'specifications' => '<ul><li>Bite-sized portions</li><li>Assorted flavors</li><li>Mini pastries</li><li>Variety pack</li><li>Perfect for sharing</li></ul>',
                    'details' => '<p>Delightful assorted mini pastries in bite-sized portions featuring various flavors and styles, perfect for parties and sharing.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/824/collection.png',
                    'images' => '/storage/media/819/1.png,/storage/media/820/2.png,/storage/media/821/3.png,/storage/media/822/4.png,/storage/media/823/5.png'
                ],
                [
                    'name' => 'Elegant Layered Pastries with Multiple Cream',
                    'description' => 'Sophisticated layered pastries with multiple cream layers and elegant design.',
                    'specifications' => '<ul><li>Multiple cream layers</li><li>Elegant design</li><li>Sophisticated presentation</li><li>Complex flavors</li><li>Premium ingredients</li></ul>',
                    'details' => '<p>Sophisticated elegant layered pastries featuring multiple cream layers and complex flavors with premium ingredients and beautiful presentation.</p>',
                    'price' => 28.99,
                    'sale_price' => 25.99,
                    'cover_image' => '/storage/media/830/collection.png',
                    'images' => '/storage/media/825/1.png,/storage/media/826/2.png,/storage/media/827/3.png,/storage/media/828/4.png,/storage/media/829/5.png'
                ],
                [
                    'name' => 'Signature Special Pastries with Luxurious Design',
                    'description' => 'Exclusive signature pastries with luxurious design and premium craftsmanship.',
                    'specifications' => '<ul><li>Signature recipe</li><li>Luxurious design</li><li>Premium craftsmanship</li><li>Exclusive creation</li><li>Artistic presentation</li></ul>',
                    'details' => '<p>Exclusive signature special pastries featuring luxurious design and premium craftsmanship, representing the pinnacle of pastry artistry.</p>',
                    'price' => 35.99,
                    'sale_price' => 32.99,
                    'cover_image' => '/storage/media/836/collection.png',
                    'images' => '/storage/media/831/1.png,/storage/media/832/2.png,/storage/media/833/3.png,/storage/media/834/4.png,/storage/media/835/5.png'
                ]
            ],
            'Breads & Loaves' => [
                [
                    'name' => 'Freshly Baked Sliced Premium White Bread',
                    'description' => 'Premium quality white bread with soft texture and fresh taste, sliced for convenience.',
                    'specifications' => '<ul><li>Premium white flour</li><li>Soft texture</li><li>Pre-sliced convenience</li><li>Fresh daily baking</li><li>Perfect for sandwiches</li></ul>',
                    'details' => '<p>Freshly baked premium white bread with exceptionally soft texture and delicious taste, conveniently pre-sliced for your daily needs.</p>',
                    'price' => 4.99,
                    'cover_image' => '/storage/media/842/collection.png',
                    'images' => '/storage/media/837/1.png,/storage/media/838/2.png,/storage/media/839/3.png,/storage/media/840/4.png,/storage/media/841/5.png'
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
                    'cover_image' => '/storage/media/848/collection.png',
                    'images' => '/storage/media/843/1.png,/storage/media/844/2.png,/storage/media/845/3.png,/storage/media/846/4.png,/storage/media/847/5.png'
                ],
                [
                    'name' => 'Factory Zero Maida Multigrain Bread',
                    'description' => 'Healthy multigrain bread made without maida, packed with multiple grains and seeds.',
                    'specifications' => '<ul><li>Zero maida formula</li><li>Multiple grains blend</li><li>Seed enriched</li><li>Healthy alternative</li><li>Natural ingredients</li></ul>',
                    'details' => '<p>Revolutionary multigrain bread made without maida, featuring a blend of healthy grains and seeds for maximum nutrition and taste.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => '/storage/media/854/collection.png',
                    'images' => '/storage/media/849/1.png,/storage/media/850/2.png,/storage/media/851/3.png,/storage/media/852/4.png,/storage/media/853/5.png'
                ],
                [
                    'name' => 'Great Garlic Bread',
                    'description' => 'Aromatic garlic bread with rich garlic flavor and herbs, perfect as a side or snack.',
                    'specifications' => '<ul><li>Rich garlic flavor</li><li>Herb seasoning</li><li>Aromatic taste</li><li>Ready to serve</li><li>Perfect side dish</li></ul>',
                    'details' => '<p>Deliciously aromatic garlic bread infused with rich garlic flavor and herbs, making it the perfect accompaniment to any meal.</p>',
                    'price' => 7.99,
                    'cover_image' => '/storage/media/860/collection.png',
                    'images' => '/storage/media/855/1.png,/storage/media/856/2.png,/storage/media/857/3.png,/storage/media/858/4.png,/storage/media/859/5.png'
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
                    'cover_image' => '/storage/media/866/collection.png',
                    'images' => '/storage/media/861/1.png,/storage/media/862/2.png,/storage/media/863/3.png,/storage/media/864/4.png,/storage/media/865/5.png'
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
                    'cover_image' => '/storage/media/872/collection.png',
                    'images' => '/storage/media/867/1.png,/storage/media/868/2.png,/storage/media/869/3.png,/storage/media/870/4.png,/storage/media/871/5.png'
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
                    'cover_image' => '/storage/media/878/collection.png',
                    'images' => '/storage/media/873/1.png,/storage/media/874/2.png,/storage/media/875/3.png,/storage/media/876/4.png,/storage/media/877/5.png'
                ],
                [
                    'name' => 'Premium Soft Burger Buns with Smooth Bites',
                    'description' => 'Premium quality burger buns with exceptionally soft texture and smooth bite experience.',
                    'specifications' => '<ul><li>Premium quality</li><li>Exceptionally soft</li><li>Smooth bite texture</li><li>Perfect burger size</li><li>Pack of 4 buns</li></ul>',
                    'details' => '<p>Premium soft burger buns designed for the ultimate burger experience, featuring smooth bite texture and perfect size for gourmet burgers.</p>',
                    'price' => 6.99,
                    'cover_image' => '/storage/media/884/collection.png',
                    'images' => '/storage/media/879/1.png,/storage/media/880/2.png,/storage/media/881/3.png,/storage/media/882/4.png,/storage/media/883/5.png'
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
                    'cover_image' => '/storage/media/890/collection.png',
                    'images' => '/storage/media/885/1.png,/storage/media/886/2.png,/storage/media/887/3.png,/storage/media/888/4.png,/storage/media/889/5.png'
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
                    'cover_image' => '/storage/media/896/collection.png',
                    'images' => '/storage/media/891/1.png,/storage/media/892/2.png,/storage/media/893/3.png,/storage/media/894/4.png,/storage/media/895/5.png'
                ],
                [
                    'name' => 'Wholesome Oven-Baked Oatmeal Cookies',
                    'description' => 'Nutritious oven-baked oatmeal cookies with wholesome ingredients and hearty texture.',
                    'specifications' => '<ul><li>Wholesome oats</li><li>Oven-baked fresh</li><li>Nutritious ingredients</li><li>Hearty texture</li><li>Natural sweetness</li></ul>',
                    'details' => '<p>Wholesome oven-baked oatmeal cookies made with nutritious ingredients and hearty oats for a healthy and satisfying treat.</p>',
                    'price' => 16.99,
                    'sale_price' => 14.99,
                    'cover_image' => '/storage/media/902/collection.png',
                    'images' => '/storage/media/897/1.png,/storage/media/898/2.png,/storage/media/899/3.png,/storage/media/900/4.png,/storage/media/901/5.png'
                ],
                [
                    'name' => 'Premium Almond Cookies Crafted',
                    'description' => 'Premium crafted almond cookies with rich almond flavor and delicate texture.',
                    'specifications' => '<ul><li>Premium almonds</li><li>Crafted recipe</li><li>Rich almond flavor</li><li>Delicate texture</li><li>Artisan quality</li></ul>',
                    'details' => '<p>Premium almond cookies carefully crafted with the finest almonds, delivering rich almond flavor and delicate texture in every bite.</p>',
                    'price' => 22.99,
                    'cover_image' => '/storage/media/908/collection.png',
                    'images' => '/storage/media/903/1.png,/storage/media/904/2.png,/storage/media/905/3.png,/storage/media/906/4.png,/storage/media/907/5.png'
                ],
                [
                    'name' => 'Classic Scottish-Style Shortbread Biscuits',
                    'description' => 'Traditional Scottish-style shortbread biscuits with authentic buttery taste.',
                    'specifications' => '<ul><li>Scottish-style recipe</li><li>Authentic butter taste</li><li>Traditional method</li><li>Crumbly texture</li><li>Classic shape</li></ul>',
                    'details' => '<p>Authentic Scottish-style shortbread biscuits made with traditional methods and premium butter for the classic crumbly texture and rich taste.</p>',
                    'price' => 19.99,
                    'sale_price' => 17.99,
                    'cover_image' => '/storage/media/914/collection.png',
                    'images' => '/storage/media/909/1.png,/storage/media/910/2.png,/storage/media/911/3.png,/storage/media/912/4.png,/storage/media/913/5.png'
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
                    'cover_image' => '/storage/media/919/collection.png',
                    'images' => '/storage/media/915/1.png,/storage/media/916/2.png,/storage/media/920/3.png,/storage/media/917/4.png,/storage/media/918/5.png'
                ],
                [
                    'name' => 'Traditional Bakery-Style Dry',
                    'description' => 'Traditional bakery-style dry with authentic taste and perfect crunch.',
                    'specifications' => '<ul><li>Traditional bakery recipe</li><li>Dry biscuit style</li><li>Authentic taste</li><li>Perfect crunch</li><li>Long shelf life</li></ul>',
                    'details' => '<p>Traditional bakery-style dry made with authentic recipes, offering perfect crunch and classic taste that pairs well with tea or coffee.</p>',
                    'price' => 12.99,
                    'cover_image' => '/storage/media/926/collection.png',
                    'images' => '/storage/media/921/1.png,/storage/media/922/2.png,/storage/media/923/3.png,/storage/media/924/4.png,/storage/media/925/5.png'
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
                    'cover_image' => '/storage/media/932/collection.png',
                    'images' => '/storage/media/927/1.png,/storage/media/928/2.png,/storage/media/929/3.png,/storage/media/930/4.png,/storage/media/931/5.png'
                ]
            ],
            'Savory Bakes' => [
                [
                    'name' => 'Chinese Puff - Crunchy, Zesty, and Full of Flavor',
                    'description' => 'Crispy Chinese puff pastry with zesty filling and bold flavors.',
                    'specifications' => '<ul><li>Crunchy pastry shell</li><li>Zesty filling</li><li>Bold flavors</li><li>Chinese-style preparation</li><li>Fresh baked daily</li></ul>',
                    'details' => '<p>Delicious Chinese puff featuring crunchy pastry shell filled with zesty ingredients and bold flavors for an authentic taste experience.</p>',
                    'price' => 8.99,
                    'cover_image' => '/storage/media/938/collection.png',
                    'images' => '/storage/media/933/1.png,/storage/media/934/2.png,/storage/media/935/3.png,/storage/media/936/4.png,/storage/media/937/5.png'
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
                    'cover_image' => '/storage/media/944/collection.png',
                    'images' => '/storage/media/939/1.png,/storage/media/940/2.png,/storage/media/941/3.png,/storage/media/942/4.png,/storage/media/943/5.png'
                ],
                [
                    'name' => 'Double Decker Sandwich',
                    'description' => 'Multi-layered double decker sandwich with fresh ingredients and premium fillings.',
                    'specifications' => '<ul><li>Multi-layered design</li><li>Fresh ingredients</li><li>Premium fillings</li><li>Double decker style</li><li>Hearty portion</li></ul>',
                    'details' => '<p>Hearty double decker sandwich featuring multiple layers of fresh ingredients and premium fillings for a satisfying meal experience.</p>',
                    'price' => 15.99,
                    'cover_image' => '/storage/media/950/collection.png',
                    'images' => '/storage/media/945/1.png,/storage/media/946/2.png,/storage/media/947/3.png,/storage/media/948/4.png,/storage/media/949/5.png'
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
                    'cover_image' => '/storage/media/956/collection.png',
                    'images' => '/storage/media/951/1.png,/storage/media/952/2.png,/storage/media/953/3.png,/storage/media/954/4.png,/storage/media/955/5.png'
                ],
                [
                    'name' => 'Spelled Pizza Slice with Vegetables',
                    'description' => 'Healthy spelled flour pizza slice topped with fresh vegetables and cheese.',
                    'specifications' => '<ul><li>Spelled flour base</li><li>Fresh vegetables</li><li>Quality cheese</li><li>Healthy option</li><li>Single slice serving</li></ul>',
                    'details' => '<p>Nutritious spelled flour pizza slice topped with fresh vegetables and quality cheese for a healthy and delicious meal option.</p>',
                    'price' => 9.99,
                    'sale_price' => 8.99,
                    'cover_image' => '/storage/media/962/collection.png',
                    'images' => '/storage/media/957/1.png,/storage/media/958/2.png,/storage/media/959/3.png,/storage/media/960/4.png,/storage/media/961/5.png'
                ],
                [
                    'name' => 'Frozen Sliced Soft Deli Bread Rolls',
                    'description' => 'Convenient frozen soft deli bread rolls, pre-sliced for easy use.',
                    'specifications' => '<ul><li>Frozen for freshness</li><li>Pre-sliced convenience</li><li>Soft texture</li><li>Deli quality</li><li>Easy to thaw</li></ul>',
                    'details' => '<p>Convenient frozen soft deli bread rolls that are pre-sliced for easy use, maintaining freshness and soft texture when thawed.</p>',
                    'price' => 6.99,
                    'cover_image' => '/storage/media/968/collection.png',
                    'images' => '/storage/media/963/1.png,/storage/media/964/2.png,/storage/media/965/3.png,/storage/media/966/4.png,/storage/media/967/5.png'
                ],
                [
                    'name' => 'Cheese Stuffed Korean Bun',
                    'description' => 'Soft Korean-style bun stuffed with melted cheese and traditional flavors.',
                    'specifications' => '<ul><li>Korean-style bun</li><li>Melted cheese filling</li><li>Soft texture</li><li>Traditional flavors</li><li>Authentic recipe</li></ul>',
                    'details' => '<p>Authentic Korean-style bun with soft texture and melted cheese filling, prepared with traditional flavors for an authentic taste experience.</p>',
                    'price' => 11.99,
                    'cover_image' => '/storage/media/974/collection.png',
                    'images' => '/storage/media/969/1.png,/storage/media/970/2.png,/storage/media/971/3.png,/storage/media/972/4.png,/storage/media/973/5.png'
                ],
                [
                    'name' => 'Spinach Corn & Cheese Hand Pie Single Piece',
                    'description' => 'Individual hand pie filled with spinach, corn, and cheese in flaky pastry.',
                    'specifications' => '<ul><li>Individual serving</li><li>Spinach and corn filling</li><li>Cheese blend</li><li>Flaky pastry</li><li>Hand-held convenience</li></ul>',
                    'details' => '<p>Delicious individual hand pie featuring spinach, corn, and cheese filling wrapped in flaky pastry for convenient hand-held enjoyment.</p>',
                    'price' => 7.99,
                    'cover_image' => '/storage/media/980/collection.png',
                    'images' => '/storage/media/975/1.png,/storage/media/976/2.png,/storage/media/977/3.png,/storage/media/978/4.png,/storage/media/979/5.png'
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
                    'cover_image' => '/storage/media/991/collection.png',
                    'images' => '/storage/media/986/1.png,/storage/media/987/2.png,/storage/media/988/3.png,/storage/media/989/4.png,/storage/media/990/5.png'
                ],
                [
                    'name' => 'Organic Palak Spinach',
                    'description' => 'Fresh organic palak spinach leaves, rich in iron and nutrients.',
                    'specifications' => '<ul><li>Certified organic</li><li>Rich in iron</li><li>Fresh palak variety</li><li>500g bundle</li><li>Pesticide-free</li></ul>',
                    'details' => '<p>Fresh organic palak spinach with tender leaves rich in iron and essential nutrients. Pesticide-free and perfect for healthy cooking.</p>',
                    'price' => 3.99,
                    'cover_image' => '/storage/media/997/collection.png',
                    'images' => '/storage/media/992/1.png,/storage/media/993/2.png,/storage/media/994/3.png,/storage/media/995/4.png,/storage/media/996/5.png'
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
                    'cover_image' => '/storage/media/1003/collection.png',
                    'images' => '/storage/media/998/1.png,/storage/media/999/2.png,/storage/media/1000/3.png,/storage/media/1001/4.png,/storage/media/1002/5.png'
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
                    'cover_image' => '/storage/media/1009/collection.png',
                    'images' => '/storage/media/1004/1.png,/storage/media/1005/2.png,/storage/media/1006/3.png,/storage/media/1007/4.png,/storage/media/1008/5.png'
                ],
                [
                    'name' => 'Fresh Cut Mixed Vegetables',
                    'description' => 'Ready-to-cook mixed vegetables, freshly cut and cleaned.',
                    'specifications' => '<ul><li>Ready-to-cook</li><li>Freshly cut</li><li>Mixed varieties</li><li>500g pack</li><li>Pre-washed</li></ul>',
                    'details' => '<p>Convenient fresh cut mixed vegetables that are ready-to-cook. Pre-washed and cleaned for quick meal preparation.</p>',
                    'price' => 3.49,
                    'cover_image' => '/storage/media/1015/collection.png',
                    'images' => '/storage/media/1010/1.png,/storage/media/1011/2.png,/storage/media/1012/3.png,/storage/media/1013/4.png,/storage/media/1014/5.png'
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
                    'cover_image' => '/storage/media/1021/collection.png',
                    'images' => '/storage/media/1016/1.png,/storage/media/1017/2.png,/storage/media/1018/3.png,/storage/media/1019/4.png,/storage/media/1020/5.png'
                ],
                [
                    'name' => 'Luxury Seasonal Fruits Hamper',
                    'description' => 'Premium hamper with assorted luxury seasonal fruits.',
                    'specifications' => '<ul><li>Luxury selection</li><li>Seasonal varieties</li><li>Premium quality</li><li>Gift hamper</li><li>Mixed fruits</li></ul>',
                    'details' => '<p>Luxury seasonal fruits hamper featuring premium quality assorted fruits. Perfect for gifting or special occasions.</p>',
                    'price' => 24.99,
                    'sale_price' => 21.99,
                    'cover_image' => '/storage/media/1027/collection.png',
                    'images' => '/storage/media/1022/1.png,/storage/media/1023/2.png,/storage/media/1024/3.png,/storage/media/1025/4.png,/storage/media/1026/5.png'
                ],
                [
                    'name' => 'Fresh Mint / Pudina Plant',
                    'description' => 'Live fresh mint plant for home gardening and cooking.',
                    'specifications' => '<ul><li>Live plant</li><li>Fresh mint variety</li><li>Home gardening</li><li>Potted plant</li><li>Aromatic leaves</li></ul>',
                    'details' => '<p>Live fresh mint plant perfect for home gardening. Aromatic leaves ideal for cooking, teas, and natural remedies.</p>',
                    'price' => 6.99,
                    'cover_image' => '/storage/media/1033/collection.png',
                    'images' => '/storage/media/1028/1.png,/storage/media/1029/2.png,/storage/media/1030/3.png,/storage/media/1031/4.png,/storage/media/1032/5.png'
                ],
                [
                    'name' => 'Fresh Mushroom',
                    'description' => 'Premium fresh mushrooms with earthy flavor and meaty texture.',
                    'specifications' => '<ul><li>Premium quality</li><li>Earthy flavor</li><li>Meaty texture</li><li>250g pack</li><li>Rich in protein</li></ul>',
                    'details' => '<p>Premium fresh mushrooms with rich earthy flavor and meaty texture. High in protein and perfect for cooking, salads, and gourmet dishes.</p>',
                    'price' => 4.99,
                    'cover_image' => '/storage/media/1231/collection.png',
                    'images' => '/storage/media/1226/1.png,/storage/media/1227/2.png,/storage/media/1228/3.png,/storage/media/1229/4.png,/storage/media/1230/5.png'
                ],
                [
                    'name' => 'Fresh Broccoli',
                    'description' => 'Crisp fresh broccoli florets rich in vitamins and nutrients.',
                    'specifications' => '<ul><li>Fresh florets</li><li>Rich in vitamins</li><li>High fiber content</li><li>500g pack</li><li>Organic grown</li></ul>',
                    'details' => '<p>Crisp fresh broccoli florets packed with vitamins C and K, fiber, and essential nutrients. Organic grown and perfect for healthy cooking.</p>',
                    'price' => 3.49,
                    'cover_image' => '/storage/media/1237/collection.png',
                    'images' => '/storage/media/1232/1.png,/storage/media/1233/2.png,/storage/media/1234/3.png,/storage/media/1235/4.png,/storage/media/1236/5.png'
                ]
            ],
            'Dairy & Eggs' => [
                [
                    'name' => 'Aurora Cream Milk',
                    'description' => 'Premium Aurora cream milk with rich, creamy texture and natural taste.',
                    'specifications' => '<ul><li>Premium cream milk</li><li>Rich and creamy</li><li>Natural taste</li><li>1 liter pack</li><li>Fresh daily</li></ul>',
                    'details' => '<p>Aurora Cream Milk offers premium quality with rich, creamy texture and natural taste. Perfect for drinking, cooking, and baking needs.</p>',
                    'price' => 3.99,
                    'cover_image' => '/storage/media/1039/collection.png',
                    'images' => '/storage/media/1034/1.png,/storage/media/1035/2.png,/storage/media/1036/3.png,/storage/media/1037/4.png,/storage/media/1038/5.png'
                ],
                [
                    'name' => 'Finest Salted Butter',
                    'description' => 'Premium finest salted butter made from fresh cream with perfect salt balance.',
                    'specifications' => '<ul><li>Premium quality</li><li>Made from fresh cream</li><li>Perfect salt balance</li><li>500g pack</li><li>Rich flavor</li></ul>',
                    'details' => '<p>Finest Salted Butter crafted from fresh cream with perfect salt balance for rich flavor. Ideal for cooking, baking, and spreading.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => '/storage/media/1045/collection.png',
                    'images' => '/storage/media/1040/1.png,/storage/media/1041/2.png,/storage/media/1042/3.png,/storage/media/1043/4.png,/storage/media/1044/5.png'
                ],
                [
                    'name' => 'Aurora Cheese',
                    'description' => 'Premium Aurora Cheese with rich flavor and smooth texture.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich flavor</li><li>Smooth texture</li><li>200g pack</li><li>Natural ingredients</li></ul>',
                    'details' => '<p>Aurora Cheese offers premium quality with rich flavor and smooth texture. Made from natural ingredients for authentic taste.</p>',
                    'price' => 8.99,
                    'cover_image' => '/storage/media/1051/collection.png',
                    'images' => '/storage/media/1046/1.png,/storage/media/1047/2.png,/storage/media/1048/3.png,/storage/media/1049/4.png,/storage/media/1050/5.png'
                ],
                [
                    'name' => 'Honey Flavor Yogurt',
                    'description' => 'Creamy yogurt with natural honey flavor and live active cultures.',
                    'specifications' => '<ul><li>Natural honey flavor</li><li>Live active cultures</li><li>Creamy texture</li><li>400g container</li><li>Probiotic benefits</li></ul>',
                    'details' => '<p>Honey Flavor Yogurt combines creamy texture with natural honey sweetness and beneficial live cultures for healthy digestion.</p>',
                    'price' => 4.49,
                    'cover_image' => '/storage/media/1057/collection.png',
                    'images' => '/storage/media/1052/1.png,/storage/media/1053/2.png,/storage/media/1054/3.png,/storage/media/1055/4.png,/storage/media/1056/5.png'
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
                    'cover_image' => '/storage/media/1063/collection.png',
                    'images' => '/storage/media/1058/1.png,/storage/media/1059/2.png,/storage/media/1060/3.png,/storage/media/1061/4.png,/storage/media/1062/5.png'
                ],
                [
                    'name' => 'Lactobloom Paneer',
                    'description' => 'Fresh Lactobloom paneer with soft texture and authentic taste.',
                    'specifications' => '<ul><li>Fresh paneer</li><li>Soft texture</li><li>Authentic taste</li><li>200g pack</li><li>High protein</li></ul>',
                    'details' => '<p>Lactobloom Paneer offers fresh, soft texture with authentic taste. High in protein and perfect for Indian cooking and healthy meals.</p>',
                    'price' => 7.99,
                    'cover_image' => '/storage/media/1069/collection.png',
                    'images' => '/storage/media/1064/1.png,/storage/media/1065/2.png,/storage/media/1066/3.png,/storage/media/1067/4.png,/storage/media/1068/5.png'
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
                    'cover_image' => '/storage/media/1075/collection.png',
                    'images' => '/storage/media/1070/1.png,/storage/media/1071/2.png,/storage/media/1072/3.png,/storage/media/1073/4.png,/storage/media/1074/5.png'
                ],
                [
                    'name' => 'Frothy Yogurt Drink',
                    'description' => 'Refreshing frothy yogurt drink with smooth texture and natural taste.',
                    'specifications' => '<ul><li>Frothy texture</li><li>Smooth consistency</li><li>Natural taste</li><li>250ml bottle</li><li>Refreshing drink</li></ul>',
                    'details' => '<p>Frothy Yogurt Drink offers refreshing taste with smooth, frothy texture. Perfect for on-the-go refreshment and healthy hydration.</p>',
                    'price' => 3.49,
                    'cover_image' => '/storage/media/1081/collection.png',
                    'images' => '/storage/media/1076/1.png,/storage/media/1077/2.png,/storage/media/1078/3.png,/storage/media/1079/4.png,/storage/media/1080/5.png'
                ],
                [
                    'name' => 'Chocolate Flavoured Milk',
                    'description' => 'Rich and creamy chocolate flavoured milk with premium cocoa.',
                    'specifications' => '<ul><li>Premium cocoa</li><li>Rich chocolate flavor</li><li>Creamy texture</li><li>500ml bottle</li><li>No artificial colors</li></ul>',
                    'details' => '<p>Rich and creamy chocolate flavoured milk made with premium cocoa for authentic chocolate taste. Perfect for kids and chocolate lovers.</p>',
                    'price' => 2.99,
                    'cover_image' => '/storage/media/1243/collection.png',
                    'images' => '/storage/media/1238/1.png,/storage/media/1239/2.png,/storage/media/1240/3.png,/storage/media/1241/4.png,/storage/media/1242/5.png'
                ],
                [
                    'name' => 'Strawberry Milkshake',
                    'description' => 'Delicious strawberry milkshake with real fruit pieces and creamy milk.',
                    'specifications' => '<ul><li>Real strawberry pieces</li><li>Creamy milk base</li><li>Natural fruit flavor</li><li>400ml bottle</li><li>Rich in calcium</li></ul>',
                    'details' => '<p>Delicious strawberry milkshake made with real fruit pieces and creamy milk. Natural fruit flavor and rich in calcium for a healthy treat.</p>',
                    'price' => 3.49,
                    'cover_image' => '/storage/media/1249/collection.png',
                    'images' => '/storage/media/1244/1.png,/storage/media/1245/2.png,/storage/media/1246/3.png,/storage/media/1247/4.png,/storage/media/1248/5.png'
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
                    'cover_image' => '/storage/media/1087/collection.png',
                    'images' => '/storage/media/1082/1.png,/storage/media/1083/2.png,/storage/media/1084/3.png,/storage/media/1085/4.png,/storage/media/1086/5.png'
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
                    'cover_image' => '/storage/media/1093/collection.png',
                    'images' => '/storage/media/1088/1.png,/storage/media/1089/2.png,/storage/media/1090/3.png,/storage/media/1091/4.png,/storage/media/1092/5.png'
                ],
                [
                    'name' => 'Masoor Dal and Moong Dal Pulses',
                    'description' => 'Premium quality masoor dal and moong dal pulses rich in protein.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich in protein</li><li>Easy to cook</li><li>1kg pack each</li><li>Machine cleaned</li></ul>',
                    'details' => '<p>Premium Masoor Dal and Moong Dal Pulses offer excellent protein content and easy cooking. Machine cleaned and sorted for quality assurance.</p>',
                    'price' => 12.99,
                    'sale_price' => 10.99,
                    'cover_image' => '/storage/media/1099/collection.png',
                    'images' => '/storage/media/1094/1.png,/storage/media/1095/2.png,/storage/media/1096/3.png,/storage/media/1097/4.png,/storage/media/1098/5.png'
                ],
                [
                    'name' => 'Premium Brown Lentils',
                    'description' => 'Premium brown lentils with rich flavor and high nutritional value.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich flavor</li><li>High nutrition</li><li>500g pack</li><li>Organic certified</li></ul>',
                    'details' => '<p>Premium Brown Lentils offer rich flavor and high nutritional value. Organic certified and perfect for healthy soups, curries, and salads.</p>',
                    'price' => 6.99,
                    'cover_image' => '/storage/media/1105/collection.png',
                    'images' => '/storage/media/1100/1.png,/storage/media/1101/2.png,/storage/media/1102/3.png,/storage/media/1103/4.png,/storage/media/1104/5.png'
                ],
                [
                    'name' => 'Fortune Cooking Oils',
                    'description' => 'Fortune brand premium cooking oils for healthy cooking and frying.',
                    'specifications' => '<ul><li>Fortune brand</li><li>Premium quality</li><li>Healthy cooking</li><li>1L bottle</li><li>Multiple varieties</li></ul>',
                    'details' => '<p>Fortune Cooking Oils provide premium quality for healthy cooking and frying. Available in multiple varieties including sunflower, mustard, and refined oil.</p>',
                    'price' => 9.99,
                    'sale_price' => 8.49,
                    'cover_image' => '/storage/media/1111/collection.png',
                    'images' => '/storage/media/1106/1.png,/storage/media/1107/2.png,/storage/media/1108/3.png,/storage/media/1109/4.png,/storage/media/1110/5.png'
                ],
                [
                    'name' => 'Sugar & Salt',
                    'description' => 'Premium quality sugar and salt combo pack for daily cooking needs.',
                    'specifications' => '<ul><li>Premium quality</li><li>Refined sugar</li><li>Iodized salt</li><li>Combo pack</li><li>Daily essentials</li></ul>',
                    'details' => '<p>Premium Sugar & Salt combo pack includes refined sugar and iodized salt for daily cooking needs. Essential ingredients for every kitchen.</p>',
                    'price' => 4.99,
                    'cover_image' => '/storage/media/1117/collection.png',
                    'images' => '/storage/media/1112/1.png,/storage/media/1113/2.png,/storage/media/1114/3.png,/storage/media/1115/4.png,/storage/media/1116/5.png'
                ],
                [
                    'name' => 'Outino Spices',
                    'description' => 'Outino brand premium spices collection for authentic flavors.',
                    'specifications' => '<ul><li>Outino brand</li><li>Premium spices</li><li>Authentic flavors</li><li>Variety pack</li><li>Fresh ground</li></ul>',
                    'details' => '<p>Outino Spices offer premium quality spice collection with authentic flavors. Fresh ground spices perfect for Indian cooking and international cuisines.</p>',
                    'price' => 11.99,
                    'sale_price' => 9.99,
                    'cover_image' => '/storage/media/1123/collection.png',
                    'images' => '/storage/media/1118/1.png,/storage/media/1119/2.png,/storage/media/1120/3.png,/storage/media/1121/4.png,/storage/media/1122/5.png'
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
                    'cover_image' => '/storage/media/1129/collection.png',
                    'images' => '/storage/media/1124/1.png,/storage/media/1125/2.png,/storage/media/1126/3.png,/storage/media/1127/4.png,/storage/media/1128/5.png'
                ],
                [
                    'name' => 'Royal Almonds',
                    'description' => 'Premium quality royal almonds with rich flavor and natural goodness.',
                    'specifications' => '<ul><li>Premium quality</li><li>Rich in protein</li><li>Natural goodness</li><li>500g pack</li><li>Raw almonds</li></ul>',
                    'details' => '<p>Premium Royal Almonds with rich flavor and natural goodness. High in protein and healthy fats, perfect for snacking and cooking.</p>',
                    'price' => 18.99,
                    'cover_image' => '/storage/media/1255/collection.png',
                    'images' => '/storage/media/1250/1.png,/storage/media/1251/2.png,/storage/media/1252/3.png,/storage/media/1253/4.png,/storage/media/1254/5.png'
                ],
                [
                    'name' => 'Nutrios Breakfast Cereals',
                    'description' => 'Nutritious breakfast cereals with whole grains and essential vitamins.',
                    'specifications' => '<ul><li>Whole grain cereals</li><li>Essential vitamins</li><li>High fiber content</li><li>400g box</li><li>Fortified with minerals</li></ul>',
                    'details' => '<p>Nutrios Breakfast Cereals provide nutritious start to your day with whole grains and essential vitamins. High fiber content and fortified with minerals.</p>',
                    'price' => 8.99,
                    'cover_image' => '/storage/media/1261/collection.png',
                    'images' => '/storage/media/1256/1.png,/storage/media/1257/2.png,/storage/media/1258/3.png,/storage/media/1259/4.png,/storage/media/1260/5.png'
                ]
            ],
            'Snacks & Beverages' => [
                [
                    'name' => 'Lays Chips',
                    'description' => 'Crispy Lays potato chips with classic flavor and perfect crunch.',
                    'specifications' => '<ul><li>Crispy potato chips</li><li>Classic flavor</li><li>Perfect crunch</li><li>50g pack</li><li>No artificial colors</li></ul>',
                    'details' => '<p>Lays Chips offer the perfect combination of crispy texture and classic flavor. Made from quality potatoes for the ultimate snacking experience.</p>',
                    'price' => 2.99,
                    'cover_image' => '/storage/media/1135/collection.png',
                    'images' => '/storage/media/1130/1.png,/storage/media/1131/2.png,/storage/media/1132/3.png,/storage/media/1133/4.png,/storage/media/1134/5.png'
                ],
                [
                    'name' => 'Hide & Seek Biscuits',
                    'description' => 'Delicious Hide & Seek chocolate chip biscuits with rich chocolate flavor.',
                    'specifications' => '<ul><li>Chocolate chip biscuits</li><li>Rich chocolate flavor</li><li>Crunchy texture</li><li>100g pack</li><li>Premium ingredients</li></ul>',
                    'details' => '<p>Hide & Seek Biscuits feature delicious chocolate chips in every bite with rich chocolate flavor and perfect crunchy texture.</p>',
                    'price' => 3.49,
                    'sale_price' => 2.99,
                    'cover_image' => '/storage/media/1141/collection.png',
                    'images' => '/storage/media/1136/1.png,/storage/media/1137/2.png,/storage/media/1138/3.png,/storage/media/1139/4.png,/storage/media/1140/5.png'
                ],
                [
                    'name' => 'Indya Amul Chocomini Chocolate',
                    'description' => 'Premium Indya Amul Chocomini chocolates with rich cocoa and smooth texture.',
                    'specifications' => '<ul><li>Premium chocolate</li><li>Rich cocoa content</li><li>Smooth texture</li><li>Mini size</li><li>Amul quality</li></ul>',
                    'details' => '<p>Indya Amul Chocomini Chocolate offers premium quality with rich cocoa content and smooth texture in convenient mini size portions.</p>',
                    'price' => 4.99,
                    'cover_image' => '/storage/media/1147/collection.png',
                    'images' => '/storage/media/1142/1.png,/storage/media/1143/2.png,/storage/media/1144/3.png,/storage/media/1145/4.png,/storage/media/1146/5.png'
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
                    'cover_image' => '/storage/media/1153/collection.png',
                    'images' => '/storage/media/1148/1.png,/storage/media/1149/2.png,/storage/media/1150/3.png,/storage/media/1151/4.png,/storage/media/1152/5.png'
                ],
                [
                    'name' => 'Fresh Organic Juice',
                    'description' => 'Premium fresh organic juice made from 100% organic fruits.',
                    'specifications' => '<ul><li>100% organic fruits</li><li>Fresh pressed</li><li>No preservatives</li><li>250ml bottle</li><li>Natural vitamins</li></ul>',
                    'details' => '<p>Fresh Organic Juice made from 100% organic fruits with no preservatives. Rich in natural vitamins and fresh pressed for maximum nutrition.</p>',
                    'price' => 3.99,
                    'cover_image' => '/storage/media/1159/collection.png',
                    'images' => '/storage/media/1154/1.png,/storage/media/1155/2.png,/storage/media/1156/3.png,/storage/media/1157/4.png,/storage/media/1158/5.png'
                ],
                [
                    'name' => 'Artisan Grey Tea',
                    'description' => 'Premium artisan grey tea with bergamot oil and natural flavors.',
                    'specifications' => '<ul><li>Premium tea leaves</li><li>Bergamot oil</li><li>Natural flavors</li><li>25 tea bags</li><li>Artisan quality</li></ul>',
                    'details' => '<p>Artisan Grey Tea features premium tea leaves infused with bergamot oil and natural flavors for an authentic and refined tea experience.</p>',
                    'price' => 6.99,
                    'sale_price' => 5.99,
                    'cover_image' => '/storage/media/1165/collection.png',
                    'images' => '/storage/media/1160/1.png,/storage/media/1161/2.png,/storage/media/1162/3.png,/storage/media/1163/4.png,/storage/media/1164/5.png'
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
                    'cover_image' => '/storage/media/1171/collection.png',
                    'images' => '/storage/media/1166/1.png,/storage/media/1167/2.png,/storage/media/1168/3.png,/storage/media/1169/4.png,/storage/media/1170/5.png'
                ],
                [
                    'name' => 'Savory Mix Namkeen',
                    'description' => 'Traditional savory mix namkeen with spices and crunchy ingredients.',
                    'specifications' => '<ul><li>Traditional recipe</li><li>Spicy flavor</li><li>Crunchy texture</li><li>200g pack</li><li>Mixed ingredients</li></ul>',
                    'details' => '<p>Savory Mix Namkeen offers traditional Indian snacking experience with perfect blend of spices and crunchy ingredients for authentic taste.</p>',
                    'price' => 3.99,
                    'cover_image' => '/storage/media/1177/collection.png',
                    'images' => '/storage/media/1172/1.png,/storage/media/1173/2.png,/storage/media/1174/3.png,/storage/media/1175/4.png,/storage/media/1176/5.png'
                ],
                [
                    'name' => 'Noodle King Instant Noodles',
                    'description' => 'Quick and delicious instant noodles with rich flavor and perfect texture.',
                    'specifications' => '<ul><li>Quick 3-minute cooking</li><li>Rich flavor packet</li><li>Perfect texture</li><li>70g pack</li><li>No preservatives</li></ul>',
                    'details' => '<p>Noodle King Instant Noodles provide quick and satisfying meal with rich flavor and perfect texture. Ready in just 3 minutes with no preservatives.</p>',
                    'price' => 1.99,
                    'cover_image' => '/storage/media/1267/collection.png',
                    'images' => '/storage/media/1262/1.png,/storage/media/1263/2.png,/storage/media/1264/3.png,/storage/media/1265/4.png,/storage/media/1266/5.png'
                ],
                [
                    'name' => 'Nutri-Core Energy Bars',
                    'description' => 'Nutritious energy bars packed with protein and natural ingredients.',
                    'specifications' => '<ul><li>High protein content</li><li>Natural ingredients</li><li>Energy boost formula</li><li>40g bar</li><li>No artificial flavors</li></ul>',
                    'details' => '<p>Nutri-Core Energy Bars provide sustained energy with high protein content and natural ingredients. Perfect for pre-workout or healthy snacking.</p>',
                    'price' => 2.49,
                    'cover_image' => '/storage/media/1273/collection.png',
                    'images' => '/storage/media/1268/1.png,/storage/media/1269/2.png,/storage/media/1270/3.png,/storage/media/1271/4.png,/storage/media/1272/5.png'
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
                    'cover_image' => '/storage/media/1183/collection.png',
                    'images' => '/storage/media/1178/1.png,/storage/media/1179/2.png,/storage/media/1180/3.png,/storage/media/1181/4.png,/storage/media/1182/5.png'
                ],
                [
                    'name' => 'Fresh Liquid Detergent',
                    'description' => 'Premium fresh liquid detergent for powerful cleaning and fresh fragrance.',
                    'specifications' => '<ul><li>Concentrated formula</li><li>Fresh fragrance</li><li>Stain removal power</li><li>1L bottle</li><li>Eco-friendly ingredients</li></ul>',
                    'details' => '<p>Fresh Liquid Detergent provides powerful cleaning action with concentrated formula and fresh fragrance. Eco-friendly ingredients for effective stain removal.</p>',
                    'price' => 8.99,
                    'cover_image' => '/storage/media/1189/collection.png',
                    'images' => '/storage/media/1184/1.png,/storage/media/1185/2.png,/storage/media/1186/3.png,/storage/media/1187/4.png,/storage/media/1188/5.png'
                ],
                [
                    'name' => 'Ecowash Drop Liquid Lemon Dishwash',
                    'description' => 'Eco-friendly lemon dishwash liquid with natural cleaning power.',
                    'specifications' => '<ul><li>Eco-friendly formula</li><li>Natural lemon extract</li><li>Grease cutting power</li><li>500ml bottle</li><li>Gentle on hands</li></ul>',
                    'details' => '<p>Ecowash Drop Liquid Lemon Dishwash combines eco-friendly formula with natural lemon extract for powerful grease cutting while being gentle on hands.</p>',
                    'price' => 4.99,
                    'sale_price' => 4.49,
                    'cover_image' => '/storage/media/1195/collection.png',
                    'images' => '/storage/media/1190/1.png,/storage/media/1191/2.png,/storage/media/1192/3.png,/storage/media/1193/4.png,/storage/media/1194/5.png'
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
                    'cover_image' => '/storage/media/1201/collection.png',
                    'images' => '/storage/media/1196/1.png,/storage/media/1197/2.png,/storage/media/1198/3.png,/storage/media/1199/4.png,/storage/media/1200/5.png'
                ],
                [
                    'name' => 'Daily Care Herbal Shampoo',
                    'description' => 'Gentle herbal shampoo for daily hair care with natural ingredients.',
                    'specifications' => '<ul><li>Herbal formula</li><li>Natural ingredients</li><li>Daily use suitable</li><li>300ml bottle</li><li>Sulfate-free</li></ul>',
                    'details' => '<p>Daily Care Herbal Shampoo provides gentle cleansing with natural herbal ingredients. Sulfate-free formula suitable for daily use and all hair types.</p>',
                    'price' => 7.99,
                    'sale_price' => 6.99,
                    'cover_image' => '/storage/media/1207/collection.png',
                    'images' => '/storage/media/1202/1.png,/storage/media/1203/2.png,/storage/media/1204/3.png,/storage/media/1205/4.png,/storage/media/1206/5.png'
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
                    'cover_image' => '/storage/media/1213/collection.png',
                    'images' => '/storage/media/1208/1.png,/storage/media/1209/2.png,/storage/media/1210/3.png,/storage/media/1211/4.png,/storage/media/1212/5.png'
                ],
                [
                    'name' => 'Disposable Paper Products',
                    'description' => 'High-quality disposable paper products for convenient household use.',
                    'specifications' => '<ul><li>High-quality paper</li><li>Disposable convenience</li><li>Multi-purpose use</li><li>Pack of 100 pieces</li><li>Eco-friendly material</li></ul>',
                    'details' => '<p>Disposable Paper Products offer convenient household solutions with high-quality paper and eco-friendly materials. Perfect for various cleaning and serving needs.</p>',
                    'price' => 5.99,
                    'cover_image' => '/storage/media/1219/collection.png',
                    'images' => '/storage/media/1214/1.png,/storage/media/1215/2.png,/storage/media/1216/3.png,/storage/media/1217/4.png,/storage/media/1218/5.png'
                ],
                [
                    'name' => 'Aromist Air Freshener',
                    'description' => 'Premium Aromist air freshener for long-lasting fragrance and freshness.',
                    'specifications' => '<ul><li>Long-lasting fragrance</li><li>Premium quality</li><li>Instant freshness</li><li>300ml spray</li><li>Multiple scents available</li></ul>',
                    'details' => '<p>Aromist Air Freshener provides premium quality fragrance with long-lasting freshness. Instant room transformation with multiple delightful scents to choose from.</p>',
                    'price' => 6.49,
                    'sale_price' => 5.99,
                    'cover_image' => '/storage/media/1225/collection.png',
                    'images' => '/storage/media/1220/1.png,/storage/media/1221/2.png,/storage/media/1222/3.png,/storage/media/1223/4.png,/storage/media/1224/5.png'
                ],
                [
                    'name' => 'Sparkler Floor Cleaner',
                    'description' => 'Powerful floor cleaner that removes tough stains and leaves floors sparkling clean.',
                    'specifications' => '<ul><li>Powerful cleaning formula</li><li>Removes tough stains</li><li>Sparkling clean finish</li><li>1L bottle</li><li>Pleasant fragrance</li></ul>',
                    'details' => '<p>Sparkler Floor Cleaner provides powerful cleaning action that removes tough stains and dirt, leaving your floors sparkling clean with a pleasant fragrance.</p>',
                    'price' => 7.99,
                    'cover_image' => '/storage/media/1279/collection.png',
                    'images' => '/storage/media/1274/1.png,/storage/media/1275/2.png,/storage/media/1276/3.png,/storage/media/1277/4.png,/storage/media/1278/5.png'
                ],
                [
                    'name' => 'Aura Clean Hand Wash',
                    'description' => 'Gentle antibacterial hand wash with moisturizing formula for soft, clean hands.',
                    'specifications' => '<ul><li>Antibacterial formula</li><li>Moisturizing ingredients</li><li>Gentle on skin</li><li>250ml pump bottle</li><li>Fresh fragrance</li></ul>',
                    'details' => '<p>Aura Clean Hand Wash provides effective antibacterial protection while moisturizing your hands. Gentle formula keeps hands soft and clean with fresh fragrance.</p>',
                    'price' => 4.99,
                    'cover_image' => '/storage/media/1285/collection.png',
                    'images' => '/storage/media/1280/1.png,/storage/media/1281/2.png,/storage/media/1282/3.png,/storage/media/1283/4.png,/storage/media/1284/5.png'
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
                    'cover_image' => '/storage/media/1301/collection.png',
                    'images' => '/storage/media/1296/1.png,/storage/media/1297/2.png,/storage/media/1298/3.png,/storage/media/1299/4.png,/storage/media/1300/5.png'
                ],
                [
                    'name' => 'Car Steering Wheel Cover',
                    'description' => 'Comfortable steering wheel cover with enhanced grip and style.',
                    'specifications' => '<ul><li>Enhanced grip</li><li>Comfortable feel</li><li>Easy installation</li><li>Universal size</li><li>Durable material</li></ul>',
                    'details' => '<p>Comfortable steering wheel cover designed for enhanced grip and driving comfort. Easy installation with universal sizing for most vehicles.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/1307/collection.png',
                    'images' => '/storage/media/1302/1.png,/storage/media/1303/2.png,/storage/media/1304/3.png,/storage/media/1305/4.png,/storage/media/1306/5.png'
                ],
                [
                    'name' => 'Luxury Floor Mats for Cars',
                    'description' => 'Luxury all-weather floor mats for superior protection and style.',
                    'specifications' => '<ul><li>All-weather protection</li><li>Luxury design</li><li>Custom fit</li><li>Easy to clean</li><li>Anti-slip backing</li></ul>',
                    'details' => '<p>Luxury floor mats providing superior protection against dirt and moisture. Custom fit design with anti-slip backing for safety and style.</p>',
                    'price' => 129.99,
                    'cover_image' => '/storage/media/1313/collection.png',
                    'images' => '/storage/media/1308/1.png,/storage/media/1309/2.png,/storage/media/1310/3.png,/storage/media/1311/4.png,/storage/media/1312/5.png'
                ],
                [
                    'name' => 'Elegant Car Dashboard Cover',
                    'description' => 'Elegant dashboard cover for UV protection and enhanced interior aesthetics.',
                    'specifications' => '<ul><li>UV protection</li><li>Elegant design</li><li>Custom fit</li><li>Heat resistant</li><li>Easy installation</li></ul>',
                    'details' => '<p>Elegant dashboard cover providing UV protection while enhancing interior aesthetics. Custom fit design with heat resistant materials.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/1319/collection.png',
                    'images' => '/storage/media/1314/1.png,/storage/media/1315/2.png,/storage/media/1316/3.png,/storage/media/1317/4.png,/storage/media/1318/5.png'
                ],
                [
                    'name' => 'ComfortDrive Armrest Cushion',
                    'description' => 'Ergonomic armrest cushion for enhanced driving comfort during long trips.',
                    'specifications' => '<ul><li>Ergonomic design</li><li>Memory foam</li><li>Universal fit</li><li>Easy attachment</li><li>Breathable cover</li></ul>',
                    'details' => '<p>ComfortDrive armrest cushion with ergonomic design and memory foam for enhanced comfort during long drives. Universal fit with easy attachment.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/1325/collection.png',
                    'images' => '/storage/media/1320/1.png,/storage/media/1321/2.png,/storage/media/1322/3.png,/storage/media/1323/4.png,/storage/media/1324/5.png'
                ],
                [
                    'name' => 'AutoShade Window Sunshade',
                    'description' => 'Premium window sunshade for UV protection and temperature control.',
                    'specifications' => '<ul><li>UV protection</li><li>Temperature control</li><li>Easy installation</li><li>Foldable design</li><li>Universal fit</li></ul>',
                    'details' => '<p>AutoShade window sunshade providing excellent UV protection and temperature control. Foldable design with easy installation for all vehicles.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/1331/collection.png',
                    'images' => '/storage/media/1326/1.png,/storage/media/1327/2.png,/storage/media/1328/3.png,/storage/media/1329/4.png,/storage/media/1330/5.png'
                ],
                [
                    'name' => 'SmartStore Car Organizer',
                    'description' => 'Multi-compartment car organizer for efficient storage and organization.',
                    'specifications' => '<ul><li>Multi-compartment design</li><li>Durable materials</li><li>Easy installation</li><li>Adjustable straps</li><li>Compact size</li></ul>',
                    'details' => '<p>SmartStore car organizer with multi-compartment design for efficient storage. Durable materials with adjustable straps for secure installation.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/1337/collection.png',
                    'images' => '/storage/media/1332/1.png,/storage/media/1333/2.png,/storage/media/1334/3.png,/storage/media/1335/4.png,/storage/media/1336/5.png'
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
                    'cover_image' => '/storage/media/1343/collection.png',
                    'images' => '/storage/media/1338/1.png,/storage/media/1339/2.png,/storage/media/1340/3.png,/storage/media/1341/4.png,/storage/media/1342/5.png'
                ],
                [
                    'name' => 'Dual Grip Cleaning Tool',
                    'description' => 'Versatile dual-grip cleaning tool for interior detailing and maintenance.',
                    'specifications' => '<ul><li>Dual-grip design</li><li>Microfiber attachments</li><li>Ergonomic handle</li><li>Washable pads</li><li>Multi-surface use</li></ul>',
                    'details' => '<p>Dual Grip cleaning tool with versatile design for interior detailing. Includes microfiber attachments and ergonomic handle for effective cleaning.</p>',
                    'price' => 29.99,
                    'cover_image' => '/storage/media/1349/collection.png',
                    'images' => '/storage/media/1344/1.png,/storage/media/1345/2.png,/storage/media/1346/3.png,/storage/media/1347/4.png,/storage/media/1348/5.png'
                ],
                [
                    'name' => 'Car Seat Neck Support Pillow',
                    'description' => 'Ergonomic neck support pillow for comfortable driving and passenger experience.',
                    'specifications' => '<ul><li>Ergonomic design</li><li>Memory foam core</li><li>Adjustable strap</li><li>Breathable cover</li><li>Universal fit</li></ul>',
                    'details' => '<p>Car Seat Neck Support Pillow with ergonomic design and memory foam core for optimal comfort. Adjustable strap with breathable cover for all vehicles.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/1355/collection.png',
                    'images' => '/storage/media/1350/1.png,/storage/media/1351/2.png,/storage/media/1352/3.png,/storage/media/1353/4.png,/storage/media/1354/5.png'
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
                    'cover_image' => '/storage/media/1361/collection.png',
                    'images' => '/storage/media/1356/1.png,/storage/media/1357/2.png,/storage/media/1358/3.png,/storage/media/1359/4.png,/storage/media/1360/5.png'
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
                    'cover_image' => '/storage/media/1367/collection.png',
                    'images' => '/storage/media/1362/1.png,/storage/media/1366/15.png,/storage/media/1363/3.png,/storage/media/1364/4.png,/storage/media/1365/5.png'
                ],
                [
                    'name' => 'Mud Flap Automotive Wheels Car Mudguard',
                    'description' => 'Heavy-duty mud flaps for wheel protection and cleanliness.',
                    'specifications' => '<ul><li>Heavy-duty construction</li><li>Flexible material</li><li>Easy installation</li><li>Universal fit</li><li>Set of 4 pieces</li></ul>',
                    'details' => '<p>Heavy-duty mud flaps designed to protect your vehicle and other cars from mud, rocks, and debris. Flexible material with universal fit for all vehicles.</p>',
                    'price' => 35.99,
                    'cover_image' => '/storage/media/1373/collection.png',
                    'images' => '/storage/media/1368/1.png,/storage/media/1369/2.png,/storage/media/1370/3.png,/storage/media/1371/4.png,/storage/media/1372/5.png'
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
                    'cover_image' => '/storage/media/1379/collection.png',
                    'images' => '/storage/media/1374/1.png,/storage/media/1375/2.png,/storage/media/1376/3.png,/storage/media/1377/4.png,/storage/media/1378/5.png'
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
                    'cover_image' => '/storage/media/1385/collection.png',
                    'images' => '/storage/media/1380/1.png,/storage/media/1381/2.png,/storage/media/1382/3.png,/storage/media/1383/4.png,/storage/media/1384/5.png'
                ],
                [
                    'name' => 'Roof Rails Black Suitable For All Cars',
                    'description' => 'Universal black roof rails for cargo carrying capacity.',
                    'specifications' => '<ul><li>Universal fit</li><li>Black finish</li><li>High load capacity</li><li>Easy installation</li><li>Aerodynamic design</li></ul>',
                    'details' => '<p>Universal black roof rails designed for all cars to increase cargo carrying capacity. Aerodynamic design with high load capacity and easy installation.</p>',
                    'price' => 129.99,
                    'cover_image' => '/storage/media/1391/collection.png',
                    'images' => '/storage/media/1386/1.png,/storage/media/1387/2.png,/storage/media/1388/3.png,/storage/media/1389/4.png,/storage/media/1390/5.png'
                ],
                [
                    'name' => 'Stainless Steel License Plate Frames',
                    'description' => 'Premium stainless steel license plate frames for durability.',
                    'specifications' => '<ul><li>Stainless steel construction</li><li>Rust resistant</li><li>Easy installation</li><li>Universal fit</li><li>Set of 2 frames</li></ul>',
                    'details' => '<p>Premium stainless steel license plate frames offering superior durability and rust resistance. Universal fit with easy installation for front and rear plates.</p>',
                    'price' => 29.99,
                    'cover_image' => '/storage/media/1397/collection.png',
                    'images' => '/storage/media/1392/1.png,/storage/media/1393/2.png,/storage/media/1394/3.png,/storage/media/1395/4.png,/storage/media/1396/5.png'
                ],
                [
                    'name' => 'Economical Wiper Blade',
                    'description' => 'Cost-effective wiper blade for clear visibility in all weather.',
                    'specifications' => '<ul><li>Economical design</li><li>All-weather performance</li><li>Easy installation</li><li>Multiple sizes</li><li>Durable rubber</li></ul>',
                    'details' => '<p>Economical wiper blade providing reliable performance in all weather conditions. Durable rubber construction with easy installation and multiple size options.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/1403/collection.png',
                    'images' => '/storage/media/1398/1.png,/storage/media/1399/2.png,/storage/media/1400/3.png,/storage/media/1401/4.png,/storage/media/1402/5.png'
                ],
                [
                    'name' => 'Car Mini Spoiler Wing For All Cars',
                    'description' => 'Universal mini spoiler wing for enhanced aerodynamics and style.',
                    'specifications' => '<ul><li>Universal fit</li><li>Aerodynamic design</li><li>Lightweight construction</li><li>Easy installation</li><li>Multiple colors</li></ul>',
                    'details' => '<p>Universal mini spoiler wing designed for all cars to enhance aerodynamics and styling. Lightweight construction with easy installation and multiple color options.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/1409/collection.png',
                    'images' => '/storage/media/1404/1.png,/storage/media/1405/2.png,/storage/media/1406/3.png,/storage/media/1407/4.png,/storage/media/1408/5.png'
                ],
                [
                    'name' => 'Front Fog Lamp Cover',
                    'description' => 'Protective fog lamp cover for enhanced durability and style.',
                    'specifications' => '<ul><li>Protective design</li><li>Enhanced durability</li><li>Easy installation</li><li>Perfect fit</li><li>Pair included</li></ul>',
                    'details' => '<p>Protective front fog lamp cover designed to enhance durability and style. Perfect fit with easy installation and pair included for complete protection.</p>',
                    'price' => 55.99,
                    'cover_image' => '/storage/media/1415/collection.png',
                    'images' => '/storage/media/1410/1.png,/storage/media/1411/2.png,/storage/media/1412/3.png,/storage/media/1413/4.png,/storage/media/1414/5.png'
                ]
            ],
            'Car Electronics' => [
                [
                    'name' => 'Voltmax 85W Car Charger Mobile',
                    'description' => 'High-power 85W car charger for fast mobile device charging.',
                    'specifications' => '<ul><li>85W fast charging</li><li>Multiple USB ports</li><li>LED indicator</li><li>Overcharge protection</li><li>Universal compatibility</li></ul>',
                    'details' => '<p>Voltmax 85W car charger providing fast charging for mobile devices with multiple USB ports and safety protection features.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/1421/collection.png',
                    'images' => '/storage/media/1416/1.png,/storage/media/1417/2.png,/storage/media/1418/3.png,/storage/media/1419/4.png,/storage/media/1420/5.png'
                ],
                [
                    'name' => 'Garmin Dash Cam Mini 3',
                    'description' => 'Compact dash cam with high-quality video recording and smart features.',
                    'specifications' => '<ul><li>1080p HD recording</li><li>140° field of view</li><li>Night vision</li><li>G-sensor</li><li>Loop recording</li></ul>',
                    'details' => '<p>Garmin Dash Cam Mini 3 with compact design, 1080p HD recording, and smart features for comprehensive driving protection.</p>',
                    'price' => 199.99,
                    'cover_image' => '/storage/media/1427/collection.png',
                    'images' => '/storage/media/1422/1.png,/storage/media/1423/2.png,/storage/media/1424/3.png,/storage/media/1425/4.png,/storage/media/1426/5.png'
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
                    'cover_image' => '/storage/media/1433/collection.png',
                    'images' => '/storage/media/1428/1.png,/storage/media/1429/2.png,/storage/media/1430/3.png,/storage/media/1431/4.png,/storage/media/1432/5.png'
                ],
                [
                    'name' => 'Car Backup Rear View Reverse Parking',
                    'description' => 'High-definition backup camera for clear rear view visibility.',
                    'specifications' => '<ul><li>HD resolution</li><li>Night vision</li><li>Waterproof design</li><li>Wide angle view</li><li>Easy installation</li></ul>',
                    'details' => '<p>High-definition backup camera providing clear rear view visibility with night vision and waterproof design for all weather conditions.</p>',
                    'price' => 129.99,
                    'cover_image' => '/storage/media/1439/collection.png',
                    'images' => '/storage/media/1434/1.png,/storage/media/1435/2.png,/storage/media/1436/3.png,/storage/media/1437/4.png,/storage/media/1438/5.png'
                ],
                [
                    'name' => '7 Inch GPS Navigation for Car',
                    'description' => 'Large 7-inch GPS navigation system with real-time traffic updates.',
                    'specifications' => '<ul><li>7-inch touchscreen</li><li>Real-time traffic</li><li>Voice guidance</li><li>Lifetime map updates</li><li>Bluetooth connectivity</li></ul>',
                    'details' => '<p>7-inch GPS navigation system with large touchscreen, real-time traffic updates, voice guidance, and lifetime map updates for convenient navigation.</p>',
                    'price' => 179.99,
                    'cover_image' => '/storage/media/1445/collection.png',
                    'images' => '/storage/media/1440/1.png,/storage/media/1441/2.png,/storage/media/1442/3.png,/storage/media/1443/4.png,/storage/media/1444/5.png'
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
                    'cover_image' => '/storage/media/1451/collection.png',
                    'images' => '/storage/media/1446/1.png,/storage/media/1447/2.png,/storage/media/1448/3.png,/storage/media/1449/4.png,/storage/media/1450/5.png'
                ],
                [
                    'name' => 'Wireless Bluetooth Transmitter & Receiver Adapter',
                    'description' => 'Versatile Bluetooth adapter for wireless audio transmission and reception.',
                    'specifications' => '<ul><li>Bluetooth 5.0</li><li>Transmitter & receiver modes</li><li>Long battery life</li><li>3.5mm audio jack</li><li>Low latency</li></ul>',
                    'details' => '<p>Versatile Bluetooth adapter with transmitter and receiver modes, Bluetooth 5.0 technology, and long battery life for wireless audio solutions.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/1469/collection.png',
                    'images' => '/storage/media/1464/1.png,/storage/media/1465/2.png,/storage/media/1466/3.png,/storage/media/1467/4.png,/storage/media/1468/5.png'
                ],
                [
                    'name' => 'TPMS Tyre Pressure Monitoring System',
                    'description' => 'Advanced tire pressure monitoring system for safety and fuel efficiency.',
                    'specifications' => '<ul><li>Real-time monitoring</li><li>Wireless sensors</li><li>LCD display</li><li>Temperature monitoring</li><li>Easy installation</li></ul>',
                    'details' => '<p>Advanced TPMS system providing real-time tire pressure and temperature monitoring with wireless sensors and LCD display for enhanced safety.</p>',
                    'price' => 159.99,
                    'cover_image' => '/storage/media/1475/collection.png',
                    'images' => '/storage/media/1470/1.png,/storage/media/1471/2.png,/storage/media/1472/3.png,/storage/media/1473/4.png,/storage/media/1474/5.png'
                ],
                [
                    'name' => 'Handheld Vacuum Cleaner',
                    'description' => 'Portable handheld vacuum cleaner for car interior cleaning.',
                    'specifications' => '<ul><li>Cordless design</li><li>Strong suction power</li><li>Multiple attachments</li><li>Rechargeable battery</li><li>Compact size</li></ul>',
                    'details' => '<p>Portable handheld vacuum cleaner with cordless design, strong suction power, and multiple attachments for thorough car interior cleaning.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/1457/collection.png',
                    'images' => '/storage/media/1452/1.png,/storage/media/1453/2.png,/storage/media/1454/3.png,/storage/media/1455/4.png,/storage/media/1456/5.png'
                ],
                [
                    'name' => 'Smart Car HUD Speed Display',
                    'description' => 'Head-up display showing speed and driving information on windshield.',
                    'specifications' => '<ul><li>HUD projection</li><li>Speed display</li><li>OBD2 connection</li><li>Auto brightness</li><li>Multiple display modes</li></ul>',
                    'details' => '<p>Smart car HUD displaying speed and driving information directly on windshield with OBD2 connection and automatic brightness adjustment.</p>',
                    'price' => 119.99,
                    'cover_image' => '/storage/media/1463/collection.png',
                    'images' => '/storage/media/1458/1.png,/storage/media/1459/2.png,/storage/media/1460/3.png,/storage/media/1461/4.png,/storage/media/1462/5.png'
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
                    'cover_image' => '/storage/media/1481/collection.png',
                    'images' => '/storage/media/1476/1.png,/storage/media/1477/2.png,/storage/media/1478/3.png,/storage/media/1479/4.png,/storage/media/1480/5.png'
                ],
                [
                    'name' => 'Heavy Duty Car Steering Wheel Lock',
                    'description' => 'Heavy-duty steering wheel lock for maximum vehicle security.',
                    'specifications' => '<ul><li>Heavy-duty steel</li><li>Universal fit</li><li>Visible deterrent</li><li>Easy installation</li><li>Anti-theft protection</li></ul>',
                    'details' => '<p>Heavy-duty steering wheel lock made from reinforced steel providing maximum security and visible deterrent against vehicle theft.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/1487/collection.png',
                    'images' => '/storage/media/1482/1.png,/storage/media/1483/2.png,/storage/media/1484/3.png,/storage/media/1485/4.png,/storage/media/1486/5.png'
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
                    'cover_image' => '/storage/media/1493/collection.png',
                    'images' => '/storage/media/1488/1.png,/storage/media/1489/2.png,/storage/media/1490/3.png,/storage/media/1491/4.png,/storage/media/1492/5.png'
                ],
                [
                    'name' => 'Fire Extinguisher ABC Dry Powder',
                    'description' => 'ABC dry powder fire extinguisher for comprehensive fire protection.',
                    'specifications' => '<ul><li>ABC dry powder</li><li>Multi-class protection</li><li>Pressure gauge</li><li>Wall bracket included</li><li>Certified safety</li></ul>',
                    'details' => '<p>ABC dry powder fire extinguisher providing multi-class fire protection for vehicles. Includes pressure gauge and wall mounting bracket for easy access.</p>',
                    'price' => 59.99,
                    'cover_image' => '/storage/media/1499/collection.png',
                    'images' => '/storage/media/1494/1.png,/storage/media/1495/2.png,/storage/media/1496/3.png,/storage/media/1497/4.png,/storage/media/1498/5.png'
                ],
                [
                    'name' => 'Emergency Health Kit',
                    'description' => 'Comprehensive emergency health kit for roadside medical situations.',
                    'specifications' => '<ul><li>Comprehensive supplies</li><li>Compact design</li><li>Emergency medications</li><li>Instruction manual</li><li>Durable case</li></ul>',
                    'details' => '<p>Comprehensive emergency health kit containing essential medical supplies for roadside emergencies. Compact design with durable carrying case.</p>',
                    'price' => 89.99,
                    'cover_image' => '/storage/media/1505/collection.png',
                    'images' => '/storage/media/1500/1.png,/storage/media/1501/2.png,/storage/media/1502/3.png,/storage/media/1503/4.png,/storage/media/1504/5.png'
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
                    'cover_image' => '/storage/media/1511/collection.png',
                    'images' => '/storage/media/1506/1.png,/storage/media/1507/2.png,/storage/media/1508/3.png,/storage/media/1509/4.png,/storage/media/1510/5.png'
                ],
                [
                    'name' => 'Multipurpose Reflective Triangles Emergency',
                    'description' => 'Reflective emergency triangles for roadside safety and visibility.',
                    'specifications' => '<ul><li>High visibility</li><li>Reflective material</li><li>Foldable design</li><li>Stable base</li><li>Set of 3 triangles</li></ul>',
                    'details' => '<p>Multipurpose reflective emergency triangles providing high visibility for roadside safety. Foldable design with stable base, set of 3 triangles included.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/1517/collection.png',
                    'images' => '/storage/media/1512/1.png,/storage/media/1513/2.png,/storage/media/1514/3.png,/storage/media/1515/4.png,/storage/media/1516/5.png'
                ],
                [
                    'name' => 'Car Seat Belt Extensions Straps',
                    'description' => 'Adjustable seat belt extension straps for enhanced comfort and safety.',
                    'specifications' => '<ul><li>Adjustable length</li><li>Safety certified</li><li>Universal compatibility</li><li>Durable materials</li><li>Easy installation</li></ul>',
                    'details' => '<p>Adjustable seat belt extension straps providing enhanced comfort and safety. Safety certified with universal compatibility and durable construction.</p>',
                    'price' => 29.99,
                    'cover_image' => '/storage/media/1523/collection.png',
                    'images' => '/storage/media/1518/1.png,/storage/media/1519/2.png,/storage/media/1520/3.png,/storage/media/1521/4.png,/storage/media/1522/5.png'
                ],
                [
                    'name' => 'Galaxy Tyre Air Pump',
                    'description' => 'Portable tire air pump with digital display and auto shut-off.',
                    'specifications' => '<ul><li>Digital display</li><li>Auto shut-off</li><li>Portable design</li><li>12V power</li><li>Multiple attachments</li></ul>',
                    'details' => '<p>Galaxy portable tire air pump with digital display and auto shut-off feature. 12V power operation with multiple attachments for various inflation needs.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/1529/collection.png',
                    'images' => '/storage/media/1524/1.png,/storage/media/1525/2.png,/storage/media/1526/3.png,/storage/media/1527/4.png,/storage/media/1528/5.png'
                ],
                [
                    'name' => 'Smart Battery Jump Starter and Tyre Inflator',
                    'description' => 'Multi-function device combining jump starter and tire inflator capabilities.',
                    'specifications' => '<ul><li>Jump starter function</li><li>Tire inflator</li><li>USB charging ports</li><li>LED flashlight</li><li>Safety protection</li></ul>',
                    'details' => '<p>Smart multi-function device combining battery jump starter and tire inflator with USB charging ports, LED flashlight, and comprehensive safety protection.</p>',
                    'price' => 199.99,
                    'cover_image' => '/storage/media/1535/collection.png',
                    'images' => '/storage/media/1530/1.png,/storage/media/1531/2.png,/storage/media/1532/3.png,/storage/media/1533/4.png,/storage/media/1534/5.png'
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
                    'cover_image' => '/storage/media/1541/collection.png',
                    'images' => '/storage/media/1536/1.png,/storage/media/1537/2.png,/storage/media/1538/3.png,/storage/media/1539/4.png,/storage/media/1540/5.png'
                ],
                [
                    'name' => 'Microfiber Car Cleaning Cloth',
                    'description' => 'Ultra-soft microfiber cleaning cloth for scratch-free car care.',
                    'specifications' => '<ul><li>Ultra-soft microfiber</li><li>Scratch-free cleaning</li><li>Highly absorbent</li><li>Machine washable</li><li>Lint-free</li></ul>',
                    'details' => '<p>Ultra-soft microfiber cleaning cloth designed for scratch-free car care. Highly absorbent and machine washable for long-lasting use.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/1547/collection.png',
                    'images' => '/storage/media/1542/1.png,/storage/media/1543/2.png,/storage/media/1544/3.png,/storage/media/1545/4.png,/storage/media/1546/5.png'
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
                    'cover_image' => '/storage/media/1553/collection.png',
                    'images' => '/storage/media/1548/1.png,/storage/media/1549/2.png,/storage/media/1550/3.png,/storage/media/1551/4.png,/storage/media/1552/5.png'
                ],
                [
                    'name' => 'Hybrid Solutions Ceramic Polish & Wax',
                    'description' => 'Advanced ceramic polish and wax for superior protection and shine.',
                    'specifications' => '<ul><li>Ceramic technology</li><li>Long-lasting protection</li><li>High gloss finish</li><li>UV protection</li><li>Easy application</li></ul>',
                    'details' => '<p>Advanced hybrid ceramic polish and wax providing superior protection and high gloss finish. Long-lasting formula with UV protection and easy application.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/1559/collection.png',
                    'images' => '/storage/media/1554/1.png,/storage/media/1555/2.png,/storage/media/1556/3.png,/storage/media/1557/4.png,/storage/media/1558/5.png'
                ],
                [
                    'name' => 'Wheel and Tyre Cleaner Concentrate',
                    'description' => 'Concentrated wheel and tire cleaner for deep cleaning and restoration.',
                    'specifications' => '<ul><li>Concentrated formula</li><li>Deep cleaning action</li><li>Safe for all wheels</li><li>Removes brake dust</li><li>Biodegradable</li></ul>',
                    'details' => '<p>Concentrated wheel and tire cleaner with deep cleaning action safe for all wheel types. Effectively removes brake dust and grime while being biodegradable.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/1565/collection.png',
                    'images' => '/storage/media/1560/1.png,/storage/media/1561/2.png,/storage/media/1562/3.png,/storage/media/1563/4.png,/storage/media/1564/5.png'
                ],
                [
                    'name' => 'Lemongrass Air Freshener for Car',
                    'description' => 'Natural lemongrass air freshener for long-lasting car fragrance.',
                    'specifications' => '<ul><li>Natural lemongrass scent</li><li>Long-lasting fragrance</li><li>Non-toxic formula</li><li>Easy installation</li><li>Adjustable intensity</li></ul>',
                    'details' => '<p>Natural lemongrass air freshener providing long-lasting fragrance with non-toxic formula. Easy installation with adjustable intensity control.</p>',
                    'price' => 14.99,
                    'cover_image' => '/storage/media/1571/collection.png',
                    'images' => '/storage/media/1566/1.png,/storage/media/1567/2.png,/storage/media/1568/3.png,/storage/media/1569/4.png,/storage/media/1570/5.png'
                ],
                [
                    'name' => 'Essential Car Care Kit',
                    'description' => 'Complete car care kit with essential cleaning and maintenance products.',
                    'specifications' => '<ul><li>Complete care kit</li><li>Multiple products included</li><li>Professional quality</li><li>Storage case</li><li>Instruction guide</li></ul>',
                    'details' => '<p>Complete essential car care kit containing multiple professional-quality cleaning and maintenance products with storage case and instruction guide.</p>',
                    'price' => 89.99,
                    'cover_image' => '/storage/media/1577/collection.png',
                    'images' => '/storage/media/1572/1.png,/storage/media/1573/2.png,/storage/media/1574/3.png,/storage/media/1575/4.png,/storage/media/1576/5.png'
                ],
                [
                    'name' => 'Vehicle Scratch Repair',
                    'description' => 'Professional scratch repair solution for vehicle paint restoration.',
                    'specifications' => '<ul><li>Professional formula</li><li>Easy application</li><li>Color matching</li><li>Permanent repair</li><li>Clear coat safe</li></ul>',
                    'details' => '<p>Professional vehicle scratch repair solution with easy application and color matching technology for permanent paint restoration. Safe for clear coats.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/1583/collection.png',
                    'images' => '/storage/media/1578/1.png,/storage/media/1579/2.png,/storage/media/1580/3.png,/storage/media/1581/4.png,/storage/media/1582/5.png'
                ],
                [
                    'name' => 'Windshield Washer Fluid Concentrate',
                    'description' => 'Concentrated windshield washer fluid for crystal clear visibility.',
                    'specifications' => '<ul><li>Concentrated formula</li><li>All-season protection</li><li>Streak-free cleaning</li><li>Anti-freeze properties</li><li>Biodegradable</li></ul>',
                    'details' => '<p>Concentrated windshield washer fluid providing all-season protection with streak-free cleaning and anti-freeze properties. Biodegradable formula.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/1589/collection.png',
                    'images' => '/storage/media/1584/1.png,/storage/media/1585/2.png,/storage/media/1586/3.png,/storage/media/1587/4.png,/storage/media/1588/5.png'
                ],
                [
                    'name' => 'Microfiber Car Cleaning Cloth and Wash Kit',
                    'description' => 'Complete microfiber cleaning cloth and wash kit for comprehensive car care.',
                    'specifications' => '<ul><li>Multiple microfiber cloths</li><li>Wash mitt included</li><li>Different cloth types</li><li>Machine washable</li><li>Storage bag</li></ul>',
                    'details' => '<p>Complete microfiber cleaning cloth and wash kit with multiple cloth types and wash mitt for comprehensive car care. Includes storage bag and machine washable.</p>',
                    'price' => 44.99,
                    'cover_image' => '/storage/media/1595/collection.png',
                    'images' => '/storage/media/1590/1.png,/storage/media/1591/2.png,/storage/media/1592/3.png,/storage/media/1593/4.png,/storage/media/1594/5.png'
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
                    'cover_image' => '/storage/media/1596/collection.png',
                    'images' => '/storage/media/1601/1.png,/storage/media/1597/5.png,/storage/media/1598/4.png,/storage/media/1599/3.png,/storage/media/1600/2.png'
                ],
                [
                    'name' => 'Babique Elephant Sitting Plush Soft Toy',
                    'description' => 'Adorable sitting elephant plush toy with realistic details and soft texture.',
                    'specifications' => '<ul><li>Sitting position design</li><li>Realistic elephant features</li><li>Super soft plush</li><li>Safe materials</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Babique elephant plush toy in sitting position with realistic features and super soft texture. Made from safe materials perfect for children of all ages.</p>',
                    'price' => 45.99,
                    'cover_image' => '/storage/media/1602/collection.png',
                    'images' => '/storage/media/1607/1.png,/storage/media/1606/2.png,/storage/media/1605/3.png,/storage/media/1604/4.png,/storage/media/1603/5.png'
                ],
                [
                    'name' => 'Brown Cat Soft Toy for Kids',
                    'description' => 'Cute brown cat soft toy with realistic features and cuddly design.',
                    'specifications' => '<ul><li>Realistic cat design</li><li>Brown plush fur</li><li>Soft and cuddly</li><li>Child-safe materials</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Adorable brown cat soft toy with realistic features and cuddly design. Made from child-safe materials with soft plush fur for comfortable play.</p>',
                    'price' => 29.99,
                    'cover_image' => '/storage/media/1608/collection.png',
                    'images' => '/storage/media/1613/1.png,/storage/media/1612/2.png,/storage/media/1611/3.png,/storage/media/1610/4.png,/storage/media/1609/5.png'
                ],
                [
                    'name' => 'Cute Plush Pillow Stuffed Soft Toy',
                    'description' => 'Multi-functional plush pillow that doubles as a soft toy for comfort.',
                    'specifications' => '<ul><li>Dual-purpose design</li><li>Pillow and toy function</li><li>Ultra-soft material</li><li>Hypoallergenic filling</li><li>Machine washable</li></ul>',
                    'details' => '<p>Cute plush pillow that serves as both a comfortable pillow and adorable soft toy. Ultra-soft material with hypoallergenic filling and machine washable.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/1614/collection.png',
                    'images' => '/storage/media/1619/1.png,/storage/media/1618/2.png,/storage/media/1617/3.png,/storage/media/1616/4.png,/storage/media/1615/5.png'
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
                    'cover_image' => '/storage/media/1620/collection.png',
                    'images' => '/storage/media/1625/1.png,/storage/media/1624/2.png,/storage/media/1623/3.png,/storage/media/1622/4.png,/storage/media/1621/5.png'
                ],
                [
                    'name' => 'Monkey Super Cute Plushie Soft Toys',
                    'description' => 'Super cute monkey plushie with adorable features and soft texture.',
                    'specifications' => '<ul><li>Adorable monkey design</li><li>Super soft plush</li><li>Cute facial features</li><li>Safe for children</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Super cute monkey plushie with adorable features and incredibly soft texture. Safe for children with cute facial features and premium plush material.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/1626/collection.png',
                    'images' => '/storage/media/1631/1.png,/storage/media/1630/2.png,/storage/media/1629/3.png,/storage/media/1628/4.png,/storage/media/1627/5.png'
                ],
                [
                    'name' => 'Stuffed Toys for Kids Set of 3 Mini Teddy Toys',
                    'description' => 'Set of 3 mini teddy bear toys perfect for collection and play.',
                    'specifications' => '<ul><li>Set of 3 mini teddies</li><li>Different colors</li><li>Compact size</li><li>Soft plush material</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Adorable set of 3 mini teddy bear toys in different colors. Compact size perfect for collection, travel, and imaginative play with soft plush material.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/1632/collection.png',
                    'images' => '/storage/media/1637/1.png,/storage/media/1636/2.png,/storage/media/1635/3.png,/storage/media/1634/4.png,/storage/media/1633/5.png'
                ],
                [
                    'name' => 'Giant Teddy Bears Big Cute Plush Teddy Bear',
                    'description' => 'Giant-sized cute plush teddy bear for ultimate cuddling experience.',
                    'specifications' => '<ul><li>Giant size</li><li>Ultra-soft plush</li><li>Cute design</li><li>Premium quality</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Giant-sized cute plush teddy bear providing the ultimate cuddling experience. Ultra-soft plush material with premium quality construction and adorable design.</p>',
                    'price' => 149.99,
                    'cover_image' => '/storage/media/1638/collection.png',
                    'images' => '/storage/media/1643/1.png,/storage/media/1642/2.png,/storage/media/1641/3.png,/storage/media/1640/4.png,/storage/media/1639/5.png'
                ],
                [
                    'name' => 'Plush Stuffed Animal Toy',
                    'description' => 'Versatile plush stuffed animal toy available in various animal designs.',
                    'specifications' => '<ul><li>Various animal options</li><li>Soft stuffed design</li><li>High-quality plush</li><li>Safe materials</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Versatile plush stuffed animal toy available in various cute animal designs. High-quality plush material with safe construction for children of all ages.</p>',
                    'price' => 42.99,
                    'cover_image' => '/storage/media/1644/collection.png',
                    'images' => '/storage/media/1649/1.png,/storage/media/1648/2.png,/storage/media/1647/3.png,/storage/media/1646/4.png,/storage/media/1645/5.png'
                ],
                [
                    'name' => 'Puppets Tommy Glove Puppet',
                    'description' => 'Interactive Tommy glove puppet for storytelling and imaginative play.',
                    'specifications' => '<ul><li>Glove puppet design</li><li>Interactive play</li><li>Soft fabric construction</li><li>Easy to use</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive Tommy glove puppet perfect for storytelling and imaginative play. Soft fabric construction with easy-to-use design for engaging puppet shows.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/1650/collection.png',
                    'images' => '/storage/media/1655/1.png,/storage/media/1654/2.png,/storage/media/1653/3.png,/storage/media/1652/4.png,/storage/media/1651/5.png'
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
                    'cover_image' => '/storage/media/1661/collection.png',
                    'images' => '/storage/media/1656/1.png,/storage/media/1657/2.png,/storage/media/1658/3.png,/storage/media/1659/4.png,/storage/media/1660/5.png'
                ],
                [
                    'name' => 'Plastic Alphabet Number Puzzle Toy',
                    'description' => 'Interactive plastic puzzle featuring alphabet letters and numbers for learning.',
                    'specifications' => '<ul><li>Alphabet and number pieces</li><li>Durable plastic construction</li><li>Bright colors</li><li>Easy-grip pieces</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive plastic puzzle toy combining alphabet letters and numbers for comprehensive early learning. Durable construction with bright colors and easy-grip pieces.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/1662/collection.png',
                    'images' => '/storage/media/1667/1.png,/storage/media/1666/2.png,/storage/media/1665/3.png,/storage/media/1664/4.png,/storage/media/1663/5.png'
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
                    'cover_image' => '/storage/media/1668/collection.png',
                    'images' => '/storage/media/1673/1.png,/storage/media/1672/2.png,/storage/media/1671/3.png,/storage/media/1670/4.png,/storage/media/1669/5.png'
                ],
                [
                    'name' => 'Ultimate Science STEM Learning Educational Toys',
                    'description' => 'Comprehensive STEM learning kit with science experiments and educational activities.',
                    'specifications' => '<ul><li>100+ science experiments</li><li>STEM learning focus</li><li>Safety tested materials</li><li>Detailed instruction guide</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Ultimate science STEM learning kit featuring over 100 experiments and educational activities. Comprehensive instruction guide with safety-tested materials for hands-on learning.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/1674/collection.png',
                    'images' => '/storage/media/1679/1.png,/storage/media/1678/2.png,/storage/media/1677/3.png,/storage/media/1676/4.png,/storage/media/1675/5.png'
                ],
                [
                    'name' => 'Montessori Busy Board for Toddlers',
                    'description' => 'Montessori-inspired busy board with various activities for toddler development.',
                    'specifications' => '<ul><li>Montessori method</li><li>Multiple activity stations</li><li>Fine motor skill development</li><li>Safe materials</li><li>Ages 18 months-4 years</li></ul>',
                    'details' => '<p>Montessori-inspired busy board featuring multiple activity stations designed to develop fine motor skills and cognitive abilities in toddlers through hands-on exploration.</p>',
                    'price' => 59.99,
                    'cover_image' => '/storage/media/1680/collection.png',
                    'images' => '/storage/media/1685/1.png,/storage/media/1684/2.png,/storage/media/1683/3.png,/storage/media/1682/4.png,/storage/media/1681/5.png'
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
                    'cover_image' => '/storage/media/1686/collection.png',
                    'images' => '/storage/media/1691/1.png,/storage/media/1690/2.png,/storage/media/1689/3.png,/storage/media/1688/4.png,/storage/media/1687/5.png'
                ],
                [
                    'name' => 'Wooden Memory Chess Color Matching Game',
                    'description' => 'Wooden memory and color matching game combining chess elements with learning.',
                    'specifications' => '<ul><li>Natural wood construction</li><li>Memory training</li><li>Color matching elements</li><li>Chess-inspired design</li><li>Ages 4+ years</li></ul>',
                    'details' => '<p>Wooden memory chess game combining color matching and memory training elements. Natural wood construction with chess-inspired design for cognitive development.</p>',
                    'price' => 44.99,
                    'cover_image' => '/storage/media/1692/collection.png',
                    'images' => '/storage/media/1715/1.png,/storage/media/1714/2.png,/storage/media/1713/3.png,/storage/media/1712/4.png,/storage/media/1711/5.png'
                ],
                [
                    'name' => 'Children Learning & Puzzle Cards',
                    'description' => 'Educational puzzle cards designed for children learning and development.',
                    'specifications' => '<ul><li>Educational content</li><li>Puzzle format</li><li>Durable card material</li><li>Age-appropriate designs</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Educational puzzle cards specifically designed for children learning and development. Durable card material with age-appropriate designs and educational content.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/1698/collection.png',
                    'images' => '/storage/media/1703/1.png,/storage/media/1702/2.png,/storage/media/1701/3.png,/storage/media/1700/4.png,/storage/media/1699/5.png'
                ],
                [
                    'name' => 'Kids Alphabet & Number Learning Board',
                    'description' => 'Interactive learning board featuring alphabet letters and numbers for early education.',
                    'specifications' => '<ul><li>Alphabet and numbers</li><li>Interactive features</li><li>Durable construction</li><li>Bright colors</li><li>Ages 2+ years</li></ul>',
                    'details' => '<p>Interactive learning board combining alphabet letters and numbers for comprehensive early education. Features bright colors and durable construction for long-lasting use.</p>',
                    'price' => 29.99,
                    'cover_image' => '/storage/media/1704/collection.png',
                    'images' => '/storage/media/1709/1.png,/storage/media/1708/2.png,/storage/media/1707/3.png,/storage/media/1706/4.png,/storage/media/1705/5.png'
                ],
                [
                    'name' => 'Science Volcano Lab for Kids',
                    'description' => 'Exciting volcano science lab kit for hands-on geological learning and experiments.',
                    'specifications' => '<ul><li>Volcano model included</li><li>Safe experiment materials</li><li>Educational guide</li><li>Hands-on learning</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Exciting science volcano lab kit providing hands-on geological learning through safe experiments. Includes volcano model and comprehensive educational guide for interactive learning.</p>',
                    'price' => 54.99,
                    'cover_image' => '/storage/media/1710/collection.png',
                    'images' => '/storage/media/1715/1.png,/storage/media/1714/2.png,/storage/media/1713/3.png,/storage/media/1712/4.png,/storage/media/1711/5.png'
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
                    "cover_image" => "/storage/media/1716/collection.png",
                    "images" => "/storage/media/1721/1.png,/storage/media/1720/2.png,/storage/media/1719/3.png,/storage/media/1718/4.png,/storage/media/1717/5.png"
                ],
                [
                    "name" => "Blue Fox Cartoon Character",
                    "description" => "Adorable blue fox cartoon character figure with moveable parts.",
                    "specifications" => "<ul><li>Cartoon design</li><li>Moveable parts</li><li>Bright blue color</li><li>Child-safe materials</li><li>Ages 3+ years</li></ul>",
                    "details" => "<p>Adorable blue fox cartoon character figure with moveable parts and bright blue color. Made from child-safe materials perfect for imaginative play.</p>",
                    "price" => 24.99,
                    "cover_image" => "/storage/media/1722/collection.png",
                    "images" => "/storage/media/1727/1.png,/storage/media/1726/2.png,/storage/media/1725/3.png,/storage/media/1724/4.png,/storage/media/1723/5.png"
                ],
                [
                    "name" => "Building & Constructions Playsets",
                    "description" => "Construction-themed playset with building blocks and construction vehicles.",
                    "specifications" => "<ul><li>Building blocks included</li><li>Construction vehicles</li><li>Worker figures</li><li>Realistic accessories</li><li>Ages 5+ years</li></ul>",
                    "details" => "<p>Construction-themed playset featuring building blocks, construction vehicles, and worker figures with realistic accessories for creative building play.</p>",
                    "price" => 69.99,
                    "cover_image" => "/storage/media/1728/collection.png",
                    "images" => "/storage/media/1733/1.png,/storage/media/1732/2.png,/storage/media/1731/3.png,/storage/media/1730/4.png,/storage/media/1729/5.png"
                ],
                [
                    "name" => "Home Miniature Playset",
                    "description" => "Detailed miniature home playset with furniture and family figures.",
                    "specifications" => "<ul><li>Miniature home design</li><li>Furniture included</li><li>Family figures</li><li>Multiple rooms</li><li>Ages 3+ years</li></ul>",
                    "details" => "<p>Detailed miniature home playset with furniture and family figures. Features multiple rooms for realistic home play and storytelling adventures.</p>",
                    "price" => 89.99,
                    "cover_image" => "/storage/media/1734/collection.png",
                    "images" => "/storage/media/1739/1.png,/storage/media/1738/2.png,/storage/media/1737/3.png,/storage/media/1736/4.png,/storage/media/1735/5.png"
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
                    "cover_image" => "/storage/media/1740/collection.png",
                    "images" => "/storage/media/1745/1.png,/storage/media/1744/2.png,/storage/media/1743/3.png,/storage/media/1742/4.png,/storage/media/1741/5.png"
                ],
                [
                    "name" => "Magic Ruins Explorer Playset",
                    "description" => "Adventure playset featuring magic ruins with explorer figures and treasures.",
                    "specifications" => "<ul><li>Magic ruins setting</li><li>Explorer figures</li><li>Hidden treasures</li><li>Adventure accessories</li><li>Ages 5+ years</li></ul>",
                    "details" => "<p>Adventure playset featuring magic ruins setting with explorer figures and hidden treasures. Includes adventure accessories for exciting exploration play.</p>",
                    "price" => 79.99,
                    "cover_image" => "/storage/media/1746/collection.png",
                    "images" => "/storage/media/1751/1.png,/storage/media/1750/2.png,/storage/media/1749/3.png,/storage/media/1748/4.png,/storage/media/1747/5.png"
                ],
                [
                    "name" => "Iron Ronin Shadow Warrior",
                    "description" => "Ninja warrior figure with iron armor and shadow combat accessories.",
                    "specifications" => "<ul><li>Iron armor design</li><li>Shadow combat theme</li><li>Ninja accessories</li><li>Articulated joints</li><li>Ages 8+ years</li></ul>",
                    "details" => "<p>Ninja warrior figure with iron armor design and shadow combat theme. Features ninja accessories and articulated joints for dynamic action poses.</p>",
                    "price" => 44.99,
                    "cover_image" => "/storage/media/1752/collection.png",
                    "images" => "/storage/media/1757/1.png,/storage/media/1756/2.png,/storage/media/1755/3.png,/storage/media/1754/4.png,/storage/media/1753/5.png"
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
                    "cover_image" => "/storage/media/1758/collection.png",
                    "images" => "/storage/media/1763/1.png,/storage/media/1762/2.png,/storage/media/1761/3.png,/storage/media/1760/4.png,/storage/media/1759/5.png"
                ],
                [
                    "name" => "Damage Scorpios Rex Dinosaur Figure",
                    "description" => "Fierce Scorpios Rex dinosaur figure with battle damage details and accessories.",
                    "specifications" => "<ul><li>Scorpios Rex design</li><li>Battle damage details</li><li>Moveable parts</li><li>Realistic features</li><li>Ages 4+ years</li></ul>",
                    "details" => "<p>Fierce Scorpios Rex dinosaur figure with battle damage details and moveable parts. Realistic features for prehistoric adventures and dinosaur battles.</p>",
                    "price" => 54.99,
                    "cover_image" => "/storage/media/1764/collection.png",
                    "images" => "/storage/media/1769/7.png,/storage/media/1768/8.png,/storage/media/1767/9.png,/storage/media/1766/10.png,/storage/media/1765/11.png"
                ],
                [
                    "name" => "Construction Site Building Blocks Set",
                    "description" => "Complete construction site building blocks set with vehicles and workers.",
                    "specifications" => "<ul><li>Building blocks included</li><li>Construction vehicles</li><li>Worker figures</li><li>Site accessories</li><li>Ages 4+ years</li></ul>",
                    "details" => "<p>Complete construction site building blocks set featuring construction vehicles, worker figures, and site accessories for realistic construction play.</p>",
                    "price" => 64.99,
                    "cover_image" => "/storage/media/1770/collection.png",
                    "images" => "/storage/media/1775/12.png,/storage/media/1774/13.png,/storage/media/1773/14.png,/storage/media/1772/15.png,/storage/media/1771/16.png"
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
                    'cover_image' => '/storage/media/1776/collection.png',
                    'images' => '/storage/media/1781/1.png,/storage/media/1780/2.png,/storage/media/1779/3.png,/storage/media/1778/4.png,/storage/media/1777/5.png'
                ],
                [
                    'name' => 'Kidsmate Rider Pro Kick Scooter',
                    'description' => 'Professional kick scooter with adjustable height and smooth wheels.',
                    'specifications' => '<ul><li>Adjustable height</li><li>Smooth rolling wheels</li><li>Lightweight design</li><li>Safety brake</li><li>Ages 5+ years</li></ul>',
                    'details' => '<p>Kidsmate Rider Pro kick scooter with adjustable height and smooth rolling wheels. Lightweight design with safety brake for secure riding.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/1782/collection.png',
                    'images' => '/storage/media/1787/1.png,/storage/media/1786/2.png,/storage/media/1785/3.png,/storage/media/1784/4.png,/storage/media/1783/5.png'
                ],
                [
                    'name' => 'Soccer Ball Black White Football',
                    'description' => 'Classic black and white soccer ball for outdoor sports and games.',
                    'specifications' => '<ul><li>Classic black white design</li><li>Official size and weight</li><li>Durable construction</li><li>Weather resistant</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Classic black and white soccer ball with official size and weight. Durable construction and weather resistant for outdoor play and sports.</p>',
                    'price' => 24.99,
                    'cover_image' => '/storage/media/1788/collection.png',
                    'images' => '/storage/media/1793/1.png,/storage/media/1792/2.png,/storage/media/1791/3.png,/storage/media/1790/4.png,/storage/media/1789/5.png'
                ],
                [
                    'name' => 'Skipping Rope with Built-In Counter',
                    'description' => 'Digital skipping rope with built-in counter for tracking jumps and exercise.',
                    'specifications' => '<ul><li>Built-in digital counter</li><li>Adjustable length</li><li>Comfortable handles</li><li>Exercise tracking</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Digital skipping rope with built-in counter for tracking jumps and exercise progress. Adjustable length with comfortable handles for fitness fun.</p>',
                    'price' => 19.99,
                    'cover_image' => '/storage/media/1794/collection.png',
                    'images' => '/storage/media/1799/1.png,/storage/media/1798/2.png,/storage/media/1797/3.png,/storage/media/1796/4.png,/storage/media/1795/5.png'
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
                    'cover_image' => '/storage/media/1800/collection.png',
                    'images' => '/storage/media/1805/1.png,/storage/media/1804/2.png,/storage/media/1803/3.png,/storage/media/1802/4.png,/storage/media/1801/5.png'
                ],
                [
                    'name' => 'Kids Crab Water Slide Playset',
                    'description' => 'Fun crab-themed water slide playset for outdoor summer play and water activities.',
                    'specifications' => '<ul><li>Crab-themed design</li><li>Water slide feature</li><li>Outdoor play</li><li>Summer activities</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Exciting kids crab water slide playset featuring fun crab theme with water slide for outdoor summer play and refreshing water activities.</p>',
                    'price' => 49.99,
                    'cover_image' => '/storage/media/1806/collection.png',
                    'images' => '/storage/media/1811/1.png,/storage/media/1810/2.png,/storage/media/1809/3.png,/storage/media/1808/4.png,/storage/media/1807/5.png'
                ],
                [
                    'name' => 'Colorful Kids Slide',
                    'description' => 'Bright and colorful kids slide for safe indoor and outdoor playground fun.',
                    'specifications' => '<ul><li>Colorful design</li><li>Safe construction</li><li>Indoor outdoor use</li><li>Playground fun</li><li>Ages 2+ years</li></ul>',
                    'details' => '<p>Bright and colorful kids slide with safe construction for indoor and outdoor use. Perfect playground equipment for safe and fun sliding activities.</p>',
                    'price' => 44.99,
                    'cover_image' => '/storage/media/1812/collection.png',
                    'images' => '/storage/media/1817/1.png,/storage/media/1816/2.png,/storage/media/1815/3.png,/storage/media/1814/4.png,/storage/media/1813/5.png'
                ],
                [
                    'name' => 'Webby Kids Jungle Adventure Play Tent House',
                    'description' => 'Jungle-themed adventure play tent house for indoor and outdoor fun.',
                    'specifications' => '<ul><li>Jungle adventure theme</li><li>Easy setup</li><li>Indoor outdoor use</li><li>Spacious interior</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Webby Kids jungle adventure play tent house with easy setup for indoor and outdoor use. Spacious interior with jungle theme for imaginative play.</p>',
                    'price' => 59.99,
                    'cover_image' => '/storage/media/1818/collection.png',
                    'images' => '/storage/media/1823/1.png,/storage/media/1822/2.png,/storage/media/1821/3.png,/storage/media/1820/4.png,/storage/media/1819/5.png'
                ],
                [
                    'name' => 'Eagle Strike Flying Disc',
                    'description' => 'Aerodynamic flying disc for outdoor throwing games and sports.',
                    'specifications' => '<ul><li>Aerodynamic design</li><li>Durable material</li><li>Perfect weight balance</li><li>Outdoor sports</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Eagle Strike flying disc with aerodynamic design and perfect weight balance. Durable material construction for outdoor throwing games and sports.</p>',
                    'price' => 14.99,
                    'cover_image' => '/storage/media/1824/collection.png',
                    'images' => '/storage/media/1829/1.png,/storage/media/1828/2.png,/storage/media/1827/3.png,/storage/media/1826/4.png,/storage/media/1825/5.png'
                ],
                [
                    'name' => 'Summer Splash Kids Pool',
                    'description' => 'Inflatable kids pool for summer water fun and outdoor play.',
                    'specifications' => '<ul><li>Inflatable design</li><li>Easy setup</li><li>Summer water fun</li><li>Safe materials</li><li>Ages 2+ years</li></ul>',
                    'details' => '<p>Summer Splash inflatable kids pool with easy setup for summer water fun. Made from safe materials perfect for outdoor water play and cooling off.</p>',
                    'price' => 39.99,
                    'cover_image' => '/storage/media/1830/collection.png',
                    'images' => '/storage/media/1835/1.png,/storage/media/1834/2.png,/storage/media/1833/3.png,/storage/media/1832/4.png,/storage/media/1831/5.png'
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
                    'cover_image' => '/storage/media/1836/collection.png',
                    'images' => '/storage/media/1841/1.png,/storage/media/1840/2.png,/storage/media/1839/3.png,/storage/media/1838/4.png,/storage/media/1837/5.png'
                ],
                [
                    'name' => 'Mirana Air Football Smart Red',
                    'description' => 'Smart air football with LED lights and hover technology.',
                    'specifications' => '<ul><li>Hover technology</li><li>LED lights</li><li>Rechargeable battery</li><li>Safe foam bumpers</li><li>Ages 5+ years</li></ul>',
                    'details' => '<p>Mirana smart air football with hover technology and LED lights. Safe foam bumpers and rechargeable battery for indoor flying fun.</p>',
                    'price' => 45.99,
                    'cover_image' => '/storage/media/1842/collection.png',
                    'images' => '/storage/media/1847/1.png,/storage/media/1846/2.png,/storage/media/1845/3.png,/storage/media/1844/4.png,/storage/media/1843/5.png'
                ],
                [
                    'name' => 'Interactive Music Piano Toy for Kids',
                    'description' => 'Electronic piano toy with interactive music features and learning modes.',
                    'specifications' => '<ul><li>Interactive music features</li><li>Learning modes</li><li>Multiple instruments</li><li>Recording function</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Interactive music piano toy with learning modes and multiple instrument sounds. Features recording function for creative musical play.</p>',
                    'price' => 79.99,
                    'cover_image' => '/storage/media/1848/collection.png',
                    'images' => '/storage/media/1853/1.png,/storage/media/1852/2.png,/storage/media/1851/3.png,/storage/media/1850/4.png,/storage/media/1849/5.png'
                ],
                [
                    'name' => 'Smart Talking Robot Toy',
                    'description' => 'Advanced talking robot with AI features and interactive conversations.',
                    'specifications' => '<ul><li>AI conversation</li><li>Voice recognition</li><li>Educational content</li><li>Rechargeable battery</li><li>Ages 6+ years</li></ul>',
                    'details' => '<p>Smart talking robot toy with AI conversation features and voice recognition. Educational content and rechargeable battery for hours of interactive play.</p>',
                    'price' => 149.99,
                    'cover_image' => '/storage/media/1854/collection.png',
                    'images' => '/storage/media/1859/1.png,/storage/media/1858/2.png,/storage/media/1857/3.png,/storage/media/1856/4.png,/storage/media/1855/5.png'
                ],
                [
                    'name' => 'Big Face Fox Night Light for Kids',
                    'description' => 'Cute fox-shaped night light with soft LED illumination for bedtime comfort.',
                    'specifications' => '<ul><li>Fox design</li><li>Soft LED light</li><li>Touch control</li><li>Rechargeable battery</li><li>Ages 0+ years</li></ul>',
                    'details' => '<p>Big face fox night light with cute design and soft LED illumination. Touch control and rechargeable battery for bedtime comfort and security.</p>',
                    'price' => 34.99,
                    'cover_image' => '/storage/media/1860/collection.png',
                    'images' => '/storage/media/1865/1.png,/storage/media/1864/2.png,/storage/media/1863/3.png,/storage/media/1862/4.png,/storage/media/1861/5.png'
                ],
                [
                    'name' => 'Cute Robot Pets for Kids',
                    'description' => 'Interactive robot pet with realistic movements and sounds.',
                    'specifications' => '<ul><li>Realistic movements</li><li>Pet sounds</li><li>Touch sensors</li><li>Rechargeable battery</li><li>Ages 4+ years</li></ul>',
                    'details' => '<p>Cute robot pet with realistic movements and pet sounds. Touch sensors and rechargeable battery for interactive pet care experience.</p>',
                    'price' => 99.99,
                    'cover_image' => '/storage/media/1866/collection.png',
                    'images' => '/storage/media/1871/1.png,/storage/media/1870/2.png,/storage/media/1869/3.png,/storage/media/1868/4.png,/storage/media/1867/5.png'
                ],
                [
                    'name' => 'Mini Remote Control Helicopter',
                    'description' => 'Compact remote control helicopter with gyroscope stabilization.',
                    'specifications' => '<ul><li>Gyroscope stabilization</li><li>LED lights</li><li>Rechargeable battery</li><li>Indoor flying</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Mini remote control helicopter with gyroscope stabilization for stable flight. LED lights and rechargeable battery for indoor flying adventures.</p>',
                    'price' => 59.99,
                    'cover_image' => '/storage/media/1872/collection.png',
                    'images' => '/storage/media/1877/1.png,/storage/media/1876/2.png,/storage/media/1875/3.png,/storage/media/1874/4.png,/storage/media/1873/5.png'
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
                    'cover_image' => '/storage/media/1878/collection.png',
                    'images' => '/storage/media/1883/1.png,/storage/media/1882/2.png,/storage/media/1879/6.png,/storage/media/1881/4.png,/storage/media/1880/5.png'
                ],
                [
                    'name' => 'Lightning Pro Racing Boat',
                    'description' => 'High-speed remote control racing boat for water adventures.',
                    'specifications' => '<ul><li>High-speed motor</li><li>Waterproof design</li><li>Remote control</li><li>Rechargeable battery</li><li>Ages 8+ years</li></ul>',
                    'details' => '<p>Lightning Pro racing boat with high-speed motor and waterproof design. Remote control and rechargeable battery for exciting water racing adventures.</p>',
                    'price' => 119.99,
                    'cover_image' => '/storage/media/1884/collection.png',
                    'images' => '/storage/media/1889/1.png,/storage/media/1888/2.png,/storage/media/1887/3.png,/storage/media/1886/4.png,/storage/media/1885/5.png'
                ],
                [
                    'name' => 'Smart Educational Toy Tablet',
                    'description' => 'Educational tablet with interactive learning games and activities.',
                    'specifications' => '<ul><li>Educational games</li><li>Interactive activities</li><li>Touchscreen display</li><li>Parental controls</li><li>Ages 3+ years</li></ul>',
                    'details' => '<p>Smart educational toy tablet with interactive learning games and activities. Touchscreen display with parental controls for safe educational entertainment.</p>',
                    'price' => 109.99,
                    'cover_image' => '/storage/media/1890/collection.png',
                    'images' => '/storage/media/1895/1.png,/storage/media/1894/2.png,/storage/media/1893/3.png,/storage/media/1892/4.png,/storage/media/1891/5.png'
                ]
            ]
        ];

        return $products[$categoryName] ?? [];
    }
}