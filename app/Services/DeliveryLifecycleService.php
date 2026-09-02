<?php

namespace App\Services;

use App\Models\DeliveryAssignment;
use App\Models\DeliveryDriver;
use App\Models\Order;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Canonical Local Delivery state machine.
 *
 * Delivery lifecycle is deliberately SEPARATE from order status and payment
 * status. Transitions are always server-controlled and validated here.
 *
 * Conceptual flow:
 *   unassigned → assigned → picked_up → out_for_delivery → delivered
 *   assigned/out_for_delivery → delivery_failed → (returned where supported)
 *   assigned/... → cancelled (when the order is cancelled)
 */
class DeliveryLifecycleService
{
    /** Allowed forward transitions per delivery status. */
    public const ALLOWED = [
        'unassigned'      => ['assigned'],
        'assigned'        => ['picked_up', 'out_for_delivery', 'delivery_failed', 'cancelled'],
        'picked_up'       => ['out_for_delivery', 'delivery_failed', 'cancelled'],
        'out_for_delivery' => ['delivered', 'delivery_failed', 'cancelled'],
        'delivered'       => [],
        'delivery_failed' => ['returned'],
        'returned'        => [],
        'cancelled'       => [],
    ];

    public const AR_STATUS_LABELS = [
        'unassigned'      => 'غير معيّن',
        'assigned'        => 'تم التعيين',
        'picked_up'       => 'تم الاستلام',
        'out_for_delivery' => 'خرج للتوصيل',
        'delivered'       => 'تم التسليم',
        'delivery_failed' => 'فشل التوصيل',
        'returned'        => 'مرتجع',
        'cancelled'       => 'ملغي',
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
        return 'لا يمكن نقل حالة التوصيل من "' . self::label($from) . '" إلى "' . self::label($to) . '"';
    }

