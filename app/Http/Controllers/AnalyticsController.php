<?php

namespace App\Http\Controllers;

use App\Services\AnalyticsCsvExporter;
use App\Services\AnalyticsService;
use App\Services\CustomerDirectoryService;
use App\Support\AnalyticsPeriod;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Throwable;

/**
 * Merchant Analytics & Reporting (Phase 1).
 *
 * Every payload is built by the canonical AnalyticsService from SQL aggregates
 * scoped to the authenticated user's current store. The store id NEVER comes
 * from the client. Date ranges are resolved in the store's own timezone by the
 * AnalyticsPeriod helper (default: Asia/Hebron) and only validated presets or
 * a capped custom range are accepted.
 */
class AnalyticsController extends Controller
{
    public function __construct(
        protected AnalyticsService $analytics,
        protected CustomerDirectoryService $directory,
        protected AnalyticsCsvExporter $csv
    ) {
    }

    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        // Super admins (no selected store) and merchants without a store get an
        // empty-state dashboard. Platform-wide aggregation is deliberately NOT
        // offered here — analytics/reporting is a merchant (per-store) feature.
        if (! $storeId) {
            return Inertia::render('analytics/index', [
                'analytics' => $this->emptyPayload(),
                'preset' => 'last_30_days',
                'from' => null,
                'to' => null,
            ]);
        }

        [$period, $preset, $from, $to] = $this->resolvePeriod($request);
        $primaryCurrency = $this->primaryCurrency($user->id, $storeId);

