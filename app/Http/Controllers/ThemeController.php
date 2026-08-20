<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Category;
use App\Models\Store;
use App\Models\User;
use App\Models\CartItem;
use App\Models\WishlistItem;
use App\Models\Shipping;
use App\Models\Order;
use App\Models\StoreSetting;
use App\Models\StoreConfiguration;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use App\Services\CartCalculationService;
use Barryvdh\DomPDF\Facade\Pdf;

class ThemeController extends Controller
{
    /**
     * Get the store based on slug or resolved from domain
     */
    protected function getStore($storeSlug, ?Request $request = null)
    {
        // Priority 1: Check if store was resolved by domain middleware
        if ($request && $request->attributes->has('resolved_store')) {
            $store = $request->attributes->get('resolved_store');
            return $this->formatStoreData($store);
        }
        
        // Priority 2: Try to find the store in the database by slug
        $store = Store::where('slug', $storeSlug)->first();
        
        if ($store) {
            return $this->formatStoreData($store);
        }
        
        // No store found - abort with 404
        abort(404);
    }

    /**
     * Apply a ?theme=<slug>&preview=1 override for live template previews.
     * Only slugs in the 29-template catalog are accepted; anything else keeps
     * the store's saved theme. When the store owner's plan is known, the
     * override is also restricted to templates that plan actually includes so
     * a free-tier store cannot run premium templates through preview.
     */
    protected function applyPreviewTheme(?Request $request, string $currentTheme, $ownerPlan = null): string
    {
        if (!$request || !$request->boolean('preview')) {
            return $currentTheme;
        }

        $candidate = trim((string) $request->query('theme'));
        if ($candidate === '') {
            return $currentTheme;
        }

        $slug = Store::normalizeThemeSlug($candidate);

        if ($ownerPlan && !empty($ownerPlan->themes)) {
            $available = is_array($ownerPlan->themes) ? $ownerPlan->themes : [];
            if (count($available) > 0 && !in_array($slug, $available, true)) {
                return $currentTheme;
            }
        }

        return $slug;
    }

    /**
     * Map an owner's plan to a template tier so premium templates render for
     * the correct plan instead of defaulting to the Starter gate.
     */
    protected function planTierFor($plan): string
    {
        if ($plan && $plan->template_editor_level === 'full') {
            return 'professional';
        }
        if ($plan && $plan->template_editor_level === 'limited') {
            return 'growth';
        }

        return 'starter';
    }
    

    
    /**
     * Format store data consistently
     */
    private function formatStoreData($store)
    {
        if (!$store) return null;
        
        $configuration = StoreConfiguration::getConfiguration($store->id);
        
        // Get favicon from store config or company store settings
        $favicon = $configuration['favicon'] ?: '';
        if (empty($favicon) && $store->user) {
            $userSettings = \App\Models\Setting::getUserSettings($store->user->id, $store->id);
            $favicon = $userSettings['favicon'] ?? '';
        }
        
        // Get PWA data
        $pwaData = null;
        $plan = $store->user ? $store->user->getCurrentPlan() : null;
        if ($store->enable_pwa && $plan && $plan->pwa_business === 'on') {
            $cacheVersion = $store->updated_at ? $store->updated_at->timestamp : 0; // Bust cache only when the store changes
            $pwaData = [
                'enabled' => true,
                'name' => $store->pwa_name ?: $store->name,
                'short_name' => $store->pwa_short_name ?: mb_substr($store->name, 0, 12),
                'description' => $store->pwa_description ?: $store->description,
                'theme_color' => $store->pwa_theme_color ?: '#3B82F6',
                'background_color' => $store->pwa_background_color ?: '#ffffff',
                'manifest_url' => route('store.pwa.manifest', $store->slug) . '?v=' . $cacheVersion,
                'sw_url' => route('store.pwa.sw', $store->slug) . '?v=' . $cacheVersion,
            ];
        }
        
        // Get favicon for PWA popup with proper fallback chain
        $faviconForPWA = getPWAIconUrl($store);
        
        return [
            'id' => $store->id,
            'name' => $store->name,
            'email' => $store->email,
            'logo' => $configuration['logo'] ?: '/storage/media/logo.png',
            'favicon' => $faviconForPWA,
            'description' => $store->description,
            'theme' => $store->getTemplateSlug(),
            'slug' => $store->slug,
            'custom_domain' => $store->custom_domain,
            'custom_subdomain' => $store->custom_subdomain,
            'enable_custom_domain' => $store->enable_custom_domain,
            'enable_custom_subdomain' => $store->enable_custom_subdomain,
            'custom_css' => $configuration['custom_css'] ?? '',
            'custom_javascript' => $configuration['custom_javascript'] ?? '',
            'custom_head_scripts' => $configuration['custom_head_scripts'] ?? '',
            'custom_body_scripts' => $configuration['custom_body_scripts'] ?? '',
            'pwa' => $pwaData,
            'seo_title' => $store->seo_title,
            'seo_description' => $store->seo_description,
            'seo_keywords' => $store->seo_keywords,
            'seo_image' => $store->seo_image,
            // Settings-driven SEO meta (store config) as fallbacks for the
            // storefront <head> so the SEO tab values actually appear live.
            'meta_title' => $configuration['meta_title'] ?? '',
            'meta_description' => $configuration['meta_description'] ?? '',
            'meta_keywords' => $configuration['meta_keywords'] ?? '',
            'og_image' => $configuration['og_image'] ?? '',
        ];
    }

