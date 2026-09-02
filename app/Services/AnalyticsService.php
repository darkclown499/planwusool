<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Support\AnalyticsPeriod;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Merchant Analytics & Reporting read-model (Phase 1).
 *
 * Canonical definitions — reused, never re-specified:
 *
 *   Financial (mirrors PaymentFinancialMetrics::summary semantics)
 *     GMV       = sum(total_amount) of non-terminal orders
 *                 (status NOT IN cancelled/failed/returned), by order created_at.
 *     Collected = sum(total_amount) of payment_status = paid orders,
 *                 non-terminal only, bucketed by paid_at (falls back to created_at).
 *     Pending   = sum(total_amount) of pending orders on OFFLINE_MANUAL_METHODS
 *                 only, by created_at. Online in-flight transactions are never a
 *                 merchant receivable.
 *     Refunded  = sum(refunded_amount) where refunded_amount > 0 and status NOT
 *                 IN (cancelled,failed), bucketed by refunded_at (fallback created_at).
 *
 *   Customers (mirrors CustomerIdentityService / CustomerDirectoryService)
 *     A customer is a canonical customer OR a guest identity identified by the
 *     canonical ref rules (c:{id} → p:{e164} → e:{email} → o:{order_id}).
 *     A valid order for customer purposes has status NOT IN
 *     CustomerIdentityService::NON_VALID_ORDER_STATUSES.
 *     Repeat customer = a ref with valid_count >= 2.
 *
 * All money is grouped per currency — ILS/JOD/USD are never summed together.
 * Aggregation happens entirely in SQL; order rows are never loaded into PHP.
 *
 * Every query is tenant-scoped by store_id. The store id is always derived from
 * the authenticated user's session; it is never accepted from the client.
 */
final class AnalyticsService
{
    public const TOP_PRODUCTS_LIMIT = 5;
    public const TOP_CUSTOMERS_LIMIT = 5;
    public const PRODUCTS_PER_PAGE_DEFAULT = 20;
    public const PRODUCTS_PER_PAGE_MAX = 50;

    public function __construct(
        protected CustomerIdentityService $identity
    ) {
    }

    /**
     * Full overview payload for the Analytics dashboard.
     *
     * @return array<string,mixed>
     */
    public function overview(int $storeId, array $period, string $primaryCurrency): array
    {
        $from = $period['from'];
        $to = $period['to'];

        $current = $this->financialInPeriod($storeId, $from, $to);
        $previous = $this->financialInPeriod($storeId, $period['prev_from'], $period['prev_to']);

        $customerFlow = $this->customerFlow($storeId, $from, $to, $period['prev_from'], $period['prev_to']);
        $directoryStats = app(CustomerDirectoryService::class)->all($storeId, [])['stats'];

        $aov = $this->aov($current, $primaryCurrency);
        $aovPrev = $this->aov($previous, $primaryCurrency);

        return [
            'period' => $this->periodPayload($period),
            'metrics' => [
                'gmv' => $this->moneyMetric($current['gmv'], $previous['gmv'], $primaryCurrency),
                'collected' => $this->moneyMetric($current['collected'], $previous['collected'], $primaryCurrency),
                'pending_collection' => $this->moneyMetric($current['pending'], $previous['pending'], $primaryCurrency),
                'valid_orders' => $this->countMetric($current['valid_orders'], $previous['valid_orders']),
                'cancelled_orders' => $this->countMetric($current['cancelled_orders'], $previous['cancelled_orders']),
                'aov' => $this->moneyMetric(
                    $aov['by_currency'],
                    $aovPrev['by_currency'],
                    $primaryCurrency,
                    (int) $current['valid_orders']
                ),
                'total_customers' => $this->countMetric(
                    (int) $directoryStats['totalCustomers'],
                    null,
                    true
                ),
                'repeat_customers' => $this->countMetric(
                    (int) $directoryStats['repeatCustomers'],
                    null,
                    true
                ),
                'new_customers' => $this->countMetric(
                    $customerFlow['current']['new_customers'],
                    $customerFlow['previous']['new_customers']
                ),
            ],
            'trend' => $this->trend($storeId, $period, $primaryCurrency),
            'order_status_breakdown' => $this->orderStatusBreakdown($storeId, $from, $to, $primaryCurrency),
            'payment_method_breakdown' => $this->paymentMethodBreakdown($storeId, $from, $to, $primaryCurrency),
            'top_products' => [
                'by_value' => $this->topProductsByValue($storeId, $from, $to, $primaryCurrency),
                'by_quantity' => $this->topProductsByQuantity($storeId, $from, $to),
            ],
            'top_customers' => $this->topCustomers($storeId, $from, $to, $primaryCurrency, self::TOP_CUSTOMERS_LIMIT),
            'new_vs_returning' => [
                'new_orders' => $customerFlow['current']['new_orders'],
                'returning_orders' => $customerFlow['current']['returning_orders'],
                'new_customers' => $customerFlow['current']['new_customers'],
                'returning_customers' => $customerFlow['current']['returning_customers'],
            ],
        ];
    }