        return Inertia::render('analytics/index', [
            'analytics' => $this->analytics->overview($storeId, $period, $primaryCurrency),
            'preset' => $preset,
            'from' => $from,
            'to' => $to,
        ]);
    }

    public function products(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        if (! $storeId) {
            return Inertia::render('analytics/products', [
                'products' => ['products' => [], 'pagination' => ['current_page' => 1, 'last_page' => 1, 'per_page' => 20, 'total' => 0]],
                'search' => '',
                'preset' => 'last_30_days',
                'from' => null,
                'to' => null,
            ]);
        }

        [$period, $preset, $from, $to] = $this->resolvePeriod($request);
        $primaryCurrency = $this->primaryCurrency($user->id, $storeId);

        return Inertia::render('analytics/products', [
            'products' => $this->analytics->productPerformance(
                $storeId,
                $period,
                $primaryCurrency,
                (string) ($request->input('search') ?? ''),
                max(1, (int) ($request->input('page') ?? 1)),
                (int) ($request->input('per_page') ?? AnalyticsService::PRODUCTS_PER_PAGE_DEFAULT)
            ),
            'search' => (string) ($request->input('search') ?? ''),
            'preset' => $preset,
            'from' => $from,
            'to' => $to,
        ]);
    }

    public function customers(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        if (! $storeId) {
            return Inertia::render('analytics/customers', [
                'customerAnalytics' => $this->emptyCustomerPayload(),
                'preset' => 'last_30_days',
                'from' => null,
                'to' => null,
            ]);
        }

        [$period, $preset, $from, $to] = $this->resolvePeriod($request);
        $primaryCurrency = $this->primaryCurrency($user->id, $storeId);

        return Inertia::render('analytics/customers', [
            'customerAnalytics' => $this->analytics->customerOverview($storeId, $period, $primaryCurrency),
            'preset' => $preset,
            'from' => $from,
            'to' => $to,
        ]);
    }

    public function export(Request $request)
    {
        [$period, $primaryCurrency, $storeId] = $this->exportContext($request);

        $analytics = $this->analytics->overview($storeId, $period, $primaryCurrency);

        $rows = [];
        $rows[] = ['report' => 'Sales Report', 'scope' => 'Store ' . $storeId, 'timezone' => $period['timezone']];
        $rows[] = ['period_from' => $period['from']->format('Y-m-d'), 'period_to' => $period['to']->copy()->subSecond()->format('Y-m-d')];
        $rows[] = [];

        $moneyLabels = [
            'gmv' => 'valid_sales_gmv',
            'collected' => 'collected',
            'pending_collection' => 'pending_collection',
            'aov' => 'average_order_value',
        ];
        foreach ($moneyLabels as $key => $label) {
            $metric = $analytics['metrics'][$key] ?? null;
            if (! $metric) {
                continue;
            }
            foreach ($metric['groups'] as $group) {
                $prev = collect($metric['previous_groups'])->first(fn ($g) => $g['code'] === $group['code']);
                $rows[] = [
                    'metric' => $label,
                    'amount_' . $group['code'] => $group['amount'],
                    'previous_' . $group['code'] => $prev['amount'] ?? '0',
                    'currency' => $group['code'],
                ];
            }
        }

        $rows[] = [];
        $rows[] = ['orders', $analytics['metrics']['valid_orders']['current'], (int) ($analytics['metrics']['valid_orders']['previous'] ?? 0)];
        $rows[] = ['cancelled_orders', $analytics['metrics']['cancelled_orders']['current'], (int) ($analytics['metrics']['cancelled_orders']['previous'] ?? 0)];
        $rows[] = ['total_customers', $analytics['metrics']['total_customers']['current'], 0];
        $rows[] = ['new_customers', $analytics['metrics']['new_customers']['current'], (int) ($analytics['metrics']['new_customers']['previous'] ?? 0)];

        $rows[] = [];
        $rows[] = ['order_status', 'count', 'percentage'];
        foreach ($analytics['order_status_breakdown'] as $row) {
            $rows[] = [$row['status'], $row['count'], $row['percentage'] . '%'];
        }

        $rows[] = [];
        $rows[] = ['payment_method', 'orders', 'valid_orders', 'valid_value'];
        foreach ($analytics['payment_method_breakdown'] as $row) {
            $value = $row['valid_value_primary'];
            $rows[] = [$row['method'], $row['orders'], $row['valid_orders'], $value ? number_format($value, 2) : '0.00'];
        }

        $rows[] = [];
        $rows[] = ['top_products_by_value', 'units', 'orders'];
        foreach ($analytics['top_products']['by_value'] as $product) {
            $rows[] = [$product['name'], $product['units'], $product['orders']];
        }

        return $this->csv->download('analytics-report-' . $period['from']->format('Y-m-d') . '.csv', ['report_data'], $rows);
    }

    public function exportProducts(Request $request)
    {
        [$period, $primaryCurrency, $storeId] = $this->exportContext($request);

        $products = $this->analytics->productRows($storeId, $period, $primaryCurrency);

        $rows = [];
        $rows[] = ['scope' => 'Store ' . $storeId, 'period_from' => $period['from']->format('Y-m-d'), 'period_to' => $period['to']->copy()->subSecond()->format('Y-m-d')];
        $rows[] = [];
        foreach ($products as $product) {
            $rows[] = [$product['name'], $product['units'], $product['orders'], number_format($product['primary'], 2)];
        }

        return $this->csv->download('analytics-products-' . $period['from']->format('Y-m-d') . '.csv', ['product', 'units_sold', 'orders', 'revenue'], $rows);
    }

    public function exportCustomers(Request $request)
    {
        [$period, $primaryCurrency, $storeId] = $this->exportContext($request);

        $analytics = $this->analytics->customerOverview($storeId, $period, $primaryCurrency);

        $rows = [];
        $rows[] = ['scope' => 'Store ' . $storeId, 'period_from' => $period['from']->format('Y-m-d'), 'period_to' => $period['to']->copy()->subSecond()->format('Y-m-d')];
        $rows[] = ['total_customers' => $analytics['stats']['total_customers'], 'repeat_customers' => $analytics['stats']['repeat_customers'], 'new_customers' => $analytics['stats']['new_customers']['current'], 'returning_customers' => $analytics['stats']['returning_customers']['current']];
        $rows[] = [];
        $rows[] = ['customer', 'orders', 'spent'];
        foreach ($analytics['top_customers'] as $customer) {
            $primary = end($customer['spent']) ?: null;
            $rows[] = [$customer['name'], $customer['orders'], $primary ? number_format($primary['amount'], 2) : '0.00'];
        }

        return $this->csv->download('analytics-customers-' . $period['from']->format('Y-m-d') . '.csv', ['customer', 'orders', 'spent'], $rows);
    }

    public function exportPdf(Request $request)
    {
        [$period, $primaryCurrency, $storeId, $user] = $this->exportContext($request);

        $analytics = $this->analytics->overview($storeId, $period, $primaryCurrency);
        $metrics = $analytics['metrics'];

        $currency = fn ($amount) => formatStoreCurrency($amount, $user->id, $storeId);

        $topProducts = collect($analytics['top_products']['by_value'])->take(5)->map(fn ($p) => [
            'name' => $p['name'],
            'sales' => $p['units'],
            'revenue' => $currency($p['primary']),
        ])->values()->all();

        $topCustomers = collect($analytics['top_customers'])->take(5)->map(fn ($c) => [
            'name' => $c['name'],
            'orders' => $c['orders'],
            'spent' => $currency($c['primary_spent']),
        ])->values()->all();

        $changes = collect($metrics)->mapWithKeys(fn ($m, $key) => [
            $key => is_array($m['change'] ?? null) ? $m['change']['change'] : 0.0,
        ]);

        $data = [
            'generatedAt' => now()->format('Y-m-d H:i:s'),
            'scopeLabel' => 'Store ID: ' . $storeId,
            'periodLabel' => $period['from']->format('Y-m-d') . ' - ' . $period['to']->copy()->subSecond()->format('Y-m-d'),
            'gmv' => collect($metrics['gmv']['groups'])->mapWithKeys(fn ($g) => [$g['code'] => $g['amount']])->all(),
            'collected' => collect($metrics['collected']['groups'])->mapWithKeys(fn ($g) => [$g['code'] => $g['amount']])->all(),
            'pending' => collect($metrics['pending_collection']['groups'])->mapWithKeys(fn ($g) => [$g['code'] => $g['amount']])->all(),
            'aov' => collect($metrics['aov']['groups'])->mapWithKeys(fn ($g) => [$g['code'] => $g['amount']])->all(),
            'validOrders' => $metrics['valid_orders']['current'],
            'validOrdersChange' => $changes['valid_orders'],
            'cancelledOrders' => $metrics['cancelled_orders']['current'],
            'totalCustomers' => $metrics['total_customers']['current'],
            'repeatCustomers' => $metrics['repeat_customers']['current'],
            'newCustomers' => $metrics['new_customers']['current'],
            'topProducts' => $topProducts,
            'topCustomers' => $topCustomers,
            'currency' => $currency,
        ];

        $pdf = Pdf::loadView('pdf.analytics', $data);
        $pdf->setPaper('a4', 'portrait');

        return $pdf->download('analytics-report-' . $period['from']->format('Y-m-d') . '.pdf');
    }

    /* ------------------------------------------------------------------ */

    /**
     * Resolve an AnalyticsPeriod from validated request input, guarding
     * against malformed/oversized custom ranges.
     *
     * @return array{0:array<string,mixed>,1:string,2:?string,3:?string}
     */
    private function resolvePeriod(Request $request): array
    {
        $preset = (string) ($request->input('preset') ?? 'last_30_days');
        if (! in_array($preset, AnalyticsPeriod::PRESETS, true)) {
            $preset = 'last_30_days';
        }

        $from = $request->input('from');
        $to = $request->input('to');
        if ($preset !== 'custom') {
            $from = null;
            $to = null;
        }

        try {
            $period = (new AnalyticsPeriod($this->storeTimezone($request), now()))->resolve($preset, $from ? (string) $from : null, $to ? (string) $to : null);
        } catch (Throwable) {
            $preset = 'last_30_days';
            $period = (new AnalyticsPeriod($this->storeTimezone($request), now()))->resolve($preset);
        }

        return [$period, $preset, $preset === 'custom' ? $from : null, $preset === 'custom' ? $to : null];
    }

    private function storeTimezone(Request $request): string
    {
        return (string) (settings(Auth::id(), getCurrentStoreId(Auth::user()))['defaultTimezone'] ?? 'Asia/Hebron');
    }

    private function primaryCurrency(int $userId, int $storeId): string
    {
        return strtoupper((string) (settings($userId, $storeId)['defaultCurrency'] ?? 'ILS'));
    }

    /**
     * @return array{0:array<string,mixed>,1:string,2:int,3:mixed}
     */
    private function exportContext(Request $request): array
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        if (! $storeId) {
            abort(400, 'No store selected');
        }

        [$period] = $this->resolvePeriod($request);

        return [$period, $this->primaryCurrency($user->id, $storeId), $storeId, $user];
    }

    /**
     * @return array<string,mixed>
     */
    private function emptyPayload(): array
    {
        $now = now();
        $tz = new AnalyticsPeriod('Asia/Hebron', $now);
        $period = $tz->resolve('last_30_days');

        return [
            'has_no_store' => true,
            'period' => [
                'key' => 'last_30_days',
                'timezone' => 'Asia/Hebron',
                'from' => $period['from']->toISOString(),
                'to' => $period['to']->toISOString(),
                'from_label' => $period['labels']['from'],
                'to_label' => $period['labels']['to'],
            ],
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function emptyCustomerPayload(): array
    {
        $now = now();
        $tz = new AnalyticsPeriod('Asia/Hebron', $now);
        $period = $tz->resolve('last_30_days');

        return [
            'has_no_store' => true,
            'period' => [
                'key' => 'last_30_days',
                'timezone' => 'Asia/Hebron',
                'from' => $period['from']->toISOString(),
                'to' => $period['to']->toISOString(),
                'from_label' => $period['labels']['from'],
                'to_label' => $period['labels']['to'],
            ],
        ];
    }
}