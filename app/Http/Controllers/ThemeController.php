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
            $available = Store::normalizeThemeList($ownerPlan->themes);
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
        $designTokens = $store->design_tokens ?? [];
        
        // Get favicon from design_tokens first (designer source of truth), then store config, then user settings
        $favicon = $designTokens['favicon'] ?? $configuration['favicon'] ?? '';
        // Also check store_content fallback
        if (empty($favicon) && !empty($store->store_content['brand']['favicon'])) $favicon = $store->store_content['brand']['favicon'];
        if (empty($favicon) && !empty($store->store_content['favicon'])) $favicon = $store->store_content['favicon'];
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
        
        $brandingLogo = $designTokens['logo'] ?? $configuration['logo'] ?? '';
        if (empty($brandingLogo) && !empty($store->store_content['brand']['logo'])) $brandingLogo = $store->store_content['brand']['logo'];
        if (empty($brandingLogo) && !empty($store->store_content['logo'])) $brandingLogo = $store->store_content['logo'];

        // Custom assets: canonical is StoreConfiguration, fallback to template_overrides for designer compatibility
        $overrides = $store->template_overrides ?? [];
        return [
            'id' => $store->id,
            'name' => $store->name,
            'email' => $store->email,
            'logo' => $brandingLogo ?: asset('images/logos/logo-light.png'),
            'favicon' => $faviconForPWA,
            'description' => $store->description,
            'theme' => $store->getTemplateSlug(),
            'slug' => $store->slug,
            'custom_domain' => $store->custom_domain,
            'custom_subdomain' => $store->custom_subdomain,
            'enable_custom_domain' => $store->enable_custom_domain,
            'enable_custom_subdomain' => $store->enable_custom_subdomain,
            'custom_css' => $configuration['custom_css'] ?? $overrides['custom_css'] ?? '',
            'custom_javascript' => $configuration['custom_javascript'] ?? $overrides['custom_js'] ?? '',
            'custom_head_scripts' => $configuration['custom_head_scripts'] ?? $overrides['head_inject'] ?? '',
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
      * Single source of truth including canonical registration + verification enum.
      */
    protected function getStoreBehavior(Store $store = null): array
    {
        if (!$store) {
            return [
                'enable_customer_login' => true,
                'enable_customer_registration' => true,
                'customer_registration_enabled' => true,
                'require_login_checkout' => false,
                'show_whatsapp_order_button' => true,
                'show_search' => true,
                'show_cart' => true,
                'show_auth_button' => true,
                'customer_accounts_enabled' => true,
                'guest_checkout' => true,
                'customer_verification_method' => 'email',
                'free_shipping_enabled' => false,
                'free_shipping_threshold' => null,
            ];
        }

        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $toBool = [\App\Models\StoreConfiguration::class, 'toBool'];
        $master = $toBool($config['customer_accounts_enabled'] ?? null, true);

        // show_auth_button is legacy alias for enable_customer_login — both must be true for login to be enabled
        $loginRaw = $toBool($config['enable_customer_login'] ?? null, true);
        $showAuthRaw = $toBool($config['show_auth_button'] ?? null, true);
        $effectiveLogin = $master && $loginRaw && $showAuthRaw;
        $effectiveRegistration = $master && $toBool($config['customer_registration_enabled'] ?? $config['enable_customer_registration'] ?? null, true);
        $verificationMethod = strtolower(trim((string)($config['customer_verification_method'] ?? 'email')));
        $verificationMethod = in_array($verificationMethod, ['none','email'], true) ? $verificationMethod : 'email';

        // Canonical Free Shipping - business setting, not visual
        $freeEnabled = $toBool($config['free_shipping_enabled'] ?? null, false);
        $freeThresholdRaw = $config['free_shipping_threshold'] ?? '';
        $freeThreshold = is_numeric($freeThresholdRaw) && (float)$freeThresholdRaw > 0 ? (float)$freeThresholdRaw : null;

        return [
            'enable_customer_login' => $effectiveLogin,
            'enable_customer_registration' => $effectiveRegistration,
            'customer_registration_enabled' => $effectiveRegistration,
            'require_login_checkout' => $master && $toBool($config['require_login_checkout'] ?? null, false),
            'customer_accounts_enabled' => $master,
            'guest_checkout' => $master ? $toBool($config['guest_checkout'] ?? null, true) : true,
            'show_auth_button' => $effectiveLogin,
            'customer_verification_method' => $verificationMethod,
            'free_shipping_enabled' => $freeEnabled,
            'free_shipping_threshold' => $freeThreshold,
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
        $configuration = $storeModel ? StoreConfiguration::getConfiguration($store['id']) : [];
        $designTokens = $storeModel ? ($storeModel->design_tokens ?? []) : [];
        
        if ($storeModel && $storeModel->user) {
            $storeSettings = \App\Models\Setting::getUserSettings($storeModel->user->id, $store['id']);
            try {
                $loyalty = \App\Models\LoyaltySetting::forStore($store['id']);
                $storeSettings['loyalty'] = [
                    'is_enabled' => (bool) $loyalty->is_enabled,
                    'points_per_currency' => (float) $loyalty->points_per_currency,
                    'points_value' => (float) $loyalty->points_value,
                    'minimum_redemption_points' => (float) $loyalty->minimum_redemption_points,
                    'maximum_discount_percentage' => (float) $loyalty->maximum_discount_percentage,
                ];
            } catch (\Throwable $e) {
                $storeSettings['loyalty'] = ['is_enabled' => false, 'points_per_currency' => 1, 'points_value' => 0.01, 'minimum_redemption_points' => 100, 'maximum_discount_percentage' => 50];
            }
        }
        
        // Branding source of truth: design_tokens.logo/favicon take precedence over
        // StoreConfiguration (designer saves there). Fallback chain keeps legacy stores working.
        $brandingLogo = $designTokens['logo'] ?? $configuration['logo'] ?? '';
        // Also check store_content as tertiary fallback (designer dual-writes there)
        if (empty($brandingLogo) && $storeModel && !empty($storeModel->store_content['brand']['logo'])) {
            $brandingLogo = $storeModel->store_content['brand']['logo'];
        }
        if (empty($brandingLogo) && $storeModel && !empty($storeModel->store_content['logo'])) {
            $brandingLogo = $storeModel->store_content['logo'];
        }
        $brandingFavicon = $designTokens['favicon'] ?? $configuration['favicon'] ?? '';
        if (empty($brandingFavicon) && $storeModel && !empty($storeModel->store_content['brand']['favicon'])) {
            $brandingFavicon = $storeModel->store_content['brand']['favicon'];
        }
        if (empty($brandingFavicon) && $storeModel && !empty($storeModel->store_content['favicon'])) {
            $brandingFavicon = $storeModel->store_content['favicon'];
        }

        return [
            'config' => [
                'storeName' => $store['name'] ?? 'gadgets',
                'logo' => $brandingLogo,
                'favicon' => $brandingFavicon,
                'phoneNumber' => $storeSettings['phone'] ?? '+1-555-123-4567',
                'currency' => $storeSettings['currency_symbol'] ?? '$',
                'address' => $configuration['address'] ?? '',
                'city' => $configuration['city'] ?? '',
                'state' => $configuration['state'] ?? '',
                'country' => $configuration['country'] ?? '',
                'postalCode' => $configuration['postal_code'] ?? '',
                'email' => $store['email'] ?? '',
                'description' => ($configuration['store_description'] ?? ($storeModel?->store_content['store_description'] ?? ($storeModel?->store_content['description'] ?? ($store['description'] ?? '')))),
                'welcomeMessage' => $configuration['welcome_message'] ?? ($storeModel?->store_content['welcome_message'] ?? null),
                'copyrightText' => $configuration['copyright_text'] ?? ($storeModel?->store_content['copyright_text'] ?? null),
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
        $theme = $store['theme'] ?? \App\Models\Store::DEFAULT_TEMPLATE;
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
                    ->orderBy('id')
                    ->get()
                    ->map(function ($category) {
                        return [
                            'id' => (string) $category->id,
                            'name' => $category->name,
                            'slug' => $category->slug,
                            'image' => $category->image ?: null,
                            'description' => $category->description,
                            'product_count' => $category->products_count,
                        ];
                    })
                    ->values();
            }
        );

        // Get currencies (cached for 24h - rarely changes)
        $currencies = $this->getCurrencies($storeModel);

        $theme = $store['theme'] ?? \App\Models\Store::DEFAULT_TEMPLATE;

        // Live template preview: ?theme=<slug>&preview=1 overrides the store's
        // saved theme so merchants can preview any template without
        // changing their store. The slug is validated against the catalog so an
        // arbitrary query value can never reach the renderer.
        $theme = $this->applyPreviewTheme($request, $theme, $storeModel && $storeModel->user ? $storeModel->user->plan : null);

        return Inertia::render('store/dynamic', array_merge(
            $this->storefrontViewProps($store, $storeData, $storeModel, $theme, $categories, $products, $request),
            [
                'showResetModal' => $request ? $request->get('showResetModal', false) : false,
                'resetToken' => $request ? $request->get('resetToken') : null,
                'action' => $this->resolveAction(),
                'wishlistCount' => $this->getWishlistCount($store['id']),
                'payment_status' => session()->pull('payment_status') ?? (request() ? request()->get('payment_status') : null),
                'order_number' => session()->pull('order_number') ?? (request() ? request()->get('order_number') : null),
            ],
            $this->getCommonData()
        ));
    }

    /**
     * Dedicated category listing page (/category/{slug}).
     * Independent paginated query — no 300-product hard cap.
     */
    public function category($storeSlug, $slug, ?Request $request = null)
    {
        $store = $this->getStore($storeSlug, $request);
        $storeData = $this->getStoreConfig($store);
        $storeModel = Store::find($store['id']);

        // Accept both the category slug and legacy numeric ids (/category/{id}).
        $category = Category::where('store_id', $store['id'])
            ->where('is_active', true)
            ->when(
                ctype_digit((string) $slug),
                fn ($q) => $q->where(fn ($qq) => $qq->where('slug', $slug)->orWhere('id', (int) $slug)),
                fn ($q) => $q->where('slug', $slug),
            )
            ->first();
        if (!$category) {
            abort(404);
        }

        $theme = $store['theme'] ?? \App\Models\Store::DEFAULT_TEMPLATE;
        $locale = $storeData['config']['locale'] ?? 'ar';

        // Categories for header/nav chrome (same cached payload as home).
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
                    ->orderBy('id')
                    ->get()
                    ->map(function ($cat) {
                        return [
                            'id' => (string) $cat->id,
                            'name' => $cat->name,
                            'slug' => $cat->slug,
                            'image' => $cat->image ?: null,
                            'description' => $cat->description,
                            'product_count' => $cat->products_count,
                        ];
                    })
                    ->values();
            }
        );

        // Sort whitelist.
        $sort = $request->get('sort');
        if (!in_array($sort, ['newest', 'price_asc', 'price_desc', 'name'], true)) {
            $sort = 'newest';
        }

        $query = Product::where('store_id', $store['id'])
            ->where('is_active', true)
            ->where('category_id', $category->id);

        switch ($sort) {
            case 'price_asc':
                $query->orderByRaw('COALESCE(NULLIF(sale_price, 0), price) ASC');
                break;
            case 'price_desc':
                $query->orderByRaw('COALESCE(NULLIF(sale_price, 0), price) DESC');
                break;
            case 'name':
                $query->orderBy('name');
                break;
            default:
                $query->orderBy('created_at', 'desc');
        }

        $perPage = 12;
        $paginator = $query->paginate($perPage)->withQueryString();

        $products = collect($paginator->items())
            ->map(function ($product) {
                $catalog = $this->formatFullProduct($product);
                unset($catalog['description'], $catalog['customFields'], $catalog['taxName'], $catalog['taxPercentage']);
                return $catalog;
            })
            ->values();

        $theme = $this->applyPreviewTheme($request, $theme, $storeModel && $storeModel->user ? $storeModel->user->plan : null);

        return Inertia::render('store/category', array_merge(
            $this->storefrontViewProps($store, $storeData, $storeModel, $theme, $categories, $products, $request),
            [
                'action' => $this->resolveAction(),
                'wishlistCount' => $this->getWishlistCount($store['id']),
                'categoryPage' => [
                    'category' => [
                        'id' => (string) $category->id,
                        'name' => $category->name,
                        'slug' => $category->slug,
                        'image' => $category->image ?: null,
                        'description' => $category->description,
                        'product_count' => (int) $category->products()->where('is_active', true)->count(),
                    ],
                    'total' => $paginator->total(),
                    'perPage' => $paginator->perPage(),
                    'currentPage' => $paginator->currentPage(),
                    'lastPage' => $paginator->lastPage(),
                    'sort' => $sort,
                ],
            ],
            $this->getCommonData()
        ));
    }

    /** Currencies payload shared by storefront views (cached 24h). */
    private function getCurrencies($storeModel): array
    {
        if (!$storeModel || !$storeModel->user) {
            return [];
        }
        return \Illuminate\Support\Facades\Cache::remember(
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

    /**
     * Shared prop payload for every storefront view (home + category page).
     * Keeps the two controllers in lockstep so the store chrome renders
     * identically on both.
     */
    private function storefrontViewProps(array $store, array $storeData, $storeModel, string $theme, $categories, $products, ?Request $request = null): array
    {
        $currencies = $this->getCurrencies($storeModel);

        // Get countries for checkout modal (cached for 24h) — restricted to platform allow-list
        $allowedCodes = config('storefront.supported_customer_countries', ['PSE', 'ISR', 'JOR']);
        $countriesCacheKey = 'countries_active_storefront_' . implode('_', $allowedCodes);
        $countries = \Illuminate\Support\Facades\Cache::remember(
            $countriesCacheKey,
            86400,
            function () use ($allowedCodes) {
                return \App\Models\Country::active()
                    ->whereIn('code', $allowedCodes)
                    ->orderBy('name')->get()->map(function ($country) {
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
            // Schema-driven theme engine: retired — always null now.
            'themeConfig' => null,
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
                'code' => $storeData['config']['secondaryCurrency'] ?? 'ILS',
                'symbol' => '₪',
                'name' => 'ILS'
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
        // Owner preview of an unpublished store: set by CheckStoreStatus/DomainResolver
        $isOwnerPreview = $request ? (bool) $request->attributes->get('store_preview', false) : false;
        // Also detect direct token/session preview without middleware flag
        if (!$isOwnerPreview && $request && $storeModel) {
            $cfg = \App\Models\StoreConfiguration::getConfiguration($storeModel->id);
            if (!($cfg['store_status'] ?? true)) {
                $isOwnerPreview = \App\Services\StorePreviewService::canPreview($request, $storeModel);
            }
        }
        $props['isOwnerPreview'] = $isOwnerPreview;
        if ($isOwnerPreview) {
            $locale = app()->getLocale();
            $props['previewBanner'] = $locale === 'ar'
                ? 'وضع المعاينة — المتجر غير منشور'
                : 'Preview Mode — Store is not published';
        }

        return $props;
    }

    /**
     * Full product shape used by the product detail endpoint and (minus the
     * heavy detail-only fields) by the storefront catalog payload.
     */
    private function formatFullProduct(Product $product): array
    {
        $hasSale = $product->hasEffectiveSale();
        $isVariant = \App\Services\InventoryService::isVariantInventory($product);
        $inventoryMode = $isVariant ? 'variant' : 'product';
        // Stock quantity semantics: variant-mode returns total across combinations for display, product-mode returns product.stock
        $stockQuantity = (int) $product->stock;
        $inventorySummary = \App\Services\InventoryService::variantInventorySummary($product);
        if ($isVariant) {
            $stockQuantity = (int) $inventorySummary['total_stock'];
        }
        return [
            'id' => (string) $product->id,
            'name' => $product->name,
            'price' => $hasSale ? (float) $product->sale_price : (float) $product->price,
            'originalPrice' => $hasSale ? (float) $product->price : null,
            'image' => $product->cover_image ? $product->cover_image : asset('images/avatar/avatar.png'),
            'images' => $product->images ? (is_array($product->images) ? $product->images : (strpos($product->images, ',') !== false ? explode(',', $product->images) : json_decode($product->images, true))) : null,
            'categoryId' => (string) $product->category_id,
            'category' => $product->category ? $product->category->name : 'Uncategorized',
            'availability' => $product->availabilityStatus(),
            'sku' => $product->sku ?: 'SKU-' . $product->id,
            'stockQuantity' => $stockQuantity,
            'inventoryMode' => $inventoryMode,
            'trackInventory' => (bool) $product->track_inventory,
            'allowBackorder' => (bool) $product->allow_backorder,
            'inventorySummary' => $inventorySummary,
            'metaTitle' => $product->meta_title,
            'metaDescription' => $product->meta_description,
            'seoUrlSlug' => $product->seo_url_slug ?: $product->id,
            'description' => $product->description,
            'short_description' => $product->short_description,
            'specifications' => $product->specifications ? (is_string($product->specifications) && str_starts_with(trim($product->specifications), '[') ? json_decode($product->specifications, true) : $product->specifications) : null,
            'variants' => $product->variants ? (is_array($product->variants) ? $product->variants : json_decode($product->variants, true)) : null,
            'variantCombinations' => $product->variant_combinations ? (is_array($product->variant_combinations) ? $product->variant_combinations : json_decode($product->variant_combinations, true)) : null,
            'customFields' => $product->custom_fields ? (is_array($product->custom_fields) ? $product->custom_fields : json_decode($product->custom_fields, true)) : null,
            'taxName' => $product->tax?->name ?? $product->tax_name ?? null,
            'taxPercentage' => $product->tax?->rate ?? $product->tax_percentage ?? null,
        ];
    }

    /**
     * Storefront search results page — GET /search?q=اندومي on store subdomain.
     * Store-scoped, active products only, active categories only, server-authoritative,
     * paginated, supports sort/filter. Renders Inertia store/search page reusing
     * same chrome as category/home.
     */
    public function search($storeSlug, ?Request $request = null)
    {
        $store = $this->getStore($storeSlug, $request);
        $storeData = $this->getStoreConfig($store);
        $storeModel = Store::find($store['id']);
        $theme = $store['theme'] ?? Store::DEFAULT_TEMPLATE;
        $locale = $storeData['config']['locale'] ?? 'ar';

        $raw = trim((string) ($request ? $request->input('q', $request->input('query', '')) : ''));
        $q = $raw === '' ? '' : mb_substr(preg_replace('/\s+/', ' ', trim(strip_tags($raw))), 0, 100);
        $q = trim($q);

        // Categories for header chrome
        $categories = \Illuminate\Support\Facades\Cache::remember(
            "store_categories.{$store['id']}.theme_{$theme}.locale_{$locale}",
            300,
            function () use ($store) {
                return Category::where('store_id', $store['id'])
                    ->where('is_active', true)
                    ->whereNull('parent_id')
                    ->withCount(['products' => fn($q) => $q->where('is_active', true)])
                    ->orderBy('sort_order')->orderBy('name')->orderBy('id')
                    ->get()->map(fn($cat)=>['id'=>(string)$cat->id,'name'=>$cat->name,'slug'=>$cat->slug,'image'=>$cat->image?:null,'description'=>$cat->description,'product_count'=>$cat->products_count])->values();
            }
        );

        // If query too short, return empty paginated state (still renders page with empty state)
        $products = collect([]);
        $paginator = null;
        $total = 0;
        $currentPage = 1;
        $lastPage = 1;
        $perPage = 12;
        if (mb_strlen($q) >= 2) {
            $perPage = max(6, min((int)($request?->input('per_page', 12) ?? 12), 24));
            $sort = $request?->input('sort', 'relevance');
            if (!in_array($sort, ['relevance','price_asc','price_desc','newest','name'], true)) $sort = 'relevance';
            $categoryFilter = $request?->input('category');
            $availabilityFilter = $request?->input('availability'); // all|in_stock|out_of_stock
            $onSaleFilter = $request?->boolean('on_sale');

            $query = Product::where('store_id', $store['id'])
                ->where('is_active', true)
                ->where(function($wq) use ($q){
                    $escaped = addcslashes($q, '%_');
                    $wq->where(fn($s)=> $s->where('name','like',"%{$escaped}%")->orWhere('sku','like',"%{$escaped}%")->orWhere('short_description','like',"%{$escaped}%")->orWhere('description','like',"%{$escaped}%"));
                    $wq->where(fn($catFilter)=> $catFilter->whereNull('category_id')->orWhereHas('category', fn($cq)=>$cq->where('is_active', true)));
                });
            if ($categoryFilter) $query->where('category_id', $categoryFilter);
            if ($onSaleFilter) $query->whereNotNull('sale_price')->whereRaw('sale_price > 0 AND sale_price < price');
            if ($availabilityFilter === 'in_stock') {
                $query->where(function ($aq) {
                    $aq->where('track_inventory', false)
                      ->orWhere('allow_backorder', true)
                      ->orWhere('stock', '>', 0);
                });
            } elseif ($availabilityFilter === 'out_of_stock') {
                $query->where(function ($aq) {
                    $aq->where('track_inventory', true)
                      ->where('allow_backorder', false)
                      ->where('stock', '<=', 0);
                });
            }
            switch($sort){
                case 'price_asc': $query->orderByRaw('COALESCE(NULLIF(sale_price,0), price) ASC'); break;
                case 'price_desc': $query->orderByRaw('COALESCE(NULLIF(sale_price,0), price) DESC'); break;
                case 'newest': $query->orderBy('created_at','desc'); break;
                case 'name': $query->orderBy('name'); break;
                default: $query->orderBy('created_at','desc');
            }
            $totalFiltered = $query->clone()->count();
            $tmpPaginator = $query->paginate($perPage)->withQueryString();
            $paginator = new \Illuminate\Pagination\LengthAwarePaginator(
                $tmpPaginator->items(),
                $totalFiltered,
                $perPage,
                $tmpPaginator->currentPage(),
                ['path' => request()->url(), 'query' => request()->query()]
            );
            $products = collect($paginator->items())->map(function($p){
                $catalog = $this->formatFullProduct($p);
                unset($catalog['description'],$catalog['customFields'],$catalog['taxName'],$catalog['taxPercentage']);
                return $catalog;
            })->values();
            // Variant-aware availability post-filter
            if ($availabilityFilter === 'in_stock') $products = $products->filter(fn($pr)=> $pr['availability'] !== 'out_of_stock')->values();
            elseif ($availabilityFilter === 'out_of_stock') $products = $products->filter(fn($pr)=> $pr['availability'] === 'out_of_stock')->values();

            $total = $paginator->total();
            $currentPage = $paginator->currentPage();
            $lastPage = $paginator->lastPage();
        }

        $theme = $this->applyPreviewTheme($request, $theme, $storeModel && $storeModel->user ? $storeModel->user->plan : null);

        return Inertia::render('store/search', array_merge(
            $this->storefrontViewProps($store, $storeData, $storeModel, $theme, $categories, collect([]), $request),
            [
                'action' => $this->resolveAction(),
                'wishlistCount' => $this->getWishlistCount($store['id']),
                'searchPage' => [
                    'query' => $q,
                    'rawQuery' => $raw,
                    'products' => $products,
                    'total' => $total,
                    'perPage' => $perPage,
                    'currentPage' => $currentPage,
                    'lastPage' => $lastPage,
                    'sort' => $request?->input('sort','relevance') ?? 'relevance',
                    'category' => $request?->input('category'),
                    'availability' => $request?->input('availability','all'),
                    'onSale' => (bool)($request?->boolean('on_sale') ?? false),
                ],
            ],
            $this->getCommonData()
        ));
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
            ->where('is_active', true)
            ->with('category')
            ->first();

        if (!$productModel) {
            return response()->json(['error' => 'Product not found'], 404);
        }
        // Hide if category inactive
        if ($productModel->category && !$productModel->category->is_active) {
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
        $theme = $store['theme'] ?? \App\Models\Store::DEFAULT_TEMPLATE;

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
                        'image' => $item->product->cover_image ?? asset('images/avatar/avatar.png'),
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