    /**
     * Read storefront behavior toggles (login/checkout/buttons) for the store.
     */
    protected function getStoreBehavior(Store $store = null): array
    {
        if (!$store) {
            return [
                'enable_customer_login' => true,
                'enable_customer_registration' => true,
                'require_login_checkout' => false,
                'show_whatsapp_order_button' => true,
                'show_search' => true,
                'show_cart' => true,
                'show_auth_button' => true,
            ];
        }

        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);

        return [
            'enable_customer_login' => (bool) ($config['enable_customer_login'] ?? true),
            'enable_customer_registration' => (bool) ($config['enable_customer_registration'] ?? true),
            'require_login_checkout' => (bool) ($config['require_login_checkout'] ?? false),
            'show_whatsapp_order_button' => (bool) ($config['show_whatsapp_order_button'] ?? true),
            'show_search' => (bool) ($config['show_search'] ?? true),
            'show_cart' => (bool) ($config['show_cart'] ?? true),
            'show_auth_button' => (bool) ($config['show_auth_button'] ?? true),
        ];
    }

    /**
     * Get common data for all store pages
     */
    protected function getCommonData()
    {
        $customer = Auth::guard('customer')->user();
        
        $customerAddresses = [];
        if ($customer) {
            $addresses = \App\Models\CustomerAddress::where('customer_id', $customer->id)->get();
            
            $customerAddresses = $addresses->map(function ($address) {
                return [
                    'id' => $address->id,
                    'type' => $address->type,
                    'address' => $address->address,
                    'city' => $address->city,
                    'state' => $address->state,
                    'country' => $address->country,
                    'postal_code' => $address->postal_code,
                    'is_default' => (bool) $address->is_default,
                ];
            })->toArray();
        }
        
        $commonData = [
            'isLoggedIn' => Auth::guard('customer')->check(),
            'customer' => $customer,
            'customer_address' => $customerAddresses,
        ];
        
        return $commonData;
    }

    /**
     * Resolve the secondary currency (code/symbol/name + manual exchange rate) for dual-currency display.
     */
    protected function resolveSecondaryCurrency(array $storeSettings): ?array
    {
        $secondaryCurrencyCode = $storeSettings['secondaryCurrency'] ?? null;
        if (!$secondaryCurrencyCode) {
            return null;
        }

        $secondaryCurrencyModel = \App\Models\Currency::where('code', $secondaryCurrencyCode)->first();
        if (!$secondaryCurrencyModel) {
            return null;
        }

        return [
            'code' => $secondaryCurrencyModel->code,
            'symbol' => $secondaryCurrencyModel->symbol,
            'name' => $secondaryCurrencyModel->name,
            'exchangeRate' => (float) ($storeSettings['exchangeRate'] ?? 0),
        ];
    }

    /**
     * Get store configuration with settings and currencies
     */
    protected function getStoreConfig($store)
    {
        $storeModel = Store::find($store['id']);
        $storeSettings = [];
        
        if ($storeModel && $storeModel->user) {
            $storeSettings = \App\Models\Setting::getUserSettings($storeModel->user->id, $store['id']);
            $configuration = StoreConfiguration::getConfiguration($store['id']);
        }
        
        return [
            'config' => [
                'storeName' => $store['name'] ?? 'gadgets',
                'logo' => $configuration['logo'] ?? '',
                'favicon' => $configuration['favicon'] ?? '',
                'phoneNumber' => $storeSettings['phone'] ?? '+1-555-123-4567',
                'currency' => $storeSettings['currency_symbol'] ?? '$',
                'address' => $configuration['address'] ?? '',
                'city' => $configuration['city'] ?? '',
                'state' => $configuration['state'] ?? '',
                'country' => $configuration['country'] ?? '',
                'postalCode' => $configuration['postal_code'] ?? '',
                'email' => $store['email'] ?? '',
                'description' => $configuration['store_description'] ? $configuration['store_description'] : ($store['description'] ?? ''),
                'welcomeMessage' => $configuration['welcome_message'] ?? null,
                'copyrightText' => $configuration['copyright_text'] ?? null,
                'locale' => $storeSettings['language'] ?? 'ar',
                'secondaryCurrency' => $this->resolveSecondaryCurrency($storeSettings),
                'vat' => [
                    'vat_number' => $storeSettings['vat_number'] ?? null,
                    'tax_registration_number' => $storeSettings['tax_registration_number'] ?? null,
                ],
                'socialMedia' => [
                    'facebook' => $configuration['facebook_url'] ?? null,
                    'instagram' => $configuration['instagram_url'] ?? null,
                    'twitter' => $configuration['twitter_url'] ?? null,
                    'youtube' => $configuration['youtube_url'] ?? null,
                    'whatsapp' => $configuration['whatsapp_url'] ?? null,
                    'email' => $configuration['email'] ?? null,
                ],
                // WhatsApp Widget Configuration
                'whatsapp_widget_enabled' => $configuration['whatsapp_widget_enabled'] ?? false,
                'whatsapp_widget_phone' => $configuration['whatsapp_widget_phone'] ?? '',
                'whatsapp_widget_message' => $configuration['whatsapp_widget_message'] ?? 'Hello! I need help with...',
                'whatsapp_widget_position' => $configuration['whatsapp_widget_position'] ?? 'right',
                'whatsapp_widget_show_on_mobile' => $configuration['whatsapp_widget_show_on_mobile'] ?? true,
                'whatsapp_widget_show_on_desktop' => $configuration['whatsapp_widget_show_on_desktop'] ?? true,
                // SEO
                'meta_title' => $configuration['meta_title'] ?? '',
                'meta_description' => $configuration['meta_description'] ?? '',
                // Tracking & Analytics
                'google_analytics_id' => $configuration['google_analytics_id'] ?? '',
                'meta_pixel_id' => $configuration['meta_pixel_id'] ?? '',
                'tiktok_pixel_id' => $configuration['tiktok_pixel_id'] ?? '',
                'snapchat_pixel_id' => $configuration['snapchat_pixel_id'] ?? '',
                'gtm_id' => $configuration['gtm_id'] ?? '',
            ],
            'storeSettings' => $storeSettings,
        ];
    }

    /**
     * Display the store homepage.
     */
    public function home($storeSlug, ?Request $request = null)
    {
        $store = $this->getStore($storeSlug, $request);

        // Get store configuration with settings and currencies
        $storeData = $this->getStoreConfig($store);

        $storeModel = Store::find($store['id']);
        
        // Cache the serialized product catalog for 5 minutes. This avoids
        // re-hydrating + re-serializing every product on every page view.
        // Cache key includes theme, locale, and active status for proper isolation.
        // Invalidated automatically when a product is saved/deleted (see
        // Product model boot()).
        $theme = $store['theme'] ?? 'core-minimal';
        $locale = $storeData['config']['locale'] ?? 'ar';
        $cacheKey = "store_catalog.{$store['id']}.theme_{$theme}.locale_{$locale}.active_1";
        
        $products = \Illuminate\Support\Facades\Cache::remember(
            $cacheKey,
            300,
            function () use ($store) {
                return Product::where('store_id', $store['id'])
                    ->where('is_active', true)
                    ->with('category')
                    ->orderBy('created_at', 'desc')
                    // Hard cap to keep the storefront payload bounded even for
                    // stores with thousands of products.
                    ->limit(300)
                    ->get()
                    ->map(function ($product) {
                        // The initial payload only carries what the grid/cards
                        // need for fast first paint. Heavy detail fields
                        // (description, customFields, tax) are served on demand
                        // by the store.product-detail endpoint.
                        $catalog = $this->formatFullProduct($product);
                        unset($catalog['description'], $catalog['customFields'], $catalog['taxName'], $catalog['taxPercentage']);
                        return $catalog;
                    })
                    ->values();
            }
        );
        
        // Get categories for the store
        $categories = \Illuminate\Support\Facades\Cache::remember(
            "store_categories.{$store['id']}.theme_{$theme}.locale_{$locale}",
            300,
            function () use ($store) {
                return Category::where('store_id', $store['id'])
                    ->where('is_active', true)
                    ->whereNull('parent_id')
                    ->withCount(['products' => function ($query) {
                        $query->where('is_active', true);
                    }])
                    ->orderBy('sort_order')
                    ->orderBy('name')
                    ->get()
                    ->map(function ($category) {
                        return [
                            'id' => (string) $category->id,
                            'name' => $category->name,
                            'description' => $category->description,
                            'product_count' => $category->products_count,
                        ];
                    })
                    ->values();
            }
        );

        // Get currencies (cached for 24h - rarely changes)
        $currencies = [];
        if ($storeModel && $storeModel->user) {
            $currencies = \Illuminate\Support\Facades\Cache::remember(
                'currencies_all',
                86400,
                function () {
                    return \App\Models\Currency::orderBy('name')->get()->map(function ($currency) {
                        return [
                            'code' => $currency->code,
                            'symbol' => $currency->symbol,
                            'name' => $currency->name
                        ];
                    })->toArray();
                }
            );
        }

        $theme = $store['theme'] ?? 'core-minimal';

        // Live template preview: ?theme=<slug>&preview=1 overrides the store's
        // saved theme so merchants can preview any of the 29 templates without
        // changing their store. The slug is validated against the catalog so an
        // arbitrary query value can never reach the renderer.
        $theme = $this->applyPreviewTheme($request, $theme, $storeModel && $storeModel->user ? $storeModel->user->plan : null);

        // Get countries for checkout modal (cached for 24h)
        $countries = \Illuminate\Support\Facades\Cache::remember(
            'countries_active',
            86400,
            function () {
                return \App\Models\Country::active()->orderBy('name')->get()->map(function ($country) {
                    return [
                        'id' => $country->id,
                        'name' => $country->name,
                        'code' => $country->code
                    ];
                })->toArray();
            }
        );
        
        $props = array_merge([
            'config' => $storeData['config'],
            'categories' => $categories,
            'products' => $products,
            'store' => $store,
            'theme' => $theme,
            'storeSettings' => $storeData['storeSettings'],
            'storeContent' => $storeModel && $storeModel->exists
                ? $storeModel->getMergedStoreContent()
                : [],
            // Schema-driven theme engine: the store's saved theme.config.json
            // (or the bundled preset) plus the uploaded banner slides, so an
            // applied engine theme fully reflects on the live subdomain.
            'themeConfig' => \App\Services\ThemeConfigService::isEngineTheme($theme)
                ? ($storeModel->theme_config ?? \App\Services\ThemeConfigService::resolve($theme))
                : null,
            'bannerSlides' => $storeModel && $storeModel->exists
                ? \App\Services\ThemeConfigService::bannerSlides($storeModel->theme_config)
                    ?: ($storeModel->store_content['banners'] ?? [])
                : [],
            'designTokens' => $storeModel && $storeModel->design_tokens ? $storeModel->design_tokens : [],
            'templateOverrides' => $storeModel && $storeModel->template_overrides ? $storeModel->template_overrides : [],
            'offers' => $storeModel && $storeModel->exists
                ? $storeModel->offers()->where('is_active', true)->get()->map(function ($offer) {
                    return [
                        'id' => $offer->id,
                        'title' => $offer->title,
                        'subtitle' => $offer->subtitle,
                        'image' => $offer->image,
                        'product_id' => $offer->product_id,
                        'link' => $offer->link,
                        'discount_percent' => $offer->discount_percent,
                        'product' => $offer->product ? [
                            'id' => (string) $offer->product->id,
                            'name' => $offer->product->name,
                            'price' => $offer->product->sale_price ? (float) $offer->product->sale_price : (float) $offer->product->price,
                            'original_price' => $offer->product->sale_price ? (float) $offer->product->price : null,
                        ] : null,
                    ];
                })->values()->all()
                : [],
            'storePages' => $storeModel && $storeModel->exists
                ? $storeModel->pages()->where('is_active', true)->get(['id', 'slug', 'title'])->map(function ($page) {
                    return ['id' => $page->id, 'slug' => $page->slug, 'title' => $page->title];
                })->values()->all()
                : [],
            'behavior' => $this->getStoreBehavior($storeModel),
            'currencies' => $currencies,
            'countries' => $countries,
            'secondaryCurrency' => $storeData['config']['secondaryCurrency'],
            'vat' => $storeData['config']['vat'],
            'locale' => $storeData['config']['locale'],
            'storeCurrency' => [
                'code' => $storeData['config']['secondaryCurrency'] ?? 'USD',
                'symbol' => '$',
                'name' => 'USD'
            ],
        ]);

        // Pass the store's selected theme slug; the frontend maps it to a
        // dedicated template page (or falls back to the core template).
        $props['template'] = $theme;

        // Storefront template gating uses the OWNER's plan tier (the viewer is
        // usually anonymous), so premium templates render when the owner has
        // Growth/Pro instead of showing an upgrade prompt.
        $ownerPlan = $storeModel && $storeModel->user ? $storeModel->user->plan : null;
        $props['userPlanName'] = $ownerPlan ? $ownerPlan->name : null;
        $props['userPlanTier'] = $this->planTierFor($ownerPlan);
        $props['isPreview'] = $request ? $request->boolean('preview') : false;

        return Inertia::render('store/dynamic', array_merge($props, [
            'showResetModal' => $request ? $request->get('showResetModal', false) : false,
            'resetToken' => $request ? $request->get('resetToken') : null,
            'action' => $this->resolveAction(),
            'wishlistCount' => $this->getWishlistCount($store['id']),
            'payment_status' => session()->pull('payment_status') ?? (request() ? request()->get('payment_status') : null),
            'order_number' => session()->pull('order_number') ?? (request() ? request()->get('order_number') : null),
        ], $this->getCommonData()));
    }

    /**
     * Full product shape used by the product detail endpoint and (minus the
     * heavy detail-only fields) by the storefront catalog payload.
     */
    private function formatFullProduct(Product $product): array
    {
        return [
            'id' => (string) $product->id,
            'name' => $product->name,
            'price' => $product->sale_price ? (float) $product->sale_price : (float) $product->price,
            'originalPrice' => $product->sale_price ? (float) $product->price : null,
            'image' => $product->cover_image ? $product->cover_image : asset('public/images/avatar/avatar.png'),
            'images' => $product->images ? (is_array($product->images) ? $product->images : (strpos($product->images, ',') !== false ? explode(',', $product->images) : json_decode($product->images, true))) : null,
            'categoryId' => (string) $product->category_id,
            'category' => $product->category ? $product->category->name : 'Uncategorized',
            'availability' => $product->stock > 0 ? 'in_stock' : 'out_of_stock',
            'sku' => $product->sku ?: 'SKU-' . $product->id,
            'stockQuantity' => (int) $product->stock,
            'metaTitle' => $product->meta_title,
            'metaDescription' => $product->meta_description,
            'seoUrlSlug' => $product->seo_url_slug ?: $product->id,
            'description' => $product->description,
            'short_description' => $product->short_description,
            'variants' => $product->variants ? (is_array($product->variants) ? $product->variants : json_decode($product->variants, true)) : null,
            'variantCombinations' => $product->variant_combinations ? (is_array($product->variant_combinations) ? $product->variant_combinations : json_decode($product->variant_combinations, true)) : null,
            'customFields' => $product->custom_fields ? (is_array($product->custom_fields) ? $product->custom_fields : json_decode($product->custom_fields, true)) : null,
            'taxName' => $product->tax_name ?? null,
            'taxPercentage' => $product->tax_percentage ?? null,
        ];
    }

    /**
     * On-demand product details for the storefront detail modal. Keeps heavy
     * fields (description, customFields, tax) out of the initial page payload.
     */
    public function productDetail($storeSlug, $product, ?Request $request = null)
    {
        $store = $this->getStore($storeSlug, $request);

        $productModel = Product::where('store_id', $store['id'])
            ->where('id', $product)
            ->with('category')
            ->first();

        if (!$productModel) {
            return response()->json(['error' => 'Product not found'], 404);
        }

        return response()->json(['product' => $this->formatFullProduct($productModel)]);
    }

    /**
     * Runtime `theme.config.json` for the schema-driven Theme Engine.
     *
     * Serves the JSON shipped in public/theme-configs/<theme>.json (falling
     * back to the bundled preset delivered client-side when the file is
     * absent). Returning proper JSON here also keeps the storefront catch-all
     * route from swallowing the request and answering with HTML.
     */
    public function themeConfig($storeSlug, $theme, ?Request $request = null)
    {
        $slug = Store::normalizeThemeSlug($theme);

        if (!in_array($slug, Store::ENGINE_THEMES, true)) {
            return response()->json(['error' => 'Not an engine theme'], 404);
        }

        $path = public_path("theme-configs/{$slug}.json");
        if (!file_exists($path)) {
            return response()->json(['error' => 'No override config'], 404);
        }

        $json = json_decode((string) file_get_contents($path), true);
        if (!is_array($json)) {
            return response()->json(['error' => 'Invalid theme config'], 500);
        }

        return response()->json($json);
    }

    /**
     * Render a custom store page (Professional plan feature).
     * Pages render through the same template chrome as the homepage so the
     * header/footer/theme stay consistent.
     */
    public function page($storeSlug, $slug, ?Request $request = null)
    {
        $store = $this->getStore($storeSlug, $request);

        $storeModel = Store::find($store['id']);

        $page = $storeModel && $storeModel->exists
            ? $storeModel->pages()->where('slug', $slug)->where('is_active', true)->first()
            : null;

        if (!$page) {
            abort(404);
        }

        $storeData = $this->getStoreConfig($store);
        $theme = $store['theme'] ?? 'core-minimal';

        $props = [
            'config' => $storeData['config'],
            'store' => $store,
            'theme' => $theme,
            'storeSettings' => $storeData['storeSettings'],
            'storeContent' => $storeModel->getMergedStoreContent(),
            'designTokens' => $storeModel->design_tokens ?? [],
            'templateOverrides' => $storeModel->template_overrides ?? [],
            'offers' => [],
            'storePages' => $storeModel->pages()->where('is_active', true)->get(['id', 'slug', 'title'])->map(fn ($p) => ['id' => $p->id, 'slug' => $p->slug, 'title' => $p->title])->values()->all(),
            'behavior' => $this->getStoreBehavior($storeModel),
            'page' => [
                'title' => $page->title,
                'content' => $page->content,
                'image' => $page->image,
                'meta_title' => $page->meta_title,
                'meta_description' => $page->meta_description,
            ],
            'locale' => $storeData['config']['locale'],
        ];

        $props['template'] = $theme;

        $ownerPlan = $storeModel->user ? $storeModel->user->plan : null;
        $props['userPlanName'] = $ownerPlan ? $ownerPlan->name : null;
        $props['userPlanTier'] = $this->planTierFor($ownerPlan);
        $props['isPreview'] = $request ? $request->boolean('preview') : false;

        return Inertia::render('store/dynamic', array_merge($props, $this->getCommonData()));
    }

    /**
     * Resolve the account deep-link action from the query string or the URL path.
     * Supports: ?action=my-orders as well as /my-orders, /my-profile, /wishlist, /my-downloads.
     */
    protected function resolveAction(): ?string
    {
        $action = request()->get('action');
        if ($action) {
            return $action;
        }

        $segment = explode('/', trim(request()->path(), '/'))[0] ?? '';
        $allowed = ['my-orders', 'my-profile', 'wishlist', 'my-downloads'];

        return in_array($segment, $allowed, true) ? $segment : null;
    }

    /**
     * Get the wishlist count for the current customer (or session).
     */
    protected function getWishlistCount($storeId): int
    {
        $query = WishlistItem::where('store_id', $storeId);

        if (Auth::guard('customer')->check()) {
            $query->where('customer_id', Auth::guard('customer')->id());
        } else {
            $query->where('session_id', session()->getId())->whereNull('customer_id');
        }

        return $query->count();
    }

    /**
     * Find an order that belongs to the current customer session. Only orders
     * placed under the current customer id or the current guest session id are
     * returned, preventing unauthenticated IDOR access to other buyers' orders.
     */
    protected function findOwnedOrder($orderNumber, $storeId): ?Order
    {
        $customer = Auth::guard('customer')->user();

        return Order::where('order_number', $orderNumber)
            ->where('store_id', $storeId)
            ->where(function ($query) use ($customer) {
                $query->where('session_id', session()->getId());
                if ($customer) {
                    $query->orWhere('customer_id', $customer->id);
                }
            })
            ->with(['items.product', 'shippingMethod'])
            ->first();
    }

    /**
     * Display the order confirmation page.
     */
    public function orderConfirmation($storeSlug, $orderNumber = null)
    {
        $store = $this->getStore($storeSlug);
        
        // Get order data for the invoice (ownership-scoped to prevent IDOR)
        $orderData = $this->findOwnedOrder($orderNumber, $store['id']);
            
        $storeSettings = [];
        $configuration = [];
        $storeModel = Store::find($store['id']);
        if ($storeModel && $storeModel->user) {
            $storeSettings = \App\Models\Setting::getUserSettings($storeModel->user->id, $store['id']);
            $configuration = StoreConfiguration::getConfiguration($store['id']);
        }

        $order = null;
        if ($orderData) {
            $order = [
                'id' => $orderData->order_number,
                'date' => $orderData->created_at->toISOString(),
                'status' => ucfirst($orderData->status),
                'total' => (float) $orderData->total_amount,
                'subtotal' => (float) $orderData->subtotal,
                'discount' => (float) $orderData->discount_amount,
                'shipping' => (float) $orderData->shipping_amount,
                'tax' => (float) $orderData->tax_amount,
                'currency' => $storeSettings['currency_symbol'] ?? '$',
                'customer' => [
                    'name' => $orderData->customer_first_name . ' ' . $orderData->customer_last_name,
                    'email' => $orderData->customer_email,
                    'phone' => $orderData->customer_phone,
                ],
                'shipping_address' => [
                    'name' => $orderData->customer_first_name . ' ' . $orderData->customer_last_name,
                    'address' => $orderData->shipping_address,
                    'city' => is_numeric($orderData->shipping_city) ? (\App\Models\City::find($orderData->shipping_city)->name ?? $orderData->shipping_city) : $orderData->shipping_city,
                    'state' => is_numeric($orderData->shipping_state) ? (\App\Models\State::find($orderData->shipping_state)->name ?? $orderData->shipping_state) : $orderData->shipping_state,
                    'postal_code' => $orderData->shipping_postal_code,
                    'country' => is_numeric($orderData->shipping_country) ? (\App\Models\Country::find($orderData->shipping_country)->name ?? $orderData->shipping_country) : $orderData->shipping_country,
                ],
                'items' => $orderData->items->map(function ($item) {
                    return [
                        'name' => $item->product_name,
                        'price' => (float) $item->unit_price,
                        'quantity' => $item->quantity,
                        'image' => $item->product->cover_image ?? '/placeholder.jpg',
                        'variants' => $item->product_variants,
                    ];
                })->toArray(),
            ];
        } else {
            abort(404, 'Order not found');
        }

        // We need some common store props even for invoice page to satisfy ThemeProvider
        $config = [
            'storeName' => $store['name'],
            'logo' => $configuration['logo'] ?? '',
            'currency' => $storeSettings['currency_symbol'] ?? '$',
            'phoneNumber' => $storeSettings['phone'] ?? '',
            'locale' => $storeSettings['language'] ?? 'ar',
            'secondaryCurrency' => $this->resolveSecondaryCurrency($storeSettings),
            'vat' => [
                'vat_number' => $storeSettings['vat_number'] ?? null,
                'tax_registration_number' => $storeSettings['tax_registration_number'] ?? null,
            ],
        ];

        return Inertia::render('store/order-invoice', array_merge([
            'orderNumber' => $orderNumber,
            'order' => $order,
            'config' => $config,
            'store' => $store,
            'storeSettings' => $storeSettings,
            'secondaryCurrency' => $this->resolveSecondaryCurrency($storeSettings),
            'vat' => $config['vat'],
            'locale' => $config['locale'],
            'payment_status' => 'success',
            'cartCount' => 0,
            'wishlistCount' => 0,
        ], $this->getCommonData()));
    }

    /**
     * Display the order detail page (standalone invoice page).
     */
    public function orderDetail($storeSlug, $orderNumber)
    {
        return $this->orderConfirmation($storeSlug, $orderNumber);
    }

    /**
     * Display the forgot password page.
     */
    public function forgotPassword($storeSlug)
    {
        $store = $this->getStore($storeSlug);
        
        // Get dynamic content from database
        $storeContent = StoreSetting::getSettings($store['id'], $store['theme']);
        
        return Inertia::render('store/auth/forgot-password', array_merge([
            'store' => $store,
            'theme' => $store['theme'],
            'storeContent' => $storeContent,
            'cartCount' => 0,
            'wishlistCount' => 0,
        ], $this->getCommonData()));
    }

    /**
     * Display the reset password page.
     */
    public function resetPassword($storeSlug, $token)
    {
        $store = $this->getStore($storeSlug);
        
        return Inertia::render('store/auth/reset-password', array_merge([
            'store' => $store,
            'theme' => $store['theme'],
            'token' => $token,
            'cartCount' => 0,
            'wishlistCount' => 0,
        ], $this->getCommonData()));
    }

    /**
     * Download order PDF
     */
    public function downloadOrderPdf($storeSlug, $orderNumber)
    {
        $store = $this->getStore($storeSlug);
        
        // Get order data (ownership-scoped to prevent IDOR)
        $orderData = $this->findOwnedOrder($orderNumber, $store['id']);
            
        if (!$orderData) {
            abort(404, 'Order not found');
        }
        
        // Get store configuration
        $storeModel = Store::find($store['id']);
        $storeSettings = [];
        $currencies = [];
        
        if ($storeModel && $storeModel->user) {
            $storeSettings = \App\Models\Setting::getUserSettings($storeModel->user->id, $store['id']);
            $currencies = \App\Models\Currency::all()->map(function ($currency) {
                return [
                    'code' => $currency->code,
                    'symbol' => $currency->symbol,
                    'name' => $currency->name
                ];
            })->toArray();
        }
        
        $order = [
            'id' => $orderData->order_number,
            'date' => $orderData->created_at->toISOString(),
            'status' => ucfirst($orderData->status),
            'total' => (float) $orderData->total_amount,
            'subtotal' => (float) $orderData->subtotal,
            'discount' => (float) $orderData->discount_amount,
            'shipping' => (float) $orderData->shipping_amount,
            'tax' => (float) $orderData->tax_amount,
            'currency' => $storeSettings['currency_symbol'] ?? '$',
            'coupon' => $orderData->coupon_code,
            'payment_method' => $orderData->payment_method === 'cod' ? 'Cash on Delivery' : ucfirst(str_replace('_', ' ', $orderData->payment_method)),
            'customer' => [
                'name' => $orderData->customer_first_name . ' ' . $orderData->customer_last_name,
                'email' => $orderData->customer_email,
                'phone' => $orderData->customer_phone,
            ],
            'shipping_address' => [
                'name' => $orderData->customer_first_name . ' ' . $orderData->customer_last_name,
                'address' => $orderData->shipping_address,
                'city' => is_numeric($orderData->shipping_city) ? (\App\Models\City::find($orderData->shipping_city)->name ?? $orderData->shipping_city) : $orderData->shipping_city,
                'state' => is_numeric($orderData->shipping_state) ? (\App\Models\State::find($orderData->shipping_state)->name ?? $orderData->shipping_state) : $orderData->shipping_state,
                'postal_code' => $orderData->shipping_postal_code,
                'country' => is_numeric($orderData->shipping_country) ? (\App\Models\Country::find($orderData->shipping_country)->name ?? $orderData->shipping_country) : $orderData->shipping_country,
            ],
            'items' => $orderData->items->map(function ($item) {
                $taxDetails = json_decode($item->tax_details, true) ?? [];
                return [
                    'name' => $item->product_name,
                    'price' => (float) $item->unit_price,
                    'quantity' => $item->quantity,
                    'variants' => $item->product_variants,
                    'tax_name' => $taxDetails['tax_name'] ?? null,
                    'tax_percentage' => $taxDetails['tax_percentage'] ?? null,
                    'tax_amount' => (float) ($taxDetails['tax_amount'] ?? 0),
                ];
            })->toArray(),
        ];
        
        $storeData = $this->getStoreConfig($store);
        
        $data = [
            'orderNumber' => $orderNumber,
            'order' => $order,
            'config' => $storeData['config'],
            'storeSettings' => $storeSettings,
            'currencies' => $currencies,
            'secondaryCurrency' => $this->resolveSecondaryCurrency($storeSettings),
            'vat' => $storeData['config']['vat'],
            'locale' => $storeData['config']['locale'],
        ];
        
        $pdf = Pdf::loadView('pdf.invoice', $data);
        return $pdf->download("invoice-{$orderNumber}.pdf");
    }
}