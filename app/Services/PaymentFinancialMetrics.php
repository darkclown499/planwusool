<?php

namespace App\Services;

use App\Models\Currency;
use App\Models\Order;
use Carbon\Carbon;

/**
 * Canonical financial metrics for a store — single source of truth used by both the
 * Payment Operations page and (optionally) the dashboard.
 *
 * Semantics (approved product decisions):
 *
 *   GMV        = sum(total_amount) of ALL non-terminal orders (excludes cancelled/failed/returned).
 *                GMV is date-bucketed by ORDER created_at.
 *   Collected  = sum(total_amount) of orders with payment_status = paid, excluding
 *                cancelled/failed/returned. Date-bucketed by paid_at (falls back to created_at).
 *   Pending    = sum(total_amount) of orders with payment_status = pending on OFFLINE/manual
 *                methods only (COD, bank, whatsapp, offline). Online in-flight transactions
 *                are NOT an expected merchant receivable. Date-bucketed by created_at.
 *   Refunded   = sum(refunded_amount) of orders with a recorded refund. Date-bucketed by
 *                refunded_at (falls back to created_at).
 *   Net        = Collected - Refunded (per currency).
 *
 * All figures are grouped per currency — ILS/JOD/USD are never mixed.
 */
final class PaymentFinancialMetrics
{
    /** Order statuses that never count towards GMV / collected / pending. */
    public const EXCLUDED_ORDER_STATUSES = ['cancelled', 'failed', 'returned'];

    /** Offline/manual payment methods that form "expected but not yet collected" money. */
    public const OFFLINE_MANUAL_METHODS = [
        'cod', 'cash', 'cash_on_delivery', 'bank', 'bank_transfer', 'whatsapp', 'telegram', 'offline',
    ];

    public const COD_METHODS = ['cod', 'cash', 'cash_on_delivery'];
    public const BANK_METHODS = ['bank', 'bank_transfer'];

    /** @var array<string,string>|null cached code → symbol */
    private static ?array $symbolCache = null;

    public static function summary(int $storeId, ?Carbon $from = null, ?Carbon $to = null): array
    {
        $range = self::bounds($from, $to);

        $gmv = self::gmv($storeId, $range);
        $collected = self::collected($storeId, $range);
        $pending = self::pendingCollection($storeId, $range);
        $refunded = self::refunded($storeId, $range);

        $net = [];
        foreach ($collected['by_currency'] as $code => $amount) {
            $net[$code] = round($amount - ($refunded['by_currency'][$code] ?? 0), 2);
        }
        // currencies present only in refunded also matter for the net view
        foreach ($refunded['by_currency'] as $code => $amount) {
            if (!isset($net[$code])) $net[$code] = round(-1 * $amount, 2);
        }

        return [
            'gmv' => self::groups($gmv['by_currency']),
            'gmv_total' => $gmv['total'],
            'collected' => self::groups($collected['by_currency']),
            'collected_total' => $collected['total'],
            'pending_collection' => self::groups($pending['by_currency']),
            'pending_collection_total' => $pending['total'],
            'refunded' => self::groups($refunded['by_currency']),
            'refunded_total' => $refunded['total'],
            'net_collected' => self::groups($net),
            'net_collected_total' => round($collected['total'] - $refunded['total'], 2),
            'currencies' => self::mergeCurrencies([
                $gmv['by_currency'],
                $collected['by_currency'],
                $pending['by_currency'],
                $refunded['by_currency'],
            ]),
            'cod_pending_count' => Order::where('store_id', $storeId)
                ->where('payment_status', 'pending')
                ->whereIn('payment_method', self::COD_METHODS)
                ->whereNotIn('status', self::EXCLUDED_ORDER_STATUSES)
                ->count(),
            'bank_pending_count' => Order::where('store_id', $storeId)
                ->where('payment_status', 'pending')
                ->whereIn('payment_method', self::BANK_METHODS)
                ->whereNotIn('status', self::EXCLUDED_ORDER_STATUSES)
                ->count(),
        ];
    }

    private static function gmv(int $storeId, array $range): array
    {
        return self::sumByCurrency(
            Order::where('store_id', $storeId)
                ->whereNotIn('status', self::EXCLUDED_ORDER_STATUSES)
                ->when($range['from'], fn ($q) => $q->where('created_at', '>=', $range['from']))
                ->when($range['to'], fn ($q) => $q->where('created_at', '<=', $range['to']))
        );
    }

