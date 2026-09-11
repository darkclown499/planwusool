<?php

namespace App\Services;

use App\Models\Order;
use App\Services\PaymentFinancialMetrics;
use App\Support\AnalyticsPeriod;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

/**
 * Merchant profit / margin reporting.
 *
 * Revenue basis: order_items.total_price (unit_price × quantity) — the
 * canonical pre-tax, pre-order-discount, pre-shipping product-line value.
 * Cost basis: the immutable order_items.unit_cost snapshot. NULL cost is
 * UNKNOWN and excluded from profit, never treated as zero.
 *
 * Every aggregate is SQL SUM/GROUP BY, store-scoped, bounded by the
 * AnalyticsPeriod window. Valid orders mirror the financial-truth filter
 * (PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES).
 */
class ProfitAnalyticsService
{
    private const RANK_LIMIT = 20;

    private const REFUND_LIMIT = 20;

    public function overview(int $storeId, array $period, string $primaryCurrency): array
    {
        /** @var CarbonInterface $from */
        $from = $period['from'];
        /** @var CarbonInterface $to */
        $to = $period['to'];

        $summary = $this->summary($storeId, $from, $to, $primaryCurrency);

        return [
            'summary' => $summary,
            'trend' => $this->trend($storeId, $from, $to, $period, $primaryCurrency),
            'top' => $this->ranked($storeId, $from, $to, false),
            'negative' => $this->ranked($storeId, $from, $to, true),
            'refunded_orders' => $this->refundedOrders($storeId, $from, $to),
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function summary(int $storeId, CarbonInterface $from, CarbonInterface $to, string $primaryCurrency): array
    {
        $currencyExpr = "COALESCE(NULLIF(o.currency, ''), 'ILS')";

        $lineRows = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->where('o.store_id', $storeId)
            ->where('o.created_at', '>=', $from)
            ->where('o.created_at', '<', $to)
            ->whereNotIn('o.status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->selectRaw("{$currencyExpr} AS currency")
            ->selectRaw('SUM(CASE WHEN oi.unit_cost IS NOT NULL THEN oi.total_price ELSE 0 END) AS known_revenue')
            ->selectRaw('SUM(CASE WHEN oi.unit_cost IS NULL THEN oi.total_price ELSE 0 END) AS unknown_cost_revenue')
            ->selectRaw('SUM(CASE WHEN oi.unit_cost IS NOT NULL THEN oi.unit_cost * oi.quantity ELSE 0 END) AS cogs')
            ->selectRaw('COUNT(DISTINCT CASE WHEN oi.unit_cost IS NOT NULL THEN oi.order_id END) AS known_cost_orders')
            ->selectRaw('COUNT(DISTINCT oi.order_id) AS total_orders')
            ->groupBy(DB::raw($currencyExpr))
            ->get()
            ->keyBy('currency');

        $refundRows = DB::table('orders as o')
            ->leftJoin(
                DB::raw('(SELECT order_id, SUM(CASE WHEN unit_cost IS NULL THEN 1 ELSE 0 END) AS unknown_items FROM order_items GROUP BY order_id) as u'),
                'u.order_id',
                '=',
                'o.id'
            )
            ->where('o.store_id', $storeId)
            ->where('o.refunded_amount', '>', 0)
            ->whereNotIn('o.status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->whereRaw('COALESCE(o.refunded_at, o.created_at) >= ?', [$from])
            ->whereRaw('COALESCE(o.refunded_at, o.created_at) < ?', [$to])
            ->selectRaw("{$currencyExpr} AS currency")
            ->selectRaw('SUM(CASE WHEN COALESCE(u.unknown_items, 0) = 0 THEN o.refunded_amount ELSE 0 END) AS attributable_refunds')
            ->selectRaw('SUM(CASE WHEN COALESCE(u.unknown_items, 0) > 0 THEN o.refunded_amount ELSE 0 END) AS excluded_refunds')
            ->selectRaw('SUM(o.refunded_amount) AS refunded_amount')
            ->groupBy(DB::raw($currencyExpr))
            ->get()
            ->keyBy('currency');

        $codes = $lineRows->keys()->merge($refundRows->keys())->unique()->values();
        $summary = [];

        foreach ($codes as $code) {
            $line = $lineRows->get($code);
            $refund = $refundRows->get($code);

            $known = round((float) ($line->known_revenue ?? 0), 2);
            $unknown = round((float) ($line->unknown_cost_revenue ?? 0), 2);
            $total = round($known + $unknown, 2);
            $cogs = round((float) ($line->cogs ?? 0), 2);
            $gross = round($known - $cogs, 2);

            $attributable = round((float) ($refund->attributable_refunds ?? 0), 2);
            $excluded = round((float) ($refund->excluded_refunds ?? 0), 2);

            $summary[] = [
                'code' => strtoupper((string) $code),
                'symbol' => PaymentFinancialMetrics::symbolFor((string) $code),
                'known_revenue' => $known,
                'unknown_cost_revenue' => $unknown,
                'total_revenue' => $total,
                'cost_coverage_pct' => $total > 0 ? round(($known / $total) * 100, 2) : 0.0,
                'cogs' => $cogs,
                'gross_profit' => $gross,
                'gross_margin_pct' => $known > 0 ? round(($gross / $known) * 100, 2) : 0.0,
                'refunded_amount' => round((float) ($refund->refunded_amount ?? 0), 2),
                'attributable_refunds' => $attributable,
                'excluded_refunds' => $excluded,
                'refund_adjusted_profit' => $known > 0 ? round($gross - $attributable, 2) : null,
                'refund_state' => $excluded > 0 ? 'partial' : 'complete',
                'known_cost_orders' => (int) ($line->known_cost_orders ?? 0),
                'total_orders' => (int) ($line->total_orders ?? 0),
            ];
        }

        usort($summary, function ($a, $b) use ($primaryCurrency) {
            $pa = strtoupper($primaryCurrency) === $a['code'] ? 0 : 1;
            $pb = strtoupper($primaryCurrency) === $b['code'] ? 0 : 1;
            return $pa <=> $pb ?: strcmp($a['code'], $b['code']);
        });

        return array_values($summary);
    }

    /**
     * @return array<string,list<mixed>>
     */
    public function trend(int $storeId, CarbonInterface $from, CarbonInterface $to, array $period, string $primaryCurrency): array
    {
        $periodHelper = new AnalyticsPeriod($period['timezone'] ?? 'Asia/Hebron', now());
        $granularity = $periodHelper->granularityFor($period['key'] ?? 'last_30_days', $from, $to);
        $buckets = $periodHelper->buckets($from, $to, $granularity);

        $labels = array_map(fn ($b) => $b['label'], $buckets);
        $known = array_fill(0, count($buckets), 0.0);
        $cogs = array_fill(0, count($buckets), 0.0);

        if ($buckets) {
            $cases = [];
            $bindings = [];
            foreach ($buckets as $i => $bucket) {
                $cases[] = "SUM(CASE WHEN o.created_at >= ? AND o.created_at < ? AND oi.unit_cost IS NOT NULL THEN oi.total_price ELSE 0 END) AS kr{$i}";
                $cases[] = "SUM(CASE WHEN o.created_at >= ? AND o.created_at < ? AND oi.unit_cost IS NOT NULL THEN oi.unit_cost * oi.quantity ELSE 0 END) AS cg{$i}";
                $bindings[] = $bucket['start'];
                $bindings[] = $bucket['end'];
                $bindings[] = $bucket['start'];
                $bindings[] = $bucket['end'];
            }

            $row = DB::table('order_items as oi')
                ->join('orders as o', 'o.id', '=', 'oi.order_id')
                ->where('o.store_id', $storeId)
                ->where('o.created_at', '>=', $from)
                ->where('o.created_at', '<', $to)
                ->whereNotIn('o.status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
                ->where('o.currency', $primaryCurrency)
                ->selectRaw(implode(', ', $cases), $bindings)
                ->first();

            if ($row) {
                foreach ($buckets as $i => $bucket) {
                    $known[$i] = round((float) $row->{'kr' . $i}, 2);
                    $cogs[$i] = round((float) $row->{'cg' . $i}, 2);
                }
            }
        }

        $gross = [];
        $margin = [];
        foreach ($known as $i => $value) {
            $g = round($value - $cogs[$i], 2);
            $gross[] = $g;
            $margin[] = $value > 0 ? round(($g / $value) * 100, 2) : 0.0;
        }

        return [
            'labels' => $labels,
            'known_revenue' => $known,
            'cogs' => $cogs,
            'gross_profit' => $gross,
            'margin_pct' => $margin,
        ];
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function ranked(int $storeId, CarbonInterface $from, CarbonInterface $to, bool $negativeOnly): array
    {
        $currencyExpr = "COALESCE(NULLIF(o.currency, ''), 'ILS')";

        $query = DB::table('order_items as oi')
            ->join('orders as o', 'o.id', '=', 'oi.order_id')
            ->where('o.store_id', $storeId)
            ->where('o.created_at', '>=', $from)
            ->where('o.created_at', '<', $to)
            ->whereNotIn('o.status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->whereNotNull('oi.unit_cost')
            ->selectRaw('oi.product_id, oi.product_name, oi.product_sku')
            ->selectRaw("{$currencyExpr} AS currency")
            ->selectRaw('SUM(oi.quantity) AS units')
            ->selectRaw('SUM(oi.total_price) AS revenue')
            ->selectRaw('SUM(oi.unit_cost * oi.quantity) AS cogs')
            ->selectRaw('SUM(oi.total_price) - SUM(oi.unit_cost * oi.quantity) AS gross_profit')
            ->groupBy('oi.product_id', 'oi.product_name', 'oi.product_sku', DB::raw($currencyExpr));

        $grossExpr = 'SUM(oi.total_price) - SUM(oi.unit_cost * oi.quantity)';

        if ($negativeOnly) {
            $query->havingRaw("{$grossExpr} < 0")->orderByRaw("{$grossExpr} ASC");
        } else {
            $query->orderByRaw("{$grossExpr} DESC");
        }

        return $query->limit(self::RANK_LIMIT)->get()->map(function ($row) {
            $revenue = round((float) $row->revenue, 2);
            $gross = round((float) $row->gross_profit, 2);
            return [
                'product_id' => $row->product_id !== null ? (int) $row->product_id : null,
                'product_name' => $row->product_name,
                'product_sku' => $row->product_sku,
                'currency' => strtoupper((string) $row->currency),
                'units' => (int) $row->units,
                'revenue' => $revenue,
                'cogs' => round((float) $row->cogs, 2),
                'gross_profit' => $gross,
                'margin_pct' => $revenue > 0 ? round(($gross / $revenue) * 100, 2) : 0.0,
            ];
        })->all();
    }

    /**
     * @return list<array<string,mixed>>
     */
    public function refundedOrders(int $storeId, CarbonInterface $from, CarbonInterface $to): array
    {
        return Order::where('store_id', $storeId)
            ->where('refunded_amount', '>', 0)
            ->whereNotIn('status', PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES)
            ->whereRaw('COALESCE(refunded_at, created_at) >= ?', [$from])
            ->whereRaw('COALESCE(refunded_at, created_at) < ?', [$to])
            ->select('id', 'order_number', 'currency', 'refunded_amount', 'refunded_at')
            ->selectRaw('EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = orders.id AND oi.unit_cost IS NULL) AS has_unknown_item')
            ->orderByRaw('COALESCE(refunded_at, created_at) DESC')
            ->limit(self::REFUND_LIMIT)
            ->get()
            ->map(fn ($o) => [
                'id' => (int) $o->id,
                'order_number' => $o->order_number,
                'currency' => strtoupper((string) ($o->currency ?: 'ILS')),
                'refunded_amount' => round((float) $o->refunded_amount, 2),
                'refunded_at' => $o->refunded_at,
                'coverage' => $o->has_unknown_item ? 'partial' : 'complete',
            ])
            ->all();
    }
}