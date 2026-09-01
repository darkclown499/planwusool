<?php

namespace App\Services;

use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Canonical Order State Machine — single source of truth for all fulfillment transitions.
 *
 * Normal lifecycle: pending → confirmed → processing → shipped → delivered
 * Terminal/exception: cancelled, failed, refunded (+ partially_refunded via payment)
 *
 * Payment authority: COD collect is explicit; online gateways cannot be manually marked paid.
 */
class OrderTransitionService
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_CONFIRMED = 'confirmed';
    public const STATUS_PROCESSING = 'processing';
    public const STATUS_SHIPPED = 'shipped';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_FAILED = 'failed';
    public const STATUS_REFUNDED = 'refunded';

    /** Fulfillment transitions — canonical map */
    public const ALLOWED = [
        'pending'    => ['confirmed','processing','cancelled'],
        'confirmed'  => ['processing','cancelled'],
        'processing' => ['shipped','delivered','cancelled'],
        'shipped'    => ['delivered','cancelled','failed','returned'],
        'delivered'  => ['returned','refunded'],
        'cancelled'  => [],
        'refunded'   => [],
        'failed'     => [],
        'returned'   => [],
    ];

    /** Offline payment methods that MAY be confirmed manually */
    public const OFFLINE_PAYMENT_METHODS = [
        'cod','cash','cash_on_delivery','bank','bank_transfer','whatsapp','offline',
    ];

    /** Arabic messages for invalid transitions */
    public const AR_STATUS_LABELS = [
        'pending'    => 'قيد الانتظار',
        'confirmed'  => 'مؤكد',
        'processing' => 'قيد التجهيز',
        'shipped'    => 'تم الشحن',
        'delivered'  => 'تم التسليم',
        'cancelled'  => 'ملغي',
        'failed'     => 'فشل',
        'refunded'   => 'مسترجع',
        'returned'   => 'مرتجع',
    ];

    public static function label(string $status): string
    {
        return self::AR_STATUS_LABELS[strtolower($status)] ?? $status;
    }

    public static function isValidTransition(string $from, string $to): bool
    {
        $from = strtolower(trim($from));
        $to = strtolower(trim($to));
        if ($from === $to) return true;
        return in_array($to, self::ALLOWED[$from] ?? [], true);
    }

    public static function errorMessage(string $from, string $to): string
    {
        return 'لا يمكن نقل الطلب من "' . self::label($from) . '" إلى "' . self::label($to) . '"';
    }

    /** One primary next action per status — matches order-status.ts */
    public static function primaryActionFor(string $status): ?array
    {
        $map = [
            'pending'    => ['label'=>'تأكيد الطلب','next'=>'confirmed','action'=>'confirm'],
            'confirmed'  => ['label'=>'بدء التجهيز','next'=>'processing','action'=>'start_processing'],
            'processing' => ['label'=>'جاهز للتوصيل','next'=>'shipped','action'=>'mark_shipped'],
            'shipped'    => ['label'=>'تم التسليم','next'=>'delivered','action'=>'mark_delivered'],
        ];
        return $map[strtolower($status)] ?? null;
    }

    /** All allowed fulfillment actions for an order (including exceptional) */
    public static function allowedActions(Order $order): array
    {
        $status = strtolower((string)$order->status);
        $allowed = self::ALLOWED[$status] ?? [];
        $actions = [];
        $primary = self::primaryActionFor($status);
        if ($primary && in_array($primary['next'], $allowed, true)) {
            $actions[] = $primary;
        } elseif ($primary && $status==='processing' && in_array('shipped',$allowed,true)) {
            $actions[] = $primary;
        }
        // Exceptional actions
        if (in_array('cancelled', $allowed, true)) {
            $actions[] = ['label'=>'إلغاء الطلب','next'=>'cancelled','action'=>'cancel','destructive'=>true];
        }
        if (in_array('failed', $allowed, true)) {
            $actions[] = ['label'=>'تسجيل فشل التوصيل','next'=>'failed','action'=>'mark_failed','destructive'=>true];
        }
        // COD collect is separate payment action — see allowedPaymentActions
        return $actions;
    }

    /** Semantic payment actions */
    public static function allowedPaymentActions(Order $order): array
    {
        $pm = strtolower((string)($order->payment_method ?? ''));
        $ps = strtolower((string)($order->payment_status ?? ''));
        $status = strtolower((string)$order->status);
        $terminal = in_array($status, ['cancelled','failed','refunded'], true);
        $out = [];
        if (!$terminal && $pm==='cod' && $ps==='pending') {
            $out[] = ['label'=>'تأكيد استلام المبلغ','action'=>'collect_cod','next_payment'=>'paid'];
        }
        // For offline bank/wallet pending, allow manual confirm after verification (not generic dropdown)
        if (!$terminal && in_array($pm, ['bank','bank_transfer'], true) && $ps==='pending') {
            $out[] = ['label'=>'تأكيد استلام التحويل','action'=>'confirm_bank','next_payment'=>'paid'];
        }
        return $out;
    }

    public static function canManuallyMarkPaid(Order $order): bool
    {
        $pm = strtolower((string)($order->payment_method ?? ''));
        // COD, bank, offline wallets may be manually confirmed by merchant
        if (in_array($pm, self::OFFLINE_PAYMENT_METHODS, true)) return true;
        // Also allow cash variants
        if (in_array($pm, ['cod','cash','cash_on_delivery'], true)) return true;
        return false;
    }

    /**
     * Execute a fulfillment transition atomically with proper events and timestamps.
     *
     * @throws \Exception with Arabic domain message
     */
    public static function transition(Order $order, string $to, ?string $actorNote = null): Order
    {
        $from = strtolower((string)$order->status);
        $to = strtolower(trim($to));
        if ($from === $to) return $order;
        if (!self::isValidTransition($from, $to)) {
            throw new \Exception(self::errorMessage($from, $to));
        }
        // Business rule: delivered orders cannot be edited (except returns)
        if ($from === 'delivered' && !in_array($to, ['returned','refunded'], true)) {
            throw new \Exception('لا يمكن تعديل طلب تم تسليمه إلا عبر الإرجاع');
        }
        if (in_array($from, ['cancelled','refunded','failed'], true)) {
            throw new \Exception('الطلب في حالة نهائية ولا يمكن تغييره');
        }

        return DB::transaction(function () use ($order, $from, $to) {
            $locked = Order::where('id', $order->id)->lockForUpdate()->first();
            if (!$locked) throw new \Exception('الطلب غير موجود');
            $current = strtolower((string)$locked->status);
            // Idempotency: if another request already advanced, report stale
            if ($current !== $from) {
                throw new \Exception('تعذر تحديث الطلب بسبب تغير حالته. حدّث الصفحة وحاول مرة أخرى.');
            }
            $updates = ['status'=>$to];
            if ($to==='shipped' && !$locked->shipped_at) $updates['shipped_at']=now();
            if ($to==='delivered' && !$locked->delivered_at) $updates['delivered_at']=now();
            $locked->update($updates);
            $fresh = $locked->fresh();
            // Dispatch OrderStatusChanged event if not same
            try { event(new \App\Events\OrderStatusChanged($fresh, $from, $to)); } catch (\Throwable $e) { Log::warning('OrderStatusChanged event failed', ['order_id'=>$fresh->id,'error'=>$e->getMessage()]); }
            return $fresh;
        });
    }

    /**
     * Mark COD as collected — semantic payment action.
     *
     * Canonical single path for "the money for this COD order arrived":
     * - flips orders.payment_status → paid (idempotent)
     * - stamps orders.paid_at / payment_confirmed_by
     * - syncs the advanced COD module record when one exists (both COD paths
     *   now converge on the same financial truth)
     * - dispatches the merchant cod_collected notification (idempotent)
     * - dispatches the customer payment_received email exactly once
     */
    public static function collectCod(Order $order): Order
    {
        $pm = strtolower((string)($order->payment_method ?? ''));
        $ps = strtolower((string)($order->payment_status ?? ''));
        if (!in_array($pm, ['cod','cash','cash_on_delivery'], true)) {
            throw new \Exception('هذا الإجراء مخصص للدفع عند الاستلام فقط');
        }
        if (in_array($ps, ['refunded','partially_refunded'], true)) throw new \Exception('لا يمكن تحصيل طلب مسترجع');
        $status = strtolower((string)$order->status);
        if (in_array($status, ['cancelled','failed'], true)) throw new \Exception('لا يمكن تحصيل طلب ملغي أو فاشل');

        return DB::transaction(function () use ($order) {
            $locked = Order::where('id',$order->id)->lockForUpdate()->first();
            $psLocked = strtolower((string)$locked->payment_status);
            // Idempotent: marking an already-paid COTI order is a no-op (report current state)
            if ($psLocked === 'paid') return $locked->fresh();
            if (in_array($psLocked, ['refunded','partially_refunded'], true)) throw new \Exception('لا يمكن تحصيل طلب مسترجع');
            if (in_array(strtolower((string)$locked->status), ['cancelled','failed'], true)) throw new \Exception('لا يمكن تحصيل طلب ملغي أو فاشل');

            $now = now();
            $locked->update([
                'payment_status' => 'paid',
                'paid_at' => $locked->paid_at ?? $now,
                'payment_confirmed_by' => $locked->payment_confirmed_by ?? auth()->id() ?? null,
            ]);
            $fresh = $locked->fresh();

            self::auditAfterPaid($fresh, 'cod');

            return $fresh;
        });
    }

    /**
     * Confirm a bank transfer — semantic payment action for bank/bank_transfer orders.
     * Idempotent: confirming twice reports the current (already paid) state without side effects.
     */
    public static function confirmBankTransfer(Order $order): Order
    {
        $pm = strtolower((string)($order->payment_method ?? ''));
        if (!in_array($pm, ['bank','bank_transfer'], true)) {
            throw new \Exception('هذا الإجراء مخصص للتحويل البنكي فقط');
        }
        $ps = strtolower((string)($order->payment_status ?? ''));
        if (in_array($ps, ['refunded','partially_refunded'], true)) throw new \Exception('لا يمكن تأكيد دفعة مسترجعة');
        $status = strtolower((string)$order->status);
        if (in_array($status, ['cancelled','failed'], true)) throw new \Exception('لا يمكن تأكيد دفعة طلب ملغي أو فاشل');

        return DB::transaction(function () use ($order) {
            $locked = Order::where('id',$order->id)->lockForUpdate()->first();
            if (strtolower((string)$locked->payment_status) === 'paid') return $locked->fresh(); // exactly once
            if (in_array(strtolower((string)$locked->payment_status), ['refunded','partially_refunded'], true)) throw new \Exception('لا يمكن تأكيد دفعة مسترجعة');
            if (in_array(strtolower((string)$locked->status), ['cancelled','failed'], true)) throw new \Exception('لا يمكن تأكيد دفعة طلب ملغي أو فاشل');

            $now = now();
            $locked->update([
                'payment_status' => 'paid',
                'paid_at' => $locked->paid_at ?? $now,
                'payment_confirmed_by' => $locked->payment_confirmed_by ?? auth()->id() ?? null,
            ]);
            $fresh = $locked->fresh();

            self::auditAfterPaid($fresh, 'bank_transfer');

            return $fresh;
        });
    }

    /**
     * Reject a bank transfer proof. Flips the order to payment_status=failed.
     * The order itself is NOT deleted — the merchant can follow up with the customer.
     */
    public static function rejectBankProof(Order $order, ?string $note = null, ?int $userId = null): Order
    {
        $pm = strtolower((string)($order->payment_method ?? ''));
        if (!in_array($pm, ['bank','bank_transfer'], true)) {
            throw new \Exception('هذا الإجراء مخصص للتحويل البنكي فقط');
        }

        return DB::transaction(function () use ($order, $note, $userId) {
            $locked = Order::where('id',$order->id)->lockForUpdate()->first();
            if ($locked->payment_status === 'paid') throw new \Exception('لا يمكن رفض دفعة تم تأكيدها');
            $prevNote = trim((string)$locked->notes);
            $rejectNote = trim((string)($note ?? 'لم يتم التحقق من التحويل'));
            $locked->update([
                'payment_status' => 'failed',
                'notes' => $prevNote !== '' ? $prevNote . ' | ' . $rejectNote : $rejectNote,
            ]);
            $fresh = $locked->fresh();

            try {
                \App\Services\MerchantNotificationService::create([
                    'user_id' => $fresh->store?->user_id,
                    'store_id' => $fresh->store_id,
                    'type' => 'system',
                    'title' => 'تم رفض إثبات التحويل',
                    'body' => "تم رفض إثبات التحويل البنكي للطلب #{$fresh->order_number}. السبب: {$rejectNote}",
                    'icon' => 'XCircle',
                    'color' => 'red',
                    'action_url' => route('orders.show', $fresh->id, false),
                    'related_id' => $fresh->id,
                    'related_type' => 'order',
                    'data' => ['order_number' => $fresh->order_number, 'reason' => $rejectNote],
                    'is_urgent' => true,
                ]);
            } catch (\Throwable $e) {
                Log::warning('Bank reject notification failed', ['order_id' => $fresh->id, 'error' => $e->getMessage()]);
            }

            return $fresh;
        });
    }

    /**
     * Shared side-effects that run exactly once after an offline payment becomes paid.
     */
    private static function auditAfterPaid(Order $fresh, string $kind): void
    {
        // Sync the advanced COD module record (if one exists) so both COD paths agree.
        if ($kind === 'cod') {
            try {
                $cod = \App\Models\CodPayment::where('order_id', $fresh->id)->first();
                if ($cod && $cod->status !== 'paid') {
                    $remaining = (float) $cod->amount_remaining;
                    if ($remaining > 0) {
                        app(\App\Services\CodPaymentService::class)->recordCollection($cod, $remaining, [
                            'payment_method' => 'cash',
                            'collected_by_name' => self::actorName(),
                            'collected_by_user_id' => auth()->id(),
                            'reference' => 'Collect #' . $fresh->order_number,
                            'notes' => 'تأكيد التحصيل من صفحة الطلب',
                        ]);
                    }
                }
            } catch (\Throwable $e) {
                Log::warning('COD module sync failed on collect', ['order_id' => $fresh->id, 'error' => $e->getMessage()]);
            }
        }

        // Merchant notification (idempotent inside the service — one per order & type).
        try {
            \App\Services\MerchantNotificationService::paymentCollected($fresh, $kind === 'bank_transfer' ? 'bank_transfer' : 'cod_collected');
        } catch (\Throwable $e) {
            Log::warning('Payment collected notification failed', ['order_id' => $fresh->id, 'error' => $e->getMessage()]);
        }

        // Customer payment email — only when the transition actually happened (idempotent callers).
        try {
            \App\Jobs\SendStoreCustomerEmail::dispatch($fresh->store_id, 'payment_received', $fresh->customer_email, $fresh->id, null, $fresh->customer_id)->afterCommit();
        } catch (\Throwable $e) {
            Log::warning('Payment received email dispatch failed', ['order_id' => $fresh->id, 'error' => $e->getMessage()]);
        }
    }

    private static function actorName(): ?string
    {
        $user = auth()->user();
        if (!$user) return null;
        return trim(((string)$user->first_name) . ' ' . ((string)$user->last_name)) !== ''
            ? trim((string)$user->first_name . ' ' . $user->last_name)
            : ($user->name ?? '');
    }
}
