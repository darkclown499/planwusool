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
        
        // If user is company type, show all stores for the company
        if ($user->type === 'company') {
            $stores = Store::where('user_id', $user->id)->get();
        } else {
            // For company users, show all stores belonging to their company
            $stores = Store::where('user_id', $user->created_by)->get();
        }
        
        // Add store configuration status like StoreGo
        $stores = $stores->map(function ($store) {
            // Get store configuration for status
            $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
            $store->config_status = $config['store_status'] ?? true;
            $store->maintenance_mode = $config['maintenance_mode'] ?? false;
            
            // Add status information
            $store->status_reason = null;
            if (!$store->config_status) {
                $store->status_reason = 'Store disabled by owner';
            }
            
            return $store;
        });
        
        // Calculate dynamic store statistics
        $storeIds = $stores->pluck('id')->toArray();
        $currentMonth = \Carbon\Carbon::now()->startOfMonth();
        $lastMonth = \Carbon\Carbon::now()->subMonth()->startOfMonth();
        
        $totalCustomers = \App\Models\Customer::whereIn('store_id', $storeIds)->count();
        $lastMonthCustomers = \App\Models\Customer::whereIn('store_id', $storeIds)
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->count();
        
        $totalRevenue = \App\Models\Order::whereIn('store_id', $storeIds)
            ->where('payment_status', 'paid')
            ->sum('total_amount');
        $lastMonthRevenue = \App\Models\Order::whereIn('store_id', $storeIds)
            ->where('payment_status', 'paid')
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->sum('total_amount');
        
        // Calculate growth percentages
        $customerGrowth = $lastMonthCustomers > 0 ? 
            (($totalCustomers - $lastMonthCustomers) / $lastMonthCustomers) * 100 : 
            ($totalCustomers > 0 ? 100 : 0);
        
        $revenueGrowth = $lastMonthRevenue > 0 ? 
            (($totalRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100 : 
            ($totalRevenue > 0 ? 100 : 0);
        
        $storeStats = [
            'totalCustomers' => $totalCustomers,
            'totalRevenue' => $totalRevenue,
            'customerGrowth' => round($customerGrowth, 1),
            'revenueGrowth' => round($revenueGrowth, 1)
        ];
        
        return Inertia::render('stores/index', [
            'stores' => $stores,
            'storeStats' => $storeStats
        ]);
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
        ], [], [
            'name' => __('Store Name'),
            'custom_domain' => __('Custom Domain'),
            'custom_subdomain' => __('Custom Subdomain'),
            'seo_title' => __('Meta Title'),
            'seo_description' => __('Meta Description'),
            'seo_keywords' => __('Meta Keywords'),
            'seo_image' => __('Meta Image'),
        ]);
        
        // Validate plan permissions for domain features
        $plan = $user->getCurrentPlan();
        if ($request->enable_custom_domain && $plan->enable_custdomain !== 'on') {
            return redirect()->back()->with('error', 'Custom domain feature is not available in your current plan.');
        }
        if ($request->enable_custom_subdomain && $plan->enable_custsubdomain !== 'on') {
            return redirect()->back()->with('error', 'Custom subdomain feature is not available in your current plan.');
        }
        
        // Ensure only one domain type is enabled
        if ($request->enable_custom_domain && $request->enable_custom_subdomain) {
            return redirect()->back()->with('error', 'You can enable either Custom Domain or Custom Subdomain, not both.');
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
        $store->theme = $request->theme;
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
        $storeQuery = $user->type === 'company' ? 
            Store::where('user_id', $user->id) : 
            Store::where('user_id', $user->created_by);
        $store = $storeQuery->findOrFail($id);
        
        // Get dynamic statistics
        $stats = [
            'total_products' => \App\Models\Product::where('store_id', $store->id)->count(),
            'total_orders' => \App\Models\Order::where('store_id', $store->id)->count(),
            'total_customers' => \App\Models\Customer::where('store_id', $store->id)->count(),
            'total_revenue' => \App\Models\Order::where('store_id', $store->id)->where('payment_status', 'paid')->sum('total_amount')
        ];
        
        // Format revenue for display
        $stats['formatted_revenue'] = formatStoreCurrency($stats['total_revenue'], Auth::id(), $store->id);
        
        return Inertia::render('stores/view', [
            'store' => $store,
            'stats' => $stats
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
        $storeQuery = $user->type === 'company' ? 
            Store::where('user_id', $user->id) : 
            Store::where('user_id', $user->created_by);
        $store = $storeQuery->findOrFail($id);
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
        $store = Store::where('user_id', Auth::id())->findOrFail($id);
        $user = Auth::user();
        
        // Validate theme against user's plan
        $availableThemes = $user->getAvailableThemes();
        $themeValidation = 'required|string';
        if ($availableThemes !== null) {
            $themeValidation .= '|in:' . implode(',', $availableThemes);
        }
        
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
        ], [], [
            'name' => __('Store Name'),
            'custom_domain' => __('Custom Domain'),
            'custom_subdomain' => __('Custom Subdomain'),
            'seo_title' => __('Meta Title'),
            'seo_description' => __('Meta Description'),
            'seo_keywords' => __('Meta Keywords'),
            'seo_image' => __('Meta Image'),
        ]);
        
        // Validate plan permissions for domain features
        $plan = $user->getCurrentPlan();
        if ($request->enable_custom_domain && $plan->enable_custdomain !== 'on') {
            return redirect()->back()->with('error', 'Custom domain feature is not available in your current plan.');
        }
        if ($request->enable_custom_subdomain && $plan->enable_custsubdomain !== 'on') {
            return redirect()->back()->with('error', 'Custom subdomain feature is not available in your current plan.');
        }
        
        // Ensure only one domain type is enabled
        if ($request->enable_custom_domain && $request->enable_custom_subdomain) {
            return redirect()->back()->with('error', 'You can enable either Custom Domain or Custom Subdomain, not both.');
        }
        
        // Validate domain availability (exclude current store)
        $domainErrors = Store::validateDomains($request->all(), $id);
        if (!empty($domainErrors)) {
            return redirect()->back()->withErrors($domainErrors)->withInput();
        }

        $store->name = $request->name;
        $store->description = $request->description;
        $store->theme = $request->theme;
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
        $storeQuery = $user->type === 'company' ? 
            Store::where('user_id', $user->id) : 
            Store::where('user_id', $user->created_by);
        $store = $storeQuery->findOrFail($id);
        
        // Check if this is the last store for the company
        $companyId = $user->type === 'company' ? $user->id : $user->created_by;
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
        
        // If user is company type, show all stores for the company
        if ($user->type === 'company') {
            $stores = Store::where('user_id', $user->id)->get();
        } else {
            // For company users, show all stores belonging to their company
            $stores = Store::where('user_id', $user->created_by)->get();
        }
        
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
        $storeQuery = $user->type === 'company' ? 
            Store::where('user_id', $user->id) : 
            Store::where('user_id', $user->created_by);
        $store = $storeQuery->findOrFail($id);
        
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