    /**
     * Paginated product performance for the products report page.
     *
     * @return array<string,mixed>
     */
    public function productPerformance(
        int $storeId,
        array $period,
        string $primaryCurrency,
        string $search = '',
        int $page = 1,
        int $perPage = self::PRODUCTS_PER_PAGE_DEFAULT
    ): array {
        $perPage = max(1, min(self::PRODUCTS_PER_PAGE_MAX, $perPage));
        $page = max(1, $page);

        $all = $this->productRows($storeId, $period, $primaryCurrency, $search);

        $total = count($all);
        $items = array_slice($all, ($page - 1) * $perPage, $perPage);

        return [
            'products' => $items,
            'pagination' => [
                'current_page' => $page,
                'last_page' => max(1, (int) ceil($total / $perPage)),
                'per_page' => $perPage,
                'total' => $total,
            ],
        ];
    }

    /**
     * All product-performance rows (sorted by units sold, desc). The export
     * path uses this directly; the page slices it server-side.
     *
     * @return list<array<string,mixed>>
     */
    public function productRows(int $storeId, array $period, string $primaryCurrency, string $search = ''): array
    {
        $query = $this->productAggregateQuery($storeId, $period['from'], $period['to']);
        $rows = $query->get();

        // Merge per-currency rows into one row per product.
        $merged = [];
        foreach ($rows as $row) {
            $key = (string) $row->product_key;
            if (! isset($merged[$key])) {
                $merged[$key] = [
                    'id' => $row->product_id ? (int) $row->product_id : null,
                    'name' => (string) $row->product_name,
                    'units' => 0,
                    'orders' => 0,
                    'totals' => [],
                ];
            }
            $merged[$key]['units'] += (int) $row->units;
            $merged[$key]['orders'] += (int) $row->order_count;
            $merged[$key]['totals'][strtoupper((string) ($row->currency ?: 'ILS'))] =
                ($merged[$key]['totals'][strtoupper((string) ($row->currency ?: 'ILS'))] ?? 0) + (float) $row->value;
        }

        $search = mb_strtolower(trim($search));
        if ($search !== '') {
            $merged = array_filter($merged, fn ($row) => mb_strpos(mb_strtolower((string) $row['name']), $search) !== false);
        }

        usort($merged, function (array $a, array $b) {
            if ($a['units'] !== $b['units']) {
                return $b['units'] <=> $a['units'];
            }

            return strcasecmp((string) $a['name'], (string) $b['name']);
        });

        return array_map(function (array $row) use ($primaryCurrency) {
            return [
                'id' => $row['id'],
                'name' => $row['name'],
                'units' => $row['units'],
                'orders' => $row['orders'],
                'revenue' => $this->toGroups($row['totals']),
                'primary' => $this->primaryAmount($row['totals'], $primaryCurrency),
                'avg_price' => $row['units'] > 0
                    ? round($this->primaryAmount($row['totals'], $primaryCurrency) / $row['units'], 2)
                    : 0.0,
            ];
        }, array_values($merged));
    }

    /**
     * Customer analytics for the customers report page.
     *
     * @return array<string,mixed>
     */
    public function customerOverview(int $storeId, array $period, string $primaryCurrency): array
    {
        $flow = $this->customerFlow($storeId, $period['from'], $period['to'], $period['prev_from'], $period['prev_to']);
        $directoryStats = app(CustomerDirectoryService::class)->all($storeId, [])['stats'];

        $uniqueNow = (int) $flow['current']['unique_customers'];
        $uniquePrev = (int) $flow['previous']['unique_customers'];

        return [
            'period' => $this->periodPayload($period),
            'stats' => [
                'total_customers' => (int) $directoryStats['totalCustomers'],
                'repeat_customers' => (int) $directoryStats['repeatCustomers'],
                'unique_in_period' => $this->countMetric($uniqueNow, $uniquePrev),
                'new_customers' => $this->countMetric(
                    (int) $flow['current']['new_customers'],
                    (int) $flow['previous']['new_customers']
                ),
                'returning_customers' => $this->countMetric(
                    (int) $flow['current']['returning_customers'],
                    (int) $flow['previous']['returning_customers']
                ),
                'repeat_rate' => $uniqueNow > 0
                    ? round((((int) $flow['current']['returning_customers']) / $uniqueNow) * 100, 1)
                    : 0.0,
            ],
            'new_vs_returning' => [
                'new_orders' => (int) $flow['current']['new_orders'],
                'returning_orders' => (int) $flow['current']['returning_orders'],
            ],
            'top_customers' => $this->topCustomers($storeId, $period['from'], $period['to'], $primaryCurrency, 20),
        ];
    }

