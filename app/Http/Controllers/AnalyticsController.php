<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Customer;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        // Super admins have no store selected; for them the analytics page
        // shows platform-wide numbers aggregated across every store.
        $aggregate = $user->isSuperAdmin();

        // A merchant without a selected store has nothing to aggregate yet.
        if (!$aggregate && !$storeId) {
            return Inertia::render('analytics/index', [
                'analytics' => $this->emptyAnalytics(),
                'from' => null,
                'to' => null,
            ]);
        }

        $range = $this->resolveRange($request);

        $analytics = [
            'metrics' => $this->getKeyMetrics($storeId, $aggregate, $range),
            'topProducts' => $this->getTopProducts($storeId, $aggregate, $range),
            'topCustomers' => $this->getTopCustomers($storeId, $aggregate, $range),
            'recentActivity' => $this->getRecentActivity($storeId, $aggregate, $range),
            'revenueChart' => $this->getRevenueChartData($storeId, $aggregate, $range),
            'salesChart' => $this->getSalesChartData($storeId, $aggregate, $range),
        ];

        return Inertia::render('analytics/index', [
            'analytics' => $analytics,
            'from' => $range['from'] ? $range['from']->format('Y-m-d') : null,
            'to' => $range['to'] ? $range['to']->format('Y-m-d') : null,
        ]);
    }

    /**
     * Normalise an optional from/to query range into a date window plus the
     * immediately preceding window of equal length (used for the delta %).
     */
    private function resolveRange(Request $request): array
    {
        $from = $request->filled('from') ? Carbon::parse($request->input('from'))->startOfDay() : null;
        $to = $request->filled('to') ? Carbon::parse($request->input('to'))->endOfDay() : null;

        if ($from && $to && $from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        $prevFrom = null;
        $prevTo = null;
        if ($from && $to) {
            $length = $from->diffInDays($to) + 1;
            $prevTo = $from->copy()->subDay();
            $prevFrom = $from->copy()->subDays($length);
        }

        return compact('from', 'to', 'prevFrom', 'prevTo');
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

    private function getKeyMetrics($storeId, $aggregate, array $range = [])
    {
        $from = $range['from'] ?? null;
        $to = $range['to'] ?? null;
        $prevFrom = $range['prevFrom'] ?? null;
        $prevTo = $range['prevTo'] ?? null;

        // With a requested range we compare against the preceding window of
        // equal length; otherwise we keep the default month-over-month basis.
        $currentStart = $from ?? Carbon::now()->startOfMonth();
        $currentEnd = $to ?? Carbon::now();
        $prevStart = $prevFrom ?? Carbon::now()->subMonth()->startOfMonth();
        $prevEnd = $prevTo ?? $currentStart;

        // Revenue (paid orders only)
        $totalRevenue = $this->orderQuery($storeId, $aggregate, true)->sum('total_amount');
        $currentMonthRevenue = $this->orderQuery($storeId, $aggregate, true)
            ->whereBetween('created_at', [$currentStart, $currentEnd])
            ->sum('total_amount');
        $lastMonthRevenue = $this->orderQuery($storeId, $aggregate, true)
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->sum('total_amount');

        // Orders
        $currentOrders = $this->orderQuery($storeId, $aggregate)
            ->whereBetween('created_at', [$currentStart, $currentEnd])
            ->count();
        $lastMonthOrders = $this->orderQuery($storeId, $aggregate)
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();

        // Customers
        $customerQuery = Customer::query();
        if (!$aggregate && $storeId) {
            $customerQuery->where('store_id', $storeId);
        }
        $totalCustomers = $customerQuery->count();
        $newCustomers = (clone $customerQuery)
            ->whereBetween('created_at', [$currentStart, $currentEnd])
            ->count();

        // Revenue growth (current window vs previous window)
        $revenueGrowth = 0;
        if ($lastMonthRevenue > 0) {
            $revenueGrowth = (($currentMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100;
        } elseif ($currentMonthRevenue > 0) {
            $revenueGrowth = 100;
        }

        // Conversion rate proxy: paid orders placed in the window as % of total customers
        $currentMonthPaid = $this->orderQuery($storeId, $aggregate, true)
            ->whereBetween('created_at', [$currentStart, $currentEnd])
            ->count();
        $lastMonthPaid = $this->orderQuery($storeId, $aggregate, true)
            ->whereBetween('created_at', [$prevStart, $prevEnd])
            ->count();
        $conversionRate = $totalCustomers > 0 ? round(($currentMonthPaid / $totalCustomers) * 100, 1) : 0;
        $lastMonthRate = $totalCustomers > 0 ? round(($lastMonthPaid / $totalCustomers) * 100, 1) : 0;

        return [
            'revenue' => [
                // "current" is this window's revenue so the "% (delta)" below
                // it is meaningful and truthful.
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

    private function getTopProducts($storeId, $aggregate, array $range = [])
    {
        $from = $range['from'] ?? null;
        $to = $range['to'] ?? null;

        return OrderItem::select('product_name', 'product_id')
            ->selectRaw('SUM(quantity) as total_sold')
            ->selectRaw('SUM(total_price) as total_revenue')
            ->whereHas('order', function ($query) use ($storeId, $aggregate, $from, $to) {
                $query->where('payment_status', 'paid');
                if (!$aggregate && $storeId) {
                    $query->where('store_id', $storeId);
                }
                if ($from) {
                    $query->where('orders.created_at', '>=', $from);
                }
                if ($to) {
                    $query->where('orders.created_at', '<=', $to);
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

    private function getTopCustomers($storeId, $aggregate, array $range = [])
    {
        $from = $range['from'] ?? null;
        $to = $range['to'] ?? null;

        return Customer::select('customers.*')
            ->selectRaw("COUNT(CASE WHEN orders.payment_status = 'paid' THEN 1 ELSE NULL END) as order_count")
            ->selectRaw("SUM(CASE WHEN orders.payment_status = 'paid' THEN orders.total_amount ELSE 0 END) as total_spent")
            ->leftJoin('orders', 'customers.id', '=', 'orders.customer_id')
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('customers.store_id', $storeId);
            })
            ->when($from, fn ($query) => $query->where('orders.created_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('orders.created_at', '<=', $to))
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

    private function getRecentActivity($storeId, $aggregate, array $range = [])
    {
        $from = $range['from'] ?? null;
        $to = $range['to'] ?? null;

        return Order::query()
            ->with('customer')
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->when($from, fn ($query) => $query->where('created_at', '>=', $from))
            ->when($to, fn ($query) => $query->where('created_at', '<=', $to))
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

    private function getRevenueChartData($storeId, $aggregate, array $range = [])
    {
        $from = $range['from'] ?? Carbon::now()->subDays(30);
        $to = $range['to'] ?? null;

        return Order::query()
            ->where('payment_status', 'paid')
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->where('created_at', '>=', $from)
            ->when($to, fn ($query) => $query->where('created_at', '<=', $to))
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as revenue')
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

    private function getSalesChartData($storeId, $aggregate, array $range = [])
    {
        $from = $range['from'] ?? Carbon::now()->subDays(30);
        $to = $range['to'] ?? null;

        return Order::query()
            ->when(!$aggregate && $storeId, function ($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->where('created_at', '>=', $from)
            ->when($to, fn ($query) => $query->where('created_at', '<=', $to))
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders')
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

    public function export(Request $request)
    {
        $user = Auth::user();
        $storeId = $user->current_store;
        $aggregate = $user->isSuperAdmin();

        // A merchant without a selected store cannot export anything.
        if (!$aggregate && !$storeId) {
            return response()->json(['error' => 'No store selected'], 400);
        }

        $range = $this->resolveRange($request);

        $analytics = [
            'metrics' => $this->getKeyMetrics($storeId, $aggregate, $range),
            'topProducts' => $this->getTopProducts($storeId, $aggregate, $range),
            'topCustomers' => $this->getTopCustomers($storeId, $aggregate, $range),
            'revenueChart' => $this->getRevenueChartData($storeId, $aggregate, $range),
        ];

        $csvData = [];
        $scopeLabel = $aggregate ? 'All Stores (Platform)' : 'Store ID: ' . $storeId;
        $csvData[] = ['Analytics Export - ' . $scopeLabel];
        $csvData[] = ['Generated on: ' . now()->format('Y-m-d H:i:s')];
        if ($range['from'] && $range['to']) {
            $csvData[] = ['Period: ' . $range['from']->format('Y-m-d') . ' to ' . $range['to']->format('Y-m-d')];
        }
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
        $csvData[] = ['DAILY REVENUE'];
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

    public function exportPdf(Request $request)
    {
        $user = Auth::user();
        $storeId = $user->current_store;
        $aggregate = $user->isSuperAdmin();

        // A merchant without a selected store cannot export anything.
        if (!$aggregate && !$storeId) {
            abort(400, 'No store selected');
        }

        $range = $this->resolveRange($request);

        $analytics = [
            'metrics' => $this->getKeyMetrics($storeId, $aggregate, $range),
            'topProducts' => $this->getTopProducts($storeId, $aggregate, $range),
            'topCustomers' => $this->getTopCustomers($storeId, $aggregate, $range),
            'revenueChart' => $this->getRevenueChartData($storeId, $aggregate, $range),
        ];

        $currency = function ($amount) use ($user, $storeId) {
            return formatStoreCurrency($amount, $user->id, $storeId);
        };

        $data = [
            'generatedAt' => now()->format('Y-m-d H:i:s'),
            'scopeLabel' => $aggregate ? 'All Stores (Platform)' : 'Store ID: ' . $storeId,
            'periodLabel' => $range['from'] && $range['to']
                ? $range['from']->format('Y-m-d') . ' - ' . $range['to']->format('Y-m-d')
                : 'Last 30 days / this month',
            'metrics' => $analytics['metrics'],
            'topProducts' => $analytics['topProducts'],
            'topCustomers' => $analytics['topCustomers'],
            'revenueChart' => $analytics['revenueChart'],
            'currency' => $currency,
        ];

        $pdf = Pdf::loadView('pdf.analytics', $data);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('analytics-report-' . now()->format('Y-m-d') . '.pdf');
    }
}