<?php

namespace App\Http\Controllers;

use App\Models\CodPayment;
use App\Models\Order;
use App\Services\CodPaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CodPaymentController extends Controller
{
    protected $codPaymentService;

    public function __construct(CodPaymentService $codPaymentService)
    {
        $this->codPaymentService = $codPaymentService;
    }

    /**
     * Display a listing of COD payments.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $query = CodPayment::where('store_id', $currentStoreId)
            ->with(['order', 'history']);

        // Apply filters
        if ($request->has('status') && $request->status !== 'all') {
            $query->where('status', $request->status);
        }
        if ($request->has('search') && $request->search) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('customer_name', 'like', "%{$search}%")
                    ->orWhere('customer_phone', 'like', "%{$search}%")
                    ->orWhere('customer_email', 'like', "%{$search}%")
                    ->orWhereHas('order', function ($oq) use ($search) {
                        $oq->where('order_number', 'like', "%{$search}%");
                    });
            });
        }
        if ($request->has('date_from') && $request->date_from) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }
        if ($request->has('date_to') && $request->date_to) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage = $request->get('per_page', 15);
        $payments = $query->latest()->paginate($perPage);

        $stats = $currentStoreId ? $this->codPaymentService->getStats($currentStoreId) : [];

        return Inertia::render('cod-payments/index', [
            'payments' => $payments,
            'filters' => $request->only(['search', 'status', 'date_from', 'date_to', 'per_page']),
            'stats' => $stats,
        ]);
    }

    /**
     * Show details of a single COD payment.
     */
    public function show(CodPayment $codPayment)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($codPayment->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $codPayment->load(['order.items.product', 'history.collectedByUser']);

        return Inertia::render('cod-payments/show', [
            'payment' => $this->formatPayment($codPayment),
        ]);
    }

    /**
     * Record a collection against a COD payment.
     */
    public function recordCollection(Request $request, CodPayment $codPayment)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($codPayment->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'amount' => 'required|numeric|min:0.01',
            'payment_method' => 'required|in:cash,card_terminal,bank_transfer,other',
            'collected_by_name' => 'nullable|string|max:255',
            'reference' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        try {
            $codPayment = $this->codPaymentService->recordCollection(
                $codPayment,
                (float) $validated['amount'],
                [
                    'payment_method' => $validated['payment_method'],
                    'collected_by_name' => $validated['collected_by_name'] ?? null,
                    'collected_by_user_id' => Auth::id(),
                    'reference' => $validated['reference'] ?? null,
                    'notes' => $validated['notes'] ?? null,
                ]
            );

            return redirect()->back()->with('success', __('Payment collected successfully!'));
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Update delivery info for a COD payment.
     */
    public function updateDeliveryInfo(Request $request, CodPayment $codPayment)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($codPayment->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'delivery_company' => 'nullable|string|max:255',
            'delivery_tracking_number' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        $this->codPaymentService->updateDeliveryInfo($codPayment, $validated);

        return redirect()->back()->with('success', __('Delivery info updated successfully!'));
    }

    /**
     * Change status (failed / cancelled / returned).
     */
    public function changeStatus(Request $request, CodPayment $codPayment)
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        if ($codPayment->store_id !== $currentStoreId) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validate([
            'status' => 'required|in:failed,cancelled,returned',
            'notes' => 'nullable|string',
        ]);

        $notes = $validated['notes'] ?? null;

        switch ($validated['status']) {
            case 'failed':
                $this->codPaymentService->markFailed($codPayment, $notes);
                break;
            case 'cancelled':
                $this->codPaymentService->markCancelled($codPayment, $notes);
                break;
            case 'returned':
                $this->codPaymentService->markReturned($codPayment, $notes);
                break;
        }

        return redirect()->back()->with('success', __('Status updated successfully!'));
    }

    /**
     * Export COD payments as CSV.
     */
    public function export()
    {
        $user = Auth::user();
        $currentStoreId = $user->current_store;

        $payments = CodPayment::where('store_id', $currentStoreId)
            ->with('order')
            ->orderBy('created_at', 'desc')
            ->get();

        $csvData = [];
        $csvData[] = ['Order Number', 'Customer Name', 'Phone', 'Email', 'Total', 'COD Fee', 'Collected', 'Remaining', 'Status', 'Delivery Company', 'Created At', 'Collected At'];

        foreach ($payments as $payment) {
            $csvData[] = [
                $payment->order?->order_number ?? 'N/A',
                $payment->customer_name ?? 'N/A',
                $payment->customer_phone ?? 'N/A',
                $payment->customer_email ?? 'N/A',
                number_format($payment->total_amount, 2),
                number_format($payment->cod_fee, 2),
                number_format($payment->amount_collected, 2),
                number_format($payment->amount_remaining, 2),
                ucfirst($payment->status),
                $payment->delivery_company ?? 'N/A',
                $payment->created_at ? $payment->created_at->format('Y-m-d H:i:s') : 'N/A',
                $payment->collected_at ? $payment->collected_at->format('Y-m-d H:i:s') : 'N/A',
            ];
        }

        $filename = 'cod-payments-export-' . now()->format('Y-m-d') . '.csv';

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

    /**
     * Format a COD payment for the frontend.
     */
    private function formatPayment(CodPayment $payment): array
    {
        return [
            'id' => $payment->id,
            'order_number' => $payment->order?->order_number,
            'order_status' => $payment->order?->status,
            'customer_name' => $payment->customer_name,
            'customer_phone' => $payment->customer_phone,
            'customer_email' => $payment->customer_email,
            'total_amount' => (float) $payment->total_amount,
            'cod_fee' => (float) $payment->cod_fee,
            'amount_collected' => (float) $payment->amount_collected,
            'amount_remaining' => (float) $payment->amount_remaining,
            'status' => $payment->status,
            'delivery_company' => $payment->delivery_company,
            'delivery_tracking_number' => $payment->delivery_tracking_number,
            'notes' => $payment->notes,
            'created_at' => $payment->created_at?->toIso8601String(),
            'collected_at' => $payment->collected_at?->toIso8601String(),
            'history' => $payment->history->map(function ($entry) {
                return [
                    'id' => $entry->id,
                    'amount' => (float) $entry->amount,
                    'payment_method' => $entry->payment_method,
                    'collected_by_name' => $entry->collected_by_name,
                    'collected_by_user' => $entry->collectedByUser?->name,
                    'reference' => $entry->reference,
                    'notes' => $entry->notes,
                    'collected_at' => $entry->collected_at?->toIso8601String(),
                ];
            }),
            'items' => $payment->order?->items->map(function ($item) {
                return [
                    'name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'price' => (float) $item->unit_price,
                    'total' => (float) $item->total_price,
                ];
            }),
        ];
    }
}

