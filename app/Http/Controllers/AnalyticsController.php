<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\Customer;
use App\Models\Product;
use App\Models\OrderItem;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function index()
    {
        $user = Auth::user();
        $storeId = $user->current_store;

        // Always return static data for demo purposes
        $analytics = [
            'metrics' => $this->getKeyMetrics($storeId),
            'topProducts' => $this->getTopProducts($storeId),
            'topCustomers' => $this->getTopCustomers($storeId),
            'recentActivity' => $this->getRecentActivity($storeId),
            'revenueChart' => $this->getStaticRevenueChart(),
            'salesChart' => $this->getStaticSalesChart()
        ];

        return Inertia::render('analytics/index', [
            'analytics' => $analytics
        ]);
    }

    private function getKeyMetrics($storeId)
    {
        $currentMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        // Total revenue (all time) and current month revenue
        $totalRevenue = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->sum('total_amount');
            
        $currentMonthRevenue = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->where('created_at', '>=', $currentMonth)
            ->sum('total_amount');

        $lastMonthRevenue = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->sum('total_amount');

        $currentOrders = Order::where('store_id', $storeId)
            ->where('created_at', '>=', $currentMonth)
            ->count();

        $lastMonthOrders = Order::where('store_id', $storeId)
            ->whereBetween('created_at', [$lastMonth, $currentMonth])
            ->count();

        $totalCustomers = Customer::where('store_id', $storeId)->count();
        $newCustomers = Customer::where('store_id', $storeId)
            ->where('created_at', '>=', $currentMonth)
            ->count();

        // Fix revenue growth calculation
        $revenueGrowth = 0;
        if ($lastMonthRevenue > 0) {
            $revenueGrowth = (($currentMonthRevenue - $lastMonthRevenue) / $lastMonthRevenue) * 100;
        } elseif ($currentMonthRevenue > 0) {
            $revenueGrowth = 100;
        }

        return [
            'revenue' => [
                'current' => $totalRevenue, // Show total revenue, not just current month
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
                'rate' => 3.2, // Placeholder
                'change' => 0.5
            ]
        ];
    }

    private function getTopProducts($storeId)
    {
        return OrderItem::select('product_name', 'product_id')
            ->selectRaw('SUM(quantity) as total_sold')
            ->selectRaw('SUM(total_price) as total_revenue')
            ->whereHas('order', function($query) use ($storeId) {
                $query->where('store_id', $storeId);
            })
            ->groupBy('product_id', 'product_name')
            ->orderBy('total_revenue', 'desc')
            ->limit(4)
            ->get()
            ->map(function($item) use ($storeId) {
                $user = Auth::user();
                return [
                    'name' => $item->product_name,
                    'sales' => $item->total_sold,
                    'revenue' => formatStoreCurrency($item->total_revenue, $user->id, $storeId)
                ];
            });
    }

    private function getTopCustomers($storeId)
    {
        return Customer::select('customers.*')
            ->selectRaw('COUNT(orders.id) as order_count')
            ->selectRaw('SUM(orders.total_amount) as total_spent')
            ->leftJoin('orders', 'customers.id', '=', 'orders.customer_id')
            ->where('customers.store_id', $storeId)
            ->groupBy('customers.id')
            ->orderBy('total_spent', 'desc')
            ->limit(4)
            ->get()
            ->map(function($customer) use ($storeId) {
                $user = Auth::user();
                return [
                    'name' => $customer->first_name . ' ' . $customer->last_name,
                    'orders' => $customer->order_count ?: 0,
                    'spent' => formatStoreCurrency($customer->total_spent ?: 0, $user->id, $storeId)
                ];
            });
    }

    private function getRecentActivity($storeId)
    {
        return Order::where('store_id', $storeId)
            ->with('customer')
            ->orderBy('created_at', 'desc')
            ->limit(4)
            ->get()
            ->map(function($order) use ($storeId) {
                $user = Auth::user();
                return [
                    'type' => 'Order',
                    'description' => "New order {$order->order_number} from {$order->customer_first_name} {$order->customer_last_name}",
                    'amount' => formatStoreCurrency($order->total_amount, $user->id, $storeId),
                    'time' => $order->created_at->diffForHumans()
                ];
            });
    }

    private function getRevenueChartData($storeId)
    {
        return Order::where('store_id', $storeId)
            ->selectRaw('DATE(created_at) as date, SUM(total_amount) as revenue')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('M d'),
                    'revenue' => (float) $item->revenue
                ];
            });
    }

    private function getSalesChartData($storeId)
    {
        return Order::where('store_id', $storeId)
            ->selectRaw('DATE(created_at) as date, COUNT(*) as orders')
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(function($item) {
                return [
                    'date' => Carbon::parse($item->date)->format('M d'),
                    'orders' => (int) $item->orders
                ];
            });
    }

    private function getEmptyAnalytics()
    {
        return [
            'metrics' => [
                'revenue' => ['current' => 45250, 'change' => 12.5],
                'orders' => ['current' => 156, 'change' => 23],
                'customers' => ['total' => 89, 'new' => 12],
                'conversion' => ['rate' => 3.2, 'change' => 0.5]
            ],
            'topProducts' => [
                ['name' => 'iPhone 15 Pro Max', 'sales' => 45, 'revenue' => '$22,500'],
                ['name' => 'Samsung Galaxy S24', 'sales' => 32, 'revenue' => '$16,800'],
                ['name' => 'MacBook Air M3', 'sales' => 18, 'revenue' => '$21,600'],
                ['name' => 'AirPods Pro', 'sales' => 67, 'revenue' => '$13,400']
            ],
            'topCustomers' => [
                ['name' => 'John Smith', 'orders' => 8, 'spent' => '$3,250'],
                ['name' => 'Sarah Johnson', 'orders' => 6, 'spent' => '$2,890'],
                ['name' => 'Mike Wilson', 'orders' => 5, 'spent' => '$2,450'],
                ['name' => 'Emma Davis', 'orders' => 4, 'spent' => '$1,980']
            ],
            'recentActivity' => [
                ['type' => 'Order', 'description' => 'New order #1234 from John Smith', 'amount' => '$450', 'time' => '2 minutes ago'],
                ['type' => 'Customer', 'description' => 'New customer Sarah Johnson registered', 'amount' => null, 'time' => '15 minutes ago'],
                ['type' => 'Order', 'description' => 'New order #1233 from Mike Wilson', 'amount' => '$320', 'time' => '1 hour ago'],
                ['type' => 'Payment', 'description' => 'Payment received for order #1232', 'amount' => '$680', 'time' => '2 hours ago']
            ],
            'revenueChart' => [
                ['date' => 'Jan 1', 'revenue' => 1200],
                ['date' => 'Jan 2', 'revenue' => 1450],
                ['date' => 'Jan 3', 'revenue' => 1100],
                ['date' => 'Jan 4', 'revenue' => 1800],
                ['date' => 'Jan 5', 'revenue' => 1650],
                ['date' => 'Jan 6', 'revenue' => 2100],
                ['date' => 'Jan 7', 'revenue' => 1900],
                ['date' => 'Jan 8', 'revenue' => 2300],
                ['date' => 'Jan 9', 'revenue' => 2050],
                ['date' => 'Jan 10', 'revenue' => 2400],
                ['date' => 'Jan 11', 'revenue' => 2200],
                ['date' => 'Jan 12', 'revenue' => 2650],
                ['date' => 'Jan 13', 'revenue' => 2800],
                ['date' => 'Jan 14', 'revenue' => 2450]
            ],
            'salesChart' => [
                ['date' => 'Jan 1', 'orders' => 8],
                ['date' => 'Jan 2', 'orders' => 12],
                ['date' => 'Jan 3', 'orders' => 7],
                ['date' => 'Jan 4', 'orders' => 15],
                ['date' => 'Jan 5', 'orders' => 11],
                ['date' => 'Jan 6', 'orders' => 18],
                ['date' => 'Jan 7', 'orders' => 14],
                ['date' => 'Jan 8', 'orders' => 20],
                ['date' => 'Jan 9', 'orders' => 16],
                ['date' => 'Jan 10', 'orders' => 22],
                ['date' => 'Jan 11', 'orders' => 19],
                ['date' => 'Jan 12', 'orders' => 25],
                ['date' => 'Jan 13', 'orders' => 28],
                ['date' => 'Jan 14', 'orders' => 24]
            ]
        ];
    }
    
    private function getStaticRevenueChart()
    {
        return [
            ['date' => 'Jan 1', 'revenue' => 1200],
            ['date' => 'Jan 2', 'revenue' => 1450],
            ['date' => 'Jan 3', 'revenue' => 1100],
            ['date' => 'Jan 4', 'revenue' => 1800],
            ['date' => 'Jan 5', 'revenue' => 1650],
            ['date' => 'Jan 6', 'revenue' => 2100],
            ['date' => 'Jan 7', 'revenue' => 1900],
            ['date' => 'Jan 8', 'revenue' => 2300],
            ['date' => 'Jan 9', 'revenue' => 2050],
            ['date' => 'Jan 10', 'revenue' => 2400],
            ['date' => 'Jan 11', 'revenue' => 2200],
            ['date' => 'Jan 12', 'revenue' => 2650],
            ['date' => 'Jan 13', 'revenue' => 2800],
            ['date' => 'Jan 14', 'revenue' => 2450]
        ];
    }

    private function getStaticSalesChart()
    {
        return [
            ['date' => 'Jan 1', 'orders' => 8],
            ['date' => 'Jan 2', 'orders' => 12],
            ['date' => 'Jan 3', 'orders' => 7],
            ['date' => 'Jan 4', 'orders' => 15],
            ['date' => 'Jan 5', 'orders' => 11],
            ['date' => 'Jan 6', 'orders' => 18],
            ['date' => 'Jan 7', 'orders' => 14],
            ['date' => 'Jan 8', 'orders' => 20],
            ['date' => 'Jan 9', 'orders' => 16],
            ['date' => 'Jan 10', 'orders' => 22],
            ['date' => 'Jan 11', 'orders' => 19],
            ['date' => 'Jan 12', 'orders' => 25],
            ['date' => 'Jan 13', 'orders' => 28],
            ['date' => 'Jan 14', 'orders' => 24]
        ];
    }
    public function export()
    {
        $user = Auth::user();
        $storeId = $user->current_store;
        
        if (!$storeId) {
            return response()->json(['error' => 'No store selected'], 400);
        }
        
        $analytics = [
            'metrics' => $this->getKeyMetrics($storeId),
            'topProducts' => $this->getTopProducts($storeId),
            'topCustomers' => $this->getTopCustomers($storeId),
            'revenueChart' => $this->getRevenueChartData($storeId)
        ];
        
        $csvData = [];
        $csvData[] = ['Analytics Export - Store ID: ' . $storeId];
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
        
        $callback = function() use ($csvData) {
            $file = fopen('php://output', 'w');
            foreach ($csvData as $row) {
                fputcsv($file, $row);
            }
            fclose($file);
        };
        
        return response()->stream($callback, 200, $headers);
    }
}