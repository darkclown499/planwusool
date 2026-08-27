<?php

namespace App\Http\Controllers;

use App\Models\Store;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class StoreController extends Controller
{
    /**
     * Display a listing of the stores.
     */
    public function index()
    {
        $user = Auth::user();
        
        // Superadmin sees all stores; company users see their own stores
        $stores = resolveStoreQuery($user)->get();
        $storeIds = $stores->pluck('id')->map(fn ($id) => (int) $id)->filter()->values()->all();

        // Batch-load store configurations in ONE query (instead of one
        // StoreConfiguration::getConfiguration() per store) to eliminate the
        // N+1 in this listing endpoint.
        $configMap = [];
        if ($storeIds) {
            $configMap = \App\Models\StoreConfiguration::whereIn('store_id', $storeIds)
                ->get()
                ->groupBy('store_id')
                ->map(function ($rows) {
                    return $rows->pluck('value', 'key')->toArray();
                })
                ->toArray();
        }

        // Batch-load real per-store aggregates in a handful of grouped queries
        // (no per-store N+1): orders, produced revenue, products.
        $ordersGrouped = $storeIds
            ? \App\Models\Order::whereIn('store_id', $storeIds)
                ->selectRaw('store_id, COUNT(*) as orders_count, COALESCE(SUM(CASE WHEN payment_status = ? THEN total_amount ELSE 0 END), 0) as revenue, MAX(updated_at) as last_activity', ['paid'])
                ->groupBy('store_id')
                ->get()
                ->keyBy('store_id')
            : collect();

        $productsGrouped = $storeIds
            ? \App\Models\Product::whereIn('store_id', $storeIds)
                ->selectRaw('store_id, COUNT(*) as products_count')
                ->groupBy('store_id')
                ->get()
                ->keyBy('store_id')
            : collect();

        $shippingGrouped = $storeIds
            ? \App\Models\Shipping::whereIn('store_id', $storeIds)
                ->selectRaw('store_id, COUNT(*) as shipping_count')
                ->groupBy('store_id')
                ->get()
                ->keyBy('store_id')
            : collect();

        // Payment readiness is store-scoped in payment_settings rows keyed by
        // user_id + store_id, so it must be read per store. Merchant store
        // counts are small (plan-limited), so this stays bounded.
        $storeList = $stores->map(function ($store) use ($configMap, $ordersGrouped, $productsGrouped, $shippingGrouped, $user) {
            $storeId = (int) $store->id;
            $config = $configMap[$storeId] ?? [];
            $store->config_status = ($config['store_status'] ?? 'true') !== 'false';
            $store->maintenance_mode = ($config['maintenance_mode'] ?? 'false') === 'true';
            $store->status_reason = $store->config_status ? null : 'Store disabled by owner';

            $orders = $ordersGrouped->get($storeId);
            $prod = $productsGrouped->get($storeId);
            $ship = $shippingGrouped->get($storeId);

            $store->orders_count = (int) ($orders->orders_count ?? 0);
            $store->revenue = (float) ($orders->revenue ?? 0);
            $store->products_count = (int) ($prod->products_count ?? 0);
            $store->shipping_count = (int) ($ship->shipping_count ?? 0);
            $store->last_activity = ($orders->last_activity ?? null) ?: $store->updated_at;

            // Normalized template + friendly display domain
            $store->template_slug = $store->getTemplateSlug();
            $store->display_domain = $store->getVerifiedDomain()
                ? $store->getVerifiedDomain()->domain_name
                : ($store->custom_domain ?: ($store->enable_custom_subdomain ? $store->custom_subdomain . '.' . getBaseDomain() : $store->slug . '.' . config('app.store_domain', getBaseDomain())));

            $store->readiness = $this->buildReadiness($store, $config, $user);

            return $store;
        });

        // Overall summary statistics are computed across the same scoped set.
        $currentMonth = \Carbon\Carbon::now()->startOfMonth();
        $lastMonth = \Carbon\Carbon::now()->subMonth()->startOfMonth();

        $totalStores = $storeList->count();
        $activeStores = $storeList->where('config_status', true)->count();

        $totalOrders = $storeList->sum('orders_count');
        $totalRevenue = $storeList->sum('revenue');

        $totalCustomers = $storeIds
            ? \App\Models\Customer::whereIn('store_id', $storeIds)->count()
            : 0;
        $lastMonthCustomers = $storeIds
            ? \App\Models\Customer::whereIn('store_id', $storeIds)
                ->whereBetween('created_at', [$lastMonth, $currentMonth])
                ->count()
            : 0;
        $lastMonthRevenue = $storeIds
            ? \App\Models\Order::whereIn('store_id', $storeIds)
                ->where('payment_status', 'paid')
                ->whereBetween('created_at', [$lastMonth, $currentMonth])
                ->sum('total_amount')
            : 0;

        $customerGrowth = $lastMonthCustomers > 0
            ? (($totalCustomers - $lastMonthCustomers) / $lastMonthCustomers) * 100
            : ($totalCustomers > 0 ? 100 : 0);
        $revenueGrowth = $lastMonthRevenue > 0
            ? (($totalRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100
            : ($totalRevenue > 0 ? 100 : 0);

        $storeStats = [
            'totalStores' => $totalStores,
            'activeStores' => $activeStores,
            'totalOrders' => $totalOrders,
            'totalRevenue' => $totalRevenue,
            'totalCustomers' => $totalCustomers,
            'readyStores' => $storeList->where('readiness.isReady', true)->count(),
            'customerGrowth' => round($customerGrowth, 1),
            'revenueGrowth' => round($revenueGrowth, 1),
        ];

        return Inertia::render('stores/index', [
            'stores' => $storeList->values(),
            'storeStats' => $storeStats,
        ]);
    }

    /**
     * Build a lightweight, data-truthful store readiness snapshot.
     *
     * Every flag is derived from real persisted data (no fabricated toggles):
     *   design   – a template is always assigned; "customized" when the owner
     *              has actually saved brand/template overrides.
     *   products – at least one product exists.
     *   shipping – at least one shipping method exists (or shipping is enabled).
     *   payments – at least one payment method is enabled (real gateway import).
     *   domain   – the store is live on a subdomain (default = ready).
     *   email    – a contact email is set.
     */
    private function buildReadiness($store, array $config, $user): array
    {
        $hasDesign = !empty($store->theme)
            || !empty($config['design_tokens'])
            || !empty($config['template_overrides'])
            || !empty($config['logo'])
            || !empty($config['favicon']);

        $hasProducts = (int) ($store->products_count ?? 0) > 0
            || \App\Models\Product::where('store_id', $store->id)->exists();

        $hasShipping = (int) ($store->shipping_count ?? 0) > 0;
        if (!$hasShipping) {
            $hasShipping = \App\Models\Shipping::where('store_id', $store->id)->exists()
                || !empty($config['shipping_enabled'])
                || !empty($config['shipping_methods']);
        }

        $hasPayments = count(getEnabledPaymentMethods($user->id, $store->id)) > 0;

        $hasDomain = true; // every store is live on its default subdomain
        $hasEmail = !empty($store->email);

        $missing = [];
        if (!$hasProducts) $missing[] = 'المنتجات';
        if (!$hasShipping) $missing[] = 'الشحن والتوصيل';
        if (!$hasPayments) $missing[] = 'طرق الدفع';
        if (!$hasEmail) $missing[] = 'البريد الإلكتروني';

        return [
            'design' => $hasDesign,
            'products' => $hasProducts,
            'shipping' => $hasShipping,
            'payments' => $hasPayments,
            'domain' => $hasDomain,
            'email' => $hasEmail,
            'isReady' => $hasProducts && $hasShipping && $hasPayments,
            'missing' => $missing,
        ];
    }

    /**
     * Show the form for creating a new store.
     */
    public function create()
    {
        $user = Auth::user();
        
        // Get available themes based on user's plan
        $availableThemes = $user->getAvailableThemes();
        
        // Get plan permissions for domain features
        $plan = $user->getCurrentPlan();
        $planPermissions = [
            'enable_custdomain' => $plan->enable_custdomain === 'on',
            'enable_custsubdomain' => $plan->enable_custsubdomain === 'on',
            'pwa_business' => $plan->pwa_business === 'on',
            'enable_shipping_method' => $plan->enable_shipping_method === 'on',
            'enable_mobile_app' => $plan->enable_mobile_app === 'on',
        ];
        
        // Store limit check
        $storeCheck = $user->canCreateStore();
        $storeLimits = [
            'can_create' => $storeCheck['allowed'],
            'current_stores' => $user->stores()->count(),
            'max_stores' => $plan->max_stores ?? 0,
        ];
        
        // Get server IP address
        $serverIp = $this->getServerIp();

        return Inertia::render('stores/create', [
            'availableThemes' => $availableThemes,
            'planPermissions' => $planPermissions,
            'storeLimits' => $storeLimits,
            'serverIp' => $serverIp,
            'baseDomain' => getBaseDomain(),
        ]);
    }

    /**
     * Store a newly created store in storage.
     */
    public function store(Request $request)
    {
        $user = Auth::user();
        
        // Check if user can create more stores
        $storeCheck = $user->canCreateStore();
        if (!$storeCheck['allowed']) {
            return redirect()->back()->with('error', $storeCheck['message']);
        }
        
        // Validate theme against user's plan
        $availableThemes = $user->getAvailableThemes();
        $themeValidation = 'required|string';
        if ($availableThemes !== null) {
            $themeValidation .= '|in:' . implode(',', $availableThemes);
        }
        
        // Use the selected theme (validated against the plan's available themes).
        $theme = \App\Models\Store::normalizeThemeSlug($request->theme ?? \App\Models\Store::DEFAULT_TEMPLATE);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'theme' => $themeValidation,
            'enable_custom_domain' => 'boolean',
            'enable_custom_subdomain' => 'boolean',
            'custom_domain' => 'required_if:enable_custom_domain,true|nullable|string|max:255',
            'custom_subdomain' => 'required_if:enable_custom_subdomain,true|nullable|string|max:255',
            'seo_title' => 'nullable|string|max:60',
            'seo_description' => 'nullable|string|max:160',
            'seo_keywords' => 'nullable|string|max:255',
            'seo_image' => 'nullable|string',
            // PWA settings
            'pwa_name' => 'nullable|string|max:255',
            'pwa_short_name' => 'nullable|string|max:12',
            'pwa_description' => 'nullable|string',
            'pwa_theme_color' => 'nullable|string|max:9',
            'pwa_background_color' => 'nullable|string|max:9',
            'pwa_display' => 'nullable|in:standalone,fullscreen,minimal-ui,browser',
            'pwa_orientation' => 'nullable|in:portrait,landscape,any',
        ], [], [
            'name' => __('Store Name'),
            'custom_domain' => __('Custom Domain'),
            'custom_subdomain' => __('Custom Subdomain'),
            'seo_title' => __('Meta Title'),
            'seo_description' => __('Meta Description'),
            'seo_keywords' => __('Meta Keywords'),
            'seo_image' => __('Meta Image'),
            'pwa_short_name' => __('Short Name'),
            'pwa_theme_color' => __('Theme Color'),
            'pwa_background_color' => __('Background Color'),
            'pwa_display' => __('Display Mode'),
            'pwa_orientation' => __('Orientation'),
        ]);
        
        // Validate plan permissions for domain features (super admin bypasses)
        $plan = $user->getCurrentPlan();
        if ($request->enable_custom_domain && $plan->enable_custdomain !== 'on' && !$user->isSuperAdmin()) {
            return redirect()->back()->with('error', __('ربط النطاق المخصص غير متاح في خطتك الحالية. يرجى ترقية الخطة لاستخدام نطاقك الخاص.'));
        }
        if ($request->enable_custom_subdomain && $plan->enable_custsubdomain !== 'on' && !$user->isSuperAdmin()) {
            return redirect()->back()->with('error', __('Custom subdomain feature is not available in your current plan.'));
        }
        if ($request->enable_pwa && $plan->pwa_business !== 'on' && !$user->isSuperAdmin()) {
            return redirect()->back()->with('error', __('PWA feature is not available in your current plan.'));
        }
        
        // Ensure only one domain type is enabled
        if ($request->enable_custom_domain && $request->enable_custom_subdomain) {
            return redirect()->back()->with('error', __('You can enable either Custom Domain or Custom Subdomain, not both.'));
        }
        
        // Validate domain availability
        $domainErrors = Store::validateDomains($request->all());
        if (!empty($domainErrors)) {
            return redirect()->back()->withErrors($domainErrors)->withInput();
        }

        $store = new Store();
        $store->name = $request->name;
        $store->slug = Store::generateUniqueSlug($request->name);
        $store->description = $request->description;
        $store->theme = $theme;
        $store->user_id = Auth::id();
        $store->email = $request->email ?? null;
        $store->enable_custom_domain = $request->enable_custom_domain ?? false;
        $store->enable_custom_subdomain = $request->enable_custom_subdomain ?? false;
        $store->custom_domain = $request->enable_custom_domain ? $request->custom_domain : null;
        $store->custom_subdomain = $request->enable_custom_subdomain ? ($request->custom_subdomain ?: $store->slug) : null;
        if ($store->enable_custom_subdomain && empty($store->custom_subdomain)) {
            $store->custom_subdomain = $store->slug;
        }
        
        // PWA Settings
        $store->enable_pwa = $request->enable_pwa ?? false;
        $store->pwa_name = $request->pwa_name;
        $store->pwa_short_name = $request->pwa_short_name;
        $store->pwa_description = $request->pwa_description;
        $store->pwa_theme_color = $request->pwa_theme_color ?? '#3B82F6';
        $store->pwa_background_color = $request->pwa_background_color ?? '#ffffff';
        $store->pwa_display = $request->pwa_display ?? 'standalone';
        $store->pwa_orientation = $request->pwa_orientation ?? 'portrait';
        
        // SEO Settings
        $store->seo_title = $request->seo_title;
        $store->seo_description = $request->seo_description;
        $store->seo_keywords = $request->seo_keywords;
        $store->seo_image = $request->seo_image;
        
        $store->save();
        
        // Dispatch StoreCreated event
        event(new \App\Events\StoreCreated($store));
        
        // Set this as the current store for the user if they don't have one set
        if (!getCurrentStoreId($user)) {
            $user->current_store = $store->id;
            $user->save();
        }

        return redirect()->route('stores.index')->with('success', __('Store created successfully'));
    }

    /**
     * Display the specified store.
     */
    public function show($id)
    {
        if (!Auth::user()->can('view-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to view stores.'));
        }
        
        $user = Auth::user();
        $store = resolveStoreQuery($user)->findOrFail($id);
        
        // Get dynamic statistics
        $stats = [
            'total_products' => \App\Models\Product::where('store_id', $store->id)->count(),
            'total_orders' => \App\Models\Order::where('store_id', $store->id)->count(),
            'total_customers' => \App\Models\Customer::where('store_id', $store->id)->count(),
            'total_revenue' => \App\Models\Order::where('store_id', $store->id)->where('payment_status', 'paid')->sum('total_amount')
        ];
        
        // Format revenue for display
        $stats['formatted_revenue'] = formatStoreCurrency($stats['total_revenue'], Auth::id(), $store->id);

        // Normalize template + expose real readiness (same data-truthful model
        // used by the store list and the dashboard launch checklist).
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $store->config_status = ($config['store_status'] ?? 'true') !== 'false';
        $store->maintenance_mode = ($config['maintenance_mode'] ?? 'false') === 'true';
        $store->template_slug = $store->getTemplateSlug();
        $store->display_domain = $store->getVerifiedDomain()
            ? $store->getVerifiedDomain()->domain_name
            : ($store->custom_domain ?: ($store->enable_custom_subdomain ? $store->custom_subdomain . '.' . getBaseDomain() : $store->slug . '.' . config('app.store_domain', getBaseDomain())));

        $productsCount = $stats['total_products'];
        $shippingCount = \App\Models\Shipping::where('store_id', $store->id)->count();
        $readiness = $this->buildReadiness($store, $config, $user);
        $readiness['products_count'] = $productsCount;
        $readiness['shipping_count'] = $shippingCount;
        
        return Inertia::render('stores/view', [
            'store' => $store,
            'stats' => $stats,
            'readiness' => $readiness,
            // Computed server-side (with the current request) so the "Visit
            // Store" link carries the right port on local/dev domains instead
            // of assuming 80/443.
            'storeUrl' => $store->getStoreUrl(request()),
        ]);
    }

    /**
     * Show the form for editing the specified store.
     */
    public function edit($id)
    {
        if (!Auth::user()->can('edit-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to edit stores.'));
        }
        
        $user = Auth::user();
        $store = resolveStoreQuery($user)->findOrFail($id);
        $user = Auth::user();

        // Expose the normalized theme slug to the edit form.
        $store->theme = $store->getTemplateSlug();
        
        // Get available themes based on user's plan
        $availableThemes = $user->getAvailableThemes();
        
        // Get plan permissions for domain features
        $plan = $user->getCurrentPlan();
        $planPermissions = [
            'enable_custdomain' => $plan->enable_custdomain === 'on',
            'enable_custsubdomain' => $plan->enable_custsubdomain === 'on',
            'pwa_business' => $plan->pwa_business === 'on',
            'enable_shipping_method' => $plan->enable_shipping_method === 'on',
            'enable_mobile_app' => $plan->enable_mobile_app === 'on',
        ];
        
        // Get server IP address
        $serverIp = $this->getServerIp();

        return Inertia::render('stores/edit', [
            'store' => $store,
            'availableThemes' => $availableThemes,
            'planPermissions' => $planPermissions,
            'serverIp' => $serverIp,
            'baseDomain' => getBaseDomain(),
        ]);
    }

    /**
     * Update the specified store in storage.
     */
    public function update(Request $request, $id)
    {
        $store = resolveStoreQuery(Auth::user())->findOrFail($id);
        $user = Auth::user();
        
        // Validate theme against user's plan
        $availableThemes = $user->getAvailableThemes();
        $themeValidation = 'required|string';
        if ($availableThemes !== null) {
            $themeValidation .= '|in:' . implode(',', $availableThemes);
        }
        
        // Use the selected theme (validated against the plan's available themes).
        $theme = \App\Models\Store::normalizeThemeSlug($request->theme ?? \App\Models\Store::DEFAULT_TEMPLATE);
        
        $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'theme' => $themeValidation,
            'enable_custom_domain' => 'boolean',
            'enable_custom_subdomain' => 'boolean',
            'custom_domain' => 'required_if:enable_custom_domain,true|nullable|string|max:255',
            'custom_subdomain' => 'required_if:enable_custom_subdomain,true|nullable|string|max:255',
            'seo_title' => 'nullable|string|max:60',
            'seo_description' => 'nullable|string|max:160',
            'seo_keywords' => 'nullable|string|max:255',
            'seo_image' => 'nullable|string',
            // PWA settings
            'pwa_name' => 'nullable|string|max:255',
            'pwa_short_name' => 'nullable|string|max:12',
            'pwa_description' => 'nullable|string',
            'pwa_theme_color' => 'nullable|string|max:9',
            'pwa_background_color' => 'nullable|string|max:9',
            'pwa_display' => 'nullable|in:standalone,fullscreen,minimal-ui,browser',
            'pwa_orientation' => 'nullable|in:portrait,landscape,any',
        ], [], [
            'name' => __('Store Name'),
            'custom_domain' => __('Custom Domain'),
            'custom_subdomain' => __('Custom Subdomain'),
            'seo_title' => __('Meta Title'),
            'seo_description' => __('Meta Description'),
            'seo_keywords' => __('Meta Keywords'),
            'seo_image' => __('Meta Image'),
            'pwa_short_name' => __('Short Name'),
            'pwa_theme_color' => __('Theme Color'),
            'pwa_background_color' => __('Background Color'),
            'pwa_display' => __('Display Mode'),
            'pwa_orientation' => __('Orientation'),
        ]);
        
        // Validate plan permissions for domain features (super admin bypasses)
        $plan = $user->getCurrentPlan();
        if ($request->enable_custom_domain && $plan->enable_custdomain !== 'on' && !$user->isSuperAdmin()) {
            return redirect()->back()->with('error', __('ربط النطاق المخصص غير متاح في خطتك الحالية. يرجى ترقية الخطة لاستخدام نطاقك الخاص.'));
        }
        if ($request->enable_custom_subdomain && $plan->enable_custsubdomain !== 'on' && !$user->isSuperAdmin()) {
            return redirect()->back()->with('error', __('Custom subdomain feature is not available in your current plan.'));
        }
        if ($request->enable_pwa && $plan->pwa_business !== 'on' && !$user->isSuperAdmin()) {
            return redirect()->back()->with('error', __('PWA feature is not available in your current plan.'));
        }
        
        // Ensure only one domain type is enabled
        if ($request->enable_custom_domain && $request->enable_custom_subdomain) {
            return redirect()->back()->with('error', __('You can enable either Custom Domain or Custom Subdomain, not both.'));
        }
        
        // Validate domain availability (exclude current store)
        $domainErrors = Store::validateDomains($request->all(), $id);
        if (!empty($domainErrors)) {
            return redirect()->back()->withErrors($domainErrors)->withInput();
        }

        $store->name = $request->name;
        $store->description = $request->description;
        $store->theme = $theme;
        $store->email = $request->email ?? $store->email;
        $store->enable_custom_domain = $request->enable_custom_domain ?? false;
        $store->enable_custom_subdomain = $request->enable_custom_subdomain ?? false;
        $store->custom_domain = $request->enable_custom_domain ? $request->custom_domain : null;
        $store->custom_subdomain = $request->enable_custom_subdomain ? ($request->custom_subdomain ?: $store->slug) : null;
        
        // PWA Settings
        $store->enable_pwa = $request->enable_pwa ?? false;
        $store->pwa_name = $request->pwa_name;
        $store->pwa_short_name = $request->pwa_short_name;
        $store->pwa_description = $request->pwa_description;
        $store->pwa_theme_color = $request->pwa_theme_color ?? '#3B82F6';
        $store->pwa_background_color = $request->pwa_background_color ?? '#ffffff';
        $store->pwa_display = $request->pwa_display ?? 'standalone';
        $store->pwa_orientation = $request->pwa_orientation ?? 'portrait';
        
        // SEO Settings
        $store->seo_title = $request->seo_title;
        $store->seo_description = $request->seo_description;
        $store->seo_keywords = $request->seo_keywords;
        $store->seo_image = $request->seo_image;
        
        $store->save();

        return redirect()->route('stores.index')->with('success', __('Store updated successfully'));
    }

    /**
     * Remove the specified store from storage.
     */
    public function destroy($id)
    {
        if (!Auth::user()->can('delete-stores')) {
            return redirect()->back()->with('error', __('You do not have permission to delete stores.'));
        }
        
        $user = Auth::user();
        $store = resolveStoreQuery($user)->findOrFail($id);
        
        // Check if this is the last store for the company
        $companyId = $store->user_id;
        $totalStores = Store::where('user_id', $companyId)->count();
        
        if ($totalStores <= 1) {
            return redirect()->back()->with('error', __('Cannot delete the last store. At least one store is required.'));
        }
        
        // If deleting current store, switch to another store
        if (getCurrentStoreId($user) == $id) {
            $nextStore = Store::where('user_id', $companyId)
                ->where('id', '!=', $id)
                ->first();
            
            if ($nextStore) {
                $user->current_store = $nextStore->id;
                $user->save();
            }
        }
        
        $store->delete();

        return redirect()->route('stores.index')->with('success', __('Store deleted successfully'));
    }
    
    /**
     * Export stores data as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        
        // Superadmin sees all stores; company users see their own stores
        $stores = resolveStoreQuery($user)->get();
        
        $csvData = [];
        $csvData[] = ['Store Name', 'Slug', 'Domain', 'Email', 'Theme', 'Status', 'Created Date'];
        
        foreach ($stores as $store) {
            // Get store configuration for status
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            $status = $config['store_status'] ?? true;
            
            $csvData[] = [
                $store->name,
                $store->slug,
                $store->domain ?: 'Not set',
                $store->email ?: 'Not set',
                $store->theme,
                $status ? 'Active' : 'Inactive',
                $store->created_at->format('Y-m-d H:i:s')
            ];
        }
        
        $filename = 'stores-export-' . now()->format('Y-m-d') . '.csv';
        
        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
    
    /**
     * Get server IP address
     */
    private function getServerIp()
    {
        // Try multiple methods to get server IP
        $serverIp = null;
        
        // Method 1: Check $_SERVER variables
        if (!empty($_SERVER['SERVER_ADDR'])) {
            $serverIp = $_SERVER['SERVER_ADDR'];
        } elseif (!empty($_SERVER['LOCAL_ADDR'])) {
            $serverIp = $_SERVER['LOCAL_ADDR'];
        }
        
        // Method 2: Use external service as fallback
        if (!$serverIp || $serverIp === '127.0.0.1' || $serverIp === '::1') {
            try {
                $serverIp = file_get_contents('https://ipinfo.io/ip');
                $serverIp = trim($serverIp);
            } catch (\Exception $e) {
                // Fallback to another service
                try {
                    $serverIp = file_get_contents('https://api.ipify.org');
                    $serverIp = trim($serverIp);
                } catch (\Exception $e) {
                    $serverIp = 'Unable to detect';
                }
            }
        }
        
        // Mask IP if in demo mode
        if (config('app.is_demo', false) && $serverIp !== 'Unable to detect') {
            return '*** . *** . *** . ***';
        }
        
        return $serverIp;
    }

    /**
     * Toggle store status (active/inactive)
     */
    public function toggleStatus($id)
    {
        $user = Auth::user();
        $store = resolveStoreQuery($user)->findOrFail($id);
        
        // Get current status
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        $currentStatus = $config['store_status'] ?? true;
        
        // If trying to activate, check plan limits
        if (!$currentStatus) {
            $companyUser = $user->type === 'company' ? $user : $user->creator;
            if ($companyUser && $companyUser->plan) {
                // Count currently active stores
                $activeStores = 0;
                foreach ($companyUser->stores as $userStore) {
                    $storeConfig = \App\Models\StoreConfiguration::getConfiguration($userStore->id);
                    if ($storeConfig['store_status'] ?? true) {
                        $activeStores++;
                    }
                }
                
                $maxStores = $companyUser->plan->max_stores ?? 0;
                if ($activeStores >= $maxStores) {
                    return back()->with('error', __('Cannot activate store. You have reached your plan limit of :max stores. Please upgrade your plan or disable another store first.', ['max' => $maxStores]));
                }
            }
        }
        
        // Toggle status
        $newStatus = !$currentStatus;
        \App\Models\StoreConfiguration::updateOrCreate(
            ['store_id' => $store->id, 'key' => 'store_status'],
            ['value' => $newStatus ? 'true' : 'false']
        );
        
        $message = $newStatus ? __('Store activated successfully') : __('Store deactivated successfully');
        return back()->with('success', $message);
    }

}