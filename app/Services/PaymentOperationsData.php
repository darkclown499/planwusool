<?php

namespace App\Services;

use App\Models\CodPayment;
use App\Models\CodSettlement;
use App\Models\Order;
use Illuminate\Http\Request;

/**
 * Shared data-builder for the payment operations / financial operations center.
 *
 * Both PaymentOperationsController and PaymentsHubController delegate here so the
 * hub and the legacy route render byte-identical data (no divergence, no duplication).
 * The authoritative financial figures come from PaymentFinancialMetrics; COD rules
 * (terminal statuses, idempotent settle) come from CodPaymentService / CodSettlementService.
 */
class PaymentOperationsData
{
    public function ledger(int $storeId, array $filters)
    {
        return $this->buildQuery($storeId, $filters)
            ->orderBy('created_at', 'desc')
            ->with('codPayment')
            ->paginate(25)
            ->through(fn ($order) => $this->row($order));
    }

    public function exportRows(int $storeId, array $filters)
    {
        return $this->buildQuery($storeId, $filters)
            ->with('codPayment')
            ->orderBy('created_at', 'desc')
            ->limit(5000)
            ->get();
    }

    public function codPending(int $storeId)
    {
        return CodPayment::where('store_id', $storeId)
            ->where('status', 'pending')
            ->whereHas('order', fn ($q) => $q->whereNotIn('status', CodPaymentService::TERMINAL_ORDER_STATUSES))
            ->with(['order'])
            ->orderBy('created_at', 'desc')
            ->limit(200)
            ->get()
            ->map(fn ($cp) => [
                'id' => $cp->id,
                'order_id' => $cp->order_id,
                'order_number' => $cp->order?->order_number ?? '#' . $cp->order_id,
                'customer_name' => $cp->customer_name,
                'amount_remaining' => (float) $cp->amount_remaining,
                'currency' => strtoupper((string)($cp->order?->currency ?: 'ILS')),
            ]);
    }

    public function settlements(int $storeId, array $metrics)
    {
        return CodSettlement::where('store_id', $storeId)
            ->withCount('items')
            ->with('confirmor')
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get()
            ->map(function ($s) use ($metrics) {
                return [
                    'id' => $s->id,
                    'reference' => $s->reference,
                    'status' => $s->status,
                    'period_start' => $s->period_start?->toDateString(),
                    'period_end' => $s->period_end?->toDateString(),
                    'courier_company' => $s->courier_company,
                    'gross_amount' => (float) $s->gross_amount,
                    'courier_fees' => (float) $s->courier_fees,
                    'adjustment' => (float) $s->adjustment,
                    'net_amount' => (float) $s->net_amount,
                    'items_count' => (int) $s->items_count,
                    'confirmed_by' => $s->confirmor?->name,
                    'settled_at' => $s->settled_at?->format('Y-m-d H:i'),
                    'created_at' => $s->created_at->format('Y-m-d H:i'),
                    'currency' => self::primaryCurrency($metrics),
                ];
            });
    }

    public function filters(Request $request): array
    {
        return [
            'search' => trim((string) $request->input('search', '')),
            'collection_state' => $request->input('collection_state', 'all'),
            'payment_method' => $request->input('payment_method', 'all'),
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
        ];
    }