    private static function collected(int $storeId, array $range): array
    {
        return self::sumByCurrency(
            Order::where('store_id', $storeId)
                ->where('payment_status', 'paid')
                ->whereNotIn('status', self::EXCLUDED_ORDER_STATUSES)
                ->when($range['from'], fn ($q) => $q->where(function ($qq) use ($range) {
                    $qq->whereNotNull('paid_at')->where('paid_at', '>=', $range['from'])
                       ->orWhereNull('paid_at')->where('created_at', '>=', $range['from']);
                }))
                ->when($range['to'], fn ($q) => $q->where(function ($qq) use ($range) {
                    $qq->whereNotNull('paid_at')->where('paid_at', '<=', $range['to'])
                       ->orWhereNull('paid_at')->where('created_at', '<=', $range['to']);
                })),
        );
    }

    private static function pendingCollection(int $storeId, array $range): array
    {
        return self::sumByCurrency(
            Order::where('store_id', $storeId)
                ->where('payment_status', 'pending')
                ->whereIn('payment_method', self::OFFLINE_MANUAL_METHODS)
                ->whereNotIn('status', self::EXCLUDED_ORDER_STATUSES)
                ->when($range['from'], fn ($q) => $q->where('created_at', '>=', $range['from']))
                ->when($range['to'], fn ($q) => $q->where('created_at', '<=', $range['to']))
        );
    }

    private static function refunded(int $storeId, array $range): array
    {
        return self::sumByCurrency(
            Order::where('store_id', $storeId)
                ->where('refunded_amount', '>', 0)
                ->whereNotIn('status', ['cancelled', 'failed'])
                ->when($range['from'], fn ($q) => $q->where(function ($qq) use ($range) {
                    $qq->whereNotNull('refunded_at')->where('refunded_at', '>=', $range['from'])
                       ->orWhereNull('refunded_at')->where('created_at', '>=', $range['from']);
                }))
                ->when($range['to'], fn ($q) => $q->where(function ($qq) use ($range) {
                    $qq->whereNotNull('refunded_at')->where('refunded_at', '<=', $range['to'])
                       ->orWhereNull('refunded_at')->where('created_at', '<=', $range['to']);
                })),
            'refunded_amount'
        );
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder $query
     */
    private static function sumByCurrency($query, string $amountColumn = 'total_amount'): array
    {
        $rows = (clone $query)
            ->selectRaw('currency, SUM(' . $amountColumn . ') as total')
            ->groupBy('currency')
            ->get()
            ->mapWithKeys(function ($row) {
                $code = strtoupper((string)($row->currency ?: 'ILS'));
                return [$code => round((float) $row->total, 2)];
            })
            ->toArray();

        return ['by_currency' => $rows, 'total' => round(array_sum($rows), 2)];
    }

    private static function groups(array $byCurrency): array
    {
        $out = [];
        foreach ($byCurrency as $code => $amount) {
            $out[] = ['code' => $code, 'symbol' => self::symbolFor($code), 'amount' => round($amount, 2)];
        }
        return $out;
    }

    private static function bounds(?Carbon $from, ?Carbon $to): array
    {
        return [
            'from' => $from ? $from->copy()->startOfDay() : null,
            'to' => $to ? $to->copy()->endOfDay() : null,
        ];
    }

    private static function mergeCurrencies(array $maps): array
    {
        $seen = [];
        $out = [];
        foreach ($maps as $map) {
            foreach ($map as $code => $amount) {
                $code = strtoupper($code);
                if (isset($seen[$code])) continue;
                $seen[$code] = true;
                $out[] = $code;
            }
        }
        return $out;
    }

    public static function symbolFor(string $code): string
    {
        if (self::$symbolCache === null) {
            self::$symbolCache = Currency::pluck('symbol', 'code')->map(fn ($s) => (string)$s)->toArray();
        }
        $code = strtoupper($code);
        return self::$symbolCache[$code] ?? match ($code) {
            'ILS' => '₪',
            'JOD' => 'د.ا',
            'USD' => '$',
            'EUR' => '€',
            'AED' => 'د.إ',
            'SAR' => 'ر.س',
            'EGP' => 'ج.م',
            'NIS' => '₪',
            default => $code,
        };
    }
}