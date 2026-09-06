<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Store;
use App\Models\Order;
use App\Models\Product;
use App\Models\Customer;
use App\Models\OrderItem;
use App\Models\User;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\PlanRequest;
use App\Models\Coupon;
use App\Services\MerchantNotificationService;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class DashboardController extends Controller
{
    public function index()
    {
        $user = auth()->user();
        
        // Super admin gets system-wide dashboard
        if ($user->type === 'superadmin') {
            return $this->renderSuperAdminDashboard();
        }
        
        // Company users get store-based dashboard
        if ($user->type === 'company') {
            return $this->renderCompanyDashboard();
        }
        
        // Check if user has dashboard permission (skip if permission doesn't exist)
        try {
            if ($user->hasPermissionTo('manage-dashboard')) {
                return $this->renderCompanyDashboard();
            }
        } catch (\Exception $e) {
            // Permission doesn't exist, continue to dashboard for authenticated users
            return $this->renderCompanyDashboard();
        }
        
        // Redirect to first available page
        return $this->redirectToFirstAvailablePage();
    }
    
    public function redirectToFirstAvailablePage()
    {
        $user = auth()->user();
        
        // Define available routes with their permissions
        $routes = [
            ['route' => 'users.index', 'permission' => 'manage-users'],
            ['route' => 'roles.index', 'permission' => 'manage-roles'],





            ['route' => 'plans.index', 'permission' => 'manage-plans'],
            ['route' => 'referral.index', 'permission' => 'manage-referral'],
            ['route' => 'settings.index', 'permission' => 'manage-settings'],
        ];
        
        // Find first available route
        foreach ($routes as $routeData) {
            if ($user->hasPermissionTo($routeData['permission'])) {
                return redirect()->route($routeData['route']);
            }
        }
        
        // If no permissions found, logout user
        auth()->logout();
        return redirect()->route('login')->with('error', __('No access permissions found.'));
    }
    
    private function renderSuperAdminDashboard()
    {
        return Inertia::render('dashboard', [
            'dashboardData' => $this->getSuperAdminDashboardData(),
            'currentStore' => null,
            'isSuperAdmin' => true
        ]);
    }
    
    private function renderCompanyDashboard()
    {
        $user = auth()->user();
        $storeId = getCurrentStoreId($user);
        
        if (!$storeId) {
            return Inertia::render('dashboard', [
                'dashboardData' => $this->getEmptyDashboard(),
                'currentStore' => null,
                'isSuperAdmin' => false
            ]);
        }
        
        $currentStore = Store::find($storeId);
        $dashboardData = $this->getDashboardData($storeId);
        
        return Inertia::render('dashboard', [
            'dashboardData' => $dashboardData,
            'currentStore' => $currentStore,
            'storeUrl' => $currentStore->getStoreUrl(),
            'onboarding' => $this->getOnboardingChecklist($currentStore, $user),
            'isSuperAdmin' => false
        ]);
    }
    
    /**
      * دليل البدء السريع للتاجر الجديد — 10 خطوات تغطي رحلة الإطلاق الكاملة.
      * يبقى ظاهراً حتى يكتمل النشر، ويمنع النشر الناقص (Shipping/Payment).
      */
    private function getOnboardingChecklist(Store $store, $user)
    {
        $config = \App\Models\StoreConfiguration::getConfiguration($store->id);
        
        $hasStoreInfo = !empty($store->name) && !empty($store->slug);
        $hasDesign = !empty($store->theme) || !empty($config['design_tokens']) || !empty($config['template_overrides']);
        $hasCategories = \App\Models\Category::where('store_id', $store->id)->exists();
        $hasProducts = Product::where('store_id', $store->id)->exists();
        $hasInventory = \App\Models\Product::where('store_id', $store->id)->where('stock', '>', 0)->exists();
        // Shipping: check if any shipping method exists for this store
        $hasShipping = \App\Models\Shipping::where('store_id', $store->id)->exists();
        // Fallback: also check store configuration for shipping
        if (!$hasShipping) {
            $hasShipping = !empty($config['shipping_enabled']) || !empty($config['shipping_methods']);
        }
        $hasPayments = count(getEnabledPaymentMethods($user->id, $store->id)) > 0;
        $hasTaxes = \App\Models\Tax::where('store_id', $store->id)->exists();
        $hasDomain = !empty($store->custom_domain) || !empty($store->custom_subdomain);
        $hasSeo = !empty($config['meta_title']) || !empty($config['seo_title']);
        $storePublished = ($config['store_status'] ?? null) === true || ($config['store_status'] ?? null) === 'true' || !array_key_exists('store_status', $config);

        // Commerce-ready vs publishable distinction:
        // - PUBLISHABLE = store_status can be true at any time (preview before inventory complete)
        // - READY TO ACCEPT ORDERS = at least one active product + shipping + payment
        // Keep publish step about store visibility, commerce-ready about order capability
        $isReadyToPublish = $hasProducts && $hasShipping && $hasPayments;
        $isPublishable = $storePublished;
        $nextAction = $this->resolveNextAction($store, $hasProducts, $hasPayments, $hasShipping, $isPublishable);

        try {
            $canManageStoreSettings = $user->can('settings-stores') || $user->type === 'company';
        } catch (\Exception $e) {
            $canManageStoreSettings = true;
        }
        
        $steps = [
            [
                'key' => 'store_info',
                'done' => $hasStoreInfo,
                'href' => route('stores.settings', $store->id) . '?tab=general',
            ],
            [
                'key' => 'design',
                'done' => $hasDesign,
                'href' => route('stores.designer', $store->id) . '?tab=templates',
            ],
            [
                'key' => 'categories',
                'done' => $hasCategories,
                'href' => $hasCategories ? null : route('categories.index'),
            ],
            [
                'key' => 'products',
                'done' => $hasProducts,
                'href' => $hasProducts ? null : route('products.create'),
            ],
            [
                'key' => 'inventory',
                'done' => $hasInventory,
                'href' => $hasInventory ? null : route('products.index'),
            ],
            [
                'key' => 'shipping',
                'done' => $hasShipping,
                'href' => $hasShipping ? null : route('delivery.index'),
            ],
            [
                'key' => 'payments',
                'done' => $hasPayments,
                'href' => $hasPayments ? null : '/stores/' . $store->id . '/settings?tab=payments',
            ],
            [
                'key' => 'taxes',
                'done' => $hasTaxes,
                'href' => $hasTaxes ? null : '/stores/' . $store->id . '/settings?tab=taxes',
            ],
            [
                'key' => 'domain',
                'done' => $hasDomain,
                'href' => $hasDomain ? null : '/stores/' . $store->id . '/settings?tab=domains',
            ],
            [
                'key' => 'published',
                'done' => $isPublishable,
                'href' => $isPublishable ? null : route('stores.settings', $store->id) . '?tab=general',
            ],
        ];

        // Keep payments step as canonical for backward compatibility, but ensure it points to the unified tab
        // (already handled in shipping/payments above)

        $pendingCount = collect($steps)->where('done', false)->count();

        return [
            'show' => true, // Always show until fully published and ready — don't hide when pending
            'pendingCount' => $pendingCount,
            'totalCount' => count($steps),
            'steps' => $steps,
            'isReadyToPublish' => $isReadyToPublish,
            'isPublishable' => $isPublishable,
            'missingForPublish' => array_values(array_filter([
                !$hasShipping ? 'الشحن والتوصيل' : null,
                !$hasPayments ? 'طرق الدفع' : null,
                !$hasProducts ? 'المنتجات' : null,
            ])),
            'nextAction' => $nextAction,
        ];
    }

    /**
     * Next Best Action — derives ONE clear merchant CTA from existing readiness
     * facts (products/payments/delivery/publish state + live order queue) with a
     * fixed priority, never inventing unsupported states.
     */
    private function resolveNextAction(Store $store, bool $hasProducts, bool $hasPayments, bool $hasShipping, bool $isPublishable): array
    {
        if (!$hasProducts) {
            return [
                'type' => 'add_product',
                'title' => 'أضف أول منتج',
                'description' => 'أضف أول منتج ليظهر في متجرك ويتمكن العملاء من الطلب.',
                'cta' => 'إضافة منتج',
                'href' => route('products.create'),
            ];
        }

        if (!$hasPayments) {
            return [
                'type' => 'setup_payment',
                'title' => 'فعّل طريقة دفع',
                'description' => 'فعّل الدفع عند الاستلام أو الدفع الإلكتروني ليكتمل استلام الطلبات.',
                'cta' => 'إعداد الدفع',
                'href' => '/stores/' . $store->id . '/settings?tab=payments',
            ];
        }

        if (!$hasShipping) {
            return [
                'type' => 'setup_delivery',
                'title' => 'إعداد التوصيل',
                'description' => 'أضف طريقة توصيل حتى يتمكن العملاء من استلام طلباتهم.',
                'cta' => 'إعداد التوصيل',
                'href' => route('delivery.index'),
            ];
        }

        if (!$isPublishable) {
            return [
                'type' => 'publish_store',
                'title' => 'انشر متجرك',
                'description' => 'متجرك جاهز — انشره ليصبح متاحاً للعملاء.',
                'cta' => 'نشر المتجر',
                'href' => route('stores.settings', $store->id) . '?tab=general',
            ];
        }

        $pendingOrders = Order::where('store_id', $store->id)
            ->whereIn('status', ['pending', 'confirmed'])
            ->count();

        if ($pendingOrders > 0) {
            return [
                'type' => 'review_orders',
                'title' => 'راجع الطلبات الجديدة',
                'description' => 'لديك طلبات جديدة بانتظار المراجعة.',
                'cta' => 'عرض الطلبات',
                'href' => route('orders.index'),
            ];
        }

        return [
            'type' => 'share_store',
            'title' => 'شارك رابط متجرك',
            'description' => 'أرسل رابط متجرك للعملاء وابدأ باستقبال الطلبات.',
            'cta' => 'نسخ الرابط',
            'href' => null,
        ];
    }
    
    private function getSuperAdminDashboardData()
    {
        $currentMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();
        
        // System-wide metrics
        $totalCompanies = User::where('type', 'company')->count();
        $totalStores = Store::count();
        // Count active stores from store_configuration
        $activeStores = Store::whereHas('configurations', function($q) {
            $q->where('key', 'store_status')->where('value', 'true');
        })->count();
        // Add stores without configuration (default active)
        $storesWithoutConfig = Store::whereDoesntHave('configurations', function($q) {
            $q->where('key', 'store_status');
        })->count();
        $activeStores += $storesWithoutConfig;
        $totalPlans = Plan::count();
        $activePlans = Plan::where('is_plan_enable', 'on')->count();
        $totalRevenue = PlanOrder::where('status', 'approved')->sum('final_price');
        $monthlyRevenue = PlanOrder::where('status', 'approved')
            ->where('created_at', '>=', $currentMonth)
            ->sum('final_price');
        $lastMonthRevenue = PlanOrder::where('status', 'approved')
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->sum('final_price');
        
        // Fix Monthly Growth calculation for demo mode
        if (config('app.is_demo', false)) {
            $monthlyGrowth = 18.5; // Demo mode: show positive growth
        } elseif ($lastMonthRevenue > 0) {
            $monthlyGrowth = (($monthlyRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100;
        } elseif ($monthlyRevenue > 0) {
            $monthlyGrowth = 100; // 100% growth if no previous revenue but current revenue exists
        } else {
            $monthlyGrowth = 0; // No growth if both are zero
        }
        
        // Plan orders and requests
        $pendingOrders = PlanOrder::where('status', 'pending')->count();
        $approvedOrders = PlanOrder::where('status', 'approved')->count();
        $totalOrders = PlanOrder::count();
        $pendingRequests = PlanRequest::where('status', 'pending')->count();
        
        // Coupons
        $activeCoupons = Coupon::where('status', true)
            ->where(function($query) {
                $query->whereNull('expiry_date')
                      ->orWhere('expiry_date', '>=', now());
            })
            ->count();
        $totalCoupons = Coupon::count();
        
        // Get diverse system activities
        $recentOrders = $this->getRecentSystemActivity();
        
        // Top performing plans
        $topPlans = PlanOrder::select('plan_id')
            ->selectRaw('COUNT(*) as order_count, SUM(final_price) as total_revenue')
            ->where('status', 'approved')
            ->with('plan')
            ->groupBy('plan_id')
            ->orderBy('total_revenue', 'desc')
            ->limit(5)
            ->get()
            ->map(function($item) {
                return [
                    'id' => $item->plan_id,
                    'name' => $item->plan->name ?? 'Unknown Plan',
                    'orders' => $item->order_count,
                    'revenue' => $item->total_revenue,
                    'subscribers' => $item->order_count
                ];
            });
        
        return [
            'metrics' => [
                'totalCompanies' => $totalCompanies,
                'totalStores' => $totalStores,
                'activeStores' => $activeStores,
                'totalPlans' => $totalPlans,
                'activePlans' => $activePlans,
                'totalRevenue' => $totalRevenue,
                'monthlyRevenue' => $monthlyRevenue,
                'monthlyGrowth' => round($monthlyGrowth, 2),
                'pendingRequests' => $pendingRequests,
                'pendingOrders' => $pendingOrders,
                'approvedOrders' => $approvedOrders,
                'totalOrders' => $totalOrders,
                'activeCoupons' => $activeCoupons,
                'totalCoupons' => $totalCoupons
            ],
            'recentOrders' => $recentOrders,
            'topPlans' => $topPlans,
            'alerts' => $this->getMerchantAlerts(auth()->id(), null)
        ];
    }
    
    private function getDashboardData($storeId)
    {
        $currentMonth = Carbon::now()->startOfMonth()->subSecond();
        $lastMonthStart = Carbon::now()->subMonth()->startOfMonth();
        $lastMonthEnd = Carbon::now()->startOfMonth();

        $totalOrders = Order::where('store_id', $storeId)->count();
        $totalProducts = Product::where('store_id', $storeId)->count();
        $totalCustomers = Customer::where('store_id', $storeId)->count();

        // Revenue only counts paid orders, consistent with Analytics & Store pages.
        $totalRevenue = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->sum('total_amount');
        $currentMonthRevenue = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $currentMonth)
            ->sum('total_amount');
        $lastMonthRevenue = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])
            ->sum('total_amount');

        // Month-over-month counts for real growth deltas.
        $currentOrders = Order::where('store_id', $storeId)->where('created_at', '>=', $currentMonth)->count();
        $lastMonthOrders = Order::where('store_id', $storeId)->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count();
        $currentProducts = Product::where('store_id', $storeId)->where('created_at', '>=', $currentMonth)->count();
        $lastMonthProducts = Product::where('store_id', $storeId)->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count();
        $currentCustomers = Customer::where('store_id', $storeId)->where('created_at', '>=', $currentMonth)->count();
        $lastMonthCustomers = Customer::where('store_id', $storeId)->whereBetween('created_at', [$lastMonthStart, $lastMonthEnd])->count();

        $growth = fn ($current, $last) => $last > 0 ? (($current - $last) / $last) * 100 : ($current > 0 ? 100 : 0);

        $recentOrders = Order::where('store_id', $storeId)
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function($order) {
                return [
                    'id' => $order->id,
                    'order_number' => $order->order_number,
                    'customer' => $order->customer_first_name . ' ' . $order->customer_last_name,
                    'amount' => $order->total_amount,
                    'status' => $order->status,
                    'date' => $order->created_at->diffForHumans()
                ];
            });
            
        $topProducts = OrderItem::select('product_id', 'product_name')
            ->selectRaw('SUM(quantity) as total_sold')
            ->whereHas('order', function($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->groupBy('product_id', 'product_name')
            ->orderBy('total_sold', 'desc')
            ->limit(5)
            ->get()
            ->map(function($item) {
                $product = Product::find($item->product_id);
                return [
                    'id' => $item->product_id,
                    'name' => $item->product_name,
                    'sold' => $item->total_sold,
                    'price' => $product ? $product->price : 0,
                    'sale_price' => $product ? $product->sale_price : null
                ];
            });
        
        return [
            'metrics' => [
                'orders' => $totalOrders,
                'products' => $totalProducts,
                'customers' => $totalCustomers,
                'revenue' => $totalRevenue,
                'monthlyRevenue' => round($currentMonthRevenue, 2),
                'monthlyGrowth' => round($growth($currentMonthRevenue, $lastMonthRevenue), 1),
                'ordersGrowth' => round($growth($currentOrders, $lastMonthOrders), 1),
                'productsGrowth' => round($growth($currentProducts, $lastMonthProducts), 1),
                'customersGrowth' => round($growth($currentCustomers, $lastMonthCustomers), 1)
            ],
            'recentOrders' => $recentOrders,
            'topProducts' => $topProducts,
            'revenueChart' => $this->getStoreRevenueChartData($storeId),
            'salesChart' => $this->getStoreSalesChartData($storeId),
            'alerts' => $this->getMerchantAlerts(auth()->id(), $storeId)
        ];
    }

    /**
     * Daily paid revenue for the last 30 days, matching the Analytics chart.
     */
    private function getStoreRevenueChartData($storeId)
    {
        return Order::query()
            ->where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as revenue')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($item) => [
                'date' => Carbon::parse($item->date)->format('M d'),
                'revenue' => (float) $item->revenue
            ]);
    }

    /**
     * Daily order count for the last 30 days, matching the Analytics chart.
     */
    private function getStoreSalesChartData($storeId)
    {
        return Order::query()
            ->where('store_id', $storeId)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($item) => [
                'date' => Carbon::parse($item->date)->format('M d'),
                'orders' => (int) $item->orders
            ]);
    }
    
    private function getEmptyDashboard()
    {
        return [
            'metrics' => [
                'orders' => 0,
                'products' => 0,
                'customers' => 0,
                'revenue' => 0,
                'monthlyRevenue' => 0,
                'monthlyGrowth' => 0,
                'ordersGrowth' => 0,
                'productsGrowth' => 0,
                'customersGrowth' => 0
            ],
            'recentOrders' => [],
            'topProducts' => [],
            'revenueChart' => [],
            'salesChart' => [],
            'alerts' => []
        ];
    }
    
    /**
     * أحدث التنبيهات الهامة للتاجر من جدول merchant_notifications.
     * Grouped by (type + title) so repeated alerts (e.g. repeated new-device
     * login notices) collapse into a single card with a count badge.
     */
    private function getMerchantAlerts(?int $userId, ?int $storeId = null)
    {
        if (!$userId) {
            return [];
        }

        $notifications = MerchantNotificationService::getUrgentForUser($userId, $storeId, 50);

        return $notifications
            // Dismissed (read) alerts are hidden from the dashboard.
            ->filter(fn ($n) => !$n->is_read)
            // Collapse duplicates by type + title, keeping the most recent.
            ->groupBy(fn ($n) => $n->type . '|' . $n->title)
            ->map(function ($group) {
                $latest = $group->first();
                return [
                    'id' => $latest->id,
                    'type' => $latest->type,
                    'title' => $latest->title,
                    'body' => $latest->body,
                    'icon' => $latest->icon,
                    'color' => $latest->color,
                    'action_url' => $latest->action_url,
                    'related_id' => $latest->related_id,
                    'related_type' => $latest->related_type,
                    'is_read' => $latest->is_read,
                    'is_urgent' => $latest->is_urgent,
                    'created_at' => $latest->created_at?->diffForHumans(),
                    'count' => $group->count(),
                    'group_ids' => $group->pluck('id')->all(),
                ];
            })
            ->values()
            ->take(10)
            ->toArray();
    }
    
    public function export()
    {
        $user = auth()->user();
        
        if ($user->isSuperAdmin()) {
            return $this->exportSuperAdminDashboard();
        }
        
        $storeId = getCurrentStoreId($user);
        
        if (!$storeId) {
            return response()->json(['error' => 'No store selected'], 400);
        }
        
        $store = Store::find($storeId);
        $dashboardData = $this->getDashboardData($storeId);
        
        $csvData = [];
        $csvData[] = ['Dashboard Export - ' . $store->name];
        $csvData[] = ['Generated on: ' . now()->format('Y-m-d H:i:s')];
        $csvData[] = [];
        
        // Metrics
        $csvData[] = ['METRICS'];
        $csvData[] = ['Total Orders', $dashboardData['metrics']['orders']];
        $csvData[] = ['Total Products', $dashboardData['metrics']['products']];
        $csvData[] = ['Total Customers', $dashboardData['metrics']['customers']];
        $csvData[] = ['Total Revenue', formatStoreCurrency($dashboardData['metrics']['revenue'], $user->id, $storeId)];
        $csvData[] = [];
        
        // Recent Orders
        $csvData[] = ['RECENT ORDERS'];
        $csvData[] = ['Order Number', 'Customer', 'Amount', 'Status'];
        foreach ($dashboardData['recentOrders'] as $order) {
            $csvData[] = [$order['order_number'], $order['customer'], formatStoreCurrency($order['amount'], $user->id, $storeId), $order['status']];
        }
        $csvData[] = [];
        
        // Top Products
        $csvData[] = ['TOP PRODUCTS'];
        $csvData[] = ['Product Name', 'Units Sold', 'Price'];
        foreach ($dashboardData['topProducts'] as $product) {
            $csvData[] = [$product['name'], $product['sold'], formatStoreCurrency($product['price'], $user->id, $storeId)];
        }
        
        $filename = 'dashboard-export-' . $store->slug . '-' . now()->format('Y-m-d') . '.csv';
        
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
    
    private function exportSuperAdminDashboard()
    {
        $dashboardData = $this->getSuperAdminDashboardData();
        
        $csvData = [];
        $csvData[] = ['Wusool Super Admin Dashboard Export'];
        $csvData[] = ['Generated on: ' . now()->format('Y-m-d H:i:s')];
        $csvData[] = [];
        
        // System Metrics
        $csvData[] = ['SYSTEM OVERVIEW'];
        $csvData[] = ['Total Companies', $dashboardData['metrics']['totalCompanies']];
        $csvData[] = ['Total Stores', $dashboardData['metrics']['totalStores']];
        $csvData[] = ['Active Stores', $dashboardData['metrics']['activeStores']];
        $csvData[] = ['Total Revenue', '$' . number_format($dashboardData['metrics']['totalRevenue'], 2)];
        $csvData[] = ['Monthly Growth', $dashboardData['metrics']['monthlyGrowth'] . '%'];
        $csvData[] = ['Monthly Revenue', '$' . number_format($dashboardData['metrics']['monthlyRevenue'], 2)];
        $csvData[] = [];
        
        // Plan Management
        $csvData[] = ['PLAN MANAGEMENT'];
        $csvData[] = ['Active Plans', $dashboardData['metrics']['activePlans']];
        $csvData[] = ['Total Plans', $dashboardData['metrics']['totalPlans']];
        $csvData[] = ['Approved Orders', $dashboardData['metrics']['approvedOrders']];
        $csvData[] = ['Pending Orders', $dashboardData['metrics']['pendingOrders']];
        $csvData[] = ['Pending Requests', $dashboardData['metrics']['pendingRequests']];
        $csvData[] = [];
        
        // System Features
        $csvData[] = ['SYSTEM FEATURES'];
        $csvData[] = ['Active Coupons', $dashboardData['metrics']['activeCoupons']];
        $csvData[] = ['Total Coupons', $dashboardData['metrics']['totalCoupons']];
        $csvData[] = [];
        
        // Recent Orders
        $csvData[] = ['RECENT PLAN ORDERS'];
        $csvData[] = ['Order Number', 'Company', 'Plan', 'Amount', 'Status'];
        foreach ($dashboardData['recentOrders'] as $order) {
            $csvData[] = [$order['order_number'], $order['company'], $order['plan'], '$' . number_format($order['amount'], 2), $order['status']];
        }
        $csvData[] = [];
        
        // Top Plans
        if (!empty($dashboardData['topPlans'])) {
            $csvData[] = ['TOP PERFORMING PLANS'];
            $csvData[] = ['Plan Name', 'Orders', 'Revenue', 'Monthly Price'];
            foreach ($dashboardData['topPlans'] as $plan) {
                $csvData[] = [$plan['name'], $plan['orders'], '$' . number_format($plan['revenue'], 2), '$' . number_format($plan['price'], 2)];
            }
        }
        
        $filename = 'Wusool-superadmin-dashboard-export-' . now()->format('Y-m-d') . '.csv';
        
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
     * Get recent system activity for superadmin dashboard
     */
    private function getRecentSystemActivity()
    {
        $activities = [];
        
        // Recent company registrations
        $recentCompanies = User::where('type', 'company')
            ->latest()
            ->take(2)
            ->get();
            
        foreach ($recentCompanies as $company) {
            $activities[] = [
                'id' => 'company_' . $company->id,
                'type' => 'company_registered',
                'description' => 'New company "' . $company->name . '" registered',
                'company' => $company->name,
                'time' => $company->created_at->diffForHumans(),
                'date' => $company->created_at->format('M d, Y'),
                'status' => 'active',
                'created_at' => $company->created_at
            ];
        }
        
        // Recent store creations
        $recentStores = Store::with('user')
            ->latest()
            ->take(2)
            ->get();
            
        foreach ($recentStores as $store) {
            $activities[] = [
                'id' => 'store_' . $store->id,
                'type' => 'store_created',
                'description' => 'New store "' . $store->name . '" created by ' . ($store->user->name ?? 'Unknown'),
                'company' => $store->user->name ?? 'Unknown',
                'time' => $store->created_at->diffForHumans(),
                'date' => $store->created_at->format('M d, Y'),
                'status' => ($store->config_status ?? true) ? 'active' : 'inactive',
                'created_at' => $store->created_at
            ];
        }
        
        // Recent plan subscriptions (approved orders)
        $recentSubscriptions = PlanOrder::with(['user', 'plan'])
            ->where('status', 'approved')
            ->latest()
            ->take(2)
            ->get();
            
        foreach ($recentSubscriptions as $order) {
            $activities[] = [
                'id' => 'subscription_' . $order->id,
                'type' => 'plan_subscribed',
                'description' => ($order->user->name ?? 'Unknown') . ' subscribed to "' . ($order->plan->name ?? 'Unknown Plan') . '"',
                'company' => $order->user->name ?? 'Unknown',
                'time' => $order->created_at->diffForHumans(),
                'date' => $order->created_at->format('M d, Y'),
                'status' => 'approved',
                'created_at' => $order->created_at
            ];
        }
        
        // Recent plan requests
        $recentRequests = PlanRequest::with(['user', 'plan'])
            ->latest()
            ->take(1)
            ->get();
            
        foreach ($recentRequests as $request) {
            $activities[] = [
                'id' => 'request_' . $request->id,
                'type' => 'plan_requested',
                'description' => ($request->user->name ?? 'Unknown') . ' requested "' . ($request->plan->name ?? 'Unknown Plan') . '" upgrade',
                'company' => $request->user->name ?? 'Unknown',
                'time' => $request->created_at->diffForHumans(),
                'date' => $request->created_at->format('M d, Y'),
                'status' => $request->status,
                'created_at' => $request->created_at
            ];
        }
        
        // Sort by creation time (most recent first)
        usort($activities, function($a, $b) {
            return $b['created_at']->timestamp - $a['created_at']->timestamp;
        });
        
        // Remove created_at from final output and return top 5
        return collect(array_slice($activities, 0, 5))->map(function($activity) {
            unset($activity['created_at']);
            return $activity;
        })->toArray();
    }
}