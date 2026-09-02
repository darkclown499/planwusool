<?php

namespace App\Services;

use App\Models\CodPayment;
use App\Models\CodPaymentHistory;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CodPaymentService
{
    /** Order terminal states that can never be COD-collected. */
    public const TERMINAL_ORDER_STATUSES = ['cancelled', 'failed', 'refunded', 'returned'];

    /**
     * Create a new COD payment record for an order.
     *
     * @param Order $order The order that was placed with payment_method = 'cod'
     * @param array $options Optional overrides (cod_fee, delivery_company, notes...)
     */
    public function createForOrder(Order $order, array $options = []): CodPayment
    {
        $totalAmount = (float) $order->total_amount;
        $codFee = (float) ($options['cod_fee'] ?? 0);

        return CodPayment::create([
            'order_id' => $order->id,
            'store_id' => $order->store_id,
            'customer_id' => $order->customer_id,
            'customer_name' => trim(($order->customer_first_name ?? '') . ' ' . ($order->customer_last_name ?? '')),
            'customer_phone' => $order->customer_phone,
            'customer_email' => $order->customer_email,
            'total_amount' => $totalAmount,
            'cod_fee' => $codFee,
            'amount_collected' => 0,
            'amount_remaining' => round($totalAmount + $codFee, 2),
            'status' => 'pending',
            'delivery_company' => $options['delivery_company'] ?? null,
            'delivery_tracking_number' => $options['delivery_tracking_number'] ?? null,
            'notes' => $options['notes'] ?? null,
        ]);
    }

    /**
     * Record a collection (partial or full) against a COD payment.
     *
     * @param CodPayment $codPayment
     * @param float $amount The amount being collected now
     * @param array $options payment_method, collected_by_name, collected_by_user_id, reference, notes, collected_at
     * @return CodPayment
     */
    public function recordCollection(CodPayment $codPayment, float $amount, array $options = []): CodPayment
    {
        return DB::transaction(function () use ($codPayment, $amount, $options) {
            if ($codPayment->status === 'paid') {
                throw new \Exception(__('This COD payment is already fully collected.'));
            }

            $amount = round($amount, 2);
            $remaining = (float) $codPayment->amount_remaining;

            if ($amount <= 0) {
                throw new \Exception(__('Collection amount must be greater than zero.'));
            }
            if ($amount > $remaining) {
                throw new \Exception(__('Collection amount exceeds the remaining balance.'));
            }

            $newCollected = round((float) $codPayment->amount_collected + $amount, 2);
            $newRemaining = round($remaining - $amount, 2);

            // Determine new status
            $status = $newRemaining <= 0 ? 'paid' : 'partial';

            $codPayment->update([
                'amount_collected' => $newCollected,
                'amount_remaining' => $newRemaining,
                'status' => $status,
                'collected_at' => $status === 'paid' ? now() : $codPayment->collected_at,
            ]);

            // Create history entry
            CodPaymentHistory::create([
                'cod_payment_id' => $codPayment->id,
                'amount' => $amount,
                'payment_method' => $options['payment_method'] ?? 'cash',
                'collected_by_name' => $options['collected_by_name'] ?? null,
                'collected_by_user_id' => $options['collected_by_user_id'] ?? auth()->id() ?? null,
                'reference' => $options['reference'] ?? null,
                'notes' => $options['notes'] ?? null,
                'collected_at' => $options['collected_at'] ?? now(),
            ]);

            // Converge on order-level financial truth: a fully collected COD payment
            // means the order itself is paid (financial confirmation), unless the order
            // is in a terminal state. Partial collections keep the order pending.
            $this->syncOrderPayment($codPayment, $status, $newCollected, $newRemaining);

            return $codPayment->fresh(['history']);
        });
    }

    /**
     * Mark a COD payment as failed.
     */
    public function markFailed(CodPayment $codPayment, string $notes = null): CodPayment
    {
        $codPayment->update([
            'status' => 'failed',
            'notes' => $notes ?? $codPayment->notes,
        ]);

        return $codPayment->fresh();
    }

    /**
     * Mark a COD payment as cancelled.
     */
    public function markCancelled(CodPayment $codPayment, string $notes = null): CodPayment
    {
        $codPayment->update([
            'status' => 'cancelled',
            'notes' => $notes ?? $codPayment->notes,
        ]);

        return $codPayment->fresh();
    }

    /**
     * Mark a COD payment as returned (goods returned, no collection).
     */
    public function markReturned(CodPayment $codPayment, string $notes = null): CodPayment
    {
        $codPayment->update([
            'status' => 'returned',
            'notes' => $notes ?? $codPayment->notes,
        ]);

        return $codPayment->fresh();
    }

    /**
     * Update the delivery company / tracking number.
     */
    public function updateDeliveryInfo(CodPayment $codPayment, array $data): CodPayment
    {
        $codPayment->update([
            'delivery_company' => $data['delivery_company'] ?? $codPayment->delivery_company,
            'delivery_tracking_number' => $data['delivery_tracking_number'] ?? $codPayment->delivery_tracking_number,
            'notes' => $data['notes'] ?? $codPayment->notes,
        ]);

        return $codPayment->fresh();
    }

    /**
     * Sync the parent order's payment state to match the COD module.
     *
     * Order status and payment status remain independent (delivered ≠ paid); only a
     * full financial confirmation (COD fully collected) flips the order to paid.
     */
    private function syncOrderPayment(CodPayment $codPayment, string $codStatus, float $collected, float $remaining): void
    {
        try {
            $order = $codPayment->order()->lockForUpdate()->first();
        } catch (\Throwable $e) {
            Log::warning('COD order lock failed', ['cod_payment_id' => $codPayment->id, 'error' => $e->getMessage()]);
            $order = $codPayment->order()->first();
        }
        if (!$order) return;

        $orderTerminal = in_array(strtolower((string)$order->status), ['cancelled','failed','refunded'], true);
        $orderPs = strtolower((string)$order->payment_status);

        if ($codStatus === 'paid') {
            // Deliver/refund states still allow the order to be (or become) paid —
            // but a terminal order cannot be switched to paid.
            if ($orderTerminal || $orderPs === 'paid') return;
            $order->update([
                'payment_status' => 'paid',
                'paid_at' => $order->paid_at ?? now(),
                'payment_confirmed_by' => $order->payment_confirmed_by ?? auth()->id() ?? null,
            ]);
            try {
                \App\Services\MerchantNotificationService::paymentCollected($order, 'cod_collected');
            } catch (\Throwable $e) {
                Log::warning('COD collected notification failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }
            try {
                \App\Jobs\SendStoreCustomerEmail::dispatch($order->store_id, 'payment_received', $order->customer_email, $order->id, null, $order->customer_id)->afterCommit();
            } catch (\Throwable $e) {
                Log::warning('Payment received email dispatch failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }
            return;
        }

        if (in_array($codStatus, ['failed','cancelled','returned'], true)) {
            // Soft downgrade only — never un-pay an order that is already paid.
            if ($orderPs !== 'paid') {
                $order->update(['payment_status' => 'failed']);
            }
        }
        // partial: leave the order pending — partial collection is not full payment.
    }

    /**
     * Get COD analytics for a store.
     */
    public function getStats(int $storeId): array
    {
        $base = CodPayment::where('store_id', $storeId);

        $total = (clone $base)->count();
        $pending = (clone $base)->where('status', 'pending')->count();
        $partial = (clone $base)->where('status', 'partial')->count();
        $paid = (clone $base)->where('status', 'paid')->count();
        $failed = (clone $base)->where('status', 'failed')->count();
        $returned = (clone $base)->where('status', 'returned')->count();

        $totalAmount = (clone $base)->sum('total_amount');
        $totalCollected = (clone $base)->sum('amount_collected');
        $totalRemaining = (clone $base)->sum('amount_remaining');
        $totalCodFees = (clone $base)->sum('cod_fee');

        // Collection rate: collected / (total + fees)
        $collectable = $totalAmount + $totalCodFees;
        $collectionRate = $collectable > 0 ? round(($totalCollected / $collectable) * 100, 1) : 0;

        return [
            'total' => $total,
            'pending' => $pending,
            'partial' => $partial,
            'paid' => $paid,
            'failed' => $failed,
            'returned' => $returned,
            'total_amount' => $totalAmount,
            'total_collected' => $totalCollected,
            'total_remaining' => $totalRemaining,
            'total_cod_fees' => $totalCodFees,
            'collection_rate' => $collectionRate,
        ];
    }

    /**
     * Get recent history entries for a store.
     */
    public function recentHistory(int $storeId, int $limit = 20)
    {
        return CodPaymentHistory::whereHas('codPayment', function ($q) use ($storeId) {
            $q->where('store_id', $storeId);
        })
            ->with(['codPayment.order'])
            ->latest()
            ->limit($limit)
            ->get();
    }
}