    /**
     * Assign a driver to an order, creating a fresh delivery assignment and
     * syncing the order's current delivery state.
     *
     * Tenant safety: driver.store_id MUST equal order.store_id.
     *
     * @return DeliveryAssignment
     */
    public static function assignDriver(Order $order, DeliveryDriver $driver, ?int $zoneId = null): DeliveryAssignment
    {
        if ((int) $driver->store_id !== (int) $order->store_id) {
            throw new \Exception('لا يمكن تعيين سائق من متجر آخر لهذا الطلب.');
        }
        if (!$driver->active) {
            throw new \Exception('لا يمكن تعيين سائق غير مفعّل.');
        }
        if (in_array(strtolower((string) $order->status), ['cancelled', 'refunded', 'failed'], true)) {
            throw new \Exception('لا يمكن تعيين سائق لطلب في حالة نهائية.');
        }

        return DB::transaction(function () use ($order, $driver, $zoneId) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();
            if (in_array(strtolower((string) $lockedOrder->status), ['cancelled','refunded','failed'], true)) {
                throw new \Exception('لا يمكن تعيين سائق لطلب في حالة نهائية.');
            }

            $zone = null;
            if ($zoneId) {
                $zone = \App\Models\DeliveryZone::where('store_id', $lockedOrder->store_id)
                    ->where('id', $zoneId)->where('is_active', true)->first();
            }

            $now = now();
            $assignment = DeliveryAssignment::create([
                'store_id' => $lockedOrder->store_id,
                'order_id' => $lockedOrder->id,
                'driver_id' => $driver->id,
                'zone_id' => $zone?->id ?? $lockedOrder->delivery_zone_id,
                'zone_name_snapshot' => $zone?->name ?? $lockedOrder->delivery_zone_name,
                'delivery_fee_snapshot' => $zone ? $zone->feeForSubtotal((float) $lockedOrder->subtotal) : (float) $lockedOrder->delivery_fee,
                'delivery_status' => DeliveryAssignment::STATUS_ASSIGNED,
                'assigned_by_user_id' => auth()->id(),
                'assigned_at' => $now,
            ]);

            $lockedOrder->forceFill([
                'delivery_status' => DeliveryAssignment::STATUS_ASSIGNED,
                'delivery_driver_id' => $driver->id,
                'delivery_zone_id' => $zone?->id ?? $lockedOrder->delivery_zone_id,
                'delivery_zone_name' => $zone?->name ?? $lockedOrder->delivery_zone_name,
                'delivery_assigned_at' => $now,
            ])->save();

            return $assignment->fresh();
        });
    }

    /**
     * Re-assign the active assignment to another driver (same store).
     * The original assignment is cancelled and a fresh one created.
     */
    public static function reassignDriver(Order $order, DeliveryDriver $driver): DeliveryAssignment
    {
        if ((int) $driver->store_id !== (int) $order->store_id) {
            throw new \Exception('لا يمكن تعيين سائق من متجر آخر لهذا الطلب.');
        }
        if (!$driver->active) {
            throw new \Exception('لا يمكن تعيين سائق غير مفعّل.');
        }

        return DB::transaction(function () use ($order, $driver) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            // Cancel any active (non-terminal) assignment
            $active = DeliveryAssignment::where('order_id', $lockedOrder->id)
                ->where('store_id', $lockedOrder->store_id)
                ->whereNull('delivered_at')->whereNull('failed_at')
                ->whereNull('returned_at')->whereNull('cancelled_at')
                ->lockForUpdate()->get();

            foreach ($active as $assignment) {
                if ($assignment->isTerminal()) continue;
                $assignment->update([
                    'delivery_status' => DeliveryAssignment::STATUS_CANCELLED,
                    'cancel_reason' => 'أعيد التعيين لسائق آخر',
                    'cancelled_at' => now(),
                ]);
            }

            return self::assignDriver($lockedOrder, $driver);
        });
    }

    /**
     * Remove the driver assignment entirely (back to unassigned) where safe.
     * Only allowed from non-progressed states (assigned only, not yet picked up).
     */
    public static function unassignDriver(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            $active = DeliveryAssignment::where('order_id', $lockedOrder->id)
                ->where('store_id', $lockedOrder->store_id)
                ->where('delivery_status', DeliveryAssignment::STATUS_ASSIGNED)
                ->lockForUpdate()->get();

            foreach ($active as $assignment) {
                $assignment->update([
                    'delivery_status' => DeliveryAssignment::STATUS_CANCELLED,
                    'cancel_reason' => 'إلغاء التعيين',
                    'cancelled_at' => now(),
                ]);
            }

            $lockedOrder->forceFill([
                'delivery_status' => DeliveryAssignment::STATUS_UNASSIGNED,
                'delivery_driver_id' => null,
                'delivery_assigned_at' => null,
            ])->save();
        });
    }

    /**
     * Advance an order's active delivery through the state machine.
     * The order's delivery_status is kept in sync.
     */
    public static function transition(Order $order, string $to, ?string $reason = null, ?int $assignmentId = null): DeliveryAssignment
    {
        $to = strtolower(trim($to));

        return DB::transaction(function () use ($order, $to, $reason, $assignmentId) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();

            $assignment = null;
            if ($assignmentId) {
                $assignment = DeliveryAssignment::where('id', $assignmentId)
                    ->where('order_id', $lockedOrder->id)
                    ->where('store_id', $lockedOrder->store_id)
                    ->lockForUpdate()->first();
            }
            if (!$assignment) {
                $assignment = DeliveryAssignment::where('order_id', $lockedOrder->id)
                    ->where('store_id', $lockedOrder->store_id)
                    ->orderByDesc('id')->lockForUpdate()->first();
            }
            if (!$assignment) {
                throw new \Exception('لا يوجد تعيين توصيل لهذا الطلب للتحويل منه.');
            }

            $from = strtolower((string) $assignment->delivery_status);
            if (!self::isValidTransition($from, $to)) {
                throw new \Exception(self::errorMessage($from, $to));
            }

            $now = now();
            $updates = ['delivery_status' => $to];
            switch ($to) {
                case 'picked_up': $updates['picked_up_at'] = $now; break;
                case 'out_for_delivery': $updates['out_for_delivery_at'] = $now; break;
                case 'delivered':
                    $updates['delivered_at'] = $now;
                    self::syncOrderDeliveryCompleted($lockedOrder);
                    break;
                case 'delivery_failed':
                    $updates['failed_at'] = $now;
                    $updates['fail_reason'] = $reason;
                    break;
                case 'returned': $updates['returned_at'] = $now; break;
                case 'cancelled':
                    $updates['cancelled_at'] = $now;
                    $updates['cancel_reason'] = $reason;
                    break;
            }
            $assignment->update($updates);

            // Sync the order row's current delivery state
            $orderUpdates = ['delivery_status' => $to];
            if ($to === 'delivered') $orderUpdates['delivered_at'] = $lockedOrder->delivered_at ?? $now;
            if (in_array($to, ['delivery_failed', 'returned', 'cancelled'], true)) {
                $orderUpdates['delivery_driver_id'] = null;
                $orderUpdates['delivery_assigned_at'] = $lockedOrder->delivery_assigned_at;
            }
            $lockedOrder->forceFill($orderUpdates)->save();

            return $assignment->fresh();
        });
    }

    /**
     * When delivery completes, we do NOT auto-mark payment as collected.
     * COD collection remains a separate, explicit merchant action.
     * This only emits a merchant notification (idempotent).
     */
    protected static function syncOrderDeliveryCompleted(Order $order): void
    {
        try {
            \App\Services\MerchantNotificationService::deliveryCompleted($order);
        } catch (\Throwable $e) {
            Log::warning('Delivery completed notification failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
        }
    }

    /**
     * Cancel an order's active delivery assignment (e.g. when the order is cancelled).
     * Safe to call idempotently.
     */
    public static function cancelActiveAssignment(Order $order, ?string $reason = null): void
    {
        DB::transaction(function () use ($order, $reason) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->firstOrFail();
            $assignments = DeliveryAssignment::where('order_id', $lockedOrder->id)
                ->where('store_id', $lockedOrder->store_id)
                ->whereNull('delivered_at')->whereNull('returned_at')
                ->lockForUpdate()->get();

            foreach ($assignments as $assignment) {
                if ($assignment->isTerminal()) continue;
                $assignment->update([
                    'delivery_status' => DeliveryAssignment::STATUS_CANCELLED,
                    'cancel_reason' => $reason ?? 'إلغاء الطلب',
                    'cancelled_at' => $lockedOrder->cancelled_at ?? now(),
                ]);
            }

            if (strtolower((string) $lockedOrder->delivery_status) !== DeliveryAssignment::STATUS_DELIVERED) {
                $lockedOrder->forceFill([
                    'delivery_status' => DeliveryAssignment::STATUS_CANCELLED,
                    'delivery_driver_id' => null,
                ])->save();
            }
        });
    }
}
