<?php

namespace App\Services;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderReturn;
use App\Models\OrderReturnItem;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReturnService
{
    /**
     * Return eligibility: only non-cancelled/failed and at least processing/shipped/delivered.
     * Digital products are not returnable in v1.
     * We keep window open (no date limit) but block pending/confirmed orders.
     */
    public static function canRequestReturn(Order $order): array
    {
        $status = strtolower((string)$order->status);
        $blocked = ['pending','confirmed','cancelled','failed','refunded'];
        if (in_array($status, $blocked, true)) {
            return [false, 'لا يمكن طلب الإرجاع لهذه الحالة: ' . $status];
        }
        // allow processing, shipped, delivered, returned (multiple returns)
        $allowed = ['processing','shipped','delivered','returned','completed'];
        if (!in_array($status, $allowed, true)) {
            // be permissive for unknown but not pending
            if ($status === 'pending' || $status === 'cancelled') return [false, 'الطلب غير مؤهل للإرجاع'];
        }
        if (strtolower((string)$order->payment_status) === 'failed') {
            return [false, 'لا يمكن إرجاع طلب فشل دفعه'];
        }
        return [true, null];
    }

    public static function maxReturnableQuantity(OrderItem $item): int
    {
        $ordered = (int)$item->quantity;
        // Sum of already requested/completed returns excluding rejected/cancelled
        $already = OrderReturnItem::where('order_item_id', $item->id)
            ->whereHas('ret', function($q){
                $q->whereNotIn('status', ['rejected','cancelled']);
            })->sum('quantity');
        return max(0, $ordered - (int)$already);
    }

    public static function maxRestockable(OrderReturnItem $ri): int
    {
        return max(0, (int)$ri->quantity - (int)$ri->restocked_quantity);
    }

    public static function createReturn(Order $order, array $items, ?string $reason, ?string $customerNote, ?int $customerId = null): OrderReturn
    {
        [$can, $msg] = self::canRequestReturn($order);
        if (!$can) throw new \Exception($msg ?? 'Order not eligible for return');

        return DB::transaction(function() use ($order, $items, $reason, $customerNote, $customerId) {
            $order->refresh();
            // Lock order_returns for this order to prevent concurrent over-request
            DB::table('order_returns')->where('order_id', $order->id)->lockForUpdate()->get();

            $ret = OrderReturn::create([
                'return_number' => OrderReturn::generateReturnNumber(),
                'store_id' => $order->store_id,
                'order_id' => $order->id,
                'customer_id' => $customerId ?? $order->customer_id,
                'customer_email' => $order->customer_email,
                'status' => 'requested',
                'reason' => $reason,
                'customer_note' => $customerNote,
                'refund_status' => 'none',
                'refund_amount' => 0,
                'requested_at' => now(),
            ]);

            foreach ($items as $it) {
                $orderItemId = (int)($it['order_item_id'] ?? 0);
                $qty = (int)($it['quantity'] ?? 0);
                $itemReason = $it['reason'] ?? $reason;
                if ($qty <= 0) throw new \Exception('الكمية يجب أن تكون أكبر من صفر');
                $orderItem = OrderItem::where('id', $orderItemId)->where('order_id', $order->id)->lockForUpdate()->first();
                if (!$orderItem) throw new \Exception('عنصر الطلب غير موجود');
                // Digital check
                $product = $orderItem->product;
                if ($product && $product->is_downloadable) throw new \Exception('المنتجات الرقمية غير قابلة للإرجاع');
                $max = self::maxReturnableQuantity($orderItem);
                if ($qty > $max) throw new \Exception('الكمية المطلوبة ('.$qty.') تتجاوز المتبقي القابل للإرجاع ('.$max.') للعنصر #' . $orderItemId);
                // Validate reason canonical
                if ($itemReason && !array_key_exists($itemReason, OrderReturn::REASONS)) {
                    // allow custom reasons but store as other
                    $itemReason = 'other';
                }
                OrderReturnItem::create([
                    'return_id' => $ret->id,
                    'order_item_id' => $orderItem->id,
                    'product_id' => $orderItem->product_id,
                    'quantity' => $qty,
                    'restocked_quantity' => 0,
                    'refund_amount' => 0,
                    'reason' => $itemReason,
                ]);
            }

            if ($ret->items()->count() === 0) {
                throw new \Exception('يجب اختيار عنصر واحد على الأقل');
            }

            return $ret;
        });
    }

    public static function transition(OrderReturn $ret, string $to, ?string $merchantNote = null): OrderReturn
    {
        $from = $ret->status;
        $allowed = [
            'requested' => ['approved','rejected','cancelled'],
            'approved' => ['in_transit','received','rejected','cancelled'],
            'in_transit' => ['received','cancelled'],
            'received' => ['completed','cancelled'],
            'rejected' => [],
            'completed' => [],
            'cancelled' => [],
        ];
        if (!in_array($to, $allowed[$from] ?? [], true)) {
            throw new \Exception('انتقال غير صالح من '.$from.' إلى '.$to);
        }
        return DB::transaction(function() use ($ret, $to, $merchantNote) {
            $ret->lockForUpdate();
            $ret->refresh();
            $updates = ['status'=>$to];
            if ($merchantNote !== null) $updates['merchant_note'] = $merchantNote;
            if ($to === 'approved') $updates['approved_at'] = now();
            if ($to === 'received') $updates['received_at'] = now();
            if ($to === 'completed') $updates['completed_at'] = now();
            if ($to === 'cancelled') $updates['cancelled_at'] = now();
            $ret->update($updates);
            return $ret->fresh();
        });
    }

    /**
     * Restock specific return item quantity. Idempotent via restocked_quantity.
     */
    public static function restock(OrderReturn $ret, int $returnItemId, int $qty): OrderReturnItem
    {
        return DB::transaction(function() use ($ret, $returnItemId, $qty) {
            if (!in_array($ret->status, ['received','approved','in_transit'], true)) {
                // Allow restock only after approved/received, but be lenient to received
                throw new \Exception('لا يمكن إعادة التخزين إلا بعد استلام المرتجع');
            }
            $ri = OrderReturnItem::where('id', $returnItemId)->where('return_id', $ret->id)->lockForUpdate()->first();
            if (!$ri) throw new \Exception('عنصر الإرجاع غير موجود');
            $max = self::maxRestockable($ri);
            if ($qty <=0) throw new \Exception('كمية إعادة التخزين غير صالحة');
            if ($qty > $max) throw new \Exception('كمية إعادة التخزين ('.$qty.') تتجاوز المتبقي ('.$max.')');
            $orderItem = $ri->orderItem()->with('product')->first();
            if (!$orderItem) throw new \Exception('عنصر الطلب الأصلي غير موجود');
            // Use InventoryService restock
            $res = InventoryService::restockQuantity($orderItem, $qty, (int)$ret->store_id);
            if (!($res['success'] ?? false)) {
                // If variant no longer exists, we still allow completing without restock — but here merchant explicitly asked to restock, so error
                throw new \Exception($res['message'] ?? 'فشل إعادة التخزين');
            }
            $ri->increment('restocked_quantity', $qty);
            $ri->refresh();
            return $ri;
        });
    }

    /**
     * Record financial refund (manual only). Validates against paid total.
     * Provider refunds are NOT auto-called — manual recording only.
     */
    public static function recordRefund(OrderReturn $ret, float $amount, ?string $method = null, ?string $reference = null): OrderReturn
    {
        return DB::transaction(function() use ($ret, $amount, $method, $reference) {
            $ret->lockForUpdate();
            $ret->refresh();
            if ($amount <= 0) throw new \Exception('مبلغ الاسترداد يجب أن يكون أكبر من صفر');
            $order = $ret->order()->lockForUpdate()->first();
            if (!$order) throw new \Exception('Order not found');
            $paid = (float)$order->total_amount; // historical paid amount
            // Already refunded across all returns for this order (avoid double count with order.refunded_amount)
            $sumReturns = (float) OrderReturn::where('order_id', $order->id)
                ->whereNotIn('status', ['rejected','cancelled'])
                ->sum('refund_amount');
            $legacy = (float)($order->refunded_amount ?? 0);
            $alreadyRefunded = max($sumReturns, $legacy);
            $max = $paid - $alreadyRefunded;
            if ($amount - $max > 0.01) {
                throw new \Exception('مبلغ الاسترداد ('.$amount.') يتجاوز المبلغ القابل للاسترداد ('.number_format($max,2).')');
            }
            $newTotal = $alreadyRefunded + $amount;
            $ret->refund_amount = (float)$ret->refund_amount + $amount;
            $ret->refund_method = $method;
            $ret->refund_reference = $reference;
            if ($newTotal >= $paid - 0.01) {
                $ret->refund_status = 'refunded';
            } elseif ($newTotal > 0.01) {
                $ret->refund_status = 'partial';
            }
            $ret->save();

            // Update order aggregation (historical totals remain, only refunded_amount changes)
            $order->refunded_amount = $newTotal;
            // payment_status partial/full
            if ($newTotal >= $paid - 0.01) {
                $order->payment_status = 'refunded';
            } elseif ($newTotal > 0.01) {
                $order->payment_status = 'partially_refunded';
            }
            $order->save();

            // Loyalty: proportional reversal (canonical) — idempotent via LoyaltyService (pass total refunded)
            try {
                $loyaltyRefund = (float) $newTotal;
                app(\App\Services\LoyaltyService::class)->reversePointsForOrder($order, $loyaltyRefund);
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Loyalty refund reversal failed', ['order_id' => $order->id, 'error' => $e->getMessage()]);
            }
            return $ret->fresh();
        });
    }

    /**
     * Complete return (after restock/refund decisions). Sets completed.
     */
    public static function complete(OrderReturn $ret): OrderReturn
    {
        return self::transition($ret, 'completed');
    }
}