    /* ---------------------------- overview parts ---------------------------- */

    /**
     * @return array<string,mixed>
     */
    private function financialInPeriod(int $storeId, CarbonInterface $from, CarbonInterface $to): array
    {
        $excluded = PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES;

        $main = Order::where('store_id', $storeId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to)
            ->selectRaw(
                "COALESCE(NULLIF(currency, ''), 'ILS') AS currency,
                 SUM(CASE WHEN status NOT IN (?,?,?) THEN total_amount ELSE 0 END) AS gmv,
                 SUM(CASE WHEN status NOT IN (?,?,?) THEN 1 ELSE 0 END) AS valid_orders,
                 SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_orders,
                 SUM(CASE WHEN payment_status = 'pending'
                           AND status NOT IN (?,?,?)
                           AND payment_method IN (?,?,?,?,?,?,?,?)
                      THEN total_amount ELSE 0 END) AS pending",
                [...$excluded, ...$excluded, ...$excluded, ...PaymentFinancialMetrics::OFFLINE_MANUAL_METHODS]
            )
            ->groupBy('currency')
            ->get();

        $collected = Order::where('store_id', $storeId)
            ->where(DB::raw('COALESCE(paid_at, created_at)'), '>=', $from)
            ->where(DB::raw('COALESCE(paid_at, created_at)'), '<', $to)
            ->where('payment_status', 'paid')
            ->whereNotIn('status', $excluded)
            ->selectRaw("COALESCE(NULLIF(currency, ''), 'ILS') AS currency, SUM(total_amount) AS total")
            ->groupBy('currency')
            ->get();

        $refunded = Order::where('store_id', $storeId)
            ->where('refunded_amount', '>', 0)
            ->whereNotIn('status', ['cancelled', 'failed'])
            ->where(DB::raw('COALESCE(refunded_at, created_at)'), '>=', $from)
            ->where(DB::raw('COALESCE(refunded_at, created_at)'), '<', $to)
            ->selectRaw("COALESCE(NULLIF(currency, ''), 'ILS') AS currency, SUM(refunded_amount) AS total")
            ->groupBy('currency')
            ->get();

        $gmv = [];
        $validOrders = 0;
        $cancelledOrders = 0;
        $pending = [];
        foreach ($main as $row) {
            $code = strtoupper((string) $row->currency);
            $gmv[$code] = round((float) $row->gmv, 2);
            $validOrders += (int) $row->valid_orders;
            $cancelledOrders += (int) $row->cancelled_orders;
            $pending[$code] = round((float) $row->pending, 2);
        }
        $collectedMap = $this->rowsToMap($collected);
        $refundedMap = $this->rowsToMap($refunded);

        return [
            'gmv' => $gmv,
            'collected' => $collectedMap,
            'pending' => $pending,
            'refunded' => $refundedMap,
            'valid_orders' => $validOrders,
            'cancelled_orders' => $cancelledOrders,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function aov(array $financial, string $primaryCurrency): array
    {
        $byCurrency = $financial['gmv'];
        $primaryOrders = $financial['valid_orders'];

        $aovByCurrency = [];
        foreach ($byCurrency as $code => $value) {
            // AOV for the primary currency uses the global valid order count;
            // other currencies are shown only when universally present.
            $orders = $code === strtoupper($primaryCurrency) ? $primaryOrders : null;
            if ($orders === null || $orders <= 0) {
                continue;
            }
            $aovByCurrency[$code] = round($value / $orders, 2);
        }

        return ['by_currency' => $aovByCurrency, 'orders' => $primaryOrders];
    }

    /**
     * Bucketed trend series (primary currency only — never mixes currencies).
     *
     * @return array<string,mixed>
     */
    private function trend(int $storeId, array $period, string $primaryCurrency): array
    {
        $tz = new AnalyticsPeriod($period['timezone'], Carbon::parse($period['from']));
        $granularity = $tz->granularityFor($period['key'], $period['from'], $period['to']);
        $buckets = $tz->buckets($period['from'], $period['to'], $granularity);

        $labels = [];
        $validValue = [];
        $orders = [];
        $collected = [];

        if ($buckets) {
            [$validValue, $orders] = $this->bucketScan(
                $storeId,
                $period['from'],
                $period['to'],
                $buckets,
                'created_at',
                [fn ($q) => $q->where('currency', $primaryCurrency)]
            );
            $collectedByDate = $this->collectedByDate($storeId, $period['from'], $period['to'], $primaryCurrency);
            $collected = $this->mapCollected($collectedByDate, $period['from'], $period['to'], $buckets);

            foreach ($buckets as $bucket) {
                $labels[] = $bucket['label'];
            }
        }

        return [
            'granularity' => $granularity,
            'currency' => $primaryCurrency,
            'labels' => $labels,
            'valid_value' => array_values($validValue),
            'collected' => array_values($collected),
            'orders' => array_values($orders),
        ];
    }

    /**
     * Run one parameterized aggregate scan over bucket intervals and return
     * selected per-bucket sums.
     */
    private function bucketScan(
        int $storeId,
        CarbonInterface $from,
        CarbonInterface $to,
        array $buckets,
        string $dateExpr,
        array $filters = [],
        string $valueExpr = 'total_amount'
    ): array {
        if (! $buckets) {
            return [[], []];
        }

        $cases = [];
        $bindings = [];
        foreach ($buckets as $i => $bucket) {
            $cases[] = "SUM(CASE WHEN {$dateExpr} >= ? AND {$dateExpr} < ? THEN {$valueExpr} ELSE 0 END) AS v{$i}";
            $cases[] = "SUM(CASE WHEN {$dateExpr} >= ? AND {$dateExpr} < ? THEN 1 ELSE 0 END) AS c{$i}";
            $bindings[] = $bucket['start'];
            $bindings[] = $bucket['end'];
            $bindings[] = $bucket['start'];
            $bindings[] = $bucket['end'];
        }

        $query = Order::where('store_id', $storeId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to);
        foreach ($filters as $filter) {
            $query = $filter($query);
        }
        $row = $query->selectRaw(implode(', ', $cases), $bindings)->first();

        $values = [];
        $counts = [];
        if ($row) {
            foreach ($buckets as $i => $bucket) {
                $values[] = round((float) $row->{'v' . $i}, 2);
                $counts[] = (int) $row->{'c' . $i};
            }
        }

        return [$values, $counts];
    }

    /**
     * Collected totals per day (within the period) for the trend series.
     *
     * @return array<string,float> keyed by 'Y-m-d' (store-local day)
     */
    private function collectedByDate(int $storeId, CarbonInterface $from, CarbonInterface $to, string $primaryCurrency): array
    {
        $rows = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->whereNotIn('status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->where('currency', $primaryCurrency)
            ->where(DB::raw('COALESCE(paid_at, created_at)'), '>=', $from)
            ->where(DB::raw('COALESCE(paid_at, created_at)'), '<', $to)
            ->selectRaw('COALESCE(paid_at, created_at) AS paid_on, SUM(total_amount) AS total')
            ->groupBy(DB::raw('COALESCE(paid_at, created_at)'))
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $map[$row->paid_on] = round((float) $row->total, 2);
        }

        return $map;
    }

    /**
     * @return list<float>
     */
    private function mapCollected(array $collectedByDate, CarbonInterface $from, CarbonInterface $to, array $buckets): array
    {
        $out = array_fill(0, count($buckets), 0.0);
        foreach ($collectedByDate as $datetime => $amount) {
            $instant = Carbon::parse($datetime);
            foreach ($buckets as $i => $bucket) {
                if (! $instant->lt($bucket['start']) && $instant->lt($bucket['end'])) {
                    $out[$i] += $amount;
                    break;
                }
            }
        }

        return array_map(fn ($v) => round($v, 2), $out);
    }

    /**
     * @return array<string,mixed>
     */
    private function orderStatusBreakdown(int $storeId, CarbonInterface $from, CarbonInterface $to, string $primaryCurrency): array
    {
        $rows = Order::where('store_id', $storeId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to)
            ->selectRaw(
                "status,
                 COUNT(*) AS count,
                 COALESCE(NULLIF(currency, ''), 'ILS') AS currency,
                 SUM(total_amount) AS value"
            )
            ->groupBy('status', 'currency')
            ->orderBy('status')
            ->get();

        $totals = [];
        foreach ($rows as $row) {
            $totals[$row->status] = ($totals[$row->status] ?? 0) + (int) $row->count;
        }
        $grand = array_sum($totals) ?: 1;

        $map = [];
        $order = [
            OrderTransitionService::STATUS_PENDING,
            OrderTransitionService::STATUS_CONFIRMED,
            OrderTransitionService::STATUS_PROCESSING,
            OrderTransitionService::STATUS_SHIPPED,
            OrderTransitionService::STATUS_DELIVERED,
            OrderTransitionService::STATUS_CANCELLED,
            OrderTransitionService::STATUS_FAILED,
            OrderTransitionService::STATUS_REFUNDED,
            'returned',
        ];
        foreach ($rows as $row) {
            $status = (string) $row->status;
            if (! isset($map[$status])) {
                $map[$status] = [
                    'status' => $status,
                    'count' => 0,
                    'percentage' => round(((int) $row->count / $grand) * 100, 1),
                    'value' => [],
                ];
            }
            $map[$status]['count'] += (int) $row->count;
            $map[$status]['value'][strtoupper((string) $row->currency)] = round((float) $row->value, 2);
        }

        // Percentage of the final count, computed from the grand total.
        $sortRank = array_flip($order);
        $breakdown = [];
        foreach ($map as $status => $entry) {
            $breakdown[] = [
                'status' => $status,
                'count' => $entry['count'],
                'percentage' => round(($entry['count'] / $grand) * 100, 1),
                'value' => $this->toGroups($entry['value']),
                'primary' => $this->primaryAmount($entry['value'], $primaryCurrency),
            ];
        }

        usort($breakdown, fn (array $a, array $b) => $sortRank[$a['status']] ?? 99 <=> $sortRank[$b['status']] ?? 99);

        return $breakdown;
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function paymentMethodBreakdown(int $storeId, CarbonInterface $from, CarbonInterface $to, string $primaryCurrency): array
    {
        $methods = Order::where('store_id', $storeId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to)
            ->whereNotIn('status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->selectRaw(
                "COALESCE(NULLIF(payment_method, ''), 'offline') AS method,
                 COUNT(*) AS orders,
                 COUNT(*) AS valid_orders",
            )
            ->groupBy('method')
            ->get();

        $validValue = Order::where('store_id', $storeId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to)
            ->whereNotIn('status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->selectRaw(
                "COALESCE(NULLIF(payment_method, ''), 'offline') AS method,
                 COALESCE(NULLIF(currency, ''), 'ILS') AS currency,
                 SUM(total_amount) AS total"
            )
            ->groupBy('method', 'currency')
            ->get();

        $collected = Order::where('store_id', $storeId)
            ->where('payment_status', 'paid')
            ->whereNotIn('status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->where(DB::raw('COALESCE(paid_at, created_at)'), '>=', $from)
            ->where(DB::raw('COALESCE(paid_at, created_at)'), '<', $to)
            ->selectRaw("COALESCE(NULLIF(payment_method, ''), 'offline') AS method, currency, SUM(total_amount) AS total")
            ->groupBy('method', 'currency')
            ->get();

        $fold = function (array $map, $rows, string $field): array {
            foreach ($rows as $row) {
                $m = (string) $row->method;
                $map[$m][strtoupper((string) ($row->currency ?: 'ILS'))] =
                    ($map[$m][strtoupper((string) ($row->currency ?: 'ILS'))] ?? 0) + (float) $row->{$field};
            }

            return $map;
        };

        $validValueMap = $fold([], $validValue, 'total');
        $collectedMap = $fold([], $collected, 'total');

        $families = ['cod', 'bank', 'online', 'offline_other'];
        $out = [];
        foreach ($families as $family) {
            $group = ['method' => $family, 'orders' => 0, 'valid_orders' => 0, 'valid_value' => [], 'collected' => []];
            foreach ($methods as $row) {
                if ($this->methodFamily((string) $row->method) !== $family) {
                    continue;
                }
                $group['orders'] += (int) $row->orders;
                $group['valid_orders'] += (int) $row->valid_orders;
            }
            foreach ($validValueMap as $method => $amounts) {
                if ($this->methodFamily($method) !== $family) {
                    continue;
                }
                foreach ($amounts as $code => $amount) {
                    $group['valid_value'][$code] = ($group['valid_value'][$code] ?? 0) + $amount;
                }
            }
            foreach ($collectedMap as $method => $amounts) {
                if ($this->methodFamily($method) !== $family) {
                    continue;
                }
                foreach ($amounts as $code => $amount) {
                    $group['collected'][$code] = ($group['collected'][$code] ?? 0) + $amount;
                }
            }

            $out[] = [
                'method' => $family,
                'orders' => (int) $group['orders'],
                'valid_orders' => (int) $group['valid_orders'],
                'valid_value' => $this->toGroups(array_map(fn ($v) => round($v, 2), $group['valid_value'])),
                'collected' => $this->toGroups(array_map(fn ($v) => round($v, 2), $group['collected'])),
                'valid_value_primary' => $this->primaryAmount($group['valid_value'], $primaryCurrency),
                'collected_primary' => $this->primaryAmount($group['collected'], $primaryCurrency),
            ];
        }

        return $out;
    }

    private function methodFamily(string $method): string
    {
        $lower = strtolower($method);
        if (in_array($lower, PaymentFinancialMetrics::COD_METHODS, true)) {
            return 'cod';
        }
        if (in_array($lower, PaymentFinancialMetrics::BANK_METHODS, true)) {
            return 'bank';
        }
        if (in_array($lower, PaymentFinancialMetrics::OFFLINE_MANUAL_METHODS, true)) {
            return 'offline_other';
        }

        return 'online';
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function topProductsByValue(int $storeId, CarbonInterface $from, CarbonInterface $to, string $primaryCurrency): array
    {
        $query = $this->productAggregateQuery($storeId, $from, $to);
        $rows = $query->get();

        $merged = [];
        foreach ($rows as $row) {
            $key = (string) $row->product_key;
            if (! isset($merged[$key])) {
                $merged[$key] = ['name' => (string) $row->product_name, 'units' => 0, 'orders' => 0, 'totals' => []];
            }
            $merged[$key]['units'] += (int) $row->units;
            $merged[$key]['orders'] += (int) $row->order_count;
            $merged[$key]['totals'][strtoupper((string) ($row->currency ?: 'ILS'))] = round((float) $row->value, 2);
        }

        $items = array_values($merged);
        usort($items, fn (array $a, array $b) => $this->primaryAmount($b['totals'], $primaryCurrency) <=> $this->primaryAmount($a['totals'], $primaryCurrency));

        return array_map(
            fn (array $row) => [
                'name' => $row['name'],
                'units' => $row['units'],
                'orders' => $row['orders'],
                'revenue' => $this->toGroups($row['totals']),
                'primary' => $this->primaryAmount($row['totals'], $primaryCurrency),
            ],
            array_slice($items, 0, self::TOP_PRODUCTS_LIMIT)
        );
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function topProductsByQuantity(int $storeId, CarbonInterface $from, CarbonInterface $to): array
    {
        $query = $this->productAggregateQuery($storeId, $from, $to);
        $rows = $query->get();

        $merged = [];
        foreach ($rows as $row) {
            $key = (string) $row->product_key;
            if (! isset($merged[$key])) {
                $merged[$key] = ['name' => (string) $row->product_name, 'units' => 0, 'orders' => 0, 'totals' => []];
            }
            $merged[$key]['units'] += (int) $row->units;
            $merged[$key]['orders'] += (int) $row->order_count;
            $merged[$key]['totals'][strtoupper((string) ($row->currency ?: 'ILS'))] = round((float) $row->value, 2);
        }

        $items = array_values($merged);
        usort($items, fn (array $a, array $b) => $b['units'] <=> $a['units']);

        return array_map(
            fn (array $row) => [
                'name' => $row['name'],
                'units' => $row['units'],
                'orders' => $row['orders'],
                'revenue' => $this->toGroups($row['totals']),
                'primary' => $this->primaryAmount($row['totals'], null),
            ],
            array_slice($items, 0, self::TOP_PRODUCTS_LIMIT)
        );
    }

    private function productAggregateQuery(int $storeId, CarbonInterface $from, CarbonInterface $to)
    {
        return OrderItem::query()
            ->join('orders', 'orders.id', '=', 'order_items.order_id')
            ->where('orders.store_id', $storeId)
            ->where('orders.created_at', '>=', $from)
            ->where('orders.created_at', '<', $to)
            ->whereNotIn('orders.status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->selectRaw(
                "COALESCE(order_items.product_id, order_items.product_name) AS product_key,
                 MAX(order_items.product_id) AS product_id,
                 MAX(order_items.product_name) AS product_name,
                 SUM(order_items.quantity) AS units,
                 SUM(order_items.total_price) AS value,
                 COUNT(DISTINCT order_items.order_id) AS order_count,
                 COALESCE(NULLIF(orders.currency, ''), 'ILS') AS currency"
            )
            ->groupBy(DB::raw('COALESCE(order_items.product_id, order_items.product_name), orders.currency'));
    }

    /**
     * @return list<array<string,mixed>>
     */
    private function topCustomers(int $storeId, CarbonInterface $from, CarbonInterface $to, string $primaryCurrency, int $limit): array
    {
        $rows = $this->customerSpendQuery($storeId, $from, $to)->get();

        $merged = [];
        foreach ($rows as $row) {
            $ref = $this->identity->refForOrder([
                'customer_id' => $row->cid ? (int) $row->cid : null,
                'customer_phone' => $row->phone !== '' ? $row->phone : null,
                'customer_email' => $row->email,
                'id' => (int) $row->reference_order_id,
            ]);
            if (! isset($merged[$ref])) {
                $merged[$ref] = [
                    'name' => trim((string) $row->first_name . ' ' . (string) $row->last_name) ?: ($row->email ?: $row->phone) ?: 'customer',
                    'orders' => 0,
                    'totals' => [],
                ];
            }
            $merged[$ref]['orders'] += (int) $row->orders;
            $merged[$ref]['totals'][strtoupper((string) ($row->currency ?: 'ILS'))] =
                ($merged[$ref]['totals'][strtoupper((string) ($row->currency ?: 'ILS'))] ?? 0) + (float) $row->total;
        }

        $items = array_values($merged);
        usort($items, fn (array $a, array $b) => $this->primaryAmount($b['totals'], $primaryCurrency) <=> $this->primaryAmount($a['totals'], $primaryCurrency));

        return array_map(
            fn (array $row) => [
                'name' => $row['name'],
                'orders' => $row['orders'],
                'spent' => $this->toGroups(array_map(fn ($v) => round($v, 2), $row['totals'])),
                'primary_spent' => $this->primaryAmount($row['totals'], $primaryCurrency),
            ],
            array_slice($items, 0, $limit)
        );
    }

    private function customerSpendQuery(int $storeId, CarbonInterface $from, CarbonInterface $to)
    {
        return Order::where('store_id', $storeId)
            ->where('created_at', '>=', $from)
            ->where('created_at', '<', $to)
            ->whereNotIn('status', CustomerIdentityService::NON_VALID_ORDER_STATUSES)
            ->selectRaw(
                "COALESCE(customer_id, 0) AS cid,
                 COALESCE(NULLIF(customer_phone, ''), '') AS phone,
                 COALESCE(NULLIF(customer_email, ''), '') AS email,
                 COALESCE(NULLIF(customer_first_name, ''), '') AS first_name,
                 COALESCE(NULLIF(customer_last_name, ''), '') AS last_name,
                 MAX(id) AS reference_order_id,
                 COUNT(*) AS orders,
                 COALESCE(NULLIF(currency, ''), 'ILS') AS currency,
                 SUM(total_amount) AS total"
            )
            ->groupBy('cid', 'phone', 'email', 'first_name', 'last_name', 'currency');
    }

    /**
     * New vs returning customer/order flow with previous-period comparison.
     * Identity refs are computed with the canonical CRM rules, and raw phone
     * variants that normalize to the same E.164 collapse into one ref.
     *
     * @return array<string,mixed>
     */
    private function customerFlow(
        int $storeId,
        CarbonInterface $from,
        CarbonInterface $to,
        CarbonInterface $prevFrom,
        CarbonInterface $prevTo
    ): array {
        $nonValid = CustomerIdentityService::NON_VALID_ORDER_STATUSES;

        $rows = Order::where('store_id', $storeId)
            ->selectRaw(
                "COALESCE(customer_id, 0) AS cid,
                 COALESCE(NULLIF(customer_phone, ''), '') AS phone,
                 COALESCE(NULLIF(customer_email, ''), '') AS email,
                 MIN(id) AS reference_order_id,
                 SUM(CASE WHEN status NOT IN (?,?,?) THEN 1 ELSE 0 END) AS valid_total,
                 SUM(CASE WHEN created_at >= ? AND created_at < ? AND status NOT IN (?,?,?) THEN 1 ELSE 0 END) AS in_period,
                 SUM(CASE WHEN created_at >= ? AND created_at < ? AND status NOT IN (?,?,?) THEN 1 ELSE 0 END) AS in_prev,
                 SUM(CASE WHEN created_at < ? AND status NOT IN (?,?,?) THEN 1 ELSE 0 END) AS valid_before_current",
                [
                    ...$nonValid,
                    $from, $to, ...$nonValid,
                    $prevFrom, $prevTo, ...$nonValid,
                    $from, ...$nonValid,
                ]
            )
            ->groupBy('cid', 'phone', 'email')
            ->get();

        $current = ['new_orders' => 0, 'returning_orders' => 0, 'new_customers' => 0, 'returning_customers' => 0, 'unique_customers' => 0];
        $previous = ['new_orders' => 0, 'returning_orders' => 0, 'new_customers' => 0, 'returning_customers' => 0, 'unique_customers' => 0];

        foreach ($rows as $row) {
            $ref = $this->identity->refForOrder([
                'customer_id' => (int) $row->cid ?: null,
                'customer_phone' => $row->phone !== '' ? $row->phone : null,
                'customer_email' => $row->email,
                'id' => (int) $row->reference_order_id,
            ]);
            $bucket = (int) $row->in_period;
            $prevBucket = (int) $row->in_prev;
            $validTotal = (int) $row->valid_total;
            $validBeforeCurrent = (int) $row->valid_before_current;

            if ($bucket > 0) {
                $current['unique_customers']++;
                $isNew = $validBeforeCurrent === 0 && $validTotal === $bucket;
                $current['new_orders'] += $isNew ? $bucket : 0;
                $current['returning_orders'] += $isNew ? 0 : $bucket;
                $current['new_customers'] += $isNew ? 1 : 0;
                $current['returning_customers'] += $isNew ? 0 : 1;
            }
            if ($prevBucket > 0) {
                $previous['unique_customers']++;
                $isNewPrev = $validBeforeCurrent === 0 && ($validTotal - $bucket) === $prevBucket;
                $previous['new_orders'] += $isNewPrev ? $prevBucket : 0;
                $previous['returning_orders'] += $isNewPrev ? 0 : $prevBucket;
                $previous['new_customers'] += $isNewPrev ? 1 : 0;
                $previous['returning_customers'] += $isNewPrev ? 0 : 1;
            }
        }

        return ['current' => $current, 'previous' => $previous];
    }

    /* ------------------------------ formatting ------------------------------ */

    /**
     * @return array<string,mixed>
     */
    private function periodPayload(array $period): array
    {
        return [
            'key' => $period['key'],
            'timezone' => $period['timezone'],
            'from' => $period['from']->toISOString(),
            'to' => $period['to']->toISOString(),
            'from_label' => $period['from']->setTimezone($period['timezone'])->format('Y-m-d'),
            'to_label' => $period['to']->copy()->subSecond()->setTimezone($period['timezone'])->format('Y-m-d'),
        ];
    }

    /**
     * @param  array<string,float>  $current
     * @param  array<string,float>  $previous
     * @return array<string,mixed>
     */
    private function moneyMetric(array $current, array $previous, string $primaryCurrency, ?int $orderCount = null): array
    {
        $groups = $this->toGroups($current);
        $prevGroups = $this->toGroups($previous);

        return [
            'groups' => $groups,
            'previous_groups' => $prevGroups,
            'primary' => $this->primaryAmount($current, $primaryCurrency),
            'previous_primary' => $this->primaryAmount($previous, $primaryCurrency),
            'change' => AnalyticsPeriod::change(
                $this->primaryAmount($current, $primaryCurrency),
                $this->primaryAmount($previous, $primaryCurrency)
            ),
            'orders' => $orderCount,
        ];
    }

    /**
     * @return array<string,mixed>
     */
    private function countMetric(int $current, ?int $previous, bool $allTime = false): array
    {
        return [
            'current' => $current,
            'previous' => $allTime ? null : $previous,
            'change' => $allTime ? ['change' => null, 'is_new' => false] : AnalyticsPeriod::change($current, $previous),
        ];
    }

    /**
     * @param  array<string,float>  $map
     * @return list<array{code:string,symbol:string,amount:float}>
     */
    private function toGroups(array $map): array
    {
        $out = [];
        foreach ($map as $code => $amount) {
            $code = strtoupper((string) $code);
            $out[] = ['code' => $code, 'symbol' => PaymentFinancialMetrics::symbolFor($code), 'amount' => round((float) $amount, 2)];
        }

        return $out;
    }

    private function primaryAmount(array $map, ?string $primaryCurrency): float
    {
        if ($primaryCurrency === null) {
            // fall back to the single biggest group
            return round((float) (max($map) ?: 0), 2);
        }
        $code = strtoupper($primaryCurrency);

        return isset($map[$code]) ? round((float) $map[$code], 2) : 0.0;
    }

    /**
     * @return array<string,float>
     */
    private function rowsToMap($rows): array
    {
        $map = [];
        foreach ($rows as $row) {
            $map[strtoupper((string) ($row->currency ?: 'ILS'))] = round((float) $row->total, 2);
        }

        return $map;
    }
}