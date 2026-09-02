<?php

namespace App\Http\Controllers;

use App\Models\CodPayment;
use App\Models\CodSettlement;
use App\Models\Order;
use App\Services\CodSettlementService;
use App\Services\PaymentFinancialMetrics;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

/**
 * Payment Operations — the merchant's financial operations center for payments:
 *
 *  - Financial metrics cards (GMV / Collected / Pending / Refunded / Net, per-currency)
 *  - Tenant-scoped transaction ledger with filters + search + CSV export
 *  - COD collection actions (same canonical service the order page uses)
 *  - Bank transfer review (confirm / reject) with tenant-safe receipt viewing
 *  - COD settlement batches (draft → settle, atomic + idempotent)
 */
class PaymentOperationsController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $filters = $this->filters($request);

        $rows = $this->buildQuery($storeId, $filters)
            ->orderBy('created_at', 'desc')
            ->with('codPayment')
            ->paginate(25)
            ->through(fn ($order) => $this->row($order));

        $metrics = PaymentFinancialMetrics::summary($storeId);

        $codPending = CodPayment::where('store_id', $storeId)
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

        $settlements = CodSettlement::where('store_id', $storeId)
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

        return Inertia::render('payments/operations', [
            'metrics' => $metrics,
            'rows' => $rows,
            'filters' => $filters,
            'codPending' => $codPending,
            'settlements' => $settlements,
            'currencies' => $metrics['currencies'],
        ]);
    }

    public function export(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $filters = $this->filters($request);

        $orders = $this->buildQuery($storeId, $filters)
            ->with('codPayment')
            ->orderBy('created_at', 'desc')
            ->limit(5000)
            ->get();

        $metrics = PaymentFinancialMetrics::summary($storeId);

        $filename = 'payment-operations-' . now()->format('Y-m-d') . '.csv';

        $callback = function () use ($orders, $metrics, $filters) {
            $handle = fopen('php://output', 'w');
            fputs($handle, "\xEF\xBB\xBF"); // UTF-8 BOM for Excel
            fputcsv($handle, ['Payment Operations Export — ' . now()->format('Y-m-d H:i')]);
            fputcsv($handle, ['GMV', $metrics['gmv_total']]);
            fputcsv($handle, ['Collected', $metrics['collected_total']]);
            fputcsv($handle, ['Pending Collection', $metrics['pending_collection_total']]);
            fputcsv($handle, ['Refunded', $metrics['refunded_total']]);
            fputcsv($handle, ['Net Collected', $metrics['net_collected_total']]);
            fputcsv($handle, []);
            fputcsv($handle, [
                'Order', 'Customer', 'Phone', 'Total', 'Currency', 'Payment Method',
                'Payment Status', 'Order Status', 'Created At', 'Paid At',
                'COD Status', 'COD Remaining',
            ]);
            foreach ($orders as $order) {
                $cod = $order->codPayment;
                fputcsv($handle, [
                    $order->order_number,
                    trim(($order->customer_first_name ?? '') . ' ' . ($order->customer_last_name ?? '')),
                    $order->customer_phone,
                    (float) $order->total_amount,
                    strtoupper((string)($order->currency ?: 'ILS')),
                    $order->payment_method,
                    $order->payment_status,
                    $order->status,
                    $order->created_at->format('Y-m-d H:i'),
                    $order->paid_at?->format('Y-m-d H:i'),
                    $cod?->status,
                    $cod ? (float) $cod->amount_remaining : null,
                ]);
            }
            fclose($handle);
        };

        return response()->streamDownload($callback, $filename, ['Content-Type' => 'text/csv']);
    }

    public function storeSettlement(Request $request)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);

        $request->validate([
            'cod_payment_ids' => 'required|array|min:1',
            'cod_payment_ids.*' => 'integer',
            'courier_company' => 'nullable|string|max:255',
            'period_start' => 'nullable|date',
            'period_end' => 'nullable|date|after_or_equal:period_start',
            'courier_fees' => 'nullable|numeric|min:0',
            'adjustment' => 'nullable|numeric',
            'notes' => 'nullable|string|max:2000',
        ]);

        try {
            $settlement = app(CodSettlementService::class)->createDraft(
                (int) $storeId,
                $request->input('cod_payment_ids'),
                [
                    'courier_company' => $request->input('courier_company'),
                    'period_start' => $request->input('period_start'),
                    'period_end' => $request->input('period_end'),
                    'courier_fees' => (float) $request->input('courier_fees', 0),
                    'adjustment' => (float) $request->input('adjustment', 0),
                    'notes' => $request->input('notes'),
                ]
            );
            return response()->json([
                'message' => 'تم إنشاء دفعة التحصيل بنجاح',
                'settlement' => ['id' => $settlement->id, 'reference' => $settlement->reference],
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function settleSettlement(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $settlement = CodSettlement::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        try {
            app(CodSettlementService::class)->settle($settlement);
            return response()->json(['message' => 'تم تأكيد تسوية الدفعة وتحديث حالة الطلبات']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    public function destroySettlement(Request $request, $id)
    {
        $user = Auth::user();
        $storeId = getCurrentStoreId($user);
        $settlement = CodSettlement::where('store_id', $storeId)->where('id', $id)->firstOrFail();

        try {
            app(CodSettlementService::class)->deleteDraft($settlement);
            return response()->json(['message' => 'تم حذف مسودة الدفعة']);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
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

    private function filters(Request $request): array
    {
        return [
            'search' => trim((string) $request->input('search', '')),
            'collection_state' => $request->input('collection_state', 'all'),
            'payment_method' => $request->input('payment_method', 'all'),
            'date_from' => $request->input('date_from', ''),
            'date_to' => $request->input('date_to', ''),
        ];
    }

    private function row(Order $order): array
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

    private static function primaryCurrency(array $metrics): string
    {
        return $metrics['currencies'][0] ?? 'ILS';
    }
}