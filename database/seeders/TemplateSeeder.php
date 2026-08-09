<?php

namespace Database\Seeders;

use App\Models\Template;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Schema;

class TemplateSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        if (!Schema::hasTable('templates')) {
            $this->command->warn('templates table does not exist. Run migrations first.');
            return;
        }

        $templates = $this->getTemplates();

        foreach ($templates as $data) {
            Template::updateOrCreate(
                ['slug' => $data['slug']],
                $data
            );
        }

        $this->command->info('Seeded ' . count($templates) . ' templates.');
    }

    /**
     * Get all template definitions.
     */
    protected function getTemplates(): array
    {
        $templates = [
            // ===================== FREE TEMPLATES (7) =====================
            [
                'slug' => 'basic',
                'name' => 'الأساس',
                'name_en' => 'Basic',
                'description' => 'تصميم بسيط (Minimalist) يناسب الاستخدام العام.',
                'category' => 'general',
                'is_free' => true,
                'plan_required' => 'starter',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'centered', 'show_search' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'tabs', 'show_all' => true]],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'per_page' => 20, 'show_filters' => false]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_newsletter' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'normal', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-50' => '#f0fdf4', 'primary-100' => '#dcfce7', 'primary-500' => '#10b77f', 'primary-600' => '#059669', 'primary-700' => '#047857',
                        'secondary-500' => '#f59e0b',
                        'background' => '#ffffff', 'surface' => '#f9fafb',
                        'text-primary' => '#111827', 'text-muted' => '#6b7280',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-12', 'container' => 'px-4'],
                    'borders' => ['radius' => '0.5rem'],
                ],
                'advanced_components' => [],
                'sort_order' => 1,
            ],
            [
                'slug' => 'single-product',
                'name' => 'المنتج الأوحد',
                'name_en' => 'Single Product',
                'description' => 'صفحة هبوط مصممة لبيع منتج واحد أو حزمة واحدة.',
                'category' => 'general',
                'is_free' => true,
                'plan_required' => 'starter',
                'config' => [
                    'sections' => [
                        ['id' => 'product_hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'product_focus', 'show_cta' => true, 'cta_text' => 'اطلب الآن']],
                        ['id' => 'product_details', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'ProductDetails']],
                        ['id' => 'reviews', 'type' => 'custom', 'enabled' => true, 'order' => 3, 'props' => ['component' => 'Testimonials']],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_newsletter' => false]],
                    ],
                    'layout' => ['container' => 'max-w-5xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#2563eb', 'primary-600' => '#1d4ed8',
                        'background' => '#ffffff', 'surface' => '#f8fafc',
                        'text-primary' => '#0f172a', 'text-muted' => '#64748b',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '800'],
                    'spacing' => ['section' => 'py-16', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 2,
            ],
            [
                'slug' => 'fashion',
                'name' => 'الأزياء',
                'name_en' => 'Fashion',
                'description' => 'يركز على الصور الطولية وشبكة المنتجات الكثيفة لتصفح الملابس.',
                'category' => 'fashion',
                'is_free' => true,
                'plan_required' => 'starter',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'editorial', 'tall_images' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'cards', 'tall_images' => true]],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'masonry', 'show_size_options' => true, 'per_page' => 30]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'minimal']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#18181b', 'primary-600' => '#27272a',
                        'background' => '#ffffff', 'surface' => '#fafafa',
                        'text-primary' => '#18181b', 'text-muted' => '#71717a',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-14', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 3,
            ],
            [
                'slug' => 'tech',
                'name' => 'التقنية',
                'name_en' => 'Tech',
                'description' => 'يعرض المواصفات الفنية والمقارنات بوضوح للإلكترونيات.',
                'category' => 'electronics',
                'is_free' => true,
                'plan_required' => 'starter',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'spec_focused', 'show_search' => true]],
                        ['id' => 'specs', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'SpecComparison']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_specs' => true, 'per_page' => 24]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_newsletter' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#2563eb', 'primary-600' => '#1e40af',
                        'background' => '#f8fafc', 'surface' => '#ffffff',
                        'text-primary' => '#1e293b', 'text-muted' => '#64748b',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '800'],
                    'spacing' => ['section' => 'py-12', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 4,
            ],
            [
                'slug' => 'food',
                'name' => 'الوجبات',
                'name_en' => 'Food',
                'description' => 'يوفر أزرار طلب سريعة وتصنيفات علوية لتطبيقات المطاعم.',
                'category' => 'food',
                'is_free' => true,
                'plan_required' => 'starter',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'app_header', 'quick_order' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'horizontal_scroll']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'menu_list', 'quick_order' => true, 'per_page' => 50]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_hours' => true]],
                    ],
                    'layout' => ['container' => 'max-w-3xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#f97316', 'primary-600' => '#ea580c',
                        'background' => '#fff7ed', 'surface' => '#ffffff',
                        'text-primary' => '#431407', 'text-muted' => '#9a3412',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '900'],
                    'spacing' => ['section' => 'py-10', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 5,
            ],
            [
                'slug' => 'beauty',
                'name' => 'الجمال',
                'name_en' => 'Beauty',
                'description' => 'يعتمد مساحات بيضاء واسعة وألواناً هادئة لمستحضرات التجميل.',
                'category' => 'beauty',
                'is_free' => true,
                'plan_required' => 'starter',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'elegant', 'soft_palette' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'minimal_cards']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'per_page' => 24]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'light']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#ec4899', 'primary-600' => '#db2777',
                        'background' => '#fffbf5', 'surface' => '#ffffff',
                        'text-primary' => '#4a044e', 'text-muted' => '#a21caf',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '500'],
                    'spacing' => ['section' => 'py-16', 'container' => 'px-6'],
                ],
                'advanced_components' => [],
                'sort_order' => 6,
            ],
            [
                'slug' => 'digital',
                'name' => 'المنتجات الرقمية',
                'name_en' => 'Digital Products',
                'description' => 'يركز على وصف الخدمة، التقييمات، وآلية التحميل الفوري.',
                'category' => 'digital',
                'is_free' => true,
                'plan_required' => 'starter',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'product_focus', 'show_download' => true]],
                        ['id' => 'features', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'FeatureList']],
                        ['id' => 'reviews', 'type' => 'custom', 'enabled' => true, 'order' => 3, 'props' => ['component' => 'Ratings', 'show_rating' => true]],
                        ['id' => 'delivery', 'type' => 'custom', 'enabled' => true, 'order' => 4, 'props' => ['component' => 'InstantDelivery']],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 5, 'props' => ['show_newsletter' => false]],
                    ],
                    'layout' => ['container' => 'max-w-5xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#8b5cf6', 'primary-600' => '#7c3aed',
                        'background' => '#ffffff', 'surface' => '#f5f3ff',
                        'text-primary' => '#1e1b4b', 'text-muted' => '#6d28d9',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-16', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 7,
            ],

            // ===================== PAID TEMPLATES (22) =====================
            [
                'slug' => 'luxury-jewelry',
                'name' => 'مجوهرات فاخرة',
                'name_en' => 'Luxury Jewelry',
                'description' => 'تعتمد الوضع الليلي (Dark Mode) وخطوطاً كلاسيكية تبرز لمعان الصور.',
                'category' => 'luxury',
                'is_free' => false,
                'plan_required' => 'professional',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'fullscreen', 'parallax' => true]],
                        ['id' => 'collections', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'LuxuryCollections']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'masonry', 'hover_effect' => 'zoom', 'show_quick_view' => true]],
                        ['id' => 'craftsmanship', 'type' => 'custom', 'enabled' => true, 'order' => 4, 'props' => ['component' => 'CraftsmanshipStory']],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 5, 'props' => ['style' => 'dark_luxury']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => true],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#d4af37', 'primary-600' => '#b8962e',
                        'background' => '#0a0a0a', 'surface' => '#1a1a1a',
                        'text-primary' => '#f5f5f5', 'text-muted' => '#a0a0a0',
                    ],
                    'typography' => ['font-family' => 'Playfair Display', 'font-family-body' => 'Inter', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-20', 'container' => 'px-8'],
                ],
                'advanced_components' => ['countdown_timer', 'interactive_popup', 'dynamic_shipping_bar'],
                'sort_order' => 8,
            ],
            [
                'slug' => 'luxury-watches',
                'name' => 'ساعات فاخرة',
                'name_en' => 'Luxury Watches',
                'description' => 'وضع ليلي وخطوط كلاسيكية تركز على تفاصيل الساعات.',
                'category' => 'luxury',
                'is_free' => false,
                'plan_required' => 'professional',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'fullscreen', 'dark' => true]],
                        ['id' => 'brand_story', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'BrandStory']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'elegant_list', 'show_zoom' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'dark_luxury']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => true],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#c0c0c0', 'primary-600' => '#a3a3a3',
                        'background' => '#0f0f0f', 'surface' => '#1c1c1c',
                        'text-primary' => '#ffffff', 'text-muted' => '#9ca3af',
                    ],
                    'typography' => ['font-family' => 'Cormorant Garamond', 'font-family-body' => 'Inter', 'heading-weight' => '600'],
                    'spacing' => ['section' => 'py-20', 'container' => 'px-8'],
                ],
                'advanced_components' => ['countdown_timer', 'interactive_popup'],
                'sort_order' => 9,
            ],
            [
                'slug' => 'b2b-wholesale',
                'name' => 'جملة B2B',
                'name_en' => 'B2B Wholesale',
                'description' => 'تعرض المنتجات على شكل قوائم متوازية مع حقول لإدخال كميات الشراء المتعددة بنقرة واحدة.',
                'category' => 'b2b',
                'is_free' => false,
                'plan_required' => 'professional',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'b2b_banner', 'show_quote_cta' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'b2b_list']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'bulk_table', 'show_quantity_input' => true, 'bulk_order' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_business_info' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#0f766e', 'primary-600' => '#115e59',
                        'background' => '#f0fdfa', 'surface' => '#ffffff',
                        'text-primary' => '#134e4a', 'text-muted' => '#64748b',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-10', 'container' => 'px-4'],
                ],
                'advanced_components' => ['bulk_order_form', 'dynamic_shipping_bar', 'quantity_picker'],
                'sort_order' => 10,
            ],
            [
                'slug' => 'furniture',
                'name' => 'أثاث وديكور',
                'name_en' => 'Furniture & Decor',
                'description' => 'تدعم اللافتات البانورامية الكبيرة وتبرز خيارات الألوان والمقاسات بوضوح.',
                'category' => 'home',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'panorama', 'show_collection_link' => true]],
                        ['id' => 'rooms', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'RoomCategories']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_color_options' => true, 'show_size_options' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'warm']],
                    ],
                    'layout' => ['container' => 'max-w-full', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#92400e', 'primary-600' => '#78350f',
                        'background' => '#fdf6f0', 'surface' => '#ffffff',
                        'text-primary' => '#3b2413', 'text-muted' => '#8b5e34',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-16', 'container' => 'px-6'],
                ],
                'advanced_components' => ['interactive_popup', 'dynamic_shipping_bar'],
                'sort_order' => 11,
            ],
            [
                'slug' => 'auto-parts',
                'name' => 'قطع غيار ومعدات',
                'name_en' => 'Auto Parts',
                'description' => 'توفر محرك بحث متقدم وفلاتر دقيقة (حسب الموديل، السنة، النوع) كعنصر أساسي في الترويسة.',
                'category' => 'automotive',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'search_first', 'show_advanced_search' => true]],
                        ['id' => 'filters', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'VehicleFilter', 'filters' => ['model', 'year', 'type']]],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'list', 'show_compatibility' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_contact' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#1d4ed8', 'primary-600' => '#1e40af',
                        'background' => '#f8fafc', 'surface' => '#ffffff',
                        'text-primary' => '#1e293b', 'text-muted' => '#64748b',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-10', 'container' => 'px-4'],
                ],
                'advanced_components' => ['vehicle_search', 'interactive_popup'],
                'sort_order' => 12,
            ],
            [
                'slug' => 'sports',
                'name' => 'رياضة ومكملات',
                'name_en' => 'Sports & Supplements',
                'description' => 'تستخدم خطوطاً عريضة، حواف حادة، وألواناً حيوية تعكس الطاقة.',
                'category' => 'sports',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'energetic', 'bold' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'bold_cards']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_badge' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'bold']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#dc2626', 'primary-600' => '#b91c1c',
                        'secondary-500' => '#facc15',
                        'background' => '#ffffff', 'surface' => '#fef2f2',
                        'text-primary' => '#1a1a1a', 'text-muted' => '#6b7280',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '900'],
                    'spacing' => ['section' => 'py-12', 'container' => 'px-4'],
                    'borders' => ['radius' => '0', 'sharp' => true],
                ],
                'advanced_components' => ['countdown_timer', 'dynamic_shipping_bar'],
                'sort_order' => 13,
            ],
            [
                'slug' => 'kids',
                'name' => 'أطفال وألعاب',
                'name_en' => 'Kids & Toys',
                'description' => 'توظف ألواناً مرحة، أطرافاً دائرية، وأيقونات كرتونية لتصنيف الأقسام.',
                'category' => 'kids',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'playful', 'bubbles' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'cartoon_icons']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'rounded_cards' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'colorful']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#f59e0b', 'primary-600' => '#d97706',
                        'secondary-500' => '#3b82f6',
                        'background' => '#fffbeb', 'surface' => '#ffffff',
                        'text-primary' => '#451a03', 'text-muted' => '#b45309',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '800'],
                    'spacing' => ['section' => 'py-14', 'container' => 'px-4'],
                    'borders' => ['radius' => '1.5rem', 'rounded' => true],
                ],
                'advanced_components' => ['interactive_popup'],
                'sort_order' => 14,
            ],
            [
                'slug' => 'supermarket',
                'name' => 'سوبرماركت',
                'name_en' => 'Supermarket',
                'description' => 'توفر قائمة تصنيفات جانبية ثابتة (Sidebar) لتسهيل التنقل بين آلاف المنتجات بسرعة.',
                'category' => 'grocery',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'sidebar', 'type' => 'custom', 'enabled' => true, 'order' => 1, 'props' => ['component' => 'FixedSidebar', 'sticky' => true]],
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 2, 'props' => ['layout' => 'compact_banner']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'dense_grid', 'show_stock' => true, 'per_page' => 60]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_stores' => true]],
                    ],
                    'layout' => ['container' => 'max-w-[1600px]', 'spacing' => 'compact', 'dark_mode' => false, 'sidebar' => true],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#16a34a', 'primary-600' => '#15803d',
                        'background' => '#f0fdf4', 'surface' => '#ffffff',
                        'text-primary' => '#052e16', 'text-muted' => '#4d7c0f',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-8', 'container' => 'px-3'],
                ],
                'advanced_components' => ['dynamic_shipping_bar', 'countdown_timer'],
                'sort_order' => 15,
            ],
            [
                'slug' => 'handcrafted',
                'name' => 'حرف يدوية',
                'name_en' => 'Handcrafted',
                'description' => 'تركز على مساحات نصية لسرد قصة الصانع وفيديو تعريفي في الصفحة الرئيسية.',
                'category' => 'handmade',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'story_focus', 'show_video' => true]],
                        ['id' => 'story', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'MakerStory', 'video' => true]],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_maker_note' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_about' => true]],
                    ],
                    'layout' => ['container' => 'max-w-6xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#78716c', 'primary-600' => '#57534e',
                        'background' => '#fafaf9', 'surface' => '#ffffff',
                        'text-primary' => '#1c1917', 'text-muted' => '#78716c',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '500'],
                    'spacing' => ['section' => 'py-16', 'container' => 'px-6'],
                ],
                'advanced_components' => ['video_story'],
                'sort_order' => 16,
            ],
            [
                'slug' => 'perfumes',
                'name' => 'عطور',
                'name_en' => 'Perfumes',
                'description' => 'توظف حركات تمرير ناعمة (Smooth Scrolling) وتأثيرات بصرية تركز على زجاجة العطر.',
                'category' => 'perfume',
                'is_free' => false,
                'plan_required' => 'professional',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'fullscreen', 'smooth_scroll' => true]],
                        ['id' => 'collections', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'FragranceCollections']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'bottle_focus', 'show_notes' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'elegant_dark']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => true],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#c2410c', 'primary-600' => '#9a3412',
                        'background' => '#1c0a02', 'surface' => '#2a1206',
                        'text-primary' => '#fef3c7', 'text-muted' => '#b45309',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'font-family-heading' => 'Cormorant Garamond', 'heading-weight' => '500'],
                    'spacing' => ['section' => 'py-20', 'container' => 'px-8'],
                ],
                'advanced_components' => ['countdown_timer', 'interactive_popup', 'smooth_scroll'],
                'sort_order' => 17,
            ],
            [
                'slug' => 'electronics-pro',
                'name' => 'إلكترونيات احترافية',
                'name_en' => 'Pro Electronics',
                'description' => 'مقارنات تفصيلية وجداول مواصفات متقدمة للمنتجات الإلكترونية.',
                'category' => 'electronics',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'comparison_ready']],
                        ['id' => 'comparison', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'AdvancedComparison']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_specs' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_support' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => true],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#06b6d4', 'primary-600' => '#0891b2',
                        'background' => '#0f172a', 'surface' => '#1e293b',
                        'text-primary' => '#f8fafc', 'text-muted' => '#94a3b8',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '800'],
                    'spacing' => ['section' => 'py-12', 'container' => 'px-4'],
                ],
                'advanced_components' => ['comparison_table', 'countdown_timer'],
                'sort_order' => 18,
            ],
            [
                'slug' => 'pharmacy',
                'name' => 'صيدلية',
                'name_en' => 'Pharmacy',
                'description' => 'تصميم صحي نظيف يعزز الثقة ويركز على المعلومات الدوائية.',
                'category' => 'health',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'trust_focused']],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'medical_cards']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_prescription_info' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_pharmacy_info' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#0d9488', 'primary-600' => '#0f766e',
                        'background' => '#f0fdfa', 'surface' => '#ffffff',
                        'text-primary' => '#134e4a', 'text-muted' => '#5eead4',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '600'],
                    'spacing' => ['section' => 'py-12', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 19,
            ],
            [
                'slug' => 'pet-store',
                'name' => 'مستلزمات حيوانات',
                'name_en' => 'Pet Store',
                'description' => 'تصميم ودود دافئ لمستلزمات الحيوانات الأليفة.',
                'category' => 'pets',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'friendly']],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'pet_cards']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid']],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'warm']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#d97706', 'primary-600' => '#b45309',
                        'background' => '#fffbeb', 'surface' => '#ffffff',
                        'text-primary' => '#451a03', 'text-muted' => '#a16207',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-14', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 20,
            ],
            [
                'slug' => 'books',
                'name' => 'مكتبة وكتب',
                'name_en' => 'Bookstore',
                'description' => 'تصميم هادئ راقٍ لعرض الكتب والقراءات.',
                'category' => 'books',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'literary']],
                        ['id' => 'featured', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'FeaturedBooks']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_author' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'elegant']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#7c2d12', 'primary-600' => '#5c1a03',
                        'background' => '#fdf6ec', 'surface' => '#ffffff',
                        'text-primary' => '#292524', 'text-muted' => '#8b5e34',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-16', 'container' => 'px-6'],
                ],
                'advanced_components' => [],
                'sort_order' => 21,
            ],
            [
                'slug' => 'flowers-gifts',
                'name' => 'زهور وهدايا',
                'name_en' => 'Flowers & Gifts',
                'description' => 'تصميم رومانسي ناعم لبيع الزهور والهدايا مع مواعيد التوصيل.',
                'category' => 'flowers',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'romantic']],
                        ['id' => 'occasions', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'OccasionCategories']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_delivery_date' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_delivery_info' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#e11d48', 'primary-600' => '#be123c',
                        'background' => '#fff1f2', 'surface' => '#ffffff',
                        'text-primary' => '#4c0519', 'text-muted' => '#be185d',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '600'],
                    'spacing' => ['section' => 'py-14', 'container' => 'px-4'],
                ],
                'advanced_components' => ['delivery_date_picker'],
                'sort_order' => 22,
            ],
            [
                'slug' => 'grocery-delivery',
                'name' => 'توصيل مواد غذائية',
                'name_en' => 'Grocery Delivery',
                'description' => 'مصمم لخدمات التوصيل السريع للمواد الغذائية مع مؤقت التوصيل.',
                'category' => 'grocery',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'delivery_focused', 'show_eta' => true]],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'quick_pick']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'dense_grid', 'show_eta' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_zones' => true]],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#22c55e', 'primary-600' => '#16a34a',
                        'background' => '#f0fdf4', 'surface' => '#ffffff',
                        'text-primary' => '#052e16', 'text-muted' => '#4d7c0f',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '800'],
                    'spacing' => ['section' => 'py-8', 'container' => 'px-3'],
                ],
                'advanced_components' => ['countdown_timer', 'dynamic_shipping_bar', 'delivery_tracking'],
                'sort_order' => 23,
            ],
            [
                'slug' => 'coffee-shop',
                'name' => 'مقهى',
                'name_en' => 'Coffee Shop',
                'description' => 'تصميم دافئ لمقاهي القهوة مع قائمة المشروبات المميزة.',
                'category' => 'food',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'warm_coffee']],
                        ['id' => 'menu', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'CoffeeMenu']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'menu_list', 'quick_order' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_locations' => true]],
                    ],
                    'layout' => ['container' => 'max-w-5xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#78350f', 'primary-600' => '#5c2a06',
                        'background' => '#fef6e4', 'surface' => '#ffffff',
                        'text-primary' => '#3b2413', 'text-muted' => '#8b5e34',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-14', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 24,
            ],
            [
                'slug' => 'home-tools',
                'name' => 'أدوات منزلية',
                'name_en' => 'Home Tools',
                'description' => 'تصميم عملي واضح للأدوات المنزلية والعدد.',
                'category' => 'home',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'practical']],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'tool_cards']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_sku' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'plain']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'compact', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#4b5563', 'primary-600' => '#374151',
                        'background' => '#f9fafb', 'surface' => '#ffffff',
                        'text-primary' => '#111827', 'text-muted' => '#6b7280',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-10', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 25,
            ],
            [
                'slug' => 'stationery',
                'name' => 'قرطاسية',
                'name_en' => 'Stationery',
                'description' => 'تصميم نظيف مشرق للقرطاسية واللوازم المدرسية.',
                'category' => 'general',
                'is_free' => false,
                'plan_required' => 'growth',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'bright']],
                        ['id' => 'categories', 'type' => 'categories', 'enabled' => true, 'order' => 2, 'props' => ['style' => 'colorful_cards']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid']],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'bright']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#6366f1', 'primary-600' => '#4f46e5',
                        'background' => '#f5f7ff', 'surface' => '#ffffff',
                        'text-primary' => '#1e1b4b', 'text-muted' => '#6366f1',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '800'],
                    'spacing' => ['section' => 'py-12', 'container' => 'px-4'],
                ],
                'advanced_components' => [],
                'sort_order' => 26,
            ],
            [
                'slug' => 'fashion-premium',
                'name' => 'أزياء فاخرة',
                'name_en' => 'Premium Fashion',
                'description' => 'نسخة فاخرة من قالب الأزياء مع حركات انتقال سينمائية.',
                'category' => 'fashion',
                'is_free' => false,
                'plan_required' => 'professional',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'cinematic', 'video_bg' => true]],
                        ['id' => 'runway', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'RunwayShowcase']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'masonry', 'show_size_options' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'dark_elegant']],
                    ],
                    'layout' => ['container' => 'max-w-[1600px]', 'spacing' => 'comfortable', 'dark_mode' => true],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#e5e5e5', 'primary-600' => '#a3a3a3',
                        'background' => '#0a0a0a', 'surface' => '#171717',
                        'text-primary' => '#fafafa', 'text-muted' => '#737373',
                    ],
                    'typography' => ['font-family' => 'Cormorant Garamond', 'font-family-body' => 'Inter', 'heading-weight' => '500'],
                    'spacing' => ['section' => 'py-20', 'container' => 'px-8'],
                ],
                'advanced_components' => ['video_story', 'countdown_timer', 'interactive_popup'],
                'sort_order' => 27,
            ],
            [
                'slug' => 'beauty-premium',
                'name' => 'تجميل فاخر',
                'name_en' => 'Premium Beauty',
                'description' => 'تجربة تجميل متكاملة مع فيديوهات موديلات ومعاينات تفاعلية.',
                'category' => 'beauty',
                'is_free' => false,
                'plan_required' => 'professional',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'editorial_full']],
                        ['id' => 'routines', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'BeautyRoutines']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'grid', 'show_ingredients' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['style' => 'soft_dark']],
                    ],
                    'layout' => ['container' => 'max-w-7xl', 'spacing' => 'comfortable', 'dark_mode' => false],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#f472b6', 'primary-600' => '#db2777',
                        'background' => '#fdf2f8', 'surface' => '#ffffff',
                        'text-primary' => '#500724', 'text-muted' => '#be185d',
                    ],
                    'typography' => ['font-family' => 'Tajawal', 'heading-weight' => '500'],
                    'spacing' => ['section' => 'py-16', 'container' => 'px-6'],
                ],
                'advanced_components' => ['interactive_popup', 'dynamic_shipping_bar'],
                'sort_order' => 28,
            ],
            [
                'slug' => 'food-premium',
                'name' => 'مطعم فاخر',
                'name_en' => 'Premium Restaurant',
                'description' => 'تجربة مطاعم فاخرة مع حجوزات الطاولات والمنيو الرقمي.',
                'category' => 'food',
                'is_free' => false,
                'plan_required' => 'professional',
                'config' => [
                    'sections' => [
                        ['id' => 'hero', 'type' => 'hero', 'enabled' => true, 'order' => 1, 'props' => ['layout' => 'restaurant_full', 'video_bg' => true]],
                        ['id' => 'reservations', 'type' => 'custom', 'enabled' => true, 'order' => 2, 'props' => ['component' => 'TableReservations']],
                        ['id' => 'products', 'type' => 'products', 'enabled' => true, 'order' => 3, 'props' => ['layout' => 'menu_list', 'show_chef_note' => true]],
                        ['id' => 'footer', 'type' => 'footer', 'enabled' => true, 'order' => 4, 'props' => ['show_hours', 'show_locations']],
                    ],
                    'layout' => ['container' => 'max-w-6xl', 'spacing' => 'comfortable', 'dark_mode' => true],
                ],
                'design_tokens' => [
                    'colors' => [
                        'primary-500' => '#c19a6b', 'primary-600' => '#a47c3f',
                        'background' => '#0c0a09', 'surface' => '#1c1917',
                        'text-primary' => '#fafaf9', 'text-muted' => '#a8a29e',
                    ],
                    'typography' => ['font-family' => 'Playfair Display', 'font-family-body' => 'Tajawal', 'heading-weight' => '700'],
                    'spacing' => ['section' => 'py-18', 'container' => 'px-6'],
                ],
                'advanced_components' => ['table_reservations', 'countdown_timer', 'interactive_popup'],
                'sort_order' => 29,
            ],
        ];

        return array_map(fn (array $template): array => $this->withTemplateDefaults($template), $templates);
    }

    /**
     * Normalize a template definition so it ships with a header section,
     * explicit Tailwind classes per section, per-template product columns
     * and a complete vivid color palette.
     */
    protected function withTemplateDefaults(array $template): array
    {
        $slug = $template['slug'] ?? '';
        $config = $template['config'] ?? ['sections' => [], 'layout' => []];
        $layout = $config['layout'] ?? [];
        $dark = (bool) ($layout['dark_mode'] ?? false);
        $container = $layout['container'] ?? 'max-w-7xl';

        // Vivid color palette — fills any missing token so no template
        // ever relies on faded default colors.
        $colors = array_replace_recursive(
            [
                'primary-50' => '#ecfeff',
                'primary-100' => '#cffafe',
                'primary-500' => '#06b6d4',
                'primary-600' => '#0891b2',
                'primary-700' => '#0e7490',
                'secondary-500' => '#f97316',
                'background' => '#ffffff',
                'surface' => '#f1f5f9',
                'text-primary' => '#0f172a',
                'text-muted' => '#475569',
            ],
            $template['design_tokens']['colors'] ?? [],
            $this->colorFixes()[$slug] ?? []
        );

        $sections = $config['sections'] ?? [];
        $hasHeader = false;
        foreach ($sections as $section) {
            if (($section['type'] ?? null) === 'header') {
                $hasHeader = true;
                break;
            }
        }

        if (!$hasHeader) {
            array_unshift($sections, [
                'id' => 'header',
                'type' => 'header',
                'enabled' => true,
                'order' => 1,
                'props' => [
                    'sticky' => true,
                    'show_search' => true,
                    'show_cart' => true,
                    'show_auth' => true,
                    'show_whatsapp' => true,
                ],
                'classes' => [
                    'header' => $dark
                        ? 'sticky top-0 z-40 w-full border-b border-white/10 bg-neutral-900/95 backdrop-blur-md shadow-sm'
                        : 'sticky top-0 z-40 w-full border-b border-gray-200 bg-white/95 backdrop-blur-md shadow-sm',
                    'container' => 'mx-auto flex h-16 items-center justify-between gap-3 px-4 ' . $container,
                ],
            ]);
        }

        $columnsByLayout = [
            'grid' => 4,
            'dense_grid' => 6,
            'masonry' => 4,
            'list' => 1,
            'elegant_list' => 2,
            'menu_list' => 1,
            'bulk_table' => 1,
        ];

        $order = 0;
        foreach ($sections as $key => $section) {
            $order++;
            $sections[$key]['order'] = $order;

            $type = $section['type'] ?? 'custom';
            $base = $this->sectionClasses($type);

            if (!isset($sections[$key]['classes'])) {
                $sections[$key]['classes'] = [
                    'section' => $base['section'],
                    'container' => rtrim($base['container'] . ' ' . $container),
                    'heading' => $base['heading'] ?? 'text-2xl font-bold sm:text-3xl',
                ];
            } else {
                $sections[$key]['classes'] += ['section' => $base['section']];
                $sections[$key]['classes'] += ['container' => rtrim($base['container'] . ' ' . $container)];
            }

            if ($type === 'products' && !isset($sections[$key]['props']['columns'])) {
                $sections[$key]['props']['columns'] = $columnsByLayout[$sections[$key]['props']['layout'] ?? 'grid'] ?? 4;
            }
        }

        $defaultColumns = in_array($container, ['max-w-3xl', 'max-w-5xl'], true) ? 2 : 4;

        $config['layout'] = array_merge([
            'container' => $container,
            'spacing' => 'normal',
            'columns' => $defaultColumns,
        ], $layout, [
            'columns' => $layout['columns'] ?? $defaultColumns,
        ]);

        $config['sections'] = $sections;

        $template['config'] = $config;
        $template['design_tokens']['colors'] = $colors;

        return $template;
    }

    /**
     * Faded palette fixes keyed by template slug.
     */
    protected function colorFixes(): array
    {
        return [
            'handcrafted' => [
                'primary-500' => '#b45309',
                'primary-600' => '#92400e',
                'background' => '#faf7f0',
                'surface' => '#ffffff',
                'text-primary' => '#292524',
                'text-muted' => '#a16207',
            ],
            'home-tools' => [
                'primary-500' => '#f97316',
                'primary-600' => '#ea580c',
                'background' => '#fff7ed',
                'surface' => '#ffffff',
                'text-primary' => '#431407',
                'text-muted' => '#c2410c',
            ],
            'pharmacy' => ['text-muted' => '#0f766e'],
            'luxury-watches' => [
                'primary-500' => '#d8d5cf',
                'primary-600' => '#b8b2a8',
                'text-muted' => '#a1a1aa',
            ],
            'fashion-premium' => [
                'primary-500' => '#f0f0f0',
                'primary-600' => '#d4d4d4',
                'text-muted' => '#a3a3a3',
            ],
            'luxury-jewelry' => [
                'primary-500' => '#eab308',
                'primary-600' => '#ca8a04',
                'text-muted' => '#a1a1aa',
            ],
            'food-premium' => ['text-muted' => '#d6cbb8'],
        ];
    }

    /**
     * Explicit Tailwind classes per section type.
     */
    protected function sectionClasses(string $type): array
    {
        $classes = [
            'hero' => [
                'section' => 'relative w-full overflow-hidden',
                'container' => 'mx-auto px-4 py-12 sm:py-16',
                'heading' => 'text-3xl font-bold sm:text-5xl',
            ],
            'categories' => [
                'section' => 'w-full py-10 sm:py-12',
                'container' => 'mx-auto px-4',
                'heading' => 'text-2xl font-bold sm:text-3xl',
            ],
            'products' => [
                'section' => 'w-full py-10 sm:py-12',
                'container' => 'mx-auto px-4',
                'heading' => 'text-2xl font-bold sm:text-3xl',
            ],
            'footer' => [
                'section' => 'w-full border-t border-gray-200',
                'container' => 'mx-auto px-4 py-12 sm:py-16',
            ],
        ];

        return $classes[$type] ?? [
            'section' => 'w-full py-10 sm:py-12',
            'container' => 'mx-auto px-4',
            'heading' => 'text-2xl font-bold sm:text-3xl',
        ];
    }
}