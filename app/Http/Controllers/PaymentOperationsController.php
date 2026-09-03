<?php

namespace App\Http\Controllers;

use App\Models\CodSettlement;
use App\Models\Order;
use App\Services\CodSettlementService;
use App\Services\PaymentFinancialMetrics;
use App\Services\PaymentOperationsData;
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

        $data = app(PaymentOperationsData::class);

        $rows = $data->ledger($storeId, $filters);

        $metrics = PaymentFinancialMetrics::summary($storeId);

        $codPending = $data->codPending($storeId);

        $settlements = $data->settlements($storeId, $metrics);

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

        $data = app(PaymentOperationsData::class);
        $orders = $data->exportRows($storeId, $filters);

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

    private function filters(Request $request): array
    {
        return app(PaymentOperationsData::class)->filters($request);
    }

    /**
     * Kept as an instance method so the PaymentOperationsPhase2Test regression can
     * exercise it via reflection — delegates to the shared builder to avoid drift.
     */
    private function row(Order $order): array
    {
        return app(PaymentOperationsData::class)->row($order);
    }

    private static function primaryCurrency(array $metrics): string
    {
        return PaymentOperationsData::primaryCurrency($metrics);
    }
}