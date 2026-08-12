<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Customer;
use App\Models\OrderItem;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $storeId = $user->current_store;
        // Super admins have no store selected; for them the analytics page
        // shows platform-wide numbers aggregated across every store.
        $aggregate = $user->isSuperAdmin();

        // A merchant without a selected store has nothing to aggregate yet.
        if (!$aggregate && !$storeId) {
            return Inertia::render('analytics/index', [
                'analytics' => $this->emptyAnalytics()
            ]);
        }

        $analytics = [
            'metrics' => $this->getKeyMetrics($storeId, $aggregate),
            'topProducts' => $this->getTopProducts($storeId, $aggregate),
            'topCustomers' => $this->getTopCustomers($storeId, $aggregate),
            'recentActivity' => $this->getRecentActivity($storeId, $aggregate),
            'revenueChart' => $this->getRevenueChartData($storeId, $aggregate),
            'salesChart' => $this->getSalesChartData($storeId, $aggregate)
        ];

        return Inertia::render('analytics/index', [
            'analytics' => $analytics
        ]);
    }

    /**
     * Build an order query scoped to the current context.
     *
     * @param int|null $storeId
     * @param bool $aggregate When true (super admin), ignore the store filter.
     * @param bool $paidOnly Only count paid orders.
     */
    private function orderQuery($storeId, $aggregate, $paidOnly = false)
    {
        $query = Order::query();

        if ($paidOnly) {
            $query->where('payment_status', 'paid');
        }

        if (!$aggregate && $storeId) {
            $query->where('store_id', $storeId);
        }

        return $query;
    }

    private function getKeyMetrics($storeId, $aggregate)
    {
        $currentMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        // Revenue (paid orders only)
        $totalRevenue = $this->orderQuery($storeId, $aggregate, true)->sum('total_amount');
        $currentMonthRevenue = $this->orderQuery($storeId, $aggregate, true)
            ->where('created_at', '>=', $currentMonth)
            ->sum('total_amount');
        $lastMonthRevenue = $this->orderQuery($storeId, $aggregate, true)
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->sum('total_amount');

        // Orders
        $currentOrders = $this->orderQuery($storeId, $aggregate)
            ->where('created_at', '>=', $currentMonth)
            ->count();
        $lastMonthOrders = $this->orderQuery($storeId, $aggregate)
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->count();

        // Customers
        $customerQuery = Customer::query();
        if (!$aggregate && $storeId) {
            $customerQuery->where('store_id', $storeId);
        }
        $totalCustomers = $customerQuery->count();
        $newCustomers = (clone $customerQuery)
            ->where('created_at', '>=', $currentMonth)
            ->count();

        // Revenue growth (current month vs last month)
        $revenueGrowth = 0;
        if ($lastMonthRevenue > 0) {
            $revenueGrowth = (($currentMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100;
        } elseif ($currentMonthRevenue > 0) {
            $revenueGrowth = 100;
        }

        // Conversion rate proxy: paid orders placed this month as % of total customers
        $currentMonthPaid = $this->orderQuery($storeId, $aggregate, true)
            ->where('created_at', '>=', $currentMonth)
            ->count();
        $lastMonthPaid = $this->orderQuery($storeId, $aggregate, true)
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->count();
        $conversionRate = $totalCustomers > 0 ? round(($currentMonthPaid / $totalCustomers) * 100, 1) : 0;
        $lastMonthRate = $totalCustomers > 0 ? round(($lastMonthPaid / $totalCustomers) * 100, 1) : 0;

        return [
            'revenue' => [
                // "current" is this month's revenue so the "% from last month"
                // delta below it is meaningful and truthful.
                'current' => round($currentMonthRevenue, 2),
                // All-time revenue, shown as a secondary figure on the card.
                'total' => round($totalRevenue, 2),
                'change' => round($revenueGrowth, 1)
            ],
            'orders' => [
                'current' => $currentOrders,
                'change' => $currentOrders - $lastMonthOrders
            ],
            'customers' => [
                'total' => $totalCustomers,
                'new' => $newCustomers
            ],
            'conversion' => [
                'rate' => $conversionRate,
                'change' => round($conversionRate - $lastMonthRate, 1)
            ]
        ];
    }

    private function getTopProducts($storeId, $aggregate)
    {
        return OrderItem::select('product_name', 'product_id')
            ->selectRaw('SUM(quantity) as total_sold')
            ->selectRaw('SUM(total_price) as total_revenue')
            ->whereHas('order', function ($query) use ($storeId, $aggregate) {
                $query->where('payment_status', 'paid');
                if (!$aggregate && $storeId) {
                    $query->where('store_id', $storeId);
                }
            })
            ->groupBy('product_id', 'product_name')
            ->orderBy('total_revenue', 'desc')
            ->limit(4)
            ->get()
            ->map(function ($item) use ($storeId) {
                $user = Auth::user();
                return [
                    'name' => cleanUtf8((string) $item->product_name),
                    'sales' => (int) $item->total_sold,
                    'revenue' => formatStoreCurrency($item->total_revenue, $user->id, $storeId)
                ];
            });
    }

    private function getTopCustomers($storeId, $aggregate)
    {
        return Customer::select('customers.*')
            ->selectRaw("COUNT(CASE WHEN orders.payment_status = 'paid' THEN 1 ELSE NULL END) as order_count")
            ->selectRaw("SUM(CASE WHEN orders.payment_status = 'paid' THEN orders.total_amount ELSE 0 END) as total_spent")
            ->leftJoin('orders', 'customers.id', '=', 'orders.customer_id')
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('customers.store_id', $storeId);
            })
            ->groupBy('customers.id')
            ->orderBy('total_spent', 'desc')
            ->limit(4)
            ->get()
            ->map(function ($customer) use ($storeId) {
                $user = Auth::user();
                return [
                    'name' => cleanUtf8(trim($customer->first_name . ' ' . $customer->last_name)),
                    'orders' => (int) ($customer->order_count ?: 0),
                    'spent' => formatStoreCurrency($customer->total_spent ?: 0, $user->id, $storeId)
                ];
            });
    }

    private function getRecentActivity($storeId, $aggregate)
    {
        return Order::query()
            ->with('customer')
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->orderBy('created_at', 'desc')
            ->limit(4)
            ->get()
            ->map(function ($order) use ($storeId) {
                $user = Auth::user();
                return [
                    'type' => 'Order',
                    'description' => cleanUtf8(
                        'New order ' . $order->order_number . ' from ' . $order->customer_first_name . ' ' . $order->customer_last_name
                    ),
                    'amount' => formatStoreCurrency($order->total_amount, $user->id, $storeId),
                    'time' => $order->created_at ? $order->created_at->diffForHumans() : ''
                ];
            });
    }

    private function getRevenueChartData($storeId, $aggregate)
    {
        return Order::query()
            ->where('payment_status', 'paid')
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as revenue')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('M d'),
                    'revenue' => (float) $item->revenue
                ];
            });
    }

    private function getSalesChartData($storeId, $aggregate)
    {
        return Order::query()
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function ($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('M d'),
                    'orders' => (int) $item->orders
                ];
            });
    }

    private function emptyAnalytics()
    {
        return [
            'metrics' => [
                'revenue' => ['current' => 0, 'total' => 0, 'change' => 0],
                'orders' => ['current' => 0, 'change' => 0],
                'customers' => ['total' => 0, 'new' => 0],
                'conversion' => ['rate' => 0, 'change' => 0]
            ],
            'topProducts' => [],
            'topCustomers' => [],
            'recentActivity' => [],
            'revenueChart' => [],
            'salesChart' => []
        ];
    }

    public function export()
    {
        $user = Auth::user();
        $storeId = $user->current_store;
        $aggregate = $user->isSuperAdmin();

        // A merchant without a selected store cannot export anything.
        if (!$aggregate && !$storeId) {
            return response()->json(['error' => 'No store selected'], 400);
        }

        $analytics = [
            'metrics' => $this->getKeyMetrics($storeId, $aggregate),
            'topProducts' => $this->getTopProducts($storeId, $aggregate),
            'topCustomers' => $this->getTopCustomers($storeId, $aggregate),
            'revenueChart' => $this->getRevenueChartData($storeId, $aggregate)
        ];

        $csvData = [];
        $scopeLabel = $aggregate ? 'All Stores (Platform)' : 'Store ID: ' . $storeId;
        $csvData[] = ['Analytics Export - ' . $scopeLabel];
        $csvData[] = ['Generated on: ' . now()->format('Y-m-d H:i:s')];
        $csvData[] = [];

        // Key Metrics
        $csvData[] = ['KEY METRICS'];
        $csvData[] = ['Metric', 'Current Value', 'Change'];
        $csvData[] = ['Revenue', formatStoreCurrency($analytics['metrics']['revenue']['current'], $user->id, $storeId), number_format($analytics['metrics']['revenue']['change'], 1) . '%'];
        $csvData[] = ['Orders', $analytics['metrics']['orders']['current'], $analytics['metrics']['orders']['change']];
        $csvData[] = ['Total Customers', $analytics['metrics']['customers']['total'], ''];
        $csvData[] = ['New Customers', $analytics['metrics']['customers']['new'], ''];
        $csvData[] = [];

        // Top Products
        $csvData[] = ['TOP PRODUCTS'];
        $csvData[] = ['Product Name', 'Units Sold', 'Revenue'];
        foreach ($analytics['topProducts'] as $product) {
            $csvData[] = [$product['name'], $product['sales'], $product['revenue']];
        }
        $csvData[] = [];

        // Top Customers
        $csvData[] = ['TOP CUSTOMERS'];
        $csvData[] = ['Customer Name', 'Orders', 'Total Spent'];
        foreach ($analytics['topCustomers'] as $customer) {
            $csvData[] = [$customer['name'], $customer['orders'], $customer['spent']];
        }
        $csvData[] = [];

        // Revenue Chart Data
        $csvData[] = ['DAILY REVENUE (Last 30 Days)'];
        $csvData[] = ['Date', 'Revenue'];
        foreach ($analytics['revenueChart'] as $data) {
            $csvData[] = [$data['date'], formatStoreCurrency($data['revenue'], $user->id, $storeId)];
        }

        $filename = 'analytics-export-' . now()->format('Y-m-d') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="' . $filename . '"',
        ];

        $callback = function () use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
