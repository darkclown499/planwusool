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
        
        // Priority 3: Fallback for demo - return a default store with the actual slug
        return [
            'id' => 1, // Default store ID
            'name' => 'Demo Store',
            'email' => 'demo@example.com',
            'logo' => '/storage/media/logo.png',
            'description' => 'Demo store description',
            'theme' => 'basic',
            'slug' => $storeSlug
        ];
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
            'template_slug' => $store->getTemplateSlug(),
            'slug' => $store->slug,
            'custom_domain' => $store->custom_domain,
            'custom_subdomain' => $store->custom_subdomain,
            'enable_custom_domain' => $store->enable_custom_domain,
            'enable_custom_subdomain' => $store->enable_custom_subdomain,
            'custom_css' => $configuration['custom_css'] ?: '',
            'custom_javascript' => $configuration['custom_javascript'] ?: '',
            'pwa' => $pwaData,
            'seo_title' => $store->seo_title,
            'seo_description' => $store->seo_description,
            'seo_keywords' => $store->seo_keywords,
            'seo_image' => $store->seo_image,
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

        // Read-only theme/template preview for the demo store only: demo.APP_DOMAIN?theme=food
        $currentRequest = $request ?? request();
        if (($store['slug'] ?? null) === \App\Services\DemoStoreService::SLUG && $currentRequest && $currentRequest->has('theme')) {
            $requestedTheme = $currentRequest->query('theme');
            if ($requestedTheme) {
                // Allow previewing both new template slugs and legacy theme pages
                $isTemplate = \App\Models\Template::where('slug', $requestedTheme)->where('is_active', true)->exists();
                $isLegacyPage = in_array($requestedTheme, $this->getValidThemePages(), true);
                if ($isTemplate || $isLegacyPage) {
                    $store['theme'] = $requestedTheme;
                }
            }
        }

        // Get store configuration with settings and currencies
        $storeData = $this->getStoreConfig($store);

        $storeModel = Store::find($store['id']);
        
        // Cache the serialized product catalog for 5 minutes. This avoids
        // re-hydrating + re-serializing every product on every page view.
        // Invalidated automatically when a product is saved/deleted (see
        // Product model boot()).
        $products = \Illuminate\Support\Facades\Cache::remember(
            'store_catalog.' . $store['id'],
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
                            'description' => $product->description,
                            'variants' => $product->variants ? (is_array($product->variants) ? $product->variants : json_decode($product->variants, true)) : null,
                            'customFields' => $product->custom_fields ? (is_array($product->custom_fields) ? $product->custom_fields : json_decode($product->custom_fields, true)) : null,
                            'taxName' => $product->tax_name ?? null,
                            'taxPercentage' => $product->tax_percentage ?? null,
                        ];
                    })
                    ->values();
            }
        );
        
        // Get categories for the store
        $categories = \Illuminate\Support\Facades\Cache::remember(
            'store_categories.' . $store['id'],
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

        $theme = $store['theme'] ?? 'basic';

        // Detect if this is a new dynamic template (from templates table)
        // vs a legacy hardcoded theme page. Guard against a missing templates
        // table so stores never break before the migration has been run.
        try {
            $template = \App\Models\Template::where('slug', $theme)->where('is_active', true)->first();
        } catch (\Illuminate\Database\QueryException $e) {
            $template = null;
        }

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

        // New template system: render via dynamic template page
        if ($template) {

            // Plan gating on the storefront is based on the STORE OWNER's plan,
            // not the viewer (who is a customer). Pass the owner's plan tier so
            // a Professional store renders its professional templates while a
            // downgraded store still shows the upgrade prompt.
            $ownerPlan = $storeModel?->user?->plan;
            $ownerIsSuperAdmin = $storeModel?->user?->type === 'superadmin';

            $props['template'] = $theme;
            $mergedTemplateConfig = $storeModel ? $storeModel->getMergedTemplateConfig() : ($template->config ?? []);
            $props['templateConfig'] = array_merge($mergedTemplateConfig, [
                'slug' => $template->slug,
                'name' => $template->name,
                'name_en' => $template->name_en,
                'is_free' => (bool) $template->is_free,
                'plan_required' => $template->plan_required,
                'design_tokens' => $template->design_tokens ?? [],
            ]);
            $props['templateOverrides'] = $storeModel ? $storeModel->template_overrides : null;
            $props['designTokens'] = $storeModel
                ? $storeModel->getMergedDesignTokens()
                : $template->design_tokens;
            $props['isPreview'] = isset($currentRequest) && $currentRequest->has('preview');
            $props['userPlanName'] = $ownerPlan?->name;
            $props['userPlanTier'] = $ownerPlan ? $ownerPlan->getTier() : 'starter';
            $props['isSuperAdmin'] = $ownerIsSuperAdmin;
            $props['demoStoreUrl'] = app(\App\Services\DemoStoreService::class)->demoStoreUrl();

            return Inertia::render('store/dynamic', array_merge($props, [
                'action' => $this->resolveAction(),
                'wishlistCount' => $this->getWishlistCount($store['id']),
            ], $this->getCommonData()));
        }

        // Legacy theme page fallback (if template not found in templates table)
        $legacyPages = $this->getValidThemePages();
        $themePage = in_array($theme, $legacyPages, true) ? $theme : 'gadgets';

        return Inertia::render('store/' . $themePage, array_merge($props, [
            'showResetModal' => $request ? $request->get('showResetModal', false) : false,
            'resetToken' => $request ? $request->get('resetToken') : null,
            'action' => $this->resolveAction(),
            'wishlistCount' => $this->getWishlistCount($store['id']),
            'payment_status' => session()->pull('payment_status') ?? (request() ? request()->get('payment_status') : null),
            'order_number' => session()->pull('order_number') ?? (request() ? request()->get('order_number') : null),
        ], $this->getCommonData()));
    }

    /**
     * List of theme page names that can be previewed via ?theme=
     */
    protected function getValidThemePages(): array
    {
        $excluded = ['StoreDisabled', 'StoreMaintenance', 'StoreNotFound', 'OrderInvoice', 'order-invoice', 'default'];

        $pages = glob(resource_path('js/pages/store/*.tsx'));

        return array_values(array_filter(array_map(function ($file) {
            return pathinfo($file, PATHINFO_FILENAME);
        }, $pages ?: []), function ($name) use ($excluded) {
            return !in_array($name, $excluded, true);
        }));
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
            'vat' => $storeData['vat'],
            'locale' => $storeData['locale'],
        ];
        
        $pdf = Pdf::loadView('pdf.invoice', $data);
        return $pdf->download("invoice-{$orderNumber}.pdf");
    }
}