    public function row(Order $order): array
    {
        $pm = strtolower((string) ($order->payment_method ?? ''));
        $ps = strtolower((string) ($order->payment_status ?? ''));
        $status = strtolower((string) $order->status);
        $terminal = in_array($status, CodPaymentService::TERMINAL_ORDER_STATUSES, true);
        $cod = $order->codPayment;

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'customer_name' => trim(($order->customer_first_name ?? '') . ' ' . ($order->customer_last_name ?? '')),
            'customer_phone' => $order->customer_phone,
            'customer_email' => $order->customer_email,
            'total_amount' => (float) $order->total_amount,
            'currency' => strtoupper((string) ($order->currency ?: 'ILS')),
            'payment_method' => $pm,
            'payment_status' => $ps,
            'order_status' => $status,
            'created_at' => $order->created_at->format('Y-m-d H:i'),
            'paid_at' => $order->paid_at?->format('Y-m-d H:i'),
            'cod' => $cod ? [
                'id' => $cod->id,
                'status' => $cod->status,
                'amount_collected' => (float) $cod->amount_collected,
                'amount_remaining' => (float) $cod->amount_remaining,
            ] : null,
            'receipt_url' => (in_array($pm, PaymentFinancialMetrics::BANK_METHODS, true) && $order->bank_transfer_receipt)
                ? route('orders.receipt', $order->id, false)
                : null,
            'can_collect_cod' => !$terminal && in_array($pm, PaymentFinancialMetrics::COD_METHODS, true) && $ps === 'pending',
            'can_confirm_bank' => !$terminal && in_array($pm, PaymentFinancialMetrics::BANK_METHODS, true) && $ps === 'pending',
            'can_reject_bank' => in_array($pm, PaymentFinancialMetrics::BANK_METHODS, true) && $ps === 'pending',
        ];
    }

    public function exportHeader(array $metrics): array
    {
        return [
            'Payment Operations Export — ' . now()->format('Y-m-d H:i'),
            'GMV' => $metrics['gmv_total'],
            'Collected' => $metrics['collected_total'],
            'Pending Collection' => $metrics['pending_collection_total'],
            'Refunded' => $metrics['refunded_total'],
            'Net Collected' => $metrics['net_collected_total'],
            'columns' => [
                'Order', 'Customer', 'Phone', 'Total', 'Currency', 'Payment Method',
                'Payment Status', 'Order Status', 'Created At', 'Paid At',
                'COD Status', 'COD Remaining',
            ],
        ];
    }

    private function buildQuery(int $storeId, array $filters)
    {
        $query = Order::where('store_id', $storeId);

        if (!empty($filters['search'])) {
            $s = $filters['search'];
            $query->where(function ($q) use ($s) {
                $q->where('order_number', 'like', "%{$s}%")
                    ->orWhere('customer_first_name', 'like', "%{$s}%")
                    ->orWhere('customer_last_name', 'like', "%{$s}%")
                    ->orWhere('customer_phone', 'like', "%{$s}%")
                    ->orWhere('customer_email', 'like', "%{$s}%");
            });
        }

        if (!empty($filters['collection_state']) && $filters['collection_state'] !== 'all') {
            $excluded = PaymentFinancialMetrics::EXCLUDED_ORDER_STATUSES;
            switch ($filters['collection_state']) {
                case 'pending_collection':
                    $query->where('payment_status', 'pending')
                        ->whereIn('payment_method', PaymentFinancialMetrics::OFFLINE_MANUAL_METHODS)
                        ->whereNotIn('status', $excluded);
                    break;
                case 'collected':
                    $query->where('payment_status', 'paid')->whereNotIn('status', $excluded);
                    break;
                case 'refunded':
                    $query->where('refunded_amount', '>', 0)->whereNotIn('status', ['cancelled', 'failed']);
                    break;
            }
        }

        if (!empty($filters['payment_method']) && $filters['payment_method'] !== 'all') {
            switch ($filters['payment_method']) {
                case 'cod':
                    $query->whereIn('payment_method', PaymentFinancialMetrics::COD_METHODS);
                    break;
                case 'bank':
                    $query->whereIn('payment_method', PaymentFinancialMetrics::BANK_METHODS);
                    break;
                case 'online':
                    $query->whereNotIn('payment_method', PaymentFinancialMetrics::OFFLINE_MANUAL_METHODS);
                    break;
            }
        }

        if (!empty($filters['date_from'])) {
            $query->where('created_at', '>=', \Carbon\Carbon::parse($filters['date_from'])->startOfDay());
        }
        if (!empty($filters['date_to'])) {
            $query->where('created_at', '<=', \Carbon\Carbon::parse($filters['date_to'])->endOfDay());
        }

        return $query;
    }

    public static function primaryCurrency(array $metrics): string
    {
        return $metrics['currencies'][0] ?? 'ILS';
    }
}
